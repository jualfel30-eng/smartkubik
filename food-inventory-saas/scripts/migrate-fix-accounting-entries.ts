/**
 * Migration Script V2: Fix Accounting Journal Entries
 *
 * Problema RAÍZ:
 *   Los billing documents se crearon con montos en USD pero sin currency ni
 *   exchangeRate (o con currency="VES" por defecto). La migración V1 propagó
 *   esos mismos montos USD como si fueran VES.
 *
 * Solución:
 *   1. Eliminar TODOS los asientos automáticos de facturación (migrados y no migrados)
 *   2. Para cada billing document emitido, buscar la orden relacionada
 *      (references.orderId) y obtener la tasa real desde order.totalAmountVes / order.totalAmount
 *   3. Corregir totals.currency, totals.exchangeRate y totalsVes en el billing document
 *   4. Regenerar asientos contables con los montos VES correctos
 *
 * Uso:
 *   npx ts-node -r dotenv/config scripts/migrate-fix-accounting-entries.ts
 *
 * Flags:
 *   --dry-run     Solo muestra qué haría, sin modificar datos
 *   --tenant=ID   Solo migrar un tenant específico
 */

import { MongoClient, Db, ObjectId } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/food-inventory-saas";

const DRY_RUN = process.argv.includes("--dry-run");
const TENANT_FLAG = process.argv.find((a) => a.startsWith("--tenant="));
const SPECIFIC_TENANT = TENANT_FLAG ? TENANT_FLAG.split("=")[1] : null;

const round2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  console.log("=".repeat(70));
  console.log("  MIGRACIÓN V2: Corrección de Asientos Contables (tasa real)");
  console.log("  Fecha:", new Date().toISOString());
  console.log("  Mode:", DRY_RUN ? "DRY RUN (sin cambios)" : "PRODUCCIÓN");
  if (SPECIFIC_TENANT) console.log("  Tenant:", SPECIFIC_TENANT);
  console.log("=".repeat(70));
  console.log();

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    // Paso 1: Eliminar TODOS los asientos automáticos de facturación
    await deleteAllBillingEntries(db);

    // Paso 2: Corregir billing documents con tasa real desde órdenes
    await fixBillingDocuments(db);

    // Paso 3: Regenerar asientos con montos VES correctos
    await regenerateJournalEntries(db);

    console.log();
    console.log("=".repeat(70));
    console.log("  MIGRACIÓN V2 COMPLETADA");
    console.log("=".repeat(70));
  } catch (error) {
    console.error("ERROR FATAL:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

/**
 * Paso 1: Eliminar TODOS los asientos automáticos relacionados con facturación
 * Incluye los viejos (orden/pago) y los migrados en V1
 */
async function deleteAllBillingEntries(db: Db) {
  console.log("─── PASO 1: Eliminar TODOS los asientos automáticos de facturación ───");

  const journalEntries = db.collection("journalentries");

  const filter: any = {
    isAutomatic: true,
    $or: [
      // Asientos viejos de orden/pago
      { description: { $regex: /^Asiento automático por venta de orden/ } },
      { description: { $regex: /^Asiento de costo de venta para la orden/ } },
      { description: { $regex: /^Asiento automático por cobro de orden/ } },
      // Asientos migrados en V1
      { "metadata.source": "migrate-fix-accounting-entries" },
      // Asientos del nuevo listener (Factura/Nota de Crédito/Documento)
      { description: { $regex: /^(Factura|Nota de Crédito|Documento) [A-Z]+\d+/ } },
    ],
  };

  if (SPECIFIC_TENANT) {
    filter.tenantId = SPECIFIC_TENANT;
  }

  const count = await journalEntries.countDocuments(filter);
  console.log(`  Encontrados: ${count} asientos automáticos a eliminar`);

  if (count === 0) {
    console.log("  Nada que eliminar.");
    return;
  }

  const sample = await journalEntries
    .find(filter)
    .project({ description: 1, tenantId: 1, "lines.0.debit": 1 })
    .limit(5)
    .toArray();
  console.log("  Muestra:");
  for (const entry of sample) {
    console.log(
      `    - [${entry.tenantId}] ${entry.description} (debit: ${entry.lines?.[0]?.debit})`,
    );
  }
  if (count > 5) console.log(`    ... y ${count - 5} más`);

  if (DRY_RUN) {
    console.log("  [DRY RUN] No se eliminaron.");
    return;
  }

  const result = await journalEntries.deleteMany(filter);
  console.log(`  Eliminados: ${result.deletedCount} asientos`);
}

/**
 * Paso 2: Corregir billing documents — obtener tasa real desde la orden relacionada
 *
 * La tasa real se calcula como: order.totalAmountVes / order.totalAmount
 * Esto nos da la tasa BCV que estaba vigente al momento de la venta.
 */
async function fixBillingDocuments(db: Db) {
  console.log();
  console.log("─── PASO 2: Corregir billing documents con tasa real ───");

  const billingDocs = db.collection("billingdocuments");
  const orders = db.collection("orders");

  const filter: any = { status: "issued" };
  if (SPECIFIC_TENANT) {
    filter.tenantId = SPECIFIC_TENANT;
  }

  const docs = await billingDocs.find(filter).toArray();
  console.log(`  Facturas emitidas a corregir: ${docs.length}`);

  // Precarga de órdenes con VES data
  const orderCache: Record<string, any> = {};
  const orderIds = docs
    .filter((d) => d.references?.orderId)
    .map((d) => {
      try {
        return new ObjectId(d.references.orderId);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as ObjectId[];

  if (orderIds.length > 0) {
    const orderDocs = await orders
      .find(
        { _id: { $in: orderIds } },
        { projection: { totalAmount: 1, totalAmountVes: 1, paymentRecords: 1 } },
      )
      .toArray();
    for (const o of orderDocs) {
      orderCache[o._id.toString()] = o;
    }
    console.log(`  Órdenes cargadas: ${orderDocs.length}`);
  }

  let fixed = 0;
  let noOrder = 0;
  let noVes = 0;

  for (const doc of docs) {
    const orderId = doc.references?.orderId;
    if (!orderId) {
      noOrder++;
      console.log(`  SKIP ${doc.documentNumber}: sin orderId`);
      continue;
    }

    const order = orderCache[orderId];
    if (!order) {
      noOrder++;
      console.log(`  SKIP ${doc.documentNumber}: orden ${orderId} no encontrada`);
      continue;
    }

    // Calcular tasa real desde la orden
    let realRate = 0;

    if (order.totalAmount > 0 && order.totalAmountVes > 0) {
      realRate = order.totalAmountVes / order.totalAmount;
    }

    // Fallback: buscar en paymentRecords
    if (realRate === 0 && order.paymentRecords?.length > 0) {
      for (const pr of order.paymentRecords) {
        if (pr.amount > 0 && pr.amountVes > 0) {
          realRate = pr.amountVes / pr.amount;
          break;
        }
      }
    }

    if (realRate === 0) {
      noVes++;
      console.log(
        `  SKIP ${doc.documentNumber}: orden ${orderId} sin datos VES (totalAmount=${order.totalAmount}, totalAmountVes=${order.totalAmountVes})`,
      );
      continue;
    }

    const rawTaxAmount = (doc.totals?.taxes || []).reduce(
      (s: number, t: any) => s + (t.amount || 0),
      0,
    );

    const totalsVes = {
      subtotal: round2((doc.totals?.subtotal || 0) * realRate),
      taxAmount: round2(rawTaxAmount * realRate),
      grandTotal: round2((doc.totals?.grandTotal || 0) * realRate),
      exchangeRate: round2(realRate),
    };

    console.log(
      `  ✓ ${doc.documentNumber}: USD ${doc.totals?.grandTotal || 0} × ${round2(realRate)} = Bs. ${totalsVes.grandTotal.toLocaleString("es-VE")}`,
    );

    if (!DRY_RUN) {
      await billingDocs.updateOne(
        { _id: doc._id },
        {
          $set: {
            "totals.currency": "USD",
            "totals.exchangeRate": round2(realRate),
            totalsVes,
          },
        },
      );
      fixed++;
    }
  }

  console.log(
    DRY_RUN
      ? `  [DRY RUN] Se corregirían ${docs.length - noOrder - noVes} documentos. Sin orden: ${noOrder}. Sin VES: ${noVes}.`
      : `  Corregidos: ${fixed}. Sin orden: ${noOrder}. Sin VES: ${noVes}.`,
  );
}

/**
 * Paso 3: Regenerar asientos contables con montos VES correctos
 */
async function regenerateJournalEntries(db: Db) {
  console.log();
  console.log("─── PASO 3: Regenerar asientos con montos VES correctos ───");

  const billingDocs = db.collection("billingdocuments");
  const journalEntries = db.collection("journalentries");
  const chartOfAccounts = db.collection("chartofaccounts");

  const filter: any = {
    status: "issued",
    type: { $in: ["invoice", "credit_note", "delivery_note"] },
    "totalsVes.exchangeRate": { $gt: 1 }, // Solo docs con tasa real (no 1:1)
  };

  if (SPECIFIC_TENANT) {
    filter.tenantId = SPECIFIC_TENANT;
  }

  const docs = await billingDocs.find(filter).sort({ issueDate: 1 }).toArray();
  console.log(`  Facturas con VES correcto a procesar: ${docs.length}`);

  if (docs.length === 0) {
    console.log("  Nada que regenerar.");
    return;
  }

  // Cache de cuentas contables
  const accountCache: Record<string, Record<string, string>> = {};

  async function getAccountId(
    tenantId: string,
    code: string,
  ): Promise<string | null> {
    if (!accountCache[tenantId]) {
      const accounts = await chartOfAccounts
        .find({ tenantId })
        .project({ code: 1 })
        .toArray();
      accountCache[tenantId] = {};
      for (const acc of accounts) {
        accountCache[tenantId][acc.code] = acc._id.toString();
      }
    }
    return accountCache[tenantId][code] || null;
  }

  let created = 0;
  let skipped = 0;

  for (const doc of docs) {
    const tenantId = doc.tenantId;
    const totalsVes = doc.totalsVes;

    if (!totalsVes || totalsVes.grandTotal === 0) {
      skipped++;
      continue;
    }

    const accCxC = await getAccountId(tenantId, "1102");
    const accIngresos = await getAccountId(tenantId, "4101");
    const accIva = await getAccountId(tenantId, "2102");

    if (!accCxC || !accIngresos) {
      console.log(
        `  WARN: Tenant ${tenantId} sin cuentas 1102/4101, saltando ${doc.documentNumber}`,
      );
      skipped++;
      continue;
    }

    const isCredit = doc.type === "credit_note";
    const multiplier = isCredit ? -1 : 1;

    const docLabel =
      doc.type === "invoice"
        ? "Factura"
        : doc.type === "credit_note"
          ? "Nota de Crédito"
          : "Documento";

    const lines: any[] = [
      {
        account: new ObjectId(accCxC),
        debit: round2(totalsVes.grandTotal * multiplier),
        credit: 0,
        description: `${docLabel} ${doc.documentNumber}`,
      },
      {
        account: new ObjectId(accIngresos),
        debit: 0,
        credit: round2(totalsVes.subtotal * multiplier),
        description: `Venta ${doc.customer?.name || "Cliente"}`,
      },
    ];

    if (totalsVes.taxAmount > 0 && accIva) {
      lines.push({
        account: new ObjectId(accIva),
        debit: 0,
        credit: round2(totalsVes.taxAmount * multiplier),
        description: "IVA Débito Fiscal",
      });
    }

    const entry = {
      date: doc.issueDate || new Date(),
      description: `${docLabel} ${doc.documentNumber} - ${doc.customer?.name || "Cliente"} (Bs. ${totalsVes.grandTotal.toLocaleString("es-VE")})`,
      lines,
      tenantId,
      isAutomatic: true,
      metadata: {
        migratedAt: new Date(),
        source: "migrate-fix-accounting-entries-v2",
        billingDocumentId: doc._id.toString(),
        controlNumber: doc.controlNumber,
        originalUsd: doc.totals?.grandTotal || 0,
        exchangeRate: totalsVes.exchangeRate,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(
      `  + ${doc.documentNumber}: USD ${doc.totals?.grandTotal || 0} → Bs. ${totalsVes.grandTotal.toLocaleString("es-VE")} (tasa: ${totalsVes.exchangeRate})`,
    );

    if (!DRY_RUN) {
      await journalEntries.insertOne(entry);
      created++;
    }
  }

  console.log(
    DRY_RUN
      ? `  [DRY RUN] Se crearían ${docs.length - skipped} asientos. Saltados: ${skipped}.`
      : `  Creados: ${created} asientos. Saltados: ${skipped}.`,
  );
}

main();

/**
 * Migración: índice de bookingNumber en beautybookings -> único POR TENANT.
 *
 * Bug corregido: el índice `bookingNumber_1` era único GLOBAL, pero el número se
 * genera por-tenant (BBK-00001...). La primera reserva de cada tenant nuevo
 * colisionaba (E11000) con el BBK-00001 de otro tenant → 500 en create.
 *
 * Acción (idempotente):
 *   1. Crear índice compuesto único { tenantId: 1, bookingNumber: 1 }.
 *   2. Eliminar el índice único global `bookingNumber_1`.
 *
 * Ejecutar: npm run db:migrate:booking-number-index
 * Dry-run:  DRY_RUN=1 npm run db:migrate:booking-number-index
 */
import "dotenv/config";
import mongoose from "mongoose";

const DRY = process.env.DRY_RUN === "1";
const COLLECTION = "beautybookings";
const GLOBAL_IX = "bookingNumber_1";
const COMPOUND_KEY = { tenantId: 1, bookingNumber: 1 } as const;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI no definido");
  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection(COLLECTION);

  const before = await col.indexes();
  console.log(`📋 Índices actuales en ${COLLECTION}:`);
  before.forEach((i) =>
    console.log(
      "   -",
      i.name,
      JSON.stringify(i.key),
      i.unique ? "(unique)" : "",
    ),
  );

  // Salvaguarda: ¿hay duplicados (tenantId, bookingNumber) que romperían el compuesto?
  const dupes = await col
    .aggregate([
      {
        $group: {
          _id: { t: "$tenantId", b: "$bookingNumber" },
          n: { $sum: 1 },
        },
      },
      { $match: { n: { $gt: 1 } } },
      { $limit: 5 },
    ])
    .toArray();
  if (dupes.length > 0) {
    console.error(
      "❌ Existen duplicados (tenantId, bookingNumber). Abortando. Ejemplos:",
      JSON.stringify(dupes),
    );
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log("✅ Sin duplicados (tenantId, bookingNumber).");

  const hasCompound = before.some(
    (i) => JSON.stringify(i.key) === JSON.stringify(COMPOUND_KEY),
  );
  const hasGlobal = before.some((i) => i.name === GLOBAL_IX);

  if (DRY) {
    console.log("🧪 DRY_RUN — acciones que se aplicarían:");
    console.log(
      "   crear compuesto único:",
      hasCompound ? "YA EXISTE (skip)" : "SÍ",
    );
    console.log(
      "   eliminar",
      GLOBAL_IX + ":",
      hasGlobal ? "SÍ" : "NO EXISTE (skip)",
    );
    await mongoose.disconnect();
    return;
  }

  // 1. Crear compuesto único (no-op si ya existe)
  if (!hasCompound) {
    await col.createIndex(COMPOUND_KEY, {
      unique: true,
      name: "tenantId_1_bookingNumber_1",
    });
    console.log("✅ Índice compuesto único creado: tenantId_1_bookingNumber_1");
  } else {
    console.log("ℹ️  Índice compuesto ya existía.");
  }

  // 2. Eliminar global único
  if (hasGlobal) {
    await col.dropIndex(GLOBAL_IX);
    console.log(`✅ Índice global ${GLOBAL_IX} eliminado.`);
  } else {
    console.log(`ℹ️  ${GLOBAL_IX} no existía.`);
  }

  const after = await col.indexes();
  console.log("📋 Índices finales:");
  after.forEach((i) =>
    console.log(
      "   -",
      i.name,
      JSON.stringify(i.key),
      i.unique ? "(unique)" : "",
    ),
  );

  await mongoose.disconnect();
  console.log("🎉 Migración completada.");
}

main().catch((e) => {
  console.error("❌ Migración falló:", e.message);
  process.exit(1);
});

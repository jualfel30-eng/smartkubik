/**
 * Migración: convertir permisos guardados como NOMBRE-TEXTO a ObjectId en roles.
 *
 * Contexto: 9 roles (incl. `super_admin` global) tenían `permissions` con
 * strings (ej. "users_read") en vez de ObjectIds que referencian la colección
 * `permissions`. El login hace populate del path `permissions` (ref Permission)
 * y al castear esos strings a ObjectId lanza:
 *   "Cast to ObjectId failed for value \"users_read\" ... model \"Permission\""
 * → el login de esos roles (super-admin incluido) fallaba con 401.
 *
 * Fix (idempotente): por cada rol, reemplaza cada string por el _id del
 * Permission con ese `name`, preservando los ObjectIds existentes y
 * deduplicando. Los strings sin Permission doc (huérfanos legacy con punto,
 * ej. "orders.create") se descartan (eran inválidos y rompían el login igual).
 * NO cambia qué permisos tiene un rol: es una conversión de formato 1:1.
 *
 * Aplicada manualmente a prod el 2026-06-15 (backup de los roles afectados
 * tomado antes). Este archivo deja el cambio reproducible/documentado.
 *
 * Uso:
 *   MONGODB_URI=... npx ts-node scripts/migrations/2026-06-15-fix-role-permissions-string-to-objectid.ts
 */
import { MongoClient, ObjectId } from "mongodb";

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const client = await MongoClient.connect(uri);
  try {
    const db = client.db();
    const perms = await db
      .collection("permissions")
      .find({})
      .project({ name: 1 })
      .toArray();
    const byName = new Map<string, ObjectId>(
      perms.map((p: any) => [p.name, p._id]),
    );

    const roles = await db.collection("roles").find({}).toArray();
    const affected = roles.filter((r: any) =>
      (r.permissions || []).some((p: any) => typeof p === "string"),
    );

    for (const r of affected) {
      const seen = new Set<string>();
      const out: any[] = [];
      const dropped: string[] = [];
      for (const p of r.permissions || []) {
        if (typeof p !== "string") {
          const k = String(p);
          if (!seen.has(k)) {
            seen.add(k);
            out.push(p);
          }
          continue;
        }
        const id = byName.get(p);
        if (id) {
          const k = String(id);
          if (!seen.has(k)) {
            seen.add(k);
            out.push(id);
          }
        } else {
          dropped.push(p);
        }
      }
      await db
        .collection("roles")
        .updateOne({ _id: r._id }, { $set: { permissions: out } });
      console.log(
        `${r.name} (${String(r.tenantId || "global")}): ${(r.permissions || []).length} → ${out.length}` +
          (dropped.length ? ` | dropped huérfanos: ${JSON.stringify(dropped)}` : ""),
      );
    }

    const still = await db
      .collection("roles")
      .countDocuments({ permissions: { $elemMatch: { $type: "string" } } });
    console.log(`Roles con strings restantes (debe ser 0): ${still}`);
  } finally {
    await client.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

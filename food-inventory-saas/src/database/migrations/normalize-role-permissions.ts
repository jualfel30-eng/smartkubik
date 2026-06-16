import { Connection } from "mongoose";
import { Logger } from "@nestjs/common";

/**
 * Normaliza `roles.permissions`: convierte permisos guardados como NOMBRE-TEXTO
 * a su ObjectId (referencia a la colección `permissions`), preservando los
 * ObjectIds existentes y deduplicando. Los strings sin Permission doc (huérfanos
 * legacy, ej. "orders.create" con punto) se descartan.
 *
 * POR QUÉ corre en cada arranque (último paso de runMigrations): varias
 * migraciones de seed (add-apply-discounts, add-production-module, etc.) hacen
 * `$addToSet: { permissions: "<nombre_string>" }` a roles admin/super_admin en
 * cada boot. Eso corrompe el array (mezcla ObjectIds + strings) y rompe el
 * populate de permisos: el login de super_admin lanza CastError ("Cast to
 * ObjectId failed for value ...") y el de tenants descarta silenciosamente los
 * permisos agregados como string. Esta normalización deja los roles consistentes
 * al final de cada boot. Es idempotente y 1:1 (no cambia qué permisos tiene un rol).
 */
export async function normalizeRolePermissions(connection: Connection) {
  const logger = new Logger("NormalizeRolePermissions");
  try {
    const roles = connection.collection("roles");
    const permsCol = connection.collection("permissions");

    const perms = await permsCol.find({}).project({ name: 1 }).toArray();
    const byName = new Map<string, any>(perms.map((p: any) => [p.name, p._id]));

    const affected = await roles
      .find({ permissions: { $elemMatch: { $type: "string" } } } as any)
      .toArray();

    if (affected.length === 0) {
      return;
    }

    let fixed = 0;
    const droppedTotal = new Set<string>();
    for (const role of affected) {
      const seen = new Set<string>();
      const out: any[] = [];
      for (const p of role.permissions || []) {
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
          droppedTotal.add(p);
        }
      }
      await roles.updateOne({ _id: role._id }, { $set: { permissions: out } });
      fixed++;
    }

    logger.log(
      `✅ Normalizados ${fixed} rol(es) con permisos string→ObjectId` +
        (droppedTotal.size
          ? ` | huérfanos descartados: ${JSON.stringify([...droppedTotal])}`
          : ""),
    );
  } catch (error) {
    logger.error("❌ normalizeRolePermissions failed:", (error as Error).message);
    // No relanzar: una normalización fallida no debe tumbar el arranque.
  }
}

import { Connection, Types } from "mongoose";
import { Logger } from "@nestjs/common";

const isHexObjectId = (s: string) => /^[a-fA-F0-9]{24}$/.test(s);

/**
 * Normaliza `roles.permissions`: convierte permisos guardados como string a su
 * ObjectId (referencia a la colección `permissions`), preservando los ObjectIds
 * existentes y deduplicando. Un string puede ser:
 *   - un ObjectId-hex (24 chars) → se castea a ObjectId si existe el Permission;
 *   - un NOMBRE de permiso (ej. "orders_create") → se resuelve por nombre.
 * Sólo se descarta un string si NO matchea ni por _id ni por nombre (huérfano
 * real). CRÍTICO: la mayoría de la corrupción son ObjectIds-hex stringificados,
 * NO nombres; tratarlos como nombre los borraría y vaciaría el rol.
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
    // Set de _ids válidos (como string) para resolver ObjectIds-hex stringificados.
    const validIds = new Set<string>(perms.map((p: any) => String(p._id)));

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
        // 1) ObjectId-hex stringificado que existe en `permissions`.
        // 2) NOMBRE de permiso. 3) huérfano real → descartar.
        let id: any = null;
        if (isHexObjectId(p) && validIds.has(p)) {
          id = new Types.ObjectId(p);
        } else if (byName.has(p)) {
          id = byName.get(p);
        }
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

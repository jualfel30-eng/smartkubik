/**
 * Ejecuta la reconciliación de movimientos OUT faltantes para órdenes ya enviadas/entregadas/pagadas.
 *
 * Variables de entorno:
 * - API_URL: base URL del backend (ej: http://localhost:3000/api)
 * - ADMIN_TOKEN: token JWT con permiso orders_update
 * - STATUSES: lista separada por comas (por defecto: shipped,delivered,paid)
 * - LIMIT: límite de órdenes a procesar (por defecto: 200, máx 1000)
 *
 * Ejemplo:
 *   API_URL=http://localhost:3000 ADMIN_TOKEN=xxx LIMIT=300 npx tsx scripts/reconcile-out-movements.ts
 */
import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3000";
const TOKEN = process.env.ADMIN_TOKEN;
const STATUSES = (process.env.STATUSES || "shipped,delivered,paid")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const LIMIT = Math.min(Number(process.env.LIMIT) || 200, 1000);

if (!TOKEN) {
  console.error("Falta ADMIN_TOKEN en las variables de entorno.");
  process.exit(1);
}

async function main() {
  console.log(
    `Reconciliando movimientos OUT faltantes | statuses=${STATUSES.join(",")} | limit=${LIMIT}`,
  );

  try {
    const res = await axios.post(
      `${API_URL}/orders/__reconcile-movements`,
      {
        statuses: STATUSES,
        limit: LIMIT,
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
      },
    );

    console.log("Resultado:", res.data);
  } catch (err: any) {
    const message =
      err?.response?.data?.message || err?.message || "Error desconocido";
    console.error("Error al reconciliar movimientos:", message);
    if (err?.response?.data) {
      console.error("Detalle:", err.response.data);
    }
    process.exit(1);
  }
}

main();

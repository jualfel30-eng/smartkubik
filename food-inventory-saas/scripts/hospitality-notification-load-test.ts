import "dotenv/config";
import { Queue } from "bullmq";
import { randomUUID } from "crypto";
import {
  APPOINTMENT_REMINDERS_QUEUE,
  APPOINTMENT_REMINDER_JOB,
} from "../src/modules/appointments/queues/appointments.queue.constants";

interface LoadTestOptions {
  tenantId: string;
  count: number;
  batchSize: number;
  dryRun: boolean;
}

function parseOptions(): LoadTestOptions {
  const getArg = (name: string, fallback?: string) => {
    const prefix = `--${name}=`;
    const match = process.argv.find((arg) => arg.startsWith(prefix));
    if (match) {
      return match.substring(prefix.length);
    }
    return fallback;
  };

  const tenantId =
    getArg("tenant", process.env.LOAD_TEST_TENANT_ID) || "demo-hotel";
  const count = Number(
    getArg("count", process.env.LOAD_TEST_COUNT) || "1000",
  );
  const batchSize = Number(
    getArg("batch", process.env.LOAD_TEST_BATCH) || "100",
  );
  const dryRun = getArg("dryRun") === "true";

  return {
    tenantId,
    count: Number.isFinite(count) ? Math.max(count, 1) : 1000,
    batchSize: Number.isFinite(batchSize) ? Math.max(batchSize, 1) : 100,
    dryRun,
  };
}

async function main() {
  const options = parseOptions();

  if (options.dryRun) {
    console.log(
      `[dry-run] Generaría ${options.count} recordatorios para el tenant ${options.tenantId} en lotes de ${options.batchSize}.`,
    );
    return;
  }

  const queue = new Queue(APPOINTMENT_REMINDERS_QUEUE, {
    connection: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_TLS === "true" ? {} : undefined,
    },
  });

  try {
    console.log(
      `Encolando ${options.count} recordatorios en ${APPOINTMENT_REMINDER_JOB} para el tenant ${options.tenantId}...`,
    );
    const startedAt = Date.now();
    let pushed = 0;
    while (pushed < options.count) {
      const batch: Array<{
        name: string;
        data: Record<string, any>;
        opts: Record<string, any>;
      }> = [];
      const batchLimit = Math.min(
        options.batchSize,
        options.count - pushed,
      );
      for (let i = 0; i < batchLimit; i += 1) {
        const appointmentId = randomUUID();
        batch.push({
          name: APPOINTMENT_REMINDER_JOB,
          data: {
            appointmentId,
            tenantId: options.tenantId,
            reminderAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
            channels: ["email", "whatsapp"],
            metadata: {
              templateId: i % 2 === 0 ? "hospitality_reminder_24h" : "hospitality_followup",
              loadTest: true,
            },
          },
          opts: {
            removeOnComplete: true,
            removeOnFail: true,
          },
        });
      }

      await queue.addBulk(batch);
      pushed += batch.length;
      console.log(`→ Enviados ${pushed}/${options.count}`);
    }

    const durationMs = Date.now() - startedAt;
    const rate = (options.count / (durationMs / 1000)).toFixed(2);
    console.log(
      `Carga completada en ${(durationMs / 1000).toFixed(2)}s (${rate} mensajes/seg).`,
    );
    console.log(
      "Recuerda monitorear la latencia y errores en BullBoard y en los dashboards de observabilidad.",
    );
  } finally {
    await queue.close();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error ejecutando el load test de notificaciones:", error);
    process.exit(1);
  });

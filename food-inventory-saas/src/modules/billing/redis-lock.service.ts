import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import IORedis, { Redis } from "ioredis";

type LockResult = { ok: boolean; owner?: string };

@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(RedisLockService.name);
  private client: Redis | null = null;

  constructor() {
    const url = process.env.REDIS_URL || process.env.REDIS_LOCK_URL;
    if (url) {
      try {
        this.client = new IORedis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 2,
        });
        this.client.on("error", (err) =>
          this.logger.error(`Redis lock error: ${err.message}`),
        );
        // connect lazily
        this.client.connect().catch((err) => {
          this.logger.error(`Redis lock connection failed: ${err.message}`);
          this.client = null;
        });
      } catch (e) {
        this.logger.error("Redis lock init failed", e as any);
        this.client = null;
      }
    }
  }

  hasClient() {
    return !!this.client;
  }

  async acquireLock(
    key: string,
    ttlMs: number,
    attempts = 3,
    delayMs = 100,
  ): Promise<LockResult> {
    if (!this.client) return { ok: false };
    const owner = randomUUID();
    for (let i = 0; i < attempts; i++) {
      const res = await this.client.set(key, owner, "PX", ttlMs, "NX");
      if (res === "OK") {
        return { ok: true, owner };
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return { ok: false };
  }

  async releaseLock(key: string, owner: string) {
    if (!this.client) return;
    const releaseScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    try {
      await this.client.eval(releaseScript, 1, key, owner);
    } catch (e) {
      this.logger.warn("Failed to release redis lock", e as any);
    }
  }
}

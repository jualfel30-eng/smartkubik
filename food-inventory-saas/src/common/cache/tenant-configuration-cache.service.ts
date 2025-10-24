import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface TenantConfigurationSnapshot<
  TTenant = any,
  TRole = any,
  TPermission = any,
> {
  tenant: TTenant;
  roles: TRole[];
  allPermissions: TPermission[];
  cachedAt: string;
  metadata: {
    ttlMs: number;
    expiresAt: number;
  };
}

interface CachedEntry {
  value: TenantConfigurationSnapshot;
  expiresAt: number;
  lastAccessedAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_ENTRIES = 200;

@Injectable()
export class TenantConfigurationCacheService {
  private readonly logger = new Logger(TenantConfigurationCacheService.name);
  private readonly cache = new Map<string, CachedEntry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(@Optional() private readonly configService?: ConfigService) {
    this.ttlMs = this.resolveTtl();
    this.maxEntries = this.resolveMaxEntries();
    this.logger.log(
      `Tenant configuration cache initialized (ttlMs=${this.ttlMs}, maxEntries=${this.maxEntries})`,
    );
  }

  get(tenantId: string): TenantConfigurationSnapshot | null {
    const entry = this.cache.get(tenantId);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.logger.debug(
        `Tenant configuration cache expired for tenantId=${tenantId}. Removing entry.`,
      );
      this.cache.delete(tenantId);
      return null;
    }

    entry.lastAccessedAt = Date.now();
    return entry.value;
  }

  set(tenantId: string, snapshot: TenantConfigurationSnapshot): void {
    if (!snapshot) {
      return;
    }

    const expiresAt = Date.now() + this.ttlMs;
    this.cache.set(tenantId, {
      value: snapshot,
      expiresAt,
      lastAccessedAt: Date.now(),
    });

    snapshot.metadata.ttlMs = this.ttlMs;
    snapshot.metadata.expiresAt = expiresAt;

    this.enforceSizeLimit();
  }

  invalidate(tenantId: string): void {
    if (this.cache.delete(tenantId)) {
      this.logger.debug(
        `Tenant configuration cache invalidated for tenantId=${tenantId}.`,
      );
    }
  }

  clear(): void {
    if (this.cache.size > 0) {
      this.logger.warn(
        `Clearing tenant configuration cache with ${this.cache.size} entr${
          this.cache.size === 1 ? "y" : "ies"
        }.`,
      );
      this.cache.clear();
    }
  }

  private resolveTtl(): number {
    if (!this.configService) {
      return DEFAULT_TTL_MS;
    }

    const ttlMsRaw = this.configService.get<string>(
      "TENANT_CONFIG_CACHE_TTL_MS",
    );
    const ttlSecondsRaw = this.configService.get<string>(
      "TENANT_CONFIG_CACHE_TTL",
    );

    const ttlMs = ttlMsRaw ? Number.parseInt(ttlMsRaw, 10) : NaN;
    if (Number.isFinite(ttlMs) && ttlMs > 0) {
      return ttlMs;
    }

    const ttlSeconds = ttlSecondsRaw ? Number.parseFloat(ttlSecondsRaw) : NaN;
    if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
      return Math.round(ttlSeconds * 1000);
    }

    return DEFAULT_TTL_MS;
  }

  private resolveMaxEntries(): number {
    if (!this.configService) {
      return DEFAULT_MAX_ENTRIES;
    }

    const raw = this.configService.get<string>(
      "TENANT_CONFIG_CACHE_MAX_ENTRIES",
    );
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }

    return DEFAULT_MAX_ENTRIES;
  }

  private enforceSizeLimit(): void {
    if (this.cache.size <= this.maxEntries) {
      return;
    }

    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt,
    );

    while (this.cache.size > this.maxEntries && entries.length > 0) {
      const [tenantId] = entries.shift()!;
      this.logger.debug(
        `Evicting tenantId=${tenantId} from tenant configuration cache due to size limit (${this.maxEntries}).`,
      );
      this.cache.delete(tenantId);
    }
  }
}

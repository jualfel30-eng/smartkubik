import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs/promises';
import { join, normalize, relative, sep } from 'path';
import {
  WikiSyncEvent,
  WikiSyncEventDocument,
} from './schemas/wiki-sync-event.schema';
import {
  WikiMaintenanceConfig,
  WikiMaintenanceConfigDocument,
} from './schemas/wiki-maintenance-config.schema';

export interface PendingReviewEntry {
  timestamp: string;
  commitHash: string;
  author: string;
  message: string;
  modules: Array<{
    module: string;
    changeTypes: string[];
    files: string[];
  }>;
}

export type WikiHealthStatus =
  | 'never_synced'
  | 'no_pending'
  | 'on_track'
  | 'due'
  | 'overdue'
  | 'very_overdue';

export interface WikiStatus {
  pendingCount: number;
  lastSyncAt: Date | null;
  daysSinceLastSync: number | null;
  intervalDays: number;
  nextDueAt: Date | null;
  daysUntilDue: number | null;
  daysOverdue: number;
  healthStatus: WikiHealthStatus;
  wikiPath: string;
  pendingFileExists: boolean;
}

@Injectable()
export class WikiMaintenanceService {
  private readonly logger = new Logger(WikiMaintenanceService.name);
  private readonly wikiPath: string;
  private readonly pendingReviewsFile: string;

  constructor(
    @InjectModel(WikiSyncEvent.name)
    private readonly syncEventModel: Model<WikiSyncEventDocument>,
    @InjectModel(WikiMaintenanceConfig.name)
    private readonly configModel: Model<WikiMaintenanceConfigDocument>,
  ) {
    // Resolve wiki path: env var > default relative to cwd
    this.wikiPath =
      process.env.WIKI_PATH || join(process.cwd(), '..', 'docs', 'wiki');
    this.pendingReviewsFile = join(this.wikiPath, '.pending-reviews.md');
    this.logger.log(`Wiki path resolved to: ${this.wikiPath}`);
  }

  // ─── Config ────────────────────────────────────────────────────────────────

  async getConfig(): Promise<WikiMaintenanceConfig> {
    let config = await this.configModel.findOne({ key: 'global' }).lean();
    if (!config) {
      const created = await this.configModel.create({
        key: 'global',
        intervalDays: 3,
      });
      config = created.toObject();
    }
    return config;
  }

  async updateConfig(
    intervalDays: number,
    userId?: string,
  ): Promise<WikiMaintenanceConfig> {
    const update: any = { intervalDays };
    if (userId) update.updatedBy = new Types.ObjectId(userId);

    const updated = await this.configModel
      .findOneAndUpdate({ key: 'global' }, update, {
        new: true,
        upsert: true,
      })
      .lean();
    return updated!;
  }

  // ─── Status / Health ───────────────────────────────────────────────────────

  async getStatus(): Promise<WikiStatus> {
    const [config, lastSync, pending] = await Promise.all([
      this.getConfig(),
      this.syncEventModel.findOne().sort({ timestamp: -1 }).lean(),
      this.getPendingReviews(),
    ]);

    const pendingCount = pending.entries.length;
    const lastSyncAt = lastSync?.timestamp ?? null;
    const now = new Date();

    let daysSinceLastSync: number | null = null;
    let nextDueAt: Date | null = null;
    let daysUntilDue: number | null = null;
    let daysOverdue = 0;

    if (lastSyncAt) {
      daysSinceLastSync = Math.floor(
        (now.getTime() - lastSyncAt.getTime()) / 86_400_000,
      );
      nextDueAt = new Date(
        lastSyncAt.getTime() + config.intervalDays * 86_400_000,
      );
      const diffDays = Math.floor(
        (nextDueAt.getTime() - now.getTime()) / 86_400_000,
      );
      daysUntilDue = diffDays;
      daysOverdue = diffDays < 0 ? Math.abs(diffDays) : 0;
    }

    let healthStatus: WikiHealthStatus;
    if (!lastSyncAt) {
      healthStatus = pendingCount > 0 ? 'never_synced' : 'no_pending';
    } else if (pendingCount === 0) {
      healthStatus = 'no_pending';
    } else if (daysOverdue >= config.intervalDays) {
      healthStatus = 'very_overdue';
    } else if (daysOverdue > 0) {
      healthStatus = 'overdue';
    } else if (daysUntilDue !== null && daysUntilDue <= 1) {
      healthStatus = 'due';
    } else {
      healthStatus = 'on_track';
    }

    return {
      pendingCount,
      lastSyncAt,
      daysSinceLastSync,
      intervalDays: config.intervalDays,
      nextDueAt,
      daysUntilDue,
      daysOverdue,
      healthStatus,
      wikiPath: this.wikiPath,
      pendingFileExists: pending.fileExists,
    };
  }

  // ─── Pending Reviews ───────────────────────────────────────────────────────

  async getPendingReviews(): Promise<{
    entries: PendingReviewEntry[];
    fileExists: boolean;
    rawContent: string | null;
  }> {
    let raw: string;
    try {
      raw = await fs.readFile(this.pendingReviewsFile, 'utf-8');
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return { entries: [], fileExists: false, rawContent: null };
      }
      throw err;
    }

    return {
      entries: this.parsePendingReviews(raw),
      fileExists: true,
      rawContent: raw,
    };
  }

  /**
   * Parse the .pending-reviews.md file produced by wiki-change-detector.sh.
   *
   * Expected format per entry:
   *   ## YYYY-MM-DD HH:MM — `hash` — Author
   *   **Commit:** message
   *
   *   | Modulo wiki | Tipo de cambio | Archivos afectados |
   *   |-------------|----------------|--------------------|
   *   | `name`      | types          | files              |
   *
   *   ---
   */
  private parsePendingReviews(raw: string): PendingReviewEntry[] {
    const entries: PendingReviewEntry[] = [];
    // Each entry begins with `## ` at start of line. Split on that, ignoring header.
    const sections = raw.split(/^## /m).slice(1);

    for (const section of sections) {
      const lines = section.split('\n');
      if (lines.length === 0) continue;

      // Header line: "YYYY-MM-DD HH:MM — `hash` — Author"
      const headerLine = lines[0].trim();
      const headerMatch = headerLine.match(
        /^(.+?)\s+—\s+`([^`]+)`\s+—\s+(.+)$/,
      );
      if (!headerMatch) continue;

      const [, timestamp, commitHash, author] = headerMatch;

      // Find commit message line: "**Commit:** message"
      const commitLine = lines.find((l) => l.startsWith('**Commit:**'));
      const message = commitLine
        ? commitLine.replace(/^\*\*Commit:\*\*\s*/, '').trim()
        : '';

      // Find table rows: lines that start with "| `" and aren't header/separator
      const tableRows = lines.filter(
        (l) =>
          l.trim().startsWith('| `') && !l.includes('Modulo wiki'),
      );

      const modules = tableRows
        .map((row) => {
          // Cells are split by | with surrounding spaces. First cell is empty.
          const cells = row
            .split('|')
            .map((c) => c.trim())
            .filter((c) => c.length > 0);
          if (cells.length < 3) return null;
          const moduleName = cells[0].replace(/`/g, '').trim();
          const changeTypes = cells[1]
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
          const files = cells[2]
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean);
          return { module: moduleName, changeTypes, files };
        })
        .filter(
          (m): m is { module: string; changeTypes: string[]; files: string[] } =>
            m !== null,
        );

      entries.push({
        timestamp: timestamp.trim(),
        commitHash,
        author: author.trim(),
        message,
        modules,
      });
    }

    return entries;
  }

  // ─── Mark as Synced ────────────────────────────────────────────────────────

  async markAsSynced(
    userId?: string,
    userName?: string,
    notes?: string,
  ): Promise<{ event: WikiSyncEvent; clearedEntries: number }> {
    const pending = await this.getPendingReviews();
    const entries = pending.entries;

    const event = await this.syncEventModel.create({
      timestamp: new Date(),
      entriesProcessed: entries.length,
      triggeredBy: userId ? new Types.ObjectId(userId) : undefined,
      triggeredByName: userName,
      notes,
      archivedEntries: entries,
    });

    // Clear the pending reviews file (write an empty header)
    if (pending.fileExists) {
      const emptyHeader = `# Wiki — Cambios Pendientes de Revision

> Este archivo es generado automaticamente por el detector de cambios.
> Cada entrada representa un commit que modifico archivos de un modulo documentado.
> El agente Bibliotecario debe procesar estas entradas y limpiarlas al terminar.

---

`;
      try {
        await fs.writeFile(this.pendingReviewsFile, emptyHeader, 'utf-8');
      } catch (err: any) {
        this.logger.warn(
          `Could not clear pending reviews file: ${err.message}`,
        );
      }
    }

    return { event: event.toObject(), clearedEntries: entries.length };
  }

  // ─── History ───────────────────────────────────────────────────────────────

  async getHistory(limit = 20): Promise<WikiSyncEvent[]> {
    return this.syncEventModel
      .find()
      .sort({ timestamp: -1 })
      .limit(Math.min(limit, 100))
      .lean();
  }

  async getHistoryEntry(id: string): Promise<WikiSyncEvent> {
    const event = await this.syncEventModel.findById(id).lean();
    if (!event) {
      throw new NotFoundException(`Sync event ${id} not found`);
    }
    return event;
  }

  // ─── Wiki Browser (Read-Only Viewer) ───────────────────────────────────────

  /**
   * Returns the wiki tree as a nested structure suitable for sidebar rendering.
   * Only includes .md files. Hidden files (starting with .) are skipped.
   */
  async getTree(): Promise<WikiTreeNode[]> {
    try {
      return await this.buildTree(this.wikiPath, '');
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        this.logger.warn(`Wiki directory not found at ${this.wikiPath}`);
        return [];
      }
      throw err;
    }
  }

  private async buildTree(
    absDir: string,
    relPath: string,
  ): Promise<WikiTreeNode[]> {
    const entries = await fs.readdir(absDir, { withFileTypes: true });
    const nodes: WikiTreeNode[] = [];

    for (const entry of entries) {
      // Skip hidden files (.pending-reviews.md, .git, etc.)
      if (entry.name.startsWith('.')) continue;

      const childRel = relPath ? `${relPath}/${entry.name}` : entry.name;
      const childAbs = join(absDir, entry.name);

      if (entry.isDirectory()) {
        const children = await this.buildTree(childAbs, childRel);
        if (children.length > 0) {
          nodes.push({
            type: 'folder',
            name: entry.name,
            path: childRel,
            children,
          });
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        nodes.push({
          type: 'file',
          name: entry.name,
          path: childRel,
        });
      }
    }

    // Folders first, then files; both alphabetical
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  }

  /**
   * Reads a single page's markdown content. The path is relative to the wiki
   * root and validated to prevent path traversal.
   */
  async getPage(relPath: string): Promise<{ path: string; content: string }> {
    if (!relPath || typeof relPath !== 'string') {
      throw new BadRequestException('path is required');
    }
    // Strip any leading slash and normalize
    const sanitized = normalize(relPath.replace(/^[/\\]+/, ''));

    // Reject .. traversal
    if (sanitized.includes('..')) {
      throw new BadRequestException('Invalid path');
    }
    // Reject hidden segments
    if (sanitized.split(sep).some((seg) => seg.startsWith('.'))) {
      throw new BadRequestException('Invalid path');
    }
    // Only .md files
    if (!sanitized.endsWith('.md')) {
      throw new BadRequestException('Only .md files are readable');
    }

    const absPath = join(this.wikiPath, sanitized);

    // Final guard: resolved path must remain inside the wiki dir
    const rel = relative(this.wikiPath, absPath);
    if (rel.startsWith('..') || rel.includes(`..${sep}`)) {
      throw new BadRequestException('Invalid path');
    }

    try {
      const content = await fs.readFile(absPath, 'utf-8');
      return { path: sanitized, content };
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundException(`Wiki page ${sanitized} not found`);
      }
      throw err;
    }
  }
}

export type WikiTreeNode =
  | { type: 'file'; name: string; path: string }
  | { type: 'folder'; name: string; path: string; children: WikiTreeNode[] };

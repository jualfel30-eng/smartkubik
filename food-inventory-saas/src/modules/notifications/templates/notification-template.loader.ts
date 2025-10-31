import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { promises as fs } from "fs";
import * as path from "path";

export interface NotificationTemplateChannelContent {
  subject?: Record<string, string>;
  body: Record<string, string>;
}

export interface NotificationTemplateDefinition {
  id: string;
  description?: string;
  channels: Record<string, NotificationTemplateChannelContent>;
}

@Injectable()
export class NotificationTemplateLoader {
  private readonly logger = new Logger(NotificationTemplateLoader.name);
  private readonly cache = new Map<string, NotificationTemplateDefinition>();
  private readonly templatesDir: string;

  constructor(private readonly configService: ConfigService) {
    const rootDir = this.configService.get<string>("HOSPITALITY_TEMPLATE_DIR");
    if (rootDir) {
      this.templatesDir = rootDir;
    } else {
      const repoRoot = process.cwd();
      this.templatesDir = path.join(
        repoRoot,
        "food-inventory-saas",
        "templates",
        "hospitality",
        "notifications",
      );
    }
  }

  async load(templateId: string): Promise<NotificationTemplateDefinition> {
    if (this.cache.has(templateId)) {
      return this.cache.get(templateId)!;
    }

    const fileName = this.resolveFileName(templateId);
    const filePath = path.join(this.templatesDir, fileName);
    try {
      const fileContents = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(fileContents) as NotificationTemplateDefinition;
      this.cache.set(templateId, parsed);
      return parsed;
    } catch (error) {
      this.logger.error(
        `Failed to load template ${templateId} from ${filePath}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private resolveFileName(templateId: string): string {
    if (templateId.endsWith(".json")) {
      return templateId;
    }
    return `${templateId.replace(/_/g, "-")}.json`;
  }
}

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

interface HelpArticle {
  source: string; // "inventario/control-de-stock"
  category: string;
  title: string;
  description: string;
  keywords: string[];
  quickAnswer: string;
  content: string; // full markdown without frontmatter
}

/**
 * HelpDocsService — Loads help center markdown articles into memory at startup.
 * Provides keyword-based search for the AI assistant tool (no Pinecone needed).
 *
 * Articles are read from the admin frontend's docs folder:
 * food-inventory-admin/src/docs/{category}/{slug}.md
 */
@Injectable()
export class HelpDocsService implements OnModuleInit {
  private readonly logger = new Logger(HelpDocsService.name);
  private articles: HelpArticle[] = [];

  private readonly DOCS_ROOT = path.resolve(
    __dirname,
    "../../../../food-inventory-admin/src/docs",
  );

  private readonly CATEGORIES = [
    "inventario",
    "ventas",
    "compras",
    "finanzas",
    "transferencias",
    "clientes",
    "configuracion",
    "restaurante",
    "salon",
    "produccion",
    "marketing-docs",
    "rrhh",
    "flujos",
  ];

  onModuleInit() {
    this.loadArticles();
  }

  private loadArticles() {
    this.articles = [];

    for (const category of this.CATEGORIES) {
      const dirPath = path.join(this.DOCS_ROOT, category);
      if (!fs.existsSync(dirPath)) continue;

      const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"));

      for (const fileName of files) {
        try {
          const raw = fs.readFileSync(path.join(dirPath, fileName), "utf-8");
          const article = this.parseArticle(raw, category, fileName);
          if (article) this.articles.push(article);
        } catch (err) {
          this.logger.warn(
            `Failed to load ${category}/${fileName}: ${err.message}`,
          );
        }
      }
    }

    this.logger.log(
      `Loaded ${this.articles.length} help articles into memory`,
    );
  }

  private parseArticle(
    raw: string,
    category: string,
    fileName: string,
  ): HelpArticle | null {
    const frontmatterMatch = raw.match(
      /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/,
    );
    if (!frontmatterMatch) return null;

    const frontmatter = frontmatterMatch[1];
    const content = frontmatterMatch[2].trim();

    // Parse YAML-like frontmatter (simple key: value)
    const meta: Record<string, string> = {};
    let currentKey = "";
    let multilineValue = "";
    let inMultiline = false;

    for (const line of frontmatter.split("\n")) {
      if (inMultiline) {
        if (line.match(/^\s/) || line === "") {
          multilineValue += (multilineValue ? "\n" : "") + line.replace(/^ {2}/, "");
          continue;
        } else {
          meta[currentKey] = multilineValue.trim();
          inMultiline = false;
        }
      }

      const colonIndex = line.indexOf(":");
      if (colonIndex > -1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();

        if (value === "|") {
          currentKey = key;
          multilineValue = "";
          inMultiline = true;
          continue;
        }

        meta[key] = value.replace(/^["']|["']$/g, "");
      }
    }
    if (inMultiline && currentKey) {
      meta[currentKey] = multilineValue.trim();
    }

    // Parse keywords array
    let keywords: string[] = [];
    const kwRaw = meta.keywords || "";
    if (kwRaw.startsWith("[") && kwRaw.endsWith("]")) {
      keywords = kwRaw
        .slice(1, -1)
        .split(",")
        .map((k) => k.trim().replace(/^["']|["']$/g, ""));
    }

    const slug = fileName.replace(".md", "");

    return {
      source: `${category}/${slug}`,
      category,
      title: meta.title || slug,
      description: meta.description || "",
      keywords,
      quickAnswer: meta.quickAnswer || "",
      content,
    };
  }

  /**
   * Search articles by query text. Matches against title, description,
   * keywords, and content. Returns top N results sorted by relevance.
   */
  search(query: string, limit = 3): HelpArticle[] {
    if (!query || query.trim().length === 0) return [];

    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);

    if (terms.length === 0) return [];

    const scored = this.articles.map((article) => {
      let score = 0;
      const titleLower = article.title.toLowerCase();
      const descLower = article.description.toLowerCase();
      const kwLower = article.keywords.map((k) => k.toLowerCase());
      const contentLower = article.content.toLowerCase();

      for (const term of terms) {
        // Title match (highest weight)
        if (titleLower.includes(term)) score += 10;

        // Keyword exact match (high weight)
        if (kwLower.some((k) => k.includes(term))) score += 8;

        // Description match
        if (descLower.includes(term)) score += 5;

        // Content match (lower weight but still useful)
        if (contentLower.includes(term)) score += 2;
      }

      return { article, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.article);
  }

  /**
   * Format search results for the assistant context.
   * Returns a string with the relevant article content.
   */
  searchForAssistant(query: string, limit = 2): string {
    const results = this.search(query, limit);

    if (results.length === 0) {
      return "No se encontró documentación relevante para esta consulta.";
    }

    return results
      .map((article) => {
        const parts = [`## ${article.title}`];

        if (article.quickAnswer) {
          parts.push(`\n**Respuesta rápida:**\n${article.quickAnswer}`);
        }

        // Include content but cap at ~2000 chars to not overwhelm context
        const maxContentLength = 2000;
        const content =
          article.content.length > maxContentLength
            ? article.content.substring(0, maxContentLength) + "\n\n[...artículo completo disponible en la documentación]"
            : article.content;

        parts.push(`\n${content}`);

        return parts.join("\n");
      })
      .join("\n\n---\n\n");
  }

  /** Get total loaded articles count */
  getArticleCount(): number {
    return this.articles.length;
  }
}

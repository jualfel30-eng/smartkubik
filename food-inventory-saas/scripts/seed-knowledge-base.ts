/**
 * seed-knowledge-base.ts
 *
 * Uploads all help center markdown articles to the "smartkubik_docs" knowledge base
 * so the AI assistant can answer user questions about how to use the software.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-knowledge-base.ts
 *
 * Requirements:
 *   - Backend must be running (or MongoDB + Pinecone accessible)
 *   - Environment variables loaded (.env)
 *
 * What it does:
 *   1. Reads all .md files from the admin help center (food-inventory-admin/src/docs/)
 *   2. Strips YAML frontmatter
 *   3. Calls KnowledgeBaseService.addDocument() for each article
 *   4. Documents are chunked, embedded, and stored in Pinecone under tenantId "smartkubik_docs"
 */

import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { KnowledgeBaseService } from "../src/modules/knowledge-base/knowledge-base.service";
import * as fs from "fs";
import * as path from "path";

const TENANT_ID = "smartkubik_docs";
const DOCS_ROOT = path.resolve(
  __dirname,
  "../../food-inventory-admin/src/docs",
);

// Categories to upload (skip old/duplicate folders)
const CATEGORIES = [
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

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Sin título";
}

async function main() {
  console.log("🚀 Seeding knowledge base for smartkubik_docs...\n");

  // Bootstrap NestJS app (minimal — just need DB + services)
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });

  const kbService = app.get(KnowledgeBaseService);

  let uploaded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const category of CATEGORIES) {
    const dirPath = path.join(DOCS_ROOT, category);

    if (!fs.existsSync(dirPath)) {
      console.log(`⏭  Skipping ${category}/ (directory not found)`);
      continue;
    }

    const files = fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith(".md"));

    for (const fileName of files) {
      const filePath = path.join(dirPath, fileName);
      const raw = fs.readFileSync(filePath, "utf-8");
      const content = stripFrontmatter(raw);
      const title = extractTitle(content);
      const source = `docs/${category}/${fileName.replace(".md", "")}`;

      console.log(`📄 Uploading: ${source} — "${title}"`);

      try {
        // Create a fake Multer file object with the markdown content as TXT
        const fakeFile: Express.Multer.File = {
          buffer: Buffer.from(content, "utf-8"),
          mimetype: "text/plain",
          originalname: `${category}-${fileName.replace(".md", ".txt")}`,
          size: Buffer.byteLength(content, "utf-8"),
          fieldname: "file",
          encoding: "utf-8",
          stream: null as any,
          destination: "",
          filename: "",
          path: "",
        };

        await kbService.addDocument(TENANT_ID, fakeFile, { source });
        uploaded++;
        console.log(`   ✅ OK (${fakeFile.size} bytes)`);
      } catch (err) {
        failed++;
        const msg = `   ❌ FAILED: ${err.message}`;
        console.error(msg);
        errors.push(`${source}: ${err.message}`);
      }
    }
  }

  console.log("\n========================================");
  console.log(`📊 Results: ${uploaded} uploaded, ${failed} failed`);
  if (errors.length > 0) {
    console.log("\n❌ Errors:");
    errors.forEach((e) => console.log(`   ${e}`));
  }
  console.log("========================================\n");

  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

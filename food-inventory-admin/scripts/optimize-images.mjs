import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, parse } from 'path';

const ASSETS_DIR = './src/assets/industries';
const QUALITY = 82; // Good balance between quality and size

async function optimizeImages() {
  console.log('🚀 Starting image optimization...\n');

  const files = await readdir(ASSETS_DIR);
  const pngFiles = files.filter(f => f.endsWith('.png'));

  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const file of pngFiles) {
    const inputPath = join(ASSETS_DIR, file);
    const { name } = parse(file);
    const outputPath = join(ASSETS_DIR, `${name}.webp`);

    const originalStats = await stat(inputPath);
    totalOriginal += originalStats.size;

    await sharp(inputPath)
      .webp({ quality: QUALITY, effort: 6 })
      .toFile(outputPath);

    const optimizedStats = await stat(outputPath);
    totalOptimized += optimizedStats.size;

    const savings = ((1 - optimizedStats.size / originalStats.size) * 100).toFixed(1);
    console.log(`✅ ${file} → ${name}.webp (${savings}% smaller)`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Total original: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📊 Total optimized: ${(totalOptimized / 1024 / 1024).toFixed(2)} MB`);
  console.log(`🎉 Total savings: ${((1 - totalOptimized / totalOriginal) * 100).toFixed(1)}%`);
}

optimizeImages().catch(console.error);

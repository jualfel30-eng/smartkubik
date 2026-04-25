#!/usr/bin/env node

/**
 * Migration script: Optimize existing storefront media
 * - Converts banner images to WebP (using Sharp)
 * - Converts hero videos to WebM VP9 (using ffmpeg)
 * - Updates database URLs
 *
 * Usage: MONGODB_URI=... node scripts/optimize-existing-media.js
 */

const mongoose = require('mongoose');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI env var required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // Find all storefronts with non-optimized media
  const configs = await db.collection('storefrontconfigs').find({
    $or: [
      { 'theme.videoUrl': { $exists: true, $ne: null, $ne: '' } },
      { 'theme.bannerUrl': { $exists: true, $ne: null, $ne: '' } },
    ],
  }).toArray();

  console.log(`Found ${configs.length} configs with media`);

  for (const config of configs) {
    const videoUrl = config.theme?.videoUrl;
    const bannerUrl = config.theme?.bannerUrl;
    const updates = {};

    // --- Optimize video to WebM ---
    if (videoUrl && !videoUrl.endsWith('.webm')) {
      console.log(`\n🎬 Optimizing video for ${config.domain}: ${videoUrl}`);

      try {
        const urlPath = new URL(videoUrl).pathname;
        const srcFile = path.join(process.cwd(), urlPath);

        if (!fs.existsSync(srcFile)) {
          console.log(`  ❌ File not found: ${srcFile}`);
        } else {
          const outFile = srcFile.replace(/\.[^.]+$/, '.webm');
          const outFilename = path.basename(outFile);

          console.log(`  Transcoding ${path.basename(srcFile)} → ${outFilename}`);

          execSync(
            `ffmpeg -y -i "${srcFile}" -c:v libvpx-vp9 -crf 35 -b:v 0 -vf "scale='min(1920,iw)':-2" -an -t 30 -threads 2 "${outFile}"`,
            { timeout: 180000, stdio: 'pipe' },
          );

          const origSize = fs.statSync(srcFile).size;
          const newSize = fs.statSync(outFile).size;
          console.log(`  Original:  ${(origSize / 1024 / 1024).toFixed(2)} MB`);
          console.log(`  Optimized: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
          console.log(`  Reduction: ${((1 - newSize / origSize) * 100).toFixed(1)}%`);

          const newVideoUrl = videoUrl.replace(/\.[^.]+$/, '.webm');
          updates['theme.videoUrl'] = newVideoUrl;
        }
      } catch (e) {
        console.error(`  ❌ FFmpeg error: ${e.message}`);
      }
    } else if (videoUrl) {
      console.log(`\n✅ Video for ${config.domain} already WebM`);
    }

    // --- Optimize banner to WebP ---
    if (bannerUrl && !bannerUrl.endsWith('.webp')) {
      console.log(`\n🖼️  Optimizing banner for ${config.domain}: ${bannerUrl}`);

      try {
        const urlPath = new URL(bannerUrl).pathname;
        const srcFile = path.join(process.cwd(), urlPath);

        if (!fs.existsSync(srcFile)) {
          console.log(`  ❌ File not found: ${srcFile}`);
        } else {
          const outFile = srcFile.replace(/\.[^.]+$/, '.webp');
          const outFilename = path.basename(outFile);

          console.log(`  Converting ${path.basename(srcFile)} → ${outFilename}`);

          await sharp(srcFile)
            .resize(1920, null, { withoutEnlargement: true, fit: 'inside' })
            .webp({ quality: 82 })
            .toFile(outFile);

          const origSize = fs.statSync(srcFile).size;
          const newSize = fs.statSync(outFile).size;
          console.log(`  Original:  ${(origSize / 1024 / 1024).toFixed(2)} MB`);
          console.log(`  Optimized: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
          console.log(`  Reduction: ${((1 - newSize / origSize) * 100).toFixed(1)}%`);

          const newBannerUrl = bannerUrl.replace(/\.[^.]+$/, '.webp');
          updates['theme.bannerUrl'] = newBannerUrl;
        }
      } catch (e) {
        console.error(`  ❌ Sharp error: ${e.message}`);
      }
    } else if (bannerUrl) {
      console.log(`\n✅ Banner for ${config.domain} already WebP`);
    }

    // --- Update database ---
    if (Object.keys(updates).length > 0) {
      await db.collection('storefrontconfigs').updateOne(
        { _id: config._id },
        { $set: updates },
      );
      console.log(`  ✅ Database updated`);
    }
  }

  await mongoose.disconnect();
  console.log('\n🎉 Migration complete!');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

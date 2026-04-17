#!/usr/bin/env node

/**
 * Image Optimization Script
 * Converts PNG/JPG images to optimized WebP format using Sharp
 * 
 * Usage: npm install sharp --save-dev && node scripts/optimize-images.js
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const ASSETS_DIR = './src/assets'
const THRESHOLD = 200 * 1024 // 200 KB

async function optimizeImages() {
    console.log('🖼️ Starting image optimization...\n')

    const files = fs.readdirSync(ASSETS_DIR)
    const imagesToOptimize = files.filter(file => /\.(png|jpg|jpeg)$/i.test(file))

    if (imagesToOptimize.length === 0) {
        console.log('✓ No images to optimize')
        return
    }

    for (const file of imagesToOptimize) {
        const sourcePath = path.join(ASSETS_DIR, file)
        const stats = fs.statSync(sourcePath)
        const fileSizeKB = stats.size / 1024

        if (stats.size > THRESHOLD) {
            console.log(`📦 Optimizing: ${file} (${fileSizeKB.toFixed(2)} KB)`)

            const webpPath = path.join(ASSETS_DIR, `${path.parse(file).name}.webp`)

            try {
                await sharp(sourcePath)
                    .webp({ quality: 85 })
                    .toFile(webpPath)

                const webpStats = fs.statSync(webpPath)
                const webpSizeKB = webpStats.size / 1024
                const reduction = ((1 - webpStats.size / stats.size) * 100).toFixed(1)

                console.log(`   → ${path.basename(webpPath)} (${webpSizeKB.toFixed(2)} KB) [-${reduction}%]\n`)
            } catch (error) {
                console.error(`   ✗ Error optimizing ${file}:`, error.message)
            }
        } else {
            console.log(`✓ ${file} (${fileSizeKB.toFixed(2)} KB) - already optimized\n`)
        }
    }

    console.log('✅ Image optimization complete!')
    console.log('\nNext steps:')
    console.log('1. Update imports to use .webp files instead of .png/.jpg')
    console.log('2. Test all images display correctly')
    console.log('3. Delete old PNG/JPG files after verifying\n')
}

optimizeImages().catch(err => {
    console.error('Error:', err.message)
    process.exit(1)
})

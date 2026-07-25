#!/usr/bin/env node
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const svg = readFileSync(resolve(root, 'icons/dice.svg'))

const sizes = [16, 32, 48, 64, 128, 256, 512, 1024]

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(resolve(root, `icons/icon-${size}.png`))
  console.log(`generated icons/icon-${size}.png`)
}

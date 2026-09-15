#!/usr/bin/env node
/**
 * Generates the Chrome Web Store promo assets from the Episode Roulette
 * identity (the red dice mark in icons/dice.svg).
 *
 * The promo tiles must not reuse provider screenshots: those carry Prime
 * Video and Netflix chrome, third-party show artwork, and other trademarks,
 * and they are illegible at the size the store renders a promo tile.
 *
 * Usage: node scripts/generate-promo.mjs
 */
import sharp from 'sharp'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const outDir = resolve(root, 'store-assets')

const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif'
const BG = '#0A0B0F'
const TEXT = '#FFFFFF'
const MUTED = '#9AA3B2'
const DIM = '#6B7382'

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** The app icon: red rounded square with a white die carrying five pips. */
function diceMark(x, y, size) {
  const radius = size * 0.28
  const inset = size * 0.16
  const face = size - inset * 2
  const faceRadius = face * 0.14
  const pip = size * 0.05
  const near = inset + face * 0.25
  const mid = inset + face * 0.5
  const far = inset + face * 0.75
  const pips = [
    [near, near], [far, near],
    [mid, mid],
    [near, far], [far, far],
  ]

  return `<g>
      <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="url(#red)"/>
      <rect x="${x + inset}" y="${y + inset}" width="${face}" height="${face}" rx="${faceRadius}" fill="url(#die)"/>
      ${pips.map(([px, py]) => `<circle cx="${x + px}" cy="${y + py}" r="${pip}" fill="#1A1A1A"/>`).join('')}
    </g>`
}

/** Netflix-style action pill showing the extension's actual button. */
function actionPill(x, y, width, height, labelSize) {
  const markSize = height * 0.42
  const markX = x + height * 0.3
  const markY = y + (height - markSize) / 2
  const textX = markX + markSize + height * 0.26
  const baseline = y + height / 2 + labelSize * 0.35

  return `<g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="url(#red)"/>
      ${diceMark(markX, markY, markSize)}
      <text x="${textX}" y="${baseline}" font-family="${FONT}" font-size="${labelSize}" font-weight="700" fill="${TEXT}">Random Episode</text>
    </g>`
}

function text(x, y, size, fill, content, weight = '400', spacing = 0) {
  const tracking = spacing === 0 ? '' : ` letter-spacing="${spacing}"`
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}"${tracking}>${escapeXml(content)}</text>`
}

/** Dark gradient stage with a red corner glow and an optional ghosted die. */
function svg(width, height, body, watermark = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#13151C"/>
      <stop offset="0.55" stop-color="#0B0C11"/>
      <stop offset="1" stop-color="#07080B"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.88" cy="0.06" r="0.9">
      <stop offset="0" stop-color="#E50914" stop-opacity="0.42"/>
      <stop offset="0.55" stop-color="#B81D24" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#B81D24" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="red" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#E50914"/>
      <stop offset="1" stop-color="#B81D24"/>
    </linearGradient>
    <linearGradient id="die" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#F2F2F2"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  ${watermark}
  ${body}
</svg>`
}

// Small promotional tile — 440×280.
const small = svg(440, 280, `
  ${diceMark(32, 30, 46)}
  ${text(32, 146, 34, TEXT, 'Episode Roulette', '700')}
  ${text(32, 174, 15, MUTED, 'Every season. One dice roll.')}
  ${actionPill(32, 202, 214, 44, 15)}
`)

// Large promotional tile — 920×680.
const large = svg(920, 680, `
  ${diceMark(72, 72, 88)}
  ${text(72, 336, 66, TEXT, 'Episode Roulette', '700')}
  ${text(72, 392, 25, MUTED, 'Stop scrolling. Start watching.')}
  ${text(72, 430, 18, DIM, 'A random episode from every season of your series.')}
  ${actionPill(72, 496, 392, 88, 28)}
`, `<g opacity="0.07" transform="translate(566 150)">${diceMark(0, 0, 300)}</g>`)

// Marquee promotional image — 1400×560.
const marquee = svg(1400, 560, `
  ${diceMark(96, 76, 92)}
  ${text(96, 306, 74, TEXT, 'Episode Roulette', '700')}
  ${text(96, 362, 28, MUTED, 'You pick the series. We pick the episode.')}
  ${text(96, 402, 19, DIM, 'Netflix & Prime Video  ·  Desktop Chrome')}
  ${actionPill(96, 430, 398, 82, 28)}
`, `<g opacity="0.07" transform="translate(988 110)">${diceMark(0, 0, 340)}</g>`)

const targets = [
  ['promo-small-440x280.png', small],
  ['promo-large-920x680.png', large],
  ['marquee-1400x560.png', marquee],
]

for (const [file, source] of targets) {
  const info = await sharp(Buffer.from(source))
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .toFile(resolve(outDir, file))
  console.log(`generated ${file} — ${info.width}×${info.height}, ${info.channels} channels`)
}

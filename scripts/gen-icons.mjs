import { chromium } from 'playwright-core'

// Ícone maskable "Lume": fundo ocupa tudo, "L" + ponto de luz na zona segura (80%)
const svg = (size) => `<!doctype html><html><body style="margin:0">
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#37352F"/>
  <circle cx="42" cy="20" r="8" fill="#FFB020" opacity="0.22"/>
  <path d="M24 15 V44 H41" fill="none" stroke="#F5EFE3" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="42" cy="20" r="4.5" fill="#FFB020"/>
</svg></body></html>`

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage()
for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(svg(size))
  await page.screenshot({ path: `public/pwa-${size}.png`, clip: { x: 0, y: 0, width: size, height: size } })
}
await browser.close()
console.log('ok')

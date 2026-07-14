import { chromium } from 'playwright-core'

// Ícone maskable: fundo ocupa tudo, "V" dentro da zona segura (80%)
const svg = (size) => `<!doctype html><html><body style="margin:0">
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#37352F"/>
  <text x="32" y="43" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#FFFFFF" text-anchor="middle">V</text>
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

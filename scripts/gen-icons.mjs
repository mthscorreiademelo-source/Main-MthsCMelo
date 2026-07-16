import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

// Gera os ícones do app a partir de scripts/icon-source.png (fundo branco).
// Saídas em public/: pwa-192, pwa-512, pwa-512-maskable, apple-touch-icon, favicons.
const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const fonte =
  'data:image/png;base64,' + readFileSync('scripts/icon-source.png').toString('base64')

// `escala` < 1 adiciona margem (usado no maskable para respeitar a zona segura).
const pagina = (escala = 1) => `<!doctype html><html><body style="margin:0;background:#ffffff">
  <div style="width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:#ffffff">
    <img src="${fonte}" style="width:${escala * 100}%;height:${escala * 100}%;object-fit:contain" />
  </div>
</body></html>`

const alvos = [
  { arquivo: 'public/pwa-192.png', size: 192, escala: 1 },
  { arquivo: 'public/pwa-512.png', size: 512, escala: 1 },
  { arquivo: 'public/pwa-512-maskable.png', size: 512, escala: 0.78 },
  { arquivo: 'public/apple-touch-icon.png', size: 180, escala: 1 },
  { arquivo: 'public/favicon-96.png', size: 96, escala: 1 },
  { arquivo: 'public/favicon-32.png', size: 32, escala: 1 },
]

const browser = await chromium.launch({ executablePath: EXE })
const page = await browser.newPage()
for (const { arquivo, size, escala } of alvos) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(pagina(escala))
  await page.screenshot({ path: arquivo, clip: { x: 0, y: 0, width: size, height: size } })
  console.log('✓', arquivo)
}
await browser.close()
console.log('ok')

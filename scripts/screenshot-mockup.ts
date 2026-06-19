/**
 * Screenshot the mockup HTML to a PNG so Olgui can confirm the layout
 */
import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 720, height: 1200 },
    deviceScaleFactor: 2,
  })
  const htmlPath = path.resolve(__dirname, 'mockup.html')
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' })

  // Measure full body height
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
  await page.setViewportSize({ width: 720, height: bodyHeight })
  await page.waitForTimeout(300)

  const outDir = '/home/z/my-project/download'
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const outPath = path.join(outDir, 'mockup-cursos-separados.png')
  await page.screenshot({ path: outPath, fullPage: true })
  console.log('✓ Mockup guardado en:', outPath)

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })

// One-off/regenerate-on-demand icon build: build/icon.svg -> build/icon.png
// (1024x1024, source for electron-builder's Linux target and general reuse),
// build/icon.ico (Windows, multi-resolution), build/icon.icns (macOS).
// Run with: node scripts/generateIcons.js
const { Resvg } = require('@resvg/resvg-js')
const pngToIco = require('png-to-ico').default
const iconGen = require('icon-gen')
const fs = require('fs')
const path = require('path')

const buildDir = path.join(__dirname, '..', 'build')
const svgPath = path.join(buildDir, 'icon.svg')
const pngPath = path.join(buildDir, 'icon.png')

async function main() {
  const svg = fs.readFileSync(svgPath, 'utf-8')

  // Base 1024x1024 PNG — used directly by electron-builder for Linux, and as
  // the source for the ico/icns generation below.
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } })
  const basePng = resvg.render().asPng()
  fs.writeFileSync(pngPath, basePng)
  console.log('wrote', pngPath)

  // Windows .ico needs several embedded resolutions.
  const icoSizes = [16, 24, 32, 48, 64, 128, 256]
  const icoBuffers = icoSizes.map((size) => {
    const r = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
    return r.render().asPng()
  })
  const icoBuffer = await pngToIco(icoBuffers)
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer)
  console.log('wrote', path.join(buildDir, 'icon.ico'))

  // macOS .icns, generated from the same 1024px PNG (icon-gen builds every
  // required resolution internally) — pure JS, no macOS host required.
  await iconGen(pngPath, buildDir, { report: false, ico: false, favicon: false, icns: { name: 'icon' } })
  console.log('wrote', path.join(buildDir, 'icon.icns'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

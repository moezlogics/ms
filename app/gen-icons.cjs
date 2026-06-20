// Generates public/icon-192.png and icon-512.png (no external deps).
// A clean branded tile: dark background + centered green disc. Full-bleed
// so it works as a maskable icon. Required for Android Chrome PWA install.
const fs = require("fs")
const zlib = require("zlib")
const path = require("path")

const BG = [11, 15, 26, 255]      // #0b0f1a
const FG = [16, 185, 129, 255]    // #10b981 (accent green)

function makePng(size) {
  const cx = size / 2, cy = size / 2, r = size * 0.34
  const bytesPerRow = size * 4
  // Raw image data: each row prefixed with filter byte 0.
  const raw = Buffer.alloc((bytesPerRow + 1) * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * (bytesPerRow + 1)
    raw[rowStart] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy
      const inside = dx * dx + dy * dy <= r * r
      const c = inside ? FG : BG
      const i = rowStart + 1 + x * 4
      raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2]; raw[i + 3] = c[3]
    }
  }

  const crcTable = (() => {
    const t = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })()
  const crc32 = (buf) => {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
    const typeBuf = Buffer.from(type, "ascii")
    const body = Buffer.concat([typeBuf, data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0)
    return Buffer.concat([len, body, crc])
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const idat = zlib.deflateSync(raw)
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

const outDir = path.join(__dirname, "public")
fs.writeFileSync(path.join(outDir, "icon-192.png"), makePng(192))
fs.writeFileSync(path.join(outDir, "icon-512.png"), makePng(512))
console.log("[gen-icons] wrote public/icon-192.png + icon-512.png")

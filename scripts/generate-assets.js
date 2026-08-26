const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

const root = path.resolve(__dirname, '..', 'miniprogram', 'assets')

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data = Buffer.alloc(0)) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  const checksum = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, checksum])
}

function createCanvas(width, height, background = [0, 0, 0, 0]) {
  const pixels = Buffer.alloc(width * height * 4)
  for (let index = 0; index < width * height; index += 1) {
    pixels.set(background, index * 4)
  }

  function dot(x, y, color) {
    const px = Math.round(x)
    const py = Math.round(y)
    if (px < 0 || py < 0 || px >= width || py >= height) return
    pixels.set(color, (py * width + px) * 4)
  }

  function fillRect(x, y, rectWidth, rectHeight, color) {
    for (let py = y; py < y + rectHeight; py += 1) {
      for (let px = x; px < x + rectWidth; px += 1) dot(px, py, color)
    }
  }

  function fillCircle(cx, cy, radius, color) {
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        if (x * x + y * y <= radius * radius) dot(cx + x, cy + y, color)
      }
    }
  }

  function line(x0, y0, x1, y1, color, thickness = 1) {
    const dx = x1 - x0
    const dy = y1 - y0
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1)
    for (let step = 0; step <= steps; step += 1) {
      fillCircle(x0 + (dx * step) / steps, y0 + (dy * step) / steps, Math.max(1, Math.floor(thickness / 2)), color)
    }
  }

  function strokeRect(x, y, rectWidth, rectHeight, color, thickness = 1) {
    line(x, y, x + rectWidth, y, color, thickness)
    line(x + rectWidth, y, x + rectWidth, y + rectHeight, color, thickness)
    line(x + rectWidth, y + rectHeight, x, y + rectHeight, color, thickness)
    line(x, y + rectHeight, x, y, color, thickness)
  }

  function strokeCircle(cx, cy, radius, color, thickness = 1) {
    const segments = Math.max(24, Math.ceil(radius * 3))
    let previous = [cx + radius, cy]
    for (let step = 1; step <= segments; step += 1) {
      const angle = (step / segments) * Math.PI * 2
      const current = [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]
      line(previous[0], previous[1], current[0], current[1], color, thickness)
      previous = current
    }
  }

  return { width, height, pixels, dot, fillRect, fillCircle, line, strokeRect, strokeCircle }
}

function writePng(filename, canvas) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(canvas.width, 0)
  header.writeUInt32BE(canvas.height, 4)
  header[8] = 8
  header[9] = 6
  const stride = canvas.width * 4
  const scanlines = Buffer.alloc((stride + 1) * canvas.height)
  for (let y = 0; y < canvas.height; y += 1) {
    canvas.pixels.copy(scanlines, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
    chunk('IEND')
  ])
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  fs.writeFileSync(filename, png)
}

function drawTabIcon(name, color, draw) {
  const canvas = createCanvas(81, 81)
  draw(canvas, color)
  writePng(path.join(root, 'icons', name), canvas)
}

const inactive = [116, 117, 113, 255]
const active = [217, 74, 58, 255]
const tabIcons = {
  home(canvas, color) {
    canvas.line(17, 39, 40, 18, color, 6)
    canvas.line(40, 18, 64, 39, color, 6)
    canvas.strokeRect(23, 38, 35, 28, color, 6)
    canvas.line(40, 51, 40, 66, color, 6)
  },
  add(canvas, color) {
    canvas.strokeCircle(40, 40, 26, color, 6)
    canvas.line(40, 27, 40, 54, color, 6)
    canvas.line(27, 40, 54, 40, color, 6)
  },
  ticket(canvas, color) {
    canvas.strokeRect(15, 23, 51, 36, color, 5)
    canvas.line(28, 24, 28, 58, color, 4)
    canvas.line(37, 34, 56, 34, color, 4)
    canvas.line(37, 46, 52, 46, color, 4)
  },
  user(canvas, color) {
    canvas.strokeCircle(40, 28, 12, color, 5)
    canvas.strokeCircle(40, 67, 24, color, 5)
    canvas.fillRect(12, 65, 57, 16, [0, 0, 0, 0])
  }
}

for (const [name, draw] of Object.entries(tabIcons)) {
  drawTabIcon(`${name}.png`, inactive, draw)
  drawTabIcon(`${name}-active.png`, active, draw)
}

function summerCover() {
  const canvas = createCanvas(600, 340, [244, 109, 91, 255])
  const white = [255, 250, 244, 255]
  const navy = [43, 52, 62, 255]
  const mint = [115, 190, 163, 255]
  canvas.fillCircle(485, 80, 54, [255, 213, 107, 255])
  canvas.fillRect(90, 126, 238, 142, white)
  canvas.fillRect(190, 126, 38, 142, navy)
  canvas.fillRect(90, 174, 238, 30, navy)
  canvas.line(209, 126, 161, 83, navy, 16)
  canvas.line(209, 126, 257, 83, navy, 16)
  canvas.fillCircle(161, 83, 10, mint)
  canvas.fillCircle(257, 83, 10, mint)
  canvas.fillRect(399, 190, 116, 78, mint)
  canvas.fillCircle(457, 190, 58, mint)
  canvas.fillRect(430, 122, 54, 72, white)
  canvas.line(443, 123, 443, 77, navy, 9)
  return canvas
}

function coffeeCover() {
  const canvas = createCanvas(600, 340, [237, 225, 204, 255])
  const dark = [72, 55, 45, 255]
  const blue = [72, 116, 145, 255]
  const coral = [210, 91, 70, 255]
  canvas.fillRect(0, 252, 600, 88, blue)
  canvas.fillRect(165, 110, 210, 140, [255, 251, 243, 255])
  canvas.strokeRect(165, 110, 210, 140, dark, 10)
  canvas.strokeCircle(397, 173, 53, dark, 12)
  canvas.fillCircle(397, 173, 34, [237, 225, 204, 255])
  canvas.line(216, 83, 203, 41, dark, 8)
  canvas.line(270, 83, 281, 38, dark, 8)
  canvas.line(324, 83, 314, 45, dark, 8)
  canvas.fillCircle(480, 72, 30, coral)
  return canvas
}

function campingCover() {
  const canvas = createCanvas(600, 340, [158, 202, 214, 255])
  const green = [49, 105, 76, 255]
  const yellow = [244, 190, 82, 255]
  const cream = [255, 246, 222, 255]
  canvas.fillCircle(500, 70, 42, yellow)
  canvas.fillRect(0, 238, 600, 102, green)
  canvas.line(120, 238, 220, 88, cream, 15)
  canvas.line(220, 88, 342, 238, cream, 15)
  canvas.fillRect(136, 222, 190, 25, cream)
  canvas.line(220, 89, 220, 238, yellow, 10)
  canvas.line(410, 238, 448, 126, green, 15)
  canvas.line(448, 126, 489, 238, green, 15)
  canvas.line(420, 184, 476, 184, green, 14)
  return canvas
}

writePng(path.join(root, 'covers', 'summer.png'), summerCover())
writePng(path.join(root, 'covers', 'coffee.png'), coffeeCover())
writePng(path.join(root, 'covers', 'camping.png'), campingCover())

console.log('Generated 11 local PNG assets')

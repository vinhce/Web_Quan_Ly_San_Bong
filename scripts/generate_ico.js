const fs = require('fs');

function createIco32() {
  const width = 32;
  const height = 32;
  
  // Create 32x32 BGRA pixels
  // Green background #16A34A (B: 0x4A, G: 0xA3, R: 0x16, A: 0xFF)
  // White ball #FFFFFF (B: 0xFF, G: 0xFF, R: 0xFF, A: 0xFF)
  // Dark seams #0F172A (B: 0x2A, G: 0x17, R: 0x0F, A: 0xFF)
  
  const xorSize = width * height * 4;
  const andSize = (width * height) / 8; // 128 bytes
  const bihSize = 40;
  const imageSize = bihSize + xorSize + andSize;
  const fileSize = 6 + 16 + imageSize;

  const buf = Buffer.alloc(fileSize);

  // ICONDIR
  buf.writeUInt16LE(0, 0); // reserved
  buf.writeUInt16LE(1, 2); // type: 1 = ICO
  buf.writeUInt16LE(1, 4); // count: 1 image

  // ICONDIRENTRY
  buf.writeUInt8(width, 6);
  buf.writeUInt8(height, 7);
  buf.writeUInt8(0, 8); // color palette count
  buf.writeUInt8(0, 9); // reserved
  buf.writeUInt16LE(1, 10); // color planes
  buf.writeUInt16LE(32, 12); // bits per pixel
  buf.writeUInt32LE(imageSize, 14); // image size
  buf.writeUInt32LE(22, 18); // offset to image data

  // BITMAPINFOHEADER (offset 22)
  let o = 22;
  buf.writeUInt32LE(40, o); // header size
  buf.writeInt32LE(width, o + 4); // width
  buf.writeInt32LE(height * 2, o + 8); // height (XOR + AND mask = 64)
  buf.writeUInt16LE(1, o + 12); // planes
  buf.writeUInt16LE(32, o + 14); // bit count
  buf.writeUInt32LE(0, o + 16); // compression (BI_RGB)
  buf.writeUInt32LE(xorSize + andSize, o + 20); // image size
  buf.writeInt32LE(0, o + 24); // x pixels per meter
  buf.writeInt32LE(0, o + 28); // y pixels per meter
  buf.writeUInt32LE(0, o + 32); // colors used
  buf.writeUInt32LE(0, o + 36); // important colors

  // XOR bitmap (BGRA, bottom-up)
  o += 40;
  const cx = 15.5;
  const cy = 15.5;
  const rBall = 11.5;

  for (let y = 0; y < height; y++) { // bottom to top
    const realY = 31 - y;
    for (let x = 0; x < width; x++) {
      const idx = o + (y * width + x) * 4;
      const dx = x - cx;
      const dy = realY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check rounded corner of squircle (box 30x30 rounded radius 7)
      const absX = Math.abs(x - cx);
      const absY = Math.abs(realY - cy);
      let inBox = true;
      if (absX > 14 || absY > 14) {
        inBox = false;
      } else if (absX > 8 && absY > 8) {
        const cdx = absX - 8;
        const cdy = absY - 8;
        if (cdx * cdx + cdy * cdy > 36) inBox = false;
      }

      if (!inBox) {
        // Transparent
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
      } else if (dist <= rBall) {
        // Inside soccer ball
        // Center pentagon or seams
        const angle = Math.atan2(dy, dx);
        if (dist <= 4.5) {
          // Center pentagon: Dark #0F172A
          buf[idx] = 0x2A;
          buf[idx + 1] = 0x17;
          buf[idx + 2] = 0x0F;
          buf[idx + 3] = 0xFF;
        } else if (Math.abs(dist - rBall) < 1.2) {
          // Ball border
          buf[idx] = 0x2A;
          buf[idx + 1] = 0x17;
          buf[idx + 2] = 0x0F;
          buf[idx + 3] = 0xFF;
        } else if (dist > 4.5 && dist < 10.5 && (Math.abs(angle % (Math.PI * 2 / 5)) < 0.25 || Math.abs(dist - 7.5) < 0.6)) {
          // Seams
          buf[idx] = 0x2A;
          buf[idx + 1] = 0x17;
          buf[idx + 2] = 0x0F;
          buf[idx + 3] = 0xFF;
        } else {
          // White ball leather
          buf[idx] = 0xFF;
          buf[idx + 1] = 0xFF;
          buf[idx + 2] = 0xFF;
          buf[idx + 3] = 0xFF;
        }
      } else {
        // Green lawn background: #16A34A
        buf[idx] = 0x4A;
        buf[idx + 1] = 0xA3;
        buf[idx + 2] = 0x16;
        buf[idx + 3] = 0xFF;
      }
    }
  }

  // AND mask (all 0 for transparent pixels defined by alpha)
  // remaining bytes are already 0 from Buffer.alloc

  fs.writeFileSync('favicon.ico', buf);
  console.log('favicon.ico created successfully:', buf.length, 'bytes');
}

createIco32();

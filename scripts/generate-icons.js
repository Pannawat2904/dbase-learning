const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generate() {
  const svgPath = path.join(__dirname, '../src/app/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // 1. Generate 512x512 PNG
  const png512 = await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(__dirname, '../public/icon.png'), png512);
  fs.writeFileSync(path.join(__dirname, '../public/logo.png'), png512);
  fs.writeFileSync(path.join(__dirname, '../src/app/icon.png'), png512);

  // 2. Generate 180x180 Apple Touch Icon
  const png180 = await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(__dirname, '../public/apple-icon.png'), png180);
  fs.writeFileSync(path.join(__dirname, '../src/app/apple-icon.png'), png180);

  // 3. Generate 32x32 and 16x16 PNG and favicon.ico
  const png32 = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer();

  const png48 = await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toBuffer();

  // Overwrite favicon.ico with PNG format (modern browsers and platforms accept PNG in favicon.ico)
  // Or standard 32/48px PNG
  fs.writeFileSync(path.join(__dirname, '../public/favicon.ico'), png48);
  fs.writeFileSync(path.join(__dirname, '../src/app/favicon.ico'), png48);

  // Copy icon.svg to public
  fs.writeFileSync(path.join(__dirname, '../public/icon.svg'), svgBuffer);

  // 4. Generate 1200x630 OpenGraph Banner
  const ogSvg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="50%" stop-color="#1e1b4b" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
      <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#60a5fa" />
        <stop offset="100%" stop-color="#a855f7" />
      </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bg)" />
    
    <!-- Soft Glow Orbs -->
    <circle cx="200" cy="200" r="300" fill="#3b82f6" opacity="0.15" filter="blur(80px)" />
    <circle cx="1000" cy="450" r="280" fill="#8b5cf6" opacity="0.15" filter="blur(80px)" />
    
    <!-- Left Logo Embedded -->
    <g transform="translate(120, 165) scale(0.6)">
      ${svgBuffer.toString().replace(/<\?xml.*?\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
    </g>
    
    <!-- Right Texts -->
    <g transform="translate(480, 240)">
      <rect x="0" y="-45" width="220" height="36" rx="18" fill="#3b82f6" opacity="0.2" />
      <text x="110" y="-22" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="#60a5fa" text-anchor="middle" letter-spacing="2">SMART LMS PLATFORM</text>
      
      <text x="0" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" fill="#ffffff" letter-spacing="-1">
        DBASE Learning <tspan fill="url(#titleGrad)">AI</tspan>
      </text>
      
      <text x="0" y="105" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="500" fill="#94a3b8">
        ระบบการเรียนรู้อัจฉริยะสำหรับรายวิชาโปรแกรมฐานข้อมูล
      </text>

      <text x="0" y="150" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="400" fill="#64748b">
        One Group Pretest-Posttest Research Platform • Next.js + Supabase
      </text>
    </g>
  </svg>
  `;

  const ogBuffer = await sharp(Buffer.from(ogSvg))
    .resize(1200, 630)
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(__dirname, '../public/og-image.png'), ogBuffer);
  fs.writeFileSync(path.join(__dirname, '../src/app/opengraph-image.png'), ogBuffer);

  console.log('✅ All icons and banners generated successfully!');
}

generate().catch(console.error);

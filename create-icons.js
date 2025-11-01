// Simple icon generation script for Node.js with canvas
// Run with: node create-icons.js

const fs = require('fs');

// Create a simple SVG icon that can be converted to PNG
function generateSVGIcon(size) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f3460;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#16213e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
        </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="${size}" height="${size}" fill="url(#bg)"/>

    <!-- Border -->
    <rect x="${size * 0.05}" y="${size * 0.05}" width="${size * 0.9}" height="${size * 0.9}"
          fill="none" stroke="#f0a500" stroke-width="${size * 0.05}"/>

    <!-- Sword -->
    <polygon points="${size * 0.3},${size * 0.7} ${size * 0.7},${size * 0.3} ${size * 0.75},${size * 0.35} ${size * 0.35},${size * 0.75}"
             fill="#e94560"/>

    <!-- Shield -->
    <circle cx="${size * 0.6}" cy="${size * 0.6}" r="${size * 0.15}" fill="#3498db"/>

    <!-- Text -->
    <text x="${size * 0.5}" y="${size * 0.88}" font-family="Arial, sans-serif"
          font-size="${size * 0.15}" font-weight="bold" fill="#f0a500"
          text-anchor="middle">10分</text>
</svg>`;
}

// Generate SVG files
const svg192 = generateSVGIcon(192);
const svg512 = generateSVGIcon(512);

fs.writeFileSync('icon-192.svg', svg192);
fs.writeFileSync('icon-512.svg', svg512);

console.log('SVG icons created: icon-192.svg, icon-512.svg');
console.log('');
console.log('To convert to PNG, you can:');
console.log('1. Use an online converter like https://cloudconvert.com/svg-to-png');
console.log('2. Use ImageMagick: convert icon-192.svg icon-192.png');
console.log('3. Use the generate-icons.html file in a browser');
console.log('');
console.log('For now, the PWA will work but may show default icons until PNG files are added.');

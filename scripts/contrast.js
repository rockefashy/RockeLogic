function luminance(hex) {
  const rgb = hex.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16) / 255);
  const a = rgb.map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function ratio(hex1, hex2) {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const surfaces = {
  surface: '#faf8f4',
  surfaceAlt: '#f4efe6',
  white: '#ffffff'
};

const current = {
  'gold (#b8955a)': '#b8955a',
  'gold2 (#d4b07a)': '#d4b07a',
  'gold3 (#f0e6d0)': '#f0e6d0',
  'goldText (#8a6a33)': '#8a6a33',
  'ink3 (#6b675f)': '#6b675f',
  'ink2 (#3a3834)': '#3a3834'
};

console.log('--- Current Color Contrast Ratios ---');
for (const [sName, sHex] of Object.entries(surfaces)) {
  console.log(`\nAgainst ${sName} (${sHex}):`);
  for (const [cName, cHex] of Object.entries(current)) {
    const r = ratio(cHex, sHex);
    console.log(`  ${cName.padEnd(20)}: ${r.toFixed(2)}:1 ${r >= 4.5 ? 'PASS (AA normal)' : r >= 3.0 ? 'PASS (AA large only)' : 'FAIL'}`);
  }
}

// Find optimal accessible warm gold/bronze and muted ink
console.log('\n--- Finding Accessible Replacements (>= 4.5:1 on both #faf8f4 and #ffffff) ---');
for (let l = 28; l <= 40; l++) {
  // Try tweaking lightness in HSL or RGB
}

function testCandidate(name, hex) {
  const rSurf = ratio(hex, surfaces.surface);
  const rAlt = ratio(hex, surfaces.surfaceAlt);
  const rWhite = ratio(hex, surfaces.white);
  console.log(`${name} (${hex}): surface=${rSurf.toFixed(2)}:1, alt=${rAlt.toFixed(2)}:1, white=${rWhite.toFixed(2)}:1 -> ${rSurf >= 4.5 && rAlt >= 4.5 && rWhite >= 4.5 ? 'PASS ALL' : 'FAIL'}`);
}

console.log('\nTesting goldText candidates:');
testCandidate('#8a6a33', '#8a6a33'); // current
testCandidate('#82632e', '#82632e');
testCandidate('#7b5c27', '#7b5c27');
testCandidate('#745520', '#745520');
testCandidate('#6e501d', '#6e501d');

console.log('\nTesting ink3 (secondary captions) candidates:');
testCandidate('#6b675f', '#6b675f'); // current
testCandidate('#5e5a52', '#5e5a52');
testCandidate('#545048', '#545048');

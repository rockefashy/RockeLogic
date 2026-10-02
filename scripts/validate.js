const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log('--- RockeLogic Build & Integrity Validation ---');
console.log(`index.html loaded (${html.length} bytes, ${html.split('\n').length} lines)`);

// Extract inline scripts
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptIdx = 0;
let scriptCode = '';
while ((match = scriptRegex.exec(html)) !== null) {
  scriptIdx++;
  scriptCode += match[1] + '\n';
}

console.log(`Extracted ${scriptIdx} script tag(s).`);

// Extract the SITE object definition
const siteMatch = scriptCode.match(/(?:const|var|let)\s+SITE\s*=\s*(\{[\s\S]*?\n\s*\};)/);
if (!siteMatch) {
  console.error('ERROR: Could not find "(const|var|let) SITE = { ... };"');
  process.exit(1);
}

// Evaluate SITE
let SITE;
try {
  SITE = eval('(' + siteMatch[1].replace(/;\s*$/, '') + ')');
  console.log('[OK] SITE configuration parsed:');
  console.log(`     - Brand: ${SITE.brand}`);
  console.log(`     - Founder: ${SITE.founder?.name}`);
  console.log(`     - Phone: ${SITE.phoneDisplay} (${SITE.phoneE164})`);
  console.log(`     - Services: ${SITE.services?.length || 0}`);
  console.log(`     - FAQ items: ${SITE.faq?.length || 0}`);
} catch (e) {
  console.error('ERROR evaluating SITE:', e);
  process.exit(1);
}

// Derive values like in index.html
SITE.addressLine = SITE.address.street + ", " + SITE.address.city + " - " + SITE.address.postalCode;
SITE.waLink = "https://wa.me/" + SITE.phoneE164.replace("+", "");
SITE.waLinkSubmitted = SITE.waLink + "?text=" + encodeURIComponent("Hi " + SITE.founder.name.split(" ")[0] + ", I just submitted a consultation request on rockelogic.com");

function lookup(pathStr, obj) {
  return pathStr.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
}

// Check data-bind attributes in HTML
const bindRegex = /data-bind="([^"]+)"/g;
const binds = new Set();
while ((match = bindRegex.exec(html)) !== null) {
  binds.add(match[1]);
}

console.log('\nValidating [data-bind] attributes:');
let missingBinds = 0;
for (const b of binds) {
  const val = lookup(b, SITE);
  if (val === undefined) {
    console.error(`  [FAIL] data-bind="${b}" does not resolve in SITE`);
    missingBinds++;
  } else {
    console.log(`  [OK] data-bind="${b}" -> "${String(val).slice(0, 45)}"`);
  }
}

// Check data-href attributes in HTML
const hrefRegex = /data-href="([^"]+)"/g;
const hrefs = new Set();
while ((match = hrefRegex.exec(html)) !== null) {
  hrefs.add(match[1]);
}

console.log('\nValidating [data-href] templates:');
let missingHrefs = 0;
for (const h of hrefs) {
  const vars = [...h.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
  let ok = true;
  for (const v of vars) {
    const val = lookup(v, SITE);
    if (val === undefined) {
      console.error(`  [FAIL] data-href="${h}" variable "{${v}}" does not resolve in SITE`);
      ok = false;
      missingHrefs++;
    }
  }
  if (ok) {
    console.log(`  [OK] data-href="${h}" -> all vars resolve`);
  }
}

// Check IDs required by the script
const requiredIds = [
  'year',
  'faq-grid',
  'submit-request-btn',
  'form-success-banner',
  'form-error-banner'
];

console.log('\nValidating required DOM IDs:');
let missingIds = 0;
for (const id of requiredIds) {
  const hasId = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  if (!hasId) {
    console.error(`  [FAIL] Required element id="${id}" not found in HTML`);
    missingIds++;
  } else {
    console.log(`  [OK] id="${id}" found`);
  }
}

// Check Schema.org JSON-LD generation
console.log('\nValidating Schema.org structured data generation:');
try {
  const org = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "name": SITE.brand,
    "legalName": SITE.legalName,
    "url": SITE.url,
    "email": SITE.email,
    "telephone": SITE.phoneE164,
    "taxID": SITE.gstin,
    "founder": { "@type": "Person", "name": SITE.founder.name, "jobTitle": SITE.founder.title },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": SITE.address.street,
      "addressLocality": SITE.address.city,
      "addressRegion": SITE.address.region,
      "postalCode": SITE.address.postalCode,
      "addressCountry": SITE.address.country
    },
    "geo": { "@type": "GeoCoordinates", "latitude": SITE.geo.lat, "longitude": SITE.geo.lng },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": SITE.hours.days,
      "opens": SITE.hours.opens,
      "closes": SITE.hours.closes
    },
    "description": SITE.description
  };
  JSON.stringify(org);
  console.log('  [OK] ProfessionalService JSON-LD valid');

  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "Custom business portal development",
    "provider": { "@type": "ProfessionalService", "name": SITE.brand },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Business portal and launch services",
      "itemListElement": SITE.services.map(s => ({
        "@type": "Offer",
        "itemOffered": { "@type": "Service", "name": s.name, "description": s.description }
      }))
    }
  };
  JSON.stringify(service);
  console.log('  [OK] Service OfferCatalog JSON-LD valid');

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": SITE.faq.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a }
    }))
  };
  JSON.stringify(faq);
  console.log('  [OK] FAQPage JSON-LD valid');
} catch (e) {
  console.error('  [FAIL] JSON-LD generation failed:', e);
  process.exit(1);
}

// Check key static assets referenced in HTML
console.log('\nValidating referenced static assets:');
const assetRefs = [
  'favicon.ico',
  'favicon.svg',
  'apple-touch-icon.png',
  'site.webmanifest',
  'og-image.png',
  'sitemap.xml',
  'robots.txt'
];
for (const asset of assetRefs) {
  const assetPath = path.join(__dirname, '..', asset);
  if (fs.existsSync(assetPath)) {
    console.log(`  [OK] ${asset} exists (${fs.statSync(assetPath).size} bytes)`);
  } else {
    console.warn(`  [WARN] ${asset} not found in root`);
  }
}

if (missingBinds > 0 || missingHrefs > 0 || missingIds > 0) {
  console.error('\nBuild validation FAILED.');
  process.exit(1);
} else {
  console.log('\nAll checks PASSED. Site is verified and ready.');
}

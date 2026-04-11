// Script to compare translation keys across en, fr, ar blocks
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'contexts', 'LanguageContext.jsx');
const content = fs.readFileSync(filePath, 'utf-8');

// Find language blocks by finding the pattern: en: {, fr: {, ar: {
// We need to extract the object content for each language

function extractLanguageBlock(content, lang) {
  // Match the start of the language block
  const patterns = [
    new RegExp(`^\\s*${lang}:\\s*\\{`, 'm'),
    new RegExp(`\\b${lang}:\\s*\\{`, 'm'),
  ];
  
  let startIdx = -1;
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      startIdx = match.index + match[0].length;
      break;
    }
  }
  
  if (startIdx === -1) {
    console.error(`Could not find ${lang} block`);
    return null;
  }

  // Now find the matching closing brace
  let depth = 1;
  let i = startIdx;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  
  return content.substring(startIdx, i - 1);
}

function extractKeys(blockContent) {
  const keys = new Set();
  // Match both quoted keys like 'key.name': and unquoted keys like keyName:
  const regex = /^\s*(?:'([^']+)'|"([^"]+)"|(\w[\w.]*\w|\w+))\s*:/gm;
  let match;
  while ((match = regex.exec(blockContent)) !== null) {
    const key = match[1] || match[2] || match[3];
    if (key) keys.add(key);
  }
  return keys;
}

function extractKeyValues(blockContent) {
  const map = new Map();
  // Match key: value pairs - handle multiline strings too
  const lines = blockContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*(?:'([^']+)'|"([^"]+)"|(\w[\w.]*\w|\w+))\s*:\s*(.+?)\s*,?\s*$/);
    if (match) {
      const key = match[1] || match[2] || match[3];
      let value = match[4];
      // Clean up the value
      if (value.endsWith(',')) value = value.slice(0, -1).trim();
      if (key) map.set(key, value);
    }
  }
  return map;
}

console.log('Extracting language blocks...\n');

const enBlock = extractLanguageBlock(content, 'en');
const frBlock = extractLanguageBlock(content, 'fr');
const arBlock = extractLanguageBlock(content, 'ar');

if (!enBlock || !frBlock || !arBlock) {
  process.exit(1);
}

const enKeys = extractKeys(enBlock);
const frKeys = extractKeys(frBlock);
const arKeys = extractKeys(arBlock);
const enKeyValues = extractKeyValues(enBlock);

console.log(`EN keys: ${enKeys.size}`);
console.log(`FR keys: ${frKeys.size}`);
console.log(`AR keys: ${arKeys.size}\n`);

// Find keys in EN but missing from FR
const missingFromFR = [];
for (const key of enKeys) {
  if (!frKeys.has(key)) {
    missingFromFR.push(key);
  }
}

// Find keys in EN but missing from AR
const missingFromAR = [];
for (const key of enKeys) {
  if (!arKeys.has(key)) {
    missingFromAR.push(key);
  }
}

// Also check: keys in FR or AR but not in EN (extra keys)
const extraInFR = [];
for (const key of frKeys) {
  if (!enKeys.has(key)) {
    extraInFR.push(key);
  }
}
const extraInAR = [];
for (const key of arKeys) {
  if (!enKeys.has(key)) {
    extraInAR.push(key);
  }
}

console.log('=== KEYS MISSING FROM FRENCH (exist in EN but not FR) ===');
if (missingFromFR.length === 0) {
  console.log('None! French translation is complete.');
} else {
  console.log(`Found ${missingFromFR.length} missing key(s):\n`);
  for (const key of missingFromFR) {
    console.log(`  Key: '${key}'`);
    console.log(`  EN value: ${enKeyValues.get(key) || '(could not extract)'}`);
    console.log('');
  }
}

console.log('\n=== KEYS MISSING FROM ARABIC (exist in EN but not AR) ===');
if (missingFromAR.length === 0) {
  console.log('None! Arabic translation is complete.');
} else {
  console.log(`Found ${missingFromAR.length} missing key(s):\n`);
  for (const key of missingFromAR) {
    console.log(`  Key: '${key}'`);
    console.log(`  EN value: ${enKeyValues.get(key) || '(could not extract)'}`);
    console.log('');
  }
}

if (extraInFR.length > 0) {
  console.log(`\n=== EXTRA KEYS IN FRENCH (exist in FR but not EN) === (${extraInFR.length})`);
  for (const key of extraInFR) {
    console.log(`  '${key}'`);
  }
}

if (extraInAR.length > 0) {
  console.log(`\n=== EXTRA KEYS IN ARABIC (exist in AR but not EN) === (${extraInAR.length})`);
  for (const key of extraInAR) {
    console.log(`  '${key}'`);
  }
}

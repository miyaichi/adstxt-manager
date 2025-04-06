#!/usr/bin/env node
/**
 * Direct test for optimizeAdsTxt function
 */

require('ts-node/register');
const fs = require('fs');
const path = require('path');

// Direct import of validation.ts
const { optimizeAdsTxt } = require('./src/utils/validation');

if (!optimizeAdsTxt) {
  console.error('Failed to import optimizeAdsTxt function!');
  process.exit(1);
}

// Load the ads.txt content from a file
const itmediaContent = fs.readFileSync(path.join(__dirname, 'itmedia.co.jp-original.txt'), 'utf8');
console.log(`Loaded ads.txt content: ${itmediaContent.length} bytes, ${itmediaContent.split('\n').length} lines`);

// Optimize it
console.log('Optimizing content...');
const startTime = Date.now();
const optimizedContent = optimizeAdsTxt(itmediaContent, 'itmedia.co.jp');
const endTime = Date.now();

console.log(`Optimization completed in ${endTime - startTime}ms`);
console.log(`Optimized content: ${optimizedContent.length} bytes, ${optimizedContent.split('\n').length} lines`);

// Save optimized content
fs.writeFileSync(path.join(__dirname, 'itmedia.co.jp-optimized-direct.txt'), optimizedContent);
console.log('Saved optimized content to itmedia.co.jp-optimized-direct.txt');

// Calculate reduction stats
const originalLines = itmediaContent.split('\n').length;
const optimizedLines = optimizedContent.split('\n').length;
const linesReduction = originalLines - optimizedLines;
const linesReductionPercent = (linesReduction / originalLines * 100).toFixed(2);

const originalSize = itmediaContent.length;
const optimizedSize = optimizedContent.length;
const sizeReduction = originalSize - optimizedSize;
const sizeReductionPercent = (sizeReduction / originalSize * 100).toFixed(2);

console.log(`\nResults:`);
console.log(`- Original lines: ${originalLines}`);
console.log(`- Optimized lines: ${optimizedLines}`);
console.log(`- Lines reduction: ${linesReduction} (${linesReductionPercent}%)`);
console.log(`- Original size: ${originalSize} bytes`);
console.log(`- Optimized size: ${optimizedSize} bytes`);
console.log(`- Size reduction: ${sizeReduction} bytes (${sizeReductionPercent}%)`);

// Check for any duplicates in the optimized content
const uniqueEntries = new Set();
const duplicates = [];
const optimizedLines2 = optimizedContent.split('\n');

optimizedLines2.forEach(line => {
  const trimmed = line.trim();
  // Skip comments and empty lines
  if (!trimmed || trimmed.startsWith('#')) return;
  
  // Check if this is a record (has commas) or a variable (has =)
  if (trimmed.includes(',')) {
    // Record format: domain, account_id, relationship, [certification]
    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      const key = `${parts[0].toLowerCase()}|${parts[1]}|${parts[2]}`;
      if (uniqueEntries.has(key)) {
        duplicates.push({
          type: 'record',
          key,
          line: trimmed
        });
      } else {
        uniqueEntries.add(key);
      }
    }
  } else if (trimmed.includes('=')) {
    // Variable format: TYPE=value
    const [type, value] = trimmed.split('=', 2);
    const key = `${type.toUpperCase()}=${value.trim()}`;
    if (uniqueEntries.has(key)) {
      duplicates.push({
        type: 'variable',
        key,
        line: trimmed
      });
    } else {
      uniqueEntries.add(key);
    }
  }
});

if (duplicates.length > 0) {
  console.log(`\nWARNING: Found ${duplicates.length} duplicates in optimized content!`);
  duplicates.slice(0, 10).forEach((dup, i) => {
    console.log(`  ${i+1}: ${dup.type} - ${dup.line}`);
  });
} else {
  console.log('\nVerification complete: No duplicates found in optimized content.');
}
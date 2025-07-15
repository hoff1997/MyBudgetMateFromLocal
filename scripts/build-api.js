#!/usr/bin/env node

import { execSync } from 'child_process';
import { readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// Function to recursively find all .ts files in api directory
function findTsFiles(dir) {
  const files = [];
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

console.log('🔧 Building API functions for Vercel...');

// Find all TypeScript files in api directory
const tsFiles = findTsFiles('api');

// Build each file to JavaScript
for (const file of tsFiles) {
  const outputFile = file.replace(/\.ts$/, '.js').replace(/^api\//, 'dist/api/');
  const outputDir = dirname(outputFile);
  
  // Create output directory
  mkdirSync(outputDir, { recursive: true });
  
  // Build the TypeScript file to JavaScript
  const cmd = `esbuild "${file}" --platform=node --format=cjs --target=node18 --outfile="${outputFile}" --bundle --external:@vercel/node --external:@supabase/supabase-js --external:jsonwebtoken`;
  
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`✅ Built: ${file} → ${outputFile}`);
  } catch (error) {
    console.error(`❌ Failed to build: ${file}`);
    console.error(error.message);
  }
}

console.log('✅ API build complete!');
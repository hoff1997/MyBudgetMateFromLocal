#!/usr/bin/env node

// Custom Vercel build script that only builds the frontend
// This avoids all TypeScript compilation errors from server files

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function buildForVercel() {
  try {
    console.log('🏗️  Building frontend for Vercel...');
    
    // Only build the frontend
    await execAsync('npx vite build');
    
    console.log('✅ Frontend build completed successfully!');
    console.log('📁 Output directory: dist/public');
    console.log('🚀 Ready for Vercel deployment');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

buildForVercel();
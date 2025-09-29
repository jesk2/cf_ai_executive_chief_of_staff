#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy frontend files to dist
const frontendDir = path.join(__dirname, 'frontend');
if (fs.existsSync(frontendDir)) {
  const files = fs.readdirSync(frontendDir);
  for (const file of files) {
    const srcFile = path.join(frontendDir, file);
    const destFile = path.join(distDir, file);
    
    if (fs.statSync(srcFile).isDirectory()) {
      // Recursively copy directories
      copyDir(srcFile, destFile);
    } else {
      // Copy files
      fs.copyFileSync(srcFile, destFile);
    }
  }
  console.log('✅ Frontend files copied to dist/ - ' + new Date().toISOString());
} else {
  console.error('❌ Frontend directory not found');
  process.exit(1);
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  for (const file of files) {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    
    if (fs.statSync(srcFile).isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  }
}
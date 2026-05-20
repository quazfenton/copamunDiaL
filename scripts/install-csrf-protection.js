#!/usr/bin/env node
/**
 * CSRF Protection Batch Installer
 * 
 * This script adds CSRF protection to all state-changing API routes
 * Usage: node scripts/install-csrf-protection.js
 */

const fs = require('fs');
const path = require('path');

const API_ROUTES_DIR = path.join(__dirname, '..', 'app', 'api');

// Routes that should have CSRF protection (POST, PUT, DELETE, PATCH)
const routesToProtect = [
  'teams/route.ts',
  'teams/[id]/route.ts',
  'teams/[id]/members/route.ts',
  'teams/[id]/members/[userId]/route.ts',
  'teams/[id]/invites/route.ts',
  'matches/route.ts',
  'matches/[id]/route.ts',
  'matches/[id]/events/route.ts',
  'players/route.ts',
  'players/[id]/route.ts',
  'tournaments/route.ts',
  'tournaments/[id]/route.ts',
  'tournaments/[id]/register/route.ts',
  'leagues/route.ts',
  'leagues/[id]/route.ts',
  'leagues/[id]/teams/route.ts',
  'friends/route.ts',
  'friends/[friendshipId]/route.ts',
  'pickup-games/route.ts',
  'pickup-games/[id]/route.ts',
  'pickup-games/[id]/join/route.ts',
  'notifications/route.ts',
  'notifications/[id]/route.ts',
  'notifications/mark-all-read/route.ts',
  'tactics/formations/route.ts',
  'upload/route.ts',
  'auth/2fa/route.ts',
];

const CSRF_IMPORT = "import { withCSRF } from '@/lib/csrf-middleware'";

function addCSRFProtection(filePath) {
  const fullPath = path.join(API_ROUTES_DIR, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⊘ Skipping (not found): ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if already has CSRF protection
  if (content.includes('withCSRF')) {
    console.log(`✓ Already protected: ${filePath}`);
    return;
  }
  
  // Check if file has POST/PUT/DELETE/PATCH exports
  const hasStateChangingMethod = /(export\s+async\s+function\s+(POST|PUT|DELETE|PATCH)|export\s+const\s+(POST|PUT|DELETE|PATCH)\s*=)/.test(content);
  
  if (!hasStateChangingMethod) {
    console.log(`⊘ No state-changing methods: ${filePath}`);
    return;
  }
  
  // Add import
  if (!content.includes("from '@/lib/csrf-middleware'")) {
    // Find last import line
    const importMatch = content.match(/(import\s+.*?from\s+['"].*?['"];?\n)/g);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      content = content.replace(lastImport, lastImport + CSRF_IMPORT + '\n');
    }
  }
  
  // Wrap state-changing exports
  content = content.replace(
    /export\s+async\s+function\s+(POST|PUT|DELETE|PATCH)\(/g,
    'async function $1Handler('
  );
  
  // Add wrapped exports at the end
  const wrappedExports = [];
  if (content.includes('async function POSTHandler(')) {
    wrappedExports.push("export const POST = withCSRF(POSTHandler)");
  }
  if (content.includes('async function PUTHandler(')) {
    wrappedExports.push("export const PUT = withCSRF(PUTHandler)");
  }
  if (content.includes('async function DELETEHandler(')) {
    wrappedExports.push("export const DELETE = withCSRF(DELETEHandler)");
  }
  if (content.includes('async function PATCHHandler(')) {
    wrappedExports.push("export const PATCH = withCSRF(PATCHHandler)");
  }
  
  if (wrappedExports.length > 0) {
    content = content.trimEnd() + '\n\n// Wrap state-changing methods with CSRF protection\n' + wrappedExports.join('\n') + '\n';
  }
  
  fs.writeFileSync(fullPath, content);
  console.log(`✓ Protected: ${filePath}`);
}

console.log('🔒 Installing CSRF protection to API routes...\n');

routesToProtect.forEach(route => addCSRFProtection(route));

console.log('\n✅ CSRF protection installation complete!');
console.log('\nNext steps:');
console.log('1. Run: npm run build');
console.log('2. Test CSRF token flow in browser');
console.log('3. Update client code to include X-CSRF-Token header');

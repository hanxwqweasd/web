const { execSync } = require('child_process');
console.log('[BOOT] Running prisma db push...');
try {
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  console.log('[BOOT] Database ready');
} catch (e) {
  console.error('[BOOT] DB init error:', e.message);
}
console.log('[BOOT] Starting server...');
require('.next/standalone/server.js');
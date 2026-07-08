const { spawn } = require('child_process');
const http = require('http');

let child = null;
let restarting = false;

function startServer() {
  if (child) { child.kill('SIGKILL'); child = null; }
  console.log('[KEEPALIVE] Starting dev server...');
  child = spawn('bun', ['run', 'dev'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }
  });
  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));
  child.on('exit', (code) => {
    console.log('[KEEPALIVE] Server exited code', code, '- restart in 2s');
    child = null;
    if (!restarting) {
      restarting = true;
      setTimeout(() => { restarting = false; startServer(); }, 2000);
    }
  });
}

function checkHealth() {
  const req = http.get('http://localhost:3000/', (res) => { res.resume(); });
  req.on('error', () => {
    if (!child) startServer();
  });
  req.setTimeout(2000, () => req.destroy());
}

startServer();
setInterval(checkHealth, 10000);
console.log('[KEEPALIVE] Watchdog active');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  // Handle POST for local form testing -> saves to leads.json
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = Object.fromEntries(new URLSearchParams(body));
        const lead = {
          id: Date.now(),
          receivedAt: new Date().toLocaleString(),
          name: parsed.name || '',
          phone: parsed.phone || '',
          email: parsed.email || '',
          portal_type: parsed.portal_type || '',
          registration_status: parsed.registration_status || '',
          brief: parsed.brief || ''
        };

        const dbFile = path.join(__dirname, 'leads.json');
        let leads = [];
        if (fs.existsSync(dbFile)) {
          try {
            leads = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
          } catch (e) {
            leads = [];
          }
        }
        leads.unshift(lead);
        fs.writeFileSync(dbFile, JSON.stringify(leads, null, 2), 'utf8');
        console.log(`[LOCAL DB] Lead saved successfully: ${lead.name} | ${lead.phone} | ${lead.portal_type}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, savedToLocalDb: true }));
      } catch (err) {
        console.error('[LOCAL DB] Error saving lead:', err);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      }
    });
    return;
  }

  // Handle GET static files
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  
  // Normalize path and resolve within __dirname
  const cleanedPath = reqPath.replace(/^[/\\]+/, '');
  const rootDir = path.resolve(__dirname);
  const filePath = path.resolve(rootDir, cleanedPath);

  // Security check 1: Prevent directory traversal outside root directory
  if (!filePath.startsWith(rootDir + path.sep) && filePath !== rootDir) {
    res.writeHead(403, { 'Content-Type': 'text/html' });
    res.end('<h1>403 Forbidden</h1>');
    return;
  }

  // Security check 2: Deny access to hidden dotfiles (e.g. .git, .env, .gitignore)
  const relPath = path.relative(rootDir, filePath);
  if (relPath.split(path.sep).some(segment => segment.startsWith('.'))) {
    res.writeHead(403, { 'Content-Type': 'text/html' });
    res.end('<h1>403 Forbidden</h1>');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at:`);
  console.log(`- http://localhost:${PORT}/`);
  console.log(`- http://127.0.0.1:${PORT}/`);
  console.log(`Local DB enabled: Submissions will write to leads.json`);
});

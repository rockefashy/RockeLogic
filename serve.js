const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
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
  if (reqPath === '/') reqPath = '/index.html';
  
  let filePath = path.join(__dirname, reqPath);

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

// Sarthi StudyMate - Zero-dependency Static File Dev Server
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Normalize URL path and strip query strings
  let safeUrl = req.url.split('?')[0];
  if (safeUrl === '/') {
    safeUrl = '/index.html';
  }

  const rootDir = path.resolve(__dirname);
  const resolvedPath = path.join(rootDir, safeUrl);

  if (!resolvedPath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  const extname = String(path.extname(resolvedPath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(resolvedPath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Serve index.html for Single Page Application routing if requested path not found
        fs.readFile(path.join(rootDir, 'index.html'), (err, indexContent) => {
          if (err) {
            res.writeHead(500);
            res.end('Error loading index.html');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Sarthi StudyMate is running!`);
  console.log(`👉 Access URL: http://localhost:${PORT}`);
  console.log(`💡 Press Ctrl+C to stop the dev server`);
  console.log(`======================================================\n`);
});

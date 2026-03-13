// Production server for Aura App
// Serves static files and proxies API requests

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { createProxyServer } = require('http-proxy');

const PORT = 5173;
const DIST_DIR = path.join(__dirname, 'dist');

// Create proxy server (backend only; ML service removed)
const backendProxy = createProxyServer({ target: 'http://localhost:8080', changeOrigin: true });

// Handle proxy errors
backendProxy.on('error', (err, req, res) => {
  console.error('Backend proxy error:', err.message);
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Backend unavailable' }));
});

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  
  // Proxy auth requests to backend
  if (url.startsWith('/auth')) {
    return backendProxy.web(req, res);
  }
  
  // Proxy API requests to backend
  if (url.startsWith('/api')) {
    return backendProxy.web(req, res);
  }
  
  // Serve static files
  // Удаляем ведущий слеш для правильной работы path.join
  const urlPath = url.startsWith('/') ? url.substring(1) : url;
  let filePath = path.join(DIST_DIR, urlPath);
  
  // Default to index.html for root
  if (url === '/' || url === '') {
    filePath = path.join(DIST_DIR, 'index.html');
  }
  
  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try adding .html extension only if no extension present
      if (!path.extname(urlPath)) {
        filePath = path.join(DIST_DIR, urlPath + '.html');
        fs.stat(filePath, (err2, stats2) => {
          if (err2 || !stats2.isFile()) {
            // Fallback to app.html for SPA routing (only for non-asset routes)
            if (!urlPath.startsWith('assets/')) {
              filePath = path.join(DIST_DIR, 'app.html');
              serveFile(filePath, res, req);
            } else {
              // 404 for missing assets
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Not Found: ' + urlPath);
            }
          } else {
            serveFile(filePath, res, req);
          }
        });
        return;
      }
      // 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found: ' + urlPath);
      return;
    }
    serveFile(filePath, res, req);
  });
});

// Compressible content types
const compressibleTypes = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.xml']);

function serveFile(filePath, res, req) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
    };
    
    // Enable gzip compression for text-based files
    const acceptEncoding = req && req.headers['accept-encoding'] || '';
    if (compressibleTypes.has(ext) && acceptEncoding.includes('gzip')) {
      zlib.gzip(content, (err, compressed) => {
        if (err) {
          res.writeHead(200, headers);
          res.end(content);
          return;
        }
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        res.end(compressed);
      });
    } else {
      res.writeHead(200, headers);
      res.end(content);
    }
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== Aura Production Server ===`);
  console.log(`Serving static files from: ${DIST_DIR}`);
  console.log(`Server running at http://0.0.0.0:${PORT}`);
  console.log(`\nProxying:`);
  console.log(`  /auth/*  -> http://localhost:8080`);
  console.log(`  /api/*   -> http://localhost:8080 (backend)`);
  console.log(`  ML APIs  -> http://localhost:8000`);
  console.log(`\nReady for Tailscale Funnel!`);
});

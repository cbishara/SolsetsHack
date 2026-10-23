// Metro config with a development proxy: requests to /api/* go to the SOL
// server (server/, Amaru's lane). The web preview avoids CORS and the phone
// reaches the server through Metro without knowing its address. The server
// token stays on this Mac (SOL_SERVER_TOKEN), never inside the app bundle.
const http = require('node:http');
const https = require('node:https');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const target = new URL(process.env.SOL_SERVER_URL || 'http://localhost:3002');
const token = process.env.SOL_SERVER_TOKEN || '';

function proxy(req, res) {
  const lib = target.protocol === 'https:' ? https : http;
  const headers = { ...req.headers, host: target.host };
  if (token) headers.authorization = `Bearer ${token}`;
  delete headers.origin;
  const upstream = lib.request(
    { protocol: target.protocol, hostname: target.hostname, port: target.port, method: req.method, path: req.url, headers, timeout: 15000 },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('timeout', () => upstream.destroy(new Error('timeout')));
  upstream.on('error', (error) => {
    if (res.headersSent) return res.end();
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'server_unreachable', message: `No pude llegar al servidor de SOL (${target.origin}): ${error.message}` }));
  });
  req.pipe(upstream);
}

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    if (req.url && req.url.startsWith('/api/')) return proxy(req, res);
    return middleware(req, res, next);
  },
};

module.exports = config;

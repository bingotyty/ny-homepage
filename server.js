const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 6644;

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 0,
  etag: true,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  },
}));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[ny-homepage] listening on http://127.0.0.1:${PORT}`);
});

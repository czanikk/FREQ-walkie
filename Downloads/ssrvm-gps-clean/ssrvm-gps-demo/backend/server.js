// backend/server.js
const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const path    = require('path');
const config  = require('./config');
const { startSimulator, getAllBuses, getBusById } = require('./simulator');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', express.static(path.join(__dirname, '../app')));

app.get('/health', (_, res) =>
  res.json({ ok: true, branch: config.SCHOOL.BRANCH })
);

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (
    username?.trim().toLowerCase() !== config.AUTH.USERNAME.toLowerCase() ||
    password !== config.AUTH.PASSWORD
  ) {
    return res.status(401).json({ success: false, message: 'Wrong username or password' });
  }
  const token = jwt.sign(
    { username, role: 'viewer' },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES }
  );
  res.json({ success: true, token, school: config.SCHOOL, mapConfig: config.MAP });
});

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ success: false, message: 'Login required' });
  try { req.user = jwt.verify(token, config.JWT_SECRET); next(); }
  catch { res.status(401).json({ success: false, message: 'Session expired' }); }
};

app.get('/api/school', auth, (_, res) =>
  res.json({ success: true, school: config.SCHOOL, mapConfig: config.MAP })
);

app.get('/api/buses',     auth, (_, res) =>
  res.json({ success: true, buses: getAllBuses() })
);

app.get('/api/buses/:id', auth, (req, res) => {
  const bus = getBusById(req.params.id);
  if (!bus) return res.status(404).json({ success: false });
  res.json({ success: true, bus });
});

app.get('/api/track/:id', auth, (req, res) => {
  res.writeHead(200, {
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(':ok\n\n');

  const send = () => {
    const b = getBusById(req.params.id);
    if (b) res.write(`data: ${JSON.stringify({ type:'LOC', bus:b })}\n\n`);
  };
  send();
  const iv = setInterval(send, 2000);
  const hb = setInterval(() => res.write(':hb\n\n'), 25000);
  req.on('close', () => { clearInterval(iv); clearInterval(hb); });
});

app.get('/api/track-all', auth, (req, res) => {
  res.writeHead(200, {
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(':ok\n\n');
  const send = () =>
    res.write(`data: ${JSON.stringify({ type:'ALL', buses: getAllBuses() })}\n\n`);
  send();
  const iv = setInterval(send, 2500);
  const hb = setInterval(() => res.write(':hb\n\n'), 25000);
  req.on('close', () => { clearInterval(iv); clearInterval(hb); });
});

startSimulator();
app.listen(config.PORT, () =>
  console.log(`SSRVM GPS [${config.SCHOOL.BRANCH}] running on http://localhost:${config.PORT}`)
);

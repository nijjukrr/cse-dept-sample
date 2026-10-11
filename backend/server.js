require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy topology configuration: defaults to false in unconfigured local/dev mode to prevent synthetic header spoofing.
// In Staging/Production environments behind PaaS load balancers (e.g. Render / Cloudflare / Nginx), set TRUST_PROXY=1 in env.
const trustProxyVal = process.env.TRUST_PROXY
  ? (process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY === 'false' ? false : (isNaN(process.env.TRUST_PROXY) ? process.env.TRUST_PROXY : parseInt(process.env.TRUST_PROXY)))
  : false;
app.set('trust proxy', trustProxyVal);

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim()).filter(Boolean)
  : [];
const isDev = (process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development') && !process.env.FRONTEND_URL;

app.use(cors((req, callback) => {
  const origin = req.header('Origin');
  const forwardedProtocol = req.header('x-forwarded-proto');
  const protocol = forwardedProtocol ? forwardedProtocol.split(',')[0].trim() : req.protocol;
  const sameOrigin = `${protocol}://${req.get('host')}`;
  const allowOrigin = !origin
    || origin === sameOrigin
    || allowedOrigins.includes(origin)
    || isDev;

  callback(null, {
    origin: allowOrigin,
    credentials: true
  });
}));

app.use(express.json());

// Routes
const asRouter = (loadedModule) => loadedModule.router || loadedModule.default || loadedModule;

app.use('/api/auth', asRouter(require('./routes/auth')));
app.use('/api/users', asRouter(require('./routes/users')));
app.use('/api/achievements', asRouter(require('./routes/achievements')));
app.use('/api/leaderboard', asRouter(require('./routes/leaderboard')));
app.use('/api/teams', asRouter(require('./routes/teams')));
app.use('/api/updates', asRouter(require('./routes/updates')));
app.use('/api/admin', asRouter(require('./routes/admin')));
app.use('/api/uploads', asRouter(require('./routes/uploads')));
app.use('/api/platforms', asRouter(require('./routes/platforms')));
app.use('/api/announcements', asRouter(require('./routes/announcements')));
app.use('/api/academics', asRouter(require('./routes/academics')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SIET CSE Portal API is running 🚀', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   SIET CSE Department Portal API     ║');
    console.log('║   Sri Shakthi Institute, Coimbatore   ║');
    console.log(`║   Running on http://localhost:${PORT}    ║`);
    console.log('╚════════════════════════════════════════╝\n');
  });
}

module.exports = app;

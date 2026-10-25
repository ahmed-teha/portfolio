require('dotenv').config();

const path = require('node:path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set before starting AgriProfit.');
}

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

if (isProduction) app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '16kb' }));
app.use(session({
  name: 'agriprofit.sid',
  store: new pgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: 'RATE_LIMITED' })
});

function requireSameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin && origin !== `${req.protocol}://${req.get('host')}`) {
    return res.status(403).json({ error: 'INVALID_ORIGIN' });
  }
  next();
}

function publicUser(user) {
  return { id: user.id, fullName: user.full_name, email: user.email };
}

function establishSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(error => {
      if (error) return reject(error);
      req.session.user = publicUser(user);
      req.session.save(saveError => saveError ? reject(saveError) : resolve());
    });
  });
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/app.js', (req, res) => res.sendFile(path.join(__dirname, 'app.js')));

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post('/api/auth/register', requireSameOrigin, authRateLimit, async (req, res, next) => {
  try {
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!fullName || fullName.length > 150) {
      return res.status(400).json({ error: 'INVALID_NAME' });
    }
    if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'INVALID_EMAIL' });
    }
    if (password.length < 12 || password.length > 128) {
      return res.status(400).json({ error: 'INVALID_PASSWORD' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, preferred_currency, preferred_unit_system)
       VALUES ($1, $2, $3, 'ETB', 'metric')
       RETURNING id, email, full_name`,
      [email, passwordHash, fullName]
    );

    await establishSession(req, result.rows[0]);
    res.status(201).json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'EMAIL_IN_USE' });
    next(error);
  }
});

app.post('/api/auth/login', requireSameOrigin, authRateLimit, async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password || email.length > 255 || password.length > 128) {
      return res.status(400).json({ error: 'INVALID_CREDENTIALS' });
    }

    const result = await pool.query(
      'SELECT id, email, full_name, password_hash, is_active FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user || !user.is_active || !passwordMatches) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    await establishSession(req, user);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', requireSameOrigin, (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('agriprofit.sid', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax'
    });
    res.status(204).end();
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'SERVER_ERROR' });
});

async function start() {
  await pool.query('SELECT 1');
  app.listen(port, () => console.log(`AgriProfit is running at http://localhost:${port}`));
}

if (require.main === module) {
  start().catch(error => {
    console.error('Could not start AgriProfit:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, pool };
import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import crypto from 'crypto';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ── Token store (in-memory for local dev) ─────────────────────────────────
const tokens = new Map(); // token → { userId, exp }

// Middleware to validate token
function requireToken(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized - no valid session token' });
  }
  const session = tokens.get(token);
  if (Date.now() > session.exp) {
    tokens.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }
  req.session = session;
  next();
}

// POST /api/auth/issue  →  issue a token for a logged-in userId
// Called by the frontend right after login (localStorage-based login)
app.post('/api/auth/issue', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, {
    userId,
    exp: Date.now() + 8 * 60 * 60 * 1000  // 8 hours
  });
  res.json({ success: true, token });
});

// POST /api/auth/revoke  →  invalidate a token on logout
app.post('/api/auth/revoke', (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  tokens.delete(token);
  res.json({ success: true });
});

// Helper: build a fresh mssql connection (no pool reuse)
async function withConnection(creds, fn) {
  const pool = new sql.ConnectionPool({
    user: creds.username,
    password: creds.password,
    database: creds.database,
    server: creds.host,
    pool: { max: 5, min: 0, idleTimeoutMillis: 15000 },
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 10000,
      requestTimeout: 30000,
    },
  });
  await pool.connect();
  try {
    return await fn(pool);
  } finally {
    await pool.close().catch(() => {});
  }
}

// POST /api/tables
app.post('/api/tables', requireToken, async (req, res) => {
  const { host, database, username, password } = req.body;
  if (!host || !database || !username || !password) {
    return res.status(400).json({ error: 'Missing connection parameters' });
  }
  try {
    const result = await withConnection({ host, database, username, password }, async (pool) => {
      return pool.request().query(`
        SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        ORDER BY TABLE_SCHEMA, TABLE_NAME
      `);
    });
    res.json({ success: true, tables: result.recordset });
  } catch (err) {
    console.error('[/api/tables]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/columns
app.post('/api/columns', requireToken, async (req, res) => {
  const { host, database, username, password, schema, table } = req.body;
  if (!host || !database || !username || !password || !table) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    const result = await withConnection({ host, database, username, password }, async (pool) => {
      return pool.request()
        .input('schema', sql.NVarChar, schema || 'dbo')
        .input('table', sql.NVarChar, table)
        .query(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = @table AND TABLE_SCHEMA = @schema
          ORDER BY ORDINAL_POSITION
        `);
    });
    res.json({ success: true, columns: result.recordset });
  } catch (err) {
    console.error('[/api/columns]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/query
app.post('/api/query', requireToken, async (req, res) => {
  const { host, database, username, password, query } = req.body;
  if (!host || !database || !username || !password || !query) {
    return res.status(400).json({ error: 'Missing connection or query parameters' });
  }
  try {
    const result = await withConnection({ host, database, username, password }, async (pool) => {
      return pool.request().query(query);
    });
    const columns = result.recordset.length > 0
      ? Object.keys(result.recordset[0])
      : [];
    res.json({ success: true, columns, rows: result.recordset });
  } catch (err) {
    console.error('[/api/query]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// No-token health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀  ATR Analytics API  →  http://localhost:${PORT}`);
  console.log(`    Endpoints: /api/auth/issue  /api/tables  /api/columns  /api/query`);
});

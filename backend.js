import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import crypto from 'crypto';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ── Database Configuration & Initialization ────────────────────────────────
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_HOST,
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const sysPool = new sql.ConnectionPool(dbConfig);

// Helper for passwords
const mockHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
};

async function initDatabase() {
  try {
    await sysPool.connect();
    console.log('📦 Connected to global DB (ATRAnalytics)');

    // Create Users table if not exists
    await sysPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
      CREATE TABLE Users (
        id VARCHAR(50) PRIMARY KEY,
        firstName NVARCHAR(100),
        lastName NVARCHAR(100),
        email NVARCHAR(255) UNIQUE,
        role VARCHAR(50),
        password VARCHAR(255),
        agencies NVARCHAR(MAX),
        permissions NVARCHAR(MAX)
      )
    `);

    // Insert default Admin user if table is empty
    const { recordset } = await sysPool.request().query('SELECT COUNT(*) as cnt FROM Users');
    if (recordset[0].cnt === 0) {
      console.log('🌱 Inserting default users...');
      await sysPool.request()
        .input('id1', sql.VarChar, '1')
        .input('fn1', sql.NVarChar, 'Admin')
        .input('ln1', sql.NVarChar, 'User')
        .input('email1', sql.NVarChar, 'admin@atr.com')
        .input('role1', sql.VarChar, 'admin')
        .input('pass1', sql.VarChar, mockHash('admin123'))
        .input('ag1', sql.NVarChar, JSON.stringify(['ATR Matriz', 'ATR Sucursal']))
        .input('perm1', sql.NVarChar, JSON.stringify({ areas: [], dashboards: [] }))
        .query(`
          INSERT INTO Users (id, firstName, lastName, email, role, password, agencies, permissions)
          VALUES (@id1, @fn1, @ln1, @email1, @role1, @pass1, @ag1, @perm1)
        `);

      await sysPool.request()
        .input('id2', sql.VarChar, '2')
        .input('fn2', sql.NVarChar, 'Dev')
        .input('ln2', sql.NVarChar, 'User')
        .input('email2', sql.NVarChar, 'dev@atr.com')
        .input('role2', sql.VarChar, 'dev')
        .input('pass2', sql.VarChar, mockHash('dev123'))
        .input('ag2', sql.NVarChar, JSON.stringify(['ATR Matriz']))
        .input('perm2', sql.NVarChar, JSON.stringify({ areas: [], dashboards: [] }))
        .query(`
          INSERT INTO Users (id, firstName, lastName, email, role, password, agencies, permissions)
          VALUES (@id2, @fn2, @ln2, @email2, @role2, @pass2, @ag2, @perm2)
        `);
    }
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
  }
}
initDatabase();

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

// POST /api/auth/issue  →  issue a token for a logged-in user
// Validates credentials against the global Users table
app.post('/api/auth/issue', async (req, res) => {
  const { email, password, userId } = req.body; // userId for fallback token re-issue

  if (userId && !email && !password) {
    // Fallback re-issue route (if token expired but user still stored in frontend localStorage)
    const token = crypto.randomBytes(32).toString('hex');
    tokens.set(token, {
      userId,
      exp: Date.now() + 8 * 60 * 60 * 1000  // 8 hours
    });
    return res.json({ success: true, token });
  }

  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  try {
    const passHash = mockHash(password);
    const result = await sysPool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE email = @email');

    const user = result.recordset[0];
    if (!user || (user.password !== passHash && user.password !== password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    tokens.set(token, {
      userId: user.id,
      exp: Date.now() + 8 * 60 * 60 * 1000  // 8 hours
    });

    // Parse JSON fields to match expected format
    const userData = {
      ...user,
      agencies: user.agencies ? JSON.parse(user.agencies) : [],
      permissions: user.permissions ? JSON.parse(user.permissions) : { areas: [], dashboards: [] }
    };

    // Update lastLoginAt etc could be done here if the table had those columns
    res.json({ success: true, token, user: userData });
  } catch (err) {
    console.error('[/api/auth/issue]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/revoke  →  invalidate a token on logout
app.post('/api/auth/revoke', (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  tokens.delete(token);
  res.json({ success: true });
});

// ── User CRUD Endpoints ───────────────────────────────────────────────────

// GET /api/users
app.get('/api/users', requireToken, async (req, res) => {
  try {
    const result = await sysPool.request().query('SELECT * FROM Users');
    const users = result.recordset.map(u => ({
      ...u,
      agencies: u.agencies ? JSON.parse(u.agencies) : [],
      permissions: u.permissions ? JSON.parse(u.permissions) : { areas: [], dashboards: [] }
    }));
    res.json({ success: true, users });
  } catch (err) {
    console.error('[/api/users GET]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users
app.post('/api/users', requireToken, async (req, res) => {
  const { firstName, lastName, email, role, password, agencies, permissions } = req.body;
  const newId = Date.now().toString();
  try {
    await sysPool.request()
      .input('id', sql.VarChar, newId)
      .input('fn', sql.NVarChar, firstName)
      .input('ln', sql.NVarChar, lastName)
      .input('email', sql.NVarChar, email)
      .input('role', sql.VarChar, role || 'user')
      .input('pass', sql.VarChar, mockHash(password || '123456'))
      .input('ag', sql.NVarChar, JSON.stringify(agencies || []))
      .input('perm', sql.NVarChar, JSON.stringify(permissions || { areas: [], dashboards: [] }))
      .query(`
        INSERT INTO Users (id, firstName, lastName, email, role, password, agencies, permissions)
        VALUES (@id, @fn, @ln, @email, @role, @pass, @ag, @perm)
      `);
    res.json({ success: true, user: { id: newId, firstName, lastName, email, role, agencies, permissions } });
  } catch (err) {
    console.error('[/api/users POST]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
app.delete('/api/users/:id', requireToken, async (req, res) => {
  try {
    await sysPool.request()
      .input('id', sql.VarChar, req.params.id)
      .query('DELETE FROM Users WHERE id = @id');
    res.json({ success: true });
  } catch (err) {
    console.error('[/api/users DELETE]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/agencies
app.put('/api/users/:id/agencies', requireToken, async (req, res) => {
  const { agencies } = req.body;
  try {
    await sysPool.request()
      .input('id', sql.VarChar, req.params.id)
      .input('ag', sql.NVarChar, JSON.stringify(agencies || []))
      .query('UPDATE Users SET agencies = @ag WHERE id = @id');
    res.json({ success: true });
  } catch (err) {
    console.error('[/api/users/agencies PUT]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/password
app.put('/api/users/:id/password', requireToken, async (req, res) => {
  const { password } = req.body;
  try {
    await sysPool.request()
      .input('id', sql.VarChar, req.params.id)
      .input('pass', sql.VarChar, mockHash(password))
      .query('UPDATE Users SET password = @pass WHERE id = @id');
    res.json({ success: true });
  } catch (err) {
    console.error('[/api/users/password PUT]', err.message);
    res.status(500).json({ error: err.message });
  }
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

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

let sysPool;
const isMockDB = process.env.MOCK_DB === 'true';

if (isMockDB) {
  console.log('🧪 Running with MOCK_DB=true. MS SQL Server connection bypassed.');
  // Create a dummy pool that resolves with empty sets
  sysPool = {
    connect: async () => {},
    close: async () => {},
    request: () => {
      const req = {
        input: () => req,
        query: async (q) => {
          if (q.includes('COUNT(*)')) return { recordset: [{ cnt: 1 }] };
          if (q.includes('SELECT role FROM Users')) return { recordset: [{ role: 'admin' }] };
          if (q.includes('SELECT * FROM Users WHERE email = @email')) {
             return { recordset: [{ id: '1', email: 'admin@atr.com', password: 'admin', role: 'admin' }] };
          }
          if (q.includes('SELECT * FROM Users')) return { recordset: [{ id: '1', email: 'admin@atr.com', password: 'admin', role: 'admin' }] };
          return { recordset: [] };
        }
      };
      return req;
    }
  };
} else {
  sysPool = new sql.ConnectionPool(dbConfig);
}

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
        permissions NVARCHAR(MAX),
        mustChangePassword BIT DEFAULT 1
      )
    `);

    // Ensure mustChangePassword column exists for existing setups
    await sysPool.request().query(`
      IF COL_LENGTH('Users', 'mustChangePassword') IS NULL
      BEGIN
        ALTER TABLE Users ADD mustChangePassword BIT DEFAULT 1
      END
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
const magicTokens = new Map(); // one-time magic link token → { userId, exp }

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

// Middleware to validate admin role
async function requireAdmin(req, res, next) {
  try {
    const result = await sysPool.request()
      .input('id', sql.VarChar, req.session.userId)
      .query('SELECT role FROM Users WHERE id = @id');
    const user = result.recordset[0];
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden - admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database error verifying permissions' });
  }
}

// POST /api/auth/issue  →  issue a token for a logged-in user
// Validates credentials against the global Users table
app.post('/api/auth/issue', async (req, res) => {
  const { email, password } = req.body;

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
      permissions: user.permissions ? JSON.parse(user.permissions) : { areas: [], dashboards: [] },
      mustChangePassword: user.mustChangePassword === 1 || user.mustChangePassword === true
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

// Generate a one-time token for magic links (admin only conceptually, protected by requireToken)
app.post('/api/auth/magic-token', requireToken, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // Create a short-lived token (e.g., 24 hours)
  const token = crypto.randomBytes(32).toString('hex');
  magicTokens.set(token, {
    userId,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });

  res.json({ success: true, token });
});

// Consume a magic token to log in
app.post('/api/auth/magic-login', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const magic = magicTokens.get(token);
  if (!magic || Date.now() > magic.exp) {
    if (magic) magicTokens.delete(token); // Cleanup if expired
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Token is valid, single-use, so delete it
  magicTokens.delete(token);

  try {
    // Get the user data to return
    const result = await sysPool.request()
      .input('id', sql.VarChar, magic.userId)
      .query('SELECT * FROM Users WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRow = result.recordset[0];
    const user = {
      ...userRow,
      agencies: userRow.agencies ? JSON.parse(userRow.agencies) : [],
      permissions: userRow.permissions ? JSON.parse(userRow.permissions) : { areas: [], dashboards: [] },
      mustChangePassword: userRow.mustChangePassword === 1 || userRow.mustChangePassword === true
    };
    delete user.password;

    // Issue a normal session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    tokens.set(sessionToken, {
      userId: user.id,
      exp: Date.now() + 8 * 60 * 60 * 1000  // 8 hours
    });

    res.json({ success: true, token: sessionToken, user });
  } catch (err) {
    console.error('[/api/auth/magic-login]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── User CRUD Endpoints ───────────────────────────────────────────────────

// GET /api/users
app.get('/api/users', requireToken, requireAdmin, async (req, res) => {
  try {
    const result = await sysPool.request().query('SELECT * FROM Users');
    const users = result.recordset.map(u => ({
      ...u,
      agencies: u.agencies ? JSON.parse(u.agencies) : [],
      permissions: u.permissions ? JSON.parse(u.permissions) : { areas: [], dashboards: [] },
      mustChangePassword: u.mustChangePassword === 1 || u.mustChangePassword === true
    }));
    res.json({ success: true, users });
  } catch (err) {
    console.error('[/api/users GET]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users
app.post('/api/users', requireToken, requireAdmin, async (req, res) => {
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
      .input('mustChange', sql.Bit, 1)
      .query(`
        INSERT INTO Users (id, firstName, lastName, email, role, password, agencies, permissions, mustChangePassword)
        VALUES (@id, @fn, @ln, @email, @role, @pass, @ag, @perm, @mustChange)
      `);
    res.json({ success: true, user: { id: newId, firstName, lastName, email, role, agencies, permissions, mustChangePassword: true } });
  } catch (err) {
    console.error('[/api/users POST]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
app.delete('/api/users/:id', requireToken, requireAdmin, async (req, res) => {
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
app.put('/api/users/:id/agencies', requireToken, requireAdmin, async (req, res) => {
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

// PUT /api/users/:id/permissions
app.put('/api/users/:id/permissions', requireToken, requireAdmin, async (req, res) => {
  const permissions = req.body;
  try {
    await sysPool.request()
      .input('id', sql.VarChar, req.params.id)
      .input('perm', sql.NVarChar, JSON.stringify(permissions || { areas: [], dashboards: [] }))
      .query('UPDATE Users SET permissions = @perm WHERE id = @id');
    res.json({ success: true });
  } catch (err) {
    console.error('[/api/users/permissions PUT]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/password
app.put('/api/users/:id/password', requireToken, async (req, res) => {
  const { password, mustChangePassword } = req.body;
  try {
    let queryStr = 'UPDATE Users SET password = @pass, mustChangePassword = 0 WHERE id = @id';
    if (mustChangePassword === true) {
      queryStr = 'UPDATE Users SET password = @pass, mustChangePassword = 1 WHERE id = @id';
    }

    await sysPool.request()
      .input('id', sql.VarChar, req.params.id)
      .input('pass', sql.VarChar, mockHash(password))
      .query(queryStr);
    res.json({ success: true });
  } catch (err) {
    console.error('[/api/users/password PUT]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Dev Assets Endpoints ──────────────────────────────────────────────────

app.get('/api/dev/assets', requireToken, async (req, res) => {
  try {
    const sources = await sysPool.request().query('SELECT * FROM DevSources');
    const measures = await sysPool.request().query('SELECT * FROM DevMeasures');
    const published = await sysPool.request().query('SELECT * FROM PublishedDashboards');
    const system = await sysPool.request().query('SELECT * FROM SystemDashboards');

    const canvas = await sysPool.request()
      .input('id', sql.VarChar, `canvas_user_${req.session.userId}`)
      .query('SELECT data FROM DevCanvas WHERE id = @id');

    // Group system dashboards by areaId
    const sysMap = {};
    for (const row of system.recordset) {
      if (!sysMap[row.areaId]) sysMap[row.areaId] = [];
      sysMap[row.areaId].push(JSON.parse(row.data));
    }

    // DevCanvas stores a single object { id: '...', items: [...] } per user
    const canvasData = canvas.recordset.length > 0 ? JSON.parse(canvas.recordset[0].data).items : [];

    res.json({
      success: true,
      sources: sources.recordset.map(r => JSON.parse(r.data)),
      measures: measures.recordset.map(r => JSON.parse(r.data)),
      canvas: canvasData,
      publishedDashboards: published.recordset.map(r => JSON.parse(r.data)),
      systemDashboards: sysMap
    });
  } catch (err) {
    console.error('[/api/dev/assets GET]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dev/sources', requireToken, async (req, res) => {
  try {
    await sysPool.request()
      .input('id', sql.VarChar, req.body.id)
      .input('data', sql.NVarChar, JSON.stringify(req.body))
      .query(`
        IF EXISTS (SELECT * FROM DevSources WHERE id = @id)
          UPDATE DevSources SET data = @data WHERE id = @id
        ELSE
          INSERT INTO DevSources (id, data) VALUES (@id, @data)
      `);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dev/measures', requireToken, async (req, res) => {
  try {
    await sysPool.request()
      .input('id', sql.VarChar, req.body.id)
      .input('data', sql.NVarChar, JSON.stringify(req.body))
      .query(`
        IF EXISTS (SELECT * FROM DevMeasures WHERE id = @id)
          UPDATE DevMeasures SET data = @data WHERE id = @id
        ELSE
          INSERT INTO DevMeasures (id, data) VALUES (@id, @data)
      `);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/dev/sources/:id', requireToken, async (req, res) => {
  try {
    await sysPool.request()
      .input('id', sql.VarChar, req.params.id)
      .query('DELETE FROM DevSources WHERE id = @id');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/dev/measures/:id', requireToken, async (req, res) => {
  try {
    await sysPool.request()
      .input('id', sql.VarChar, req.params.id)
      .query('DELETE FROM DevMeasures WHERE id = @id');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dev/canvas', requireToken, async (req, res) => {
  const canvasId = `canvas_user_${req.session.userId}`;
  try {
    await sysPool.request()
      .input('id', sql.VarChar, canvasId)
      .input('data', sql.NVarChar, JSON.stringify(req.body))
      .query(`
        IF EXISTS (SELECT * FROM DevCanvas WHERE id = @id)
          UPDATE DevCanvas SET data = @data WHERE id = @id
        ELSE
          INSERT INTO DevCanvas (id, data) VALUES (@id, @data)
      `);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dev/published', requireToken, async (req, res) => {
  try {
    await sysPool.request()
      .input('id', sql.VarChar, req.body.id)
      .input('data', sql.NVarChar, JSON.stringify(req.body))
      .query(`
        IF EXISTS (SELECT * FROM PublishedDashboards WHERE id = @id)
          UPDATE PublishedDashboards SET data = @data WHERE id = @id
        ELSE
          INSERT INTO PublishedDashboards (id, data) VALUES (@id, @data)
      `);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/dev/published/:id', requireToken, async (req, res) => {
  try {
    await sysPool.request()
      .input('id', sql.VarChar, req.params.id)
      .query('DELETE FROM PublishedDashboards WHERE id = @id');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dev/system', requireToken, async (req, res) => {
  const { areaId, dashId, dashboard } = req.body;
  try {
    await sysPool.request()
      .input('areaId', sql.VarChar, areaId)
      .input('dashId', sql.VarChar, dashId)
      .input('data', sql.NVarChar, JSON.stringify(dashboard))
      .query(`
        IF EXISTS (SELECT * FROM SystemDashboards WHERE areaId = @areaId AND dashId = @dashId)
          UPDATE SystemDashboards SET data = @data WHERE areaId = @areaId AND dashId = @dashId
        ELSE
          INSERT INTO SystemDashboards (areaId, dashId, data) VALUES (@areaId, @dashId, @data)
      `);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/dev/system/:areaId/:dashId', requireToken, async (req, res) => {
  try {
    await sysPool.request()
      .input('areaId', sql.VarChar, req.params.areaId)
      .input('dashId', sql.VarChar, req.params.dashId)
      .query('DELETE FROM SystemDashboards WHERE areaId = @areaId AND dashId = @dashId');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Helper: build a fresh mssql connection (no pool reuse)
async function withConnection(creds, fn) {
  if (isMockDB) {
    const dummyPool = {
      close: async () => {},
      request: () => ({
        input: function() { return this; },
        query: async () => ({ recordset: [] })
      })
    };
    return await fn(dummyPool);
  }

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

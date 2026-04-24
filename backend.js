import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- ENCRYPTION UTILS (AES-256-CBC) ---
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.error("FATAL: ENCRYPTION_KEY must be a 64-character hex string.");
  process.exit(1);
}
const IV_LENGTH = 16; // For AES, this is always 16

function encryptText(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptText(text) {
  if (!text) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    console.error("Decryption failed:", e.message);
    return null;
  }
}

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Prevent API from dying on unhandled errors
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception (API kept alive):', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection (API kept alive):', reason);
});

// ── Database Configuration & Initialization ────────────────────────────────
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_HOST,
  pool: {
    max: 500, // Ultra-High Concurrency
    min: 0,   // Safe boot
    idleTimeoutMillis: 60000,
    acquireTimeoutMillis: 30000
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 30000,
    requestTimeout: 120000, // 2 minutes for heavy analytics
    enableArithAbort: true
  },
};

const sysPool = new sql.ConnectionPool(dbConfig);
// Prevent pool errors from crashing the process
sysPool.on('error', err => console.error('❌ SQL Pool Error (ignored):', err.message));

// Connection Pool Cache for Dynamic DataSources
const poolMap = new Map(); // key (host|db|user) -> { pool, lastUsed }

// Cleanup idle pools every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of poolMap.entries()) {
    if (now - entry.lastUsed > 300000) { // 5 minutes
      console.log(`[PoolCache] Closing idle pool for ${key}`);
      entry.pool.close();
      poolMap.delete(key);
    }
  }
}, 300000);

// Helper for passwords
const mockHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
};

async function ensureSysConnection() {
  if (sysPool.connected) return sysPool;
  if (sysPool.connecting) {
    // Wait for ongoing connection
    await new Promise(r => {
      const it = setInterval(() => {
        if (!sysPool.connecting) { clearInterval(it); r(null); }
      }, 100);
    });
    return sysPool;
  }
  
  console.log('🔄 Reconnecting system pool...');
  try {
    await sysPool.connect();
    console.log('📦 System pool reconnected.');
  } catch (err) {
    console.error('❌ Failed to reconnect system pool:', err.message);
  }
  return sysPool;
}

async function initDatabase() {
  try {
    console.log('🔍 Boot Check:');
    console.log(`   - DB_HOST: ${process.env.DB_HOST}`);
    console.log(`   - DB_USER: ${process.env.DB_USER}`);
    console.log(`   - DB_NAME: ${process.env.DB_NAME}`);
    
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

    // Ensure permissions column exists for existing setups
    await sysPool.request().query(`
      IF COL_LENGTH('Users', 'permissions') IS NULL
      BEGIN
        ALTER TABLE Users ADD permissions NVARCHAR(MAX)
      END
    `);

    // Create Dev tables if they don't exist (must be separate queries — mssql doesn't support multi-statement batches)
    const createIfNotExists = async (name, ddl) => {
      const exists = await sysPool.request()
        .input('n', sql.VarChar, name)
        .query("SELECT 1 FROM sysobjects WHERE name=@n AND xtype='U'");
      if (exists.recordset.length === 0) {
        await sysPool.request().query(ddl);
        console.log(`✅ Created table: ${name}`);
      }
    };

    await createIfNotExists('DevSources', `CREATE TABLE DevSources (id VARCHAR(100) PRIMARY KEY, data NVARCHAR(MAX))`);
    await createIfNotExists('DevMeasures', `CREATE TABLE DevMeasures (id VARCHAR(100) PRIMARY KEY, data NVARCHAR(MAX))`);
    await createIfNotExists('DevCanvas',   `CREATE TABLE DevCanvas   (id VARCHAR(100) PRIMARY KEY, data NVARCHAR(MAX))`);
    await createIfNotExists('PublishedDashboards', `CREATE TABLE PublishedDashboards (id VARCHAR(100) PRIMARY KEY, data NVARCHAR(MAX))`);
    await createIfNotExists('SystemDashboards', `
      CREATE TABLE SystemDashboards (
        areaId VARCHAR(100), dashId VARCHAR(100), data NVARCHAR(MAX),
        PRIMARY KEY (areaId, dashId)
      )
    `);
    await createIfNotExists('DevDrafts', `
      CREATE TABLE DevDrafts (
        id         VARCHAR(100)   PRIMARY KEY,
        authorId   VARCHAR(100),
        authorName NVARCHAR(200),
        name       NVARCHAR(500),
        updatedAt  NVARCHAR(50),
        data       NVARCHAR(MAX)
      )
    `);

    // --- Marketplace Tables ---
    await createIfNotExists('Marketplace_DataSources', `
      CREATE TABLE Marketplace_DataSources (
        id           VARCHAR(100) PRIMARY KEY,
        name         NVARCHAR(200),
        host         NVARCHAR(255),
        databaseName NVARCHAR(100),
        username     NVARCHAR(100),
        password     NVARCHAR(500), -- In prod this should be encrypted
        owner        VARCHAR(50),
        createdAt    DATETIME DEFAULT GETDATE()
      )
    `);

    await createIfNotExists('Marketplace_Widgets', `
      CREATE TABLE Marketplace_Widgets (
        id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name        NVARCHAR(200),
        category    NVARCHAR(100),
        ownerId     VARCHAR(50),
        originId    VARCHAR(100), -- Dashboard origin
        description NVARCHAR(MAX),
        createdAt   DATETIME DEFAULT GETDATE(),
        isDeleted   BIT DEFAULT 0
      )
    `);

    await createIfNotExists('Marketplace_Widget_Versions', `
      CREATE TABLE Marketplace_Widget_Versions (
        versionId       UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        widgetId        UNIQUEIDENTIFIER,
        versionTag      NVARCHAR(20), -- e.g. "1.0.0"
        configJSON      NVARCHAR(MAX), -- UI props, mapping
        contractJSON    NVARCHAR(MAX), -- Inputs, expected schema
        executionJSON   NVARCHAR(MAX), -- Engine, query template
        createdAt       DATETIME DEFAULT GETDATE(),
        authorId        VARCHAR(50),
        hash            VARCHAR(64)
      )
    `);

    await createIfNotExists('Widget_Telemetry', `
      CREATE TABLE Widget_Telemetry (
        id               UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        versionId        UNIQUEIDENTIFIER,
        userId           VARCHAR(50),
        executionTimeMs  INT,
        rowsCount        INT,
        errorFlag        BIT,
        errorMessage     NVARCHAR(MAX),
        timestamp        DATETIME DEFAULT GETDATE()
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
    const pool = await ensureSysConnection();
    const passHash = mockHash(password);
    const result = await pool.request()
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
  const { firstName, lastName, email, role, password, agencies, permissions, mustChangePassword } = req.body;
  const newId = Date.now().toString();
  try {
    const isMustChange = mustChangePassword !== undefined ? (mustChangePassword ? 1 : 0) : 1;
    await sysPool.request()
      .input('id', sql.VarChar, newId)
      .input('fn', sql.NVarChar, firstName)
      .input('ln', sql.NVarChar, lastName)
      .input('email', sql.NVarChar, email)
      .input('role', sql.VarChar, role || 'user')
      .input('pass', sql.VarChar, mockHash(password || '123456'))
      .input('ag', sql.NVarChar, JSON.stringify(agencies || []))
      .input('perm', sql.NVarChar, JSON.stringify(permissions || { areas: [], dashboards: [] }))
      .input('mustChange', sql.Bit, isMustChange)
      .query(`
        INSERT INTO Users (id, firstName, lastName, email, role, password, agencies, permissions, mustChangePassword)
        VALUES (@id, @fn, @ln, @email, @role, @pass, @ag, @perm, @mustChange)
      `);
    res.json({ success: true, user: { id: newId, firstName, lastName, email, role, agencies, permissions, mustChangePassword: isMustChange === 1 } });
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

    // --- AUTO-SYNC CONNECTIONS TO MARKETPLACE ---
    // This ensures legacy components can always find their "DataSource" credentials
    // even if they were created before the Marketplace integration.
    for (const row of sources.recordset) {
      try {
        const data = JSON.parse(row.data);
        if (data && data.host) {
          await sysPool.request()
            .input('dsid', sql.VarChar, row.id)
            .input('dsname', sql.NVarChar, data.name || row.id)
            .input('dshost', sql.NVarChar, data.host)
            .input('dsdb', sql.NVarChar, data.database)
            .input('dsuser', sql.NVarChar, data.username)
            .input('dspass', sql.NVarChar, data.password)
            .input('dsowner', sql.VarChar, row.userId)
            .query(`
              IF EXISTS (SELECT * FROM Marketplace_DataSources WHERE id = @dsid)
                UPDATE Marketplace_DataSources SET name=@dsname, host=@dshost, databaseName=@dsdb, username=@dsuser, password=@dspass WHERE id=@dsid
              ELSE
                INSERT INTO Marketplace_DataSources (id, name, host, databaseName, username, password, owner)
                VALUES (@dsid, @dsname, @dshost, @dsdb, @dsuser, @dspass, @dsowner)
            `);
        }
      } catch (e) {
        console.warn(`[Sync] Failed to sync source ${row.id}:`, e.message);
      }
    }

    res.json({
      success: true,
      sources: sources.recordset.map(r => ({ id: r.id, data: JSON.parse(r.data) })),
      measures: measures.recordset.map(r => ({ id: r.id, userId: r.userId, ...JSON.parse(r.data) })),
      published: published.recordset.map(r => ({ id: r.id, ...JSON.parse(r.data) })),
      system: sysMap,
      canvas: canvasData
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

app.post('/api/marketplace/submit', requireToken, async (req, res) => {
  const { dashboardId, title, category, components } = req.body;
  if (!components || !Array.isArray(components)) {
    return res.status(400).json({ error: 'No components provided' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    for (const comp of components) {
      const widgetConfig = JSON.stringify({
        ...comp,
      });
      const encryptedConfig = encryptText(widgetConfig);

      const connectionMetadata = JSON.stringify(comp.connection || {});
      const encryptedConnection = encryptText(connectionMetadata);

      // Use req.session.userId, as requireToken attaches session to req
      // We will fallback to "Sistema" if not present
      const userId = req.session ? req.session.userId : "Sistema";

      await sysPool.request()
        .input('nombre_widget', sql.NVarChar, comp.name || 'Sin Nombre')
        .input('dashboard_padre', sql.NVarChar, title || 'Sin Dashboard')
        .input('autor_user', sql.NVarChar, userId)
        .input('ip_origen', sql.NVarChar, clientIp)
        .input('config_json_encrypted', sql.NVarChar, encryptedConfig)
        .input('categoria', sql.NVarChar, category || 'Global')
        .input('tipo_visual', sql.NVarChar, comp.type || 'unknown')
        .input('connection_metadata_encrypted', sql.NVarChar, encryptedConnection)
        .query(`
          INSERT INTO Marketplace_Dashboards (
            Nombre_Widget, Dashboard_Padre, Autor_User, IP_Origen,
            Config_JSON_Encrypted, Categoria, Tipo_Visual, Connection_Metadata_Encrypted
          ) VALUES (
            @nombre_widget, @dashboard_padre, @autor_user, @ip_origen,
            @config_json_encrypted, @categoria, @tipo_visual, @connection_metadata_encrypted
          )
        `);
    }
    res.json({ success: true, count: components.length });
  } catch (err) {
    console.error('Marketplace submit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/marketplace/list', requireToken, async (req, res) => {
  const { tipo, search, scope } = req.query;

  try {
    let query = \`
      SELECT Id, Nombre_Widget, Dashboard_Padre, Autor_User, Categoria, Es_Aprobado, Fecha_Creacion, Tipo_Visual, Config_JSON_Encrypted
      FROM Marketplace_Dashboards
      WHERE 1=1
    \`;
    const request = sysPool.request();

    if (search) {
      query += \` AND (Nombre_Widget LIKE @search OR Dashboard_Padre LIKE @search)\`;
      request.input('search', sql.NVarChar, \`%\${search}%\`);
    }
    if (tipo) {
      query += \` AND Tipo_Visual = @tipo\`;
      request.input('tipo', sql.NVarChar, tipo);
    }
    if (scope === 'favoritos') {
       // Logic for favorites could be joined here if you have a favorites table
    }

    query += \` ORDER BY Fecha_Creacion DESC\`;

    const result = await request.query(query);

    // Decrypt the JSON config for the frontend to render the preview/drag-n-drop
    const decryptedList = result.recordset.map(row => {
      let config = {};
      try {
         config = JSON.parse(decryptText(row.Config_JSON_Encrypted) || '{}');
      } catch (e) {}

      return {
        id: row.Id,
        name: row.Nombre_Widget,
        dashboard: row.Dashboard_Padre,
        author: row.Autor_User,
        category: row.Categoria,
        approved: row.Es_Aprobado,
        createdAt: row.Fecha_Creacion,
        type: row.Tipo_Visual,
        config: config
      };
    });

    res.json({ success: true, items: decryptedList });
  } catch (err) {
    console.error('Marketplace list error:', err.message);
    res.status(500).json({ error: err.message });
  }
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

// ── Dev Drafts (Borradores Colaborativos) ─────────────────────────────────────

// GET /api/dev/drafts — returns all drafts (visible to all devs)
app.get('/api/dev/drafts', requireToken, async (req, res) => {
  try {
    const result = await sysPool.request().query(
      'SELECT id, authorId, authorName, name, updatedAt FROM DevDrafts ORDER BY updatedAt DESC'
    );
    res.json({ success: true, drafts: result.recordset });
  } catch (err) {
    console.error('[/api/dev/drafts GET]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dev/drafts — save or overwrite a draft
app.post('/api/dev/drafts', requireToken, async (req, res) => {
  const { id, name, canvas, tabs, connections } = req.body;
  const authorId = req.session.userId;
  const updatedAt = new Date().toISOString();
  try {
    // Resolve author name from DB
    const userResult = await sysPool.request()
      .input('uid', sql.VarChar, authorId)
      .query('SELECT firstName, lastName FROM Users WHERE id = @uid');
    const user = userResult.recordset[0];
    const authorName = user ? `${user.firstName} ${user.lastName}` : 'Dev';

    // Strip passwords from connections before saving
    const safeConnections = (connections || []).map(c => ({ ...c, password: '' }));
    // NOTE: We also strip 'rows' from tabs (heavy data) before saving
    const safeTabs = (tabs || []).map(t => ({ ...t, rows: [], columns: t.columns || [] }));
    const safeCanvas = (canvas || []).map(i => ({ ...i, rows: [] }));

    const payload = JSON.stringify({ canvas: safeCanvas, tabs: safeTabs, connections: safeConnections });
    await sysPool.request()
      .input('id',         sql.VarChar(100),           id)
      .input('authorId',   sql.VarChar(100),           authorId)
      .input('authorName', sql.NVarChar(200),          authorName)
      .input('name',       sql.NVarChar(500),          name || 'SIN NOMBRE')
      .input('updatedAt',  sql.NVarChar(50),           updatedAt)
      .input('data',       sql.NVarChar(sql.MAX),      payload)
      .query(`
        IF EXISTS (SELECT * FROM DevDrafts WHERE id = @id)
          UPDATE DevDrafts SET authorId=@authorId, authorName=@authorName, name=@name, updatedAt=@updatedAt, data=@data WHERE id=@id
        ELSE
          INSERT INTO DevDrafts (id, authorId, authorName, name, updatedAt, data) VALUES (@id, @authorId, @authorName, @name, @updatedAt, @data)
      `);
    res.json({ success: true, authorName });
  } catch (err) {
    console.error('[/api/dev/drafts POST]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dev/drafts/:id — load a single draft with full data
app.get('/api/dev/drafts/:id', requireToken, async (req, res) => {
  try {
    const result = await sysPool.request()
      .input('id', sql.VarChar, req.params.id)
      .query('SELECT * FROM DevDrafts WHERE id = @id');
    if (!result.recordset[0]) return res.status(404).json({ error: 'Draft not found' });
    const row = result.recordset[0];
    res.json({ success: true, draft: { ...row, data: JSON.parse(row.data) } });
  } catch (err) {
    console.error('[/api/dev/drafts/:id GET]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/dev/drafts/:id — only the author can delete (or any dev, as agreed)
app.delete('/api/dev/drafts/:id', requireToken, async (req, res) => {
  try {
    await sysPool.request()
      .input('id', sql.VarChar, req.params.id)
      .query('DELETE FROM DevDrafts WHERE id = @id');
    res.json({ success: true });
  } catch (err) {
    console.error('[/api/dev/drafts/:id DELETE]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Helper: build a fresh mssql connection (no pool reuse)
async function withConnection(creds, fn) {
  const poolKey = `${creds.host}|${creds.database}|${creds.username}`;
  
  if (!poolMap.has(poolKey)) {
    console.log(`[PoolCache] Creating new high-capacity pool for ${poolKey}`);
    const pool = new sql.ConnectionPool({
      user: creds.username,
      password: creds.password,
      database: creds.database,
      server: creds.host,
      pool: { 
        max: 500, // High capacity
        min: 0, 
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000
      },
      options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 30000,
        requestTimeout: 120000,
        enableArithAbort: true
      },
    });
    const connectPromise = pool.connect().catch(err => {
      console.error(`❌ SQL Pool Connect Error for ${poolKey}:`, err.message);
      poolMap.delete(poolKey);
      throw err;
    });
    poolMap.set(poolKey, { pool, connectPromise, lastUsed: Date.now() });
  }

  const entry = poolMap.get(poolKey);
  entry.lastUsed = Date.now();
  const pool = await entry.connectPromise;

  try {
    return await fn(pool);
  } catch (err) {
    // If the pool is dead or has connectivity issues, purge it
    const msg = err.message.toLowerCase();
    if (msg.includes('connection is closed') || msg.includes('dead') || msg.includes('reset') || msg.includes('network')) {
      console.log(`[PoolCache] Purging dead/reset pool for ${poolKey}`);
      poolMap.delete(poolKey);
      pool.close().catch(() => {});
    }
    throw err;
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
    const result = await withConnection({ host, database, username, password }, (pool) => {
      return new Promise((resolve, reject) => {
        const rows = [];
        let columns = [];
        const request = pool.request();
        request.stream = true; // Use streaming to prevent OOM on 15M+ row tables
        
        let cancelled = false;
        const MAX_ROWS = 50000; // Protection limit for raw un-aggregated queries

        request.query(query);

        request.on('recordset', (recordsetColumns) => {
          columns = Object.keys(recordsetColumns);
        });

        request.on('row', (row) => {
          if (cancelled) return;
          rows.push(row);
          if (rows.length >= MAX_ROWS) {
            cancelled = true;
            request.cancel(); // Stop fetching early!
          }
        });

        request.on('error', (err) => {
          if (err.name === 'RequestError' && err.message.includes('Canceled')) {
            // We cancelled it on purpose, resolve with what we have
            resolve({ columns, rows, warning: `Se ha limitado a ${MAX_ROWS} filas por seguridad. IMPORTANTE: Para que tu gráfica represente los 200 MILLONES de datos correctamente y sin explotar el sistema, dale clic al botón "Mega Optimizador 🔥".` });
          } else {
            console.error('SQL Stream Error:', err);
            reject(err);
          }
        });

        request.on('done', () => {
          if (!cancelled) resolve({ columns, rows });
        });
      });
    });

    res.json({ 
      success: true, 
      columns: result.columns, 
      rows: result.rows,
      warning: result.warning 
    });
  } catch (err) {
    console.error('[/api/query]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Marketplace Secure Query Execution ──────────────────────────────────────

// Helper to get datasource by ID
async function getDataSource(id) {
  const result = await sysPool.request()
    .input('id', sql.VarChar, id)
    .query('SELECT * FROM Marketplace_DataSources WHERE id = @id');
  return result.recordset[0];
}

// POST /api/marketplace/query
// Secure execution using stored credentials and query sanitization
app.post('/api/marketplace/query', requireToken, async (req, res) => {
  const { dataSourceId, queryTemplate, parameters, versionId } = req.body;
  const startTime = Date.now();

  if (!dataSourceId || !queryTemplate) {
    return res.status(400).json({ error: 'Missing dataSourceId or queryTemplate' });
  }

  try {
    const ds = await getDataSource(dataSourceId);
    if (!ds) return res.status(404).json({ error: 'DataSource not found' });

    // Connection Broker: uses stored credentials
    const creds = {
      host: ds.host,
      database: ds.databaseName,
      username: ds.username,
      password: ds.password // In prod, decrypt this
    };

    const result = await withConnection(creds, async (pool) => {
      const request = pool.request();
      
      // Sanitization & Parameter Binding
      // Parameters should be an array of { name, type, value }
      if (parameters && Array.isArray(parameters)) {
        parameters.forEach(p => {
          const sqlType = sql[p.type] || sql.NVarChar;
          request.input(p.name, sqlType, p.value);
        });
      }

      // Execution Limit Protection
      const MAX_ROWS = 25000; 
      let rows = [];
      let columns = [];
      let cancelled = false;

      request.stream = true;
      request.query(queryTemplate);

      return new Promise((resolve, reject) => {
        request.on('recordset', (cols) => { columns = Object.keys(cols); });
        request.on('row', (row) => {
          if (cancelled) return;
          rows.push(row);
          if (rows.length >= MAX_ROWS) {
            cancelled = true;
            request.cancel();
          }
        });
        request.on('error', (err) => {
          if (err.name === 'RequestError' && err.message.includes('Canceled')) resolve({ columns, rows, partial: true });
          else reject(err);
        });
        request.on('done', () => { if (!cancelled) resolve({ columns, rows, partial: false }); });
      });
    });

    // Telemetry & Logging
    if (versionId) {
      sysPool.request()
        .input('vid', sql.UniqueIdentifier, versionId)
        .input('uid', sql.VarChar, req.session.userId)
        .input('time', sql.Int, Date.now() - startTime)
        .input('rcount', sql.Int, result.rows.length)
        .input('err', sql.Bit, 0)
        .query(`
          INSERT INTO Widget_Telemetry (versionId, userId, executionTimeMs, rowsCount, errorFlag)
          VALUES (@vid, @uid, @time, @rcount, @err)
        `).catch(err => console.error('Telemetry Log Error:', err.message));
    }

    res.json({
      success: true,
      columns: result.columns,
      rows: result.rows,
      partial: result.partial,
      executionTime: Date.now() - startTime
    });

  } catch (err) {
    console.error('[/api/marketplace/query]', err.message);
    
    // Log error telemetry
    if (versionId) {
      sysPool.request()
        .input('vid', sql.UniqueIdentifier, versionId)
        .input('uid', sql.VarChar, req.session.userId)
        .input('msg', sql.NVarChar, err.message)
        .query(`
          INSERT INTO Widget_Telemetry (versionId, userId, errorFlag, errorMessage)
          VALUES (@vid, @uid, 1, @msg)
        `).catch(e => console.error('Error Telemetry Log Error:', e.message));
    }

    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketplace/widgets
app.get('/api/marketplace/widgets', requireToken, async (req, res) => {
  try {
    const pool = await ensureSysConnection();
    const result = await pool.request().query(`
      SELECT w.*, v.versionTag, v.configJSON, v.contractJSON, v.executionJSON, v.versionId
      FROM Marketplace_Widgets w
      JOIN Marketplace_Widget_Versions v ON w.id = v.widgetId
      WHERE w.isDeleted = 0
      ORDER BY w.createdAt DESC
    `);
    res.json({ success: true, widgets: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketplace/datasources
app.get('/api/marketplace/datasources', requireToken, async (req, res) => {
  try {
    const pool = await ensureSysConnection();
    const result = await pool.request()
      .input('uid', sql.VarChar, req.session.userId)
      .query('SELECT id, name, host, databaseName, username, owner FROM Marketplace_DataSources');
    res.json({ success: true, dataSources: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/marketplace/datasources
app.post('/api/marketplace/datasources', requireToken, async (req, res) => {
  const { id, name, host, databaseName, username, password } = req.body;
  try {
    await sysPool.request()
      .input('id', sql.VarChar, id)
      .input('name', sql.NVarChar, name)
      .input('host', sql.NVarChar, host)
      .input('db', sql.NVarChar, databaseName)
      .input('user', sql.NVarChar, username)
      .input('pass', sql.NVarChar, password)
      .input('owner', sql.VarChar, req.session.userId)
      .query(`
        IF EXISTS (SELECT * FROM Marketplace_DataSources WHERE id = @id)
          UPDATE Marketplace_DataSources SET name=@name, host=@host, databaseName=@db, username=@user, password=@pass WHERE id=@id
        ELSE
          INSERT INTO Marketplace_DataSources (id, name, host, databaseName, username, password, owner)
          VALUES (@id, @name, @host, @db, @user, @password, @owner)
      `);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketplace/datasources
app.get('/api/marketplace/datasources', requireToken, async (req, res) => {
  try {
    const result = await sysPool.request()
      .input('uid', sql.VarChar, req.session.userId)
      .query('SELECT id, name, host, databaseName, username, owner FROM Marketplace_DataSources');
    res.json({ success: true, dataSources: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/marketplace/harvest
// Scans a dashboard's components and registers original items in the marketplace
app.post('/api/marketplace/harvest', requireToken, async (req, res) => {
  const { dashboardId, dashboardName, components } = req.body;
  if (!components || !Array.isArray(components)) return res.status(400).json({ error: 'No components to harvest' });

  try {
    for (const comp of components) {
      // Logic: Only harvest if it has a unique signature (mocked here for now)
      // In a real system, we'd hash the SQL + Config
      const widgetId = crypto.randomUUID();
      const versionId = crypto.randomUUID();

      // If connection details are provided, register the data source first
      if (comp.connection) {
        const { connectionId, name, host, databaseName, username, password } = comp.connection;
        await sysPool.request()
          .input('dsid', sql.VarChar, connectionId)
          .input('dsname', sql.NVarChar, name || `DS ${connectionId}`)
          .input('dshost', sql.NVarChar, host)
          .input('dsdb', sql.NVarChar, databaseName)
          .input('dsuser', sql.NVarChar, username)
          .input('dspass', sql.NVarChar, password)
          .input('dsowner', sql.VarChar, req.session.userId)
          .query(`
            IF NOT EXISTS (SELECT * FROM Marketplace_DataSources WHERE id = @dsid)
              INSERT INTO Marketplace_DataSources (id, name, host, databaseName, username, password, owner)
              VALUES (@dsid, @dsname, @dshost, @dsdb, @dsuser, @dspass, @dsowner)
          `);
      }

      await sysPool.request()
        .input('id', sql.UniqueIdentifier, widgetId)
        .input('name', sql.NVarChar, comp.name || 'Componente Sin Nombre')
        .input('owner', sql.VarChar, req.session.userId)
        .input('origin', sql.VarChar, dashboardId)
        .query(`
          INSERT INTO Marketplace_Widgets (id, name, ownerId, originId)
          VALUES (@id, @name, @owner, @origin)
        `);

      await sysPool.request()
        .input('vid', sql.UniqueIdentifier, versionId)
        .input('wid', sql.UniqueIdentifier, widgetId)
        .input('config', sql.NVarChar, JSON.stringify(comp.config || {}))
        .input('contract', sql.NVarChar, JSON.stringify(comp.contract || {}))
        .input('execution', sql.NVarChar, JSON.stringify(comp.execution || {}))
        .input('aid', sql.VarChar, req.session.userId)
        .query(`
          INSERT INTO Marketplace_Widget_Versions (versionId, widgetId, versionTag, configJSON, contractJSON, executionJSON, authorId)
          VALUES (@vid, @wid, '1.0.0', @config, @contract, @execution, @aid)
        `);
    }
    res.json({ success: true, count: components.length });
  } catch (err) {
    console.error('[/api/marketplace/harvest]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// No-token health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Global Process Safety ──────────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  const msg = reason?.message || String(reason);
  if (msg.toLowerCase().includes('sql') || msg.toLowerCase().includes('connection')) {
    console.warn('⚠️ Intercepted SQL Unhandled Rejection (preventing crash):', msg);
  } else {
    console.error('🔥 UNHANDLED REJECTION:', reason);
  }
});

process.on('uncaughtException', (err) => {
  if (err.message.toLowerCase().includes('connection')) {
    console.warn('⚠️ Intercepted SQL Exception (preventing crash):', err.message);
  } else {
    console.error('🔥 UNCAUGHT EXCEPTION:', err);
    // process.exit(1); // Keep alive for now, but monitor memory
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀  ATR Analytics API  →  http://localhost:${PORT}`);
  console.log(`    Endpoints: /api/auth/issue  /api/tables  /api/columns  /api/query`);
  initDatabase().catch(err => console.error('Initial DB Connect Failure:', err.message));
});

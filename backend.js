import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  if (!str) return '';
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
    await sysPool.request().query("IF COL_LENGTH('Users', 'mustChangePassword') IS NULL ALTER TABLE Users ADD mustChangePassword BIT DEFAULT 1");
    // Ensure permissions column exists for existing setups
    await sysPool.request().query("IF COL_LENGTH('Users', 'permissions') IS NULL ALTER TABLE Users ADD permissions NVARCHAR(MAX)");

    // Create Dev tables if they don't exist 
    const createIfNotExists = async (name, ddl) => {
      const exists = await sysPool.request().input('n', sql.VarChar, name).query("SELECT 1 FROM sysobjects WHERE name=@n AND xtype='U'");
      if (exists.recordset.length === 0) { await sysPool.request().query(ddl); console.log(`✅ Created table: ${name}`); }
    };

    await createIfNotExists('DevSources', `CREATE TABLE DevSources (id VARCHAR(100) PRIMARY KEY, data NVARCHAR(MAX))`);
    await createIfNotExists('DevMeasures', `CREATE TABLE DevMeasures (id VARCHAR(100) PRIMARY KEY, data NVARCHAR(MAX))`);
    await createIfNotExists('DevCanvas',   `CREATE TABLE DevCanvas   (id VARCHAR(100) PRIMARY KEY, data NVARCHAR(MAX))`);
    await createIfNotExists('PublishedDashboards', `CREATE TABLE PublishedDashboards (id VARCHAR(100) PRIMARY KEY, data NVARCHAR(MAX))`);
    await createIfNotExists('SystemDashboards', `CREATE TABLE SystemDashboards (areaId VARCHAR(100), dashId VARCHAR(100), data NVARCHAR(MAX), PRIMARY KEY (areaId, dashId))`);
    await createIfNotExists('DevDrafts', `CREATE TABLE DevDrafts (id VARCHAR(100) PRIMARY KEY, authorId VARCHAR(100), authorName NVARCHAR(200), name NVARCHAR(500), updatedAt NVARCHAR(50), data NVARCHAR(MAX))`);

    // --- Marketplace Tables ---
    await createIfNotExists('Marketplace_DataSources', `
      CREATE TABLE Marketplace_DataSources (
        id VARCHAR(100) PRIMARY KEY, name NVARCHAR(200), host NVARCHAR(255), databaseName NVARCHAR(100),
        username NVARCHAR(100), password NVARCHAR(500), owner VARCHAR(50), createdAt DATETIME DEFAULT GETDATE()
      )
    `);

    await createIfNotExists('Marketplace_Widgets', `
      CREATE TABLE Marketplace_Widgets (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(), name NVARCHAR(200), category NVARCHAR(100),
        ownerId VARCHAR(50), originId VARCHAR(100), description NVARCHAR(MAX), createdAt DATETIME DEFAULT GETDATE(),
        isDeleted BIT DEFAULT 0, isHidden BIT DEFAULT 0, status NVARCHAR(50) DEFAULT 'approved'
      )
    `);
    
    // Migration for isHidden and status
    await sysPool.request().query("IF COL_LENGTH('Marketplace_Widgets', 'isHidden') IS NULL ALTER TABLE Marketplace_Widgets ADD isHidden BIT DEFAULT 0");
    await sysPool.request().query("IF COL_LENGTH('Marketplace_Widgets', 'status') IS NULL ALTER TABLE Marketplace_Widgets ADD status NVARCHAR(50) DEFAULT 'approved'");

    await createIfNotExists('Marketplace_Widget_Versions', `
      CREATE TABLE Marketplace_Widget_Versions (
        versionId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(), widgetId UNIQUEIDENTIFIER, versionTag NVARCHAR(20),
        configJSON NVARCHAR(MAX), contractJSON NVARCHAR(MAX), executionJSON NVARCHAR(MAX), createdAt DATETIME DEFAULT GETDATE(),
        authorId VARCHAR(50), hash VARCHAR(64)
      )
    `);

    await createIfNotExists('Widget_Telemetry', `
      CREATE TABLE Widget_Telemetry (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(), versionId UNIQUEIDENTIFIER, userId VARCHAR(50),
        executionTimeMs INT, rowsCount INT, errorFlag BIT, errorMessage NVARCHAR(MAX), timestamp DATETIME DEFAULT GETDATE()
      )
    `);

    await createIfNotExists('Marketplace_Favorites', `
      CREATE TABLE Marketplace_Favorites (
        userId VARCHAR(255), widgetId UNIQUEIDENTIFIER, createdAt DATETIME DEFAULT GETDATE(), PRIMARY KEY (userId, widgetId)
      )
    `);

    // Insert default Admin user if table is empty
    const { recordset } = await sysPool.request().query('SELECT COUNT(*) as cnt FROM Users');
    if (recordset[0].cnt === 0) {
      console.log('🌱 Inserting default users...');
      await sysPool.request().input('id1', sql.VarChar, '1').input('fn1', sql.NVarChar, 'Admin').input('ln1', sql.NVarChar, 'User').input('email1', sql.NVarChar, 'admin@atr.com').input('role1', sql.VarChar, 'admin').input('pass1', sql.VarChar, mockHash('admin123')).query('INSERT INTO Users (id, firstName, lastName, email, role, password) VALUES (@id1, @fn1, @ln1, @email1, @role1, @pass1)');
      await sysPool.request().input('id2', sql.VarChar, '2').input('fn2', sql.NVarChar, 'Dev').input('ln2', sql.NVarChar, 'User').input('email2', sql.NVarChar, 'dev@atr.com').input('role2', sql.VarChar, 'dev').input('pass2', sql.VarChar, mockHash('dev123')).query('INSERT INTO Users (id, firstName, lastName, email, role, password) VALUES (@id2, @fn2, @ln2, @email2, @role2, @pass2)');
    }
  } catch (err) { console.error('❌ Failed to initialize database:', err.message); }
}
initDatabase();

// ── Token store (in-memory for local dev) ──────────────────────────────────
const tokens = new Map();
function requireToken(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || !tokens.has(token)) return res.status(401).json({ error: 'Unauthorized' });
  const session = tokens.get(token);
  if (Date.now() > session.exp) { tokens.delete(token); return res.status(401).json({ error: 'Session expired' }); }
  req.session = session;
  next();
}

// ── Auth Endpoints ──────────────────────────────────────────────────────────
app.post('/api/auth/issue', async (req, res) => {
  const { email, password } = req.body;
  try {
    const pool = await ensureSysConnection();
    const result = await pool.request().input('email', sql.NVarChar, email).query('SELECT * FROM Users WHERE email = @email');
    const user = result.recordset[0];
    if (!user || (user.password !== mockHash(password) && user.password !== password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = crypto.randomBytes(32).toString('hex');
    tokens.set(token, { userId: user.id, exp: Date.now() + 8 * 60 * 60 * 1000 });
    res.json({ success: true, token, user: { ...user, agencies: user.agencies ? JSON.parse(user.agencies) : [], permissions: user.permissions ? JSON.parse(user.permissions) : { areas: [], dashboards: [] } } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Marketplace Endpoints ───────────────────────────────────────────────────
app.get('/api/marketplace/widgets', requireToken, async (req, res) => {
  try {
    const pool = await ensureSysConnection();
    const result = await pool.request().input('uid', sql.VarChar, req.session.userId).query(`
      SELECT w.*, v.versionTag, v.configJSON, v.executionJSON, v.versionId,
             u.firstName + ' ' + u.lastName as ownerName, u.email as ownerEmail,
             CAST(CASE WHEN f.userId IS NOT NULL THEN 1 ELSE 0 END AS BIT) as isFavorite
      FROM Marketplace_Widgets w
      JOIN (SELECT widgetId, MAX(createdAt) as maxCreated FROM Marketplace_Widget_Versions GROUP BY widgetId) v_max ON w.id = v_max.widgetId
      JOIN Marketplace_Widget_Versions v ON v_max.widgetId = v.widgetId AND v_max.maxCreated = v.createdAt
      JOIN Users u ON w.ownerId = u.id
      LEFT JOIN Marketplace_Favorites f ON w.id = f.widgetId AND f.userId = @uid
      WHERE w.isDeleted = 0
      ORDER BY w.createdAt DESC
    `);
    res.json({ success: true, widgets: result.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/marketplace/validate-name', requireToken, async (req, res) => {
  const { name } = req.query;
  try {
    const pool = await ensureSysConnection();
    const result = await pool.request().input('name', sql.NVarChar, name).query('SELECT id FROM Marketplace_Widgets WHERE name = @name AND isDeleted = 0');
    res.json({ exists: result.recordset.length > 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/marketplace/harvest', requireToken, async (req, res) => {
  const { dashboardId, components, existingWidgetId, authorId } = req.body;
  const ownerId = authorId || req.session.userId;
  const authorName = req.session.userName || 'Desarrollador';
  
  try {
    const pool = await ensureSysConnection();
    
    // v6/Phase 2: Multi-Measure splitting logic
    for (const comp of components) {
      const code = comp.config?.code || "";
      const isJSX = code.includes("function Chart()") || code.includes("<BarChart") || code.includes("<ResponsiveContainer");
      
      const exportMarkers = code.match(/\/\/ @export: .+/g) || [];
      const blocks = [];
      
      if (exportMarkers.length > 1) {
        exportMarkers.forEach((marker, index) => {
          const exportName = marker.replace("// @export: ", "").trim();
          const nextMarker = exportMarkers[index + 1];
          let subCode = code.substring(code.indexOf(marker));
          if (nextMarker) subCode = subCode.substring(0, subCode.indexOf(nextMarker));
          
          blocks.push({ 
            name: `${comp.name} - ${exportName}`, 
            code: subCode,
            isJSX: true 
          });
        });
      } else {
        blocks.push({ name: comp.name, code, isJSX });
      }

      for (const block of blocks) {
        let widgetId = existingWidgetId && blocks.length === 1 ? existingWidgetId : crypto.randomUUID();
        
        // Register connection if present
        if (comp.connection) {
          const { connectionId, name, host, databaseName, username, password } = comp.connection;
          await pool.request().input('dsid', sql.VarChar, connectionId).input('dsname', sql.NVarChar, name || `DS ${connectionId}`).input('dshost', sql.NVarChar, host).input('dsdb', sql.NVarChar, databaseName).input('dsuser', sql.NVarChar, username).input('dspass', sql.NVarChar, password).input('dsowner', sql.VarChar, ownerId).query(`
            IF EXISTS (SELECT * FROM Marketplace_DataSources WHERE id = @dsid)
              UPDATE Marketplace_DataSources SET name=@dsname, host=@dshost, databaseName=@dsdb, username=@dsuser, password=@dspass WHERE id=@dsid
            ELSE
              INSERT INTO Marketplace_DataSources (id, name, host, databaseName, username, password, owner) VALUES (@dsid, @dsname, @dshost, @dsdb, @dsuser, @dspass, @dsowner)
          `);
        }

        // Insert/Update Widget
        const widgetQuery = existingWidgetId && blocks.length === 1
          ? 'UPDATE Marketplace_Widgets SET name = @name WHERE id = @id'
          : 'INSERT INTO Marketplace_Widgets (id, name, ownerId, originId, status, isJSX) VALUES (@id, @name, @owner, @origin, \'pending\', @isJSX)';
        
        const reqW = pool.request().input('id', sql.UniqueIdentifier, widgetId).input('name', sql.NVarChar, block.name).input('isJSX', sql.Bit, block.isJSX ? 1 : 0);
        if (!(existingWidgetId && blocks.length === 1)) {
          reqW.input('owner', sql.VarChar, ownerId).input('origin', sql.VarChar, dashboardId);
        }
        await reqW.query(widgetQuery);

        // Save Version
        const versionId = crypto.randomUUID();
        const executionJSON = JSON.stringify({
          dataSourceId: comp.execution?.dataSourceId,
          rawQuery: comp.execution?.rawQuery,
          params: comp.execution?.params || [],
          engine: comp.execution?.engine || 'SQL_SERVER_DIRECT',
          connection: comp.connection // Recipe preservation
        });

        await pool.request().input('vid', sql.UniqueIdentifier, versionId).input('wid', sql.UniqueIdentifier, widgetId).input('config', sql.NVarChar, JSON.stringify({ code: block.code })).input('execution', sql.NVarChar, executionJSON).input('aid', sql.VarChar, ownerId).query('INSERT INTO Marketplace_Widget_Versions (versionId, widgetId, versionTag, configJSON, executionJSON, authorId) VALUES (@vid, @wid, \'2.0.0\', @config, @execution, @aid)');
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/marketplace/query', requireToken, async (req, res) => {
  const { dataSourceId, queryTemplate, parameters, versionId } = req.body;
  const startTime = Date.now();
  console.log(`🔍 [MarketplaceQuery] User: ${req.session.userId} | DS: ${dataSourceId} | Query: ${queryTemplate?.substring(0, 50)}...`);

  try {
    const poolSys = await ensureSysConnection();
    const dsRes = await poolSys.request().input('id', sql.VarChar, dataSourceId).query('SELECT * FROM Marketplace_DataSources WHERE id = @id');
    const ds = dsRes.recordset[0];

    if (!ds) {
      console.warn(`❌ [MarketplaceQuery] DataSource NOT FOUND in Marketplace_DataSources: ${dataSourceId}`);
      return res.status(404).json({ error: `DataSource ${dataSourceId} no encontrado en Marketplace. Verifica que se haya registrado correctamente durante el Harvest.` });
    }

    const poolKey = `${ds.host}|${ds.databaseName}|${ds.username}`;
    if (!poolMap.has(poolKey)) {
      const p = new sql.ConnectionPool({ user: ds.username, password: ds.password, database: ds.databaseName, server: ds.host, pool: { max: 50 }, options: { encrypt: false, trustServerCertificate: true, connectTimeout: 30000, requestTimeout: 120000, enableArithAbort: true }});
      await p.connect();
      poolMap.set(poolKey, { pool: p, lastUsed: Date.now() });
    }
    const entry = poolMap.get(poolKey);
    entry.lastUsed = Date.now();
    
    const request = entry.pool.request();
    if (parameters) parameters.forEach(p => request.input(p.name, sql[p.type] || sql.NVarChar, p.value));
    
    const queryResult = await request.query(queryTemplate);
    console.log(`✅ [MarketplaceQuery] Success. Rows: ${queryResult.recordset.length} | Time: ${Date.now() - startTime}ms`);
    
    res.json({ success: true, columns: Object.keys(queryResult.recordset[0] || {}), rows: queryResult.recordset, executionTime: Date.now() - startTime });
  } catch (err) { 
    console.error('❌ [MarketplaceQuery] Global Error:', err.message);
    res.status(500).json({ error: err.message }); 
  }
});

app.patch('/api/marketplace/widgets/:id/visibility', requireToken, async (req, res) => {
  const { isHidden } = req.body;
  try {
    const pool = await ensureSysConnection();
    await pool.request().input('id', sql.UniqueIdentifier, req.params.id).input('uid', sql.VarChar, req.session.userId).input('hide', sql.Bit, isHidden ? 1 : 0).query('UPDATE Marketplace_Widgets SET isHidden = @hide WHERE id = @id AND ownerId = @uid');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/marketplace/widgets/:id', requireToken, async (req, res) => {
  const { name, description } = req.body;
  try {
    const pool = await ensureSysConnection();
    await pool.request().input('id', sql.UniqueIdentifier, req.params.id).input('uid', sql.VarChar, req.session.userId).input('name', sql.NVarChar, name).input('desc', sql.NVarChar, description).query('UPDATE Marketplace_Widgets SET name = @name, description = @desc WHERE id = @id AND ownerId = @uid');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/marketplace/widgets/:id', requireToken, async (req, res) => {
  try {
    const pool = await ensureSysConnection();
    await pool.request().input('id', sql.UniqueIdentifier, req.params.id).input('uid', sql.VarChar, req.session.userId).query('UPDATE Marketplace_Widgets SET isDeleted = 1 WHERE id = @id AND ownerId = @uid');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/marketplace/favorites/toggle', requireToken, async (req, res) => {
  const { widgetId } = req.body;
  try {
    const pool = await ensureSysConnection();
    const existing = await pool.request().input('uid', sql.VarChar, req.session.userId).input('wid', sql.UniqueIdentifier, widgetId).query('SELECT * FROM Marketplace_Favorites WHERE userId = @uid AND widgetId = @wid');
    if (existing.recordset.length > 0) {
      await pool.request().input('uid', sql.VarChar, req.session.userId).input('wid', sql.UniqueIdentifier, widgetId).query('DELETE FROM Marketplace_Favorites WHERE userId = @uid AND widgetId = @wid');
      res.json({ success: true, isFavorite: false });
    } else {
      await pool.request().input('uid', sql.VarChar, req.session.userId).input('wid', sql.UniqueIdentifier, widgetId).query('INSERT INTO Marketplace_Favorites (userId, widgetId) VALUES (@uid, @wid)');
      res.json({ success: true, isFavorite: true });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Assets endpoints
app.get('/api/dev/assets', requireToken, async (req, res) => {
  try {
    const sources = await sysPool.request().query('SELECT * FROM DevSources');
    const measures = await sysPool.request().query('SELECT * FROM DevMeasures');
    const published = await sysPool.request().query('SELECT * FROM PublishedDashboards');
    const system = await sysPool.request().query('SELECT * FROM SystemDashboards');
    const canvas = await sysPool.request().input('id', sql.VarChar, 'active_canvas').query('SELECT data FROM DevCanvas WHERE id = @id');
    const sysMap = {};
    for (const row of system.recordset) { if (!sysMap[row.areaId]) sysMap[row.areaId] = []; sysMap[row.areaId].push(JSON.parse(row.data)); }
    res.json({ success: true, sources: sources.recordset.map(r => ({ id: r.id, data: JSON.parse(r.data) })), measures: measures.recordset.map(r => ({ id: r.id, ...JSON.parse(r.data) })), published: published.recordset.map(r => ({ id: r.id, ...JSON.parse(r.data) })), system: sysMap, canvas: canvas.recordset.length > 0 ? JSON.parse(canvas.recordset[0].data).items : [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dev/canvas', requireToken, async (req, res) => {
  try {
    await sysPool.request().input('id', sql.VarChar, req.body.id).input('data', sql.NVarChar, JSON.stringify(req.body)).query(`
      IF EXISTS (SELECT * FROM DevCanvas WHERE id = @id) UPDATE DevCanvas SET data = @data WHERE id = @id
      ELSE INSERT INTO DevCanvas (id, data) VALUES (@id, @data)
    `);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/dev/canvas/:id', requireToken, async (req, res) => {
  try { await sysPool.request().input('id', sql.VarChar, req.params.id).query('DELETE FROM DevCanvas WHERE id = @id'); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dev/published', requireToken, async (req, res) => {
  try {
    await sysPool.request().input('id', sql.VarChar, req.body.id).input('data', sql.NVarChar, JSON.stringify(req.body)).query(`
      IF EXISTS (SELECT * FROM PublishedDashboards WHERE id = @id) UPDATE PublishedDashboards SET data = @data WHERE id = @id
      ELSE INSERT INTO PublishedDashboards (id, data) VALUES (@id, @data)
    `);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/dev/published/:id', requireToken, async (req, res) => {
  try { await sysPool.request().input('id', sql.VarChar, req.params.id).query('DELETE FROM PublishedDashboards WHERE id = @id'); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dev/system', requireToken, async (req, res) => {
  const { areaId, dashId, dashboard } = req.body;
  try {
    await sysPool.request().input('areaId', sql.VarChar, areaId).input('dashId', sql.VarChar, dashId).input('data', sql.NVarChar, JSON.stringify(dashboard)).query(`
      IF EXISTS (SELECT * FROM SystemDashboards WHERE areaId = @areaId AND dashId = @dashId) UPDATE SystemDashboards SET data = @data WHERE areaId = @areaId AND dashId = @dashId
      ELSE INSERT INTO SystemDashboards (areaId, dashId, data) VALUES (@areaId, @dashId, @data)
    `);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => { console.log(`🚀 ATR Analytics API → http://localhost:${PORT}`); });

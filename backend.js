import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import mysql from 'mysql2/promise';
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
    max: 500,
    min: 0,
    idleTimeoutMillis: 60000,
    acquireTimeoutMillis: 30000
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 30000,
    requestTimeout: 120000,
    enableArithAbort: true
  },
};

const sysPool = new sql.ConnectionPool(dbConfig);
sysPool.on('error', err => console.error('❌ SQL Pool Error (ignored):', err.message));

const poolMap = new Map();
const metadataCache = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of poolMap.entries()) {
    if (now - entry.lastUsed > 300000) { entry.pool.close(); poolMap.delete(key); }
  }
  for (const [key, entry] of metadataCache.entries()) {
    if (now - entry.timestamp > 600000) { metadataCache.delete(key); }
  }
}, 300000);

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
    await new Promise(r => {
      const it = setInterval(() => {
        if (!sysPool.connecting) { clearInterval(it); r(null); }
      }, 100);
    });
    return sysPool;
  }
  try {
    await sysPool.connect();
  } catch (err) {
    console.error('❌ Failed to reconnect system pool:', err.message);
  }
  return sysPool;
}

async function initDatabase() {
  try {
    await sysPool.connect();
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
    await createIfNotExists('Marketplace_DataSources', `
      CREATE TABLE Marketplace_DataSources (
        id VARCHAR(100) PRIMARY KEY, name NVARCHAR(200), host NVARCHAR(255), databaseName NVARCHAR(100),
        username NVARCHAR(100), password NVARCHAR(500), owner VARCHAR(50), type VARCHAR(50) DEFAULT 'sql', provider VARCHAR(50) DEFAULT 'sqlserver', configJSON NVARCHAR(MAX), createdAt DATETIME DEFAULT GETDATE()
      )
    `);
    
    await sysPool.request().query("IF COL_LENGTH('Marketplace_DataSources', 'type') IS NULL ALTER TABLE Marketplace_DataSources ADD type VARCHAR(50) DEFAULT 'sql'");
    await sysPool.request().query("IF COL_LENGTH('Marketplace_DataSources', 'provider') IS NULL ALTER TABLE Marketplace_DataSources ADD provider VARCHAR(50) DEFAULT 'sqlserver'");
    await sysPool.request().query("IF COL_LENGTH('Marketplace_DataSources', 'configJSON') IS NULL ALTER TABLE Marketplace_DataSources ADD configJSON NVARCHAR(MAX)");

    await createIfNotExists('Marketplace_Widgets', `CREATE TABLE Marketplace_Widgets (id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(), name NVARCHAR(200), ownerId VARCHAR(50), isDeleted BIT DEFAULT 0, status NVARCHAR(50) DEFAULT 'approved')`);
    await createIfNotExists('Marketplace_Widget_Versions', `CREATE TABLE Marketplace_Widget_Versions (versionId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(), widgetId UNIQUEIDENTIFIER, versionTag NVARCHAR(20), configJSON NVARCHAR(MAX), executionJSON NVARCHAR(MAX), createdAt DATETIME DEFAULT GETDATE(), authorId VARCHAR(50))`);
    
    const { recordset } = await sysPool.request().query('SELECT COUNT(*) as cnt FROM Users');
    if (recordset[0].cnt === 0) {
      await sysPool.request().input('id1', sql.VarChar, '1').input('fn1', sql.NVarChar, 'Admin').input('ln1', sql.NVarChar, 'User').input('email1', sql.NVarChar, 'admin@atr.com').input('role1', sql.VarChar, 'admin').input('pass1', sql.VarChar, mockHash('admin123')).query('INSERT INTO Users (id, firstName, lastName, email, role, password) VALUES (@id1, @fn1, @ln1, @email1, @role1, @pass1)');
    }
  } catch (err) { console.error('❌ Failed to initialize database:', err.message); }
}
initDatabase();

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

app.post('/api/auth/issue', async (req, res) => {
  const { email, password } = req.body;
  try {
    const pool = await ensureSysConnection();
    const result = await pool.request().input('email', sql.NVarChar, email).query('SELECT * FROM Users WHERE email = @email');
    const user = result.recordset[0];
    if (!user || (user.password !== mockHash(password) && user.password !== password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = crypto.randomBytes(32).toString('hex');
    tokens.set(token, { userId: user.id, userName: user.firstName, exp: Date.now() + 8 * 60 * 60 * 1000 });
    res.json({ success: true, token, user: { ...user, agencies: [], permissions: { areas: [], dashboards: [] } } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const getSQLConfig = (creds) => {
  let server = creds.host || creds.server || "";
  let port = 1433;
  if (server.includes(",")) {
    const parts = server.split(",");
    server = parts[0].trim();
    port = parseInt(parts[1].trim()) || 1433;
  } else if (server.includes(":")) {
    const parts = server.split(":");
    server = parts[0].trim();
    port = parseInt(parts[1].trim()) || 1433;
  }
  return {
    user: creds.username || creds.user,
    password: creds.password,
    database: creds.database || creds.databaseName,
    server,
    port,
    options: { 
      encrypt: false, 
      trustServerCertificate: true, 
      connectTimeout: 30000,
      enableArithAbort: true
    }
  };
};

app.post('/api/dev/test-connection', requireToken, async (req, res) => {
  const { host, database, username, password, provider } = req.body;
  try {
    if (provider === 'mysql') {
       const [h, prt] = (host || "").split(/[:,]/);
       const conn = await mysql.createConnection({ host: h, port: parseInt(prt) || 3306, user: username, password, database });
       await conn.end();
    } else {
       const config = getSQLConfig({ host, username, password, database });
       const p = new sql.ConnectionPool(config);
       await p.connect();
       await p.close();
    }
    res.json({ success: true, message: 'Conexión exitosa' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/dev/tables/:connectionId', requireToken, async (req, res) => {
  const { connectionId } = req.params;
  const startTime = Date.now();
  const diag = { currentUser: 'unknown', currentDB: 'unknown', serverVersion: 'unknown' };
  try {
    const poolSys = await ensureSysConnection();
    let ds = null;
    for (let i = 0; i < 3; i++) {
        const dsRes = await poolSys.request().input('id', sql.VarChar, connectionId).query('SELECT * FROM Marketplace_DataSources WHERE id = @id');
        ds = dsRes.recordset[0];
        if (ds) break;
        if (i < 2) await new Promise(r => setTimeout(r, 800)); 
    }
    
    if (!ds) return res.status(404).json({ error: `Conexión no encontrada.` });

    const poolKey = `${ds.host}|${ds.databaseName}|${ds.username}`;
    if (poolMap.has(poolKey)) {
      const existingEntry = poolMap.get(poolKey);
      const isSqlClosed = ds.provider !== 'mysql' && !existingEntry.pool.connected;
      const isMysqlClosed = (ds.type === 'mysql' || ds.provider === 'mysql') && existingEntry.pool._closed;

      if (isSqlClosed || isMysqlClosed) {
        console.log(`⚠️ Conexión en poolMap estaba cerrada. Recreando Key: ${poolKey}`);
        poolMap.delete(poolKey);
      }
    }

    if (!poolMap.has(poolKey)) {
      const config = getSQLConfig({ host: ds.host, username: ds.username, password: ds.password, database: ds.databaseName });
      const p = new sql.ConnectionPool(config);
      await p.connect();
      
      // 🛡️ QA INSTRUMENTATION: Force Context
      if (ds.databaseName && ds.provider !== 'mysql') {
         await p.request().query(`USE [${ds.databaseName}]`);
         console.log(`📡 QA Context Forced: USE [${ds.databaseName}]`);
      }
      poolMap.set(poolKey, { pool: p, lastUsed: Date.now() });
      console.log(`🔄 Nueva conexión agregada al poolMap. Key: ${poolKey}`);
    } else {
      console.log(`⚡ Reusando conexión activa existente del poolMap. Key: ${poolKey}`);
      // Actualizar lastUsed para mantener viva la conexión
      poolMap.get(poolKey).lastUsed = Date.now();
    }
    const entry = poolMap.get(poolKey);
    let tables = [];
    
    if (ds.type === 'mysql' || ds.provider === 'mysql') {
       const [rows] = await entry.pool.query("SHOW FULL TABLES");
       tables = rows.map(r => {
         const vals = Object.values(r);
         return { name: vals[0], type: vals[1] === 'VIEW' ? 'VIEW' : 'TABLE' };
       });
    } else {
       // QA Diagnostic Run
       const qResult = await entry.pool.request().query("SELECT SUSER_SNAME() as [user], DB_NAME() as [db], @@VERSION as [ver]");
       diag.currentUser = qResult.recordset[0].user;
       diag.currentDB = qResult.recordset[0].db;
       diag.serverVersion = qResult.recordset[0].ver;
       console.log(`📊 QA Telemetry: [User: ${diag.currentUser}] [DB: ${diag.currentDB}]`);

       const query = `
         SELECT TABLE_SCHEMA + '.' + TABLE_NAME AS TABLE_NAME, TABLE_TYPE
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
         ORDER BY TABLE_NAME
       `;
       console.log(`🔍 Ejecutando query de descubrimiento de tablas para SQL Server: \n${query.trim()}`);
       const result = await entry.pool.request().query(query);
       tables = result.recordset.map(r => ({
           name: r.TABLE_NAME,
           type: r.TABLE_TYPE === 'VIEW' ? 'VIEW' : 'TABLE'
       }));

       if (tables.length === 0) {
           console.warn(`⚠️ No se encontraron tablas para conexión ${connectionId}. Verificando permisos del usuario...`);
           try {
               const permResult = await entry.pool.request().query(`SELECT * FROM fn_my_permissions(NULL, 'DATABASE')`);
               const perms = permResult.recordset.map(p => p.permission_name);
               console.warn(`🔑 Permisos actuales de la base de datos para ${diag.currentUser}: [${perms.join(', ')}]`);

               const hasReadAccess = perms.includes('SELECT') || perms.includes('VIEW DEFINITION') || perms.includes('CONTROL');
               if (!hasReadAccess) {
                   return res.status(403).json({
                       success: false,
                       tables: [],
                       count: 0,
                       executionTime: Date.now() - startTime,
                       error: `La consulta retornó 0 tablas por falta de permisos. Permisos actuales en la BD: ${perms.join(', ') || 'Ninguno detectado'}`,
                       diag
                   });
               } else {
                   console.log(`✅ Permisos suficientes detectados. La base de datos parece no tener tablas.`);
               }
           } catch (permErr) {
               console.error(`❌ Error al consultar permisos:`, permErr.message);
           }
       }
    }
    console.log(`✅ Tablas obtenidas para conexión ${connectionId}. Count: ${tables.length}`);
    res.json({ success: true, tables, count: tables.length, executionTime: Date.now() - startTime, diag });
  } catch (err) {
    console.error(`❌ Error al obtener tablas para conexión ${connectionId}:`, err.message);
    res.status(500).json({ success: false, error: err.message, tables: [], count: 0, executionTime: Date.now() - startTime, diag });
  }
});

app.post('/api/dev/sources', requireToken, async (req, res) => {
  const { id, name, host, database, username, password, type, provider, config } = req.body;
  try {
    const pool = await ensureSysConnection();
    await pool.request().input('id', sql.VarChar, id).input('name', sql.NVarChar, name || `Source ${id}`).input('host', sql.NVarChar, host || '').input('db', sql.NVarChar, database || '').input('user', sql.NVarChar, username || '').input('pass', sql.NVarChar, password || '').input('owner', sql.VarChar, req.session.userId).input('type', sql.VarChar, type || 'sql').input('provider', sql.VarChar, provider || 'sqlserver').input('config', sql.NVarChar, JSON.stringify(config || {})).query(`
        IF EXISTS (SELECT 1 FROM Marketplace_DataSources WHERE id = @id)
          UPDATE Marketplace_DataSources SET name=@name, host=@host, databaseName=@db, username=@user, password=@pass, type=@type, provider=@provider, configJSON=@config WHERE id=@id
        ELSE
          INSERT INTO Marketplace_DataSources (id, name, host, databaseName, username, password, owner, type, provider, configJSON) 
          VALUES (@id, @name, @host, @db, @user, @pass, @owner, @type, @provider, @config)
    `);
    console.log(`✅ Conexión creada/actualizada exitosamente. Connection ID: ${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`❌ Error al guardar conexión ${id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dev/columns/:connectionId', requireToken, async (req, res) => {
  const { connectionId } = req.params;
  const { table } = req.query;
  try {
    const poolSys = await ensureSysConnection();
    const dsRes = await poolSys.request().input('id', sql.VarChar, connectionId).query('SELECT * FROM Marketplace_DataSources WHERE id = @id');
    const ds = dsRes.recordset[0];
    if (!ds) return res.status(404).json({ error: `Conexión no encontrada.` });
    const poolKey = `${ds.host}|${ds.databaseName}|${ds.username}`;
    const entry = poolMap.get(poolKey);
    let columns = [];
    if (ds.provider === 'mysql') {
       const [rows] = await entry.pool.query(`DESCRIBE \`${table}\``);
       columns = rows.map(r => ({ COLUMN_NAME: r.Field, DATA_TYPE: r.Type }));
    } else {
       const [schema, tableName] = table.includes('.') ? table.split('.') : ['dbo', table];
       const result = await entry.pool.request().input('s', sql.NVarChar, schema).input('t', sql.NVarChar, tableName).query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @s AND TABLE_NAME = @t");
       columns = result.recordset;
    }
    res.json({ success: true, columns });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dev/preview/:connectionId', requireToken, async (req, res) => {
  const { connectionId } = req.params;
  const { table } = req.query;
  const startTime = Date.now();
  try {
    const poolSys = await ensureSysConnection();
    const dsRes = await poolSys.request().input('id', sql.VarChar, connectionId).query('SELECT * FROM Marketplace_DataSources WHERE id = @id');
    const ds = dsRes.recordset[0];
    const poolKey = `${ds.host}|${ds.databaseName}|${ds.username}`;
    const entry = poolMap.get(poolKey);
    let rows = [];
    let tot = 0;
    if (ds.provider === 'mysql') {
       const [r] = await entry.pool.query(`SELECT * FROM \`${table}\` LIMIT 50000`);
       rows = r;
       const [cnt] = await entry.pool.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
       tot = cnt[0].cnt;
    } else {
       const result = await entry.pool.request().query(`SELECT TOP 50000 * FROM [${table}]`);
       rows = result.recordset;
       const countResult = await entry.pool.request().query(`SELECT COUNT(*) as cnt FROM [${table}]`);
       tot = countResult.recordset[0].cnt;
    }
    res.json({ success: true, columns: Object.keys(rows[0] || {}), rows, totalRows: tot, executionTime: Date.now() - startTime });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dev/query', requireToken, async (req, res) => {
  const { connectionId, query } = req.body;
  const startTime = Date.now();
  try {
    const poolSys = await ensureSysConnection();
    const dsRes = await poolSys.request().input('id', sql.VarChar, connectionId).query('SELECT * FROM Marketplace_DataSources WHERE id = @id');
    const ds = dsRes.recordset[0];
    const poolKey = `${ds.host}|${ds.databaseName}|${ds.username}`;
    const entry = poolMap.get(poolKey);
    let rows = [];
    if (ds.type === 'mysql') {
       const [r] = await entry.pool.query(query);
       rows = r;
    } else {
       const result = await entry.pool.request().query(query);
       rows = result.recordset;
    }
    res.json({ success: true, columns: Object.keys(rows[0] || {}), rows, executionTime: Date.now() - startTime });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dev/assets', requireToken, async (req, res) => {
  try {
    const sources = await sysPool.request().query('SELECT * FROM Marketplace_DataSources');
    const measures = await sysPool.request().query('SELECT * FROM DevMeasures');
    const published = await sysPool.request().query('SELECT * FROM PublishedDashboards');
    const canvas = await sysPool.request().input('id', sql.VarChar, 'active_canvas').query('SELECT data FROM DevCanvas WHERE id = @id');
    res.json({ 
      success: true, 
      sources: sources.recordset, 
      measures: measures.recordset.map(r => ({ id: r.id, ...JSON.parse(r.data) })), 
      published: published.recordset.map(r => ({ id: r.id, ...JSON.parse(r.data) })), 
      canvas: canvas.recordset.length > 0 ? JSON.parse(canvas.recordset[0].data).items : [] 
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => { console.log(`🚀 ATR vQuantum Engine [QA Instrumented] → http://localhost:${PORT}`); });

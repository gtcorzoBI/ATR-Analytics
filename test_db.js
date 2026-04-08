import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Password123!',
  database: process.env.DB_NAME || 'ATRAnalytics',
  server: process.env.DB_HOST || 'localhost',
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function test() {
  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();
  console.log("Connected");
  process.exit(0);
}

test().catch(console.error);

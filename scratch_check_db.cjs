const sql = require('mssql');

const config = {
  user: 'adminATR',
  password: '123456789',
  database: 'ATRAnalytics',
  server: '10.10.10.13',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkFilters() {
  try {
    await sql.connect(config);
    console.log('--- DashboardFilterAccess Content ---');
    const result = await sql.query`SELECT * FROM DashboardFilterAccess`;
    console.table(result.recordset);
    
    console.log('\n--- Users Content ---');
    const users = await sql.query`SELECT id, email, role FROM Users`;
    console.table(users.recordset);

    console.log('\n--- SystemDashboards Content ---');
    const dashes = await sql.query`SELECT areaId, dashId FROM SystemDashboards`;
    console.table(dashes.recordset);

  } catch (err) {
    console.error(err);
  } finally {
    await sql.close();
  }
}

checkFilters();

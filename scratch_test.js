const sql = require('mssql');
async function run() {
  try {
    const pool = await sql.connect({
      server: 'localhost',
      database: 'atr_analytics_dev',
      user: 'sa',
      password: 'Atr!2024',
      options: { encrypt: false, trustServerCertificate: true }
    });
    const res = await pool.request().query('SELECT * FROM SystemDashboards');
    for (let row of res.recordset) {
      const data = JSON.parse(row.data);
      const comps = data.components || (data.config ? data.config.components : []);
      console.log('\n--- Dashboard:', data.name || data.title, '---');
      comps.forEach(comp => {
        if(comp.visualType === 'slicer' || (comp.code && comp.code.includes('__dashboardFilters'))) {
          console.log('Slicer comp:', comp.name || comp.id);
          console.log('  keys:', Object.keys(comp).join(', '));
          console.log('  executionJSON:', comp.executionJSON ? comp.executionJSON.substring(0, 50) + '...' : null);
          console.log('  configJSON:', comp.configJSON ? comp.configJSON.substring(0, 50) + '...' : null);
          console.log('  query length:', comp.query ? comp.query.length : 0);
          console.log('  connectionId:', comp.connectionId);
        }
      });
    }
    process.exit(0);
  } catch(e){
    console.error(e);
    process.exit(1);
  }
}
run();

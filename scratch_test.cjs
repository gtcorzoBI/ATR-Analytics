const sql = require('mssql');
async function run() {
  try {
    const pool = await sql.connect({
      server: '10.10.10.13',
      database: 'ATRAnalytics',
      user: 'adminATR',
      password: '123456789',
      options: { encrypt: false, trustServerCertificate: true }
    });
    const res3 = await pool.request().query("SELECT * FROM SystemDashboards");
    for (let row of res3.recordset) {
      const data = JSON.parse(row.data);
      if (data.name === 'DATA' || data.title === 'DATA') {
        const comps = data.components || (data.config ? data.config.components : []);
        console.log('\n--- Dashboard:', data.name || data.title, '---');
        comps.forEach(comp => {
          let code = comp.code || '';
          if (comp.configJSON) {
            try {
              const cfg = typeof comp.configJSON === 'string' ? JSON.parse(comp.configJSON) : comp.configJSON;
              if (!code) code = cfg.code || '';
            } catch (e) {}
          }
          if (code.includes('Agencia_Responsable_Intereses') || comp.name === 'Agencia_Responsable_Intereses') {
            console.log('Comp matched:', comp.name, comp.visualType);
            console.log('  code length:', code.length);
            console.log('  execJSON:', comp.executionJSON ? comp.executionJSON.substring(0, 50) + '...' : null);
            console.log('  configJSON:', comp.configJSON ? comp.configJSON.substring(0, 50) + '...' : null);
            console.log('  connectionId:', comp.connectionId || (comp.connection ? comp.connection.connectionId : null));
            console.log('  query:', comp.query);
            if (comp.executionJSON) {
              const exec = typeof comp.executionJSON === 'string' ? JSON.parse(comp.executionJSON) : comp.executionJSON;
              console.log('  parsed exec rawQuery:', exec.rawQuery);
            }
          }
        });
      }
    }
    process.exit(0);
  } catch(e){
    console.error(e);
    process.exit(1);
  }
}
run();

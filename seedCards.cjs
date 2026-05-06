require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: { encrypt: false, trustServerCertificate: true },
};

const areas = {
  "FINANCIAMIENTO": ["Bancos", "Flujos de Efectivo", "Créditos", "Tesoreria", "Proyecciones", "Conciliaciones"],
  "ADMINISTRACION": ["Eros", "Vales de compra", "Deuda Das"],
  "CONTABILIDAD": ["Facturas Realizadas", "Costo de Ingreso", "Costo Egresos"]
};

const dummyCards = [
  // FINANCIAMIENTO - Bancos
  { area: "FINANCIAMIENTO", category: "Bancos", title: "Conciliación BBVA Mzo", description: "Saldo final en BBVA: $1,250,000. Movimientos pendientes de aplicar: $120,000. Tasa de rendimiento cuenta eje: 5.2%.", sucursal: "LOMAS" },
  { area: "FINANCIAMIENTO", category: "Bancos", title: "Fondeo Banorte Q3", description: "Línea de crédito dispuesta por $800,000. Intereses pagados este mes: $12,500. Saldo disponible: $2.2M.", sucursal: "CARRANZA" },
  { area: "FINANCIAMIENTO", category: "Bancos", title: "Revisión Santander", description: "Flujo de entrada por TPVs: $450,000. Comisiones cobradas: $8,900. Se recomienda renegociar tasa adquirente.", sucursal: "NAVA" },
  
  // FINANCIAMIENTO - Flujos de Efectivo
  { area: "FINANCIAMIENTO", category: "Flujos de Efectivo", title: "Proyección Caja Semana 32", description: "Ingresos esperados: $3.2M. Salidas operativas: $2.1M. Flujo libre proyectado: $1.1M.", sucursal: "MATEHUALA" },
  { area: "FINANCIAMIENTO", category: "Flujos de Efectivo", title: "Análisis Burn Rate Operativo", description: "Burn rate actual: $450k/mes. Cuentas por cobrar a 30 días: $1.2M. Runway estimado de 14 meses.", sucursal: "INSUR" },
  { area: "FINANCIAMIENTO", category: "Flujos de Efectivo", title: "Descalce de Pagos a Proveedores", description: "Faltante temporal de $200k esperado para el jueves. Se cubrirá con ingresos de facturación de contado ($350k).", sucursal: "SENDERO" },

  // FINANCIAMIENTO - Créditos
  { area: "FINANCIAMIENTO", category: "Créditos", title: "Pago Capital Crédito Simple", description: "Vencimiento cuota crédito de expansión: $150,000 capital + $25,000 intereses. Total a pagar: $175,000.", sucursal: "RIOVERDE" },
  { area: "FINANCIAMIENTO", category: "Créditos", title: "Evaluación Tasa Variable", description: "Deuda TIIE + 3%. Impacto del último incremento: +$15,000 en costo financiero mensual.", sucursal: "TLALPAN" },
  { area: "FINANCIAMIENTO", category: "Créditos", title: "Línea Revolvente Autos", description: "Disposición de línea para inventario: $1.5M. Costo financiero 12% anual. Ventas proyectadas soportan el pago.", sucursal: "FLOTAS CDMX" },

  // ADMINISTRACION - Eros
  { area: "ADMINISTRACION", category: "Eros", title: "Auditoría de Gastos Eros", description: "Gasto total Eros acumulado: $85,000. Desviación presupuestal del 12%. Principales rubros: Viáticos y mantenimiento.", sucursal: "BMW" },
  { area: "ADMINISTRACION", category: "Eros", title: "Optimización Suscripciones", description: "Ahorro potencial de $12,000 cancelando licencias SaaS no utilizadas por el área de operaciones.", sucursal: "CENTRO MAX" },
  { area: "ADMINISTRACION", category: "Eros", title: "Renovación Pólizas Seguros", description: "Costo prima 2026: $320,000. Incremento del 8% vs 2025. Cobertura ampliada para flotilla.", sucursal: "LA JOYA" },

  // CONTABILIDAD - Facturas Realizadas
  { area: "CONTABILIDAD", category: "Facturas Realizadas", title: "Cierre Facturación Mes Anterior", description: "Total Facturado: $5.8M. Facturas canceladas: $200k. Nota de crédito aplicadas: $50k.", sucursal: "FORUM" },
  { area: "CONTABILIDAD", category: "Facturas Realizadas", title: "Revisión Facturación Flotillas", description: "Facturación pendiente de emitir: $1.2M. Clientes corporativos con retraso en OC.", sucursal: "MG POLIFORUM" },
  { area: "CONTABILIDAD", category: "Facturas Realizadas", title: "Conciliación CFDI vs Banco", description: "Ingresos timbrados vs depósitos en firme cuadran al 98%. Diferencia de $15,000 en aclaración.", sucursal: "INFINITI QUERÉTARO" },

  // CONTABILIDAD - Costo de Ingreso
  { area: "CONTABILIDAD", category: "Costo de Ingreso", title: "Análisis Margen Bruto", description: "Costo de ventas total: $3.5M. Margen bruto: 39%. El costo de autopartes subió 4% por tipo de cambio.", sucursal: "MG LOMAS" },
  { area: "CONTABILIDAD", category: "Costo de Ingreso", title: "Revisión Costeo de Servicios", description: "Costo mano de obra directa: $400k. Materiales: $800k. Rentabilidad de servicio post-venta en target.", sucursal: "LOMAS" },
  { area: "CONTABILIDAD", category: "Costo de Ingreso", title: "Ajuste de Inventario Físico", description: "Merma detectada por $45,000 en refacciones. Impacto directo en costo del Q3.", sucursal: "INFINITI FORUM" },

  // CONTABILIDAD - Costo Egresos
  { area: "CONTABILIDAD", category: "Costo Egresos", title: "OPEX Q3", description: "Gastos fijos: $800k. Gastos variables operativos: $450k. Nómina: $1.2M. OPEX total bajo control.", sucursal: "INFINITI SLP" },
  { area: "CONTABILIDAD", category: "Costo Egresos", title: "Gasto en Marketing Digital", description: "Inversión en pauta: $150k. Leads generados: 450. CAC (Costo adquisición): $333.", sucursal: "SENDERO" },
  { area: "CONTABILIDAD", category: "Costo Egresos", title: "Mantenimiento Instalaciones", description: "Costo CAPEX mensual: $120k. Trabajos de techumbre y pintura en sucursales foráneas.", sucursal: "NAVA" }
];

async function seed() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log("Connected to DB.");
    
    // Insert cards
    for (const card of dummyCards) {
      await pool.request()
        .input('area', sql.VarChar, card.area)
        .input('category', sql.VarChar, card.category)
        .input('title', sql.NVarChar, card.title)
        .input('description', sql.NVarChar, card.description)
        .input('status', sql.VarChar, 'En Proceso')
        .input('sucursal', sql.VarChar, card.sucursal)
        .input('created_by', sql.NVarChar, 'Admin IA')
        .input('start_date', sql.DateTime, new Date())
        .input('end_date', sql.DateTime, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
        .query(`
          INSERT INTO rhythm_cards (area, category, title, description, status, sucursal, created_by, start_date, end_date)
          VALUES (@area, @category, @title, @description, @status, @sucursal, @created_by, @start_date, @end_date)
        `);
      console.log("Inserted: " + card.title);
    }
    console.log("Seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
seed();

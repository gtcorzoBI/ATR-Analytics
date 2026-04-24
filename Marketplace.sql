-- =======================================================================
-- Archivo: Marketplace.sql
-- Descripción: Tabla para almacenar configuraciones individuales de gráficos
--              y dashboards completos para el Marketplace.
-- =======================================================================

CREATE TABLE Marketplace_Dashboards (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Nombre_Widget NVARCHAR(255) NOT NULL,    -- Nombre del gráfico individual (ej. "Ventas Mensuales")
    Dashboard_Padre NVARCHAR(255),           -- Nombre del Dashboard al que pertenecía originalmente
    Autor_User NVARCHAR(100),
    IP_Origen NVARCHAR(45),

    -- Configuración del Gráfico (JSON) cifrada desde el backend
    Config_JSON_Encrypted NVARCHAR(MAX) NOT NULL,

    -- Metadata para el Marketplace
    Categoria NVARCHAR(100),                 -- Ej: Ventas, RH, Finanzas (o 'Global', 'Favorito')
    Es_Aprobado BIT DEFAULT 0,
    Fecha_Creacion DATETIME DEFAULT GETDATE(),

    -- Tipo de Visual: Ej. 'bar', 'line', 'pie', 'table' (para facilitar el filtrado visual)
    Tipo_Visual NVARCHAR(50),

    -- Metadatos de conexión cifrados (host, db, user, pass, tabla, etc.)
    Connection_Metadata_Encrypted NVARCHAR(MAX)
);

-- Índices recomendados para búsquedas rápidas en el Drawer
CREATE INDEX IX_Marketplace_EsAprobado ON Marketplace_Dashboards(Es_Aprobado);
CREATE INDEX IX_Marketplace_Categoria ON Marketplace_Dashboards(Categoria);
CREATE INDEX IX_Marketplace_TipoVisual ON Marketplace_Dashboards(Tipo_Visual);

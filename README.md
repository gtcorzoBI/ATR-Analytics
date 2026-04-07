# ATR Analytics Pro / Login y diseño de bienvenida

Este proyecto es una aplicación web que cuenta con una interfaz de "Login y diseño de bienvenida". El diseño original del proyecto proviene de [Figma](https://www.figma.com/design/vWfwiT4qQBzFdDxGMa9nLG/Login-y-dise%C3%B1o-de-bienvenida).

## 🚀 Tecnologías

El proyecto está dividido en un Frontend y un Backend que corren sobre Node.js:

### Frontend
- **React** 18
- **Vite** como empaquetador y entorno de desarrollo rápido.
- **Tailwind CSS** para los estilos.
- **Radix UI**, **Lucide React** y componentes de interfaz interactivos.
- **Recharts** para visualización de datos.

### Backend
- **Node.js** con **Express**.
- **MSSQL** para la conexión y consultas a bases de datos SQL Server.
- Manejo de autenticación basada en tokens (en memoria).

## 📦 Instalación

Para configurar este proyecto localmente, asegúrate de tener [Node.js](https://nodejs.org/) instalado. Luego clona el repositorio y ejecuta:

```bash
# Instalar todas las dependencias
npm install
```

## ⚙️ Uso y Ejecución

El proyecto cuenta con comandos definidos en el archivo `package.json` para facilitar la ejecución.

### Iniciar el Frontend (Desarrollo)

Para arrancar el servidor de desarrollo del frontend (con Vite):

```bash
npm run dev
```

### Iniciar el Backend (API)

El backend expone endpoints en el puerto `3001` (por defecto) para manejar sesiones, conexiones a base de datos y consultas. Para iniciarlo:

```bash
npm run api
```

### Compilar para Producción

Para compilar el frontend listo para un entorno de producción:

```bash
npm run build
```

## 📂 Estructura del Código

- `/src`: Contiene todo el código del Frontend en React (App, componentes, hooks, contextos y rutas).
- `backend.js`: Contiene el código del servidor Backend (Express + SQL Server).
- `index.html`: Punto de entrada del Frontend.
- `vite.config.ts` / `postcss.config.mjs` / `tailwind.config`: Configuración del entorno frontend.

## 🔗 Endpoints del Backend

El backend incluye (entre otros) los siguientes endpoints (localhost:3001):
- `POST /api/auth/issue` - Crea un token de sesión temporal.
- `POST /api/auth/revoke` - Invalida un token de sesión.
- `POST /api/tables` - Obtiene la lista de tablas de la base de datos configurada.
- `POST /api/columns` - Obtiene la lista de columnas de una tabla seleccionada.
- `POST /api/query` - Ejecuta una consulta SQL genérica.
- `GET /api/health` - Comprueba el estado del backend.

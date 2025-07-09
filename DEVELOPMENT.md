# Development Setup with Hot Reload

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development without Docker)

## Quick Start

### Option 1: Using Docker (Recommended)

1. **Start all services with hot reload:**

   ```bash
   cd backend
   docker compose -f docker-compose.dev.yml up --build
   ```

2. **Start only backend:**

   ```bash
   cd backend
   npm run docker:dev
   ```

3. **Start only frontend:**
   ```bash
   cd frontend
   npm run docker:dev
   ```

### Option 2: Local Development

1. **Backend:**

   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Hot Reload Features

### Backend (Node.js + Express)

- ✅ **Nodemon** watches for file changes
- ✅ **Volume mounting** for instant code updates
- ✅ **Debug mode** available with `npm run dev:debug`
- ✅ **Auto-restart** when files change

### Frontend (Next.js)

- ✅ **Next.js dev server** with hot reload
- ✅ **Volume mounting** for instant code updates
- ✅ **Turbo mode** available with `npm run dev:debug`
- ✅ **Fast refresh** for React components

## Available Scripts

### Backend Scripts

```bash
npm run dev              # Start with nodemon (hot reload)
npm run dev:debug        # Start with debug mode
npm run docker:dev       # Start with Docker
npm run docker:dev:down  # Stop Docker services
npm run docker:dev:logs  # View Docker logs
```

### Frontend Scripts

```bash
npm run dev              # Start Next.js dev server
npm run dev:debug        # Start with Turbo mode
npm run docker:dev       # Start with Docker
npm run docker:dev:down  # Stop Docker services
npm run docker:dev:logs  # View Docker logs
```

## Environment Variables

Make sure you have a `.env` file in the `backend` directory with the following variables:

```env
# Database
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_database
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# MinIO
MINIO_ROOT_USER=your_minio_user
MINIO_ROOT_PASSWORD=your_minio_password
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001

# Backend
BACKEND_PORT=5000

# Frontend
FRONTEND_PORT=3000

# PgAdmin
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=admin
PGADMIN_PORT=8080
```

## Ports

- **Backend API**: http://localhost:5000
- **Frontend**: http://localhost:3000
- **Database**: localhost:5432
- **Redis**: localhost:6379
- **MinIO API**: http://localhost:9000
- **MinIO Console**: http://localhost:9001
- **PgAdmin**: http://localhost:8080

## Troubleshooting

### Common Issues

1. **Port already in use:**

   ```bash
   # Check what's using the port
   lsof -i :5000
   # Kill the process
   kill -9 <PID>
   ```

2. **Docker containers not starting:**

   ```bash
   # Clean up containers and volumes
   cd backend
   docker-compose -f docker-compose.dev.yml down -v
   docker system prune -f
   ```

3. **Node modules issues:**

   ```bash
   # Remove node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Hot reload not working:**
   - Check if files are being watched correctly
   - Ensure volume mounts are working
   - Check Docker logs for errors

### Debug Mode

For debugging with breakpoints:

1. **Backend debug:**

   ```bash
   npm run dev:debug
   ```

   Then connect your debugger to `localhost:9229`

2. **Frontend debug:**
   ```bash
   npm run dev:debug
   ```
   Use browser dev tools for debugging

## File Structure

```
├── backend/
│   ├── Dockerfile.dev          # Development Dockerfile
│   ├── docker-compose.dev.yml  # Development services
│   ├── nodemon.json           # Nodemon configuration
│   ├── .env                   # Environment variables
│   └── package.json           # Backend dependencies
├── frontend/
│   ├── Dockerfile.dev         # Development Dockerfile
│   └── package.json           # Frontend dependencies
└── DEVELOPMENT.md             # This file
```

## Tips

1. **Use VS Code with Docker extension** for better development experience
2. **Enable file watching** in your IDE for better hot reload
3. **Use Docker logs** to debug issues: `cd backend && docker-compose -f docker-compose.dev.yml logs -f`
4. **Keep your .env file updated** with the latest environment variables
5. **Use the debug scripts** when you need to set breakpoints

# StarHR Developer Onboarding Guide

Welcome to StarHR! This guide will help you get set up for development.

## Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **Docker & Docker Compose** ([Download](https://docker.com/))
- **Git** ([Download](https://git-scm.com/))
- **VS Code** (recommended) with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

---

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
git clone https://github.com/sallahuddin92/StarHR.git
cd StarHR
npm install
```

### 2. Start Services with Docker

```bash
docker-compose up -d
```

This starts:

- **PostgreSQL** on port 5432
- **API Server** on port 3001
- **Frontend** on port 3000

### 3. Verify Everything Works

```bash
# Check services
docker-compose ps

# Run tests
npm run test:api

# Open browser
open http://localhost:3000
```

### Default Login

- Username: `EMP-001`
- Password: `password123`

---

## Development Workflow

### Starting Development

```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start API with hot reload
npm run dev:api
```

### Running Tests

```bash
npm run test:api      # Backend tests
npm run test:ui       # Frontend tests
npm run test:e2e      # End-to-end tests
npm run test:coverage # With coverage report
```

### Code Quality

```bash
npm run lint          # Check for errors
npm run lint:fix      # Auto-fix issues
npm run format        # Format code
```

---

## Project Structure

```
StarHR/
├── api/                    # Backend API (Express.js)
│   ├── routes/            # API endpoints
│   ├── middleware/        # Auth, validation
│   ├── lib/              # Database, utilities
│   └── __tests__/        # Jest tests
├── screens/               # React screen components
├── src/                   # Frontend source
├── docs/                  # Documentation
├── migrations/            # SQL migrations
└── docker-compose.yml     # Docker setup
```

---

## Common Tasks

### Add a New API Endpoint

1. Create/modify route file in `api/routes/`
2. Add route to `api/index.ts`
3. Write tests in `api/__tests__/routes/`

### Add a New Screen

1. Create component in `screens/`
2. Add route in `App.tsx`
3. Update navigation in `src/components/Layout.tsx`

### Run Database Migration

```bash
# Using the migration runner
npm run seed
# Or direct SQL
psql -U postgres -d hr_portal -f migrations/XXX_migration.sql
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable          | Description             | Example                 |
| ----------------- | ----------------------- | ----------------------- |
| `DATABASE_URL`    | PostgreSQL connection   | `postgresql://...`      |
| `JWT_SECRET`      | Auth secret (32+ chars) | `your-secret-key...`    |
| `ALLOWED_ORIGINS` | CORS origins            | `http://localhost:3000` |

---

## Troubleshooting

### Database Connection Error

```bash
# Restart database
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Port Already in Use

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### API Not Responding

```bash
# Rebuild API container
docker-compose build api
docker-compose up -d api
```

---

## Getting Help

- Check `README.md` for project overview
- See `docs/STATUTORY_GUIDE.md` for Malaysian compliance
- Review existing tests for examples
- Open an issue on GitHub for bugs

---

Happy coding! 🚀

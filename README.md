# MAR ABU Booking Platform

A comprehensive booking platform for MAR ABU PROJECTS SERVICES LLC.

## 🏗️ Architecture
- **Frontend:** NextJS 14 + TailwindCSS + Material UI
- **Backend:** Express + TypeScript + Prisma
- **Database:** PostgreSQL
- **Authentication:** NextAuth.js + JWT

## 🚀 Quick Start
```bash
# Install dependencies
npm run install:all

# Start development servers
npm run dev

# Access applications
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# Database Admin: http://localhost:5050


Project Structure

/frontend - NextJS application
/backend - Express API server
/database - Database schemas and migrations
/shared - Shared TypeScript types
/docs - Project documentation


## 🔄 Development Workflow Commands

### Install all dependencies:
```bash
# From root directory
npm run install:all

# Or manually:
cd frontend && npm install && cd ../backend && npm install && cd ..

Start development servers:
bash# Start all services with Docker
docker-compose up -d

# Or start manually:
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Terminal 3 - Database (if not using Docker)
# Start PostgreSQL service
Database operations:
bashcd backend

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio

# Seed database
npm run db:seed
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
=======
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
>>>>>>> feat/HomePage

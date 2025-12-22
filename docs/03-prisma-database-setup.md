# Part 3: Prisma + PostgreSQL Setup in Turborepo

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Setting Up the Database Package](#setting-up-the-database-package)
- [Prisma Schema Configuration](#prisma-schema-configuration)
- [Creating the Prisma Client Singleton](#creating-the-prisma-client-singleton)
- [Exporting to Apps](#exporting-to-apps)
- [Turbo Configuration for Prisma](#turbo-configuration-for-prisma)
- [Production Build Issues & Solutions](#production-build-issues--solutions)
- [Vercel Deployment](#vercel-deployment)
- [Common Errors & Solutions](#common-errors--solutions)

---

## Overview

Setting up Prisma in a Turborepo monorepo requires careful configuration to ensure:
1. The Prisma client is generated before builds
2. All apps can access the shared database client
3. Production builds work correctly on Vercel/other platforms

### What We're Building

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE PACKAGE STRUCTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  packages/database/                                             │
│  ├── prisma/                                                    │
│  │   ├── schema.prisma    ← Database models                    │
│  │   └── seed.ts          ← Seed script                        │
│  ├── src/                                                       │
│  │   ├── index.ts         ← Main exports                       │
│  │   └── client.ts        ← Prisma client singleton            │
│  └── package.json         ← Dependencies & exports             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Why a Separate Database Package?

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED DATABASE BENEFITS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Single source of truth for database schema                 │
│  ✅ Consistent Prisma client across all apps                   │
│  ✅ Centralized migrations                                     │
│  ✅ Shared types (User, Post, etc.) auto-generated             │
│  ✅ No duplicate Prisma configurations                         │
│  ✅ Easier to maintain and update                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Dependency Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE DEPENDENCY FLOW                        │
└─────────────────────────────────────────────────────────────────────────┘

                        ┌───────────────────┐
                        │ packages/database │
                        │  ───────────────  │
                        │  • Prisma Schema  │
                        │  • Prisma Client  │
                        │  • Type exports   │
                        └─────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
           ┌───────────────┐           ┌───────────────┐
           │   apps/main   │           │  apps/admin   │
           │  ───────────  │           │  ───────────  │
           │               │           │               │
           │  import from: │           │  import from: │
           │  @repo/       │           │  @repo/       │
           │   database    │           │   database    │
           │               │           │               │
           │  • db client  │           │  • db client  │
           │  • User type  │           │  • User type  │
           │  • Post type  │           │  • Post type  │
           └───────────────┘           └───────────────┘
```

---

## Setting Up the Database Package

### Step 1: Create Package Structure

```bash
mkdir -p packages/database/prisma
mkdir -p packages/database/src
```

### Step 2: Create package.json

```json
// packages/database/package.json
{
  "name": "@repo/database",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client.ts"
  },
  "scripts": {
    "generate": "prisma generate",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "6.14.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@types/node": "^22.15.3",
    "prisma": "6.14.0",
    "tsx": "^4.19.2",
    "typescript": "5.9.2"
  }
}
```

### Step 3: Create tsconfig.json

```json
// packages/database/tsconfig.json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "prisma/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Prisma Schema Configuration

### Create the Schema

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // For connection pooling (Neon, Supabase)
}

// ============================================
// MODELS
// ============================================

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  posts     Post[]
  sessions  Session[]

  @@map("users")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model Post {
  id          String   @id @default(cuid())
  title       String
  content     String?
  published   Boolean  @default(false)
  authorId    String
  author      User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("posts")
}

enum Role {
  USER
  ADMIN
}
```

### Environment Variables

Create `.env` file:

```bash
# packages/database/.env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
```

Create `.env.example`:

```bash
# packages/database/.env.example
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
```

---

## Creating the Prisma Client Singleton

### Why a Singleton?

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHY PRISMA SINGLETON?                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  In development, Next.js hot-reloading can create multiple     │
│  Prisma client instances, exhausting database connections.     │
│                                                                 │
│  ❌ Without singleton:                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Hot reload #1  →  new PrismaClient()  →  Connection 1  │   │
│  │  Hot reload #2  →  new PrismaClient()  →  Connection 2  │   │
│  │  Hot reload #3  →  new PrismaClient()  →  Connection 3  │   │
│  │  ...                                                     │   │
│  │  ERROR: Too many database connections!                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ✅ With singleton:                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Hot reload #1  →  Create PrismaClient  →  Connection 1 │   │
│  │  Hot reload #2  →  Reuse existing       →  Connection 1 │   │
│  │  Hot reload #3  →  Reuse existing       →  Connection 1 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Create the Client

```typescript
// packages/database/src/client.ts
import { PrismaClient } from "@prisma/client";

// Store instance in globalThis to survive hot reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// In development, save to global to reuse
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export { PrismaClient };
```

### Create the Main Export

```typescript
// packages/database/src/index.ts

// Export the database client
export { db, PrismaClient } from "./client";

// Re-export all Prisma types (User, Post, Role, etc.)
export * from "@prisma/client";
```

---

## Exporting to Apps

### Step 1: Add Dependency to Apps

```json
// apps/main/package.json
{
  "dependencies": {
    "@repo/database": "workspace:*",
    "@prisma/client": "6.14.0"  // ⚠️ IMPORTANT: Must match database package version
  }
}
```

```json
// apps/admin/package.json
{
  "dependencies": {
    "@repo/database": "workspace:*",
    "@prisma/client": "6.14.0"  // ⚠️ IMPORTANT: Must match database package version
  }
}
```

### ⚠️ Why Apps Need @prisma/client Directly?

```
┌─────────────────────────────────────────────────────────────────┐
│             WHY @PRISMA/CLIENT IN APPS?                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Next.js marks @prisma/client as "external" (not bundled).     │
│  This means it must be resolvable from the app's directory.    │
│                                                                 │
│  Without it in apps:                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Build looks for: apps/main/node_modules/@prisma/client │   │
│  │  ❌ Not found!                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  With it in apps:                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Build looks for: apps/main/node_modules/@prisma/client │   │
│  │  ✅ Found! (pnpm symlinks it)                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 2: Use in App

```typescript
// apps/main/app/api/users/route.ts
import { db, User } from "@repo/database";

export async function GET() {
  const users: User[] = await db.user.findMany();
  return Response.json(users);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  const user = await db.user.create({
    data: {
      email: body.email,
      name: body.name,
    },
  });
  
  return Response.json(user);
}
```

```typescript
// apps/main/app/page.tsx
import { db, Post } from "@repo/database";

export default async function Home() {
  const posts: Post[] = await db.post.findMany({
    where: { published: true },
    include: { author: true },
  });

  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>By {post.author.name}</p>
        </article>
      ))}
    </div>
  );
}
```

---

## Turbo Configuration for Prisma

### The Problem

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUILD ORDER PROBLEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ❌ Without proper configuration:                               │
│                                                                 │
│  1. Turbo starts building apps/main                            │
│  2. apps/main imports from @repo/database                      │
│  3. @repo/database exports from @prisma/client                 │
│  4. @prisma/client hasn't been generated yet!                  │
│  5. ❌ BUILD FAILS                                              │
│                                                                 │
│  ✅ With proper configuration:                                  │
│                                                                 │
│  1. Turbo runs @repo/database#generate first                   │
│  2. Prisma client is generated                                 │
│  3. Then apps/main builds                                      │
│  4. ✅ BUILD SUCCEEDS                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Configure turbo.json

```json
// turbo.json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "tasks": {
    "generate": {
      "cache": false,
      "inputs": [
        "prisma/schema.prisma"
      ],
      "outputs": [
        "../../node_modules/.prisma/client/**"
      ]
    },
    "build": {
      "dependsOn": [
        "^generate",  // Run generate in dependencies first
        "^build"
      ],
      "env": [
        "DATABASE_URL",
        "DIRECT_URL"
      ],
      "inputs": [
        "$TURBO_DEFAULT$",
        ".env*"
      ],
      "outputs": [
        ".next/**",
        "!.next/cache/**"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Task Dependency Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BUILD TASK FLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

  turbo run build
        │
        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │  Step 1: Run ^generate (dependencies first)                    │
  │  ─────────────────────────────────────────                      │
  │  @repo/database#generate  →  prisma generate                   │
  │                           →  Creates .prisma/client            │
  └───────────────────────────────────┬─────────────────────────────┘
                                      │
                                      ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │  Step 2: Run ^build (dependencies first)                       │
  │  ─────────────────────────────────────                          │
  │  No builds in packages (they're just source)                   │
  └───────────────────────────────────┬─────────────────────────────┘
                                      │
                                      ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │  Step 3: Build apps (in parallel)                              │
  │  ────────────────────────────────                               │
  │  apps/main#build   →  next build                               │
  │  apps/admin#build  →  next build                               │
  └─────────────────────────────────────────────────────────────────┘
```

---

## Production Build Issues & Solutions

### Issue 1: Prisma Schema Not Found

```
prisma:warn We could not find your Prisma schema in the default locations
```

**Cause:** When `@prisma/client` is installed at the monorepo root (hoisted by pnpm), its postinstall script runs from the root and can't find the schema in `packages/database/prisma/`.

**Solution:** Configure the schema location in root package.json:

```json
// package.json (root)
{
  "prisma": {
    "schema": "./packages/database/prisma/schema.prisma"
  },
  "scripts": {
    "postinstall": "prisma generate --schema=./packages/database/prisma/schema.prisma"
  },
  "devDependencies": {
    "prisma": "6.14.0"  // Must install prisma at root too
  }
}
```

### Visual Explanation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRISMA SCHEMA LOCATION ISSUE                         │
└─────────────────────────────────────────────────────────────────────────┘

  When pnpm install runs:
  
  ┌─────────────────────────────────────────────────────────────────┐
  │  Root Directory (where pnpm install runs)                       │
  │  ─────────────────────────────────────────                      │
  │                                                                 │
  │  Prisma looks for schema in:                                    │
  │  1. ./prisma/schema.prisma        ❌ Not found                  │
  │  2. ./schema.prisma               ❌ Not found                  │
  │                                                                 │
  │  But our schema is at:                                          │
  │  ./packages/database/prisma/schema.prisma                       │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘

  Solution: Tell Prisma where to look
  
  ┌─────────────────────────────────────────────────────────────────┐
  │  package.json (root)                                            │
  │  ──────────────────                                             │
  │                                                                 │
  │  {                                                              │
  │    "prisma": {                                                  │
  │      "schema": "./packages/database/prisma/schema.prisma"       │
  │    }                                                            │
  │  }                                                              │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

---

### Issue 2: Generate Task Not Found

```
x Could not find "main#generate" in root turbo.json or "generate" in package
```

**Cause:** Turbo's `^generate` runs for all dependencies, but only `@repo/database` has a `generate` script. Apps don't have this script.

**Solution:** Ensure the `generate` task is defined in turbo.json AND the database package has the script:

```json
// turbo.json
{
  "tasks": {
    "generate": {
      "cache": false,
      "inputs": ["prisma/schema.prisma"],
      "outputs": ["../../node_modules/.prisma/client/**"]
    }
  }
}
```

```json
// packages/database/package.json
{
  "scripts": {
    "generate": "prisma generate"  // Must exist!
  }
}
```

---

### Issue 3: Version Mismatch

```
Package @prisma/client can't be external
The package resolves to a different version when requested from 
the project directory (5.22.0) compared to the package requested
 from the importing module (6.19.1).
```

**Cause:** Different versions of `@prisma/client` in different packages

**Solution:** Ensure ALL packages use the SAME version:

```json
// packages/database/package.json
{
  "dependencies": {
    "@prisma/client": "6.14.0"
  }
}

// apps/main/package.json
{
  "dependencies": {
    "@prisma/client": "6.14.0"  // Same version!
  }
}

// apps/admin/package.json
{
  "dependencies": {
    "@prisma/client": "6.14.0"  // Same version!
  }
}
```

---

### Issue 4: @prisma/client Can't Be External

```
Package @prisma/client can't be external
The request @prisma/client matches serverExternalPackages
The request could not be resolved by Node.js from the project directory.
```

**Cause:** `@prisma/client` is only in `packages/database`, but Next.js needs it resolvable from apps.

**Solution:** Add `@prisma/client` to each app's dependencies:

```json
// apps/main/package.json
{
  "dependencies": {
    "@repo/database": "workspace:*",
    "@prisma/client": "6.14.0"  // Add this!
  }
}
```

---

## Vercel Deployment

### Configure Build Settings

In Vercel dashboard or `vercel.json`:

```json
// vercel.json (in apps/main)
{
  "buildCommand": "cd ../.. && pnpm turbo run build --filter=main"
}
```

Or set in Vercel Dashboard:
- **Build Command:** `cd ../.. && pnpm turbo run build --filter=main`
- **Root Directory:** `apps/main`

### Environment Variables

Add to Vercel:
- `DATABASE_URL` - Your PostgreSQL connection string
- `DIRECT_URL` - Direct connection (if using connection pooling)

---

## Common Errors & Solutions

### Quick Reference Table

| Error | Cause | Solution |
|-------|-------|----------|
| Schema not found | Schema in non-default location | Add `prisma.schema` to root package.json |
| Generate task not found | Task not defined | Add `generate` task to turbo.json |
| Version mismatch | Different @prisma/client versions | Use same version everywhere |
| Can't be external | Client not in app dependencies | Add @prisma/client to apps |
| Too many connections | Multiple Prisma instances | Use singleton pattern |

---

### Complete Root package.json for Production

```json
// package.json (root)
{
  "name": "turboeventeye",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "postinstall": "prisma generate --schema=./packages/database/prisma/schema.prisma"
  },
  "prisma": {
    "schema": "./packages/database/prisma/schema.prisma"
  },
  "devDependencies": {
    "prettier": "^3.7.4",
    "prisma": "6.14.0",
    "turbo": "^2.6.3",
    "typescript": "5.9.2"
  },
  "packageManager": "pnpm@9.0.0"
}
```

---

## Database Commands Reference

```bash
# Generate Prisma Client
pnpm --filter @repo/database generate

# Push schema to database (development)
pnpm --filter @repo/database db:push

# Create migration
pnpm --filter @repo/database db:migrate

# Deploy migrations (production)
pnpm --filter @repo/database db:migrate:deploy

# Open Prisma Studio
pnpm --filter @repo/database db:studio

# Seed database
pnpm --filter @repo/database db:seed
```

---

## Summary Flowchart

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRISMA IN TURBOREPO - COMPLETE FLOW                  │
└─────────────────────────────────────────────────────────────────────────┘

  1. INSTALL
  ──────────
  pnpm install
       │
       ├─── Installs all dependencies
       │
       └─── Runs postinstall script
                  │
                  └─── prisma generate --schema=./packages/database/prisma/schema.prisma
                             │
                             └─── Generates .prisma/client


  2. BUILD
  ────────
  pnpm build (turbo run build)
       │
       ├─── Step 1: @repo/database#generate
       │          │
       │          └─── prisma generate
       │
       ├─── Step 2: apps/main#build
       │          │
       │          └─── Imports from @repo/database ✅
       │
       └─── Step 3: apps/admin#build
                  │
                  └─── Imports from @repo/database ✅


  3. RUNTIME
  ──────────
  App starts
       │
       └─── import { db } from "@repo/database"
                  │
                  └─── Returns singleton PrismaClient
                             │
                             └─── Connected to PostgreSQL ✅
```

---

## Next Steps

- **[Part 4: Common Errors Reference](./04-common-errors-reference.md)** - Quick troubleshooting guide

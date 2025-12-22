# Part 1: Turborepo Setup & Understanding the Monorepo Architecture

## Table of Contents
- [Introduction](#introduction)
- [What is Turborepo?](#what-is-turborepo)
- [Installation](#installation)
- [Folder Structure](#folder-structure)
- [Understanding the Flow](#understanding-the-flow)
- [Key Configuration Files](#key-configuration-files)
- [Workspace Dependencies](#workspace-dependencies)
- [Common Errors & Solutions](#common-errors--solutions)

---

## Introduction

This documentation covers setting up a production-ready Turborepo monorepo with:
- **Multiple Next.js applications** (main, admin)
- **Shared UI package** with Tailwind CSS and shadcn/ui
- **Shared database package** with Prisma and PostgreSQL
- **Shared configurations** (ESLint, TypeScript)

---

## What is Turborepo?

Turborepo is a high-performance build system for JavaScript and TypeScript monorepos. It provides:

- **Incremental builds**: Only rebuilds what changed
- **Remote caching**: Share build cache across team/CI
- **Parallel execution**: Run tasks in parallel
- **Task pipelines**: Define task dependencies

### Why Monorepo?

```
┌─────────────────────────────────────────────────────────────────┐
│                        MONOREPO BENEFITS                        │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Single source of truth for all projects                    │
│  ✅ Share code between applications easily                     │
│  ✅ Consistent tooling and configurations                      │
│  ✅ Atomic changes across multiple packages                    │
│  ✅ Simplified dependency management                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites
- Node.js >= 18
- pnpm (recommended for monorepos)

### Step 1: Create Turborepo Project

```bash
# Using pnpm (recommended)
pnpm dlx create-turbo@latest

# Or using npx
npx create-turbo@latest
```

You'll be prompted for:
- Project name
- Package manager (choose pnpm)

### Step 2: Navigate to Project

```bash
cd your-project-name
```

### Step 3: Install Dependencies

```bash
pnpm install
```

---

## Folder Structure

After installation, your project structure looks like this:

```
turboeventeye/
├── apps/                          # 📱 Applications
│   ├── admin/                     # Admin Next.js app
│   │   ├── app/                   # App router pages
│   │   ├── public/                # Static assets
│   │   ├── package.json           # App-specific dependencies
│   │   ├── next.config.js         # Next.js configuration
│   │   ├── tsconfig.json          # TypeScript config (extends shared)
│   │   └── postcss.config.mjs     # PostCSS config
│   │
│   └── main/                      # Main Next.js app
│       ├── app/                   # App router pages
│       ├── public/                # Static assets
│       ├── package.json           # App-specific dependencies
│       └── ...
│
├── packages/                      # 📦 Shared Packages
│   ├── ui/                        # Shared UI components
│   │   ├── src/
│   │   │   ├── components/        # React components
│   │   │   ├── lib/               # Utilities (cn function)
│   │   │   └── styles/            # Global CSS
│   │   ├── package.json           # Package exports
│   │   └── tsconfig.json
│   │
│   ├── database/                  # Shared database (Prisma)
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Database schema
│   │   │   └── seed.ts            # Seed script
│   │   ├── src/
│   │   │   ├── index.ts           # Exports
│   │   │   └── client.ts          # Prisma client singleton
│   │   └── package.json
│   │
│   ├── eslint-config/             # Shared ESLint configs
│   │   ├── base.js
│   │   ├── next.js
│   │   └── package.json
│   │
│   └── typescript-config/         # Shared TypeScript configs
│       ├── base.json
│       ├── nextjs.json
│       └── package.json
│
├── package.json                   # Root package.json
├── pnpm-workspace.yaml            # Workspace configuration
├── pnpm-lock.yaml                 # Lock file
└── turbo.json                     # Turborepo configuration
```

### Visual Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              TURBOREPO                                   │
│                           (Build System)                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │       APPS        │           │     PACKAGES      │
        │  (Applications)   │           │  (Shared Code)    │
        └───────────────────┘           └───────────────────┘
                │                               │
        ┌───────┴───────┐           ┌───────────┼───────────┐
        │               │           │           │           │
        ▼               ▼           ▼           ▼           ▼
   ┌─────────┐    ┌─────────┐  ┌─────────┐ ┌─────────┐ ┌─────────┐
   │  main   │    │  admin  │  │   ui    │ │database │ │ configs │
   │ (3000)  │    │ (3001)  │  │(shadcn) │ │(prisma) │ │(eslint) │
   └─────────┘    └─────────┘  └─────────┘ └─────────┘ └─────────┘
        │               │           │           │
        └───────────────┴───────────┴───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │    SHARED IMPORTS     │
            │  @repo/ui             │
            │  @repo/database       │
            │  @repo/eslint-config  │
            └───────────────────────┘
```

---

## Understanding the Flow

### How Packages Are Connected

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEPENDENCY FLOW                             │
└─────────────────────────────────────────────────────────────────┘

  apps/main/package.json          packages/ui/package.json
  ┌─────────────────────┐         ┌─────────────────────┐
  │ dependencies:       │         │ exports:            │
  │   "@repo/ui":       │────────▶│   "./components/*"  │
  │     "workspace:*"   │         │   "./lib/utils"     │
  │   "@repo/database": │         │   "./styles/*"      │
  │     "workspace:*"   │         └─────────────────────┘
  └─────────────────────┘
           │
           │                      packages/database/package.json
           │                      ┌─────────────────────┐
           └─────────────────────▶│ exports:            │
                                  │   ".": "./src/..."  │
                                  │   "./client": ...   │
                                  └─────────────────────┘
```

### The `workspace:*` Protocol

In pnpm, `workspace:*` is a special protocol that tells pnpm to:
1. Look for the package in the workspace (not npm registry)
2. Link it locally instead of downloading
3. Always use the latest local version

```json
// apps/main/package.json
{
  "dependencies": {
    "@repo/ui": "workspace:*",       // ✅ Uses local package
    "@repo/database": "workspace:*"  // ✅ Uses local package
  }
}
```

### ⚠️ Common Error: Using `*` Instead of `workspace:*`

```
❌ WRONG - This tries to fetch from npm registry
{
  "dependencies": {
    "@repo/ui": "*"
  }
}

Error:
ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/@repo%2Fui: Not Found - 404
@repo/ui is not in the npm registry
```

```
✅ CORRECT - This uses the local workspace package
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

---

## Key Configuration Files

### 1. pnpm-workspace.yaml

Defines which folders are part of the workspace:

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"      # All folders in apps/
  - "packages/*"  # All folders in packages/
```

### 2. turbo.json

Configures Turborepo tasks and their dependencies:

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],     // Build dependencies first
      "outputs": [".next/**"]       // Cache these outputs
    },
    "dev": {
      "cache": false,               // Don't cache dev
      "persistent": true            // Keep running
    },
    "lint": {
      "dependsOn": ["^lint"]
    }
  }
}
```

### Understanding `dependsOn`

```
┌─────────────────────────────────────────────────────────────────┐
│  dependsOn: ["^build"]                                          │
│                                                                 │
│  The ^ means "dependencies first"                               │
│                                                                 │
│  Example: When building apps/main                               │
│                                                                 │
│  1. First builds @repo/ui (dependency)                          │
│  2. First builds @repo/database (dependency)                    │
│  3. Then builds apps/main                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Root package.json

```json
{
  "name": "turboeventeye",
  "private": true,
  "scripts": {
    "build": "turbo run build",     // Runs build in all packages
    "dev": "turbo run dev",         // Runs dev in all packages
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.6.3",
    "typescript": "5.9.2"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### 4. Package exports (packages/ui/package.json)

```json
{
  "name": "@repo/ui",
  "exports": {
    // Pattern: "./export-path": "./actual-file-path"
    "./components/ui/*": "./src/components/ui/*.tsx",
    "./lib/utils": "./src/lib/utils.ts",
    "./styles/globals.css": "./src/styles/globals.css"
  }
}
```

**How exports work:**

```
Import in app:                    Resolves to:
───────────────                   ────────────
@repo/ui/components/ui/button  →  packages/ui/src/components/ui/button.tsx
@repo/ui/lib/utils             →  packages/ui/src/lib/utils.ts
@repo/ui/styles/globals.css    →  packages/ui/src/styles/globals.css
```

### ⚠️ Common Error: Wrong Export Pattern

```json
// ❌ WRONG - Wildcard doesn't work like this
{
  "exports": {
    "./components/ui": "./src/components/ui/*.tsx"
  }
}

// ✅ CORRECT - Use /* for subpath patterns
{
  "exports": {
    "./components/ui/*": "./src/components/ui/*.tsx"
  }
}
```

---

## Workspace Dependencies

### How to Add a Shared Package to an App

```bash
# From the root of the monorepo
pnpm add @repo/ui --filter main --workspace

# Or manually add to package.json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

### How to Add an npm Package to a Specific App

```bash
# Add to specific app
pnpm add axios --filter main

# Add to specific package
pnpm add @radix-ui/react-slot --filter @repo/ui
```

### How to Add a Dev Dependency to Root

```bash
# Add to root
pnpm add -D prettier -w
```

---

## Common Errors & Solutions

### Error 1: Package Not Found in Registry

```
ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/@repo%2Fui: Not Found - 404
```

**Cause:** Using `"*"` instead of `"workspace:*"`

**Solution:**
```json
{
  "dependencies": {
    "@repo/ui": "workspace:*"  // Add "workspace:" prefix
  }
}
```

---

### Error 2: Module Not Found

```
Module not found: Can't resolve '@repo/ui/components/ui/button'
```

**Cause:** Wrong exports configuration in package.json

**Solution:** Check the exports field:
```json
{
  "exports": {
    "./components/ui/*": "./src/components/ui/*.tsx"
  }
}
```

---

### Error 3: Task Not Found in Turbo

```
x Could not find "main#generate" in root turbo.json
```

**Cause:** Referenced a task that doesn't exist

**Solution:** Define the task in turbo.json or ensure the package has the script:
```json
// turbo.json
{
  "tasks": {
    "generate": {
      "cache": false
    }
  }
}

// packages/database/package.json
{
  "scripts": {
    "generate": "prisma generate"
  }
}
```

---

## Running the Project

### Development Mode

```bash
# Start all apps in development
pnpm dev

# Start specific app
pnpm dev --filter main
pnpm dev --filter admin
```

### Build for Production

```bash
# Build all apps
pnpm build

# Build specific app
pnpm build --filter main
```

### Lint All Packages

```bash
pnpm lint
```

---

## Next Steps

- **[Part 2: Tailwind CSS + shadcn/ui Setup](./02-tailwind-shadcn-setup.md)** - Setting up shared styling
- **[Part 3: Prisma + PostgreSQL Setup](./03-prisma-database-setup.md)** - Database configuration
- **[Part 4: Common Errors Reference](./04-common-errors-reference.md)** - Quick troubleshooting guide

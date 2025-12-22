# Turborepo Monorepo Documentation

A comprehensive guide to setting up and maintaining a production-ready Turborepo monorepo with Next.js, Tailwind CSS, shadcn/ui, and Prisma.

---

## 📚 Documentation Index

| Part | Title | Description |
|------|-------|-------------|
| 1 | [Turborepo Setup](./01-turborepo-setup.md) | Installation, folder structure, and understanding the monorepo architecture |
| 2 | [Tailwind + shadcn/ui](./02-tailwind-shadcn-setup.md) | Setting up shared UI components with Tailwind and shadcn |
| 3 | [Prisma + PostgreSQL](./03-prisma-database-setup.md) | Database configuration, production issues, and fixes |
| 4 | [Common Errors Reference](./04-common-errors-reference.md) | Quick troubleshooting guide for all errors |

---

## 🏗️ Project Architecture

```
turboeventeye/
├── apps/
│   ├── main/           # Main Next.js application (port 3000)
│   └── admin/          # Admin Next.js application (port 3001)
│
├── packages/
│   ├── ui/             # Shared UI components (Tailwind + shadcn)
│   ├── database/       # Shared database (Prisma + PostgreSQL)
│   ├── eslint-config/  # Shared ESLint configurations
│   └── typescript-config/  # Shared TypeScript configurations
│
├── docs/               # This documentation
├── package.json        # Root package.json
├── pnpm-workspace.yaml # Workspace configuration
└── turbo.json          # Turborepo configuration
```

---

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development servers (all apps)
pnpm dev

# Build for production
pnpm build

# Lint all packages
pnpm lint
```

---

## 📦 Package Commands

### UI Package
```bash
# Add a new shadcn component
pnpm --filter @repo/ui dlx shadcn@latest add button
```

### Database Package
```bash
# Generate Prisma client
pnpm --filter @repo/database generate

# Push schema to database
pnpm --filter @repo/database db:push

# Create migration
pnpm --filter @repo/database db:migrate

# Open Prisma Studio
pnpm --filter @repo/database db:studio
```

---

## 🔧 Key Configuration Files

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Defines workspace packages |
| `turbo.json` | Task pipeline configuration |
| `packages/ui/package.json` | UI component exports |
| `packages/database/prisma/schema.prisma` | Database schema |

---

## 🐛 Common Issues

See [Part 4: Common Errors Reference](./04-common-errors-reference.md) for detailed solutions.

### Quick Fixes

| Issue | Solution |
|-------|----------|
| Package not found (404) | Change `"*"` to `"workspace:*"` |
| Prisma schema not found | Add `prisma.schema` to root package.json |
| Styles not applied | Import `@repo/ui/styles/globals.css` in layout |
| Version mismatch | Ensure same `@prisma/client` version everywhere |

---

## 📝 Contributing

When adding new packages or modifying configurations:

1. Update the relevant documentation
2. Test locally with `pnpm build`
3. Verify production build works

---

## 🔗 External Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

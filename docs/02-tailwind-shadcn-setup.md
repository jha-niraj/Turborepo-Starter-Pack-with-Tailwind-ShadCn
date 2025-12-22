# Part 2: Tailwind CSS + shadcn/ui Setup in Turborepo

## Table of Contents
- [Overview](#overview)
- [Architecture Decision](#architecture-decision)
- [Setting Up Tailwind in packages/ui](#setting-up-tailwind-in-packagesui)
- [Setting Up shadcn/ui](#setting-up-shadcnui)
- [Exporting Components to Apps](#exporting-components-to-apps)
- [Importing in Apps](#importing-in-apps)
- [Common Errors & Solutions](#common-errors--solutions)

---

## Overview

In a Turborepo monorepo, we want to:
1. **Centralize Tailwind CSS** in the UI package
2. **Centralize shadcn/ui components** in the UI package
3. **Export everything** to apps without duplicating setup

### Benefits of This Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                    CENTRALIZED UI PACKAGE                       │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Single source of truth for all components                  │
│  ✅ Consistent styling across all apps                         │
│  ✅ No duplicate Tailwind configuration                        │
│  ✅ Easy to maintain and update components                     │
│  ✅ Smaller bundle sizes (shared code)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Decision

### Where to Install What?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INSTALLATION LOCATIONS                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  packages/ui/                      │  apps/main/ & apps/admin/          │
│  ─────────────                     │  ─────────────────────────         │
│  ✅ tailwindcss                    │  ✅ tailwindcss (for JIT)          │
│  ✅ @tailwindcss/postcss           │  ✅ @tailwindcss/postcss           │
│  ✅ postcss                        │  ✅ postcss                        │
│  ✅ shadcn components              │  ❌ NO shadcn components           │
│  ✅ @radix-ui/* packages           │  ❌ NO @radix-ui packages          │
│  ✅ class-variance-authority       │  ❌ NO CVA                         │
│  ✅ clsx, tailwind-merge           │  ❌ NO utility libs                │
│  ✅ lucide-react (icons)           │  ❌ NO icons                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why Apps Also Need Tailwind?

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHY TAILWIND IN APPS?                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Even though components are in packages/ui, the apps need      │
│  Tailwind for:                                                  │
│                                                                 │
│  1. JIT compilation - Tailwind scans files and generates       │
│     only the CSS classes that are actually used                │
│                                                                 │
│  2. App-specific styling - You might use Tailwind classes      │
│     directly in your app pages/components                      │
│                                                                 │
│  3. PostCSS processing - Next.js needs PostCSS config to       │
│     process the CSS imports                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Setting Up Tailwind in packages/ui

### Step 1: Install Dependencies

```bash
# Navigate to packages/ui
cd packages/ui

# Install Tailwind and dependencies
pnpm add tailwindcss @tailwindcss/postcss postcss

# Install utility libraries for shadcn
pnpm add clsx tailwind-merge class-variance-authority
```

### Step 2: Create PostCSS Config

```javascript
// packages/ui/postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### Step 3: Create Global CSS

```css
/* packages/ui/src/styles/globals.css */
@import "tailwindcss";

/* You can add custom styles here */
@layer base {
  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    /* ... more CSS variables */
  }
}
```

### Step 4: Create Utility Functions

```typescript
// packages/ui/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Step 5: Configure Package Exports

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./components/ui/*": "./src/components/ui/*.tsx",
    "./lib/utils": "./src/lib/utils.ts",
    "./styles/globals.css": "./src/styles/globals.css",
    "./postcss.config": "./postcss.config.mjs"
  },
  "dependencies": {
    "@tailwindcss/postcss": "^4.1.18",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "postcss": "^8.5.6",
    "tailwind-merge": "^3.4.0",
    "tailwindcss": "^4.1.18"
  }
}
```

---

## Setting Up shadcn/ui

### Step 1: Initialize shadcn/ui

```bash
# From packages/ui directory
cd packages/ui

# Initialize shadcn
pnpm dlx shadcn@latest init
```

When prompted, configure:
- **Style**: Default or New York
- **Base color**: Slate, Gray, etc.
- **CSS variables**: Yes
- **Tailwind config**: (skip if using Tailwind v4)
- **Components location**: `src/components`
- **Utils location**: `src/lib/utils.ts`

### Step 2: Create components.json

```json
// packages/ui/components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "src/components",
    "utils": "src/lib/utils",
    "ui": "src/components/ui",
    "lib": "src/lib",
    "hooks": "src/hooks"
  },
  "iconLibrary": "lucide"
}
```

### Step 3: Install Components

```bash
# Add button component
pnpm dlx shadcn@latest add button

# Add more components as needed
pnpm dlx shadcn@latest add accordion
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add input
```

### Step 4: Fix Import Paths in Components

**⚠️ IMPORTANT:** shadcn generates components with relative imports that may not work in a monorepo. You need to fix them.

```typescript
// ❌ WRONG - Generated by shadcn (doesn't work in monorepo)
import { cn } from "src/lib/utils"

// ✅ CORRECT - Use the package export
import { cn } from "@repo/ui/lib/utils"
```

**Fix for button.tsx:**

```typescript
// packages/ui/src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

// ✅ Use the package export path
import { cn } from "@repo/ui/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground...",
        // ... more variants
      },
      size: {
        default: "h-9 px-4 py-2",
        // ... more sizes
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

---

## Exporting Components to Apps

### Package Exports Structure

```
packages/ui/
├── src/
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx      → Export: @repo/ui/components/ui/button
│   │       ├── accordion.tsx   → Export: @repo/ui/components/ui/accordion
│   │       └── card.tsx        → Export: @repo/ui/components/ui/card
│   ├── lib/
│   │   └── utils.ts            → Export: @repo/ui/lib/utils
│   └── styles/
│       └── globals.css         → Export: @repo/ui/styles/globals.css
└── package.json                 (exports defined here)
```

### Exports Configuration

```json
// packages/ui/package.json
{
  "exports": {
    // Wildcard export for all UI components
    "./components/ui/*": "./src/components/ui/*.tsx",
    
    // Single file exports
    "./lib/utils": "./src/lib/utils.ts",
    "./styles/globals.css": "./src/styles/globals.css"
  }
}
```

### How Exports Work

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPORT PATH MAPPING                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Import Statement              Resolves To                      │
│  ────────────────              ──────────                       │
│                                                                 │
│  @repo/ui/components/ui/button                                  │
│           ↓                                                     │
│  packages/ui/src/components/ui/button.tsx                       │
│                                                                 │
│  @repo/ui/lib/utils                                             │
│           ↓                                                     │
│  packages/ui/src/lib/utils.ts                                   │
│                                                                 │
│  @repo/ui/styles/globals.css                                    │
│           ↓                                                     │
│  packages/ui/src/styles/globals.css                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Importing in Apps

### Step 1: Add Dependency

```json
// apps/main/package.json
{
  "dependencies": {
    "@repo/ui": "workspace:*",
    "@tailwindcss/postcss": "^4.1.18",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.18"
  }
}
```

### Step 2: Configure PostCSS

```javascript
// apps/main/postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### Step 3: Import Global CSS in Layout

```tsx
// apps/main/app/layout.tsx
import type { Metadata } from "next";

// Import shared global CSS from UI package
import "@repo/ui/styles/globals.css";

export const metadata: Metadata = {
  title: "My App",
  description: "Built with Turborepo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### Step 4: Use Components in Pages

```tsx
// apps/main/app/page.tsx
import { Button } from "@repo/ui/components/ui/button";

export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome</h1>
      
      {/* Using shared Button component */}
      <Button>Click Me</Button>
      
      <Button variant="destructive">Delete</Button>
      
      <Button variant="outline" size="lg">
        Large Outline
      </Button>
    </div>
  );
}
```

---

## Common Errors & Solutions

### Error 1: Module Not Found - Button

```
Module not found: Can't resolve '@repo/ui/components/ui/button'
```

**Cause:** Wrong exports configuration in package.json

**❌ Wrong:**
```json
{
  "exports": {
    "./components/ui": "./src/components/ui/*.tsx"
  }
}
```

**✅ Correct:**
```json
{
  "exports": {
    "./components/ui/*": "./src/components/ui/*.tsx"
  }
}
```

**Explanation:** The `*` in `./components/ui/*` is a subpath pattern that captures the imported name (like `button`) and substitutes it in the target path.

---

### Error 2: Module Not Found - globals.css

```
Module not found: Can't resolve '@repo/ui/styles/globals.css'
```

**Cause:** Export path doesn't match import path

**Check your exports:**
```json
// If importing as: @repo/ui/styles/globals.css
{
  "exports": {
    "./styles/globals.css": "./src/styles/globals.css"  // ✅ Path must match
  }
}
```

---

### Error 3: cn Function Not Found

```
Module not found: Can't resolve 'src/lib/utils'
```

**Cause:** shadcn generates components with relative imports that don't work in monorepo

**Location:** Inside component files (button.tsx, accordion.tsx, etc.)

**❌ Wrong (generated by shadcn):**
```typescript
import { cn } from "src/lib/utils"
```

**✅ Correct (use package export):**
```typescript
import { cn } from "@repo/ui/lib/utils"
```

**Fix all components:**
```bash
# Find and replace in all component files
# Change: import { cn } from "src/lib/utils"
# To:     import { cn } from "@repo/ui/lib/utils"
```

---

### Error 4: Tailwind Classes Not Applied

**Symptoms:** Components render but without styling

**Cause 1:** Global CSS not imported

```tsx
// ❌ Missing import in layout.tsx
export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}

// ✅ Add the import
import "@repo/ui/styles/globals.css";

export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}
```

**Cause 2:** Missing PostCSS configuration

```javascript
// apps/main/postcss.config.mjs must exist
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**Cause 3:** Tailwind not scanning the right files

For Tailwind v4, ensure it scans the packages:
```css
/* In your CSS file, Tailwind v4 auto-detects */
@import "tailwindcss";
```

For Tailwind v3, add content paths:
```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",  // Include UI package
  ],
};
```

---

### Error 5: Dependency Not Found in Workspace

```
ERR_PNPM_FETCH_404  @repo/ui: Not Found - 404
```

**Cause:** Using `"*"` instead of `"workspace:*"`

**❌ Wrong:**
```json
{
  "dependencies": {
    "@repo/ui": "*"
  }
}
```

**✅ Correct:**
```json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

---

## Complete File Structure

After setup, your packages/ui should look like:

```
packages/ui/
├── components.json              # shadcn configuration
├── eslint.config.mjs
├── package.json                 # Dependencies and exports
├── postcss.config.mjs           # PostCSS configuration
├── tsconfig.json
└── src/
    ├── components/
    │   └── ui/
    │       ├── accordion.tsx    # shadcn accordion
    │       ├── button.tsx       # shadcn button
    │       ├── card.tsx         # shadcn card
    │       └── ...              # more components
    ├── lib/
    │   └── utils.ts             # cn() function
    └── styles/
        └── globals.css          # Tailwind + CSS variables
```

---

## Summary Flowchart

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TAILWIND + SHADCN FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────┐
  │    packages/ui      │
  │  ─────────────────  │
  │  1. Install deps    │
  │  2. Setup Tailwind  │
  │  3. Add shadcn      │
  │  4. Fix imports     │
  │  5. Export all      │
  └──────────┬──────────┘
             │
             │ exports via package.json
             │
             ▼
  ┌─────────────────────────────────────────────────────────┐
  │                                                         │
  │  ┌─────────────────┐           ┌─────────────────┐     │
  │  │   apps/main     │           │   apps/admin    │     │
  │  │  ─────────────  │           │  ─────────────  │     │
  │  │                 │           │                 │     │
  │  │  import from:   │           │  import from:   │     │
  │  │  @repo/ui/...   │           │  @repo/ui/...   │     │
  │  │                 │           │                 │     │
  │  │  ✅ Button      │           │  ✅ Button      │     │
  │  │  ✅ Card        │           │  ✅ Accordion   │     │
  │  │  ✅ globals.css │           │  ✅ globals.css │     │
  │  │                 │           │                 │     │
  │  └─────────────────┘           └─────────────────┘     │
  │                                                         │
  └─────────────────────────────────────────────────────────┘
```

---

## Next Steps

- **[Part 3: Prisma + PostgreSQL Setup](./03-prisma-database-setup.md)** - Database configuration and production fixes
- **[Part 4: Common Errors Reference](./04-common-errors-reference.md)** - Quick troubleshooting guide

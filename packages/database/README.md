# @repo/database

This package contains the shared database configuration using Prisma with PostgreSQL.

## Setup

1. Create a `.env` file in this package (or at the monorepo root) with your database connection string:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
```

2. Generate the Prisma client:

```bash
pnpm --filter @repo/database db:generate
```

3. Push the schema to your database (for development):

```bash
pnpm --filter @repo/database db:push
```

Or create a migration:

```bash
pnpm --filter @repo/database db:migrate
```

4. Seed the database (optional):

```bash
pnpm --filter @repo/database db:seed
```

5. Open Prisma Studio to view your data:

```bash
pnpm --filter @repo/database db:studio
```

## Usage in Apps

Import the database client in your apps:

```typescript
import { db } from "@repo/database";

// Example: Get all users
const users = await db.user.findMany();

// Example: Create a new post
const post = await db.post.create({
  data: {
    title: "My Post",
    content: "Hello World",
    authorId: userId,
  },
});
```

You can also import Prisma types:

```typescript
import { db, User, Post, Role } from "@repo/database";
```

## Schema

The current schema includes:

- **User**: Basic user model with email, name, role
- **Session**: User sessions for authentication
- **Post**: Sample content model linked to users

Modify the `prisma/schema.prisma` file to add your own models.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;

// Re-export types from Prisma Client
export * from "@prisma/client";

export const sanitizeFullTextSearch = (search: string) => {
    // remove unsupported characters for full text search
    return search.replace(/[*+\-()~@%<>!=?:]/g, "").trim();
};
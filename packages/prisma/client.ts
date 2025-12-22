// Re-export everything from Prisma Client
export * from "@prisma/client";

// Explicitly re-export the Role enum and other types
export { 
    Role, Prisma 
} from "@prisma/client";

export type { 
    User, Post 
} from "@prisma/client";
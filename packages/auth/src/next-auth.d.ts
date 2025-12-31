import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"
import type { Role } from "@repo/prisma/client"

// Use import() workaround for Turborepo Bundler module resolution
type _AuthOptions = import("next-auth").AuthOptions
export type AuthOptions = _AuthOptions

// Re-export Account and Profile types for callback typing
export type Account = import("next-auth/core/types").Account
export type Profile = import("next-auth/core/types").Profile

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            email: string
            name: string
            image: string | null
            role: "USER" | "ADMIN"
            emailVerified?: boolean
        } & DefaultSession["user"]
    }

    interface User extends DefaultUser {
        id: string
        email: string
        name: string
        image: string | null
        role: "USER" | "ADMIN"
        emailVerified?: boolean
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id: string
        email: string
        name: string
        image: string | null
        role: "USER" | "ADMIN"
        emailVerified?: boolean
    }
}
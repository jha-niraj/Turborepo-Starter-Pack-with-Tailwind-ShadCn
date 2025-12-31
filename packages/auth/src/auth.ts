import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@repo/prisma";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),

    providers: [
        // Google OAuth Provider
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_SECRET_ID || "",
            httpOptions: {
                timeout: 10000,
            },
        }),

        // Basic Credentials Provider - extend in your app
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // Apps should override this with their own authentication logic
                // This is just a minimal example
                try {
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email },
                    });

                    if (!user) {
                        return null;
                    }

                    // Return minimal user object - apps can extend this
                    return {
                        id: user.id,
                        email: user.email!,
                        name: user.name || user.email || "User",
                        image: user.image || null,
                        role: user.role || null
                    };
                } catch (error) {
                    console.error("Authorization error:", error);
                    return null;
                }
            },
        }),
    ],

    callbacks: {
        // JWT callback - apps can extend to add custom claims
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.image = token.image;
                token.role = token.role;
            }

            // Support session updates
            if (trigger === "update" && session) {
                return { ...token, ...session.user };
            }

            return token;
        },

        // Session callback - apps can extend to add custom session data
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.email = token.email;
                session.user.name = token.name;
                session.user.image = token.image;
                session.user.role = token.role;
            }
            return session;
        },

        // Sign in callback - apps can add custom logic
        async signIn({ user, account, profile }) {
            // Allow all sign ins by default
            // Apps can add restrictions or custom logic here
            return true;
        },

        // Redirect callback - apps can customize redirect behavior
        async redirect({ url, baseUrl }) {
            // Handle relative URLs
            if (url.startsWith("/")) {
                return `${baseUrl}${url}`;
            }

            // Allow same-origin redirects
            if (new URL(url).origin === baseUrl) {
                return url;
            }

            // Default redirect
            return baseUrl;
        },
    },

    pages: {
        signIn: "/signin",
        error: "/error",
    },

    session: {
        strategy: "jwt",
    },

    secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);

// Helper function for server-side auth check
export async function auth() {
    const { getServerSession } = await import("next-auth/next");
    return await getServerSession(authOptions);
}

// Export getServerSession for direct use
export { getServerSession } from "next-auth/next";
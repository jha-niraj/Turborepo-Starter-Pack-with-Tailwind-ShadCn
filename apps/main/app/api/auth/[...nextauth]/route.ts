import { NextAuth, authOptions } from "@repo/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
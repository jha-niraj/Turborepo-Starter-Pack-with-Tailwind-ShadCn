import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@repo/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
    try {
        const { email, accessCode } = await request.json()

        if (!email || !accessCode) {
            return NextResponse.json(
                { success: false, message: "Email and access code are required" },
                { status: 400 }
            )
        }

        // Find the invitation
        const invitation = await prisma.adminInvitation.findFirst({
            where: {
                email: email.toLowerCase(),
                code: accessCode.toUpperCase(),
                status: "PENDING"
            }
        })

        if (!invitation) {
            return NextResponse.json(
                { success: false, message: "Invalid access code or email" },
                { status: 401 }
            )
        }

        // Check if expired
        if (new Date() > invitation.expiresAt) {
            await prisma.adminInvitation.update({
                where: { id: invitation.id },
                data: { status: "EXPIRED" }
            })
            return NextResponse.json(
                { success: false, message: "Access code has expired" },
                { status: 401 }
            )
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (!user) {
            // Create user with the access code as temporary password
            const hashedPassword = await bcrypt.hash(accessCode, 12)
            user = await prisma.user.create({
                data: {
                    email: email.toLowerCase(),
                    name: invitation.name || email.split("@")[0],
                    hashedPassword: hashedPassword,
                    emailVerified: true,
                    role: "ADMIN"
                }
            })
        } else {
            // Update password to access code for this login
            const hashedPassword = await bcrypt.hash(accessCode, 12)
            await prisma.user.update({
                where: { id: user.id },
                data: { 
                    hashedPassword,
                    role: "ADMIN"
                }
            })
        }

        // Check if admin access already exists
        let adminAccess = await prisma.adminAccess.findUnique({
            where: { userId: user.id }
        })

        if (!adminAccess) {
            // Create admin access
            adminAccess = await prisma.adminAccess.create({
                data: {
                    userId: user.id,
                    adminRole: invitation.adminRole,
                    permissions: invitation.permissions || {},
                    status: "ACTIVE",
                    inviteCode: accessCode
                }
            })
        }

        // Update invitation status
        await prisma.adminInvitation.update({
            where: { id: invitation.id },
            data: {
                status: "USED",
                usedBy: user.id,
                usedAt: new Date()
            }
        })

        // Create audit log
        await prisma.adminAuditLog.create({
            data: {
                adminId: adminAccess.id,
                action: "LOGIN",
                module: "admin_management",
                resourceType: "AdminAccess",
                resourceId: adminAccess.id,
                description: `Admin ${email} logged in via access code`
            }
        })

        return NextResponse.json({
            success: true,
            message: "Access code verified successfully",
            needsPasswordSetup: true
        })

    } catch (error) {
        console.error("Verify access code error:", error)
        return NextResponse.json(
            { success: false, message: "An error occurred" },
            { status: 500 }
        )
    }
}
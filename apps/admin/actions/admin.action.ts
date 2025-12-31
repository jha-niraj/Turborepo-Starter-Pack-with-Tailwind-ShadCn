"use server"

import { prisma } from "@repo/prisma"
import { getServerSession, authOptions } from "@repo/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

// Types
interface CreateInvitationInput {
    email: string
    name?: string
    adminRole: "SUPER_ADMIN" | "CONTENT_ADMIN" | "FINANCE_ADMIN" | "COMMUNITY_ADMIN" | "MODULE_MANAGER" | "VIEWER"
    permissions?: Record<string, string[]>
}

interface AdminResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
}

// Generate a unique access code
function generateAccessCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed ambiguous chars
    let code = "ADMIN-"
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

// Check if current user is admin
export async function checkAdminAccess(): Promise<AdminResponse<{ isAdmin: boolean; adminAccess: any }>> {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        const adminAccess = await prisma.adminAccess.findUnique({
            where: { userId: session.user.id }
        })

        if (!adminAccess || adminAccess.status !== "ACTIVE") {
            return { success: false, error: "Not authorized" }
        }

        return { 
            success: true, 
            data: { 
                isAdmin: true, 
                adminAccess 
            } 
        }
    } catch (error) {
        console.error("Admin access check error:", error)
        return { success: false, error: "Failed to check admin access" }
    }
}

// Get current admin info
export async function getCurrentAdmin(): Promise<AdminResponse<any>> {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        const adminAccess = await prisma.adminAccess.findUnique({
            where: {
                userId: session.user.id 
            },
            select: {
                permissions: true
            }
        })

        if (!adminAccess) {
            return { success: false, error: "Not an admin" }
        }

        const user = await prisma.user.findUnique({
            where: { 
                id: session.user.id 
            },
            select: { 
                id: true, 
                name: true, 
                email: true, 
                image: true 
            }
        })

        return { 
            success: true, 
            data: { 
                ...adminAccess, 
                user: user 
            } 
        }
    } catch (error) {
        console.error("Get current admin error:", error)
        return { success: false, error: "Failed to get admin info" }
    }
}

// Get all admin users
export async function getAdminUsers(): Promise<AdminResponse<any[]>> {
    try {
        const { success, error } = await checkAdminAccess()
        if (!success) return { success: false, error }

        const admins = await prisma.adminAccess.findMany({
            include: {
                invitations: {
                    take: 5,
                    orderBy: { createdAt: "desc" }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        // Get user details for each admin
        const adminWithUsers = await Promise.all(
            admins.map(async (admin) => {
                const user = await prisma.user.findUnique({
                    where: { id: admin.userId },
                    select: { id: true, name: true, email: true, image: true }
                })
                return { ...admin, user }
            })
        )

        return { success: true, data: adminWithUsers }
    } catch (error) {
        console.error("Get admin users error:", error)
        return { success: false, error: "Failed to fetch admin users" }
    }
}

// Create admin invitation
export async function createAdminInvitation(input: CreateInvitationInput): Promise<AdminResponse<any>> {
    try {
        const accessCheck = await checkAdminAccess()
        if (!accessCheck.success) return { success: false, error: accessCheck.error }

        const adminAccess = accessCheck.data?.adminAccess
        
        // Only SUPER_ADMIN can create invitations
        if (adminAccess.adminRole !== "SUPER_ADMIN") {
            return { success: false, error: "Only super admins can create invitations" }
        }

        // Check if email already has admin access
        const existingUser = await prisma.user.findUnique({
            where: { email: input.email }
        })

        if (existingUser) {
            const existingAdmin = await prisma.adminAccess.findUnique({
                where: { userId: existingUser.id }
            })
            if (existingAdmin) {
                return { success: false, error: "User already has admin access" }
            }
        }

        // Check for existing pending invitation
        const existingInvite = await prisma.adminInvitation.findFirst({
            where: {
                email: input.email,
                status: "PENDING"
            }
        })

        if (existingInvite) {
            return { success: false, error: "Pending invitation already exists for this email" }
        }

        // Create invitation
        const invitation = await prisma.adminInvitation.create({
            data: {
                email: input.email,
                name: input.name,
                code: generateAccessCode(),
                adminRole: input.adminRole,
                permissions: input.permissions || {},
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                createdById: adminAccess.id
            }
        })

        // Log the action
        await prisma.adminAuditLog.create({
            data: {
                adminId: adminAccess.id,
                action: "CREATE",
                module: "admin_management",
                resourceType: "AdminInvitation",
                resourceId: invitation.id,
                description: `Created invitation for ${input.email} with role ${input.adminRole}`
            }
        })

        revalidatePath("/admins")
        revalidatePath("/admins/invitations")

        return { success: true, data: invitation }
    } catch (error) {
        console.error("Create invitation error:", error)
        return { success: false, error: "Failed to create invitation" }
    }
}

// Verify access code and create admin
export async function verifyAccessCode(email: string, accessCode: string): Promise<AdminResponse<any>> {
    try {
        // Find the invitation
        const invitation = await prisma.adminInvitation.findFirst({
            where: {
                email: email.toLowerCase(),
                code: accessCode.toUpperCase(),
                status: "PENDING"
            }
        })

        if (!invitation) {
            return { success: false, error: "Invalid access code" }
        }

        // Check if expired
        if (new Date() > invitation.expiresAt) {
            await prisma.adminInvitation.update({
                where: { id: invitation.id },
                data: { status: "EXPIRED" }
            })
            return { success: false, error: "Access code has expired" }
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (!user) {
            // Create user with temporary password (access code)
            const tempPassword = await bcrypt.hash(accessCode, 10)
            user = await prisma.user.create({
                data: {
                    email: email.toLowerCase(),
                    name: invitation.name || email.split("@")[0],
                    hashedPassword: tempPassword,
                    emailVerified: true,
                    role: "Admin"
                }
            })
        }

        // Check if admin access already exists
        let adminAccessRecord = await prisma.adminAccess.findUnique({
            where: { userId: user.id }
        })

        if (!adminAccessRecord) {
            // Create admin access
            adminAccessRecord = await prisma.adminAccess.create({
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
                adminId: adminAccessRecord.id,
                action: "LOGIN",
                module: "admin_management",
                resourceType: "AdminAccess",
                resourceId: adminAccessRecord.id,
                description: `New admin ${email} activated via access code`
            }
        })

        return { 
            success: true, 
            data: { 
                user, 
                adminAccess: adminAccessRecord,
                needsPasswordSetup: true 
            } 
        }
    } catch (error) {
        console.error("Verify access code error:", error)
        return { success: false, error: "Failed to verify access code" }
    }
}

// Get pending invitations
export async function getPendingInvitations(): Promise<AdminResponse<any[]>> {
    try {
        const { success, error } = await checkAdminAccess()
        if (!success) return { success: false, error }

        const invitations = await prisma.adminInvitation.findMany({
            where: {
                status: "PENDING"
            },
            orderBy: { createdAt: "desc" }
        })

        return { success: true, data: invitations }
    } catch (error) {
        console.error("Get invitations error:", error)
        return { success: false, error: "Failed to fetch invitations" }
    }
}

// Revoke invitation
export async function revokeInvitation(invitationId: string): Promise<AdminResponse> {
    try {
        const accessCheck = await checkAdminAccess()
        if (!accessCheck.success) return { success: false, error: accessCheck.error }

        const adminAccess = accessCheck.data?.adminAccess
        
        if (adminAccess.adminRole !== "SUPER_ADMIN") {
            return { success: false, error: "Only super admins can revoke invitations" }
        }

        await prisma.adminInvitation.update({
            where: { id: invitationId },
            data: { status: "REVOKED" }
        })

        await prisma.adminAuditLog.create({
            data: {
                adminId: adminAccess.id,
                action: "DELETE",
                module: "admin_management",
                resourceType: "AdminInvitation",
                resourceId: invitationId,
                description: "Revoked admin invitation"
            }
        })

        revalidatePath("/admins/invitations")

        return { success: true }
    } catch (error) {
        console.error("Revoke invitation error:", error)
        return { success: false, error: "Failed to revoke invitation" }
    }
}

// Update admin status
export async function updateAdminStatus(adminId: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED"): Promise<AdminResponse> {
    try {
        const accessCheck = await checkAdminAccess()
        if (!accessCheck.success) return { success: false, error: accessCheck.error }

        const adminAccess = accessCheck.data?.adminAccess
        
        if (adminAccess.adminRole !== "SUPER_ADMIN") {
            return { success: false, error: "Only super admins can update admin status" }
        }

        await prisma.adminAccess.update({
            where: { id: adminId },
            data: { status }
        })

        await prisma.adminAuditLog.create({
            data: {
                adminId: adminAccess.id,
                action: "UPDATE",
                module: "admin_management",
                resourceType: "AdminAccess",
                resourceId: adminId,
                description: `Updated admin status to ${status}`
            }
        })

        revalidatePath("/admins")

        return { success: true }
    } catch (error) {
        console.error("Update admin status error:", error)
        return { success: false, error: "Failed to update admin status" }
    }
}

// Update admin permissions
export async function updateAdminPermissions(adminId: string, permissions: Record<string, string[]>): Promise<AdminResponse> {
    try {
        const accessCheck = await checkAdminAccess()
        if (!accessCheck.success) return { success: false, error: accessCheck.error }

        const adminAccess = accessCheck.data?.adminAccess
        
        if (adminAccess.adminRole !== "SUPER_ADMIN") {
            return { success: false, error: "Only super admins can update permissions" }
        }

        const previousAdmin = await prisma.adminAccess.findUnique({
            where: { id: adminId }
        })

        await prisma.adminAccess.update({
            where: { id: adminId },
            data: { permissions }
        })

        await prisma.adminAuditLog.create({
            data: {
                adminId: adminAccess.id,
                action: "UPDATE",
                module: "admin_management",
                resourceType: "AdminAccess",
                resourceId: adminId,
                description: `Updated admin permissions`,
                changes: {
                    before: previousAdmin?.permissions,
                    after: permissions
                }
            }
        })

        revalidatePath("/admins")

        return { success: true }
    } catch (error) {
        console.error("Update admin permissions error:", error)
        return { success: false, error: "Failed to update permissions" }
    }
}

// Get dashboard stats
export async function getDashboardStats(): Promise<AdminResponse<any>> {
    try {
        const { success, error } = await checkAdminAccess()
        if (!success) return { success: false, error }

        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const today = new Date(now.setHours(0, 0, 0, 0))

        const [
            totalUsers,
            newUsersThisMonth,
            totalAdmins
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({
                where: { 
                    createdAt: { 
                        gte: thirtyDaysAgo 
                    } 
                }
            }),
            prisma.adminAccess.count({
                where: { 
                    status: "ACTIVE" 
                }
            })
        ])

        // Get active users today based on createdAt
        const activeToday = await prisma.user.count({
            where: { createdAt: { gte: today } }
        })

        // Calculate total credits (using xp balance from users)
        let totalCredits = 0
        try {
            const xpSum = await prisma.user.aggregate({
                _sum: { currentXp: true }
            })
            totalCredits = xpSum._sum.currentXp || 0
        } catch {
            // XP model might not exist or have different fields
        }

        return {
            success: true,
            data: {
                totalUsers,
                newUsersThisMonth,
                activeToday,
                totalAdmins,
                totalCredits,
                growthRate: totalUsers > 0 ? Math.round((newUsersThisMonth / totalUsers) * 100) : 0
            }
        }
    } catch (error) {
        console.error("Get dashboard stats error:", error)
        return { success: false, error: "Failed to fetch dashboard stats" }
    }
}

// Get audit logs
export async function getAuditLogs(page: number = 1, limit: number = 20): Promise<AdminResponse<any>> {
    try {
        const { success, error } = await checkAdminAccess()
        if (!success) return { success: false, error }

        const [logs, total] = await Promise.all([
            prisma.adminAuditLog.findMany({
                take: limit,
                skip: (page - 1) * limit,
                orderBy: { createdAt: "desc" },
                include: {
                    admin: {
                        select: { userId: true }
                    }
                }
            }),
            prisma.adminAuditLog.count()
        ])

        // Get user details for each log
        const logsWithUser = await Promise.all(
            logs.map(async (log) => {
                const user = await prisma.user.findUnique({
                    where: { id: log.admin.userId },
                    select: { name: true, email: true, image: true }
                })
                return { ...log, adminUser: user }
            })
        )

        return {
            success: true,
            data: {
                logs: logsWithUser,
                total,
                pages: Math.ceil(total / limit),
                currentPage: page
            }
        }
    } catch (error) {
        console.error("Get audit logs error:", error)
        return { success: false, error: "Failed to fetch audit logs" }
    }
}

// Set admin password (after initial access code login)
export async function setAdminPassword(newPassword: string): Promise<AdminResponse> {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12)

        await prisma.adminAccess.update({
            where: { userId: session.user.id },
            data: { 
                hashedPassword,
                accessCode: null,
                accessCodeExpiry: null
            }
        })

        // Also update user password
        await prisma.user.update({
            where: { id: session.user.id },
            data: { hashedPassword }
        })

        return { success: true }
    } catch (error) {
        console.error("Set admin password error:", error)
        return { success: false, error: "Failed to set password" }
    }
}

// Change password with current password verification
export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<AdminResponse> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, hashedPassword: true }
        })
        if (!user || !user.hashedPassword) {
            return { success: false, error: "User not found" }
        }

        const valid = await bcrypt.compare(currentPassword, user.hashedPassword)
        if (!valid) {
            return { success: false, error: "Current password is incorrect" }
        }

        const hashedNew = await bcrypt.hash(newPassword, 12)
        await prisma.user.update({ where: { id: user.id }, data: { hashedPassword: hashedNew } })

        const adminAccess = await prisma.adminAccess.findUnique({ where: { userId: user.id } })
        if (adminAccess) {
            await prisma.adminAuditLog.create({
                data: {
                    adminId: adminAccess.id,
                    action: "UPDATE",
                    module: "admin_management",
                    resourceType: "User",
                    resourceId: user.id,
                    description: "Changed password"
                }
            })
        }

        return { success: true }
    } catch (error) {
        console.error("Change password error:", error)
        return { success: false, error: "Failed to change password" }
    }
}
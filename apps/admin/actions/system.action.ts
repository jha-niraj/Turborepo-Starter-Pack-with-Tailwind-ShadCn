"use server"

import { prisma } from "@repo/prisma"
import { getServerSession } from "@repo/auth"
import { authOptions } from "@repo/auth"
import { revalidatePath } from "next/cache"
import { 
    hasPermission, type AdminPermissions, type AdminPermission, type PermissionLevel 
} from "@/lib/navigation"

interface Response<T = unknown> {
    success: boolean
    data?: T
    error?: string
}

// Helper to check admin access
async function checkAdminAccess(requiredModule: AdminPermission, requiredLevel: PermissionLevel) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return { authorized: false, error: "Not authenticated" }
    }

    const adminAccess = await prisma.adminAccess.findUnique({
        where: { userId: session.user.id },
        include: { user: true }
    })

    if (!adminAccess || !hasPermission(adminAccess.permissions as AdminPermissions, requiredModule, requiredLevel)) {
        return { authorized: false, error: "Not authorized" }
    }

    return { authorized: true, adminAccess }
}

// Get all system settings
export async function getSystemSettings(): Promise<Response> {
    try {
        const check = await checkAdminAccess('system', 'read')
        if (!check.authorized) {
            return { success: false, error: check.error }
        }

        const settings = await prisma.adminSystemSettings.findMany({
            orderBy: { updatedAt: 'desc' }
        })

        return { success: true, data: settings }
    } catch (error) {
        console.error("Get system settings error:", error)
        return { success: false, error: "Failed to fetch system settings" }
    }
}

// Get system setting by key
export async function getSystemSetting(key: string): Promise<Response> {
    try {
        const check = await checkAdminAccess('system', 'read')
        if (!check.authorized) {
            return { success: false, error: check.error }
        }

        const setting = await prisma.adminSystemSettings.findUnique({
            where: { key }
        })

        if (!setting) {
            return { success: false, error: "Setting not found" }
        }

        return { success: true, data: setting }
    } catch (error) {
        console.error("Get system setting error:", error)
        return { success: false, error: "Failed to fetch system setting" }
    }
}

// Update system setting
export async function updateSystemSetting(key: string, data: {
    value: any
    description?: string
}): Promise<Response> {
    try {
        const check = await checkAdminAccess('system', 'write')
        if (!check.authorized) {
            return { success: false, error: check.error }
        }

        const setting = await prisma.adminSystemSettings.upsert({
            where: { key },
            update: data,
            create: {
                key,
                ...data
            }
        })

        await prisma.adminAuditLog.create({
            data: {
                adminId: check.adminAccess!.id,
                action: "UPDATE",
                module: "system",
                resourceType: "SystemSettings",
                resourceId: key,
                description: `Updated system setting: ${key}`
            }
        })

        revalidatePath('/system')

        return { success: true, data: setting }
    } catch (error) {
        console.error("Update system setting error:", error)
        return { success: false, error: "Failed to update system setting" }
    }
}

// Get system health
export async function getSystemHealth(): Promise<Response> {
    try {
        const check = await checkAdminAccess('system', 'read')
        if (!check.authorized) {
            return { success: false, error: check.error }
        }

        // Check database connection
        const dbHealth = await prisma.$queryRaw`SELECT 1`

        // Get recent errors from audit log
        const recentErrors = await prisma.adminAuditLog.count({
            where: {
                action: 'ERROR',
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
            }
        })

        // Get active users using activity entries in last 24 hours
        const recentActivities = await prisma.activityEntry.count({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            }
        })

        return {
            success: true,
            data: {
                databaseStatus: 'healthy',
                recentErrors,
                recentActivitiesLast24h: recentActivities,
                timestamp: new Date()
            }
        }
    } catch (error) {
        console.error("Get system health error:", error)
        return {
            success: false,
            data: {
                databaseStatus: 'unhealthy',
                error: 'Failed to check system health'
            }
        }
    }
}

// Clear cache
export async function clearCache(cacheKeys?: string[]): Promise<Response> {
    try {
        const check = await checkAdminAccess('system', 'write')
        if (!check.authorized) {
            return { success: false, error: check.error }
        }

        // Revalidate paths
        if (cacheKeys && cacheKeys.length > 0) {
            cacheKeys.forEach(key => revalidatePath(key))
        } else {
            // Clear all common paths
            revalidatePath('/')
            revalidatePath('/dashboard')
            revalidatePath('/users')
            revalidatePath('/projects')
            revalidatePath('/communities')
            revalidatePath('/feedback')
            revalidatePath('/analytics')
        }

        await prisma.adminAuditLog.create({
            data: {
                adminId: check.adminAccess!.id,
                action: "UPDATE",
                module: "system",
                resourceType: "Cache",
                resourceId: "cache",
                description: `Cleared cache: ${cacheKeys?.join(', ') || 'all'}`
            }
        })

        return { success: true, data: { cleared: cacheKeys || ['all'] } }
    } catch (error) {
        console.error("Clear cache error:", error)
        return { success: false, error: "Failed to clear cache" }
    }
}

// Get admin notifications
export async function getAdminNotifications(params?: {
    page?: number
    limit?: number
    unreadOnly?: boolean
}): Promise<Response> {
    try {
        const check = await checkAdminAccess('system', 'read')
        if (!check.authorized) {
            return { success: false, error: check.error }
        }

        const page = params?.page || 1
        const limit = params?.limit || 20
        const skip = (page - 1) * limit

        const where: any = {
            adminId: check.adminAccess!.id
        }

        if (params?.unreadOnly) {
            where.isRead = false
        }

        const [notifications, total] = await Promise.all([
            prisma.adminNotification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.adminNotification.count({ where })
        ])

        return {
            success: true,
            data: {
                notifications,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        }
    } catch (error) {
        console.error("Get admin notifications error:", error)
        return { success: false, error: "Failed to fetch notifications" }
    }
}

// Mark notification as read
export async function markNotificationAsRead(id: string): Promise<Response> {
    try {
        const check = await checkAdminAccess('system', 'write')
        if (!check.authorized) {
            return { success: false, error: check.error }
        }

        await prisma.adminNotification.update({
            where: { id },
            data: { isRead: true }
        })

        return { success: true, data: null }
    } catch (error) {
        console.error("Mark notification as read error:", error)
        return { success: false, error: "Failed to mark notification as read" }
    }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<Response> {
    try {
        const check = await checkAdminAccess('system', 'write')
        if (!check.authorized) {
            return { success: false, error: check.error }
        }

        await prisma.adminNotification.updateMany({
            where: {
                adminId: check.adminAccess!.id,
                isRead: false
            },
            data: { 
                isRead: true 
            }
        })

        return { success: true, data: null }
    } catch (error) {
        console.error("Mark all notifications as read error:", error)
        return { success: false, error: "Failed to mark all notifications as read" }
    }
}
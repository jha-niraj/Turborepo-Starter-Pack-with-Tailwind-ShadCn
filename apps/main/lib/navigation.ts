import {
    LayoutDashboard, Users, CreditCard, FolderKanban, Mic, ClipboardCheck, Trophy, 
    MessageSquare, MessageCircle, Lightbulb, BarChart3, Settings, Shield, FileText, 
    type LucideIcon, Coins, Receipt, ArrowLeftRight, UserCheck, BookOpen, Flame, Zap, 
    Vote, Flag, Activity, Database, User, Lock
} from "lucide-react"

export interface NavigationItem {
    name: string
    path: string
    icon: LucideIcon
    children?: NavigationItem[]
    requiredPermission?: string
}

export interface NavigationConfig {
    primary: NavigationItem[]
    secondary: NavigationItem[]
}

// Admin navigation configuration
export const adminNavigation: NavigationConfig = {
    primary: [
        {
            name: "Dashboard",
            path: "dashboard",
            icon: LayoutDashboard,
        },
        {
            name: "Users",
            path: "users",
            icon: Users,
            requiredPermission: "users",
            children: [
                { name: "All Users", path: "users", icon: Users },
                { name: "Roles & Access", path: "users/roles", icon: Shield },
            ]
        },
        {
            name: "Credits",
            path: "credits",
            icon: CreditCard,
            requiredPermission: "credits",
            children: [
                { name: "Transactions", path: "credits/transactions", icon: Receipt },
                { name: "Requests", path: "credits/requests", icon: FileText },
                { name: "Transfers", path: "credits/transfers", icon: ArrowLeftRight },
                { name: "Payments", path: "credits/payments", icon: Coins },
            ]
        },
        {
            name: "Projects",
            path: "projects",
            icon: FolderKanban,
            requiredPermission: "projects",
            children: [
                { name: "All Projects", path: "projects", icon: FolderKanban },
                { name: "Project Ideas", path: "projects/ideas", icon: Lightbulb },
            ]
        },
        {
            name: "Mock Interviews",
            path: "mocks",
            icon: Mic,
            requiredPermission: "mocks",
            children: [
                { name: "Voice Mocks", path: "mocks", icon: Mic },
                { name: "Sessions", path: "mocks/sessions", icon: Activity },
            ]
        },
        {
            name: "Assessments",
            path: "assessments",
            icon: ClipboardCheck,
            requiredPermission: "assessments",
            children: [
                { name: "Topics", path: "assessments", icon: BookOpen },
                { name: "Questions", path: "assessments/questions", icon: FileText },
            ]
        },
        {
            name: "Challenges",
            path: "challenges",
            icon: Trophy,
            requiredPermission: "challenges",
            children: [
                { name: "Forge Tracks", path: "challenges/forge", icon: Flame },
                { name: "Crucible Events", path: "challenges/crucible", icon: Zap },
                { name: "Collective", path: "challenges/collective", icon: Vote },
            ]
        },
        {
            name: "Communities",
            path: "communities",
            icon: MessageSquare,
            requiredPermission: "communities",
            children: [
                { name: "All Communities", path: "communities", icon: MessageSquare },
                { name: "Reports", path: "communities/reports", icon: Flag },
            ]
        },
        {
            name: "Feedback",
            path: "feedback",
            icon: MessageCircle,
            requiredPermission: "feedback",
        },
        {
            name: "Analytics",
            path: "analytics",
            icon: BarChart3,
            requiredPermission: "analytics",
        },
    ],
    secondary: [
        {
            name: "Admin Management",
            path: "admins",
            icon: Shield,
            requiredPermission: "admin_management",
            children: [
                { name: "All Admins", path: "admins", icon: UserCheck },
                { name: "Access Control", path: "admins/access", icon: Lock },
                { name: "My Profile", path: "admins/profile", icon: User },
                { name: "Invitations", path: "admins/invitations", icon: FileText },
                { name: "Audit Logs", path: "admins/audit", icon: Activity },
            ]
        },
        {
            name: "System",
            path: "system",
            icon: Settings,
            requiredPermission: "system",
            children: [
                { name: "Settings", path: "system/settings", icon: Settings },
                { name: "Database", path: "system/database", icon: Database },
            ]
        },
    ]
}

// Permission checking
export type AdminPermission = 
    | "users"
    | "credits"
    | "projects"
    | "mocks"
    | "assessments"
    | "challenges"
    | "communities"
    | "feedback"
    | "analytics"
    | "admin_management"
    | "system"

export type PermissionLevel = "read" | "write" | "delete" | "full"

export interface AdminPermissions {
    [key: string]: PermissionLevel[]
}

// Default permissions for each role
export const defaultPermissionsByRole: Record<string, AdminPermissions> = {
    SUPER_ADMIN: {
        users: ["read", "write", "delete", "full"],
        credits: ["read", "write", "delete", "full"],
        projects: ["read", "write", "delete", "full"],
        mocks: ["read", "write", "delete", "full"],
        assessments: ["read", "write", "delete", "full"],
        challenges: ["read", "write", "delete", "full"],
        communities: ["read", "write", "delete", "full"],
        feedback: ["read", "write", "delete", "full"],
        analytics: ["read", "write", "full"],
        admin_management: ["read", "write", "delete", "full"],
        system: ["read", "write", "full"],
    },
    CONTENT_ADMIN: {
        users: ["read"],
        credits: ["read"],
        projects: ["read", "write", "delete"],
        mocks: ["read", "write", "delete"],
        assessments: ["read", "write", "delete"],
        challenges: ["read", "write", "delete"],
        communities: ["read"],
        feedback: ["read", "write"],
        analytics: ["read"],
    },
    FINANCE_ADMIN: {
        users: ["read"],
        credits: ["read", "write", "delete", "full"],
        projects: ["read"],
        mocks: ["read"],
        assessments: ["read"],
        challenges: ["read"],
        communities: ["read"],
        feedback: ["read"],
        analytics: ["read", "write"],
    },
    COMMUNITY_ADMIN: {
        users: ["read", "write"],
        credits: ["read"],
        projects: ["read"],
        mocks: ["read"],
        assessments: ["read"],
        challenges: ["read"],
        communities: ["read", "write", "delete", "full"],
        feedback: ["read", "write", "delete"],
        analytics: ["read"],
    },
    MODULE_MANAGER: {
        // Permissions set per invitation
    },
    VIEWER: {
        users: ["read"],
        credits: ["read"],
        projects: ["read"],
        mocks: ["read"],
        assessments: ["read"],
        challenges: ["read"],
        communities: ["read"],
        feedback: ["read"],
        analytics: ["read"],
    },
}

// Helper function to check if admin has permission
export function hasPermission(
    permissions: AdminPermissions,
    module: AdminPermission,
    level: PermissionLevel
): boolean {
    const modulePermissions = permissions[module]
    if (!modulePermissions) return false
    return modulePermissions.includes(level) || modulePermissions.includes("full")
}

// Filter navigation based on permissions
export function getNavigationForPermissions(permissions: AdminPermissions): NavigationConfig {
    const filterItems = (items: NavigationItem[]): NavigationItem[] => {
        return items.filter(item => {
            if (!item.requiredPermission) return true
            return hasPermission(permissions, item.requiredPermission as AdminPermission, "read")
        }).map(item => ({
            ...item,
            children: item.children ? filterItems(item.children) : undefined
        }))
    }

    return {
        primary: filterItems(adminNavigation.primary),
        secondary: filterItems(adminNavigation.secondary),
    }
}
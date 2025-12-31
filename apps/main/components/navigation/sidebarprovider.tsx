"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface SidebarContextType {
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
    isMobileOpen: boolean
    setIsMobileOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    // Load collapsed state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("admin-sidebar-collapsed")
        if (saved !== null) {
            setIsCollapsed(JSON.parse(saved))
        }
    }, [])

    // Save collapsed state to localStorage
    useEffect(() => {
        localStorage.setItem("admin-sidebar-collapsed", JSON.stringify(isCollapsed))
    }, [isCollapsed])

    return (
        <SidebarContext.Provider 
            value={{ 
                isCollapsed, 
                setIsCollapsed, 
                isMobileOpen, 
                setIsMobileOpen 
            }}
        >
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider")
    }
    return context
}
"use client"

import { DataProvider, useData } from "@/context/data-context"
import { AppSidebar } from "./app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <>
            <DataProvider>
                <Preloader />
                <SidebarProvider>
                    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden text-foreground bg-transparent">
                        <AppSidebar />
                        <main className="flex-1 w-full flex flex-col h-screen overflow-hidden bg-transparent">
                            <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 sticky top-0 bg-background/40 backdrop-blur-xl z-10 shrink-0">
                                <div className="flex items-center gap-2">
                                    <SidebarTrigger />
                                </div>
                            </header>
                            <div className="flex-1 bg-transparent overflow-auto pb-16">
                                {children}
                            </div>
                        </main>
                    </div>
                </SidebarProvider>
            </DataProvider>
        </>
    )
}

function Preloader() {
    const { isLoading } = useData()
    const [preloading, setPreloading] = useState(true)
    const [fadeOut, setFadeOut] = useState(false)

    useEffect(() => {
        if (!isLoading) {
            setFadeOut(true)
            const t = setTimeout(() => setPreloading(false), 300)
            return () => clearTimeout(t)
        }
    }, [isLoading])

    if (!preloading) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    )
}

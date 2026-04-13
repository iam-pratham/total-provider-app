"use client"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
    Users,
    Activity,
    ShieldPlus,
    BrainCircuit,
    LayoutDashboard,
    Zap,
    DollarSign
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"

const items = [
    { title: "Claims Overview", url: "/", icon: LayoutDashboard },
    { title: "Provider Performance", url: "/provider", icon: Users },
    { title: "CPT Trends", url: "/cpt", icon: Activity },
    { title: "Payer Portfolio", url: "/insurance", icon: ShieldPlus },
    { title: "Max Paid", url: "/max-paid", icon: Zap },
    { title: "CPT Pricing", url: "/cpt-pricing", icon: DollarSign },
    { title: "Status Breakdown", url: "/insights", icon: BrainCircuit },
]

export function AppSidebar() {
    const pathname = usePathname()

    return (
        <Sidebar className="border-r border-border/40 bg-background/50 backdrop-blur-md">
            <SidebarHeader className="p-7 pb-4">
                <Link href="/" className="flex flex-col group transition-opacity hover:opacity-80">
                    <h2 className="text-base font-bold tracking-tight text-foreground leading-none">
                        SHMB Analysis Tool
                    </h2>
                    <span className="text-[11px] text-muted-foreground/60 mt-1">
                        Precision Billing
                    </span>
                </Link>
            </SidebarHeader>

            <SidebarContent className="px-3 overflow-y-auto custom-scrollbar">
                <SidebarGroup className="mt-2">
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-0.5">
                            {items.map((item) => {
                                const isActive = pathname === item.url

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            className={`
                                                relative h-10 px-4 rounded-md transition-all duration-200 group
                                                ${isActive
                                                    ? "bg-foreground/[0.04] text-foreground font-medium"
                                                    : "hover:bg-foreground/[0.03] text-muted-foreground hover:text-foreground"
                                                }
                                            `}
                                        >
                                            <Link href={item.url} className="flex items-center w-full px-2">
                                                <span className="text-[14px] font-bold tracking-tight">{item.title}</span>
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="nav-pill"
                                                        className="absolute left-0 w-[2px] h-5 bg-primary rounded-full"
                                                        transition={{ type: "spring", stiffness: 400, damping: 40 }}
                                                    />
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <div className="mt-auto mx-4 mb-4 pt-4 border-t border-border/20 flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-foreground/60 tracking-tight">SHMB Analysis Tool</span>
                <span className="text-[10px] text-muted-foreground/30 tracking-wide">© 2026 · All rights reserved</span>
            </div>
        </Sidebar>
    )
}

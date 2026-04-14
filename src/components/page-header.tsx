"use client"

import React, { useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlobalSearchModal } from "@/components/global-search-modal"

export function PageHeader({ title }: { title: string }) {
    const [isSearchOpen, setIsSearchOpen] = useState(false)

    return (
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            <Button onClick={() => setIsSearchOpen(true)} variant="outline" className="gap-2 bg-background/50 backdrop-blur-md shrink-0">
                <Search className="h-4 w-4" /> Global Search
            </Button>
            <GlobalSearchModal isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
        </div>
    )
}

"use client"

import React, { useState, useMemo } from "react"
import { useData } from "@/context/data-context"
import { GlobalFilters } from "@/components/global-filters"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"
import { motion } from "framer-motion"

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 }, transitionEnd: { transform: "none", "-webkit-transform": "none" } }
}

const parseDateSafe = (dateStr: any) => {
    if (!dateStr) return null
    if (typeof dateStr === 'string' && dateStr.includes('-') && !dateStr.includes('T')) {
        return new Date(dateStr + 'T00:00:00')
    }
    return new Date(dateStr)
}

export default function RawDataPage() {
    const { filteredClaims, claims } = useData()
    const [page, setPage] = useState(1)
    const rowsPerPage = 50
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)

    const sortedClaims = useMemo(() => {
        const sortableItems = [...filteredClaims]
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof typeof a] ?? ""
                const bValue = b[sortConfig.key as keyof typeof b] ?? ""
                if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1
                if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1
                return 0
            })
        }
        return sortableItems
    }, [filteredClaims, sortConfig])

    const totalPages = Math.ceil(sortedClaims.length / rowsPerPage)
    const paginatedClaims = sortedClaims.slice((page - 1) * rowsPerPage, page * rowsPerPage)

    const handleSort = (key: string) => {
        let direction: "asc" | "desc" = "asc"
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc"
        setSortConfig({ key, direction })
        setPage(1)
    }

    if (claims.length === 0) {
        return <div className="p-6">Navigate to Upload page to load data.</div>
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Chiro / PT / OT - Raw Data</h1>
            <GlobalFilters />

            <motion.div variants={containerVariants} initial="hidden" animate="show">
                <motion.div variants={itemVariants}>
                    <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-sm">
                        <CardContent className="p-0">
                            <div className="rounded-xl border-none overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="border-b border-border/50">
                                            {["claimId", "serviceDate", "patientName", "insuranceCompany", "insuranceType", "payerId", "providerName", "doctorName", "cptCode", "claimSentDate", "billedAmt", "paidAmt", "claimStatus"].map((key) => (
                                                <TableHead key={key} className="cursor-pointer whitespace-nowrap text-xs hover:bg-muted/50 transition-colors" onClick={() => handleSort(key)}>
                                                    <div className="flex items-center gap-1">
                                                        {key.replace(/([A-Z])/g, " $1").trim().toUpperCase()}
                                                        <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                                                    </div>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedClaims.map((claim) => (
                                            <TableRow key={claim.id} className="hover:bg-muted/20 transition-colors border-b border-white/5">
                                                <TableCell className="font-mono text-xs whitespace-nowrap text-primary">{claim.claimId || claim.id.slice(0, 8)}</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs">
                                                    {(() => {
                                                        const d = parseDateSafe(claim.serviceDate)
                                                        return d ? format(d, "MM-dd-yyyy") : "N/A"
                                                    })()}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-xs font-medium">{claim.patientName || "N/A"}</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{claim.insuranceCompany || "N/A"}</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs">
                                                    <span className="px-2 py-1 rounded bg-secondary/20 text-secondary-foreground text-[10px] uppercase font-bold tracking-wider">{claim.insuranceType}</span>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{claim.payerId || "N/A"}</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs">{claim.providerName}</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{claim.doctorName}</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs">{claim.cptCode}</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                    {(() => {
                                                        const d = parseDateSafe(claim.claimSentDate)
                                                        return d ? format(d, "MM-dd-yyyy") : "N/A"
                                                    })()}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-xs text-right font-medium">${claim.billedAmt?.toFixed(2) || "0.00"}</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs text-right text-green-500 font-medium">${claim.paidAmt?.toFixed(2) || "0.00"}</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs font-semibold">
                                                    <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider ${claim.claimStatus?.toLowerCase() === "paid" || claim.claimStatus?.toLowerCase().includes("paid correctly") ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                                                        {claim.claimStatus}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-muted/10 rounded-b-xl">
                                <div className="text-sm text-muted-foreground">
                                    Showing <span className="font-medium text-foreground">{(page - 1) * rowsPerPage + 1}</span> to{" "}
                                    <span className="font-medium text-foreground">{Math.min(page * rowsPerPage, sortedClaims.length)}</span> of{" "}
                                    <span className="font-medium text-foreground">{sortedClaims.length}</span> entries
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium text-muted-foreground">Page <span className="text-foreground">{page}</span> of {totalPages}</span>
                                    <div className="flex items-center gap-1">
                                        <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    )
}

"use client"

import React, { useMemo } from "react"
import { useData } from "@/context/data-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { GlobalFilters } from "@/components/global-filters"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { Search, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { GlobalSearchButton } from "@/components/global-search-button"

const parseDateSafe = (dateStr: any) => {
    if (!dateStr) return new Date()
    if (typeof dateStr === 'string' && dateStr.includes('-') && !dateStr.includes('T')) {
        return new Date(dateStr + 'T00:00:00')
    }
    return new Date(dateStr)
}

// Removed Treemap Implementation as it was visually cluttered
const chartConfig = {
    total: {
        label: "Claims",
        color: "var(--color-primary)",
    },
} satisfies ChartConfig

// removed static pieConfig
const barConfig = {
    total: {
        label: "Total Claims",
        color: "var(--color-primary)",
    },
} satisfies ChartConfig

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 }, transitionEnd: { transform: "none", "-webkit-transform": "none" } }
}

export default function InsuranceAnalysisPage() {
    const { filteredClaims, claims, isLoading } = useData()
    const [selectedInsurance, setSelectedInsurance] = React.useState<string | null>(null)
    const [displayInsurance, setDisplayInsurance] = React.useState<string | null>(null)
    const [modalPage, setModalPage] = React.useState(1)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [isPending, setIsPending] = React.useState(false)
    const modalRowsPerPage = 50

    // Smooth loading effect for search
    React.useEffect(() => {
        if (searchTerm) {
            setIsPending(true)
            const timer = setTimeout(() => setIsPending(false), 300)
            return () => clearTimeout(timer)
        } else {
            setIsPending(false)
        }
    }, [searchTerm])

    // Synchronize display insurance but don't clear it immediately on close
    React.useEffect(() => {
        if (selectedInsurance) {
            setDisplayInsurance(selectedInsurance)
        }
    }, [selectedInsurance])

    const categoryStats = useMemo(() => {
        const map: Record<string, number> = {}
        filteredClaims.forEach(c => {
            const cat = String(c.insuranceType)
            map[cat] = (map[cat] || 0) + 1
        })
        return Object.keys(map).map(k => ({
            category: k,
            total: map[k]
        })).sort((a, b) => b.total - a.total)
    }, [filteredClaims])

    const companyStats = useMemo(() => {
        const map: Record<string, number> = {}
        filteredClaims.forEach(c => {
            const comp = String(c.insuranceCompany || c.insuranceType)
            map[comp] = (map[comp] || 0) + 1
        })
        return Object.keys(map).map(k => ({
            company: k,
            total: map[k]
        })).sort((a, b) => b.total - a.total)
    }, [filteredClaims])

    const treemapData = categoryStats.map((s, idx) => ({
        name: s.category,
        size: s.total,
        value: s.total,
        total: filteredClaims.length,
        fill: `var(--color-chart-${(idx % 5) + 1})`
    }))

    const activeClaimsForModal = useMemo(() => {
        const target = selectedInsurance || displayInsurance
        if (!target) return []
        
        let list = filteredClaims.filter(c => {
            const comp = String(c.insuranceCompany || c.insuranceType)
            return comp === target
        })

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            list = list.filter(c => {
                const patName = (c.patientName || "").toLowerCase();
                const insName = (c.insuranceCompany || "").toLowerCase();
                const docName = (c.doctorName || "").toLowerCase();
                const dos = format(parseDateSafe(c.serviceDate), "MM/dd/yyyy");
                return patName.includes(lower) || insName.includes(lower) || docName.includes(lower) || dos.includes(lower);
            });
        }
        return list;
    }, [filteredClaims, selectedInsurance, displayInsurance, searchTerm])

    const paginatedModalClaims = useMemo(() => {
        return activeClaimsForModal.slice((modalPage - 1) * modalRowsPerPage, modalPage * modalRowsPerPage)
    }, [activeClaimsForModal, modalPage])

    const modalTotalPages = Math.ceil(activeClaimsForModal.length / modalRowsPerPage)

    const dynamicConfig = {
        value: { label: "Claims" }
    } satisfies ChartConfig



    if (isLoading) return null;

    if (!isLoading && claims.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-2">
                <p className="text-lg font-bold text-foreground">No data found</p>
                <p className="text-sm text-muted-foreground">Make sure claims.xlsx is placed in the public folder.</p>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Chiro / PT / OT - Payer Portfolio</h1>
                <GlobalSearchButton />
            </div>
            <GlobalFilters />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid gap-6 md:grid-cols-2"
            >
                <motion.div variants={itemVariants}>
                    <Card className="flex flex-col">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Insurance Category Mix</CardTitle>
                                    <CardDescription>Distribution by insurance category</CardDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black">{filteredClaims.length.toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total Claims</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <ChartContainer config={barConfig} className="h-[350px] w-full">
                                <BarChart data={categoryStats} margin={{ top: 30, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.2} />
                                    <XAxis
                                        dataKey="category"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={10}
                                        style={{ fill: "var(--color-muted-foreground)", fontSize: "12px", fontWeight: 600 }}
                                    />
                                    <YAxis tickLine={false} axisLine={false} tickMargin={8} style={{ fill: "var(--color-muted-foreground)", fontSize: "11px" }} />
                                    <ChartTooltip cursor={{ fill: 'var(--color-primary)', opacity: 0.1 }} content={<ChartTooltipContent />} />
                                    <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={72}>
                                        {categoryStats.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={`var(--color-chart-${(index % 5) + 1})`}
                                            />
                                        ))}
                                        <LabelList
                                            dataKey="total"
                                            position="top"
                                            content={(props: any) => {
                                                const { x, y, width, value } = props;
                                                if (value == null) return null;
                                                const pct = ((value / filteredClaims.length) * 100 || 0).toFixed(1);
                                                // Place the text centered above the bar
                                                const cx = (x as number) + (width as number) / 2;
                                                const cy = (y as number) - 10;
                                                return (
                                                    <g>
                                                        <text x={cx} y={cy - 12} textAnchor="middle" fontSize={13}>
                                                            <tspan fill="#dc2626" fontWeight={700}>{(value as number).toLocaleString()}</tspan>
                                                        </text>
                                                        <text x={cx} y={cy + 2} textAnchor="middle" fontSize={11}>
                                                            <tspan fill="var(--color-muted-foreground)" fontWeight={500}>{`(${pct}%)`}</tspan>
                                                        </text>
                                                    </g>
                                                );
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Claims by Insurance Company</CardTitle>
                            <CardDescription>Total volume of claims per payer</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <ChartContainer config={barConfig} className="h-[350px] w-full">
                                <BarChart accessibilityLayer data={companyStats.slice(0, 10)} layout="vertical" margin={{ top: 20, right: 120, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.2} />
                                    <XAxis type="number" tickLine={false} axisLine={false} tickMargin={10} style={{ fill: "var(--color-muted-foreground)" }} />
                                    <YAxis
                                        type="category"
                                        dataKey="company"
                                        width={100}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => {
                                            const u = val.toUpperCase();
                                            if (u.includes("PROGRESSIVE")) return "Progressive";
                                            if (u.includes("NJ MANUFACTUR")) return "NJM";
                                            if (u.includes("STATE FARM")) return "State Farm";
                                            if (u.includes("HORIZON BCBS")) return "Horizon OOS";
                                            if (u.includes("PLYMOUTH ROCK")) return "Plymouth Rock";
                                            if (u.includes("GEICO")) return "Geico NJ";
                                            const formatted = val.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
                                            return formatted.length > 14 ? formatted.substring(0, 14) + "..." : formatted;
                                        }}
                                        style={{ fontSize: "11px", fill: "var(--color-muted-foreground)" }}
                                    />
                                    <ChartTooltip cursor={{ fill: 'var(--color-primary)', opacity: 0.1 }} content={<ChartTooltipContent />} />
                                    <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={40}>
                                        {companyStats.slice(0, 10).map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={`var(--color-chart-${(index % 5) + 1})`}
                                            />
                                        ))}
                                        <LabelList
                                            dataKey="total"
                                            position="right"
                                            content={(props: any) => {
                                                const { x, y, width, height, value } = props;
                                                if (value == null) return null;
                                                const pct = ((value / filteredClaims.length) * 100 || 0).toFixed(1);
                                                const rx = (x as number) + (width as number) + 10;
                                                const ry = (y as number) + (height as number) / 2 + 4;
                                                return (
                                                    <text x={rx} y={ry} fontSize={11}>
                                                        <tspan fill="#dc2626" fontWeight={700}>{(value as number).toLocaleString()}</tspan>
                                                        <tspan fill="var(--color-muted-foreground)" dx={8}>{`(${pct}%)`}</tspan>
                                                    </text>
                                                );
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Insurance Company Cards Grid */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-foreground">Claims by Carrier</h2>
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                >
                    {companyStats.map((stat, idx) => {
                        const colorClass = `text-[var(--color-chart-${(idx % 5) + 1})]`
                        
                        return (
                            <motion.div key={stat.company} variants={itemVariants}>
                                <Card 
                                    className="h-full cursor-pointer hover:bg-primary/[0.02] transition-colors border-primary/5 hover:border-primary/20 flex flex-col"
                                    onClick={() => setSelectedInsurance(stat.company)}
                                >
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className={`text-[10px] font-black uppercase tracking-widest line-clamp-1 ${colorClass}`}>
                                            {stat.company}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-baseline gap-2">
                                            <div className="text-3xl font-black text-foreground">
                                                {stat.total.toLocaleString()}
                                            </div>
                                            <div className="text-[10px] font-bold text-muted-foreground">
                                                {((stat.total / filteredClaims.length) * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Click to view details</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )
                    })}
                </motion.div>
            </div>

            {/* Claims Detail Modal */}
            <Dialog 
                open={!!selectedInsurance} 
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedInsurance(null)
                        setSearchTerm("")
                        setIsPending(false)
                        setTimeout(() => setModalPage(1), 300)
                    }
                }}
            >
                <DialogContent className="sm:max-w-[96vw] w-[96vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 pb-4 border-b border-border shrink-0 bg-background/50 backdrop-blur-md">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-lg uppercase tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis max-w-[400px]">
                                        {selectedInsurance || displayInsurance}
                                    </span>
                                    <span>Claims Detail</span>
                                    <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border">
                                        {activeClaimsForModal.length} RECORDS
                                    </span>
                                </DialogTitle>
                            </div>
                            <div className="relative w-full sm:w-72 sm:pr-10">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search patient, DOS, provider" 
                                    className="pl-9 h-10 w-full bg-background/50 border-border focus:border-border focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all font-medium text-sm outline-none"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setModalPage(1);
                                    }}
                                />
                                {isPending && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute right-14 top-1/2 -translate-y-1/2"
                                    >
                                        <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 bg-muted/10">
                        <div className="min-w-max w-full">
                            <Table className="relative w-full border-collapse">
                                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-md z-30 shadow-sm border-b border-border">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="w-[140px] py-4 pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Service Date</TableHead>
                                        <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Patient Name</TableHead>
                                        <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Insurance & Payer</TableHead>
                                        <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Attending Physician</TableHead>
                                        <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">CPT Codes</TableHead>
                                        <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Billed Amount</TableHead>
                                        <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Paid Amount</TableHead>
                                        <TableHead className="py-4 pr-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detailed Claim Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence mode="popLayout">
                                        {isPending ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-32 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                                                        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                                                        <p className="text-[10px] font-bold uppercase tracking-widest">Updating results...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedModalClaims.map((claim) => (
                                                <motion.tr 
                                                    key={claim.id}
                                                    initial={{ opacity: 0, y: 4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="hover:bg-primary/[0.03] transition-colors border-b border-border/50 group/row"
                                                >
                                                    <TableCell className="whitespace-nowrap text-xs font-mono pl-6 py-4">
                                                        {format(parseDateSafe(claim.serviceDate), "MM/dd/yyyy")}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap text-xs font-bold py-4">
                                                        {claim.patientName}
                                                    </TableCell>
                                                    <TableCell className="text-xs py-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-foreground line-clamp-1">{claim.insuranceCompany}</span>
                                                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">{claim.insuranceType}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs py-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-foreground line-clamp-1">{claim.doctorName?.split(' - ')[0] || "N/A"}</span>
                                                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                                                                {claim.doctorName?.includes(' - Chiro') ? 'Chiro' : 
                                                                 claim.doctorName?.includes(' - PT') ? 'PT' : 
                                                                 claim.doctorName?.includes(' - OT') ? 'OT' : 'N/A'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono text-muted-foreground py-4">
                                                        {claim.cptCode}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-bold py-4">
                                                        ${claim.billedAmt?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-black text-green-600 py-4">
                                                        ${claim.paidAmt?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="py-4 pr-6">
                                                        <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-1 rounded inline-block max-w-[280px] break-words uppercase leading-tight">
                                                            {claim.claimStatus}
                                                        </span>
                                                    </TableCell>
                                                </motion.tr>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="p-4 border-t border-border/50 flex items-center justify-between bg-background shrink-0">
                        <p className="text-xs text-muted-foreground font-medium">
                            Showing <span className="text-foreground">{(modalPage - 1) * modalRowsPerPage + 1}</span> to <span className="text-foreground">{Math.min(modalPage * modalRowsPerPage, activeClaimsForModal.length)}</span> of {activeClaimsForModal.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs font-bold"
                                onClick={() => setModalPage(p => Math.max(1, p - 1))}
                                disabled={modalPage === 1}
                            >
                                Previous
                            </Button>
                            <div className="flex items-center gap-1 mx-2">
                                <span className="text-xs font-bold">Page {modalPage}</span>
                                <span className="text-xs text-muted-foreground">of {modalTotalPages}</span>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs font-bold"
                                onClick={() => setModalPage(p => Math.min(modalTotalPages, p + 1))}
                                disabled={modalPage === modalTotalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

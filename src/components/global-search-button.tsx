"use client"

import React, { useMemo, useState, useEffect } from "react"
import { useData } from "@/context/data-context"
import { format } from "date-fns"
import { Search, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { motion, AnimatePresence } from "framer-motion"

const parseDateSafe = (dateStr: any) => {
    if (!dateStr) return new Date()
    if (typeof dateStr === 'string' && dateStr.includes('-') && !dateStr.includes('T')) {
        return new Date(dateStr + 'T00:00:00')
    }
    return new Date(dateStr)
}

export function GlobalSearchButton() {
    const { filteredClaims } = useData()
    const [open, setOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [isPending, setIsPending] = useState(false)
    const [modalPage, setModalPage] = useState(1)
    const modalRowsPerPage = 50
    const [sortConfig, setSortConfig] = useState<{
        key: 'serviceDate' | 'patientName' | 'insuranceCompany' | null;
        direction: 'asc' | 'desc' | null;
    }>({ key: null, direction: null });

    const handleSort = (key: 'serviceDate' | 'patientName' | 'insuranceCompany') => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                if (prev.direction === 'desc') {
                    return { key, direction: 'asc' };
                } else if (prev.direction === 'asc') {
                    return { key: null, direction: null };
                }
            }
            const defaultDir = key === 'serviceDate' ? 'desc' : 'asc';
            return { key, direction: defaultDir };
        });
        setModalPage(1);
    };

    useEffect(() => {
        if (searchTerm) {
            setIsPending(true)
            const timer = setTimeout(() => setIsPending(false), 300)
            return () => clearTimeout(timer)
        } else {
            setIsPending(false)
        }
    }, [searchTerm])

    const activeClaimsForModal = useMemo(() => {
        let list = filteredClaims;
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
        if (sortConfig.key && sortConfig.direction) {
            list = [...list].sort((a, b) => {
                if (sortConfig.key === 'serviceDate') {
                    const dateA = parseDateSafe(a.serviceDate).getTime();
                    const dateB = parseDateSafe(b.serviceDate).getTime();
                    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
                } else if (sortConfig.key === 'patientName') {
                    const valA = String(a.patientName || '').toLowerCase();
                    const valB = String(b.patientName || '').toLowerCase();
                    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                } else if (sortConfig.key === 'insuranceCompany') {
                    const valA = String(a.insuranceCompany || '').toLowerCase();
                    const valB = String(b.insuranceCompany || '').toLowerCase();
                    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }
                return 0;
            });
        }
        return list;
    }, [filteredClaims, searchTerm, sortConfig])

    const paginatedModalClaims = useMemo(() => {
        return activeClaimsForModal.slice((modalPage - 1) * modalRowsPerPage, modalPage * modalRowsPerPage)
    }, [activeClaimsForModal, modalPage])

    const modalTotalPages = Math.ceil(activeClaimsForModal.length / modalRowsPerPage)

    return (
        <>
            <Button onClick={() => setOpen(true)} variant="outline" className="gap-2 bg-background/50 backdrop-blur-md">
                <Search className="h-4 w-4" /> Global Search
            </Button>

            <Dialog 
                open={open} 
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setOpen(false)
                        setSearchTerm("")
                        setIsPending(false)
                        setSortConfig({ key: null, direction: null })
                        setTimeout(() => setModalPage(1), 300)
                    } else {
                        setOpen(true)
                    }
                }}
            >
                <DialogContent className="sm:max-w-[96vw] w-[96vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 pb-4 border-b border-border shrink-0 bg-background/50 backdrop-blur-md">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                                    <span>Global Claims Search</span>
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
                                        <TableHead 
                                            className="w-[140px] py-4 pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors"
                                            onClick={() => handleSort('serviceDate')}
                                        >
                                            <div className="flex items-center gap-1">
                                                <span>Service Date</span>
                                                {sortConfig.key === "serviceDate" && sortConfig.direction === "asc" && <ArrowUp className="h-3 w-3 text-primary" />}
                                                {sortConfig.key === "serviceDate" && sortConfig.direction === "desc" && <ArrowDown className="h-3 w-3 text-primary" />}
                                                {sortConfig.key !== "serviceDate" && <ArrowUpDown className="h-3 w-3 opacity-40" />}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors"
                                            onClick={() => handleSort('patientName')}
                                        >
                                            <div className="flex items-center gap-1">
                                                <span>Patient Name</span>
                                                {sortConfig.key === "patientName" && sortConfig.direction === "asc" && <ArrowUp className="h-3 w-3 text-primary" />}
                                                {sortConfig.key === "patientName" && sortConfig.direction === "desc" && <ArrowDown className="h-3 w-3 text-primary" />}
                                                {sortConfig.key !== "patientName" && <ArrowUpDown className="h-3 w-3 opacity-40" />}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors"
                                            onClick={() => handleSort('insuranceCompany')}
                                        >
                                            <div className="flex items-center gap-1">
                                                <span>Insurance & Payer</span>
                                                {sortConfig.key === "insuranceCompany" && sortConfig.direction === "asc" && <ArrowUp className="h-3 w-3 text-primary" />}
                                                {sortConfig.key === "insuranceCompany" && sortConfig.direction === "desc" && <ArrowDown className="h-3 w-3 text-primary" />}
                                                {sortConfig.key !== "insuranceCompany" && <ArrowUpDown className="h-3 w-3 opacity-40" />}
                                            </div>
                                        </TableHead>
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
        </>
    )
}

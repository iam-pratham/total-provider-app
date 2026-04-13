"use client"

import React, { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"
import { useData, Claim } from "@/context/data-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, CheckCircle2, AlertCircle, Wand2, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

function toTitleCase(str: string) {
    return str.toLowerCase().split(' ').map(function (word) {
        return (word.charAt(0).toUpperCase() + word.slice(1));
    }).join(' ');
}

export default function UploadPage() {
    const { claims, setClaims, setIsLoading } = useData()
    const router = useRouter()
    
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [paymentError, setPaymentError] = useState<string | null>(null)
    const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)

    const getSortedName = (name: unknown) => {
        if (!name) return "";
        return String(name).toLowerCase()
            // Ignore anything that isn't a strict alphabetical letter 
            // This strips out all numbers, parentheses, like (1040310)
            .replace(/[^a-z]/g, ' ')
            .split(/\s+/)
            .filter(p => p.length > 0)
            .sort()
            .join('');
    }

    const parseDateSafe = (raw: unknown) => {
        if (!raw) return null
        if (typeof raw === "number") {
            const d = new Date(Math.round((raw - 25569) * 86400 * 1000))
            return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        }

        if (typeof raw === "string") {
            const str = raw.trim();
            if (/^\d{6}$/.test(str)) {
                const m = parseInt(str.substring(0, 2), 10);
                const d = parseInt(str.substring(2, 4), 10);
                let y = parseInt(str.substring(4, 6), 10);
                y += (y < 50 ? 2000 : 1900);
                return new Date(y, m - 1, d);
            }
            // Handle standard MM/DD/YYYY or YYYY-MM-DD
            const parts = str.split(/[\/\-]/);
            if (parts.length === 3) {
                let p0 = parseInt(parts[0], 10);
                let p1 = parseInt(parts[1], 10);
                let p2 = parseInt(parts[2], 10);
                
                if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
                    // Check if format is YYYY-MM-DD
                    if (p0 > 1000) {
                        return new Date(p0, p1 - 1, p2);
                    } else {
                        // format is MM/DD/YYYY or MM/DD/YY
                        let y = p2;
                        if (parts[2].length === 2) {
                            y += (y < 50 ? 2000 : 1900);
                        }
                        return new Date(y, p0 - 1, p1);
                    }
                }
            }

            const native = new Date(str);
            if (!isNaN(native.getTime())) return native;
        }

        return null;
    }

    const getValRobust = (row: Record<string, unknown>, possibleKeys: string[]) => {
        for (const pk of possibleKeys) {
            const exactKey = Object.keys(row).find(k => k.toLowerCase().trim() === pk.toLowerCase().trim());
            if (exactKey && row[exactKey] !== undefined && String(row[exactKey]).trim() !== "") {
                return row[exactKey];
            }
        }
        for (const pk of possibleKeys) {
            const incKey = Object.keys(row).find(k => k.toLowerCase().includes(pk.toLowerCase()));
            if (incKey && row[incKey] !== undefined && String(row[incKey]).trim() !== "") {
                return row[incKey];
            }
        }
        return "";
    }

    const processClaimsWorkbook = (workbook: XLSX.WorkBook) => {
        const groupedClaimsMap = new Map<string, Claim>()

        workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName]
            const json = XLSX.utils.sheet_to_json(worksheet, {
                defval: "",
                raw: false
            }) as Record<string, unknown>[]

            json.forEach((row, index) => {
                const claimId = String(getValRobust(row, ["claim id", "claim #", "claim number"]))
                const providerName = toTitleCase(String(getValRobust(row, ["service location", "location", "service provider", "provider"])).split(',')[0].trim())
                const doctorName = toTitleCase(String(getValRobust(row, ["attending physician", "attending", "doctor", "physician"])).split(',')[0].trim())
                const insuranceCompany = String(getValRobust(row, ["insurance company", "company", "insurance name"]))
                const insuranceType = String(getValRobust(row, ["insurance category", "category", "insurance type", "payer", "plan"]))
                const cptCode = String(getValRobust(row, ["cpt codes", "cpt code", "cpt", "procedure", "hcpcs"]))
                const serviceDateRaw = getValRobust(row, ["dos", "date of service", "service date"])
                const claimSentDateRaw = getValRobust(row, ["claim date", "claim sent date", "claim sent", "sent date", "billed date"])
                const billedAmtRaw = getValRobust(row, ["billed amount", "billed amt", "billed", "charge", "charges"])
                const claimStatus = getValRobust(row, ["status", "claim status", "report", "deductible", "payment status"])
                const arbFlagRaw = getValRobust(row, ["arb", "arbitration"])

                if (!providerName && !doctorName && !cptCode && !claimId && !insuranceCompany) return

                const serviceDate = parseDateSafe(serviceDateRaw) || new Date()
                const claimSentDate = parseDateSafe(claimSentDateRaw)

                let isDeni = false
                let foundPaid = false
                let foundDeductible = false
                let foundLop = false
                let foundPending = false
                let foundMaxLimit = false
                const arbFlagStr = String(arbFlagRaw || "").toLowerCase()
                let isArb = arbFlagStr === "yes" || arbFlagStr === "true" || arbFlagRaw === 1

                let stdStatus = String(claimStatus || "Unknown").trim()
                const lowerStatus = stdStatus.toLowerCase();

                if (stdStatus === "Unknown" || stdStatus === "") {
                    let heuristicStatus = ""
                    for (const val of Object.values(row)) {
                        const strVal = String(val).toLowerCase()
                        if (strVal.includes("deni")) isDeni = true
                        if (strVal.includes("paid with patient") || strVal.includes("paid correctly") || strVal.includes("paid with 50%")) { foundPaid = true }
                        if (strVal.includes("towards deductible") || strVal.includes("towards ded") || strVal.includes("self pay") || strVal.includes("self-pay") || strVal.includes("selfpay") || strVal.includes("patient responsibility")) foundDeductible = true
                        if (strVal === "lop" || strVal.includes("lop ") || strVal.includes(" lop")) foundLop = true
                        if (strVal.includes("under arbitration") || strVal.includes("arb")) isArb = true
                        if (strVal.includes("in process") || strVal.includes("pending")) foundPending = true
                        if (strVal.includes("maximum limit") || strVal.includes("reached maximum limit") || strVal.includes("not covered under patient plan") || strVal.includes("not covered")) foundMaxLimit = true
                    }

                    if (isDeni) heuristicStatus = "Denied"
                    else if (foundPaid) heuristicStatus = "Paid Correctly"
                    else if (foundMaxLimit) heuristicStatus = "Reached Maximum Limit"
                    else if (foundDeductible) heuristicStatus = "Towards Deductible"
                    else if (isArb) heuristicStatus = "Under Arbitration"
                    else if (foundLop) heuristicStatus = "LOP"
                    else if (foundPending) heuristicStatus = "In Process"

                    if (heuristicStatus) stdStatus = heuristicStatus
                } else {
                    if (lowerStatus.includes("denied") || lowerStatus.includes("deni")) isDeni = true;
                    if (lowerStatus.includes("arbitration")) isArb = true;
                }

                const uniqueId = claimId && !claimId.startsWith("CLM-UNKNOWN") ? claimId : `${sheetName}-${index}`
                const billedAmt = parseFloat(String(billedAmtRaw).replace(/[^0-9.-]/g, '')) || 0
                const paidAmt = 0 

                // Build granular CPT details
                const rowCpts = String(cptCode || "N/A").split(',').map(c => c.trim()).filter(c => c && c !== "N/A")
                if (rowCpts.length === 0) rowCpts.push("Unknown");
                const rowDetails = rowCpts.map(c => ({ cpt: c.toUpperCase(), billed: billedAmt / rowCpts.length, paid: 0 }))

                if (groupedClaimsMap.has(uniqueId)) {
                    const existing = groupedClaimsMap.get(uniqueId)!
                    const existingCpts = existing.cptCode.split(',').map(c => c.trim()).filter(c => c && c !== "N/A")
                    const newCpts = cptCode.split(',').map(c => c.trim()).filter(c => c && c !== "N/A")
                    newCpts.forEach(c => { if (!existingCpts.includes(c)) existingCpts.push(c) })
                    existing.cptCode = existingCpts.join(", ") || "N/A"
                    existing.billedAmt = (existing.billedAmt || 0) + billedAmt
                    existing.paidAmt = (existing.paidAmt || 0) + paidAmt
                    
                    if (!existing.cptDetails) existing.cptDetails = [];
                    existing.cptDetails = [...existing.cptDetails, ...rowDetails];

                    const statusPriority = (s: string) => {
                        const low = s.toLowerCase()
                        if (low.includes('denied') || low.includes('deni')) return 10
                        if (low.includes('paid')) return 9
                        if (low.includes('maximum limit') || low.includes('not covered')) return 8
                        if (low.includes('deductible') || low.includes('dedcutible') || low.includes('self pay')) return 7
                        if (low.includes('arbitration') || low.includes('no oon') || low.includes('lop') || low.includes('benefit exhausted')) return 6
                        if (low.includes('in process') || low.includes('pending')) return 4
                        return 0
                    }

                    if (statusPriority(stdStatus) > statusPriority(existing.claimStatus)) {
                        existing.claimStatus = stdStatus
                        existing.paymentStatus = stdStatus
                    }
                    if (isArb) existing.arbFlag = true
                    if (isDeni) existing.denialIndicator = true
                } else {
                    groupedClaimsMap.set(uniqueId, {
                        id: `${sheetName}-${index}-${Math.random().toString(36).substring(2, 11)}`,
                        claimId: uniqueId,
                        providerName: providerName || "Unknown Provider",
                        doctorName: doctorName || "Unknown Doctor",
                        cptCode: cptCode || "N/A",
                        insuranceCompany: insuranceCompany || "Unknown Company",
                        insuranceType: insuranceType || "Unknown Insurance",
                        payerId: String(getValRobust(row, ["payer edi id", "payer edi", "payer id", "payer #", "payer number"])),
                        patientName: toTitleCase(String(getValRobust(row, ["patient name", "patient", "subscriber name", "subscriber"]) || "Unknown Patient")),
                        serviceDate,
                        claimSentDate,
                        billedAmt,
                        paidAmt,
                        cptDetails: [...rowDetails],
                        claimStatus: stdStatus,
                        paymentStatus: stdStatus,
                        arbFlag: isArb,
                        denialIndicator: isDeni,
                    })
                }
            })
        })

        const allClaims = Array.from(groupedClaimsMap.values())
        if (allClaims.length > 0) {
            setClaims(allClaims)
            setSuccess(`Successfully loaded ${allClaims.length} records. Now upload the Payment Report to calculate totals.`)
        } else {
            setError("No valid claim records found in the uploaded file.")
        }
    }

    const processPaymentWorkbook = (workbook: XLSX.WorkBook) => {
        if (claims.length === 0) {
            setPaymentError("Please upload the Claims Data first.")
            return
        }

        const updatedClaims = claims.map(c => ({ ...c }));
        let matchCount = 0;
        let diagnosticMisses: string[] = [];

        // PRE-COMPUTE claims map for O(1) lightning fast lookups
        const claimsLookup = new Map<string, number>();
        const partialLookup = new Map<string, number>();

        for (let i = 0; i < updatedClaims.length; i++) {
            const c = updatedClaims[i];
            if (!c.patientName || !c.serviceDate) continue;
            
            const cDosStr = format(new Date(c.serviceDate), 'yyyy-MM-dd');
            const cNameLower = getSortedName(c.patientName);
            const claimCpts = c.cptCode.toLowerCase().split(',').map(code => code.trim());
            
            partialLookup.set(`${cNameLower}|${cDosStr}`, i);

            for (const cpt of claimCpts) {
                if (!cpt) continue;
                const key = `${cNameLower}|${cDosStr}|${cpt}`;
                if (!claimsLookup.has(key)) {
                    claimsLookup.set(key, i);
                }
            }
        }

        workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName]
            const json = XLSX.utils.sheet_to_json(worksheet, {
                defval: "",
                raw: false
            }) as Record<string, unknown>[]

            json.forEach((row) => {
                const pNameRaw = getValRobust(row, ["patient name", "patient", "subscriber name", "subscriber"])
                const dosRaw = getValRobust(row, ["dos", "date of service", "service date"])
                const cptRaw = getValRobust(row, ["cpt code", "cpt", "procedure code", "procedure"])
                const totalRaw = getValRobust(row, ["grand total", "total payment", "paid", "payment", "total"])

                if (!pNameRaw || !dosRaw) return;

                const pNameLower = getSortedName(pNameRaw);
                const dosDate = parseDateSafe(dosRaw);
                const cptStr = String(cptRaw).trim().toLowerCase();
                const total = parseFloat(String(totalRaw).replace(/[^0-9.-]/g, '')) || 0;

                if (!dosDate) return;

                const dosStr = format(dosDate, 'yyyy-MM-dd');
                let matchIndex = -1;

                if (cptStr) {
                    const lookupKey = `${pNameLower}|${dosStr}|${cptStr}`;
                    const foundIdx = claimsLookup.get(lookupKey);
                    if (foundIdx !== undefined) {
                        matchIndex = foundIdx;
                    }
                }

                if (matchIndex === -1) {
                    const partialKey = `${pNameLower}|${dosStr}`;
                    const pIdx = partialLookup.get(partialKey);
                    if (pIdx !== undefined) {
                        matchIndex = pIdx;
                    } else if (diagnosticMisses.length < 3) {
                        diagnosticMisses.push(`Couldn't map Payment for Name: "${pNameRaw}", DOS: ${dosStr}`);
                    }
                }

                if (matchIndex !== -1) {
                    updatedClaims[matchIndex].paidAmt = (updatedClaims[matchIndex].paidAmt || 0) + total;
                    if (!updatedClaims[matchIndex].cptDetails) updatedClaims[matchIndex].cptDetails = [];
                    
                    // Route the payment dynamically to the matched CPT
                    const exactDetail = updatedClaims[matchIndex].cptDetails!.find(d => d.cpt.toLowerCase() === cptStr);
                    if (exactDetail) {
                        exactDetail.paid += total;
                    } else {
                        // Ad-hoc insertion if CPT mismatched but Patient/DOS matched perfectly
                        if (updatedClaims[matchIndex].cptDetails!.length > 0) {
                            if (cptStr && cptStr.length > 0) {
                                updatedClaims[matchIndex].cptDetails!.push({ cpt: cptStr.toUpperCase(), billed: 0, paid: total });
                            } else {
                                updatedClaims[matchIndex].cptDetails![0].paid += total;
                            }
                        } else {
                            updatedClaims[matchIndex].cptDetails!.push({ cpt: cptStr ? cptStr.toUpperCase() : "Unknown", billed: 0, paid: total });
                        }
                    }
                    
                    matchCount++;
                }
            })
        })

        setClaims(updatedClaims)

        if (matchCount === 0) {
            const sampleClaims = claims.slice(0, 3).map(c => `[${c.patientName} - ${c.serviceDate ? format(c.serviceDate, 'yyyy-MM-dd') : 'No Date'}]`);
            setPaymentError(`0 rows matched! 
Payment File asked for: ${diagnosticMisses.join(" | ")}. 
BUT Claims File currently holds: ${sampleClaims.join(" | ")}. Check if your files match!`)
        } else {
            setPaymentSuccess(`Successfully mapped payments from ${matchCount} rows to existing claims!`)
            setTimeout(() => {
                router.push("/")
            }, 1800)
        }
    }

    const loadDummyData = async () => {
        setIsLoading(true)
        setError(null)
        setSuccess(null)
        try {
            const res = await fetch('/dummy_claims.xlsx')
            if (!res.ok) throw new Error("Could not fetch dummy file.")
            const arrayBuffer = await res.arrayBuffer()
            const workbook = XLSX.read(arrayBuffer, { type: "array" })
            processClaimsWorkbook(workbook)
            // For dummy data, auto route
            setTimeout(() => {
                router.push("/")
            }, 1500)
        } catch (err: unknown) {
            console.error(err)
            const msg = err instanceof Error ? err.message : String(err)
            setError("Error loading dummy data: " + msg)
        } finally {
            setIsLoading(false)
        }
    }

    const onDropClaims = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        setIsLoading(true)
        setError(null)
        setSuccess(null)

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: "array" })
                processClaimsWorkbook(workbook)
            } catch (err: unknown) {
                console.error(err)
                const msg = err instanceof Error ? err.message : String(err)
                setError("Error parsing the Excel file. " + msg)
            } finally {
                setIsLoading(false)
            }
        }
        reader.readAsArrayBuffer(file)
    }, [setClaims, setIsLoading, router])

    const onDropPayment = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        setIsLoading(true)
        setPaymentError(null)
        setPaymentSuccess(null)

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: "array" })
                processPaymentWorkbook(workbook)
            } catch (err: unknown) {
                console.error(err)
                const msg = err instanceof Error ? err.message : String(err)
                setPaymentError("Error parsing the Payment Report. " + msg)
            } finally {
                setIsLoading(false)
            }
        }
        reader.readAsArrayBuffer(file)
    }, [claims, setClaims, setIsLoading, router])

    const { getRootProps: claimsProps, getInputProps: claimsInputProps, isDragActive: claimsActive } = useDropzone({
        onDrop: onDropClaims,
        accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
            "text/csv": [".csv"],
        },
        maxFiles: 1,
    })

    const { getRootProps: paymentProps, getInputProps: paymentInputProps, isDragActive: paymentActive } = useDropzone({
        onDrop: onDropPayment,
        accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
            "text/csv": [".csv"],
        },
        maxFiles: 1,
    })

    return (
        <div className="p-4 max-w-6xl mx-auto mt-2 space-y-4">
            <div className="text-center pb-6">
                <h1 className="text-3xl font-bold tracking-tight">Chiro / PT / OT - Upload Data</h1>
                <p className="text-lg mt-2 text-muted-foreground">
                    Upload your data files to populate the dashboard analytics.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Stage 1: Claims Upload */}
            <Card className="shadow-sm border flex flex-col min-h-[450px]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                        Claims Data (.xlsx, .csv)
                    </CardTitle>
                    <CardDescription>
                        Upload the primary claims file containing all main claim information.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pb-6">
                    <div
                        {...claimsProps()}
                        className={`flex-1 flex flex-col justify-center items-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors duration-200 ${claimsActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                    >
                        <input {...claimsInputProps()} />
                        <div className="mx-auto flex justify-center mb-6">
                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                                <FileSpreadsheet className="h-10 w-10 text-primary" />
                            </div>
                        </div>
                        {claimsActive ? (
                            <p className="text-xl font-medium text-primary">Drop the file here ...</p>
                        ) : (
                            <div>
                                <p className="text-xl font-medium mb-2">Drag & drop your Claims file here</p>
                                <p className="text-base text-muted-foreground">or click to browse</p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3">
                            <AlertCircle className="h-5 w-5" />
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mt-4 p-4 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5" />
                            <p className="font-medium">{success}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Stage 2: Payment Report Upload */}
            <Card className={`shadow-sm border flex flex-col min-h-[450px] transition-opacity duration-300 ${claims.length === 0 ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white text-sm font-bold">2</div>
                        Payment Report (.xlsx, .csv)
                    </CardTitle>
                    <CardDescription>
                        Upload the payment/collection report. Needs columns: Patient Name, DOS, CPT, Grand Total.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pb-6">
                    <div
                        {...paymentProps()}
                        className={`flex-1 flex flex-col justify-center items-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors duration-200 ${paymentActive ? "border-blue-500 bg-blue-500/5" : "border-border hover:border-blue-500/50 hover:bg-muted/50"
                            }`}
                    >
                        <input {...paymentInputProps()} />
                        <div className="mx-auto flex justify-center mb-6">
                            <div className="h-20 w-20 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <FileSpreadsheet className="h-10 w-10 text-blue-500" />
                            </div>
                        </div>
                        {paymentActive ? (
                            <p className="text-xl font-medium text-blue-500">Drop the file here ...</p>
                        ) : (
                            <div>
                                <p className="text-xl font-medium mb-2">Drag & drop your Payment Report here</p>
                                <p className="text-base text-muted-foreground">or click to browse</p>
                            </div>
                        )}
                    </div>

                    {paymentError && (
                        <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3">
                            <AlertCircle className="h-5 w-5" />
                            <p className="font-medium">{paymentError}</p>
                        </div>
                    )}

                    {paymentSuccess && (
                        <div className="mt-4 p-4 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5" />
                            <p className="font-medium">{paymentSuccess}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center bg-card shadow-sm border rounded-xl p-4 mt-6 shrink-0 relative z-10 w-full hover:shadow-md transition-shadow">
                <Button onClick={loadDummyData} variant="outline" className="gap-2">
                    <Wand2 className="h-4 w-4" />
                    Load Dummy Data
                </Button>
                
                <Button 
                    onClick={() => router.push("/")} 
                    className="gap-2 mt-4 md:mt-0 w-full md:w-auto"
                    disabled={claims.length === 0}
                >
                    Continue to Dashboard
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}


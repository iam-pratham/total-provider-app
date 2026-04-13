"use client"

import React, { useMemo } from "react"
import { useData } from "@/context/data-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { GlobalFilters } from "@/components/global-filters"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"
import { motion } from "framer-motion"
import { GlobalSearchButton } from "@/components/global-search-button"

const chartConfig = {
    total: {
        label: "Total Volume",
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

export default function CptAnalysisPage() {
    const { filteredClaims, claims, isLoading } = useData()

    const cptStats = useMemo(() => {
        const map: Record<string, number> = {}
        filteredClaims.forEach(c => {
            const codes = String(c.cptCode || "").split(',').map(s => s.trim()).filter(Boolean)
            codes.forEach(cpt => {
                if (!cpt || cpt === "N/A") return
                map[cpt] = (map[cpt] || 0) + 1
            })
        })
        return Object.keys(map)
            .map(k => ({ cpt: k, total: map[k] }))
            .sort((a, b) => b.total - a.total)
    }, [filteredClaims])

    const totalCptUsages = useMemo(() => cptStats.reduce((acc, curr) => acc + curr.total, 0), [cptStats])

    // Dynamic bar height — 40px per bar + padding
    const chartHeight = Math.max(320, cptStats.length * 44)



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
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Chiro / PT / OT - CPT Trends</h1>
                <GlobalSearchButton />
            </div>
            <GlobalFilters />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-6"
            >
                {/* Summary KPIs */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total CPT Usages</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalCptUsages.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1">Across all claims</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Unique CPT Codes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{cptStats.length.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1">Distinct procedure codes</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Full horizontal bar chart — all CPT codes */}
                <motion.div variants={itemVariants}>
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Total CPT Code Billed Volume</CardTitle>
                            <CardDescription>All {cptStats.length} CPT codes sorted by total usage</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 pb-4">
                            <ChartContainer config={chartConfig} style={{ height: `${chartHeight}px` }} className="w-full">
                                <BarChart
                                    accessibilityLayer
                                    data={cptStats}
                                    layout="vertical"
                                    margin={{ top: 5, right: 140, left: 10, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.2} />
                                    <XAxis type="number" tickLine={false} axisLine={false} tickMargin={10} style={{ fill: "var(--color-muted-foreground)", fontSize: "11px" }} />
                                    <YAxis
                                        type="category"
                                        dataKey="cpt"
                                        width={80}
                                        tickLine={false}
                                        axisLine={false}
                                        style={{ fontSize: "12px", fill: "var(--color-muted-foreground)", fontWeight: 600 }}
                                    />
                                    <ChartTooltip cursor={{ fill: 'var(--color-primary)', opacity: 0.1 }} content={<ChartTooltipContent indicator="line" />} />
                                    <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={36}>
                                        {cptStats.map((_, index) => (
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
                                                const pct = ((value / totalCptUsages) * 100 || 0).toFixed(1);
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
        </div>
    )
}

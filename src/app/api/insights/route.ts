import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const data = await req.json()
        const { providerVolumes, doctorVolumes, cptUsages, insuranceMix, existingTitles = [] } = data

        // Simulate an LLM call delay
        await new Promise(resolve => setTimeout(resolve, 1500))

        const getRandomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]

        const randomDoctor = getRandomItem(doctorVolumes || []) || { doctor: "Unknown", count: 0 }
        const randomCpt = getRandomItem(cptUsages || []) || { cptCode: "N/A", count: 0 }
        const randomIns = getRandomItem(insuranceMix || []) || { type: "Unknown", count: 0 }
        const randomProvider = getRandomItem(providerVolumes || []) || { provider: "Local Clinic", count: 0 }

        const insightTemplates = [
            {
                type: "Trend",
                title: "Doctor Volume Anomaly",
                description: `Dr. ${randomDoctor.doctor} handled ${randomDoctor.count} claims recently. Review their scheduling to ensure capacity aligns with this volume distribution compared to historical averages.`,
                confidence: "Medium",
                badgeColor: "bg-blue-500",
            },
            {
                type: "Risk",
                title: "CPT Frequency Flag",
                description: `CPT Code ${randomCpt.cptCode} appeared ${randomCpt.count} times. Given its billing frequency, ensure all clinical notes robustly justify medical necessity to prevent mass denials.`,
                confidence: "High",
                badgeColor: "bg-red-500",
            },

            {
                type: "Alert",
                title: "Location Activity Spike",
                description: `Service acts occurring at ${randomProvider.provider} reached ${randomProvider.count} claims. Confirm if this facility requires additional resource deployment or staffing.`,
                confidence: "Medium",
                badgeColor: "bg-orange-500",
            },
            {
                type: "Trend",
                title: "Insurance Payer Concentration",
                description: `Our algorithm detected that ${randomIns.type} is receiving a concentrated volume (${randomIns.count} claims). Monitor for potential bulk-processing delays.`,
                confidence: "High",
                badgeColor: "bg-purple-500",
            },
            {
                type: "Risk",
                title: "Documentation Compliance Review",
                description: `The combination of Dr. ${randomDoctor.doctor} submitting code ${randomCpt.cptCode} frequently suggests a potential target for external audits. Prioritize internal documentation reviews here.`,
                confidence: "Medium",
                badgeColor: "bg-red-500",
            },

            {
                type: "Trend",
                title: "Automated Claim Scrubbing",
                description: `The volume assigned to ${randomIns.type} suggests modifying your front-end claim scrubber to specifically catch their localized denial triggers before submission.`,
                confidence: "High",
                badgeColor: "bg-blue-500",
            },
            {
                type: "Alert",
                title: "High-Volume Code Bottleneck",
                description: `Processing efficiency for code ${randomCpt.cptCode} is critical, as it constitutes a large piece of the active AR. Dedicate specific billers to clear these rapidly.`,
                confidence: "Medium",
                badgeColor: "bg-orange-500",
            },
            {
                type: "Trend",
                title: "Physician Revenue Growth",
                description: `Dr. ${randomDoctor.doctor} shows consistent throughput. Standardizing their pre-authorization workflow with ${randomIns.type} could dramatically lower their pending days in AR.`,
                confidence: "High",
                badgeColor: "bg-purple-500",
            },
            {
                type: "Alert",
                title: "Payer Dependency Risk",
                description: `Over-reliance on ${randomIns.type} for cashflow can become a structural liability. Monitor their payment turnaround times continuously.`,
                confidence: "High",
                badgeColor: "bg-blue-500",
            }
        ]

        // Filter out existing insights
        const availableTemplates = insightTemplates.filter(t => !existingTitles.includes(t.title))

        // If we ran out of templates
        if (availableTemplates.length === 0) {
            return NextResponse.json({ insights: [] })
        }

        // Select 2 random templates to return
        const shuffled = availableTemplates.sort(() => 0.5 - Math.random())
        const selected = shuffled.slice(0, 2)

        const generatedInsights = selected.map(s => ({
            ...s,
            id: Math.random().toString(36).substring(7)
        }))

        return NextResponse.json({ insights: generatedInsights })
    } catch (error) {
        return NextResponse.json({ error: "Failed to parse data for LLM." }, { status: 500 })
    }
}

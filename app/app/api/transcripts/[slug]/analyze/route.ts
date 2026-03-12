import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { PROJECT_ROOT } from "@/lib/db";

/**
 * POST /api/transcripts/[slug]/analyze
 * Triggers the forensic analysis script for a transcript.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const TRANSCRIPTS_ROOT = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/TRANSCRIPTS_LOCKER";
    
    try {
        const transcriptDir = path.join(TRANSCRIPTS_ROOT, slug, "txt");
        if (!fs.existsSync(transcriptDir)) {
            return NextResponse.json({ error: "Transcript text directory not found" }, { status: 404 });
        }

        const files = fs.readdirSync(transcriptDir).filter(f => f.endsWith(".txt"));
        if (files.length === 0) {
            return NextResponse.json({ error: "No .txt file found for analysis" }, { status: 404 });
        }

        const transcriptPath = path.join(transcriptDir, files[0]);
        const scriptPath = path.join(PROJECT_ROOT, "ingest", "transcript_analysis.py");
        const outputPath = path.join(PROJECT_ROOT, "data", "memos", `MEMO-${slug}.json`);

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const command = `python3 "${scriptPath}" "${transcriptPath}" --output "${outputPath}"`;

        return new Promise((resolve) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error("Analysis script error:", error);
                    resolve(NextResponse.json({ 
                        error: "Analysis script failed", 
                        details: stderr || error.message 
                    }, { status: 500 }));
                    return;
                }

                resolve(NextResponse.json({ 
                    success: true, 
                    message: "Analysis completed",
                    output: stdout,
                    memoPath: outputPath
                }));
            });
        });

    } catch (error) {
        console.error("Analyze POST error:", error);
        return NextResponse.json({ error: "Internal server error during analysis" }, { status: 500 });
    }
}

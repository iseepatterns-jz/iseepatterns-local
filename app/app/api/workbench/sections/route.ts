import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { EVIDENCE_DIR, getWorkbenchDb } from "@/lib/db";

interface SectionInfo {
    name: string;
    prefix: string;
    types: string[];
    pdfCount: number;
    emlCount: number;
    totalItems: number;
    path: string;
    description?: string;
}

function countFiles(dir: string, ext: string): number {
    try {
        if (!fs.existsSync(dir)) return 0;
        let count = 0;
        const walk = (d: string) => {
            for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
                if (entry.isDirectory()) walk(path.join(d, entry.name));
                else if (entry.name.toLowerCase().endsWith(ext)) count++;
            }
        };
        walk(dir);
        return count;
    } catch {
        return 0;
    }
}

/**
 * GET /api/workbench/sections
 * Returns all exhibit sections from the database with item counts and metadata.
 */
export async function GET() {
    try {
        const db = getWorkbenchDb();
        const rows = db.prepare("SELECT * FROM exhibit_sections ORDER BY sort_order ASC, name ASC").all() as any[];

        const sections: SectionInfo[] = [];

        for (const row of rows) {
            const name = row.name;
            const sectionPath = path.join(EVIDENCE_DIR, name);
            const rawEmlPath = path.join(sectionPath, "RAW_EML");
            const exists = fs.existsSync(sectionPath);

            const pdfCount = exists ? countFiles(sectionPath, ".pdf") : 0;
            const emlCount = fs.existsSync(rawEmlPath) ? countFiles(rawEmlPath, ".eml") : 0;

            // Count DB assignments for this section
            const assignmentCount = (db.prepare(
                `SELECT COUNT(*) as cnt FROM evidence_assignments WHERE target_section = ?`
            ).get(name) as { cnt: number })?.cnt || 0;

            sections.push({
                name,
                prefix: row.prefix,
                types: JSON.parse(row.types || '["email"]'),
                description: row.description,
                pdfCount,
                emlCount,
                totalItems: Math.max(pdfCount, emlCount, assignmentCount),
                path: sectionPath,
            });
        }

        return NextResponse.json({
            sections,
            totalSections: sections.length,
            totalItems: sections.reduce((sum, s) => sum + s.totalItems, 0),
        });
    } catch (error) {
        console.error("Failed to load sections:", error);
        return NextResponse.json(
            { error: "Failed to load sections" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/workbench/sections
 * Creates a new exhibit section and sets up its directory structure if needed.
 */
export async function POST(req: Request) {
    try {
        const { name, prefix, types, description } = await req.json();

        if (!name || !prefix) {
            return NextResponse.json({ error: "Name and prefix are required" }, { status: 400 });
        }

        // Clean name (remove invalid chars but allow numbers and underscores)
        const cleanName = name.trim().replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase();
        const cleanPrefix = prefix.trim().toUpperCase();

        const db = getWorkbenchDb();

        // Insert into DB
        const result = db.prepare(`
            INSERT INTO exhibit_sections (name, prefix, types, description, sort_order)
            VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM exhibit_sections))
        `).run(cleanName, cleanPrefix, JSON.stringify(types || ["email"]), description || "");

        // Create directory structure on disk
        const sectionPath = path.join(EVIDENCE_DIR, cleanName);
        const rawEmlPath = path.join(sectionPath, "RAW_EML");

        if (!fs.existsSync(sectionPath)) {
            fs.mkdirSync(sectionPath, { recursive: true });
        }
        if (!fs.existsSync(rawEmlPath)) {
            fs.mkdirSync(rawEmlPath, { recursive: true });
        }

        // Log the audit event
        db.prepare(`
            INSERT INTO workbench_audit (action, target_type, target_id, details)
            VALUES ('CREATE_SECTION', 'section', ?, ?)
        `).run(cleanName, JSON.stringify({ name: cleanName, prefix: cleanPrefix }));

        return NextResponse.json({
            success: true,
            id: Number(result.lastInsertRowid),
            name: cleanName,
            path: sectionPath
        });

    } catch (error: any) {
        console.error("Failed to create section:", error);
        if (error.code === 'SQLITE_CONSTRAINT') {
            return NextResponse.json({ error: "Section name already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

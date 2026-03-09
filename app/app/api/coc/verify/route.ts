import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import { getCommDb } from "@/lib/db";

async function sha256File(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(path);
        stream.on("error", reject);
        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest("hex")));
    });
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { id } = await req.json();
        if (!id) {
            return NextResponse.json(
                { error: "Missing id" },
                { status: 400 }
            );
        }

        const db = getCommDb();
        const row = db
            .prepare(
                `
        SELECT id, source_path, sha256
        FROM chain_of_custody
        WHERE id = ?
        `
            )
            .get(id) as { id: number; source_path: string; sha256: string } | undefined;

        if (!row) {
            return NextResponse.json(
                { error: "Record not found" },
                { status: 404 }
            );
        }

        let actualSha: string;
        try {
            actualSha = await sha256File(row.source_path);
        } catch (e: any) {
            console.error("Hash verify file error:", e);
            return NextResponse.json(
                { error: "Failed to read file", id: row.id },
                { status: 500 }
            );
        }

        const matches = actualSha === row.sha256;

        return NextResponse.json({
            id: row.id,
            expected_sha256: row.sha256,
            actual_sha256: actualSha,
            matches,
        });
    } catch (error) {
        console.error("CoC verify API error:", error);
        return NextResponse.json(
            { error: "Verification failed" },
            { status: 500 }
        );
    }
}

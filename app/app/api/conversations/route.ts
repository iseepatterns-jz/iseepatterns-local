import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb, getImessageDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/* ─── GET: list conversations or get conversation detail ─── */
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const wb = getWorkbenchDb();

        if (id) {
            // ── Get conversation detail with messages ──
            const conv = wb.prepare("SELECT * FROM conversations WHERE id = ?").get(Number(id)) as any;
            if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

            const members = wb.prepare(
                "SELECT message_rowid, sort_order, note, added_at FROM conversation_messages WHERE conversation_id = ? ORDER BY sort_order ASC, added_at ASC"
            ).all(Number(id)) as any[];

            // Hydrate with actual message data from chat_master
            const chatDb = getImessageDb();
            const messages = members.map((m: any) => {
                const msg = chatDb.prepare(`
                    SELECT m.ROWID, COALESCE(m.text, m.decodedBody) as body,
                           m.date as raw_date, m.is_from_me,
                           COALESCE(h.id, '') as handle_id,
                           COALESCE(c.display_name, '') as chat_name
                    FROM message m
                    LEFT JOIN handle h ON m.handle_id = h.ROWID
                    LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
                    LEFT JOIN chat c ON cmj.chat_id = c.ROWID
                    WHERE m.ROWID = ?
                `).get(m.message_rowid) as any;

                return {
                    rowid: m.message_rowid,
                    sort_order: m.sort_order,
                    note: m.note,
                    added_at: m.added_at,
                    body: msg?.body || "[message not found]",
                    raw_date: msg?.raw_date,
                    is_from_me: msg?.is_from_me,
                    handle_id: msg?.handle_id || "",
                    chat_name: msg?.chat_name || ""
                };
            });

            return NextResponse.json({ conversation: conv, messages });
        }

        // ── List all conversations with counts ──
        const conversations = wb.prepare(`
            SELECT c.*, COALESCE(cnt.msg_count, 0) as message_count
            FROM conversations c
            LEFT JOIN (
                SELECT conversation_id, COUNT(*) as msg_count
                FROM conversation_messages
                GROUP BY conversation_id
            ) cnt ON c.id = cnt.conversation_id
            ORDER BY c.updated_at DESC
        `).all();

        return NextResponse.json({ conversations });

    } catch (err: any) {
        console.error("Conversations GET error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/* ─── POST: create conversation, add/bulk-add/remove messages ─── */
export async function POST(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const action = url.searchParams.get("action") || "create";
        const wb = getWorkbenchDb();

        if (action === "create") {
            const { name, description, color } = await request.json();
            if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

            const result = wb.prepare(
                "INSERT INTO conversations (name, description, color) VALUES (?, ?, ?)"
            ).run(name, description || null, color || "#60a5fa");

            return NextResponse.json({
                id: result.lastInsertRowid,
                name,
                description: description || null,
                color: color || "#60a5fa"
            });
        }

        if (action === "add") {
            const { conversation_id, message_rowids, notes } = await request.json();
            if (!conversation_id || !message_rowids?.length) {
                return NextResponse.json({ error: "conversation_id and message_rowids required" }, { status: 400 });
            }

            // Get current max sort_order
            const maxSort = wb.prepare(
                "SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM conversation_messages WHERE conversation_id = ?"
            ).get(conversation_id) as any;

            const insert = wb.prepare(
                "INSERT OR IGNORE INTO conversation_messages (conversation_id, message_rowid, sort_order, note) VALUES (?, ?, ?, ?)"
            );

            const insertMany = wb.transaction((rowids: number[]) => {
                let order = (maxSort?.max_sort || 0) + 1;
                for (const rowid of rowids) {
                    const note = notes?.[String(rowid)] || null;
                    insert.run(conversation_id, rowid, order++, note);
                }
            });

            insertMany(message_rowids);

            // Update timestamp
            wb.prepare("UPDATE conversations SET updated_at = datetime('now','localtime') WHERE id = ?").run(conversation_id);

            return NextResponse.json({ added: message_rowids.length });
        }

        if (action === "bulk") {
            // Bulk add from a filtered query — re-use the same filter logic as evidence-hub
            const { conversation_id, participant, date_from, date_to, q } = await request.json();
            if (!conversation_id) return NextResponse.json({ error: "conversation_id required" }, { status: 400 });

            const chatDb = getImessageDb();
            const conditions: string[] = [];
            const params: any[] = [];

            if (participant) {
                // participant can be comma-separated list of identifiers
                const ids = participant.split(",").map((s: string) => s.trim()).filter(Boolean);
                if (ids.length) {
                    const placeholders = ids.map(() => "?").join(",");
                    conditions.push(`h.id IN (${placeholders})`);
                    params.push(...ids);
                }
            }
            if (date_from) {
                // iMessage dates: Apple epoch  (seconds since 2001-01-01) * 1e9
                const epoch2001 = Date.UTC(2001, 0, 1) / 1000;
                const fromTs = (new Date(date_from).getTime() / 1000 - epoch2001) * 1e9;
                conditions.push("m.date >= ?");
                params.push(fromTs);
            }
            if (date_to) {
                const epoch2001 = Date.UTC(2001, 0, 1) / 1000;
                const toTs = (new Date(date_to + "T23:59:59").getTime() / 1000 - epoch2001) * 1e9;
                conditions.push("m.date <= ?");
                params.push(toTs);
            }
            if (q) {
                conditions.push("COALESCE(m.text, m.decodedBody) LIKE ?");
                params.push(`%${q}%`);
            }

            const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
            const rows = chatDb.prepare(`
                SELECT DISTINCT m.ROWID as rowid
                FROM message m
                LEFT JOIN handle h ON m.handle_id = h.ROWID
                ${where}
                ORDER BY m.date ASC
            `).all(...params) as any[];

            const rowids = rows.map((r: any) => r.rowid);

            if (rowids.length) {
                const maxSort = wb.prepare(
                    "SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM conversation_messages WHERE conversation_id = ?"
                ).get(conversation_id) as any;

                const insert = wb.prepare(
                    "INSERT OR IGNORE INTO conversation_messages (conversation_id, message_rowid, sort_order) VALUES (?, ?, ?)"
                );

                const insertMany = wb.transaction((ids: number[]) => {
                    let order = (maxSort?.max_sort || 0) + 1;
                    for (const id of ids) {
                        insert.run(conversation_id, id, order++);
                    }
                });

                insertMany(rowids);

                wb.prepare("UPDATE conversations SET updated_at = datetime('now','localtime') WHERE id = ?").run(conversation_id);
            }

            return NextResponse.json({ added: rowids.length });
        }

        if (action === "remove") {
            const { conversation_id, message_rowids } = await request.json();
            if (!conversation_id || !message_rowids?.length) {
                return NextResponse.json({ error: "conversation_id and message_rowids required" }, { status: 400 });
            }

            const placeholders = message_rowids.map(() => "?").join(",");
            wb.prepare(
                `DELETE FROM conversation_messages WHERE conversation_id = ? AND message_rowid IN (${placeholders})`
            ).run(conversation_id, ...message_rowids);

            wb.prepare("UPDATE conversations SET updated_at = datetime('now','localtime') WHERE id = ?").run(conversation_id);

            return NextResponse.json({ removed: message_rowids.length });
        }

        if (action === "update") {
            const { id, name, description, color } = await request.json();
            if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

            wb.prepare(
                "UPDATE conversations SET name = COALESCE(?, name), description = COALESCE(?, description), color = COALESCE(?, color), updated_at = datetime('now','localtime') WHERE id = ?"
            ).run(name || null, description ?? null, color || null, id);

            return NextResponse.json({ updated: true });
        }

        return NextResponse.json({ error: "unknown action" }, { status: 400 });

    } catch (err: any) {
        console.error("Conversations POST error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/* ─── DELETE: delete a conversation ─── */
export async function DELETE(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

        const wb = getWorkbenchDb();
        wb.prepare("DELETE FROM conversation_messages WHERE conversation_id = ?").run(Number(id));
        wb.prepare("DELETE FROM conversations WHERE id = ?").run(Number(id));

        return NextResponse.json({ deleted: true });
    } catch (err: any) {
        console.error("Conversations DELETE error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

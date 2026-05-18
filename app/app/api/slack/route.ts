import { NextRequest, NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const SLACK_ROOT = join(
  "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/USE_MBOX_INDEX/SLACK_LOCKER",
  "Rowboat Creative Slack export Mar 15 2020 - Mar 8 2024"
);

const BOT_IDS = new Set([
  "UV73T4JUR",  // onedrive
  "U01035KEDS9", // googledrive
  "U01064BB2U8", // trello
  "U010ED01G6Q", // simplepoll
  "U0105AJBH70", // google_calendar
  "U03LKC6NHMY", // zapier
  "U05KTPQB0ET", // rowbot_creative
]);

function loadChannels() {
  try {
    const raw = readFileSync(join(SLACK_ROOT, "channels.json"), "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load channels.json:", e);
    return [];
  }
}

function loadUsers() {
  try {
    const raw = readFileSync(join(SLACK_ROOT, "users.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function scanDates(channelName: string): string[] {
  const dir = join(SLACK_ROOT, channelName);
  try {
    const files = readdirSync(dir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""))
      .sort();
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "";
    const channel = url.searchParams.get("channel") || "";
    const date = url.searchParams.get("date") || "";
    const q = url.searchParams.get("q") || "";

    switch (action) {
      // ── List channels ──
      case "channels": {
        const channels = loadChannels();
        const users = loadUsers();
        // Filter out bots/channels we don't want to show
        // But include all channels for analysis
        const enriched = channels.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          topic: ch.topic?.value || "",
          purpose: ch.purpose?.value || "",
          memberCount: ch.members?.length || 0,
          // Include human member names
          members: (ch.members || [])
            .filter((mid: string) => !BOT_IDS.has(mid))
            .map((mid: string) => {
              const u = users.find((us: any) => us.id === mid);
              return {
                id: mid,
                real_name: u?.real_name || u?.name || mid,
                image_72: u?.profile?.image_72 || "",
              };
            }),
        }));
        return NextResponse.json({ channels: enriched });
      }

      // ── List available dates for a channel ──
      case "dates": {
        if (!channel) {
          return NextResponse.json(
            { error: "channel required" },
            { status: 400 }
          );
        }
        const dates = scanDates(channel);
        return NextResponse.json({ channel, dates });
      }

      // ── Get messages for a channel on a specific date ──
      case "messages": {
        if (!channel || !date) {
          return NextResponse.json(
            { error: "channel and date required" },
            { status: 400 }
          );
        }
        const filePath = join(SLACK_ROOT, channel, `${date}.json`);
        let raw: string;
        try {
          raw = readFileSync(filePath, "utf-8");
        } catch {
          return NextResponse.json({ channel, date, messages: [] });
        }
        const allMessages = JSON.parse(raw);
        // Filter out bot messages and system messages, enrich with user info
        const filtered = allMessages
          .filter((m: any) => {
            // Skip sub-type messages that are pure system events
            if (m.subtype && !m.text) return false;
            // Mark bots
            if (BOT_IDS.has(m.user || m.bot_id)) return true; // keep bot msgs but they'll be flagged
            return true;
          })
          .map((m: any) => ({
            user: m.user || m.bot_id || "",
            type: m.type,
            subtype: m.subtype || null,
            ts: m.ts,
            text: m.text || "",
            user_profile: m.user_profile || null,
            is_bot: BOT_IDS.has(m.user || m.bot_id || ""),
          }));
        return NextResponse.json({
          channel,
          date,
          messages: filtered,
          total: filtered.length,
        });
      }

      // ── Search messages across all dates for a channel ──
      case "search": {
        if (!channel || !q) {
          return NextResponse.json(
            { error: "channel and q (search term) required" },
            { status: 400 }
          );
        }
        const dates = scanDates(channel);
        const results: any[] = [];
        const term = q.toLowerCase();

        for (const d of dates) {
          const filePath = join(SLACK_ROOT, channel, `${d}.json`);
          let raw: string;
          try {
            raw = readFileSync(filePath, "utf-8");
          } catch {
            continue;
          }
          const msgs = JSON.parse(raw);
          for (const m of msgs) {
            const text = (m.text || "").toLowerCase();
            const userProfile = m.user_profile;
            const realName = (userProfile?.real_name || "").toLowerCase();

            if (text.includes(term) || realName.includes(term)) {
              results.push({
                user: m.user || m.bot_id || "",
                type: m.type,
                subtype: m.subtype || null,
                ts: m.ts,
                text: m.text || "",
                date: d,
                user_profile: userProfile || null,
                is_bot: BOT_IDS.has(m.user || m.bot_id || ""),
              });
            }
          }
        }

        // Return sorted by TS descending (newest first), limit to 500
        results.sort((a, b) => b.ts.localeCompare(a.ts));
        return NextResponse.json({
          channel,
          q,
          messages: results.slice(0, 500),
          total: results.length,
        });
      }

      default:
        return NextResponse.json(
          {
            error: "Invalid action. Use: channels, messages, dates, search",
            examples: {
              channels: "/api/slack?action=channels",
              messages: "/api/slack?action=messages&channel=general&date=2020-03-18",
              dates: "/api/slack?action=dates&channel=general",
              search: "/api/slack?action=search&channel=general&q=meeting",
            },
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Slack API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

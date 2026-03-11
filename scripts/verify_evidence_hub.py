"""
Verify Evidence Hub DB integrity after ingestion.

Usage:
    python3 scripts/verify_evidence_hub.py
"""

import sqlite3
from pathlib import Path

DB_PATH = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/evidence_hub.db")


def verify():
    if not DB_PATH.exists():
        print(f"❌ DB not found: {DB_PATH}")
        return False

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    ok = True

    # 1. Row counts per table
    print("═" * 60)
    print("📊 Evidence Hub Verification")
    print("═" * 60)

    for table in ["evidence", "evidence_origins", "participants", "evidence_participants"]:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"   {table}: {count:,} rows")

    # 2. Source type breakdown
    print("\n📋 Source type breakdown:")
    for row in conn.execute(
        "SELECT source_type, COUNT(*) as cnt FROM evidence GROUP BY source_type ORDER BY cnt DESC"
    ):
        print(f"   {row['source_type']}: {row['cnt']:,}")

    # 3. Origin system breakdown
    print("\n🔗 Origin system breakdown:")
    for row in conn.execute(
        "SELECT origin_system, COUNT(*) as cnt FROM evidence_origins GROUP BY origin_system ORDER BY cnt DESC"
    ):
        print(f"   {row['origin_system']}: {row['cnt']:,}")

    # 4. Dedup check: no duplicate canonical_ids
    dupes = conn.execute(
        "SELECT canonical_id, COUNT(*) as cnt FROM evidence GROUP BY canonical_id HAVING cnt > 1"
    ).fetchall()
    if dupes:
        print(f"\n❌ FAIL: {len(dupes)} duplicate canonical_ids found!")
        for d in dupes[:5]:
            print(f"   {d['canonical_id']}: {d['cnt']} rows")
        ok = False
    else:
        print("\n✅ Dedup check passed: no duplicate canonical_ids")

    # 5. Provenance check: every evidence row has at least 1 origin
    orphans = conn.execute("""
        SELECT COUNT(*) FROM evidence e
        WHERE NOT EXISTS (SELECT 1 FROM evidence_origins o WHERE o.evidence_id = e.id)
    """).fetchone()[0]
    if orphans > 0:
        print(f"❌ FAIL: {orphans} evidence rows have no provenance origin")
        ok = False
    else:
        print("✅ Provenance check passed: every evidence row has at least 1 origin")

    # 6. Multi-origin records (the dedup bonus — same message from multiple DBs)
    multi = conn.execute("""
        SELECT e.canonical_id, COUNT(DISTINCT o.origin_system) as origins
        FROM evidence e
        JOIN evidence_origins o ON o.evidence_id = e.id
        GROUP BY e.id
        HAVING origins > 1
        LIMIT 5
    """).fetchall()
    if multi:
        total_multi = conn.execute("""
            SELECT COUNT(*) FROM (
                SELECT e.id FROM evidence e
                JOIN evidence_origins o ON o.evidence_id = e.id
                GROUP BY e.id HAVING COUNT(DISTINCT o.origin_system) > 1
            )
        """).fetchone()[0]
        print(f"\n🔀 Multi-origin records: {total_multi:,} evidence rows have 2+ origins")
        for m in multi[:3]:
            print(f"   {m['canonical_id'][:60]}... → {m['origins']} origins")
    else:
        print("\n📝 No multi-origin records found (expected if only one DB ingested)")

    # 7. FTS5 test
    fts_count = conn.execute("SELECT COUNT(*) FROM evidence_fts").fetchone()[0]
    print(f"\n🔍 FTS5 index: {fts_count:,} rows")
    if fts_count > 0:
        sample = conn.execute(
            "SELECT snippet(evidence_fts, 2, '>>>', '<<<', '...', 10) as snip "
            "FROM evidence_fts LIMIT 1"
        ).fetchone()
        if sample:
            print(f"   Sample snippet: {sample['snip'][:100]}")

    # 8. Participant cross-source check
    print("\n👥 Top participants (by evidence count):")
    for row in conn.execute("""
        SELECT p.normalized_identifier, COUNT(DISTINCT ep.evidence_id) as cnt
        FROM participants p
        JOIN evidence_participants ep ON ep.participant_id = p.id
        GROUP BY p.id
        ORDER BY cnt DESC
        LIMIT 10
    """):
        print(f"   {row['normalized_identifier']}: {row['cnt']:,} evidence links")

    conn.close()

    print(f"\n{'✅ ALL CHECKS PASSED' if ok else '❌ SOME CHECKS FAILED'}")
    print("═" * 60)
    return ok


if __name__ == "__main__":
    verify()

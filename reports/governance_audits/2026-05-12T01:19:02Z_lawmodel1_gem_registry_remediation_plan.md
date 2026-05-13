# LawModel1 Gem Registry Remediation Plan
Timestamp UTC: 2026-05-12T01:19:02Z
Scope: read-only remediation plan for unresolved gem dependency IDs. This run wrote only this report and JSON sidecar.
Registry inspected: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/gems/registry.json
## Registered gem IDs
- gem-imessages
- gem-gmail
- gem-financial-txns
- gem-tax-returns
- gem-evidence-hub
- gem-paralegal-exports
- gem-ready-bag
- gem-qb-forensic

## Dependency IDs
- gem-chain-of-custody
- gem-evidence-cards
- gem-evidence-hub
- gem-financial-txns
- gem-gmail
- gem-imessages
- gem-paralegal-exports
- gem-players

## Unresolved dependency IDs
- gem-chain-of-custody
- gem-evidence-cards
- gem-players

## Where unresolved IDs are referenced
```
README.md:59:| `gem-players` | Profiles → players.db | — |
README.md:62:| `gem-evidence-cards` | All sources → evidence_hub.db | email, imessage, financial, players |
README.md:64:| `gem-chain-of-custody` | Provenance + audit trails | email, imessage, financial |
reports/governance_audits/2026-05-12T01-11-45Z_lawmodel1_post_rewrite_baseline_audit_supplement.json:38:        "gem-chain-of-custody",
reports/governance_audits/2026-05-12T01-11-45Z_lawmodel1_post_rewrite_baseline_audit_supplement.json:39:        "gem-evidence-cards",
reports/governance_audits/2026-05-12T01-11-45Z_lawmodel1_post_rewrite_baseline_audit_supplement.json:40:        "gem-players"
reports/governance_audits/2026-05-10_lawmodel1_governance_coc_audit.md:60:- gem-chain-of-custody
reports/governance_audits/2026-05-10_lawmodel1_governance_coc_audit.md:61:- gem-evidence-cards
reports/governance_audits/2026-05-10_lawmodel1_governance_coc_audit.md:62:- gem-players
reports/governance_audits/2026-05-10_lawmodel1_governance_coc_audit.md:131:4. Register or intentionally retire the unregistered gem dependency IDs: gem-chain-of-custody, gem-evidence-cards, gem-players.
gems/README.md:13:| `gem-players` | LinkedIn/profiles → players.db | — |
gems/README.md:16:| `gem-evidence-cards` | All sources → evidence_hub.db | email, imessage, financial, players |
gems/README.md:18:| `gem-chain-of-custody` | Provenance + audit tracking | email, imessage, financial |
gems/registry.json:268:      "dependencies": ["gem-evidence-cards", "gem-players", "gem-chain-of-custody"],
```

## Implementation evidence observed
### gem-chain-of-custody
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/docs/chain_of_custody_architecture.md | exists=True | type=file
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/update_chain_of_custody.py | exists=True | type=file
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db | exists=True | type=file
### gem-evidence-cards
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/ingest/evidence_card.py | exists=True | type=file
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/ingest/generate_evidence_cards.py | exists=True | type=file
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/evidence_cards | exists=True | type=dir
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/exports/attorney_package/04_evidence_cards | exists=True | type=dir
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/generate_paralegal_exports.py | exists=True | type=file
### gem-players
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/players.db | exists=True | type=file
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/schemas/players.sql | exists=True | type=file
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/ingest/bridge_players_to_hub.py | exists=True | type=file
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/link_players_to_legal.py | exists=True | type=file
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/generate_paralegal_exports.py | exists=True | type=file

## Read-only database counts
```json
{
  "data/players.db": {
    "exists": true,
    "tables": {
      "players": 51,
      "player_files": 0
    },
    "error": null
  },
  "data/MBOX_LOCKER/mbox_metadata.db": {
    "exists": true,
    "tables": {
      "chain_of_custody": 48
    },
    "error": null
  }
}
```

## Remediation options
For each unresolved dependency ID: register it in gems/registry.json, retire the dependency reference from gem-paralegal-exports, or add a placeholder/planned registry entry.

Observed implementation files exist for all three unresolved IDs, so the register option can be prepared without creating new evidence artifacts.

## Files that would need modification if approved
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/gems/registry.json
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/gems/README.md
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/README.md

## Verification checks after approval
- Parse gems/registry.json as JSON.
- Recompute dependencies minus registered IDs and confirm unresolved=[].
- Confirm referenced implementation paths exist.
- Run git diff/status for gems/registry.json, gems/README.md, and README.md.

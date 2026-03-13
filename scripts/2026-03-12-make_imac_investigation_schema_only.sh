#!/usr/bin/env bash
set -euo pipefail

SRC_DB="/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/imac_2025-06-01_chatdb_old_mac_os_no_decode_needed/2025-06-01_original_file_from_imac/chat.db"
DST_DB="/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/imac_2025-06-01_chatdb_old_mac_os_no_decode_needed/2025-06-01_targeted_investigation_pruned.db"

# List of identifiers from the user request
TARGET_IDS=(
    "joe@rowboatcreative.com"
    "+17736109104"
    "lucas@rowboatcreative.com"
    "+18478280944@tmomail.net"
    "+18478280944"
    "+17043407505"
    "+17738529219"
    "+17083075156"
    "+17204540129"
    "+18473801876"
    "+13127254059"
    "+18478040165"
    "+18473870518"
    "george.g@rudderservices.com"
    "+13124203036"
    "+16307018110"
    "abel@rowboatcreative.com"
    "+17736366744"
    "patrick@rowboatcreative.com"
    "+14847588413"
    "jay@rowboatcreative.com"
    "+17733549538"
    "stephanie@rowboatcreative.com"
    "+12245670848"
    "+17737190088"
    "fiddes56@gmail.com"
    "+13093393391"
    "taylor@pendulum-creative.com"
    "+18043176988"
    "+17738515303"
    "+17735161720"
    "+13122753110"
    "+13128487283"
    "+19135485577"
    "+14066721522"
    "+17577495856"
    "+15105026585"
    "+17735584454"
    "+18572212405"
    "+17739722946"
    "+16309955836"
    "+17733019422"
    "+16304325005"
    "+16302729916"
)

# Build SQL IN list
ID_LIST=$(printf "'%s'," "${TARGET_IDS[@]}")
ID_LIST=${ID_LIST%,}

if [ -f "$DST_DB" ]; then
  echo "Overwriting $DST_DB..."
  rm "$DST_DB"
fi

echo "Copying full iMac DB..."
cp "$SRC_DB" "$DST_DB"

echo "Reducing iMac DB to targeted investigation chats only..."
sqlite3 "$DST_DB" <<SQL
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS messages_to_keep;
CREATE TEMP TABLE messages_to_keep (message_id INTEGER PRIMARY KEY);

WITH 
  target_handles AS (
    SELECT ROWID AS h FROM handle WHERE id IN ($ID_LIST)
  ),
  chats_to_keep AS (
    SELECT DISTINCT chat_id 
    FROM chat_handle_join 
    WHERE handle_id IN (SELECT h FROM target_handles)
  )
INSERT INTO messages_to_keep(message_id)
SELECT DISTINCT message_id
FROM chat_message_join
WHERE chat_id IN (SELECT chat_id FROM chats_to_keep);

-- Prune message table
DELETE FROM message
WHERE ROWID NOT IN (SELECT message_id FROM messages_to_keep);

-- Prune joins
DELETE FROM chat_message_join
WHERE message_id NOT IN (SELECT message_id FROM messages_to_keep);

-- Prune chats
DELETE FROM chat
WHERE ROWID NOT IN (
  SELECT DISTINCT chat_id FROM chat_message_join
);

-- Prune chat_handle_join
DELETE FROM chat_handle_join
WHERE chat_id NOT IN (SELECT DISTINCT chat_id FROM chat_message_join);

-- Prune handles
DELETE FROM handle
WHERE ROWID NOT IN (
    SELECT DISTINCT handle_id FROM chat_handle_join
);

VACUUM;
SQL

echo "Pruning complete."
echo "Created targeted iMac investigation DB at:"
echo "  $DST_DB"

# Quick verification
SIZE_SRC=$(du -h "$SRC_DB" | cut -f1)
SIZE_DST=$(du -h "$DST_DB" | cut -f1)
MSG_COUNT=$(sqlite3 "$DST_DB" "SELECT count(*) FROM message;")

echo "Source iMac Size: $SIZE_SRC"
echo "Pruned iMac Size: $SIZE_DST"
echo "Final iMac Message Count: $MSG_COUNT"

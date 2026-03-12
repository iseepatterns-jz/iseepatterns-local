#!/usr/bin/env bash
set -euo pipefail

SRC_DB="/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/m1studio_2025-05-31_chatdb_decodedBody_added/db/decoded/2025-05-31_decoded_body_all_chat_from_m1studio.db"
DST_DB="/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/m1studio_2025-05-31_chatdb_decodedBody_added/db/decoded/2025-05-31_jz_lg_full_schema_only.db"

JZ_NUMBER="+17736109104"
LG_NUMBER="+18478280944"

if [ -f "$DST_DB" ]; then
  echo "Refusing to overwrite $DST_DB"
  exit 1
fi

echo "Copying full DB..."
cp "$SRC_DB" "$DST_DB"

echo "Dropping the plugin trigger in the copy..."
sqlite3 "$DST_DB" "DROP TRIGGER IF EXISTS after_delete_on_message_plugin;"

echo "Reducing DB to JZ/LG chats only..."
sqlite3 "$DST_DB" <<SQL
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS messages_to_keep;
CREATE TEMP TABLE messages_to_keep (message_id INTEGER PRIMARY KEY);

WITH
  jz AS (
    SELECT ROWID AS h FROM handle WHERE id = '$JZ_NUMBER'
  ),
  lg AS (
    SELECT ROWID AS h FROM handle WHERE id = '$LG_NUMBER'
  ),
  chats_jz AS (
    SELECT DISTINCT chat_id
    FROM chat_handle_join
    WHERE handle_id = (SELECT h FROM jz)
  ),
  chats_lg AS (
    SELECT DISTINCT chat_id
    FROM chat_handle_join
    WHERE handle_id = (SELECT h FROM lg)
  ),
  chats_jz_lg AS (
    SELECT DISTINCT cj.chat_id
    FROM chats_jz cj
    JOIN chats_lg cl ON cj.chat_id = cl.chat_id
  )
INSERT INTO messages_to_keep(message_id)
SELECT DISTINCT message_id
FROM chat_message_join
WHERE chat_id IN (SELECT chat_id FROM chats_jz_lg);

DELETE FROM message
WHERE ROWID NOT IN (SELECT message_id FROM messages_to_keep);

DELETE FROM chat_message_join
WHERE message_id NOT IN (SELECT message_id FROM messages_to_keep);

DELETE FROM chat
WHERE ROWID NOT IN (
  SELECT DISTINCT chat_id
  FROM chat_message_join
);

DELETE FROM chat_handle_join
WHERE chat_id NOT IN (SELECT DISTINCT chat_id FROM chat_message_join)
   OR handle_id NOT IN (
        SELECT ROWID FROM handle
        WHERE id IN ('$JZ_NUMBER', '$LG_NUMBER')
      );

DELETE FROM handle
WHERE id NOT IN ('$JZ_NUMBER', '$LG_NUMBER');

VACUUM;
SQL

echo "Created reduced full-schema DB at:"
echo "  $DST_DB"

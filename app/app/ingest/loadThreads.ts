import fs from 'node:fs';
import path from 'node:path';
import { ThreadDocMeta } from '../../types/documents/ThreadDocMeta';


export interface ThreadMessage {
    id: string; // eml filename or per-message id
    subject: string;
    from: string;
    to: string[];
    cc: string[];
    bcc: string[];
    body_clean: string;
    message_id?: string;
    in_reply_to?: string;
    references?: string[];
}

export interface ThreadJson {
    thread_subject: string;
    message_count: number;
    messages: ThreadMessage[];
}

const THREAD_BASE = path.join(
    process.cwd(),
    'data',
    'EMAIL_THREAD_PUBLISH_LOCKER',
    'processed',
    'json',
);

export interface ThreadDocument {
    id: string;
    meta: ThreadDocMeta;
    text: string;
}

export function loadThreadDocuments(): ThreadDocument[] {
    const files = fs
        .readdirSync(THREAD_BASE)
        .filter((f) => f.startsWith('thread_') && f.endsWith('.json'));

    const docs: ThreadDocument[] = [];

    for (const file of files) {
        const fullPath = path.join(THREAD_BASE, file);
        const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as ThreadJson;

        const bodyText = raw.messages
            .map((m) => {
                const header = [
                    m.message_id ? `Message-ID: ${m.message_id}` : null,
                    `From: ${m.from}`,
                    `To: ${m.to.join(', ')}`,
                    `Subject: ${m.subject}`,
                ]
                    .filter(Boolean)
                    .join('\n');
                return `${header}\n\n${m.body_clean}`.trim();
            })
            .join('\n\n---\n\n');

        const id = file.replace(/\.json$/, '');

        docs.push({
            id,
            meta: {
                id,
                source: 'threads',
                path: fullPath,
                title: raw.thread_subject || '(no subject)',
                threadSubject: raw.thread_subject,
                messageCount: raw.message_count,
                threadRootId:
                    raw.messages[0]?.references?.[0] ??
                    raw.messages[0]?.message_id ??
                    undefined,
            },
            text: bodyText,
        });
    }

    return docs;
}

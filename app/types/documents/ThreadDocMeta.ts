export interface ThreadDocMeta {
    id: string;
    title: string;
    summary: string;
    bullets: string[];
    body_snippet: string;
    tags: string[];
    extra: Record<string, any>;
}
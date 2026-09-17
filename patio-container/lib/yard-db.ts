import { env } from 'cloudflare:workers';
export function yardDb() { if (!env.DB) throw new Error('Database unavailable'); return env.DB; }

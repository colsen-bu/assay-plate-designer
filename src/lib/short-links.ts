import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { decodePlateNotation } from './plate-notation';

const SHORT_ID_LENGTH = 8;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'short-links.json');

interface ShortLinkStore {
  idToNotation: Record<string, string>;
  notationToId: Record<string, string>;
}

let memoryStore: ShortLinkStore | null = null;
let writeLock: Promise<void> = Promise.resolve();

function generateShortId(length: number = SHORT_ID_LENGTH): string {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

async function loadStore(): Promise<ShortLinkStore> {
  if (memoryStore) {
    return memoryStore;
  }

  try {
    const raw = await fs.readFile(DATA_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ShortLinkStore>;
    memoryStore = {
      idToNotation: parsed.idToNotation ?? {},
      notationToId: parsed.notationToId ?? {},
    };
  } catch {
    memoryStore = {
      idToNotation: {},
      notationToId: {},
    };
  }

  return memoryStore;
}

async function saveStore(store: ShortLinkStore): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(store), 'utf8');
}

async function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = writeLock;
  let releaseLock: () => void = () => {};
  writeLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  await previous;
  try {
    return await operation();
  } finally {
    releaseLock();
  }
}

export function extractNotationFromShareUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
    const params = new URLSearchParams(hash);
    const pn = params.get('pn');
    if (!pn) {
      return null;
    }

    const decoded = decodeURIComponent(pn);
    return decodePlateNotation(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export async function createShortLink(notation: string): Promise<{ id: string; notation: string }> {
  const normalized = notation.trim();
  if (!decodePlateNotation(normalized)) {
    throw new Error('Invalid plate notation');
  }

  return withWriteLock(async () => {
    const store = await loadStore();

    const existing = store.notationToId[normalized];
    if (existing) {
      return { id: existing, notation: normalized };
    }

    let id = generateShortId();
    while (store.idToNotation[id]) {
      id = generateShortId();
    }

    store.idToNotation[id] = normalized;
    store.notationToId[normalized] = id;

    await saveStore(store);
    return { id, notation: normalized };
  });
}

export async function getNotationByShortId(id: string): Promise<string | null> {
  const store = await loadStore();
  return store.idToNotation[id] ?? null;
}

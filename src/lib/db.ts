import Database from "@tauri-apps/plugin-sql";
import { TranscriptEntry, ToneMode } from "@/store/useAppStore";

let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:transcripts.db");
    await _db.execute(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw TEXT NOT NULL,
        polished TEXT NOT NULL,
        tone TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);
  }
  return _db;
}

export async function saveTranscript(
  raw: string,
  polished: string,
  tone: ToneMode,
  timestamp: number
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO transcripts (raw, polished, tone, timestamp) VALUES (?, ?, ?, ?)",
    [raw, polished, tone, timestamp]
  );
}

export async function loadHistory(limit = 50): Promise<TranscriptEntry[]> {
  const db = await getDb();
  const rows = await db.select<TranscriptEntry[]>(
    "SELECT id, raw, polished, tone, timestamp FROM transcripts ORDER BY timestamp DESC LIMIT ?",
    [limit]
  );
  return rows;
}

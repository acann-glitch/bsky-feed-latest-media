import Database from 'better-sqlite3'

export function createDb(location = 'feed.db') {
  const db = new Database(location)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      uri        TEXT PRIMARY KEY,
      cid        TEXT NOT NULL,
      author     TEXT NOT NULL,
      indexed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cursor_state (
      id      INTEGER PRIMARY KEY CHECK (id = 1),
      time_us INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO cursor_state (id, time_us) VALUES (1, 0);

    CREATE INDEX IF NOT EXISTS idx_posts_author     ON posts (author);
    CREATE INDEX IF NOT EXISTS idx_posts_indexed_at ON posts (indexed_at DESC);
  `)

  return db
}

export type Db = ReturnType<typeof createDb>

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'news.sqlite');

const db = new sqlite3.Database(DB_PATH, (error) => {
  if (error) {
    console.error('[db] Connection error:', error.message);
  } else {
    console.info('[db] Connected:', DB_PATH);
  }
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

async function initializeDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image TEXT,
      source TEXT,
      url TEXT,
      published_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(title, source, published_at)
    )
  `);

  await run('CREATE INDEX IF NOT EXISTS idx_news_category ON news(category)');
  await run('CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC)');
}

module.exports = {
  all,
  db,
  initializeDatabase,
  run,
};

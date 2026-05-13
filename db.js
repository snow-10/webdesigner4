import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('Created directory:', dbDir);
}

const dbPath = path.join(dbDir, 'sqlite.db');

const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open or create database at', dbPath, '\n', err.message);
  } else {
    console.log('Successfully opened (or created) database at', dbPath);
  }
});

// Ensure `milk_cpi` table exists with columns: year (INTEGER), month (INTEGER), cpi (REAL)
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS milk_cpi (
      year INTEGER,
      month INTEGER,
      cpi REAL
    )`,
    (err) => {
      if (err) {
        console.error('Failed to create or verify table milk_cpi:', err.message);
      } else {
        console.log('Table `milk_cpi` is ready (exists or created).');
      }
    }
  );
});

// NOTE: file-reading/import functions removed per user request.

export default db;

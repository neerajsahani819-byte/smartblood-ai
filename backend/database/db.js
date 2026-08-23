import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.resolve(__dirname);
const DB_FILE = path.join(DB_DIR, 'smartblood.sqlite');

let dbInstance = null;

export async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs();

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  let db;
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  dbInstance = {
    _db: db,
    save() {
      try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_FILE, buffer);
      } catch (err) {
        console.error('Failed to persist SQLite database to disk:', err);
      }
    },
    exec(sql) {
      db.exec(sql);
      this.save();
    },
    run(sql, params = []) {
      db.run(sql, params);
      // Fetch last insert ID immediately before saving/exporting
      let id = null;
      try {
        const result = db.exec("SELECT last_insert_rowid() AS id");
        if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
          id = result[0].values[0][0];
        }
      } catch (err) {
        console.error('Failed to get last_insert_rowid:', err);
      }
      this.save();
      return { lastInsertRowid: id };
    },
    get(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      let row = null;
      if (stmt.step()) {
        row = stmt.getAsObject();
      }
      stmt.free();
      return row;
    },
    all(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    }
  };

  return dbInstance;
}

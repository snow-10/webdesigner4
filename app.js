import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Open SQLite database directly here (do not import db.js)
const sqlite = sqlite3.verbose();
const dbPath = path.join(__dirname, 'db', 'sqlite.db');
const db = new sqlite.Database(dbPath, (err) => {
	if (err) {
		console.error('Failed to open database at', dbPath, '\n', err.message);
	} else {
		console.log('Successfully opened (or created) database at', dbPath);
	}
});

// expose db to request handlers via app.locals
// handlers can access via req.app.locals.db or app.locals.db
app && (app.locals = app.locals || {});
app.locals.db = db;

app.use(express.static(path.join(__dirname, 'public')));

// API: 回傳 milk_cpi 資料表所有資料，依 year, month 遞增排序
app.get('/api/cpi', (req, res) => {
  const dbRef = req.app && req.app.locals && req.app.locals.db;
  if (!dbRef) return res.status(500).json({ error: 'Database not available' });

  const sql = 'SELECT year, month, cpi FROM milk_cpi ORDER BY year ASC, month ASC';
  dbRef.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ data: rows });
  });
});

// API: 以 query 參數 year, month 查詢特定年月的 milk_cpi 資料
// 若未提供 month，預設為 0。兩參數會被轉為整數。
app.get('/api/cpi/search', (req, res) => {
  const dbRef = req.app && req.app.locals && req.app.locals.db;
  if (!dbRef) return res.status(500).json({ error: 'Database not available' });

  const yearParam = req.query.year;
  if (yearParam == null) return res.status(400).json({ error: 'Missing required parameter: year' });

  const year = parseInt(yearParam, 10);
  if (Number.isNaN(year)) return res.status(400).json({ error: 'Invalid year parameter' });

  let month = 0;
  if (req.query.month != null && req.query.month !== '') {
    month = parseInt(req.query.month, 10);
    if (Number.isNaN(month)) return res.status(400).json({ error: 'Invalid month parameter' });
  }

  const sql = 'SELECT year, month, cpi FROM milk_cpi WHERE year = ? AND month = ? ORDER BY year ASC, month ASC';
  dbRef.all(sql, [year, month], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ data: rows });
  });
});

// API: 以 POST 新增 milk_cpi 一筆資料 (year, month, cpi)
// 回傳純文字訊息（非 JSON）
app.post('/api/insert', (req, res) => {
  const dbRef = req.app && req.app.locals && req.app.locals.db;
  if (!dbRef) return res.status(500).type('text').send('Database not available');

  const { year: yearParam, month: monthParam, cpi: cpiParam } = req.body || {};

  if (yearParam == null) return res.status(400).type('text').send('Missing required field: year');

  const year = parseInt(yearParam, 10);
  if (Number.isNaN(year)) return res.status(400).type('text').send('Invalid year');

  let month = 0;
  if (monthParam != null && monthParam !== '') {
    month = parseInt(monthParam, 10);
    if (Number.isNaN(month)) return res.status(400).type('text').send('Invalid month');
  }

  if (cpiParam == null) return res.status(400).type('text').send('Missing required field: cpi');
  const cpi = parseFloat(String(cpiParam).replace(/,/g, ''));
  if (Number.isNaN(cpi)) return res.status(400).type('text').send('Invalid cpi');

  const sql = 'INSERT INTO milk_cpi (year, month, cpi) VALUES (?, ?, ?)';
  // 檢查是否已存在相同 year & month 的記錄，若存在視為重複
  const checkSql = 'SELECT COUNT(*) AS cnt FROM milk_cpi WHERE year = ? AND month = ?';
  dbRef.get(checkSql, [year, month], (chkErr, row) => {
    if (chkErr) return res.status(500).type('text').send('Check failed: ' + chkErr.message);
    const exists = row && row.cnt && row.cnt > 0;
    if (exists) return res.status(409).type('text').send('Duplicate entry');

    dbRef.run(sql, [year, month, cpi], function (err) {
      if (err) return res.status(500).type('text').send('Insert failed: ' + err.message);
      return res.type('text').send('Insert successful');
    });
  });
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

export default app;

const cors = require("cors");
app.use(cors());

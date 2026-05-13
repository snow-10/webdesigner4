import db, { importMilkCpiFromJson } from '../db.js';

(async () => {
  try {
    const inserted = await importMilkCpiFromJson();
    db.get('SELECT COUNT(*) AS cnt FROM milk_cpi', (err, row) => {
      if (err) {
        console.error('Query error:', err);
        process.exit(1);
      }
      console.log(`Inserted rows: ${inserted} | Total rows in milk_cpi: ${row.cnt}`);
      process.exit(0);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

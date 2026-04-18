const db = require('./db');
(async () => {
    try {
        const res = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('--- Tables in database ---');
        res.rows.forEach(r => console.log(`- ${r.table_name}`));
        process.exit(0);
    } catch (e) {
        console.error('DB Error:', e.message);
        process.exit(1);
    }
})();

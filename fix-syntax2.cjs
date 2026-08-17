const fs = require('fs');
let sql = fs.readFileSync('migrations/0000_flashy_warpath.sql', 'utf-8');
sql = sql.replace(/DO  BEGIN/g, 'DO $$ BEGIN');
sql = sql.replace(/END ;/g, 'END $$;');
fs.writeFileSync('migrations/0000_flashy_warpath.sql', sql);
console.log('Fixed syntax correctly');

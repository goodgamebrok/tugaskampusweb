const fs = require('fs');
let sql = fs.readFileSync('migrations/0000_flashy_warpath.sql', 'utf-8');

// Replace CREATE TYPE with DO block
sql = sql.replace(/CREATE TYPE "public"\."([^"]+)" AS ENUM\(([^)]+)\);/g, 
'DO $$ BEGIN\n    CREATE TYPE "public"."$1" AS ENUM($2);\nEXCEPTION\n    WHEN duplicate_object THEN null;\nEND $$;');

// Replace CREATE TABLE with CREATE TABLE IF NOT EXISTS
sql = sql.replace(/CREATE TABLE "([^"]+)" \(/g, 'CREATE TABLE IF NOT EXISTS "$1" (');

// Replace ALTER TABLE ... ADD CONSTRAINT with DO block
sql = sql.replace(/ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" ([^;]+);/g, 
'DO $$ BEGIN\n    ALTER TABLE "$1" ADD CONSTRAINT "$2" $3;\nEXCEPTION\n    WHEN duplicate_object THEN null;\nEND $$;');

fs.writeFileSync('migrations/0000_flashy_warpath.sql', sql);
console.log('Migration modified successfully');

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // connect to default database first
    password: 'password', // use your password
    port: 5432,
});

async function setupDatabase() {
    try {
        console.log('🔧 جاري إعداد قاعدة البيانات...');
        
        // إنشاء قاعدة البيانات
        await pool.query('CREATE DATABASE school_system');
        console.log('✅ تم إنشاء قاعدة البيانات');
        
        // الاتصال بقاعدة البيانات الجديدة
        const schoolPool = new Pool({
            user: 'postgres',
            host: 'localhost',
            database: 'school_system',
            password: 'password',
            port: 5432,
        });

        // قراءة ملف SQL وتنفيذه
        const sqlFile = path.join(__dirname, 'database.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        await schoolPool.query(sql);
        console.log('✅ تم إنشاء الجداول بنجاح');
        
        console.log('🎉 اكتمل إعداد قاعدة البيانات!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ خطأ في إعداد قاعدة البيانات:', error.message);
        process.exit(1);
    }
}

setupDatabase();
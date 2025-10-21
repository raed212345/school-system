const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.database.connectionString,
  ssl: config.database.ssl
});

async function initDatabase() {
  try {
    console.log('🔧 جاري إعداد قاعدة البيانات...');
    
    const createTables = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
        grade VARCHAR(20),
        section VARCHAR(10),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS classrooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        grade VARCHAR(20) NOT NULL,
        teacher_id INTEGER REFERENCES users(id),
        class_code VARCHAR(10) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS class_members (
        id SERIAL PRIMARY KEY,
        classroom_id INTEGER REFERENCES classrooms(id),
        user_id INTEGER REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(classroom_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        classroom_id INTEGER REFERENCES classrooms(id),
        teacher_id INTEGER REFERENCES users(id),
        due_date TIMESTAMP NOT NULL,
        max_points INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER REFERENCES assignments(id),
        student_id INTEGER REFERENCES users(id),
        answer_text TEXT,
        explanation TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        grade INTEGER,
        teacher_feedback TEXT,
        status VARCHAR(20) DEFAULT 'submitted'
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        classroom_id INTEGER REFERENCES classrooms(id),
        user_id INTEGER REFERENCES users(id),
        message_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS director_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        message_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message_text TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createTables);
    console.log('✅ تم إنشاء الجداول بنجاح');

  } catch (error) {
    console.error('❌ خطأ في إنشاء الجداول:', error.message);
  }
}

module.exports = { initDatabase };
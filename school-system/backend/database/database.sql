-- قاعدة بيانات المدرسة الإلكترونية
CREATE DATABASE school_system;
\c school_system;

-- جدول المستخدمين
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    grade VARCHAR(20),
    section VARCHAR(10),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الغرف الصفية
CREATE TABLE classrooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    section VARCHAR(10),
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    class_code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول أعضاء الغرف الصفية
CREATE TABLE class_members (
    id SERIAL PRIMARY KEY,
    classroom_id INTEGER REFERENCES classrooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(classroom_id, user_id)
);

-- جدول الواجبات
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    classroom_id INTEGER REFERENCES classrooms(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    due_date TIMESTAMP NOT NULL,
    max_points INTEGER DEFAULT 100,
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول تقديم الواجبات
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    answer_text TEXT,
    explanation TEXT,
    attachments JSONB,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMP,
    grade INTEGER,
    teacher_feedback TEXT,
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned'))
);

-- جدول الدردشة
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    classroom_id INTEGER REFERENCES classrooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'assignment', 'announcement')),
    attachment_url VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الإشعارات
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    related_id INTEGER,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول اتصال المدير
CREATE TABLE director_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('suggestion', 'complaint', 'project', 'general')),
    title VARCHAR(255) NOT NULL,
    message_text TEXT NOT NULL,
    admin_response TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- إدراجات نموذجية
-- كلمة مرور المشرف: Admin123456
INSERT INTO users (full_name, username, password_hash, role) VALUES 
('المدير العام', 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- معلمين نموذجيين - كلمة المرور: Teacher123
INSERT INTO users (full_name, username, password_hash, role) VALUES 
('أحمد محمد', 'ahmed_teacher', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher'),
('فاطمة عبدالله', 'fatima_teacher', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher');

-- طلاب نموذجيين - كلمة المرور: Student123
INSERT INTO users (full_name, username, password_hash, role, grade, section) VALUES 
('خالد سعيد', 'khaled_student', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', '7', 'أ'),
('سارة علي', 'sara_student', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', '7', 'أ'),
('محمد حسن', 'mohammed_student', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', '8', 'ب');

-- فهارس لتحسين الأداء
CREATE INDEX idx_classrooms_teacher_id ON classrooms(teacher_id);
CREATE INDEX idx_class_members_classroom_id ON class_members(classroom_id);
CREATE INDEX idx_class_members_user_id ON class_members(user_id);
CREATE INDEX idx_assignments_classroom_id ON assignments(classroom_id);
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_messages_classroom_id ON messages(classroom_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- تحديث التاريخ التلقائي
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
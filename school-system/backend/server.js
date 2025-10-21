const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Pool } = require('pg');
const config = require('./config');
const { initDatabase } = require('./database/init');

const app = express();
const PORT = config.server.port;
const JWT_SECRET = config.jwt.secret;

const pool = new Pool({
  connectionString: config.database.connectionString,
  ssl: config.database.ssl
});

initDatabase();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'رمز الدخول مطلوب' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'رمز الدخول غير صالح' });
        }
        req.user = user;
        next();
    });
};

app.post('/api/auth/register', async (req, res) => {
    try {
        const { fullName, username, password, role, grade, section } = req.body;

        if (!fullName || !username || !password || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'جميع الحقول مطلوبة' 
            });
        }

        const userExists = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'اسم المستخدم موجود مسبقاً'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (full_name, username, password_hash, role, grade, section, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, full_name, username, role, grade, section`,
            [fullName, username, hashedPassword, role, grade, section]
        );

        const user = result.rows[0];

        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح',
            data: {
                user: {
                    id: user.id,
                    fullName: user.full_name,
                    username: user.username,
                    role: user.role,
                    grade: user.grade,
                    section: user.section
                },
                token
            }
        });

    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم'
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND role = $2',
            [username, role]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
            });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
            });
        }

        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            data: {
                user: {
                    id: user.id,
                    fullName: user.full_name,
                    username: user.username,
                    role: user.role,
                    grade: user.grade,
                    section: user.section
                },
                token
            }
        });

    } catch (error) {
        console.error('خطأ في الدخول:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم'
        });
    }
});

app.get('/api/teacher/stats', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user.userId;

        const classroomsResult = await pool.query(
            'SELECT COUNT(*) FROM classrooms WHERE teacher_id = $1',
            [teacherId]
        );

        const assignmentsResult = await pool.query(
            'SELECT COUNT(*) FROM assignments WHERE teacher_id = $1 AND due_date > NOW()',
            [teacherId]
        );

        const gradingResult = await pool.query(
            `SELECT COUNT(*) FROM submissions s 
             JOIN assignments a ON s.assignment_id = a.id 
             WHERE a.teacher_id = $1 AND s.status = 'submitted'`,
            [teacherId]
        );

        res.json({
            success: true,
            data: {
                classrooms: parseInt(classroomsResult.rows[0].count),
                assignments: parseInt(assignmentsResult.rows[0].count),
                pendingGrading: parseInt(gradingResult.rows[0].count),
                newMessages: 0
            }
        });
    } catch (error) {
        console.error('خطأ في جلب الإحصائيات:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

app.post('/api/teacher/classrooms', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user.userId;
        const { name, subject, grade } = req.body;

        const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const result = await pool.query(
            `INSERT INTO classrooms (name, subject, grade, teacher_id, class_code, created_at) 
             VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, name, subject, grade, class_code`,
            [name, subject, grade, teacherId, classCode]
        );

        res.json({
            success: true,
            message: 'تم إنشاء الغرفة بنجاح',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('خطأ في إنشاء الغرفة:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

app.get('/api/teacher/classrooms', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user.userId;

        const result = await pool.query(
            `SELECT c.*, COUNT(cm.user_id) as student_count 
             FROM classrooms c 
             LEFT JOIN class_members cm ON c.id = cm.classroom_id 
             WHERE c.teacher_id = $1 
             GROUP BY c.id 
             ORDER BY c.created_at DESC`,
            [teacherId]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('خطأ في جلب الغرف:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

app.get('/api/student/stats', authenticateToken, async (req, res) => {
    try {
        const studentId = req.user.userId;

        const classroomsResult = await pool.query(
            'SELECT COUNT(*) FROM class_members WHERE user_id = $1',
            [studentId]
        );

        const assignmentsResult = await pool.query(
            `SELECT COUNT(*) FROM assignments a 
             JOIN class_members cm ON a.classroom_id = cm.classroom_id 
             WHERE cm.user_id = $1 AND a.due_date > NOW() 
             AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.student_id = $1)`,
            [studentId]
        );

        const submittedResult = await pool.query(
            'SELECT COUNT(*) FROM submissions WHERE student_id = $1',
            [studentId]
        );

        res.json({
            success: true,
            data: {
                classrooms: parseInt(classroomsResult.rows[0].count),
                newAssignments: parseInt(assignmentsResult.rows[0].count),
                submittedAssignments: parseInt(submittedResult.rows[0].count),
                newMessages: 0
            }
        });
    } catch (error) {
        console.error('خطأ في جلب إحصائيات الطالب:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

app.post('/api/student/classrooms/join', authenticateToken, async (req, res) => {
    try {
        const studentId = req.user.userId;
        const { classCode } = req.body;

        const classroomResult = await pool.query(
            'SELECT id FROM classrooms WHERE class_code = $1',
            [classCode]
        );

        if (classroomResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'رمز الغرفة غير صحيح'
            });
        }

        const classroomId = classroomResult.rows[0].id;

        const existingMember = await pool.query(
            'SELECT id FROM class_members WHERE classroom_id = $1 AND user_id = $2',
            [classroomId, studentId]
        );

        if (existingMember.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'أنت منضم already إلى هذه الغرفة'
            });
        }

        await pool.query(
            'INSERT INTO class_members (classroom_id, user_id) VALUES ($1, $2)',
            [classroomId, studentId]
        );

        res.json({
            success: true,
            message: 'تم الانضمام إلى الغرفة بنجاح'
        });

    } catch (error) {
        console.error('خطأ في الانضمام للغرفة:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

app.get('/api/student/classrooms', authenticateToken, async (req, res) => {
    try {
        const studentId = req.user.userId;

        const result = await pool.query(
            `SELECT c.*, u.full_name as teacher_name, cm.joined_at,
                    (SELECT COUNT(*) FROM class_members WHERE classroom_id = c.id) as student_count
             FROM classrooms c
             JOIN class_members cm ON c.id = cm.classroom_id
             JOIN users u ON c.teacher_id = u.id
             WHERE cm.user_id = $1
             ORDER BY cm.joined_at DESC`,
            [studentId]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('خطأ في جلب غرف الطالب:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

app.get('/api/student/assignments', authenticateToken, async (req, res) => {
    try {
        const studentId = req.user.userId;

        const result = await pool.query(
            `SELECT a.*, c.name as classroom_name, 
                    s.id as submission_id, s.submitted_at, s.grade, s.status as submission_status,
                    (s.id IS NOT NULL) as submitted
             FROM assignments a
             JOIN class_members cm ON a.classroom_id = cm.classroom_id
             JOIN classrooms c ON a.classroom_id = c.id
             LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = $1
             WHERE cm.user_id = $1
             ORDER BY a.due_date ASC`,
            [studentId]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('خطأ في جلب واجبات الطالب:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 الخادم يعمل على البورت: ${PORT}`);
});
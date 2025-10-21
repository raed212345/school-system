// ملف إدارة المصادقة والتسجيل
class AuthManager {
    constructor() {
        this.initEventListeners();
        this.checkExistingSession();
    }

    initEventListeners() {
        // نموذج تسجيل الدخول
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // نموذج إنشاء حساب
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // عرض نموذج التسجيل
        const showRegisterBtn = document.getElementById('showRegister');
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterModal();
            });
        }

        // إغلاق نموذج التسجيل
        const closeRegisterBtn = document.getElementById('closeRegister');
        if (closeRegisterBtn) {
            closeRegisterBtn.addEventListener('click', () => this.hideRegisterModal());
        }

        const cancelRegisterBtn = document.getElementById('cancelRegister');
        if (cancelRegisterBtn) {
            cancelRegisterBtn.addEventListener('click', () => this.hideRegisterModal());
        }

        // تغيير الدور في التسجيل
        const regRoleSelect = document.getElementById('regRole');
        if (regRoleSelect) {
            regRoleSelect.addEventListener('change', (e) => this.toggleGradeFields(e.target.value));
        }

        // تغيير الدور في الدخول
        const loginRoleSelect = document.getElementById('role');
        if (loginRoleSelect) {
            loginRoleSelect.addEventListener('change', (e) => this.handleRoleChange(e.target.value));
        }
    }

    toggleGradeFields(role) {
        const gradeField = document.getElementById('gradeField');
        const sectionField = document.getElementById('sectionField');
        
        if (role === 'student') {
            gradeField.style.display = 'block';
            sectionField.style.display = 'block';
        } else {
            gradeField.style.display = 'none';
            sectionField.style.display = 'none';
        }
    }

    handleRoleChange(role) {
        // يمكن إضافة منطق إضافي هنا إذا لزم الأمر
        console.log('الدور المختار:', role);
    }

    showRegisterModal() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    hideRegisterModal() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.clearRegisterForm();
        }
    }

    clearRegisterForm() {
        const form = document.getElementById('registerForm');
        if (form) {
            form.reset();
            this.toggleGradeFields('');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            username: formData.get('username'),
            password: formData.get('password'),
            role: formData.get('role')
        };

        // التحقق من صحة البيانات
        if (!this.validateLoginData(data)) {
            return;
        }

        // عرض حالة التحميل
        this.setLoginButtonState(true);

        try {
            const response = await this.makeRequest('/api/auth/login', 'POST', data);
            
            if (response.success) {
                this.saveUserSession(response.data);
                this.showMessage('تم تسجيل الدخول بنجاح!', 'success');
                
                // توجيه المستخدم حسب دوره
                setTimeout(() => {
                    this.redirectToDashboard(response.data.user.role);
                }, 1000);
            } else {
                this.showMessage(response.message || 'فشل في تسجيل الدخول', 'error');
            }
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            this.showMessage('حدث خطأ في الاتصال بالخادم', 'error');
        } finally {
            this.setLoginButtonState(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            fullName: formData.get('fullName'),
            username: formData.get('username'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            role: formData.get('role'),
            grade: formData.get('grade'),
            section: formData.get('section')
        };

        // التحقق من صحة البيانات
        if (!this.validateRegisterData(data)) {
            return;
        }

        try {
            const response = await this.makeRequest('/api/auth/register', 'POST', data);
            
            if (response.success) {
                this.showMessage('تم إنشاء الحساب بنجاح!', 'success', 'registerForm');
                this.hideRegisterModal();
                
                // تعبئة بيانات الدخول تلقائياً
                document.getElementById('username').value = data.username;
                document.getElementById('role').value = data.role;
            } else {
                this.showMessage(response.message || 'فشل في إنشاء الحساب', 'error', 'registerForm');
            }
        } catch (error) {
            console.error('خطأ في إنشاء الحساب:', error);
            this.showMessage('حدث خطأ في الاتصال بالخادم', 'error', 'registerForm');
        }
    }

    validateLoginData(data) {
        if (!data.username.trim()) {
            this.showMessage('يرجى إدخال اسم المستخدم', 'error');
            return false;
        }

        if (!data.password) {
            this.showMessage('يرجى إدخال كلمة المرور', 'error');
            return false;
        }

        if (!data.role) {
            this.showMessage('يرجى اختيار الدور', 'error');
            return false;
        }

        return true;
    }

    validateRegisterData(data) {
        if (!data.fullName.trim()) {
            this.showMessage('يرجى إدخال الاسم الكامل', 'error', 'registerForm');
            return false;
        }

        if (!data.username.trim()) {
            this.showMessage('يرجى إدخال اسم المستخدم', 'error', 'registerForm');
            return false;
        }

        if (data.username.length < 3) {
            this.showMessage('اسم المستخدم يجب أن يكون 3 أحرف على الأقل', 'error', 'registerForm');
            return false;
        }

        if (!data.password) {
            this.showMessage('يرجى إدخال كلمة المرور', 'error', 'registerForm');
            return false;
        }

        if (data.password.length < 6) {
            this.showMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error', 'registerForm');
            return false;
        }

        if (data.password !== data.confirmPassword) {
            this.showMessage('كلمات المرور غير متطابقة', 'error', 'registerForm');
            return false;
        }

        if (!data.role) {
            this.showMessage('يرجى اختيار الدور', 'error', 'registerForm');
            return false;
        }

        if (data.role === 'student') {
            if (!data.grade) {
                this.showMessage('يرجى اختيار الصف الدراسي', 'error', 'registerForm');
                return false;
            }
            if (!data.section?.trim()) {
                this.showMessage('يرجى إدخال الشعبة', 'error', 'registerForm');
                return false;
            }
        }

        return true;
    }

    setLoginButtonState(loading) {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            const btnText = loginBtn.querySelector('.btn-text');
            const btnLoading = loginBtn.querySelector('.btn-loading');
            
            if (loading) {
                btnText.style.display = 'none';
                btnLoading.style.display = 'flex';
                loginBtn.disabled = true;
            } else {
                btnText.style.display = 'block';
                btnLoading.style.display = 'none';
                loginBtn.disabled = false;
            }
        }
    }

    async makeRequest(url, method, data) {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        return await response.json();
    }

    showMessage(message, type, formType = 'login') {
        let messageElement;
        
        if (formType === 'register') {
            messageElement = document.querySelector('#registerForm .alert');
        } else {
            messageElement = document.getElementById('message');
        }

        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `alert alert-${type}`;
            messageElement.style.display = 'block';

            // إخفاء الرسالة بعد 5 ثواني
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 5000);
        }
    }

    saveUserSession(userData) {
        localStorage.setItem('user', JSON.stringify(userData.user));
        localStorage.setItem('token', userData.token);
        localStorage.setItem('lastLogin', new Date().toISOString());
    }

    checkExistingSession() {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (user && token) {
            const userData = JSON.parse(user);
            this.redirectToDashboard(userData.role);
        }
    }

    redirectToDashboard(role) {
        const dashboards = {
            'student': 'pages/student/dashboard.html',
            'teacher': 'pages/teacher/dashboard.html',
            'admin': 'pages/admin/dashboard.html'
        };

        if (dashboards[role]) {
            window.location.href = dashboards[role];
        } else {
            console.error('دور غير معروف:', role);
        }
    }

    logout() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('lastLogin');
        window.location.href = '/';
    }
}

// إدارة النماذج المنبثقة
class ModalManager {
    static openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    window.authManager = new AuthManager();
    
    // إغلاق النماذج المنبثقة عند النقر خارجها
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });

    // منع إغلاق النموذج عند النقر داخله
    document.addEventListener('click', function(e) {
        if (e.target.closest('.modal-content')) {
            e.stopPropagation();
        }
    });

    console.log('✅ نظام المصادقة جاهز للعمل');
});

// دوال مساعدة عامة
const Utils = {
    // تنسيق التاريخ
    formatDate: (date) => {
        return new Date(date).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // تقييد الوصول للصفحات
    requireAuth: (requiredRole = null) => {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const token = localStorage.getItem('token');

        if (!user || !token) {
            window.location.href = '/';
            return null;
        }

        if (requiredRole && user.role !== requiredRole) {
            window.location.href = '/pages/' + user.role + '/dashboard.html';
            return null;
        }

        return user;
    },

    // جلب بيانات المستخدم
    getCurrentUser: () => {
        return JSON.parse(localStorage.getItem('user') || 'null');
    },

    // جلب التوكن
    getToken: () => {
        return localStorage.getItem('token');
    }
};
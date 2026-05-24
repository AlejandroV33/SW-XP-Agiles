// js/auth.js

// 1. Redirigir si ya está logueado
async function checkCurrentSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    // Si hay sesión y estamos en index.html, lo mandamos al tablero
    if (session && window.location.pathname.includes('index.html')) {
        window.location.href = 'tablero.html';
    }
    // Si NO hay sesión y NO estamos en index.html, lo mandamos al login (protección de rutas)
    if (!session && !window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
    }
}

// Ejecutar revisión de sesión al cargar cualquier página
checkCurrentSession();

// 2. Lógica del formulario de Login (solo si estamos en index.html)
const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('error-msg');
        const loginBtn = document.getElementById('login-btn');

        loginBtn.textContent = 'Verificando...';
        loginBtn.disabled = true;

        // Petición a Supabase Auth
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            errorMsg.textContent = error.message;
            errorMsg.classList.remove('hidden');
            loginBtn.textContent = 'Entrar al Proyecto';
            loginBtn.disabled = false;
        } else {
            // ¡Éxito! Redirigir al tablero Kanban
            window.location.href = 'tablero.html';
        }
    });
}

// 3. Función global para cerrar sesión (la usaremos en el Navbar)
window.logout = async function() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}
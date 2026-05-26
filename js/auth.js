// js/auth.js

async function checkCurrentSession() {
    // 1. Preguntamos a Supabase si hay una sesión activa
    const { data: { session } } = await supabaseClient.auth.getSession();

    // 2. Leemos la URL actual en minúsculas
    const currentPath = window.location.pathname.toLowerCase();

    // 3. Verificamos de forma segura si estamos en la página de login
    // Esto evita problemas si tu servidor oculta el ".html"
    const isLoginPage = currentPath.includes('login');

    // REGLA A: Si NO hay sesión y NO estoy en el login -> Forzar ida al login
    if (!session && !isLoginPage) {
        window.location.replace('login.html');
        return; // Detenemos el script aquí
    }

    // REGLA B: Si HAY sesión y estoy en el login -> Forzar ida a la portada (Byte Coders)
    if (session && isLoginPage) {
        window.location.replace('index.html');
        return; // Detenemos el script aquí
    }
}

// Ejecutamos la validación
checkCurrentSession();

// Lógica del formulario de login (Solo se ejecuta si el formulario existe en el DOM)
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

        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            errorMsg.textContent = error.message;
            errorMsg.classList.remove('hidden');
            loginBtn.textContent = 'Entrar al Proyecto';
            loginBtn.disabled = false;
        } else {
            // Éxito: Lo mandamos a la portada del equipo
            window.location.replace('index.html');
        }
    });
}

// Función global para salir de la cuenta
window.logout = async function() {
    await supabaseClient.auth.signOut();
    window.location.replace('login.html');
}
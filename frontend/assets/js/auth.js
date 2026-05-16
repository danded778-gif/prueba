// ============================================
// auth.js - Autenticación
// ============================================

function mostrarModalLogin() {
    const modal = document.getElementById("modal-login");
    if (modal) modal.style.display = "flex";
}

function cerrarModalLogin() {
    const modal = document.getElementById("modal-login");
    if (modal) modal.style.display = "none";
    const usuarioInput = document.getElementById("login-nombre");
    const passInput = document.getElementById("login-password");
    if (usuarioInput) usuarioInput.value = "";
    if (passInput) passInput.value = "";
}

// Función principal para iniciar sesión (conecta con el backend)
async function iniciarSesion(nombre, password) {
    const btn = document.getElementById('btn-login');
    const errorDiv = document.getElementById('login-error');

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando...';
        }
        if (errorDiv) errorDiv.style.display = "none";

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, password })
        });

        const data = await response.json();

        if (data.success && data.token) {
            // ✅ SOLO guardamos el token. Nada de roles sueltos o nombres sueltos.
            localStorage.setItem('token', data.token);
            
            // Redirigir según el rol que viene en la respuesta del backend
            if (data.rol === "admin") {
                window.location.href = "admin.html";
            } else if (data.rol === "domiciliario") {
                window.location.href = "domiciliario.html";
            }
        } else {
            // Mostrar error proveniente del backend
            if (errorDiv) {
                errorDiv.textContent = data.error || "Credenciales incorrectas";
                errorDiv.style.display = "block";
            }
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
            }
        }
    } catch (err) {
        if (errorDiv) {
            errorDiv.textContent = "Error de conexión con el servidor.";
            errorDiv.style.display = "block";
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
        }
    }
}

// Función global para cerrar sesión (elimina el token y redirige)
function cerrarSesion() {
    localStorage.removeItem('token');
    window.location.href = "login.html";
}

function logout() {
    cerrarSesion();
}

// Función global para obtener el token (usada por fetchConToken en admin.js y domiciliario.js)
function obtenerToken() {
    return localStorage.getItem('token');
}
/* ============================================
   toast.js - Sistema de Notificaciones Toast
   Se encarga de mostrar los mensajes 
   verdes (éxito) y rojos (error) flotantes.
   ============================================ */

function mostrarNotificacion(mensaje, tipo = 'success') {
    // 1. Crear el elemento div en el aire
    const n = document.createElement('div');
    
    // 2. Asignar clases según el tipo (usa las clases de styles.css)
    n.className = `notificacion notificacion-${tipo}`;
    
    // 3. Poner el icono y el texto
    n.innerHTML = `<i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${mensaje}`;
    
    // 4. Inyectarlo en la página
    document.body.appendChild(n);
    
    // 5. Pequeño delay para forzar al navegador a "ver" el elemento y hacer la animación CSS
    setTimeout(() => n.classList.add('mostrar'), 10);
    
    // 6. A los 3 segundos, quitar la clase para que haga la animación de salida
    setTimeout(() => { 
        n.classList.remove('mostrar'); 
        // 7. Esperar a que termine la animación de salida (300ms) y destruirlo del HTML
        setTimeout(() => n.remove(), 300); 
    }, 3000);
}


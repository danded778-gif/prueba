// ============================================
// client.js - FUSIÓN DOCUMENTADA
// ============================================

let tiendas = [];
let carrito = [];

document.addEventListener("DOMContentLoaded", () => {
    carrito = obtenerCarrito();
    inicializarEventos();
    if (document.getElementById("stores-grid")) cargarTiendas();
});

function inicializarEventos() {
    const closeCart = document.getElementById("close-cart");
    const cartFloat = document.getElementById("cart-float");
    const cartOverlay = document.getElementById("cart-overlay");
    const checkoutBtn = document.getElementById("checkout-whatsapp");
    const mobileMenu = document.getElementById("mobile-menu");
    const navLinks = document.getElementById("nav-links");

    if (closeCart) closeCart.onclick = cerrarCarrito;
    if (cartFloat) cartFloat.onclick = abrirCarrito;
    if (cartOverlay) cartOverlay.onclick = cerrarCarrito;
    if (checkoutBtn) checkoutBtn.onclick = irACheckout;

    if (mobileMenu && navLinks) {
        mobileMenu.onclick = () => {
            navLinks.classList.toggle("active");
            mobileMenu.classList.toggle("active");
        };
    }
}

function abrirCarrito() {
    const cartPanel = document.getElementById("cart-panel");
    const cartOverlay = document.getElementById("cart-overlay");
    if (cartPanel) cartPanel.classList.add("active");
    if (cartOverlay) cartOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

function cerrarCarrito() {
    const cartPanel = document.getElementById("cart-panel");
    const cartOverlay = document.getElementById("cart-overlay");
    if (cartPanel) cartPanel.classList.remove("active");
    if (cartOverlay) cartOverlay.classList.remove("active");
    document.body.style.overflow = "";
}

async function cargarTiendas() {
    const container = document.getElementById("stores-grid");
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}?action=getTiendas`);
        const data = await res.json();
        tiendas = data;
        renderizarTiendas();
    } catch (error) {
        console.error("Error cargando tiendas", error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-store-slash"></i>
                <p>No hay tiendas disponibles</p>
                <button onclick="cargarTiendas()" class="btn-retry">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function renderizarTiendas() {
    const container = document.getElementById("stores-grid");
    if (!container) return;

    tiendas.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));

    container.className = 'stores-grid';

    if (tiendas.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-store-slash"></i><p>No hay tiendas</p></div>`;
        return;
    }

    container.innerHTML = tiendas.map(tienda => {
        const tieneImagen = tienda.imagen && tienda.imagen.trim() !== '';
        return `
        <div class="store-card" onclick="verMenuTienda(${tienda.id})">
            <div class="store-img" style="${tieneImagen ? `background-image: url('${tienda.imagen}');` : ''}">
                ${!tieneImagen ? '<i class="fas fa-store"></i>' : ''}
                <span class="store-badge">⭐ ${tienda.rating || 5}</span>
                <div class="store-img-overlay"></div>
            </div>
            <div class="store-info">
                <h3>${tienda.nombre}</h3>
                <p><i class="fas fa-map-marker-alt"></i> ${tienda.direccion}</p>
                <p><i class="fas fa-clock"></i> ${tienda.horario || "11am - 10pm"}</p>
                <div class="store-rating">${generarEstrellas(tienda.rating || 5)}</div>
            </div>
        </div>
    `}).join('');
}

async function verMenuTienda(tiendaId) {
    const container = document.getElementById("stores-grid");
    if (!container) return;

    container.className = '';
    container.innerHTML = '';

    try {
        mostrarCargando(true);
        const res = await fetch(`${API_URL}?action=getProductos&tiendaId=${tiendaId}`);
        const productos = await res.json();
        const tienda = tiendas.find(t => t.id == tiendaId);

        if (!tienda) {
            mostrarNotificacion("Tienda no encontrada", "error");
            return;
        }

        // Filtro: quita objetos vacíos
        const productosValidos = productos.filter(p => p.id && p.id !== '' && p.nombre);

        if (productosValidos.length === 0) {
            container.innerHTML = `
                <button class="back-button" onclick="cargarTiendas()"><i class="fas fa-arrow-left"></i> Volver a tiendas</button>
                <div class="menu-header"><h2>${tienda.nombre}</h2></div>
                <div class="empty-state"><i class="fas fa-box-open"></i><p>Esta tienda aún no tiene productos</p></div>
            `;
            return;
        }

        let productosHTML = productosValidos.map(p => {
            // ★ INYECTAR tiendaId y tiendaNombre en cada producto
            p.tiendaId = tienda.id;
            p.tiendaNombre = tienda.nombre;

            const imagenUrl = (p.imagen_url || p.icono || '').trim();
            const tieneImagen = imagenUrl && imagenUrl !== 'null' && imagenUrl !== 'undefined';

            return `
            <div class="product-card">
                <div class="product-img ${tieneImagen ? 'con-imagen' : 'sin-imagen'}" 
                     ${tieneImagen ? `style="background-image: url('${imagenUrl}');"` : ''}>
                    ${!tieneImagen ? `<i class="fas fa-utensils"></i>` : ''}
                    ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ""}
                </div>
                <div class="product-info">
                    <h4>${p.nombre}</h4>
                    <p class="product-desc">${p.descripcion || ''}</p>
                    <div class="product-price">${formatearPrecio(p.precio)}</div>
                    <div class="precio-unidad-container">
                        <button class="btn-agregar-unidad" onclick="event.stopPropagation(); agregarAlCarrito(${JSON.stringify(p).replace(/"/g, '&quot;')}, 1)">
                            <i class="fas fa-plus"></i> Agregar
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        container.innerHTML = `
            <button class="back-button" onclick="cargarTiendas()"><i class="fas fa-arrow-left"></i> Volver a tiendas</button>
            <div class="menu-header">
                <h2>${tienda.nombre}</h2>
                <p>${tienda.descripcion || ""}</p>
                <span style="display:inline-block;margin-top:.5rem;background:var(--light);color:var(--gray);padding:.3rem .9rem;border-radius:20px;font-size:.85rem;">
                    <i class="fas fa-box"></i> ${productosValidos.length} producto${productosValidos.length !== 1 ? 's' : ''} disponible${productosValidos.length !== 1 ? 's' : ''}
                </span>
            </div>
            <div style="margin:1rem 0;">
                <div style="position:relative;">
                    <i class="fas fa-search" style="position:absolute;left:1rem;top:50%;transform:translateY(-50%);color:var(--gray);"></i>
                    <input type="text" id="buscador-productos" placeholder="Buscar producto..." 
                        oninput="filtrarProductos(this.value)"
                        style="width:100%;padding:.8rem 1rem .8rem 2.8rem;border:2px solid #e0e0e0;border-radius:50px;font-family:inherit;font-size:.95rem;outline:none;transition:border-color .2s;"
                        onfocus="this.style.borderColor='var(--primary)'"
                        onblur="this.style.borderColor='#e0e0e0'">
                </div>
                <p id="resultado-busqueda" style="text-align:center;color:var(--gray);font-size:.85rem;margin-top:.5rem;display:none;"></p>
            </div>
            <div class="menu-grid" id="menu-grid-container">${productosHTML}</div>
        `;

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error("Error cargando menú:", error);
        mostrarNotificacion("Error al cargar el menú", "error");
    } finally {
        mostrarCargando(false);
    }
}

function agregarAlCarrito(producto, cantidadTipo) {
    const item = {
        id: producto.id,
        nombre: producto.nombre,
        precioUnitario: producto.precio,
        cantidadTipo: cantidadTipo,
        cantidad: 1,
        subtotal: producto.precio,
        // ★ GUARDAR tiendaId y tiendaNombre
        tiendaId: producto.tiendaId || null,
        tiendaNombre: producto.tiendaNombre || null
    };

    const existente = carrito.find(i => i.id === item.id && i.cantidadTipo === item.cantidadTipo);
    if (existente) {
        existente.cantidad++;
        existente.subtotal = existente.precioUnitario * existente.cantidad;
    } else {
        carrito.push(item);
    }

    guardarCarrito(carrito);
    actualizarCarritoUI();
    mostrarNotificacion(`${producto.nombre} agregado al carrito`);

    const botones = document.querySelectorAll('.btn-agregar-unidad');
    botones.forEach(btn => {
        if (btn.getAttribute('onclick').includes(`"id":${producto.id}`)) {
            const textoOriginal = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> ¡Agregado!';
            btn.style.background = '#28a745';
            btn.disabled = true;
            setTimeout(() => {
                btn.innerHTML = textoOriginal;
                btn.style.background = '';
                btn.disabled = false;
            }, 1500);
        }
    });

    const cartFloat = document.getElementById("cart-float");
    if (cartFloat) {
        cartFloat.classList.add("pulse");
        setTimeout(() => cartFloat.classList.remove("pulse"), 500);
    }
}

function actualizarCarritoUI() {
    const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);
    const btnVaciar = document.getElementById('btn-vaciar');
    if (btnVaciar) btnVaciar.style.display = totalItems > 0 ? 'block' : 'none';
    const cartFloat = document.getElementById("cart-float");
    const cartCounter = document.getElementById("cart-counter");

    if (totalItems > 0) {
        cartFloat?.classList.add("visible");
        if (cartCounter) cartCounter.innerText = totalItems;
    } else {
        cartFloat?.classList.remove("visible");
    }

    const cartItemsDiv = document.getElementById("cart-items");
    if (cartItemsDiv) {
        if (carrito.length === 0) {
            cartItemsDiv.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-basket"></i>
                    <p>Tu carrito está vacío</p>
                </div>
            `;
        } else {
            cartItemsDiv.innerHTML = carrito.map((item, idx) => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.nombre}</div>
                        ${item.tiendaNombre ? `<div class="cart-item-detail"><i class="fas fa-store" style="color:var(--secondary);margin-right:4px;font-size:.7rem"></i>${item.tiendaNombre}</div>` : ''}
                        <div class="cart-item-detail">${item.cantidad} unidad${item.cantidad > 1 ? 'es' : ''}</div>
                        <div class="cart-item-detail">${formatearPrecio(item.precioUnitario)} c/u</div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="cart-item-price">${formatearPrecio(item.subtotal)}</div>
                        <div class="cart-item-controls">
                            <button class="btn-cantidad" onclick="cambiarCantidad(${idx}, -1)"><i class="fas fa-minus"></i></button>
                            <span>${item.cantidad}</span>
                            <button class="btn-cantidad" onclick="cambiarCantidad(${idx}, 1)"><i class="fas fa-plus"></i></button>
                            <button class="btn-eliminar" onclick="eliminarDelCarrito(${idx})"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    const subtotal = carrito.reduce((s, i) => s + i.subtotal, 0);
    const envio = APP_CONFIG.zonas[APP_CONFIG.zonaActual]?.envio || APP_CONFIG.envioBase;
    const total = subtotal + envio;

    const totalPriceEl = document.getElementById("cart-total-price");
    if (totalPriceEl) {
        totalPriceEl.innerHTML = `${formatearPrecio(total)} <small>(envío: ${formatearPrecio(envio)})</small>`;
    }
}

function cambiarCantidad(index, cambio) {
    const item = carrito[index];
    item.cantidad += cambio;
    if (item.cantidad <= 0) {
        eliminarDelCarrito(index);
        return;
    }
    item.subtotal = item.precioUnitario * item.cantidad;
    guardarCarrito(carrito);
    actualizarCarritoUI();
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    guardarCarrito(carrito);
    actualizarCarritoUI();
}

function irACheckout() {
    if (carrito.length === 0) {
        mostrarNotificacion("Tu carrito está vacío", "error");
        return;
    }
    window.location.href = "checkout.html";
}

function mostrarCargando(mostrar) {
    let loader = document.getElementById("page-loader");
    if (!loader) {
        loader = document.createElement("div");
        loader.id = "page-loader";
        loader.innerHTML = `
            <div class="spinner-container">
                <div class="spinner"></div>
                <p>Cargando...</p>
            </div>
        `;
        document.body.appendChild(loader);
    }
    loader.style.display = mostrar ? "flex" : "none";
}

function vaciarCarrito() {
    if (!confirm('¿Vaciar todo el carrito?')) return;
    carrito = [];
    guardarCarrito(carrito);
    actualizarCarritoUI();
}

function filtrarProductos(texto) {
    const termino = texto.toLowerCase().trim();
    const cards = document.querySelectorAll('#menu-grid-container .product-card');
    const resultado = document.getElementById('resultado-busqueda');
    let visibles = 0;

    cards.forEach(card => {
        const nombre = card.querySelector('h4')?.textContent.toLowerCase() || '';
        const desc = card.querySelector('.product-desc')?.textContent.toLowerCase() || '';
        const coincide = nombre.includes(termino) || desc.includes(termino);
        card.style.display = coincide ? '' : 'none';
        if (coincide) visibles++;
    });

    if (termino === '') {
        resultado.style.display = 'none';
    } else {
        resultado.style.display = 'block';
        resultado.textContent = visibles === 0
            ? 'No se encontraron productos'
            : `${visibles} resultado${visibles !== 1 ? 's' : ''} para "${texto}"`;
    }
}
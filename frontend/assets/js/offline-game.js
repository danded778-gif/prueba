/* ============================================
   OFFLINE GAME - MOTO RUNNER
   Módulo independiente y auto-contenido
   ============================================ */

var OfflineGame = (function () {

    'use strict';

    // =============================================
    // ESTADO INTERNO (privado)
    // =============================================
    var _state = 'idle'; // 'idle' | 'playing' | 'dead'
    var _score = 0;
    var _highscore = 0;
    var _speed = 5;
    var _frame = 0;
    var _animFrameId = null;
    var _container = null;
    var _canvas = null;
    var _ctx = null;
    var _listeners = [];

    // Entidades
    var _moto = {
        x: 80, y: 0, width: 50, height: 30,
        vy: 0, jumping: false, grounded: false, color: '#e63946'
    };
    var _groundY = 0;
    var _obstacles = [];
    var _obstacleTimer = 0;
    var _particles = [];
    var _bgBuildings = [];
    var _stars = [];

    // =============================================
    // CARGAR RÉCORD
    // =============================================
    try {
        _highscore = parseInt(localStorage.getItem('motoHighscore')) || 0;
    } catch (e) { /* sin storage */ }

    // =============================================
    // HTML DEL JUEGO (se inyecta al DOM)
    // =============================================
    function _getHTML() {
        return '' +
            '<canvas id="gameCanvas"></canvas>' +

            '<div class="offline-game__hud" id="og-hud">' +
                '<div class="offline-game__hud-title">🏍️ MOTO RUNNER</div>' +
                '<div class="offline-game__hud-subtitle">Sin conexión — Toca para saltar</div>' +
                '<div class="offline-game__hud-score">Puntos: <span id="og-score">0</span></div>' +
                '<div class="offline-game__hud-record">Record: <span id="og-highscore">0</span></div>' +
            '</div>' +

            '<div class="offline-game__start" id="og-start">' +
                '<div class="offline-game__start-icon">🏍️</div>' +
                '<div class="offline-game__start-title">MOTO RUNNER</div>' +
                '<div class="offline-game__start-desc">Esquiva obstáculos mientras vuelve la red</div>' +
                '<button class="offline-game__btn offline-game__btn--play" id="og-btn-start">' +
                    '<i class="fas fa-play"></i> JUGAR' +
                '</button>' +
                '<div class="offline-game__start-hint">👆 Toca para saltar</div>' +
            '</div>' +

            '<div class="offline-game__gameover" id="og-gameover">' +
                '<div class="offline-game__gameover-title">💥 CHOQUE!</div>' +
                '<div class="offline-game__gameover-score">Puntos: <span id="og-final-score">0</span></div>' +
                '<button class="offline-game__btn offline-game__btn--restart" id="og-btn-restart">' +
                    '<i class="fas fa-redo"></i> Intentar de nuevo' +
                '</button>' +
                '<div class="offline-game__gameover-waiting">' +
                    '<i class="fas fa-wifi"></i> Esperando conexión...' +
                '</div>' +
            '</div>' +

            '<button class="offline-game__btn offline-game__btn--close" id="og-btn-close">' +
                '<i class="fas fa-wifi"></i> ¡Conexión restaurada! Volver al panel' +
            '</button>';
    }

    // =============================================
    // REFERENCIAS A ELEMENTOS DEL DOM
    // =============================================
    function _getEl(id) {
        return document.getElementById(id);
    }

    // =============================================
    // INICIALIZAR FONDO
    // =============================================
    function _initBackground() {
        _bgBuildings = [];
        _stars = [];

        for (var i = 0; i < 20; i++) {
            _bgBuildings.push({
                x: i * 100 + Math.random() * 50,
                width: 40 + Math.random() * 60,
                height: 50 + Math.random() * 150,
                color: 'rgba(255,255,255,' + (0.03 + Math.random() * 0.05) + ')'
            });
        }

        for (var i = 0; i < 100; i++) {
            _stars.push({
                x: Math.random() * _canvas.width,
                y: Math.random() * (_canvas.height / 2),
                size: Math.random() * 2,
                speed: 0.2 + Math.random() * 0.5
            });
        }
    }

    // =============================================
    // REDIMENSIONAR CANVAS
    // =============================================
    function _resizeCanvas() {
        if (!_canvas) return;
        _canvas.width = window.innerWidth;
        _canvas.height = window.innerHeight;
        _groundY = _canvas.height - 100;
    }

    // =============================================
    // PARTÍCULAS
    // =============================================
    function _createParticles(x, y, count) {
        for (var i = 0; i < count; i++) {
            _particles.push({
                x: x, y: y,
                vx: -2 - Math.random() * 3,
                vy: -1 + Math.random() * 3,
                life: 1,
                size: 2 + Math.random() * 3
            });
        }
    }

    // =============================================
    // OBSTÁCULOS
    // =============================================
    function _spawnObstacle() {
        var types = ['caja', 'cono', 'bache'];
        var type = types[Math.floor(Math.random() * types.length)];
        var obs = { x: _canvas.width, y: _groundY, width: 30, height: 30, type: type, passed: false };

        if (type === 'caja') {
            obs.width = 35; obs.height = 35; obs.y = _groundY - 35;
        } else if (type === 'cono') {
            obs.width = 20; obs.height = 30; obs.y = _groundY - 30;
        } else {
            obs.width = 50; obs.height = 10; obs.y = _groundY - 5;
        }

        _obstacles.push(obs);
    }

    // =============================================
    // SALTAR
    // =============================================
    function _jump() {
        if (_state !== 'playing') return;
        if (_moto.grounded) {
            _moto.vy = -12;
            _moto.jumping = true;
            _moto.grounded = false;
            _createParticles(_moto.x + 10, _moto.y + _moto.height, 5);
        }
    }

    // =============================================
    // DIBUJAR MOTO
    // =============================================
    function _drawMoto() {
        var ctx = _ctx;
        var m = _moto;

        ctx.save();

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(m.x + 25, _groundY + 5, 25, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ruedas
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(m.x + 10, m.y + 25, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#666'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(m.x + 40, m.y + 25, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Cuerpo
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.moveTo(m.x + 5, m.y + 20);
        ctx.lineTo(m.x + 20, m.y + 5);
        ctx.lineTo(m.x + 35, m.y + 5);
        ctx.lineTo(m.x + 45, m.y + 15);
        ctx.lineTo(m.x + 45, m.y + 20);
        ctx.closePath();
        ctx.fill();

        // Motor
        ctx.fillStyle = '#222';
        ctx.fillRect(m.x + 15, m.y + 8, 15, 5);

        // Manubrio
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(m.x + 35, m.y + 5); ctx.lineTo(m.x + 38, m.y - 5); ctx.stroke();

        // Faro
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath(); ctx.arc(m.x + 42, m.y + 12, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,235,59,0.3)';
        ctx.beginPath(); ctx.arc(m.x + 42, m.y + 12, 12, 0, Math.PI * 2); ctx.fill();

        // Humo en suelo
        if (m.grounded) {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(m.x + 22, m.y - 2, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#333';
            ctx.fillRect(m.x + 20, m.y - 5, 12, 4);
        }

        ctx.restore();
    }

    // =============================================
    // DIBUJAR OBSTÁCULO
    // =============================================
    function _drawObstacle(obs) {
        var ctx = _ctx;
        ctx.save();

        if (obs.type === 'caja') {
            ctx.fillStyle = '#d4a373';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            ctx.strokeStyle = '#8b6914';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
            ctx.beginPath();
            ctx.moveTo(obs.x + obs.width / 2, obs.y + 5);
            ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height - 5);
            ctx.moveTo(obs.x + 5, obs.y + obs.height / 2);
            ctx.lineTo(obs.x + obs.width - 5, obs.y + obs.height / 2);
            ctx.stroke();
        } else if (obs.type === 'cono') {
            ctx.fillStyle = '#ff6b35';
            ctx.beginPath();
            ctx.moveTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
            ctx.lineTo(obs.x, obs.y + obs.height);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(obs.x + 5, obs.y + obs.height - 10, obs.width - 10, 4);
        } else {
            ctx.fillStyle = '#0f0f23';
            ctx.beginPath();
            ctx.ellipse(obs.x + obs.width / 2, obs.y + 5, obs.width / 2, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // =============================================
    // ACTUALIZAR LÓGICA
    // =============================================
    function _update() {
        _frame++;
        _groundY = _canvas.height - 100;

        // Física moto
        _moto.vy += 0.6;
        _moto.y += _moto.vy;

        if (_moto.y + _moto.height >= _groundY) {
            _moto.y = _groundY - _moto.height;
            _moto.vy = 0;
            _moto.grounded = true;
            _moto.jumping = false;
        }

        // Partículas de rueda
        if (_moto.grounded && _frame % 5 === 0) {
            _createParticles(_moto.x, _moto.y + _moto.height, 1);
        }

        // Actualizar partículas
        for (var i = _particles.length - 1; i >= 0; i--) {
            _particles[i].x += _particles[i].vx;
            _particles[i].y += _particles[i].vy;
            _particles[i].life -= 0.02;
            if (_particles[i].life <= 0) _particles.splice(i, 1);
        }

        // Spawn obstáculos
        _obstacleTimer++;
        if (_obstacleTimer > 90 - Math.min(_score / 10, 40)) {
            _spawnObstacle();
            _obstacleTimer = 0;
        }

        // Mover obstáculos + colisión
        for (var i = _obstacles.length - 1; i >= 0; i--) {
            var obs = _obstacles[i];
            obs.x -= _speed + (_score / 50);

            // Colisión
            if (!obs.passed &&
                _moto.x < obs.x + obs.width &&
                _moto.x + _moto.width > obs.x &&
                _moto.y < obs.y + obs.height &&
                _moto.y + _moto.height > obs.y + 5) {
                _triggerGameOver();
                return;
            }

            // Punto
            if (!obs.passed && obs.x + obs.width < _moto.x) {
                obs.passed = true;
                _score++;
                _getEl('og-score').textContent = _score;
            }

            // Fuera de pantalla
            if (obs.x + obs.width < 0) _obstacles.splice(i, 1);
        }

        // Aumentar velocidad
        _speed = 5 + (_score / 20);

        // Fondo
        for (var i = 0; i < _bgBuildings.length; i++) {
            _bgBuildings[i].x -= 0.5;
            if (_bgBuildings[i].x + _bgBuildings[i].width < 0) {
                _bgBuildings[i].x = _canvas.width + Math.random() * 100;
            }
        }
        for (var i = 0; i < _stars.length; i++) {
            _stars[i].x -= _stars[i].speed;
            if (_stars[i].x < 0) _stars[i].x = _canvas.width;
        }
    }

    // =============================================
    // DIBUJAR ESCENA
    // =============================================
    function _draw() {
        var ctx = _ctx;
        var w = _canvas.width;
        var h = _canvas.height;

        // Cielo
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        // Estrellas
        ctx.fillStyle = '#fff';
        for (var i = 0; i < _stars.length; i++) {
            ctx.beginPath();
            ctx.arc(_stars[i].x, _stars[i].y, _stars[i].size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Luna
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(w - 80, 60, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.arc(w - 70, 55, 25, 0, Math.PI * 2); ctx.fill();

        // Edificios
        for (var i = 0; i < _bgBuildings.length; i++) {
            var b = _bgBuildings[i];
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, _groundY - b.height, b.width, b.height);
        }

        // Suelo
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, _groundY, w, h - _groundY);

        // Línea discontinua
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.setLineDash([20, 20]);
        ctx.beginPath(); ctx.moveTo(0, _groundY + 30); ctx.lineTo(w, _groundY + 30); ctx.stroke();
        ctx.setLineDash([]);

        // Línea blanca
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, _groundY + 5); ctx.lineTo(w, _groundY + 5); ctx.stroke();

        // Partículas
        for (var i = 0; i < _particles.length; i++) {
            var p = _particles[i];
            ctx.fillStyle = 'rgba(200,200,200,' + p.life + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }

        // Obstáculos
        for (var i = 0; i < _obstacles.length; i++) {
            _drawObstacle(_obstacles[i]);
        }

        // Moto
        _drawMoto();
    }

    // =============================================
    // GAME LOOP
    // =============================================
    function _gameLoop() {
        if (_state !== 'playing') return;
        _update();
        _draw();
        _animFrameId = requestAnimationFrame(_gameLoop);
    }

    // =============================================
    // ESTADOS
    // =============================================
    function _startGame() {
        _state = 'playing';
        _score = 0;
        _speed = 5;
        _obstacles = [];
        _particles = [];
        _obstacleTimer = 0;
        _frame = 0;
        _moto.y = _groundY - _moto.height;
        _moto.vy = 0;
        _moto.grounded = true;
        _moto.jumping = false;

        _getEl('og-score').textContent = '0';
        _getEl('og-highscore').textContent = _highscore;
        _getEl('og-start').style.display = 'none';
        _getEl('og-gameover').classList.remove('active');

        _gameLoop();
    }

    function _triggerGameOver() {
        _state = 'dead';

        if (_score > _highscore) {
            _highscore = _score;
            try { localStorage.setItem('motoHighscore', _highscore); } catch (e) { /* */ }
        }

        // Cancelar animación
        if (_animFrameId) {
            cancelAnimationFrame(_animFrameId);
            _animFrameId = null;
        }

        _getEl('og-final-score').textContent = _score;
        _getEl('og-gameover').classList.add('active');

        // Explosión visual
        _createParticles(_moto.x + 25, _moto.y + 15, 20);
        _draw();
    }

    // =============================================
    // GESTIÓN DE VISIBILIDAD
    // =============================================
    function _show() {
        if (!_container) return;
        _container.classList.add('active');
        _getEl('og-btn-close').classList.remove('active');

        if (_state === 'idle') {
            _getEl('og-start').style.display = 'block';
            _getEl('og-gameover').classList.remove('active');
            _getEl('og-highscore').textContent = _highscore;
            _draw();
        }
    }

    function _hide() {
        if (!_container) return;
        _state = 'idle';

        if (_animFrameId) {
            cancelAnimationFrame(_animFrameId);
            _animFrameId = null;
        }

        _container.classList.remove('active');
        _getEl('og-btn-close').classList.remove('active');
        _obstacles = [];
        _particles = [];
    }

    // =============================================
    // DETECCIÓN DE CONEXIÓN
    // =============================================
    function _onConnectionChange() {
        var closeBtn = _getEl('og-btn-close');

        if (!navigator.onLine) {
            _show();
            closeBtn.classList.remove('active');
        } else {
            if (_state === 'playing') {
                closeBtn.classList.add('active');
            } else {
                _hide();
            }
        }
    }

    function _onOnline() {
        console.log('🌐 Conexión restaurada');
        _onConnectionChange();
    }

    function _onOffline() {
        console.log('📴 Sin conexión');
        _onConnectionChange();
    }

    // =============================================
    // REGISTRAR EVENT LISTENERS (para limpiar después)
    // =============================================
    function _addListener(target, event, handler) {
        target.addEventListener(event, handler);
        _listeners.push({ target: target, event: event, handler: handler });
    }

    function _removeAllListeners() {
        for (var i = 0; i < _listeners.length; i++) {
            var l = _listeners[i];
            l.target.removeEventListener(l.event, l.handler);
        }
        _listeners = [];
    }

    // =============================================
    // INYECTAR HTML EN EL DOM
    // =============================================
    function _injectHTML() {
        _container = document.createElement('div');
        _container.id = 'offline-game';
        _container.innerHTML = _getHTML();
        document.body.appendChild(_container);

        _canvas = _getEl('gameCanvas');
        _ctx = _canvas.getContext('2d');

        _resizeCanvas();
        _initBackground();
    }

    // =============================================
    // API PÚBLICA
    // =============================================
    return {

        /**
         * Inicializa el juego offline.
         * Inyecta el HTML, registra listeners de conexión.
         * Llamar una sola vez al cargar la página.
         */
        init: function () {
            if (_container) {
                console.warn('OfflineGame: ya fue inicializado');
                return;
            }

            _injectHTML();

            // Controles del juego
            _addListener(_canvas, 'mousedown', _jump);
            _addListener(_canvas, 'touchstart', function (e) {
                e.preventDefault();
                _jump();
            });
            _addListener(document, 'keydown', function (e) {
                if (e.code === 'Space' || e.code === 'ArrowUp') {
                    // Solo interceptar si el juego está visible
                    if (_container.classList.contains('active')) {
                        e.preventDefault();
                        _jump();
                    }
                }
            });

            // Botones del juego
            _addListener(_getEl('og-btn-start'), 'click', _startGame);
            _addListener(_getEl('og-btn-restart'), 'click', _startGame);
            _addListener(_getEl('og-btn-close'), 'click', _hide);

            // Conectividad
            _addListener(window, 'online', _onOnline);
            _addListener(window, 'offline', _onOffline);
            _addListener(window, 'resize', function () {
                _resizeCanvas();
                _initBackground();
            });

            // Estado inicial
            _onConnectionChange();

            console.log('🏍️ OfflineGame inicializado');
        },

        /**
         * Destruye el juego completamente.
         * Remueve el HTML del DOM y todos los listeners.
         */
        destroy: function () {
            _hide();
            _removeAllListeners();

            if (_container && _container.parentNode) {
                _container.parentNode.removeChild(_container);
            }

            _container = null;
            _canvas = null;
            _ctx = null;
            _state = 'idle';

            console.log('🏍️ OfflineGame destruido');
        },

        /**
         * Forzar mostrar el juego (útil para pruebas)
         */
        forceShow: function () {
            _show();
        },

        /**
         * Forzar ocultar el juego
         */
        forceHide: function () {
            _hide();
        },

        /**
         * Obtener el estado actual
         * @returns {string} 'idle' | 'playing' | 'dead'
         */
        getState: function () {
            return _state;
        }
    };

})();
module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`🔗 Conectado: ${socket.id}`);

        socket.on('identificar', ({ rol, id }) => {
            if (rol === 'domiciliario' && id) {
                socket.join(`domiciliario_${id}`);
                console.log(`✅ ${socket.id} → room domiciliario_${id}`);
            } else if (rol === 'admin') {
                socket.join('admin_room');
                console.log(`✅ ${socket.id} → room admin_room`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`⚠️ Desconectado: ${socket.id}`);
        });
    });
};
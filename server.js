const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};

function getAllConnectedClients(roomId) {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) return [];
    
    const clients = [];
    const seen = new Set();
    
    room.forEach((socketId) => {
        const username = userSocketMap[socketId];
        // Double-check that the socket is actually connected
        const socket = io.sockets.sockets.get(socketId);
        if (username && socket && socket.connected && !seen.has(username)) {
            seen.add(username);
            clients.push({
                socketId,
                username,
            });
        }
    });
    
    return clients;
}

function notifyRoomClients(roomId, excludeSocketId = null) {
    const clients = getAllConnectedClients(roomId);
    console.log(`📢 Notifying room ${roomId} with ${clients.length} clients:`, clients.map(c => c.username));
    
    clients.forEach(({ socketId }) => {
        if (socketId !== excludeSocketId) {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username: userSocketMap[socketId],
                socketId: socketId,
            });
        }
    });
}

io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        console.log(`👤 ${username} joining room: ${roomId}`);
        
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        
        // Notify all clients in the room about the updated client list
        notifyRoomClients(roomId);
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        console.log(`📝 Code change in room: ${roomId}`);
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        console.log(`🔄 Syncing code to socket: ${socketId}`);
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // Handle both disconnecting and disconnect events
    socket.on('disconnecting', () => {
        handleUserDisconnection(socket);
    });

    socket.on('disconnect', (reason) => {
        console.log(`🔌 Socket ${socket.id} disconnected: ${reason}`);
        handleUserDisconnection(socket);
    });

    function handleUserDisconnection(socket) {
        const rooms = [...socket.rooms];
        const username = userSocketMap[socket.id];
        
        if (!username) return; // Already handled
        
        console.log(`👋 ${username} disconnecting from rooms:`, rooms);
        
        // Remove from userSocketMap
        delete userSocketMap[socket.id];
        
        // Notify remaining clients in each room
        rooms.forEach((roomId) => {
            if (roomId !== socket.id) { // Skip the socket's own room
                // Emit specific disconnection event
                socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
                    socketId: socket.id,
                    username: username,
                });
                
                // Update all clients with new client list (after a short delay to ensure disconnection is processed)
                setTimeout(() => {
                    notifyRoomClients(roomId, socket.id);
                }, 100);
            }
        });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`📡 Socket.io server ready for connections`);
});
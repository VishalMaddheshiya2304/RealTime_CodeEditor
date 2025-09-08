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
const roomLanguages = {};
const roomCodes = {};
const roomOutputs = {};
const userRoomMap = {}; // Track which room each user is in

const SUPPORTED_LANGUAGES = ['javascript', 'java', 'cpp'];

function getAllConnectedClients(roomId) {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) return [];
    
    const clients = [];
    const seenUsers = new Set(); // Prevent duplicate usernames
    
    room.forEach((socketId) => {
        const username = userSocketMap[socketId];
        if (username && !seenUsers.has(username)) {
            seenUsers.add(username);
            clients.push({
                socketId,
                username,
            });
        }
    });
    
    console.log(`📋 Room ${roomId} has ${clients.length} unique clients:`, clients.map(c => c.username));
    return clients;
}

function getRoomLanguage(roomId) {
    return roomLanguages[roomId] || 'javascript';
}

function setRoomLanguage(roomId, language) {
    if (SUPPORTED_LANGUAGES.includes(language)) {
        roomLanguages[roomId] = language;
        console.log(`🔧 Room ${roomId} language set to: ${language}`);
        return true;
    }
    return false;
}

function removeUserFromRoom(socketId, username) {
    if (username && userRoomMap[username]) {
        const roomId = userRoomMap[username];
        
        // Remove old socket from room if it exists
        const oldSockets = Object.keys(userSocketMap).filter(id => 
            userSocketMap[id] === username && id !== socketId
        );
        
        oldSockets.forEach(oldSocketId => {
            console.log(`🧹 Removing duplicate socket ${oldSocketId} for user ${username}`);
            if (io.sockets.sockets.get(oldSocketId)) {
                io.sockets.sockets.get(oldSocketId).leave(roomId);
            }
            delete userSocketMap[oldSocketId];
        });
        
        delete userRoomMap[username];
    }
}

io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username, language = 'javascript' }) => {
        console.log(`👤 ${username} joining room: ${roomId} with language preference: ${language}`);
        
        // Remove any existing connections for this user
        removeUserFromRoom(socket.id, username);
        
        // Set up new connection
        userSocketMap[socket.id] = username;
        userRoomMap[username] = roomId;
        socket.join(roomId);
        
        // Set room language if it's the first user
        if (!roomLanguages[roomId]) {
            setRoomLanguage(roomId, language);
        }
        
        const clients = getAllConnectedClients(roomId);
        const roomLanguage = getRoomLanguage(roomId);
        
        // Send join confirmation to all clients
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
        
        // Send room language to the new joiner
        socket.emit(ACTIONS.LANGUAGE_SYNC, {
            language: roomLanguage
        });
        
        // Send existing code and output to new joiner
        if (roomCodes[roomId]) {
            socket.emit(ACTIONS.CODE_CHANGE, {
                code: roomCodes[roomId]
            });
        }

        if (roomOutputs[roomId]) {
            const output = roomOutputs[roomId];
            if (output.type === 'success') {
                socket.emit(ACTIONS.EXECUTION_RESULT, {
                    output: output.result,
                    executedBy: output.executedBy,
                    executionTime: output.executionTime
                });
            } else if (output.type === 'error') {
                socket.emit(ACTIONS.EXECUTION_ERROR, {
                    error: output.error,
                    executedBy: output.executedBy,
                    executionTime: output.executionTime
                });
            }
        }
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        roomCodes[roomId] = code;
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
        console.log(`🔧 Language change request for room ${roomId}: ${language}`);
        
        if (setRoomLanguage(roomId, language)) {
            delete roomOutputs[roomId];
            
            io.in(roomId).emit(ACTIONS.ROOM_LANGUAGE_UPDATE, {
                language: language,
                changedBy: userSocketMap[socket.id]
            });
            
            io.in(roomId).emit(ACTIONS.CLEAR_OUTPUT, {
                clearedBy: userSocketMap[socket.id]
            });
            
            console.log(`✅ Language changed successfully for room ${roomId} to ${language}`);
        } else {
            socket.emit('error', {
                message: `Unsupported language: ${language}`
            });
            console.log(`❌ Unsupported language requested: ${language}`);
        }
    });

    socket.on(ACTIONS.EXECUTE_CODE, ({ roomId, language, code, executedBy }) => {
        console.log(`🚀 Code execution requested by ${executedBy} in room ${roomId} (${language})`);
        
        io.in(roomId).emit(ACTIONS.EXECUTION_START, {
            executedBy: executedBy
        });
        
        // Simulate server-side execution for non-JavaScript languages
        if (language !== 'javascript') {
            setTimeout(() => {
                const error = {
                    error: `${language.toUpperCase()} execution requires backend Docker setup. Currently only JavaScript is supported in the browser.`,
                    executedBy,
                    executionTime: 0
                };
                
                roomOutputs[roomId] = {
                    type: 'error',
                    error: error.error,
                    executedBy: error.executedBy,
                    executionTime: error.executionTime
                };
                
                io.in(roomId).emit(ACTIONS.EXECUTION_ERROR, error);
            }, 1000);
        }
    });

    socket.on(ACTIONS.EXECUTION_RESULT, ({ roomId, output, executedBy, executionTime }) => {
        console.log(`✅ Execution successful by ${executedBy} in room ${roomId}`);
        
        roomOutputs[roomId] = {
            type: 'success',
            result: output,
            executedBy,
            executionTime
        };
        
        socket.to(roomId).emit(ACTIONS.EXECUTION_RESULT, {
            output,
            executedBy,
            executionTime
        });
    });

    socket.on(ACTIONS.EXECUTION_ERROR, ({ roomId, error, executedBy, executionTime }) => {
        console.log(`❌ Execution failed by ${executedBy} in room ${roomId}: ${error}`);
        
        roomOutputs[roomId] = {
            type: 'error',
            error,
            executedBy,
            executionTime
        };
        
        socket.to(roomId).emit(ACTIONS.EXECUTION_ERROR, {
            error,
            executedBy,
            executionTime
        });
    });

    socket.on(ACTIONS.CLEAR_OUTPUT, ({ roomId, clearedBy }) => {
        console.log(`🧹 Output cleared by ${clearedBy} in room ${roomId}`);
        delete roomOutputs[roomId];
        socket.to(roomId).emit(ACTIONS.CLEAR_OUTPUT, { clearedBy });
    });

    socket.on('disconnect', (reason) => {
        const username = userSocketMap[socket.id];
        console.log(`👋 ${username || 'Unknown user'} (${socket.id}) disconnected: ${reason}`);
        
        if (username) {
            const roomId = userRoomMap[username];
            
            // Clean up mappings
            delete userSocketMap[socket.id];
            delete userRoomMap[username];
            
            if (roomId) {
                // Notify remaining clients
                socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
                    socketId: socket.id,
                    username: username,
                });
                
                const remainingClients = getAllConnectedClients(roomId);
                socket.to(roomId).emit(ACTIONS.JOINED, {
                    clients: remainingClients,
                    username: username,
                    socketId: socket.id,
                });
                
                // Clean up empty rooms
                if (remainingClients.length === 0) {
                    delete roomLanguages[roomId];
                    delete roomCodes[roomId];
                    delete roomOutputs[roomId];
                    console.log(`🧹 Cleaned up empty room: ${roomId}`);
                }
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`📡 Socket.io server ready for connections`);
    console.log(`🔧 Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`);
    console.log(`⚡ Code execution features enabled`);
});
import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        transports: ['websocket'],
        autoConnect: true,
        forceNew: true
    };
    
    // Use environment variable or fallback to localhost
    const serverUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    
    return new Promise((resolve, reject) => {
        const socket = io(serverUrl, options);
        
        socket.on('connect', () => {
            console.log('Connected to server');
            resolve(socket);
        });
        
        socket.on('connect_error', (error) => {
            console.error('Connection failed:', error);
            reject(error);
        });
        
        // Set a timeout for connection
        setTimeout(() => {
            if (!socket.connected) {
                socket.close();
                reject(new Error('Connection timeout'));
            }
        }, 10000);
    });
};
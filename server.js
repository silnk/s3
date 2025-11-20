const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

const clients = new Map();

wss.on('connection', (ws) => {
    const userId = Date.now().toString();
    clients.set(ws, { id: userId, name: `User${userId}` });
    
    console.log(`User ${userId} connected`);
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'system',
        message: 'Welcome to the chat!',
        users: Array.from(clients.values()).map(client => client.name)
    }));
    
    // Broadcast user joined
    broadcast(JSON.stringify({
        type: 'user_joined',
        user: `User${userId}`,
        message: `User${userId} joined the chat`
    }), ws);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const user = clients.get(ws);
            
            broadcast(JSON.stringify({
                type: 'message',
                user: user.name,
                message: data.message,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        const user = clients.get(ws);
        clients.delete(ws);
        
        broadcast(JSON.stringify({
            type: 'user_left',
            user: user.name,
            message: `${user.name} left the chat`
        }));
        
        console.log(`User ${user.name} disconnected`);
    });
});

function broadcast(message, sender = null) {
    clients.forEach((user, client) => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
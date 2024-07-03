const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const users = {}; // Store usernames and their sockets

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join', (username) => { // New event for joining
        users[socket.id] = username; 
        socket.broadcast.emit('user joined', username); // Broadcast to everyone
        socket.emit('user joined', username);
    });

    socket.on('chat message', (msg) => {
        const username = users[socket.id];
        if (username) {
            io.emit('chat message', { user: username, message: msg }); // Send with username
        }
    });

    socket.on('disconnect', () => {
        const username = users[socket.id];
        if (username) {
            delete users[socket.id];
            socket.broadcast.emit('user left', username); 
            console.log('user disconnected');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});function sendMessage() {
    var message = messageInput.value.trim();
    if (message) {
        socket.emit('chat message', message); // Send only the message
        messageInput.value = '';
        messageInput.focus();
    }
}
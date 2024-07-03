const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('a user connected');

    // Listen for username setting
    socket.on('set username', (username) => {
        socket.username = username;
    });

    // Listen for chat messages
    socket.on('chat message', (msg) => {
        // Ensure username is set before sending messages
        if (socket.username) {
            // Broadcast message with username prefix
            io.emit('chat message', `${socket.username}: ${msg}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// Initialize an array to store chat messages
let chatMessages = [];

io.on('connection', (socket) => {
    console.log('a user connected');
    // Send chat history only on connection
    socket.emit('chat history', chatMessages);
    socket.on('chat message', (msg) => {
        // Add the message to the array
        chatMessages.push(msg);
        // Emit the message to all connected clients
        io.emit('chat message', msg); 
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});
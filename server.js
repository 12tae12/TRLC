const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize an array to store chat messages
let chatMessages = [];

io.on('connection', (socket) => {
    console.log('a user connected');

    // Text Chat
    socket.emit('chat history', chatMessages);

    socket.on('chat message', (msg) => {
        chatMessages.push(msg);
        io.emit('chat message', msg);
    });

    // Video Chat
    socket.on('join video chat', () => {
        socket.broadcast.emit('user joined', socket.id);
    });

    socket.on('offer', (userId, offer) => {
        socket.to(userId).emit('offer', socket.id, offer);
    });

    socket.on('answer', (userId, answer) => {
        socket.to(userId).emit('answer', socket.id, answer);
    });

    socket.on('ice candidate', (userId, candidate) => {
        socket.to(userId).emit('ice candidate', socket.id, candidate);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        // Remove user from video chat
        socket.broadcast.emit('user left', socket.id);
    });
});

app.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;
    const username = req.body.username;
    const fileInfo = {
        username: username,
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        path: file.path
    };
    chatMessages.push(fileInfo);
    io.emit('file upload', fileInfo);
    res.send('File uploaded successfully');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Listening on *:${PORT}`);
});

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');

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
    // Send chat history only on connection
    socket.emit('chat history', chatMessages);
    socket.on('chat message', (msg) => {
        // Add the message to the array
        chatMessages.push(msg);
        // Emit the message to all connected clients
        io.emit('chat message', msg); 
    });
    socket.on('file upload', (fileInfo) => {
        chatMessages.push(fileInfo);
        io.emit('file upload', fileInfo);
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

// Endpoint to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const fileInfo = {
        username: req.body.username,
        filename: req.file.filename,
        originalname: req.file.originalname
    };
    io.emit('file upload', fileInfo);
    res.status(200).send('File uploaded successfully.');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});

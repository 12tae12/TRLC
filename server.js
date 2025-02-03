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
app.use(express.json());

// Initialize an array to store chat messages
let chatMessages = [];

// Notifications array to store notifications
const notifications = [];

// Users array to store user profiles
const usersFilePath = './users.json';

// Load existing users from file
let users = [];
if (fs.existsSync(usersFilePath)) {
    users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
}

const threadsFilePath = path.join(__dirname, 'threads.json');
let threads = JSON.parse(fs.readFileSync(threadsFilePath, 'utf8')).threads;

let messages = {}; // Store messages for each thread

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join thread', (data) => {
        const { username, threadName } = data;
        const thread = threads.find(t => t.name === threadName);

        if (thread && thread.users.includes(username)) {
            socket.join(threadName);
            socket.emit('joined thread', threadName);
        } else {
            socket.emit('error', 'You do not have access to this thread');
        }
    });

    socket.on('chat message', (data) => {
        const { threadName, message } = data;
        if (!messages[threadName]) {
            messages[threadName] = [];
        }
        messages[threadName].push(message);
        io.to(threadName).emit('chat message', message);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

app.post('/upload', upload.single('file'), (req, res) => {
    const { username, threadName } = req.body;
    const file = req.file;

    if (!messages[threadName]) {
        messages[threadName] = [];
    }

    const fileInfo = {
        username,
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        path: file.path
    };

    messages[threadName].push(fileInfo);
    io.to(threadName).emit('file upload', fileInfo);
    res.status(201).send('File uploaded');
});

// Endpoint to get notifications
app.get('/notifications', (req, res) => {
    res.json(notifications);
});

// Endpoint to add a notification
app.post('/notifications', (req, res) => {
    const notification = req.body;
    notifications.push(notification);
    io.emit('new notification', notification);
    res.status(201).send('Notification added');
});

// Endpoint to get user profiles
app.get('/users', (req, res) => {
    res.json(users);
});

// Endpoint to add a user profile
app.post('/users', (req, res) => {
    const user = req.body;
    const existingUser = users.find(u => u.username === user.username);

    if (existingUser) {
        return res.status(409).send('Username already exists');
    }

    users.push(user);
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    res.status(201).send('User profile added');
});

// Endpoint to get threads
app.get('/threads', (req, res) => {
    res.json({ threads });
});

app.get('/messages/:threadName', (req, res) => {
    const threadName = req.params.threadName;
    res.json({ messages: messages[threadName] || [] });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});

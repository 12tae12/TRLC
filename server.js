const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json());
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
    const usersData = fs.readFileSync(usersFilePath);
    users = JSON.parse(usersData);
}

const threadsFilePath = path.join(__dirname, 'threads.json');
let threads = JSON.parse(fs.readFileSync(threadsFilePath, 'utf8')).threads;

let messages = {}; // Store messages for each thread

// Just so you know, I have trouble coding .js, .css, .json and of course mp3 (lol) so this was work!

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
        logMessage(threadName, message);
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
    logMessage(threadName, fileInfo);
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

const logMessage = (threadName, message) => {
    const logFilePath = path.join(__dirname, 'logs', `${threadName}.log`);
    const logEntry = `${new Date().toISOString()} - ${JSON.stringify(message)}\n`;
    fs.appendFileSync(logFilePath, logEntry, 'utf8');
};

const loadMessagesFromLogs = () => {
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }

    fs.readdirSync(logDir).forEach(file => {
        const threadName = path.basename(file, '.log');
        const logFilePath = path.join(logDir, file);
        const logEntries = fs.readFileSync(logFilePath, 'utf8').split('\n').filter(Boolean);

        messages[threadName] = logEntries.map(entry => {
            try {
                const [timestamp, message] = entry.split(' - ');
                return JSON.parse(message);
            } catch (error) {
                console.error(`Failed to parse log entry: ${entry}`, error);
                return null;
            }
        }).filter(Boolean); // Remove any null entries
    });
};

// Load messages from log files when the server starts
loadMessagesFromLogs();

// Route to handle signup
app.post('/signup', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).send('All fields are required');
    }

    const userExists = users.some(user => user.username === username || user.email === email);

    if (userExists) {
        return res.status(400).send('User already exists');
    }

    const newUser = { username, email, password };
    users.push(newUser);

    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

    // Add user to all threads
    const threadsFilePath = path.join(__dirname, 'threads.json');
    if (fs.existsSync(threadsFilePath)) {
        const threadsData = fs.readFileSync(threadsFilePath);
        const threads = JSON.parse(threadsData);

        threads.threads.forEach(thread => {
            if (!thread.users.includes(username)) {
                thread.users.push(username);
            }
        });

        fs.writeFileSync(threadsFilePath, JSON.stringify(threads, null, 2));
    }

    res.status(201).send('User registered successfully');
});

// Route to handle login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('All fields are required');
    }

    if (!fs.existsSync(usersFilePath)) {
        return res.status(400).send('User not found');
    }

    const usersData = fs.readFileSync(usersFilePath);
    const users = JSON.parse(usersData);

    const user = users.find(user => user.username === username && user.password === password);

    if (!user) {
        return res.status(400).send('Invalid username or password');
    }

    res.status(200).json({ username: user.username });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});

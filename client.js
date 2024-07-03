// client.js
var socket = io();
var usernameModal = document.getElementById('usernameModal');
var usernameInput = document.getElementById('usernameInput');
var usernameSubmit = document.getElementById('usernameSubmit');
var messages = document.getElementById('messages');
var messageInput = document.getElementById('messageInput');
var sendButton = document.getElementById('sendButton');
var username;

// Show username input modal on page load
document.addEventListener('DOMContentLoaded', function() {
    usernameModal.style.display = 'flex';
});

// Handle username submission
usernameSubmit.addEventListener('click', function(e) {
    e.preventDefault();
    username = usernameInput.value.trim();
    if (username) {
        usernameModal.style.display = 'none';
        messageInput.focus();
    }
});

// Handle message submission
sendButton.addEventListener('click', function(e) {
    e.preventDefault();
    sendMessage();
});

messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    var message = messageInput.value.trim();
    if (message) {
        socket.emit('chat message', '[' + username + ']: ' + message);
        messageInput.value = '';
        messageInput.focus();
    }
}

// Handle incoming messages
socket.on('chat message', function(msg) {
    var item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
});

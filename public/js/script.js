// Client-side JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    const messagesList = document.getElementById('messagesList');
    const messageForm = document.getElementById('messageForm');
    const nameInput = document.getElementById('nameInput');
    const messageInput = document.getElementById('messageInput');
    const fileForm = document.getElementById('fileForm');
    const fileInput = document.getElementById('fileInput');
    const fileButton = document.getElementById('fileButton');
    const videoChatButton = document.getElementById('videoChatButton');
    const videoChatContainer = document.getElementById('videoChatContainer');
    const localVideo = document.getElementById('localVideo');
    const remoteVideosContainer = document.getElementById('remoteVideos');

    let username;
    let peerConnection;
    let localStream;
    let remoteStreams = {};

    // Handle video chat button click
    videoChatButton.addEventListener('click', function() {
        toggleVideoChat();
    });

    // Function to toggle video chat container visibility
    function toggleVideoChat() {
        if (videoChatContainer.style.display === 'none') {
            videoChatContainer.style.display = 'block';
            startVideoChat();
        } else {
            videoChatContainer.style.display = 'none';
            stopVideoChat();
        }
    }

    // Function to start video chat
    async function startVideoChat() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
            localVideo.muted = true;

            // Setup WebRTC peer connection
            peerConnection = new RTCPeerConnection();

            // Add local stream to peer connection
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

            // Handle incoming ice candidates
            peerConnection.addEventListener('icecandidate', handleIceCandidate);

            // Handle incoming streams
            peerConnection.addEventListener('track', handleTrack);

            // Create offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            // Send offer to server
            socket.emit('offer', offer);
        } catch (error) {
            console.error('Error starting video chat:', error);
        }
    }

    // Function to stop video chat
    function stopVideoChat() {
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        localVideo.srcObject = null;
        clearRemoteVideos();
    }

    // Function to handle incoming ice candidates
    function handleIceCandidate(event) {
        if (event.candidate) {
            socket.emit('ice candidate', event.candidate);
        }
    }

    // Function to handle incoming tracks
    function handleTrack(event) {
        const remoteVideo = document.createElement('video');
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.autoplay = true;
        remoteVideo.className = 'remoteVideo';
        remoteVideosContainer.appendChild(remoteVideo);
        remoteStreams[event.streams[0].id] = event.streams[0];
    }

    // Function to clear remote videos
    function clearRemoteVideos() {
        remoteVideosContainer.innerHTML = '';
        remoteStreams = {};
    }

    // Socket.io listeners
    socket.on('offer', async (offer) => {
        if (!peerConnection) {
            startVideoChat();
        }
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer);
    });

    socket.on('answer', async (answer) => {
        await peerConnection.setRemoteDescription(answer);
    });

    socket.on('ice candidate', async (candidate) => {
        try {
            await peerConnection.addIceCandidate(candidate);
        } catch (error) {
            console.error('Error adding ice candidate:', error);
        }
    });

    // Handle form submit for text messages
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (messageInput.value.trim()) {
            const msg = messageInput.value.trim();
            const formattedMsg = username + ': ' + msg;
            socket.emit('chat message', formattedMsg);
            messageInput.value = '';
        }
    });

    // Handle form submit for file uploads
    fileButton.addEventListener('click', function() {
        const file = fileInput.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('username', username);

            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.text())
            .then(data => {
                console.log(data);
            })
            .catch(error => {
                console.error('Error uploading file:', error);
            });
        }
    });

    // Handle incoming chat messages
    socket.on('chat message', function(msg) {
        const item = document.createElement('li');
        item.textContent = msg;
        messagesList.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    });

    // Handle incoming chat history
    socket.on('chat history', function(history) {
        history.forEach(function(msg) {
            const item = document.createElement('li');
            item.textContent = msg;
            messagesList.appendChild(item);
        });
        window.scrollTo(0, document.body.scrollHeight);
    });

    // Prompt for username
    const userPrompt = prompt("Enter your desired username:");

    if (userPrompt && userPrompt.trim() !== '') {
        username = userPrompt.trim();
    } else {
        username = 'Anonymous';
    }

    // Pre-fill the name input with the username
    nameInput.value = username;
});

const socket = io();

let localStream;
const remoteStreams = {};

function startVideoChat() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localStream = stream;
            const localVideo = document.createElement('video');
            localVideo.srcObject = localStream;
            localVideo.autoplay = true;
            localVideo.muted = true;
            localVideo.classList.add('videoStream');
            document.getElementById('videosContainer').appendChild(localVideo);

            socket.emit('join video chat');

            socket.on('user joined', userId => {
                createPeerConnection(userId);
            });

            socket.on('offer', (userId, offer) => {
                handleOffer(userId, offer);
            });

            socket.on('answer', (userId, answer) => {
                handleAnswer(userId, answer);
            });

            socket.on('ice candidate', (userId, candidate) => {
                handleIceCandidate(userId, candidate);
            });
        })
        .catch(error => {
            console.error('Error accessing media devices:', error);
        });
}

function stopVideoChat() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    document.getElementById('videosContainer').innerHTML = '';
    socket.emit('leave video chat');
}

function createPeerConnection(userId) {
    const peerConnection = new RTCPeerConnection();

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice candidate', userId, event.candidate);
        }
    };

    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            socket.emit('offer', userId, peerConnection.localDescription);
        })
        .catch(error => {
            console.error('Error creating offer:', error);
        });

    socket.on('ice candidate', (candidate) => {
        peerConnection.addIceCandidate(candidate)
            .catch(error => {
                console.error('Error adding ICE candidate:', error);
            });
    });

    socket.on('answer', (answer) => {
        peerConnection.setRemoteDescription(answer)
            .catch(error => {
                console.error('Error setting remote description:', error);
            });
    });
}

function handleOffer(userId, offer) {
    const peerConnection = new RTCPeerConnection();

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice candidate', userId, event.candidate);
        }
    };

    peerConnection.setRemoteDescription(offer)
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
            socket.emit('answer', userId, peerConnection.localDescription);
        })
        .catch(error => {
            console.error('Error handling offer:', error);
        });

    socket.on('ice candidate', (candidate) => {
        peerConnection.addIceCandidate(candidate)
            .catch(error => {
                console.error('Error adding ICE candidate:', error);
            });
    });
}

function handleAnswer(userId, answer) {
    const peerConnection = remoteStreams[userId];

    if (peerConnection) {
        peerConnection.setRemoteDescription(answer)
            .catch(error => {
                console.error('Error handling answer:', error);
            });
    }
}

function handleIceCandidate(userId, candidate) {
    const peerConnection = remoteStreams[userId];

    if (peerConnection) {
        peerConnection.addIceCandidate(candidate)
            .catch(error => {
                console.error('Error handling ICE candidate:', error);
            });
    }
}

socket.on('user left', userId => {
    const videoElement = document.getElementById(userId);
    if (videoElement) {
        videoElement.parentNode.removeChild(videoElement);
        delete remoteStreams[userId];
    }
});


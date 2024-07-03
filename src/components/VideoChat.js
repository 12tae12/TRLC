// src/components/VideoChat.js
import React, { useState, useRef } from 'react';
import Peer from 'simple-peer';

const VideoChat = () => {
  const [peer, setPeer] = useState(null);
  const myVideo = useRef();
  const userVideo = useRef();
  const [userId, setUserId] = useState(null); // Unique identifier for each user

  const startVideoChat = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    myVideo.current.srcObject = stream;

    const newPeer = new Peer({
      initiator: true,
      trickle: false,
      stream
    });

    newPeer.on('signal', data => {
      // Send signal data to Cloudflare Worker
      fetch(`https://your-worker-project.greenstamp25.workers.dev/signal?id=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    });

    newPeer.on('stream', userStream => {
      userVideo.current.srcObject = userStream;
    });

    setPeer(newPeer);
  };

  return (
    <div>
      <button onClick={startVideoChat}>Start Video Chat</button>
      <video ref={myVideo} autoPlay playsInline />
      <video ref={userVideo} autoPlay playsInline />
    </div>
  );
};

export default VideoChat;

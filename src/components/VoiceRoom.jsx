// VoiceRoom.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const VoiceRoom = ({ roomId, sender, mediaRec }) => {
  console.log("Mentor is listening to roomId:", roomId);

  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

 useEffect(() => {
  fetchMessages();
  const interval = setInterval(fetchMessages, 3000); // every 3 seconds
  return () => clearInterval(interval);
}, []);


  const fetchMessages = async () => {
  const res = await axios.get(`http://localhost:5000/api/voice-messages/${roomId}`);
  console.log("🎧 Fetched messages:", res.data);
  setMessages(res.data);
};


const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  mediaRecorderRef.current = recorder;

  recorder.ondataavailable = (e) => chunksRef.current.push(e.data);

  recorder.onstop = async () => {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];

    const formData = new FormData();
    formData.append("audio", blob, `${Date.now()}.webm`);
    formData.append("sender", sender);
    formData.append("room", roomId);

    try {
      await axios.post("http://localhost:5000/api/voice-upload", formData);
      fetchMessages(); // refresh
    } catch (err) {
      console.error("Failed to send voice message:", err);
    }
  };

  recorder.start();
  setRecording(true);
};


  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  return (
    <div className="voice-room">
      <h2>Voice Room: {roomId}</h2>

      <div>
        {recording ? (
          <button onClick={stopRecording}>⏹️ Stop Recording</button>
        ) : (
          <button onClick={startRecording}>🎙️ Start Recording</button>
        )}
      </div>

      <h3>Messages</h3>
      <ul>
        {messages.map((msg, idx) => (
          <li key={idx}>
            <strong>{msg.sender}</strong>:{" "}
            <audio controls src={`http://localhost:5000${msg.url}`} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VoiceRoom;

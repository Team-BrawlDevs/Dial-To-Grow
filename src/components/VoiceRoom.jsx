import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./VoiceRoom.css";

const VoiceRoom = ({ sender, queryId, senderId }) => {
  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [textMessage, setTextMessage] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/chat/${queryId}`);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to fetch chat messages:", err);
    }
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
      formData.append("sender_id", senderId);
      formData.append("query_id", queryId);
      formData.append("message", "[voice]");

      try {
        await axios.post("http://localhost:5000/api/chat", formData);
        fetchMessages();
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

  const sendTextMessage = async () => {
    if (!textMessage.trim()) return;
    try {
      await axios.post("http://localhost:5000/api/chat", {
        message: textMessage,
        sender_id: senderId,
        query_id: queryId,
      });
      setTextMessage("");
      fetchMessages();
    } catch (err) {
      console.error("Failed to send text message:", err);
    }
  };

  return (
    <div className="voice-room-container">
      <div className="header">
        <h2>💬 Voice Chat: {queryId}</h2>
      </div>

      <div className="message-list">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message-bubble ${
              msg.sender_id === senderId ? "own" : ""
            }`}
          >
            <div className="sender">
              {msg.sender_id === senderId ? "You" : "Mentor"}
            </div>
            {msg.audio_url ? (
              <audio controls src={`http://localhost:5000${msg.audio_url}`} />
            ) : (
              <div className="text-message">{msg.message}</div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-controls">
        <input
          type="text"
          value={textMessage}
          onChange={(e) => setTextMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button onClick={sendTextMessage}>Send</button>
      </div>

      <div className="recording-button">
        {recording ? (
          <button onClick={stopRecording} className="stop-button">
            ⏹️ Stop Recording
          </button>
        ) : (
          <button onClick={startRecording} className="start-button">
            🎙️ Record Voice
          </button>
        )}
      </div>
    </div>
  );
};

export default VoiceRoom;

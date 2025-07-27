import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";
import "./VoiceRoom.css";

const VoiceRoom = ({ sender, queryId, senderId }) => {
  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [textMessage, setTextMessage] = useState("");
  const [inCall, setInCall] = useState(false);
  const [warning, setWarning] = useState(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);

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

      try {
        // Analyze audio before saving
        const analysisRes = await axios.post("http://localhost:5000/analyze-audio", formData);
        if (analysisRes.data.isAbusive) {
          setWarning(analysisRes.data.message);
          return;
        } else {
          setWarning(null);
        }

        // Save audio only if safe
        const uploadForm = new FormData();
        uploadForm.append("audio", blob, `${Date.now()}.webm`);
        uploadForm.append("sender_id", senderId);
        uploadForm.append("query_id", queryId);
        uploadForm.append("message", "[voice]");

        await axios.post("http://localhost:5000/api/chat", uploadForm);
        fetchMessages();
      } catch (err) {
        console.error("Failed to analyze or send voice message:", err);
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

  const startCall = async () => {
    socketRef.current = io("http://localhost:5001");

    localStreamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    peerConnectionRef.current = new RTCPeerConnection();

    localStreamRef.current.getTracks().forEach((track) => {
      peerConnectionRef.current.addTrack(track, localStreamRef.current);
    });

    peerConnectionRef.current.ontrack = (event) => {
      const remoteStream = new MediaStream();
      remoteStream.addTrack(event.track);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    };

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", {
          candidate: event.candidate,
          room: queryId,
        });
      }
    };

    socketRef.current.emit("join-room", queryId);

    socketRef.current.on("offer", async ({ offer }) => {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socketRef.current.emit("answer", { answer, room: queryId });
    });

    socketRef.current.on("answer", async ({ answer }) => {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    socketRef.current.on("ice-candidate", async ({ candidate }) => {
      try {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (e) {
        console.error("Error adding received ice candidate", e);
      }
    });

    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);
    socketRef.current.emit("offer", { offer, room: queryId });

    setInCall(true);
  };

  return (
    <div className="cont">
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

        {warning && (
  <div className="popup-overlay">
    <div className="popup-warning">
      <h3>⚠️ Inappropriate Language Detected</h3>
      <p>{warning}</p>
      <button onClick={() => setWarning(null)}>Close</button>
    </div>
  </div>
)}

        <div className="chat-controls">
          <input
            type="text"
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            placeholder="Type your message..."
            style={{ border: "none", borderRadius: "20px", width: "80%" }}
          />
          <button
            onClick={sendTextMessage}
            style={{ width: "70px", height: "30px", padding: "2px" }}
          >
            Send
          </button>

          <div className="recording-button">
            {recording ? (
              <button onClick={stopRecording} className="stop-button">
                ⏹️
              </button>
            ) : (
              <button onClick={startRecording} className="start-button">
                🎙️
              </button>
            )}
          </div>
        </div>

        <div className="call-button">
          {!inCall && (
            <button onClick={startCall} className="start-button">
              📞 Call
            </button>
          )}
          <audio ref={remoteAudioRef} autoPlay />
        </div>
      </div>
    </div>
  );
};

export default VoiceRoom;

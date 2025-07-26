import React, { useState, useRef } from "react";
import axios from "axios";

const AIMentor = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "audio.webm", { type: "audio/webm" });

        const userAudioURL = URL.createObjectURL(audioBlob);

        const formData = new FormData();
        formData.append("audio", audioFile);
        formData.append("history", JSON.stringify(
          chatHistory.flatMap(chat => ([
            { role: "user", content: chat.transcript },
            { role: "assistant", content: chat.reply }
          ]))
        ));

        try {
          const res = await axios.post("http://localhost:5000/api/mentor-chat", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          const { transcript, reply, bot_audio_url } = res.data;

          setChatHistory(prev => [
            ...prev,
            {
              userAudio: userAudioURL,
              botAudio: `http://localhost:5000${bot_audio_url}?t=${Date.now()}`,
              transcript,
              reply,
            },
          ]);
        } catch (err) {
          console.error("❌ Backend error:", err);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("❌ Mic access error:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🎙️ AI Mentor</h2>

      <button onClick={isRecording ? stopRecording : startRecording} style={styles.recordBtn}>
        {isRecording ? "⏹️ Stop Recording" : "🎤 Start Recording"}
      </button>

      <div style={styles.chatSection}>
        {chatHistory.map((chat, i) => (
          <div key={i} style={styles.chatBlock}>
            <div style={{ ...styles.bubble, ...styles.userBubble }}>
              <div style={styles.role}>🧑‍🎓 You</div>
              <audio src={chat.userAudio} controls style={styles.audio} />
              <p style={styles.text}><em>{chat.transcript}</em></p>
            </div>

            <div style={{ ...styles.bubble, ...styles.botBubble }}>
              <div style={styles.role}>🤖 Mentor</div>
              <audio src={chat.botAudio} controls style={styles.audio} />
              <p style={styles.text}><em>{chat.reply}</em></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: "'Segoe UI', sans-serif",
    padding: "30px 20px",
    maxWidth: "800px",
    margin: "auto",
    backgroundColor: "#fefefe",
  },
  title: {
    textAlign: "center",
    fontSize: "2rem",
    color: "#333",
    marginBottom: "30px",
  },
  recordBtn: {
    display: "block",
    margin: "0 auto 30px auto",
    backgroundColor: "#4CAF50",
    color: "white",
    fontSize: "16px",
    padding: "12px 25px",
    border: "none",
    borderRadius: "30px",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
    transition: "background 0.3s",
  },
  chatSection: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  chatBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  bubble: {
    padding: "15px 20px",
    borderRadius: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  userBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
  },
  botBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#d9fdd3",
  },
  role: {
    fontWeight: "bold",
    marginBottom: "5px",
  },
  text: {
    margin: "10px 0 0 0",
    fontSize: "15px",
    color: "#333",
  },
  audio: {
    marginTop: "5px",
    width: "100%",
  },
};

export default AIMentor;

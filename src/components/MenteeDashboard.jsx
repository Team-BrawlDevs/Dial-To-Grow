import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import VoiceRoom from "./VoiceRoom"; // import the component

const MenteeDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [status, setStatus] = useState("");
  const [queryId, setQueryId] = useState(null);
  const [mentorName, setMentorName] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunks = useRef([]);

  useEffect(() => {
    // Fetch assigned mentor and room ID
    const fetchMentor = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/assigned-mentor/${user.id}`
        );
        if (res.data && res.data.query_id) {
          setQueryId(res.data.query_id);
          setMentorName(res.data.mentor?.name || "Mentor");
        }
      } catch (err) {
        console.error("Error fetching mentor:", err);
      }
    };

    fetchMentor();
  }, [user.id]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.ondataavailable = (e) =>
      chunks.current.push(e.data);
    mediaRecorderRef.current.onstop = handleRecordingStop;
    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handleRecordingStop = async () => {
  const blob = new Blob(chunks.current, { type: "audio/webm" });

  const file = new File([blob], "recording.webm", { type: "audio/webm" });
  const formData = new FormData();
  formData.append("audio", file);
  formData.append("mentee_id", user.id);
  formData.append("language_id", 1);

  setStatus("Uploading...");

  try {
    const res = await axios.post("http://localhost:5000/api/query", formData);
    setAudioURL(res.data.audio_url);
    setStatus(`Success! Career: ${res.data.career}`);
    console.log("Sending to queryId:", queryId);

    // ✅ Also upload to mentor via voice-upload API
    if (queryId) {
      const voiceForm = new FormData();
      voiceForm.append("audio", blob, `${Date.now()}.webm`);
      voiceForm.append("sender", user.name);
      voiceForm.append("room", queryId);

      await axios.post("http://localhost:5000/api/voice-upload", voiceForm);
    }

  } catch (err) {
    console.error(err);
    setStatus("Error uploading or transcribing");
  }

  chunks.current = [];
};


  return (
    <div>
      <button></button>
    <div className="container">
      <h2>Welcome Mentee {user?.name || "User"}</h2>
      <p>This is your dashboard.</p>

      <div>
        <button onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? "Stop Recording" : "Record Query"}
        </button>
      </div>

      {status && <p>{status}</p>}
      {audioURL && (
        <div>
          <audio controls src={audioURL}></audio>
        </div>
      )}

      {/* If mentor is assigned, render the voice chat */}
      {queryId && (
        <div>
          <h3>Chat with {mentorName}</h3>
          <VoiceRoom mediaRec={mediaRecorderRef} queryId={queryId} senderId={user?.id} />
        </div>
      )}
    </div>
    </div>
  );
};

export default MenteeDashboard;

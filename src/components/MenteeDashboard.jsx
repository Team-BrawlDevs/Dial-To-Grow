import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import VoiceRoom from "./VoiceRoom";
import { FaDiscourse } from "react-icons/fa";
import { BsRecordCircle } from "react-icons/bs";
import { RiCommunityFill } from "react-icons/ri";
import { useContext } from "react";
import { AuthContext } from "../auth";

const MenteeDashboard = () => {
  const { logout } = useContext(AuthContext);

  const user = JSON.parse(localStorage.getItem("user"));
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [status, setStatus] = useState("");
  const [queryId, setQueryId] = useState(null);
  const [mentorName, setMentorName] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunks = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMentorAndCache = async () => {
      try {
        const mentorRes = await axios.get(
          `http://localhost:5000/api/assigned-mentor/${user.id}`
        );

        if (mentorRes.data && mentorRes.data.query_id) {
          const queryId = mentorRes.data.query_id;
          const mentorName = mentorRes.data.mentor?.name || "Mentor";

          setQueryId(queryId);
          setMentorName(mentorName);

          // ✅ Cache podcast episodes for offline
          const episodesRes = await axios.get(
            `http://localhost:5000/api/podcast-episodes/${queryId}?mentee_id=${user.id}`
          );
          const episodesKey = `episodes_${user.id}_${queryId}`;
          localStorage.setItem(episodesKey, JSON.stringify(episodesRes.data));
        }

        // ✅ Cache course list for offline
        const courseRes = await axios.get(
          `http://localhost:5000/api/courses/${user.id}`
        );
        const courseKey = `courses_${user.id}`;
        localStorage.setItem(courseKey, JSON.stringify(courseRes.data));
      } catch (err) {
        console.error("Offline caching error:", err);
      }
    };

    fetchMentorAndCache();
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

  // Reusable style
  const buttonStyle = {
    width: "200px",
    borderRadius: "20px",
    height: "50px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.3s ease",
  };

  const hoverStyle = {
    backgroundColor: "#f07c00",
    color: "#fff",
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Top-right button */}
      <button
        onClick={() => navigate("/groups")}
        style={{
          position: "absolute",
          top: "5px",
          right: "60px",
          width: "130px",
          padding: "8px 12px",
          backgroundColor: "#00c8ff",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontWeight: "bold",
          transition: "background-color 0.3s ease",
        }}
        onMouseEnter={(e) => (e.target.style.backgroundColor = "#009fd1")}
        onMouseLeave={(e) => (e.target.style.backgroundColor = "#00c8ff")}
      >
        <RiCommunityFill style={{ marginRight: "7px" }} />
        Join Community
      </button>
      {/* Logout Button */}
      <button
        onClick={() => {
          logout();
          navigate("/login");
        }}
        style={{
          position: "absolute",
          top: "5px",
          right: "200px",
          width: "100px",
          padding: "8px 12px",
          backgroundColor: "#ff4d4d",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontWeight: "bold",
          transition: "background-color 0.3s ease",
        }}
        onMouseEnter={(e) => (e.target.style.backgroundColor = "#d63333")}
        onMouseLeave={(e) => (e.target.style.backgroundColor = "#ff4d4d")}
      >
        Logout
      </button>

      <div className="container">
        <h2>Welcome Mentee {user?.name || "User"}</h2>
        <p>This is your dashboard.</p>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <button
            onClick={() => navigate(`/explore/${user.id}`)}
            style={{
              ...buttonStyle,
              backgroundColor: "#d3d3d3",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#999";
              e.target.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#d3d3d3";
              e.target.style.color = "black";
            }}
          >
            <FaDiscourse /> Explore Courses
          </button>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              ...buttonStyle,
              backgroundColor: "orange",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#e67600")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "orange")}
          >
            {isRecording ? (
              "Stop Recording"
            ) : (
              <>
                <BsRecordCircle style={{ marginRight: "6px" }} />
                Record Query
              </>
            )}
          </button>
        </div>

        {status && (
          <p style={{ marginTop: "20px", fontWeight: "bold" }}>{status}</p>
        )}

        {audioURL && (
          <div style={{ marginTop: "15px" }}>
            <audio controls src={audioURL}></audio>
          </div>
        )}

        {queryId && (
          <div style={{ marginTop: "30px" }}>
            <h3>Chat with {mentorName}</h3>
            <VoiceRoom
              mediaRec={mediaRecorderRef}
              queryId={queryId}
              senderId={user?.id}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MenteeDashboard;

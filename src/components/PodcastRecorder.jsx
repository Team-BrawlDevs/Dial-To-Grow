import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const PodcastRecorder = () => {
  const { id: mentorId, podcastId } = useParams();

  const [episodes, setEpisodes] = useState([]);
  const [podcast, setPodcast] = useState({ title: "", description: "" });
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const audioRef = useRef(null);

  // Debug episodes after they update
  useEffect(() => {
    console.log("✅ Episodes updated:", episodes);
  }, [episodes]);

  useEffect(() => {
    if (podcastId) {
      fetchPodcast();
      fetchEpisodes();
    }
  }, [podcastId]);

  const fetchPodcast = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/podcasts/${podcastId}`);
      setPodcast(res.data);
    } catch (err) {
      console.error("Error fetching podcast details:", err);
    }
  };

  const fetchEpisodes = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/podcasts/${podcastId}/episodes`);
      setEpisodes(res.data || []); // fallback to empty array
    } catch (err) {
      console.error("Error loading episodes:", err);
    }
  };

  const startRecording = async () => {
    try {
      setAudioBlob(null);
      setAudioUrl(null);
      if (audioRef.current) {
        audioRef.current.src = "";
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.load(); // reload new audio
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const handleUpload = async () => {
    if (!title || !audioBlob) {
      alert("Please provide a title and record something.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("audio", audioBlob); // correct blob

    try {
      setLoading(true);
      await axios.post(
        `http://localhost:5000/api/podcasts/${podcastId}/episodes`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setTitle("");
      setAudioBlob(null);
      setAudioUrl(null);
      if (audioRef.current) audioRef.current.src = "";
      fetchEpisodes(); // refresh episodes list
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="podcast-recorder">
  <h2>🎙️ {podcast.title}</h2>
  <p>{podcast.description}</p>

  <div className="record-section">
    <h3>➕ Record New Episode</h3>
    <input
      className="episode-title-input"
      type="text"
      placeholder="Episode Title"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      style={{width:"550px"}}
    />
    <br />
    <button
      className={`record-button ${recording ? "stop" : "start"}`}
      onClick={recording ? stopRecording : startRecording}
    >
      {recording ? "⏹️ Stop Recording" : "🎤 Start Recording"}
    </button>

    {audioUrl && (
      <div className="preview-section">
        <p>✅ Recorded Preview:</p>
        <audio ref={audioRef} controls src={audioUrl} />
      </div>
    )}

    <button
      className="upload-button"
      onClick={handleUpload}
      disabled={loading || !audioBlob}
    >
      {loading ? "Uploading..." : "⬆️ Upload Episode"}
    </button>
  </div>

  <h3>📻 Existing Episodes</h3>
  {episodes.length === 0 ? (
    <p>No episodes yet.</p>
  ) : (
    <ul className="episode-list">
      {episodes.map((ep) => (
        <li key={ep.id} className="episode-item">
          <strong>{ep.title}</strong>
          <br />
          <audio controls src={ep.audio_url} />
          <br />
          <small>
            Uploaded on: {new Date(ep.created_at).toLocaleString()}
          </small>
        </li>
      ))}
    </ul>
  )}
</div>

  );
};

export default PodcastRecorder;

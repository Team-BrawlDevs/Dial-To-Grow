import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
const PodcastUploader = () => {
  const [podcast, setPodcast] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [careerPath, setCareerPath] = useState("");
  const [languageId, setLanguageId] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [recording, setRecording] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const { id } = useParams()
  const navigate=useNavigate();

  const createPodcast = async () => {
    
    const res = await axios.post("http://localhost:5000/api/podcasts", {
      mentor_id: id,
      title,
      description,
      career_path: careerPath,
      original_language_id: languageId || null,
    });
    setPodcast(res.data.podcast);
    alert("Podcast created!");
    navigate(`/mentor/${id}/podcast`);
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = e => audioChunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = handleAudioUpload;
    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const handleAudioUpload = async () => {
    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", blob, "episode.webm");
    formData.append("title", episodeTitle);

    const res = await axios.post(
      `http://localhost:5000/api/podcasts/${podcast.id}/episodes`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    setEpisodes(prev => [...prev, res.data.episode]);
    setEpisodeTitle("");
    alert("Episode uploaded! Transcript ready.");
  };

  return (
  <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <div>
        <h2>Create Podcast</h2>
        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} /><br />
        <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} /><br />
        <input placeholder="Career Path" value={careerPath} onChange={e => setCareerPath(e.target.value)} /><br />
        <input placeholder="Language ID" value={languageId} onChange={e => setLanguageId(e.target.value)} /><br />
        <button onClick={createPodcast}>Create</button>
      </div>
  </div>
);

};

export default PodcastUploader;

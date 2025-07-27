import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const PodcastList = () => {
  const { id } = useParams(); // mentorId
  const [podcasts, setPodcasts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/mentors/${id}/podcasts`)
      .then((res) => setPodcasts(res.data))
      .catch((err) => console.error("Error loading podcasts:", err));
  }, [id]);

  const containerStyle = {
    padding: "2rem",
    maxWidth: "600px",
    margin: "auto",
    fontFamily: "sans-serif",
  };

  const headingStyle = {
    fontSize: "1.8rem",
    marginBottom: "1rem",
    textAlign: "center",
    color: "#333",
  };

  const buttonStyle = {
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
    marginBottom: "1.5rem",
    display: "block",
    marginLeft: "auto",
  };

  const podcastItemStyle = {
    marginBottom: "16px",
    padding: "16px",
    backgroundColor: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  };

  const recorderButtonStyle = {
    marginTop: "10px",
    backgroundColor: "#28a745",
    color: "white",
    padding: "8px 12px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  };

  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>🎙️ My Podcasts</h2>
      <button
        onClick={() => navigate(`/mentor/${id}/podcast/new`)}
        style={buttonStyle}
      >
        ➕ Create Podcast
      </button>
      <ul style={{ listStyleType: "none", padding: 0 }}>
        {podcasts.length > 0 ? (
          podcasts.map((p) => (
            <li key={p.id} style={podcastItemStyle}>
              <strong>{p.title}</strong>
              <p style={{ margin: "6px 0", color: "#555" }}>{p.description}</p>
              <button
                onClick={() => navigate(`/mentor/${id}/podcast/${p.id}/recorder`)}
                style={recorderButtonStyle}
              >
                🎧 Go to Recorder
              </button>
            </li>
          ))
        ) : (
          <p style={{ textAlign: "center", color: "#666" }}>No podcasts yet.</p>
        )}
      </ul>
    </div>
  );
};

export default PodcastList;

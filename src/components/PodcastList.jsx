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

  return (
    <div style={{ padding: "20px" }}>
      <h2>🎙️ My Podcasts</h2>
      <button onClick={() => navigate(`/mentor/${id}/podcast/new`)}>
        ➕ Create Podcast
      </button>
      <ul style={{ listStyleType: "none", padding: 0 }}>
        {podcasts.length > 0 ? (
          podcasts.map((p) => (
            <li
              key={p.id}
              style={{
                marginBottom: "15px",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "5px",
              }}
            >
              <strong>{p.title}</strong> - {p.description}
              <br />
              <button
                style={{ marginTop: "8px" }}
                onClick={() => navigate(`/mentor/${id}/podcast/${p.id}/recorder`)}
              >
                🎧 Go to Recorder
              </button>
            </li>
          ))
        ) : (
          <p>No podcasts yet.</p>
        )}
      </ul>
    </div>
  );
};

export default PodcastList;

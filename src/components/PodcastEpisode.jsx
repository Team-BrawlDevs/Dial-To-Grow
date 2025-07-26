import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const PodcastEpisodes = () => {
  const { userId, podcastId } = useParams();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("userId:", userId, "podcastId:", podcastId);
    axios
      .get(`http://localhost:5000/api/podcast-episodes/${podcastId}?mentee_id=${userId}`)
      .then((res) => {
        setEpisodes(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load episodes:", err);
        setLoading(false);
      });
  }, [userId, podcastId]);

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "15px" }}>Episodes</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        episodes.map((ep) => (
          <div
            key={ep.id}
            style={{
              marginBottom: "15px",
              padding: "15px",
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ fontSize: "18px", marginBottom: "5px" }}>{ep.title}</h3>
            <audio controls src={ep.audio_url}></audio>
          </div>
        ))
      )}
    </div>
  );
};

export default PodcastEpisodes;

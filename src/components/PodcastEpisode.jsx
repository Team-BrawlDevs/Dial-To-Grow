import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const PodcastEpisodes = () => {
  const { userId, podcastId } = useParams();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const localKey = `episodes_${userId}_${podcastId}`;

    const loadEpisodes = async () => {
      setLoading(true);

      // Try loading from localStorage first
      const cached = localStorage.getItem(localKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setEpisodes(parsed);
          setLoading(false);
        } catch (err) {
          console.warn("Invalid cached data:", err);
        }
      }

      // If online, try fetching latest
      if (navigator.onLine) {
        try {
          const res = await axios.get(
            `http://localhost:5000/api/podcast-episodes/${podcastId}?mentee_id=${userId}`
          );
          setEpisodes(res.data);
          localStorage.setItem(localKey, JSON.stringify(res.data));
          setLoading(false);
        } catch (err) {
          console.error("Failed to load episodes from API:", err);
          setLoading(false);
        }
      } else if (!cached) {
        // If no cache and offline
        setEpisodes([]);
        setLoading(false);
      }
    };

    loadEpisodes();
  }, [userId, podcastId]);

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "20px" }}>
        🎧 Podcast Episodes
      </h2>
      {loading ? (
        <p>Loading...</p>
      ) : episodes.length > 0 ? (
        episodes.map((ep) => (
          <div
            key={ep.id}
            style={{
              marginBottom: "20px",
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "12px",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
              backgroundColor: "#f9f9f9",
            }}
          >
            <h3
              style={{
                fontSize: "20px",
                fontWeight: "500",
                marginBottom: "10px",
              }}
            >
              {ep.title}
            </h3>
            <audio controls src={ep.audio_url} style={{ width: "100%" }} />
          </div>
        ))
      ) : (
        <p>No episodes available.</p>
      )}
    </div>
  );
};

export default PodcastEpisodes;

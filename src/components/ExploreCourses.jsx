import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const ExploreCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userId } = useParams();
  const navigate=useNavigate();

  useEffect(() => {
    axios.get(`http://localhost:5000/api/courses/${userId}`)
      .then(res => {
        console.log("courses",res.data);
        setCourses(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load courses:", err);
        setLoading(false);
      });
  }, [userId]);

  const containerStyle = {
    maxWidth: "800px",
    margin: "40px auto",
    padding: "20px",
    backgroundColor: "#fafafa",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.08)",
    fontFamily: "Arial, sans-serif"
  };

  const headingStyle = {
    textAlign: "center",
    fontSize: "24px",
    marginBottom: "25px",
    color: "#333"
  };

  const messageStyle = {
    textAlign: "center",
    fontSize: "16px",
    color: "#777"
  };

  const listStyle = {
    listStyleType: "none",
    padding: 0
  };

  const cardStyle = {
    backgroundColor: "white",
    border: "1px solid #ddd",
    padding: "18px",
    marginBottom: "16px",
    borderRadius: "8px",
    transition: "box-shadow 0.3s ease"
  };

  const titleStyle = {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "8px",
    color: "#0056b3"
  };

  const descriptionStyle = {
    fontSize: "15px",
    color: "#444"
  };

  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>🎙️ Recommended Podcasts</h2>
      {loading ? (
        <p style={messageStyle}>Loading...</p>
      ) : courses.length === 0 ? (
        <p style={messageStyle}>No matching podcasts found.</p>
      ) : (
        <ul style={listStyle}>
          {courses.map((podcast, idx) => (
            <li key={idx} style={cardStyle} onClick={() => navigate(`/podcast/${userId}/${podcast.id}`)}>
              <h3 style={titleStyle}>{podcast.title}</h3>
              <p style={descriptionStyle}>{podcast.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ExploreCourses;

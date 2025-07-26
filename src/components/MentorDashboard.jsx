import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const MentorDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user")); // Must contain mentor's ID, name, and expertise
  const [requests, setRequests] = useState([]);
  const navigate=useNavigate();

  useEffect(() => {
    if (user?.id) {
      axios
        .get(`http://localhost:5000/api/requests/mentor/${user.id}`)
        .then((res) => {
          console.log("Fetched Requests:", res.data);
          setRequests(res.data);
        })
        .catch((err) => {
          console.error("Error fetching requests:", err);
        });
    }
  }, [user?.id]);

  const handleResponse = async (queryId, menteeName, action) => {
    try {
      const payload = {
        queryId,
        mentorId: user.id,
        action,
      };

      const response = await axios.post(
        "http://localhost:5000/api/respond",
        payload
      );
      console.log("Response saved:", response.data);

      setRequests((prev) => prev.filter((r) => r.id !== queryId));

      if (action === "accept") {
        window.location.href = `/voice-room/${queryId}`;
      }
    } catch (error) {
      console.error("Error responding to request:", error);
    }
  };

  return (
    <div className="container">
      <h2>Welcome Mentor {user?.name || "User"}</h2>
      <p>This is your dashboard.</p>
      <button
        onClick={() => navigate(`/mentor/${user.id}/podcast`)}
        style={{ marginBottom: "20px" }}
      >
        🎙️ My Podcasts
      </button>
      <h3>Pending Mentee Requests:</h3>
      {requests.length === 0 ? (
        <p>No requests currently.</p>
      ) : (
        requests.map((r) => (
          <div key={r.id} className="card">
            <p>
              <strong>Mentee:</strong> {r.menteeName}
            </p>
            <p>
              <strong>Career:</strong> {r.career}
            </p>
            <p>
              <strong>Query:</strong> {r.transcription}
            </p>
            <button
              onClick={() => handleResponse(r.id, r.menteeName, "accept")}
            >
              Accept
            </button>
            <button
              onClick={() => handleResponse(r.id, r.menteeName, "reject")}
            >
              Reject
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default MentorDashboard;

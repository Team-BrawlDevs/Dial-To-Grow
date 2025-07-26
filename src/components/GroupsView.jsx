import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function GroupsView() {
  const user = JSON.parse(localStorage.getItem("user")); // Must contain mentor's ID, name, and expertise
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    if (user?.id) {
      axios
        .get(`http://localhost:5000/api/get-groups`)
        .then((res) => {
          console.log("Fetched Requests:", res.data);
          setGroups(res.data);
        })
        .catch((err) => {
          console.error("Error fetching requests:", err);
        });
    }
  }, [user?.id]);
  return (
    <div className="cont">
      <div style={{ padding: "16px" }}>
        {groups.map((v) => (
          <Link
            key={v.id}
            to={`/voice-room/${v.id}`}
            style={{
              display: "block",
              padding: "16px 32px",
              marginBottom: "12px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              textDecoration: "none",
              color: "black",
              backgroundColor: "#f9f9f9",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#eaeaea")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#f9f9f9")
            }
          >
            <h2 style={{ margin: "0 0 4px", fontSize: "20px" }}>
              {v.group_title}
            </h2>
            {v.languages?.name && (
              <p style={{ margin: "4px 0 0", fontSize: "18px", color: "#777" }}>
                Language: {v.languages.name}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

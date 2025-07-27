import axios from "axios";
import React, { useRef, useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../auth"; // Ensure this context exists

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const passwordRef = useRef(null);
  const [user, setUser] = useState({
    email: "",
    password: "",
  });

  function handleChange(e) {
    setUser((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:3000/login", user);

      if (response.status === 200) {
        const loggedInUser = response.data.user;

        // Save user locally
        localStorage.setItem("user", JSON.stringify(loggedInUser));
        localStorage.setItem("userId", loggedInUser.id);

        login(loggedInUser); // Set global context

        // Redirect to appropriate dashboard
        if (loggedInUser.role === "mentor") {
          navigate(`/mentor/${loggedInUser.id}`);
        } else {
          navigate(`/mentee/${loggedInUser.id}`);
        }
      }
    } catch (error) {
      if (error?.response?.data?.error === "No user Found") {
        alert("User does not exist. Please create an account.");
        navigate("/register", {
          state: { email: user.email, password: user.password },
        });
      } else if (error?.response?.data?.error === "Incorrect Password") {
        alert("Incorrect password.");
        passwordRef.current?.focus();
        setUser((prev) => ({ ...prev, password: "" }));
      } else {
        alert("Something went wrong. Try again.");
      }
    }
  }

  return (
    <div className="login-container">
      <img src="image.png" alt="" height={100} style={{borderRadius:"10px"}}/>
      <h2>Sign in to your Mentor-Mentee App</h2>
      <form onSubmit={handleLogin}>
        <label>Email:</label>
        <input
          type="email"
          name="email"
          value={user.email}
          onChange={handleChange}
          required
        />

        <label>Password:</label>
        <input
          type="password"
          name="password"
          ref={passwordRef}
          value={user.password}
          onChange={handleChange}
          required
        />

        <button type="submit">Sign In</button>
        <Link to="/register">Register</Link>
      </form>
    </div>
  );
}

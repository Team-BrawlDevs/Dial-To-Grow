import React from "react";
import {
  Routes,
  Route,
  Navigate,
  BrowserRouter as Router,
  useParams,
} from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import MenteeDashboard from "./components/MenteeDashboard";
import MentorDashboard from "./components/MentorDashboard";
import { AuthProvider } from "./auth.jsx";
import VoiceRoom from "./components/VoiceRoom.jsx";

const VoiceRoomWrapper = () => {
  const { roomId } = useParams();
  const user = JSON.parse(localStorage.getItem("user"));

  return <VoiceRoom roomId={roomId} sender={user?.name || "Anonymous"} />;
};
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/mentee" element={<MenteeDashboard />} />
          <Route path="/mentor" element={<MentorDashboard />} />
          <Route path="/voice-room/:roomId" element={<VoiceRoomWrapper />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;

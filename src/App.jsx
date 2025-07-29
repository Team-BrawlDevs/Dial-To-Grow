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
import AIMentor from "./components/AIMentor.jsx";
import PodcastUploader from "./components/PodcastUploader.jsx";
import PodcastList from "./components/PodcastList.jsx";
import PodcastRecorder from "./components/PodcastRecorder.jsx";
import ExploreCourses from "./components/ExploreCourses.jsx";
import PodcastEpisodes from "./components/PodcastEpisode.jsx";
import GroupsView from "./components/GroupsView.jsx";

const VoiceRoomWrapper = () => {
  const { queryId } = useParams();
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <VoiceRoom
      queryId={queryId}
      senderId={user?.id}
      sender={user?.name || "Anonymous"}
    />
  );
};
const App = () => {
  const storedUser = JSON.parse(localStorage.getItem("user"));

  // Role-based redirection logic
  const getRedirectPath = () => {
    if (!storedUser) return "/login";
    const { id, role } = storedUser;
    if (role === "mentee") return `/mentee/${id}`;
    if (role === "mentor") return `/mentor/${id}`;
    return "/login"; // fallback
  };

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to={getRedirectPath()} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/mentee/:id" element={<MenteeDashboard />} />
          <Route path="/mentor/:id" element={<MentorDashboard />} />
          <Route path="/voice-room/:queryId" element={<VoiceRoomWrapper />} />
          <Route path="/aimentor" element={<AIMentor />} />
          <Route path="/mentor/:id/podcast" element={<PodcastList />} />
          <Route path="/mentor/:id/podcast/new" element={<PodcastUploader />} />
          <Route
            path="/mentor/:id/podcast/:podcastId/recorder"
            element={<PodcastRecorder />}
          />
          <Route path="/explore/:userId" element={<ExploreCourses />} />
          <Route
            path="/podcast/:userId/:podcastId"
            element={<PodcastEpisodes />}
          />
          <Route path="/groups" element={<GroupsView />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;

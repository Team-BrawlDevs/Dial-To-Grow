import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test endpoint
app.get("/", (req, res) => {
  res.send("Mentor-Mentee App Server is Running!");
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No user Found" });
    }

    const user = data[0];

    // Plain-text password comparison
    if (user.password !== password) {
      return res.status(401).json({ error: "Incorrect Password" });
    }

    return res.status(200).json({
      message: "Login Success",
      user: user,
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ error: "Server Error" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

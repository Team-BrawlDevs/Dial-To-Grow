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

// ---------------------- LOGIN ----------------------
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

// ---------------------- REGISTER ----------------------
app.post("/api/register", async (req, res) => {
  const {
    name,
    email,
    password,
    age,
    role,
    region,
    career,
    expertise,
    experience_years,
    bio,
    voice_call,
    languages
  } = req.body;

  const client = supabase;

  

  try {
    // Insert into users table
    const { data: userData, error: userError } = await client
      .from("users")
      .insert([
        {
          name,
          email,
          password,
          age,
          role,
          region,
          career
        }
      ])
      .select()
      .single();

    if (userError) throw userError;

    const userId = userData.id;
  console.log(userId);

    // If mentor, insert into mentors table
    if (role === "mentor") {
      let boobs = expertise?expertise.split(", "):[]
      
      const { error: mentorError } = await client
        .from("mentors")
        .insert([
          {
            user_id: userId,
            expertise: boobs,
            experience_years: experience_years || 0,
            bio: bio || "",
            available: voice_call || false
          }
        ]);

      if (mentorError) throw mentorError;
    }

    // Insert preferred languages into user_languages
    if (Array.isArray(languages)) {
      const langInserts = languages.map((langId) => ({
        user_id: userId,
        language_id: langId
      }));

      const { error: langError } = await client
        .from("user_languages")
        .insert(langInserts);

      if (langError) throw langError;
    }

    return res.status(201).json({
      message: "User registered successfully",
      user: userData
    });
  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

// ---------------------- GET LANGUAGES ----------------------
app.get("/api/languages", async (req, res) => {
  try {
    const { data, error } = await supabase.from("languages").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Language Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch languages" });
  }
});

// ---------------------- START SERVER ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

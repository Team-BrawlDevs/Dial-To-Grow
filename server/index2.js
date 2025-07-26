import express from "express";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import FormData from "form-data";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
const upload = multer({ dest: "uploads/" });
app.use("/uploads", express.static("uploads")); // for serving audio

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
let messages = [];
// ----------------------
// 1️⃣ AUDIO QUERY ROUTE
// ----------------------
app.post("/api/query", upload.single("audio"), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = `${inputPath}.wav`;

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat("wav")
        .on("end", resolve)
        .on("error", reject)
        .save(outputPath);
    });

    const form = new FormData();
    form.append("file", fs.createReadStream(outputPath));
    form.append("language_code", "en-IN");

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY,
        ...form.getHeaders(),
      },
      body: form,
    });

    const result = await response.json();
    const transcription = result?.transcript || "Transcription not found";
    console.log("🎙️ Transcription:", transcription);

    const systemPrompt = `You are a career classification assistant. Return only a one-word career like NEET, UPSC, CDS, JEE, etc. No extra words or commas or full stops`;
    const prompt = `User query: "${transcription}"`;

    const groqRes = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const career = groqRes.choices[0].message.content.trim();
    console.log("🎯 Identified Career:", career);
    const { data: allMentors } = await supabase
      .from("mentors")
      .select("*, users(name)")
      .eq("available", true);
    const { data: matchedMentors, error } = await supabase
      .from("mentors")
      .select("*, users(name)")
      .contains("expertise", [career])
      .eq("available", true);

    if (error) {
      console.error("❌ Supabase mentor match error:", error.message);
    }
    const matchedMentor = allMentors?.filter((mentor) =>
      mentor.expertise?.some((exp) =>
        exp.toLowerCase().includes(career.toLowerCase())
      )
    );
    console.log("mentor list:", matchedMentor);

    // const mentorIds = matchedMentors?.map((m) => m.user_id);
    const mentorIds = matchedMentor?.map((m) => m.user_id);
    console.log(
      "👥 Matched Mentors:",
      matchedMentors.map((m) => m.users?.name)
    );
    console.log("ids: ", mentorIds);

    const { data: savedQuery, error: insertError } = await supabase
      .from("queries")
      .insert([
        {
          mentee_id: req.body.mentee_id || null,
          career,
          query_text: transcription,
          audio_url: inputPath,
          status: mentorIds?.length > 0 ? "pending" : "chatbot",
          language_id: req.body.language_id || 1,
        },
      ])
      .select();

    if (insertError || !savedQuery?.[0]) {
      console.error("❌ Failed to save query:", insertError?.message);
      return res.status(500).json({ error: "Failed to save query." });
    }

    const queryId = savedQuery[0].id;

    if (mentorIds?.length > 0) {
      const mentorResponses = mentorIds.map((mentor_id) => ({
        query_id: queryId,
        mentor_id,
        status: "pending",
      }));

      const { error: responseError } = await supabase
        .from("mentor_query_responses")
        .insert(mentorResponses);

      if (responseError) {
        console.error(
          "❌ Failed to insert mentor_query_responses:",
          responseError.message
        );
      }
    }

    res.json({
      transcription,
      career,
      matchedMentors,
    });

    fs.unlink(inputPath, () => {});
    fs.unlink(outputPath, () => {});
  } catch (error) {
    console.error("❌ Error in /api/query:", error);
    res.status(500).json({ error: error.message });
  }
});

// -----------------------------
// 2️⃣ GET MENTOR-SPECIFIC REQUESTS
// -----------------------------
app.get("/api/requests/mentor/:mentorId", async (req, res) => {
  const { mentorId } = req.params;

  try {
    const { data, error } = await supabase
      .from("mentor_query_responses")
      .select(
        `
        id,
        query_id,
        status,
        queries (
          id,
          query_text,
          career,
          mentee_id
        )
      `
      )
      .eq("mentor_id", mentorId)
      .eq("status", "pending");

    if (error) {
      console.error("❌ Error fetching mentor requests:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const enriched = await Promise.all(
      data.map(async (r) => {
        const { data: mentee } = await supabase
          .from("users")
          .select("name")
          .eq("id", r.queries.mentee_id)
          .single();

        return {
          id: r.query_id,
          career: r.queries.career,
          menteeName: mentee?.name || "Unknown",
          transcription: r.queries.query_text,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error(
      "❌ Error in GET /api/requests/mentor/:mentorId:",
      err.message
    );
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------
// 3️⃣ ACCEPT / REJECT RESPONSE
// ------------------------------
app.post("/api/respond", async (req, res) => {
  const { queryId, mentorId, action } = req.body;

  try {
    const { error } = await supabase
      .from("mentor_query_responses")
      .update({ status: action === "accept" ? "accepted" : "rejected" })
      .eq("query_id", queryId)
      .eq("mentor_id", mentorId);

    if (error) {
      console.error("❌ Error updating mentor response:", error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Mentor ${action}ed query ${queryId}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error in POST /api/respond:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Upload voice message
app.post("/api/voice-upload", upload.single("audio"), (req, res) => {
  const { sender, room } = req.body;
  console.log(req.file.filename);
  const filePath = `/uploads/${req.file.filename}`;

  const message = { sender, room, url: filePath, timestamp: Date.now() };
  messages.push(message);

  res.json({ success: true, message });
});

// Get voice messages
app.get("/api/voice-messages/:room", (req, res) => {
  const room = req.params.room;
  const filtered = messages.filter((m) => m.room === room);
  res.json(filtered);
});

// ✅ Get accepted mentor for a mentee query
app.get("/api/assigned-mentor/:menteeId", async (req, res) => {
  const { menteeId } = req.params;

  try {
    // 1. Find latest accepted query by this mentee
    const { data: latestQuery, error: queryError } = await supabase
      .from("queries")
      .select("id, mentee_id")
      .eq("mentee_id", menteeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (queryError || !latestQuery) {
      return res.status(404).json({ error: "No query found for this mentee." });
    }

    const queryId = latestQuery.id;

    // 2. Check if any mentor accepted this query
    const { data: accepted, error: acceptError } = await supabase
      .from("mentor_query_responses")
      .select("mentor_id")
      .eq("query_id", queryId)
      .eq("status", "accepted")
      .single();

    if (acceptError || !accepted) {
      return res.json({ status: "pending" });
    }

    const mentorId = accepted.mentor_id;

    // 3. Get mentor name
    const { data: mentorUser } = await supabase
      .from("users")
      .select("name")
      .eq("id", mentorId)
      .single();

    const { data: menteeUser } = await supabase
      .from("users")
      .select("name")
      .eq("id", menteeId)
      .single();

    const mentorName = mentorUser?.name;
    const menteeName = menteeUser?.name;

    if (!mentorName || !menteeName) {
      return res.status(500).json({ error: "User info missing" });
    }

    // 4. Construct room ID
    const room_id = `${menteeName}-${mentorName}`;

    res.json({
      room_id,
      mentor: {
        id: mentorId,
        name: mentorName,
      },
    });
  } catch (err) {
    console.error("❌ Error in /api/assigned-mentor/:menteeId", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

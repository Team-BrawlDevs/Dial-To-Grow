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
import { log } from "console";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
const upload = multer({ dest: "uploads/" });
app.use("/uploads", express.static("uploads")); // for serving audio
app.use("/audios", express.static("audios"));
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
let messages = [];
const languageCode = "ta-IN";
//play epi in mentee lang


app.get("/api/podcast-episodes/:podcastId", async (req, res) => {
  try {
    const podcastId = req.params.podcastId;
    const menteeId = req.query.mentee_id;

    console.log(`📌 Podcast ID: ${podcastId}`);
    console.log(`👤 Mentee ID: ${menteeId}`);
    console.log(`📥 Fetching episodes for podcast ID...`);

    const { data: episodes, error: episodeError } = await supabase
      .from("podcast_episodes")
      .select("*")
      .eq("podcast_id", podcastId);

    if (episodeError) {
      console.error("❌ Error fetching episodes:", episodeError.message);
      return res.status(500).json({ error: "Error fetching episodes" });
    }

    console.log(`✅ Episodes fetched: ${episodes.length}`);

    const episode = episodes[0];
    if (!episode) return res.status(404).json({ error: "Episode not found" });

    console.log("📥 Fetching mentee language preference...");

    const { data: userLangData, error: langError } = await supabase
      .from("user_languages")
      .select("languages(name)")
      .eq("user_id", menteeId)
      .limit(1)
      .single();

    if (langError || !userLangData) {
      console.error("❌ Error fetching mentee language:", langError?.message);
      return res.status(500).json({ error: "Error fetching mentee language" });
    }

    const languageName = userLangData.languages.name.toLowerCase();
    const languageMap = {
      tamil: "ta-IN",
      telugu: "te-IN",
      hindi: "hi-IN",
      bengali: "bn-IN",
      kannada: "kn-IN",
      malayalam: "ml-IN",
      marathi: "mr-IN",
      punjabi: "pa-IN",
      gujarati: "gu-IN",
      oriya: "or-IN",
      english: "en-IN"
    };

    const targetLangCode = languageMap[languageName] || "en-IN";
    console.log(`🌐 Target language code resolved: ${targetLangCode}`);

    console.log("🔁 Translating episode content...");

    const translationResponse = await axios.post(
      "https://api.sarvam.ai/translate",
      {
        input: episode.transcript,
        source_language_code: "auto",
        target_language_code: targetLangCode,
      },
      {
        headers: {
          "api-subscription-key": process.env.SARVAM_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const translatedText = translationResponse.data.translated_text;
    console.log(`✅ Translated Text: ${translatedText}`);

     console.log("🎤 Performing TTS with chunking...");
    const CHUNK_SIZE = 300;
    const splitText = (str) => {
      const chunks = [];
      let remaining = str.trim();
      while (remaining.length > 0) {
        let chunk = remaining.slice(0, CHUNK_SIZE);
        const lastPunct = chunk.lastIndexOf(".");
        if (lastPunct > 100) chunk = chunk.slice(0, lastPunct + 1);
        chunks.push(chunk.trim());
        remaining = remaining.slice(chunk.length).trim();
      }
      return chunks;
    };

    const chunks = splitText(translatedText);
    const audioPaths = [];

    for (let i = 0; i < chunks.length; i++) {
      const ttsRes = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": process.env.SARVAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: chunks[i],
          language: targetLangCode,
        }),
      });

      const ttsJson = await ttsRes.json();
      const base64Audio = ttsJson?.audios?.[0];
      if (!base64Audio) continue;

      const buffer = Buffer.from(base64Audio, "base64");
      const audioDir = path.join(__dirname, "uploads");
      fs.mkdirSync(audioDir, { recursive: true });

      const audioPath = path.join(audioDir, `chunk_${i}_${Date.now()}.wav`);
      fs.writeFileSync(audioPath, buffer);
      audioPaths.push(audioPath);
    }

    if (audioPaths.length === 0) {
      throw new Error("No audio chunks generated.");
    }

    // 5️⃣ Merge audio chunks with FFmpeg
    const concatListPath = path.join(__dirname, "uploads", `list_${Date.now()}.txt`);
    const concatListContent = audioPaths.map((p) => `file '${p}'`).join("\n");
    fs.writeFileSync(concatListPath, concatListContent);

    const finalFilename = `bot_${Date.now()}.wav`;
    const finalPath = path.join(__dirname, "uploads", finalFilename);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions("-f", "concat", "-safe", "0")
        .outputOptions("-c", "copy")
        .on("end", resolve)
        .on("error", reject)
        .save(finalPath);
    });

    // 6️⃣ Cleanup temp chunks after 15s
    setTimeout(() => {
      for (const file of [...audioPaths, concatListPath]) {
        fs.unlink(file, () => {});
      }
    }, 15000);
    console.log("File name: ",finalFilename);
    // 7️⃣ Send response
    res.json([
  {
    id: episode.id,
    title: episode.title,
    audio_url: `http://localhost:5000/uploads/${finalFilename}`,
  }
]);

  } catch (err) {
    console.error("💥 Unexpected error:", err);
    res.status(500).json({ error: err.message || "Something went wrong." });
  }
});


//Explore courses
app.get("/api/courses/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Step 1: Fetch career from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("career")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: "User not found or career missing" });
    }

    const career = userData.career;

    // Step 2: Fetch podcasts matching the career
    const { data: podcasts, error: podcastError } = await supabase
      .from("podcasts")
      .select("id,title, description")
      .ilike("career_path", `%${career}%`); // Case-insensitive match

    if (podcastError) {
      return res.status(500).json({ error: "Error fetching podcasts" });
    }

    res.json(podcasts);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// 🔹 Get podcast metadata
app.get("/api/podcasts/:podcastId", async (req, res) => {
  const { podcastId } = req.params;
  const { data, error } = await supabase
    .from("podcasts")
    .select("id, title, description")
    .eq("id", podcastId)
    .single();

  if (error) return res.status(500).json({ error });
  res.json(data);
});

// 🔹 Get episodes of a podcast
app.get("/api/podcasts/:podcastId/episodes", async (req, res) => {
  const { podcastId } = req.params;

  const { data, error } = await supabase
    .from("podcast_episodes")
    .select("*")
    .eq("podcast_id", podcastId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error });
  res.json(data);
});

// 🔹 Upload audio and create episode
app.post("/api/podcasts/:podcastId/episodes", upload.single("audio"), async (req, res) => {
  const { podcastId } = req.params;
  const { title } = req.body;
  const file = req.file;


  if (!file || !title) {
    return res.status(400).json({ error: "Title and audio are required." });
  }

  const tempWavPath = `${file.path}.wav`;

  try {
    // ✅ Convert input audio to .wav using FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(file.path)
        .setFfmpegPath(ffmpegPath)
        .toFormat("wav")
        .on("end", resolve)
        .on("error", reject)
        .save(tempWavPath);
    });

    const fileExt = path.extname(file.originalname) || ".webm";
    const storagePath = `episodes/${Date.now()}${fileExt}`;
    const fileBuffer = fs.readFileSync(file.path);

    // ✅ Upload original audio to Supabase
    const { data: storageData, error: uploadError } = await supabase.storage
      .from("podcast-library")
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("podcast-library").getPublicUrl(storagePath);

    // ✅ Prepare and send to Sarvam STT
    const form = new FormData();
    form.append("file", fs.createReadStream(tempWavPath));
    form.append("language_code", languageCode);

    const sttResponse = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY,
        ...form.getHeaders(),
      },
      body: form,
    });

    const sttJson = await sttResponse.json();
    console.log("STT Json",sttJson);
    
    const transcript = sttJson.transcript || "";
    console.log("STT response",transcript);
    // ✅ Insert into DB
    const { data: insertData, error: dbError } = await supabase
      .from("podcast_episodes")
      .insert([
        {
          podcast_id: podcastId,
          title,
          audio_url: publicUrl,
          transcript,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    // ✅ Cleanup
    fs.unlinkSync(file.path);       // Original uploaded file
    fs.unlinkSync(tempWavPath);     // Converted WAV file

    res.json({ message: "Episode uploaded with transcript", episode: insertData });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});



// ─────────────────────────────────────────────
app.get("/api/podcasts/:podcastId/episodes", async (req, res) => {
  const { podcastId } = req.params;
  try {
    const { data, error } = await supabase
      .from("podcast_episodes")
      .select("*")
      .eq("podcast_id", podcastId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error fetching episodes:", err.message);
    res.status(500).json({ error: "Could not fetch episodes" });
  }
}); 

app.post("/api/podcasts/:podcastId/episodes", upload.single("audio"), async (req, res) => {
  const { podcastId } = req.params;
  const { title } = req.body;
  const file = req.file;

  if (!title || !file) return res.status(400).json({ error: "Missing title or audio file" });

  try {
    const ext = file.originalname.split(".").pop();
    const filePath = `episodes/${Date.now()}_${file.originalname}`;

    const { error: uploadError } = await supabase.storage
      .from("podcasts")
      .upload(filePath, fs.createReadStream(file.path), {
        contentType: file.mimetype,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from("audio").getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("podcast_episodes").insert({
      podcast_id: podcastId,
      title,
      audio_url: publicUrl,
    });

    if (insertError) throw insertError;

    res.json({ message: "Episode uploaded!" });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: "Failed to upload episode" });
  }
});

app.get("/api/mentors/:mentorId/podcasts", async (req, res) => {
  const { mentorId } = req.params;

  try {
    const { data, error } = await supabase
      .from("podcasts")
      .select("*")
      .eq("mentor_id", mentorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching mentor podcasts:", error.message);
      return res.status(500).json({ error: "Failed to fetch podcasts" });
    }

    res.json(data);
  } catch (err) {
    console.error("Unexpected server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/podcasts", async (req, res) => {
  try {
    const { mentor_id, title, description, career_path, original_language_id } = req.body;

    const { data, error } = await supabase.from("podcasts").insert([
      {
        mentor_id,
        title,
        description,
        career_path,
        original_language_id,
      },
    ]).select().single();

    if (error) throw error;

    res.json({ podcast: data });
  } catch (err) {
    console.error("❌ Error creating podcast:", err.message);
    res.status(500).json({ error: "Failed to create podcast." });
  }
});

// Upload episode to podcast
app.post("/api/podcasts/:podcastId/episodes", upload.single("audio"), async (req, res) => {
  try {
    const { podcastId } = req.params;
    const { title } = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const inputPath = audioFile.path;
    const wavPath = `${inputPath}.wav`;

    // Convert to WAV using ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat("wav")
        .on("end", resolve)
        .on("error", reject)
        .save(wavPath);
    });

    const duration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(wavPath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata.format.duration);
      });
    });

    const publicUrl = `/uploads/${path.basename(wavPath)}`;

    const { data, error } = await supabase.from("podcast_episodes").insert([
      {
        podcast_id: podcastId,
        title,
        audio_url: publicUrl,
        duration_seconds: Math.round(duration),
      },
    ]).select().single();

    if (error) throw error;

    res.json({ episode: data });
  } catch (err) {
    console.error("❌ Error uploading episode:", err.message);
    res.status(500).json({ error: "Failed to upload episode." });
  }
});
// ----------------------
// 1️⃣ AUDIO QUERY ROUTE
// ----------------------
// ----------------------
// 🎤 Voice Mentor Endpoint
// ----------------------
app.post("/api/mentor-chat", upload.single("audio"), async (req, res) => {
  try {
    console.log("hello");
    
    const inputPath = req.file.path;
    const wavPath = `${inputPath}.wav`;

    // Convert input to WAV
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat("wav")
        .on("end", resolve)
        .on("error", reject)
        .save(wavPath);
    });

    

    // 1️⃣ Speech-to-Text (Sarvam)
    const sttForm = new FormData();
    sttForm.append("file", fs.createReadStream(wavPath));
    sttForm.append("language_code", languageCode);

    const sttRes = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY,
        ...sttForm.getHeaders(),
      },
      body: sttForm,
    });

    const sttJson = await sttRes.json();
    const transcript = sttJson?.transcript?.trim() || "";

    console.log("📝 Transcript:", transcript);

    // Maintain simple history from frontend if needed
    const previousHistory = JSON.parse(req.body.history || "[]");

    // 2️⃣ Groq LLaMA Response
    const systemMsg = {
      role: "system",
      content: `You are a mentor. Please respond in original ${languageCode} language. Also Motivate with your response. Let the response be releavnt and add few famous idioms,phrases and quotes of that language. If language is "en-IN", respond in english. Let the response be short(within 500 characters), but it must give all details and motivation. Don't include any symbols.`,
    };

    const chatRes = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        systemMsg,
        ...previousHistory,
        { role: "user", content: transcript },
      ],
    });
    const replyText = chatRes.choices[0].message.content.trim();

    console.log("🧠 Reply:", replyText);

   const CHUNK_SIZE = 300;
    const splitText = (str) => {
      const chunks = [];
      let remaining = str.trim();
      while (remaining.length > 0) {
        let chunk = remaining.slice(0, CHUNK_SIZE);
        const lastPunct = chunk.lastIndexOf(".");
        if (lastPunct > 100) chunk = chunk.slice(0, lastPunct + 1);
        chunks.push(chunk.trim());
        remaining = remaining.slice(chunk.length).trim();
      }
      return chunks;
    };

    const chunks = splitText(replyText);
    const audioPaths = [];

    for (let i = 0; i < chunks.length; i++) {
      const ttsRes = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": process.env.SARVAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: chunks[i],
          language: languageCode,
        }),
      });

      const ttsJson = await ttsRes.json();
      const base64Audio = ttsJson?.audios?.[0];
      if (!base64Audio) continue;

      const buffer = Buffer.from(base64Audio, "base64");
      const audioDir = path.join(__dirname, "uploads");
      fs.mkdirSync(audioDir, { recursive: true });

      const audioPath = path.join(audioDir, `chunk_${i}_${Date.now()}.wav`);
      fs.writeFileSync(audioPath, buffer);
      audioPaths.push(audioPath);
    }

    // 4️⃣ Merge with FFmpeg
    const concatListPath = path.join(__dirname, "uploads", `list_${Date.now()}.txt`);
    const concatListContent = audioPaths.map((p) => `file '${p}'`).join("\n");
    fs.writeFileSync(concatListPath, concatListContent);

    const finalFilename = `bot_${Date.now()}.wav`;
    const finalPath = path.join(__dirname, "uploads", finalFilename);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions("-f", "concat", "-safe", "0")
        .outputOptions("-c", "copy")
        .on("end", resolve)
        .on("error", reject)
        .save(finalPath);
    });

    // Cleanup chunks
    setTimeout(() => {
      for (const file of [...audioPaths, concatListPath, inputPath, wavPath]) {
        fs.unlink(file, () => {});
      }
    }, 15000);

    res.json({
      transcript,
      reply: replyText,
      bot_audio_url: `/uploads/${finalFilename}`,
    });
  } catch (err) {
    console.error("❌ Error in /api/mentor-chat:", err);
    res.status(500).json({ error: err.message });
  }
});

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
    }).then(console.log("Successful response"));

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
      query_id: queryId,
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

// Add this to your existing Express backend

// -------------------------
// 4️⃣ CHAT MESSAGES (Text + Audio)
// -------------------------

// Get messages for a query
app.get("/api/chat/:queryId", async (req, res) => {
  const { queryId } = req.params;
  

  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("query_id", queryId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching chat messages:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Send message (text or audio)
app.post("/api/chat", upload.single("audio"), async (req, res) => {
  try {
    const { query_id, sender_id, message } = req.body;
    let audio_url = null;

    if (req.file) {
      audio_url = `/uploads/${req.file.filename}`;
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert([
        {
          query_id: parseInt(query_id),
          sender_id: parseInt(sender_id),
          message,
          audio_url,
        },
      ])
      .select();

    if (error) throw error;

    res.json(data[0]);
  } catch (err) {
    console.error("❌ Error sending chat message:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// ----------------------
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

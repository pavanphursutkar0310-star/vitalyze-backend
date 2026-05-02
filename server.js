const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

app.get("/", (req, res) => {
  res.json({ status: "Vitalyze AI Backend is running 💚" });
});

// Health coach chat
app.post("/claude", async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const { messages, system } = req.body;

    const systemPrompt = system || "You are an empathetic AI health coach named Vitalyze. Analyze the user's health data, give personalized insights, celebrate wins, flag concerns gently. Keep responses concise (2-4 sentences), warm, and actionable. For serious symptoms, recommend a doctor.";

    const lastMessage = messages[messages.length - 1].content;
    const prompt = `${systemPrompt}\n\nUser: ${lastMessage}`;

    const response = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
      }),
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't respond right now.";

    res.json({ content: [{ type: "text", text }] });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Food calorie scanner
app.post("/scan-food", async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const { imageBase64 } = req.body;

    if (!imageBase64) return res.status(400).json({ error: "No image provided" });

    const prompt = `You are a nutrition expert. Analyze this food image and respond ONLY with valid JSON (no markdown):
{"dish":"Name","calories":350,"protein":20,"carbs":40,"fat":12,"fiber":5,"items":["rice - 200cal","dal - 150cal"],"tip":"One short health tip","healthScore":7}`;

    const response = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
          ]
        }],
        generationConfig: { maxOutputTokens: 1000, temperature: 0.3 }
      }),
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.json(result);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Could not analyze food image" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Vitalyze backend running on port ${PORT}`));

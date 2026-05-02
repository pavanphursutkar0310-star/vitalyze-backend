const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Vitalyze AI Backend is running 💚" });
});

// Main Claude proxy route
app.post("/claude", async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }

    const response = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Claude API error:", err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

// Food calorie scan route
app.post("/scan-food", async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const { imageBase64 } = req.body;

    if (!imageBase64) return res.status(400).json({ error: "No image provided" });

    const response = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are a nutrition expert AI. Analyze food photos and respond ONLY with valid JSON:
{"dish":"Name","calories":350,"protein":20,"carbs":40,"fat":12,"fiber":5,"items":["rice - 200cal"],"tip":"One short health tip","healthScore":7}`,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 }},
            { type: "text", text: "Analyze this food and give calorie + nutrition breakdown in JSON." },
          ],
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Could not analyze food image" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Vitalyze backend running on port ${PORT}`));

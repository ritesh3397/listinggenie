import { createClient } from "@supabase/supabase-js";
console.log("ENV CHECK:", {
  supabase: process.env.SUPABASE_URL ? "OK" : "MISSING",
  groq: process.env.GROQ_API_KEY ? "OK" : "MISSING"
});
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    const { product, platform, tone, keywords, email } = req.body;

    // 🔥 TEMP email 
    const userEmail = email || "ritesh01h2@gmail.com";

    if (!product) {
      return res.status(400).json({ error: "Product required" });
    }

    // ✅ 1. Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", userEmail)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ 2. Check credits
    if (user.credits <= 0) {
      return res.status(403).json({ error: "No credits left" });
    }

    // ✅ 3. Call Groq AI
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "mixtral-8x7b-32768"
    messages: [
      {
        role: "system",
        content: "You are a professional e-commerce copywriter. Always return valid JSON only."
      },
      {
        role: "user",
        content: `Create a high converting product listing.

Product: ${product}
Platform: ${platform}
Tone: ${tone}
Keywords: ${keywords}

Return ONLY JSON:
{
  "title": "...",
  "description": "...",
  "bullets": "..."
}`
      }
    ],
    temperature: 0.7
  })
});

const aiData = await aiRes.json();

// 🔥 DEBUG (important)
console.log("AI FULL RESPONSE:", aiData);

if (!aiData || !aiData.choices || aiData.choices.length === 0) {
  return res.status(500).json({
    error: "AI returned no choices",
    full: aiData
  });
}

const content = aiData.choices[0]?.message?.content;

if (!content) {
  return res.status(500).json({
    error: "AI empty response",
    full: aiData
  });
}
    // 🔥 CLEAN + PARSE JSON SAFE
    let parsed;

    try {
      const clean = content.replace(/```json|```/g, "").trim();
      const match = clean.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match[0]);
    } catch (e) {
      return res.status(500).json({
        error: "Invalid JSON from AI",
        raw: content
      });
    }

    // ✅ 4. Deduct credit
    await supabase
      .from("users")
      .update({ credits: user.credits - 1 })
      .eq("email", userEmail);

    // ✅ 5. Send response
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}

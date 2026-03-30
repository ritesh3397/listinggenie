import { createClient } from "@supabase/supabase-js";

// 🔥 ENV DEBUG
console.log("ENV CHECK:", {
  supabase: process.env.SUPABASE_URL ? "OK" : "MISSING",
  groq: process.env.GROQ_API_KEY ? "OK" : "MISSING"
});

// 🔥 Supabase init
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    const { product, platform, tone, keywords, email } = req.body;

    const userEmail = email || "rites0h12h@gmail.com";

    // ✅ Validate
    if (!product) {
      return res.status(400).json({ error: "Product required" });
    }

    // ✅ Get user
    let { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", userEmail)
      .single();

    // 🔥 Auto create user if not exists
    if (!user) {
      const { data: newUser } = await supabase
        .from("users")
        .insert([{ email: userEmail, credits: 10, plan: "free" }])
        .select()
        .single();

      user = newUser;
    }

    // ✅ Check credits
    if (user.credits <= 0) {
      return res.status(403).json({ error: "No credits left" });
    }

    // ✅ Call Groq AI
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768", // 🔥 stable model
        messages: [
          {
            role: "system",
            content: "You are a professional e-commerce copywriter. Always return ONLY valid JSON."
          },
          {
            role: "user",
            content: `You MUST return ONLY valid JSON. No text outside JSON.

Create high converting product listing:

Product: ${product}
Platform: ${platform}
Tone: ${tone}
Keywords: ${keywords}

Output:
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

// 🔥 FULL DEBUG
console.log("STATUS:", aiRes.status);
console.log("AI RESPONSE:", JSON.stringify(aiData, null, 2));

// ❌ when api error 
if (!aiRes.ok) {
  return res.status(500).json({
    error: "Groq API Error",
    details: aiData
  });
}

    console.log("AI FULL RESPONSE:", aiData);

    // ✅ SAFE CHECK
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

    // ✅ CLEAN + PARSE JSON
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

    // ✅ Deduct credit
    await supabase
      .from("users")
      .update({ credits: user.credits - 1 })
      .eq("email", userEmail);

    // ✅ Send result
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    const { product, platform, tone, keywords, email } = req.body;

    // 🔥 TEMP FIX (jab tak login nahi bana)
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

    // ✅ 3. Call AI
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "You are a world-class e-commerce copywriter who writes highly persuasive listings."
          },
          {
            role: "user",
            content: `
Create a HIGH-CONVERTING product listing.

Product: ${product}
Platform: ${platform}
Tone: ${tone}
Keywords: ${keywords}

Return ONLY JSON like:
{
 "title": "...",
 "description": "...",
 "bullets": "..."
}
`
          }
        ],
        temperature: 0.8
      })
    });

    const aiData = await aiRes.json();

    const content = aiData?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        error: "AI empty response",
        full: aiData
      });
    }

    // 🔥 SAFE JSON EXTRACT (MOST IMPORTANT FIX)
    let parsed;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: content
      });
    }

    // ✅ 4. Deduct credit
    await supabase
      .from("users")
      .update({ credits: user.credits - 1 })
      .eq("email", userEmail);

    // ✅ 5. Return result
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}

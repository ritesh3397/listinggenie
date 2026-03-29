import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    const { product, platform, tone, keywords, email } = req.body;

    if (!product || !email) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // ✅ 1. Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ 2. Check credits
    if (user.credits <= 0) {
      return res.status(403).json({ error: "No credits left" });
    }

    // ✅ 3. Call AI (Groq)
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
            content: "You are an expert e-commerce copywriter."
          },
          {
            role: "user",
            content: `
Create high-converting product listing:

Product: ${product}
Platform: ${platform}
Tone: ${tone}
Keywords: ${keywords}

Return ONLY JSON:
{
 "title": "...",
 "description": "...",
 "bullets": "..."
}
            `
          }
        ],
        temperature: 0.7
      })
    });

    const aiData = await aiRes.json();

    const content = aiData?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "AI empty response", full: aiData });
    }

    // ✅ 4. Parse AI JSON safely
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return res.status(500).json({
        error: "Invalid JSON from AI",
        raw: content
      });
    }

    // ✅ 5. Deduct credit
    await supabase
      .from("users")
      .update({ credits: user.credits - 1 })
      .eq("email", email);

    // ✅ 6. Return result
    res.status(200).json(parsed);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

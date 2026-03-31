import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    const { product, platform, tone, keywords, email } = req.body;

    const userEmail = email || "rites0h12h@gmail.com";

    if (!product) {
      return res.status(400).json({ error: "Product required" });
    }

    console.log("KEY LENGTH:", process.env.GROQ_API_KEY?.length);

    let { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", userEmail)
      .single();

    if (!user) {
      const { data } = await supabase
        .from("users")
        .insert([{ email: userEmail, credits: 10, plan: "free" }])
        .select()
        .single();

      user = data;
    }

    if (user.credits <= 0) {
      return res.status(403).json({ error: "No credits left" });
    }

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content: "You are a professional e-commerce copywriter. Return ONLY JSON."
          },
          {
            role: "user",
            content: `Create product listing:

Product: ${product}
Platform: ${platform}
Tone: ${tone}
Keywords: ${keywords}

Return JSON:
{
"title":"...",
"description":"...",
"bullets":"..."
}`
          }
        ],
        temperature: 0.7
      })
    });

    const aiData = await aiRes.json();

    console.log("STATUS:", aiRes.status);
    console.log("AI RESPONSE:", JSON.stringify(aiData, null, 2));

    if (!aiRes.ok) {
      return res.status(500).json({
        error: "Groq API Error",
        details: aiData
      });
    }

    if (!aiData || !aiData.choices || aiData.choices.length === 0) {
      return res.status(500).json({
        error: "AI returned no choices",
        full: aiData
      });
    }

    const content = aiData.choices[0].message.content;

    if (!content) {
      return res.status(500).json({
        error: "AI empty response",
        full: aiData
      });
    }

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

    await supabase
      .from("users")
      .update({ credits: user.credits - 1 })
      .eq("email", userEmail);

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}

export default async function handler(req, res) {
  // ❌ Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { product, platform, tone, keywords } = req.body;

    // ❌ Validation
    if (!product) {
      return res.status(400).json({ error: "Product name required" });
    }

    // 🧠 Powerful Prompt
    const prompt = `
You are an expert eCommerce copywriter who writes HIGH-CONVERTING product listings.

Write:
- A catchy, scroll-stopping TITLE
- A persuasive DESCRIPTION (focus on benefits, emotions, and desire)
- Bullet points that SELL (benefits > features)

Product: ${product}
Platform: ${platform}
Tone: ${tone}
Keywords: ${keywords}

Rules:
- Keep language simple but powerful
- Avoid generic phrases
- Make it premium and trustworthy
- Focus on conversion

Return ONLY valid JSON. No extra text.

Format:
{
  "title": "...",
  "description": "...",
  "bullets": "..."
}
`;

    // 🚀 Call Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    // 🔍 Debug (optional)
    console.log("FULL AI RESPONSE:", JSON.stringify(data, null, 2));

    // 🧠 Extract text
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).json({
        error: "AI returned empty response",
        full: data
      });
    }

    let parsed;

    try {
      // 🔥 Extract JSON safely (even if AI adds extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      parsed = JSON.parse(jsonMatch[0]);

    } catch (e) {
      return res.status(500).json({
        error: "Invalid JSON from AI",
        raw: text
      });
    }

    // ✅ Final response
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      message: err.message
    });
  }
}

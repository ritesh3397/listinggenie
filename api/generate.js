export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { product, platform, tone, keywords } = req.body;

    if (!product) {
      return res.status(400).json({ error: "Product name required" });
    }

    const prompt = `
const prompt = `
You are an expert eCommerce copywriter who writes HIGH-CONVERTING listings that increase sales.

Write a powerful product listing with:
- Attention-grabbing title
- Emotion-driven description (pain + benefit + desire)
- Persuasive bullet points (benefits, not just features)

Product: ${product}
Platform: ${platform}
Tone: ${tone}
Keywords: ${keywords}

Rules:
- Use simple but persuasive language
- Focus on benefits, not just features
- Make it feel premium and trustworthy
- DO NOT use generic phrases

Return ONLY valid JSON:

{
  "title": "...",
  "description": "...",
  "bullets": "..."
}
`;
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

    console.log("FULL AI RESPONSE:", JSON.stringify(data, null, 2));

    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).json({
        error: "AI returned empty response",
        full: data
      });
    }

    let parsed;

    try {
      // 🔥 JSON extract fix (important)
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("No JSON found");
      }

      parsed = JSON.parse(jsonMatch[0]);

    } catch (e) {
      return res.status(500).json({
        error: "Invalid JSON from AI",
        raw: text
      });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      message: err.message
    });
  }
}

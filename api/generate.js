export default async function handler(req, res) {

  // ✅ Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const { product } = req.body;

    if (!product) {
      return res.status(400).json({ error: "No product provided" });
    }

    // 🔥 GROQ API CALL
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "user",
            content: `You are a professional e-commerce copywriter.

Create a HIGH-CONVERTING product listing for: ${product}

Rules:
- Make it persuasive and emotional
- Focus on benefits, not features
- Use power words
- Make it sound premium and viral
- Title must be catchy and scroll-stopping
- Keep description short but impactful
- Each bullet must highlight a benefit

Return ONLY JSON in this format:
{
  "title": "",
  "description": "",
  "bullets": ["", "", "", "", ""]
}`
          }
        ]
      })
    });

    const data = await response.json();

    // 🔥 RAW AI OUTPUT
    const content = data?.choices?.[0]?.message?.content || "";

    console.log("AI RAW:", content);

    // 🔥 JSON EXTRACT FIX
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({
        error: "No JSON found",
        raw: content
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      return res.status(500).json({
        error: "Invalid JSON",
        raw: content
      });
    }

    // ✅ FINAL RESPONSE
    return res.status(200).json({
      title: parsed.title || "No title",
      description: parsed.description || "No description",
      bullets: parsed.bullets || []
    });

  } catch (err) {

    console.error("SERVER ERROR:", err);

    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
}

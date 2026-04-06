export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const { product } = req.body;

    if (!product) {
      return res.status(400).json({ error: "No product provided" });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "user",
            content: `Return ONLY JSON for product: ${product}

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

    console.log("FULL RESPONSE:", data);

    const content = data?.choices?.[0]?.message?.content || "";

    console.log("AI RAW:", content);

    // ✅ fallback if empty
    if (!content) {
      return res.status(200).json({
        title: product + " - Best Seller",
        description: "High demand product with strong market potential.",
        bullets: ["Trending", "Profitable", "Viral", "Easy to sell", "High demand"]
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (e) {

      const match = content.match(/\{[\s\S]*\}/);

      if (!match) {
        return res.status(200).json({
          title: product,
          description: content.slice(0, 120),
          bullets: ["Good product", "High demand"]
        });
      }

      try {
        parsed = JSON.parse(match[0]);
      } catch (e2) {
        return res.status(200).json({
          title: product,
          description: content.slice(0, 120),
          bullets: ["Trending", "Popular"]
        });
      }
    }

    return res.status(200).json({
      title: parsed.title || product,
      description: parsed.description || "Good product",
      bullets: parsed.bullets || ["Trending", "Profitable"]
    });

  } catch (err) {

    console.error("SERVER ERROR:", err);

    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
}

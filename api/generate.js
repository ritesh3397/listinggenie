export default async function handler(req, res) {

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
        model: "llama3-8b-8192", // 🔥 changed (more stable)
        messages: [
          {
            role: "user",
            content: `You are a professional e-commerce copywriter.

Create a HIGH-CONVERTING product listing for: ${product}

Return ONLY JSON like:
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

    // 💥 FIX 1: अगर AI fail हुआ → fallback दे
    if (!content) {
      return res.status(200).json({
        title: product + " - Best Seller",
        description: "High demand product with strong market potential. Perfect for selling online.",
        bullets: [
          "Trending product",
          "High profit margins",
          "Easy to sell",
          "Viral potential",
          "Customer favorite"
        ]
      });
    }

    // 💥 FIX 2: JSON parse safe
    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);

      if (!match) {
        return res.status(200).json({
          title: product + " - Trending Product",
          description: content.slice(0, 150),
          bullets: ["High demand", "Great opportunity", "Easy selling"]
        });
      }

      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return res.status(200).json({
          title: product + " - Viral Product",
          description: content.slice(0, 150),
          bullets: ["Hot product", "Market demand", "Good margins"]
        });
      }
    }

    // 💥 FIX 3: field fallback
    return res.status(200).json({
      title: parsed?.title || parsed?.Title || product + " Product",
      description: parsed?.description || parsed?.desc || "High quality product",
      bullets: parsed?.bullets || parsed?.points || ["Trending", "Profitable", "Popular"]
    });

  } catch (err) {

    console.error("SERVER ERROR:", err);

    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
}

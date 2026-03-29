export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { product, keywords } = req.body;

  if (!product) {
    return res.status(400).json({ error: "Product required" });
  }

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "grok-2-latest"
        messages: [
          {
            role: "system",
            content: "You are an expert e-commerce copywriter."
          },
          {
            role: "user",
            content: `ONLY return JSON. No extra text.

{
 "title": "",
 "description": "",
 "bullets": ""
}

Product: ${product}
Keywords: ${keywords}`
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    console.log("FULL RESPONSE:", data);

if (!data.choices) {
  return res.status(500).json({
    error: "AI response error",
    full: data
  });
}
    const text = data.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: "AI format error", raw: text });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default async function handler(req, res){

  // ✅ only POST allowed
  if(req.method !== "POST"){
    return res.status(405).json({ error: "Method not allowed" });
  }

  try{

    const { product } = req.body;

    if(!product){
      return res.status(400).json({ error: "Product required" });
    }

    // 🔥 CALL GROQ API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: "You are an ecommerce copywriter. Return ONLY JSON."
          },
          {
            role: "user",
            content: `Generate product listing for: ${product}

Return ONLY this format:
{
  "title": "...",
  "description": "...",
  "bullets": ["...", "...", "..."]
}`
          }
        ]
      })
    });

    const data = await response.json();

    // 🔥 GET CONTENT
    const content = data?.choices?.[0]?.message?.content || "";

    // 🔥 EXTRACT JSON SAFELY
    const match = content.match(/\{[\s\S]*\}/);

    if(!match){
      return res.status(500).json({
        error: "No JSON found",
        raw: content
      });
    }

    let parsed;

    try{
      parsed = JSON.parse(match[0]);
    }catch(err){
      return res.status(500).json({
        error: "Invalid JSON",
        raw: content
      });
    }

    // ✅ FINAL RESPONSE
    return res.status(200).json(parsed);

  }catch(err){
    return res.status(500).json({ error: err.message });
  }
}

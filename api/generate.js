export default async function handler(req, res){

  if(req.method !== "POST"){
    return res.status(405).json({ error: "Method not allowed" });
  }

  try{

    const { product } = req.body;

    if(!product){
      return res.status(400).json({ error: "Product required" });
    }

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
            role:"system",
            content:"Return ONLY JSON with title, description and bullets array."
          },
          {
            role:"user",
            content:`Generate product listing for: ${product}

Return:
{
 "title": "...",
 "description": "...",
 "bullets": ["...", "...", "..."]
}`
          }
        ]
      })
    });

    const content = data?.choices?.[0]?.message?.content;

// 🔥 CLEAN JSON EXTRACT
let jsonText = content.match(/\{[\s\S]*\}/);

let parsed;

try{
  parsed = JSON.parse(jsonText[0]);
}catch(err){
  return res.status(500).json({
    error: "Still invalid JSON",
    raw: content
  });
}
    return res.status(200).json(parsed);

  }catch(err){
    return res.status(500).json({ error: err.message });
  }
}

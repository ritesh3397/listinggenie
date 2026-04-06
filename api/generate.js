export default async function handler(req, res){

  if(req.method !== "POST"){
    return res.status(405).json({ error: "Method not allowed" });
  }

  try{

    const { product } = req.body;

    if(!product){
      return res.status(400).json({ error: "Product required" });
    }

    // 🔥 GROQ CALL
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
            role: "user",
            content: `Create a product listing for: ${product}

Format EXACTLY like this:

Title: ...
Description: ...
Bullets:
- ...
- ...
- ...`
          }
        ]
      })
    });

    const data = await response.json();
    
    const content = data?.choices?.[0]?.message?.content || "";
    
    console.log("AI RAW:", content);
    
    // 🔥 MANUAL PARSE (NO JSON NEEDED)

    const titleMatch = content.match(/Title:\s*(.*)/i);
    const descMatch = content.match(/Description:\s*([\s\S]*?)Bullets:/i);
    const bulletsMatch = content.match(/- (.*)/g);

    const title = titleMatch ? titleMatch[1].trim() : "No title";
    const description = descMatch ? descMatch[1].trim() : "No description";

    const bullets = bulletsMatch
      ? bulletsMatch.map(b => b.replace("-","").trim())
      : ["No bullets"];

    // ✅ FINAL RESPONSE
    return res.status(200).json({
      title,
      description,
      bullets
    });

  }catch(err){
    return res.status(500).json({ error: err.message });
  }
}

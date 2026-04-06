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
        model: "llama3-8b-8192", // 🔥 CHANGE MODEL
        messages: [
          {
            role: "user",
            content: `Create product listing for ${product}.

Give output in this format:

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

    console.log("FULL API RESPONSE:", JSON.stringify(data));

    const content = data?.choices?.[0]?.message?.content || "";

    console.log("AI RAW:", content);

    // 🔥 fallback अगर empty आया
    if(!content){
      return res.status(200).json({
        title: product + " (Trending Product)",
        description: "High quality product with great demand. Perfect for customers looking for value and performance.",
        bullets: [
          "High demand product",
          "Great profit margins",
          "Perfect for online selling"
        ]
      });
    }

    // 🔥 PARSE
    let title = "No title";
    let description = "No description";
    let bullets = [];

    const lines = content.split("\n");

    lines.forEach(line => {

      if(line.toLowerCase().includes("title")){
        title = line.split(":")[1]?.trim() || title;
      }

      else if(line.toLowerCase().includes("description")){
        description = line.split(":")[1]?.trim() || description;
      }

      else if(line.startsWith("-")){
        bullets.push(line.replace("-","").trim());
      }

    });

    if(bullets.length === 0){
      bullets = ["Good product", "High demand", "Best seller"];
    }

    return res.status(200).json({
      title,
      description,
      bullets
    });

  }catch(err){
    return res.status(500).json({ error: err.message });
  }
}

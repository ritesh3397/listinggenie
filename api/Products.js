export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { category, country } = req.body;

  // 👉 REAL AI STYLE (abhi mock + dynamic)
  let products = [
    {
      name: "LED Face Mask",
      demand: "High 🔥",
      profit: "₹1500+",
      audience: "Women 18-35",
      viral: "TikTok skincare trend"
    },
    {
      name: "Portable Blender",
      demand: "Medium 📈",
      profit: "₹800+",
      audience: "Fitness lovers",
      viral: "Travel + health trend"
    },
    {
      name: "Posture Corrector",
      demand: "High 🔥",
      profit: "₹1200+",
      audience: "Office workers",
      viral: "Back pain solution"
    }
  ];

  // 👉 Filter logic
  if (category && category !== "All Categories") {
    products = products.filter(p =>
      p.name.toLowerCase().includes(category.toLowerCase())
    );
  }

  res.status(200).json({ products });
}

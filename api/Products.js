export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { category, country } = req.body;

  // 🔥 BIG LIST (random choose hoga)
  const allProducts = [
    {
      name: "LED Frace Mask",
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
    },
    {
      name: "Mini Projector",
      demand: "High 🔥",
      profit: "₹2000+",
      audience: "Movie lovers",
      viral: "Home theater trend"
    },
    {
      name: "Ice Face Roller",
      demand: "Medium 📈",
      profit: "₹600+",
      audience: "Skincare audience",
      viral: "Glow trend"
    },
    {
      name: "Smart Watch Ultra",
      demand: "High 🔥",
      profit: "₹1800+",
      audience: "Tech users",
      viral: "Fitness + tracking"
    }
  ];

  // 🔀 RANDOM 3 products
  const shuffled = allProducts.sort(() => 0.5 - Math.random());
  const products = shuffled.slice(0, 3);

  res.status(200).json({ products });

}

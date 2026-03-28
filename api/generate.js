export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { product, keywords } = req.body;

  if (!product) {
    return res.status(400).json({ error: "Product required" });
  }

  try {
    // 🔥 FAKE AI (testing ke liye)
    const title = `🔥 ${product} - Best Quality Product`;
    const description = `This ${product} is perfect for daily use. ${keywords || ""} High quality and best in market.`;
    const bullets = `✔️ Premium Quality\n✔️ Affordable Price\n✔️ Best Choice`;

    return res.status(200).json({
      title,
      description,
      bullets
    });

  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

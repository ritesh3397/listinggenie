export default async function handler(req, res) {

  try {

    // 🔥 Dummy but dynamic response
    const products = [
      {
        name: "Magnetic Phone Holder",
        demand: "High",
        profit: "₹800+",
        audience: "Car Owners",
        viral: "TikTok Ads"
      },
      {
        name: "Ice Roller Face Tool",
        demand: "Trending",
        profit: "₹500+",
        audience: "Beauty Lovers",
        viral: "Instagram Reels"
      },
      {
        name: "LED Galaxy Projector",
        demand: "Very High",
        profit: "₹1200+",
        audience: "Teens",
        viral: "YouTube Shorts"
      }
    ];

    return res.status(200).json({
      success: true,
      products
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }

}

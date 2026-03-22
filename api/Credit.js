module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ credits: 10, plan: 'free' });
    }

    const token = authHeader.split(' ')[1];
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });
    const userData = await userRes.json();
    if (!userData.id) return res.status(401).json({ error: 'Invalid token' });

    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userData.id}&select=credits,plan`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });
    const dbData = await dbRes.json();

    if (!dbData || dbData.length === 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: userData.id, email: userData.email, credits: 10, plan: 'free' })
      });
      return res.status(200).json({ credits: 10, plan: 'free' });
    }

    return res.status(200).json({ credits: dbData[0].credits, plan: dbData[0].plan });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// v2

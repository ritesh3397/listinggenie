const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    let { data: userData, error } = await supabase.from('users').select('credits, plan, email').eq('id', user.id).single();

    if (error || !userData) {
      await supabase.from('users').insert({ id: user.id, email: user.email, credits: 10, plan: 'free' });
      userData = { credits: 10, plan: 'free', email: user.email };
    }

    return res.status(200).json({ credits: userData.credits, plan: userData.plan, email: userData.email });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

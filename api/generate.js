const { createClient } = require('@supabase/supabase-js');

const rateLimitStore = {};

function checkRateLimit(identifier) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;
  if (!rateLimitStore[identifier]) {
    rateLimitStore[identifier] = { count: 1, resetTime: now + windowMs };
    return true;
  }
  if (now > rateLimitStore[identifier].resetTime) {
    rateLimitStore[identifier] = { count: 1, resetTime: now + windowMs };
    return true;
  }
  if (rateLimitStore[identifier].count >= maxRequests) return false;
  rateLimitStore[identifier].count++;
  return true;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { productName, platform, tone, keywords } = req.body;
    const authHeader = req.headers.authorization;
    if (!productName || !platform) return res.status(400).json({ error: 'Product name and platform required' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    let userId = null;
    let userEmail = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) { userId = user.id; userEmail = user.email; }
    }

    const identifier = userId || req.headers['x-forwarded-for'] || 'anonymous';
    if (!checkRateLimit(identifier)) return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });

    if (userId) {
      const { data: userData, error: userError } = await supabase.from('users').select('credits, plan').eq('id', userId).single();
      if (userError || !userData) {
        await supabase.from('users').insert({ id: userId, email: userEmail, credits: 10, plan: 'free' });
      } else if (userData.credits <= 0) {
        return res.status(402).json({ error: 'NO_CREDITS', message: 'Credits finished! Please upgrade.' });
      }
    }

    const platformInstructions = {
      'Shopify': 'Write for Shopify store. Focus on brand storytelling and conversion. Title 60-80 chars.',
      'Amazon': 'Write for Amazon. Include searchable keywords and specs. Title 150-200 chars with keywords upfront.',
      'eBay': 'Write for eBay. Be specific about features and value. Title 60-80 chars.',
      'Dropshipping': 'Write for dropshipping store. Focus on benefits and emotional appeal. Catchy title.',
      'Flipkart': 'Write for Flipkart India. Include specifications for Indian consumers. Highlight key specs.',
      'Meesho': 'Write for Meesho targeting Indian resellers. Simple clear language. Focus on value and resale potential.'
    };

    const toneInstructions = {
      'professional': 'Use professional authoritative tone.',
      'casual': 'Use friendly conversational tone.',
      'persuasive': 'Use compelling persuasive tone that drives action.',
      'luxury': 'Use premium sophisticated tone that conveys exclusivity.'
    };

    const prompt = `You are an expert ecommerce copywriter specializing in ${platform} listings.
Product: ${productName}
Platform: ${platform}
Tone: ${tone || 'professional'}
${keywords ? `Keywords to include: ${keywords}` : ''}
Platform guidance: ${platformInstructions[platform] || platformInstructions['Shopify']}
Tone guidance: ${toneInstructions[tone] || toneInstructions['professional']}

Generate a complete product listing. Respond ONLY in this exact format:

TITLE:
[Optimized product title]

DESCRIPTION:
[3-4 sentence compelling description]

BULLETS:
• [Feature 1]
• [Feature 2]
• [Feature 3]
• [Feature 4]
• [Feature 5]

SCORE:
[Number 1-100]

SCORE_FEEDBACK:
[2-3 specific improvement tips]`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], temperature: 0.8, max_tokens: 1000 })
    });

    if (!groqResponse.ok) { const err = await groqResponse.json(); throw new Error(err.error?.message || 'Groq API error'); }

    const groqData = await groqResponse.json();
    const text = groqData.choices[0]?.message?.content || '';

    const titleMatch = text.match(/TITLE:\s*([\s\S]*?)(?=DESCRIPTION:|$)/i);
    const descMatch = text.match(/DESCRIPTION:\s*([\s\S]*?)(?=BULLETS:|$)/i);
    const bulletsMatch = text.match(/BULLETS:\s*([\s\S]*?)(?=SCORE:|$)/i);
    const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
    const feedbackMatch = text.match(/SCORE_FEEDBACK:\s*([\s\S]*?)$/i);

    const result = {
      title: titleMatch ? titleMatch[1].trim() : '',
      description: descMatch ? descMatch[1].trim() : '',
      bullets: bulletsMatch ? bulletsMatch[1].trim() : '',
      score: scoreMatch ? parseInt(scoreMatch[1]) : 75,
      feedback: feedbackMatch ? feedbackMatch[1].trim() : ''
    };

    if (userId) {
      await supabase.rpc('decrement_credits', { user_id: userId });
      await supabase.from('usage_logs').insert({ user_id: userId, product_name: productName, platform: platform, listing_score: result.score });
      const { data: updatedUser } = await supabase.from('users').select('credits, plan').eq('id', userId).single();
      result.creditsRemaining = updatedUser?.credits ?? 0;
      result.plan = updatedUser?.plan ?? 'free';
    }

    return res.status(200).json({ success: true, data: result });

  } catch (error) {
    console.error('Generate error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

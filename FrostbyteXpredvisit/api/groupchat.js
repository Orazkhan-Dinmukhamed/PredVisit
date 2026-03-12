const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = 'Supabase_publishable_url_goes_here';
function sb() { const k = process.env.SUPABASE_SERVICE_KEY; return k ? createClient(SUPA_URL, k) : null; }

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const client = sb();
  if (!client) return res.status(200).json({ error: 'SUPABASE_SERVICE_KEY not configured', data: [] });

  try {
    // Auto-cleanup: delete messages from before today 00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await client.from('group_messages').delete().lt('created_at', today.toISOString());

    if (req.method === 'GET') {
      const { data, error } = await client.from('group_messages')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return res.status(200).json({ data: data || [] });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body.message || !body.user_email) {
        return res.status(400).json({ error: 'message and user_email are required' });
      }
      const { data, error } = await client.from('group_messages').insert([{
        user_email: body.user_email,
        user_name: body.user_name || body.user_email.split('@')[0],
        message: body.message.substring(0, 2000)
      }]).select();
      if (error) throw error;
      return res.status(200).json({ data: data ? data[0] : null });
    }

    return res.status(405).json({ error: 'Method not supported' });
  } catch (e) {
    console.error('GroupChat API:', e);
    return res.status(200).json({ error: e.message, data: [] });
  }
};
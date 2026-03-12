const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = 'Supabase_publishable_url_goes_here';

function sb() {
  const k = process.env.SUPABASE_SERVICE_KEY;
  if (!k) return null;
  return createClient(SUPA_URL, k);
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const client = sb();
  if (!client) return res.status(200).json({ error: 'SUPABASE_SERVICE_KEY not configured', data: [] });

  try {
    const email = req.query.email || (req.body && req.body.email) || '';

    if (req.method === 'GET') {
      if (!email) return res.status(200).json({ data: [] });

      // Single chat with messages
      const chatId = req.query.id;
      if (chatId) {
        const { data, error } = await client.from('chats').select('*').eq('id', parseInt(chatId)).single();
        if (error) throw error;
        return res.status(200).json({ data: data || null });
      }

      // List of chats (without messages for speed)
      const { data, error } = await client.from('chats').select('id,title,mode,created_at,updated_at').eq('user_email', email).order('updated_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ data: data || [] });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { data, error } = await client.from('chats').insert([{
        user_email: body.email || '',
        title: body.title || 'New chat',
        messages: body.messages || [],
        mode: body.mode || 'database'
      }]).select();
      if (error) throw error;
      return res.status(200).json({ data: data ? data[0] : null });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const id = req.query.id || body.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const upd = { updated_at: new Date().toISOString() };
      if (body.title) upd.title = body.title;
      if (body.messages) upd.messages = body.messages;
      if (body.mode) upd.mode = body.mode;
      const { data, error } = await client.from('chats').update(upd).eq('id', parseInt(id)).select();
      if (error) throw error;
      return res.status(200).json({ data: data ? data[0] : null });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await client.from('chats').delete().eq('id', parseInt(id));
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not supported' });
  } catch (e) {
    console.error('Chats API:', e);
    return res.status(200).json({ error: e.message, data: [] });
  }
};
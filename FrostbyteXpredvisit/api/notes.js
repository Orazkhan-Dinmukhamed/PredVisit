const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = 'supabase_publishable_url_goes_here';
function sb() { const k = process.env.SUPABASE_SERVICE_KEY; return k ? createClient(SUPA_URL, k) : null; }

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const client = sb();
  if (!client) return res.status(200).json({ error: 'SUPABASE_SERVICE_KEY not configured' });

  try {
    if (req.method === 'GET') {
      const pid = req.query.patient_id;
      if (!pid) return res.status(200).json({ data: [] });
      const { data, error } = await client.from('patient_notes').select('*').eq('patient_id', parseInt(pid)).order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ data: data || [] });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { data, error } = await client.from('patient_notes').upsert({
        patient_id: parseInt(body.patient_id),
        attending_doctor: body.attending_doctor || null,
        caretaker: body.caretaker || null,
        notes: body.notes || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'patient_id' }).select();
      if (error) {
        const { data: d2, error: e2 } = await client.from('patient_notes').insert([{
          patient_id: parseInt(body.patient_id),
          attending_doctor: body.attending_doctor || null,
          caretaker: body.caretaker || null,
          notes: body.notes || null
        }]).select();
        if (e2) throw e2;
        return res.status(200).json({ data: d2 ? d2[0] : null });
      }
      return res.status(200).json({ data: data ? data[0] : null });
    }
    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await client.from('patient_notes').delete().eq('id', parseInt(id));
      if (error) throw error;
      return res.status(200).json({ success: true });
    }
    return res.status(405).json({ error: 'Method not supported' });
  } catch (e) {
    console.error('Notes API:', e);
    return res.status(200).json({ error: e.message });
  }
};
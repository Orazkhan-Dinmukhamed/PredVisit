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
  if (!client) return res.status(200).json({ error: 'SUPABASE_SERVICE_KEY not configured', data: [], count: 0 });

  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      let query = client.from('operations').select('*', { count: 'exact' });
      if (q.patient_id) query = query.eq('patient_id', parseInt(q.patient_id));
      if (q.status) query = query.eq('status', q.status);
      if (q.department) query = query.eq('department', q.department);
      if (q.search) query = query.ilike('operation_name', '%' + q.search + '%');
      const p = parseInt(q.page) || 0;
      const sz = parseInt(q.pageSize) || 50;
      query = query.range(p * sz, (p + 1) * sz - 1).order('operation_date', { ascending: false });
      const { data, count, error } = await query;
      if (error) throw error;
      return res.status(200).json({ data: data || [], count: count || 0, page: p, pageSize: sz });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const rec = {
        patient_id: body.patient_id ? parseInt(body.patient_id) : null,
        patient_name: body.patient_name || null,
        patient_iin: body.patient_iin || null,
        operation_name: body.operation_name,
        operation_date: body.operation_date,
        surgeon: body.surgeon || null,
        department: body.department || null,
        status: body.status || 'Planned',
        notes: body.notes || null
      };
      const { data, error } = await client.from('operations').insert([rec]).select();
      if (error) throw error;
      return res.status(200).json({ data: data ? data[0] : null, success: true });
    }
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const id = req.query.id || body.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const upd = {};
      if (body.status) upd.status = body.status;
      if (body.surgeon) upd.surgeon = body.surgeon;
      if (body.notes !== undefined) upd.notes = body.notes;
      if (body.operation_name) upd.operation_name = body.operation_name;
      if (body.operation_date) upd.operation_date = body.operation_date;
      const { data, error } = await client.from('operations').update(upd).eq('id', parseInt(id)).select();
      if (error) throw error;
      return res.status(200).json({ data: data ? data[0] : null });
    }
    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await client.from('operations').delete().eq('id', parseInt(id));
      if (error) throw error;
      return res.status(200).json({ success: true });
    }
    return res.status(405).json({ error: 'Method not supported' });
  } catch (e) {
    console.error('Operations API:', e);
    return res.status(200).json({ error: e.message, data: [], count: 0 });
  }
};
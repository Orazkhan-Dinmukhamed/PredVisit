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

      // Stats mode: staff with patient counts
      if (q.stats === 'true') {
        const { data: allStaff, error: se } = await client.from('staff').select('*').eq('is_active', true).order('department');
        if (se) throw se;
        const { data: allPatients, error: pe } = await client.from('patients').select('id,patient_name,attending_doctor,department,diagnosis,admission_date,hospitalization_days');
        if (pe) throw pe;

        const result = (allStaff || []).map(s => {
          const pts = (allPatients || []).filter(p => p.attending_doctor === s.full_name);
          return { ...s, patient_count: pts.length, patients: pts.slice(0, 50) };
        });
        return res.status(200).json({ data: result });
      }

      let query = client.from('staff').select('*', { count: 'exact' });
      if (q.department) query = query.eq('department', q.department);
      if (q.role) query = query.eq('role', q.role);
      if (q.is_active !== undefined && q.is_active !== '') query = query.eq('is_active', q.is_active === 'true');
      if (q.search) query = query.ilike('full_name', '%' + q.search + '%');
      query = query.order('department').order('full_name');
      const { data, count, error } = await query;
      if (error) throw error;
      return res.status(200).json({ data: data || [], count: count || 0 });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body.full_name) return res.status(400).json({ error: 'Name required' });
      const rec = {
        full_name: body.full_name,
        role: body.role || 'Doctor',
        department: body.department || 'Therapy',
        specialization: body.specialization || null,
        phone: body.phone || null,
        email: body.email || null,
        is_active: body.is_active !== false
      };
      const { data, error } = await client.from('staff').insert([rec]).select();
      if (error) throw error;
      return res.status(200).json({ data: data ? data[0] : null, success: true });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const id = req.query.id || body.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const upd = {};
      if (body.full_name) upd.full_name = body.full_name;
      if (body.role) upd.role = body.role;
      if (body.department) upd.department = body.department;
      if (body.specialization !== undefined) upd.specialization = body.specialization;
      if (body.phone !== undefined) upd.phone = body.phone;
      if (body.email !== undefined) upd.email = body.email;
      if (body.is_active !== undefined) upd.is_active = body.is_active;
      const { data, error } = await client.from('staff').update(upd).eq('id', parseInt(id)).select();
      if (error) throw error;
      return res.status(200).json({ data: data ? data[0] : null });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await client.from('staff').delete().eq('id', parseInt(id));
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not supported' });
  } catch (e) {
    console.error('Staff API:', e);
    return res.status(200).json({ error: e.message, data: [], count: 0 });
  }
};
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

      // Single patient by id
      if (q.id && !q.search) {
        const { data, error } = await client.from('patients').select('*').eq('id', parseInt(q.id)).single();
        if (error) throw error;
        return res.status(200).json({ data: data });
      }

      let query = client.from('patients').select('*', { count: 'exact' });
      if (q.iin) query = query.eq('iin', q.iin);
      if (q.patient_name) query = query.eq('patient_name', q.patient_name);
      if (q.gender) query = query.eq('gender', q.gender);
      if (q.age_group) query = query.eq('age_group', q.age_group);
      if (q.age_min) query = query.gte('age', parseInt(q.age_min));
      if (q.age_max) query = query.lte('age', parseInt(q.age_max));
      if (q.diagnosis) query = query.eq('diagnosis', q.diagnosis);
      if (q.icd_code) query = query.eq('icd_code', q.icd_code);
      if (q.comorbidity) query = query.ilike('comorbidity', '%' + q.comorbidity + '%');
      if (q.month) query = query.eq('month', q.month);
      if (q.department) query = query.eq('department', q.department);
      if (q.is_readmission !== undefined && q.is_readmission !== '') query = query.eq('is_readmission', q.is_readmission === 'true');
      if (q.min_days) query = query.gte('hospitalization_days', parseInt(q.min_days));
      if (q.max_days) query = query.lte('hospitalization_days', parseInt(q.max_days));
      if (q.search) query = query.ilike('diagnosis', '%' + q.search + '%');

      const p = parseInt(q.page) || 0;
      const sz = parseInt(q.pageSize) || 50;
      query = query.range(p * sz, (p + 1) * sz - 1);
      // Always sort cured patients to bottom first
      query = query.order('is_cured', { ascending: true });
      const col = q.sort_by || 'id';
      const asc = q.sort_dir !== 'desc';
      query = query.order(col, { ascending: asc });

      const { data, count, error } = await query;
      if (error) throw error;
      return res.status(200).json({ data: data || [], count: count || 0, page: p, pageSize: sz });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body.patient_name || !body.iin || !body.diagnosis || !body.icd_code) {
        return res.status(400).json({ error: 'Required fields: name, IIN, diagnosis, ICD-10 code' });
      }
      const rec = {
        patient_name: body.patient_name,
        iin: body.iin,
        age: parseInt(body.age) || 0,
        age_group: body.age_group || '25-39',
        gender: body.gender || 'Male',
        diagnosis: body.diagnosis,
        icd_code: body.icd_code,
        hospitalization_days: parseInt(body.hospitalization_days) || 1,
        comorbidity: body.comorbidity || null,
        month: body.month || 'January',
        is_readmission: body.is_readmission === true || body.is_readmission === 'true',
        department: body.department || null,
        admission_date: body.admission_date || null,
        attending_doctor: body.attending_doctor || null,
        previous_operations: body.previous_operations || 'None',
        drug_allergies: body.drug_allergies || 'None',
        contraindications: body.contraindications || 'None',
        phone: body.phone || null,
        is_cured: body.is_cured === true || body.is_cured === 'true'
      };
      const { data, error } = await client.from('patients').insert([rec]).select();
      if (error) throw error;
      return res.status(200).json({ data: data ? data[0] : null, success: true });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const id = req.query.id || body.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const upd = {};
      if (body.is_cured !== undefined) upd.is_cured = body.is_cured === true || body.is_cured === 'true';
      if (body.attending_doctor !== undefined) upd.attending_doctor = body.attending_doctor;
      if (body.previous_operations !== undefined) upd.previous_operations = body.previous_operations;
      if (body.drug_allergies !== undefined) upd.drug_allergies = body.drug_allergies;
      if (body.contraindications !== undefined) upd.contraindications = body.contraindications;
      if (body.phone !== undefined) upd.phone = body.phone;
      const { data, error } = await client.from('patients').update(upd).eq('id', parseInt(id)).select();
      if (error) throw error;
      return res.status(200).json({ data: data ? data[0] : null, success: true });
    }

    if (req.method === 'DELETE') {
      const id = req.query && req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await client.from('patients').delete().eq('id', parseInt(id));
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not supported' });
  } catch (e) {
    console.error('Patients API:', e);
    return res.status(200).json({ error: e.message, data: [], count: 0 });
  }
};
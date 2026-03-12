const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = 'supabase_publishable_url_goes_here';
function sb() { const k = process.env.SUPABASE_SERVICE_KEY; return k ? createClient(SUPA_URL, k) : null; }
const ALL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const client = sb();
  const empty = { summary:{total:0,readmissions:0,unique_patients:0,readmission_rate:'0'}, byMonth:[], byAge:[], byDiagnosis:[], byGender:[], byDepartment:[], allDiagnoses:[], allIcd:[], allDepartments:[] };
  if (!client) return res.status(200).json({ error: 'SUPABASE_SERVICE_KEY not configured', ...empty });
  try {
    const { data: all, error } = await client.from('patients').select('*');
    if (error) throw error;
    if (!all || !all.length) return res.status(200).json(empty);
    const total = all.length;
    const readmissions = all.filter(p => p.is_readmission).length;
    const unique = new Set(all.map(p => p.iin)).size;
    const byMonth = ALL_MONTHS.map(m => {
      const rows = all.filter(p => p.month === m);
      const re = rows.filter(p => p.is_readmission).length;
      return { month: m, total: rows.length, readmissions: re, rate: rows.length ? ((re/rows.length)*100).toFixed(1) : '0' };
    });
    const ageGroups = ['0-17','18-24','25-39','40-64','65+'];
    const byAge = ageGroups.map(ag => {
      const rows = all.filter(p => p.age_group === ag);
      const re = rows.filter(p => p.is_readmission).length;
      const avg = rows.length ? (rows.reduce((s,p)=>s+p.hospitalization_days,0)/rows.length).toFixed(1) : '0';
      return { age_group: ag, total: rows.length, readmissions: re, rate: rows.length ? ((re/rows.length)*100).toFixed(1) : '0', avg_days: avg };
    });
    const diagMap = {};
    all.forEach(p => {
      if (!diagMap[p.diagnosis]) diagMap[p.diagnosis] = { diagnosis: p.diagnosis, icd: p.icd_code, total:0, readmissions:0, totalDays:0 };
      diagMap[p.diagnosis].total++; diagMap[p.diagnosis].totalDays += p.hospitalization_days;
      if (p.is_readmission) diagMap[p.diagnosis].readmissions++;
    });
    const byDiagnosis = Object.values(diagMap).map(d => ({ ...d, rate: d.total ? ((d.readmissions/d.total)*100).toFixed(1) : '0', avg_days: (d.totalDays/d.total).toFixed(1) })).sort((a,b) => b.total - a.total);
    const byGender = ['Male','Female'].map(g => {
      const rows = all.filter(p => p.gender === g); const re = rows.filter(p => p.is_readmission).length;
      return { gender: g, total: rows.length, readmissions: re, rate: rows.length ? ((re/rows.length)*100).toFixed(1) : '0' };
    });
    const deptMap = {};
    all.forEach(p => { const dep = p.department || 'Not specified'; if (!deptMap[dep]) deptMap[dep] = { department: dep, total:0, readmissions:0 }; deptMap[dep].total++; if (p.is_readmission) deptMap[dep].readmissions++; });
    const byDepartment = Object.values(deptMap).map(d => ({ ...d, rate: d.total ? ((d.readmissions/d.total)*100).toFixed(1) : '0' })).sort((a,b) => b.total - a.total);
    const allDepartments = [...new Set(all.map(p => p.department).filter(Boolean))].sort();
    return res.status(200).json({
      summary: { total, readmissions, unique_patients: unique, readmission_rate: ((readmissions/total)*100).toFixed(1) },
      byMonth, byAge, byDiagnosis: byDiagnosis.slice(0,25), byGender, byDepartment,
      allDiagnoses: [...new Set(all.map(p=>p.diagnosis))].sort(), allIcd: [...new Set(all.map(p=>p.icd_code))].sort(), allDepartments
    });
  } catch (e) { console.error('Stats API error:', e); return res.status(200).json({ error: e.message, ...empty }); }
};
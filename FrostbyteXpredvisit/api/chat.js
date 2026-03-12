const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'PLEASE_SET_SUPABASE_URL';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key);
}

async function fetchDbContext(supabase, userMessage) {
  try {
    const { data: all, error } = await supabase.from('patients').select('*');
    if (error) return 'Data loading error: ' + error.message;
    if (!all || all.length === 0) return 'The database is empty.';

    const total = all.length;
    const readmissions = all.filter(p => p.is_readmission).length;
    const unique = new Set(all.map(p => p.iin)).size;

    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthStats = months.map(m => {
      const rows = all.filter(p => p.month === m);
      const re = rows.filter(p => p.is_readmission).length;
      return m + ': ' + rows.length + ' records, ' + re + ' readmissions (' + (rows.length ? ((re / rows.length) * 100).toFixed(1) : 0) + '%)';
    }).join('\n');

    const ageGroups = ['0-17', '18-24', '25-39', '40-64', '65+'];
    const ageStats = ageGroups.map(ag => {
      const rows = all.filter(p => p.age_group === ag);
      const re = rows.filter(p => p.is_readmission).length;
      const avgD = rows.length ? (rows.reduce((s, p) => s + p.hospitalization_days, 0) / rows.length).toFixed(1) : 0;
      return ag + ': ' + rows.length + ' records, ' + re + ' readmissions (' + (rows.length ? ((re / rows.length) * 100).toFixed(1) : 0) + '%), average length: ' + avgD + ' days';
    }).join('\n');

    const diagMap = {};
    all.forEach(p => {
      if (!diagMap[p.diagnosis]) diagMap[p.diagnosis] = { d: p.diagnosis, icd: p.icd_code, t: 0, r: 0, days: 0 };
      diagMap[p.diagnosis].t++;
      diagMap[p.diagnosis].days += p.hospitalization_days;
      if (p.is_readmission) diagMap[p.diagnosis].r++;
    });
    const topDiag = Object.values(diagMap).sort((a, b) => b.t - a.t).slice(0, 15).map(d =>
      d.d + ' (' + d.icd + '): ' + d.t + ' cases, ' + d.r + ' readmissions (' + (d.t ? ((d.r / d.t) * 100).toFixed(1) : 0) + '%), avg ' + (d.days / d.t).toFixed(1) + ' days'
    ).join('\n');

    const genderStats = ['Male', 'Female'].map(g => {
      const rows = all.filter(p => p.gender === g);
      const re = rows.filter(p => p.is_readmission).length;
      return g + ': ' + rows.length + ', readmissions: ' + re;
    }).join('; ');

    const deptMap = {};
    all.forEach(p => { const dep = p.department || 'Not specified'; if (!deptMap[dep]) deptMap[dep] = { t: 0, r: 0 }; deptMap[dep].t++; if (p.is_readmission) deptMap[dep].r++; });
    const deptStats = Object.entries(deptMap).sort((a, b) => b[1].t - a[1].t).map(e => e[0] + ': ' + e[1].t + ' patients, ' + e[1].r + ' readmissions (' + (e[1].t ? ((e[1].r / e[1].t) * 100).toFixed(1) : 0) + '%)').join('\n');

    const msg = userMessage.toLowerCase();
    let relevantPatients = [];

    const patientMatch = msg.match(/patient\s*(\d+)/i) || msg.match(/пациент\s*(\d+)/i);
    if (patientMatch) {
      relevantPatients = all.filter(p => p.patient_name === 'patient' + patientMatch[1]);
    }

    const iinMatch = msg.match(/иин\s*(\d+)/i) || msg.match(/iin\s*(\d+)/i);
    if (iinMatch) {
      relevantPatients = [...relevantPatients, ...all.filter(p => p.iin === iinMatch[1])];
    }

    const keywords = ['pneumonia', 'diabetes', 'infarction', 'asthma', 'hypertension', 'stroke', 'bronchitis', 'gastritis', 'pancreatitis', 'cirrhosis', 'epilepsy', 'arthritis', 'anemia', 'obesity', 'pyelonephritis', 'cholecystitis', 'tonsillitis', 'hepatitis', 'arrhythmia', 'osteoporosis'];
    for (const kw of keywords) {
      if (msg.includes(kw)) {
        relevantPatients = [...relevantPatients, ...all.filter(p => p.diagnosis.toLowerCase().includes(kw))];
        break;
      }
    }

    if (msg.includes('readmission') || msg.includes('rehospitalization')) {
      relevantPatients = [...relevantPatients, ...all.filter(p => p.is_readmission)];
    }

    // Search by doctor name
    const doctorNames = [...new Set(all.map(p => p.attending_doctor).filter(Boolean))];
    for (const doc of doctorNames) {
      const docLower = doc.toLowerCase();
      const docParts = docLower.split(/\s+/);
      if (docParts.some(part => part.length > 2 && msg.includes(part))) {
        relevantPatients = [...relevantPatients, ...all.filter(p => p.attending_doctor === doc)];
        break;
      }
    }

    // Search by patient name (full name search)
    if (msg.match(/patient|doctor/i)) {
      // already handled above by doctor name search
    }
    const nameWords = msg.match(/[a-z]{3,}/gi) || [];
    for (const word of nameWords) {
      if (['patient','doctor','show','how','many','data','department'].some(w => word.startsWith(w))) continue;
      const found = all.filter(p => p.patient_name && p.patient_name.toLowerCase().includes(word));
      if (found.length > 0 && found.length < 20) {
        relevantPatients = [...relevantPatients, ...found];
        break;
      }
    }

    const seen = new Set();
    relevantPatients = relevantPatients.filter(p => {
      const key = p.id || (p.patient_name + p.month);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 40);

    const patientsText = relevantPatients.length > 0
      ? '\n\nFound patients:\n' + relevantPatients.map(p =>
        p.patient_name + ' | IIN: ' + p.iin + ' | ' + p.age + ' years (' + p.age_group + ') | ' + p.gender + ' | ' + p.diagnosis + ' (' + p.icd_code + ') | ' + (p.department || '') + ' | ' + p.hospitalization_days + ' days | Comorbidity: ' + (p.comorbidity || 'None') + ' | ' + p.month + ' | ' + (p.is_cured ? 'CURED' : p.is_readmission ? 'READMISSION' : 'In treatment') + ' | Doctor: ' + (p.attending_doctor || '—') + (p.drug_allergies && p.drug_allergies !== 'None' ? ' | Allergy: ' + p.drug_allergies : '') + (p.contraindications && p.contraindications !== 'None' ? ' | Contraindications: ' + p.contraindications : '')
      ).join('\n')
      : '';

    // Staff-patient summary
    const staffMap = {};
    all.forEach(p => {
      const doc = p.attending_doctor || 'Not assigned';
      if (!staffMap[doc]) staffMap[doc] = { dept: p.department || '', patients: [] };
      staffMap[doc].patients.push(p.patient_name);
    });
    const staffSummary = Object.entries(staffMap).map(e => e[0] + ' (' + e[1].dept + '): ' + e[1].patients.length + ' patients — ' + e[1].patients.slice(0, 8).join(', ') + (e[1].patients.length > 8 ? '...' : '')).join('\n');

    const readmitPatients = all.filter(p => p.is_readmission);
    const readmitIins = [...new Set(readmitPatients.map(p => p.iin))];
    const mo = {
  'January': 1,
  'February': 2,
  'March': 3,
  'April': 4,
  'May': 5,
  'June': 6,
  'July': 7,
  'August': 8,
  'September': 9,
  'October': 10,
  'November': 11,
  'December': 12
};
    const readmitDetails = readmitIins.slice(0, 20).map(iin => {
      const visits = all.filter(p => p.iin === iin).sort((a, b) => (mo[a.month] || 0) - (mo[b.month] || 0));
      return visits.map(v =>
        '  ' + v.patient_name + ' (IIN:' + v.iin + ') ' + v.month + ': ' + v.diagnosis + ' (' + v.icd_code + '), ' + v.hospitalization_days + ' days, ' + (v.is_readmission ? 'READMISSION' : 'Primary')
      ).join('\n');
    }).join('\n');

    return 'DATABASE SUMMARY OF PATIENTS:\nTotal records: ' + total + '\nUnique patients: ' + unique + '\nReadmissions: ' + readmissions + ' (' + ((readmissions / total) * 100).toFixed(1) + '%)\n\nSTATISTICS BY MONTH:\n' + monthStats + '\n\nSTATISTICS BY AGE GROUP:\n' + ageStats + '\n\nBY GENDER: ' + genderStats + '\n\nBY DEPARTMENT:\n' + deptStats + '\n\nTOP DIAGNOSES:\n' + topDiag + '\n\nDOCTORS AND THEIR PATIENTS:\n' + staffSummary + '\n\nREADMITTED PATIENTS (visit history):\n' + readmitDetails + patientsText + await fetchOpsContext(supabase, userMessage);
  } catch (e) {
    return 'Error loading data: ' + e.message;
  }
}

async function fetchOpsContext(supabase, userMessage) {
  try {
    const { data: ops, error } = await supabase.from('operations').select('*').order('operation_date', { ascending: false }).limit(50);
    if (error || !ops || ops.length === 0) return '';

    const msg = userMessage.toLowerCase();
    let filtered = ops;

    // Filter by date if user mentions one
    const dateMatch = msg.match(/(\d{2})[\.\/](\d{2})[\.\/](\d{4})/);
    if (dateMatch) {
      const searchDate = dateMatch[3] + '-' + dateMatch[2] + '-' + dateMatch[1];
      const found = ops.filter(o => o.operation_date === searchDate);
      if (found.length > 0) filtered = found;
    }

    const statusMap = {'planned': 'Planned', 'in progress': 'In progress', 'completed': 'Completed', 'cancelled': 'Cancelled'};
    for (const [kw, st] of Object.entries(statusMap)) {
      if (msg.includes(kw)) {
        const found = ops.filter(o => o.status === st);
        if (found.length > 0) filtered = found;
        break;
      }
    }

    const byStatus = {};
    ops.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
    const statusSummary = Object.entries(byStatus).map(e => e[0] + ': ' + e[1]).join(', ');

    const opsText = filtered.slice(0, 30).map(o =>
      (o.operation_name || '—') + ' | Patient: ' + (o.patient_name || '—') + ' | Date: ' + (o.operation_date || '—') + ' | Surgeon: ' + (o.surgeon || '—') + ' | Department: ' + (o.department || '—') + ' | Status: ' + (o.status || '—') + (o.notes ? ' | Note: ' + o.notes : '')
    ).join('\n');

    return '\n\nOPERATIONS (' + ops.length + ' total, ' + statusSummary + '):\n' + opsText;
  } catch (e) {
    return '';
  }
}

async function callGroq(systemPrompt, userMessage, history) {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) throw new Error('QWEN_API_KEY is not configured. Add via: vercel env add QWEN_API_KEY');

  const messages = [{ role: 'system', content: systemPrompt }];
  if (history && history.length > 0) {
    messages.push(...history.slice(-6));
  }
  messages.push({ role: 'user', content: userMessage });

  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: messages,
      max_tokens: 4096,
      temperature: 0.7,
      top_p: 0.9
    })
  });

  const raw = await resp.text();

  if (!resp.ok) {
    console.error('Groq error:', resp.status, raw);
    throw new Error('Groq API: ' + resp.status + ' — ' + raw.substring(0, 200));
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error('Groq returned invalid JSON: ' + raw.substring(0, 200));
  }

  let text = '';
  if (data.choices && data.choices[0] && data.choices[0].message) {
    text = data.choices[0].message.content || '';
  }

  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return text;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message, mode, history } = body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    let systemPrompt = '';
    const chatMode = mode || 'database';

    if (chatMode === 'database') {
      const supabase = getSupabase();
      let dbContext = 'Supabase is not configured. Add SUPABASE_SERVICE_KEY.';
      if (supabase) {
        dbContext = await fetchDbContext(supabase, message);
      }

      systemPrompt = 'You are an AI assistant for doctors, working with a hospital database of patients, doctors, and operations. Your task is to analyze data, calculate readmission rates, find patterns, answer questions about operations, and give recommendations.\n\nIMPORTANT:\n- Answer ONLY based on the provided database data\n- Use specific numbers and percentages\n- If asked about a specific patient — search by name or IIN in the data\n- If asked about a doctor — look in the DOCTORS AND THEIR PATIENTS section. Show that doctor\'s patient list\n- If asked about operations — search by date, surgeon, status, or patient in the OPERATIONS section\n- Operation dates are in YYYY-MM-DD format, but the user may write in DD.MM.YYYY format\n- Format answers clearly: use lists, emphasis\n- Give advice on reducing readmissions, but note that these are AI recommendations and may be inaccurate\n- LANGUAGE: Determine the main language of the message. Kazakh — answer in Kazakh. Russian — in Russian. English — in English. If mixed, answer in the language with more words\n- Do not answer questions unrelated to the database\n\nHere is the current data from the database:\n\n' + dbContext;
    } else {
      systemPrompt = 'You are a medical AI assistant for doctors. You help:\n- Quickly get information about diagnoses and diseases\n- Find ICD-10 codes\n- Understand epidemiology: disease prevalence, which groups are most affected\n- In which countries and among which people the disease is more common\n- Interesting facts and nuances of diseases\n- Provide dietary recommendations for diseases\n- Differential diagnosis for unclear symptoms\n\nIMPORTANT RULES:\n- Answer ONLY medical questions\n- If the question is NOT related to medicine — politely decline and explain that you are a medical assistant\n- ALWAYS add a disclaimer at the end of your answer that the information may be inaccurate and does not replace a doctor\'s consultation\n- LANGUAGE: English Determine the main language of the user\'s message.If in English — in English.\n- Be informative but concise';
    }

    const reply = await callGroq(systemPrompt, message, history || []);
    return res.status(200).json({ reply: reply, mode: chatMode });

  } catch (err) {
    console.error('Chat API error:', err);
    return res.status(200).json({ reply: 'Error: ' + (err.message || 'Unknown server error'), mode: 'error' });
  }
};
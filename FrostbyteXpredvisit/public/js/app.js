/* ═══ STATE ═══ */
var chatMode = 'database', sending = false, curPage = 0, sortCol = 'id', sortDir = 'asc';
var filterTimer = null, statsLoaded = false, addReadmit = false;
var currentChatId = null, currentUser = null;

/* ═══ INIT ═══ */
(async function() {
  var user = await AUTH.getUser();
  if (!user) { window.location.href = '/login.html'; return; }
  currentUser = user;
  var el = document.getElementById('userEmail');
  if (el) el.textContent = user.email || '';
  loadDepartmentsFilter();
  loadStaffDropdown();
  checkOnboarding();
  LANG.applyToDOM();
  setMode('database');

  // Restore last chat from sessionStorage
  var savedChatId = sessionStorage.getItem('medai_chat_id');
  if (savedChatId && savedChatId !== 'null') {
    await loadChat(parseInt(savedChatId));
  } else {
    loadChatList();
  }

  // URL param view switching: /?view=dashboard or /?view=patients
  var params = new URLSearchParams(window.location.search);
  var viewParam = params.get('view');
  if (viewParam && ['chat','dashboard','patients'].indexOf(viewParam) !== -1) {
    switchView(viewParam);
  }
})();

/* ═══ HELPERS ═══ */
function esc(s){if(!s)return'';var d=document.createElement('div');d.textContent=s;return d.innerHTML}
function md(t){var h=esc(t);h=h.replace(/```(\w*)\n([\s\S]*?)```/g,'<pre><code>$2</code></pre>');h=h.replace(/`([^`]+)`/g,'<code>$1</code>');h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');h=h.replace(/\*(.+?)\*/g,'<em>$1</em>');h=h.replace(/^#### (.+)$/gm,'<h4>$1</h4>');h=h.replace(/^### (.+)$/gm,'<h3>$1</h3>');h=h.replace(/^[-•] (.+)$/gm,'<li>$1</li>');h=h.replace(/^(\d+)\. (.+)$/gm,'<li>$2</li>');h=h.replace(/(<li>[\s\S]*?<\/li>)/g,'<ul>$1</ul>');h=h.replace(/<\/ul>\s*<ul>/g,'');h=h.replace(/\n\n/g,'</p><p>');h=h.replace(/\n/g,'<br>');h='<p>'+h+'</p>';h=h.replace(/<p>\s*<\/p>/g,'');h=h.replace(/<p>(<h[34]>)/g,'$1');h=h.replace(/(<\/h[34]>)<\/p>/g,'$1');h=h.replace(/<p>(<ul>)/g,'$1');h=h.replace(/(<\/ul>)<\/p>/g,'$1');h=h.replace(/<p>(<pre>)/g,'$1');h=h.replace(/(<\/pre>)<\/p>/g,'$1');return h}

/* ═══ VIEW ═══ */
function switchView(v){document.querySelectorAll('.view').forEach(function(el){el.classList.remove('active')});document.getElementById('view-'+v).classList.add('active');document.querySelectorAll('.nav-item[data-view]').forEach(function(b){b.classList.remove('active')});var btn=document.querySelector('[data-view="'+v+'"]');if(btn)btn.classList.add('active');closeSidebar();if(v==='dashboard'&&!statsLoaded)loadDashboard();if(v==='patients')loadPatients()}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open')}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open')}

/* ═══ MODE ═══ */
function setMode(m){
  chatMode=m;
  var keys={database:'modeDb',medical:'modeMed',draft:'modeDraft'};
  var colors={database:'var(--v500)',medical:'var(--green)',draft:'var(--g800)'};
  var dot=document.getElementById('modeDot');
  var lbl=document.getElementById('modeLabelBtn');
  if(dot)dot.style.background=colors[m]||colors.database;
  if(lbl)lbl.textContent=LANG.t(keys[m]||'modeDb');
  ['optDb','optMed','optDraft'].forEach(function(id){var el=document.getElementById(id);if(el)el.classList.remove('active')});
  var activeOpt=m==='database'?'optDb':m==='medical'?'optMed':'optDraft';
  var el=document.getElementById(activeOpt);if(el)el.classList.add('active');
  var dd=document.getElementById('modeDropdown');if(dd)dd.classList.remove('open');
  var d=document.getElementById('disclaimer');
  if(m==='draft'){d.textContent=LANG.t('disclaimerDraft');d.style.color='#6b7280'}
  else if(m==='medical'){d.textContent=LANG.t('disclaimerMed');d.style.color='#f59e0b'}
  else{d.textContent=LANG.t('disclaimer');d.style.color=''}
}

function toggleModeDropdown(){
  var dd=document.getElementById('modeDropdown');
  if(dd)dd.classList.toggle('open');
}
// Close dropdown on outside click
document.addEventListener('click',function(e){
  if(!e.target.closest('.mode-dropdown-wrap')){
    var dd=document.getElementById('modeDropdown');if(dd)dd.classList.remove('open');
  }
});

/* ═══ SETTINGS ═══ */
function openSettings(){document.getElementById('settingsOverlay').classList.add('open');updateLangBtns()}
function closeSettings(e){if(e&&e.target!==e.currentTarget)return;document.getElementById('settingsOverlay').classList.remove('open')}
function updateLangBtns(){
  document.querySelectorAll('.lang-btn').forEach(function(b){b.classList.toggle('active',b.dataset.lang===LANG.getLang())});
}
function switchLang(lang){LANG.setLang(lang);updateLangBtns();LANG.applyToDOM();setMode(chatMode)}

/* ═══ ONBOARDING ═══ */
function checkOnboarding(){
  if(!localStorage.getItem('predvisit_onboarded')){
    document.getElementById('onboardOverlay').style.display='grid';
  }
}
function dismissOnboard(){
  localStorage.setItem('predvisit_onboarded','1');
  document.getElementById('onboardOverlay').style.display='none';
}

/* ═══ CHAT HISTORY ═══ */
async function loadChatList(){
  var el=document.getElementById('chatList');
  if(!currentUser){el.innerHTML='';return}
  try{
    var res=await fetch('/api/chats?email='+encodeURIComponent(currentUser.email));
    var d=await res.json();
    var chats=d.data||[];
    el.innerHTML=chats.length===0?'<div style="padding:8px 14px;font-size:.75rem;color:#9ca3af">No chats</div>':chats.map(function(c){
      return '<div class="chat-item'+(c.id===currentChatId?' active':'')+'" onclick="loadChat('+c.id+')"><span class="chat-item-title">'+esc(c.title)+'</span><button class="chat-item-del" onclick="event.stopPropagation();deleteChat('+c.id+')" title="Delete">✕</button></div>'
    }).join('');
  }catch(e){el.innerHTML=''}
}

async function newChat(){
  currentChatId=null;
  chatMsgList=[];
  sessionStorage.removeItem('medai_chat_id');
  var el=document.getElementById('chatMessages');
  el.innerHTML='<div class="chat-logo-wrap centered" id="chatLogoWrap"><img src="/image2.png" alt="PredVisit" class="chat-logo-img"></div>';
  loadChatList();
}

async function loadChat(id){
  try{
    var res=await fetch('/api/chats?email='+encodeURIComponent(currentUser.email)+'&id='+id);
    var d=await res.json();
    var chat=d.data;
    if(!chat||!chat.messages)return;
    currentChatId=id;
    sessionStorage.setItem('medai_chat_id', String(id));
    var msgs=chat.messages||[];
    chatMsgList=[];
    var el=document.getElementById('chatMessages');
    el.innerHTML='<div class="chat-logo-wrap top" id="chatLogoWrap"><img src="/image2.png" alt="PredVisit" class="chat-logo-img"></div>';
    msgs.forEach(function(m){
      var role=(m.role==='assistant'||m.role==='ai')?'ai':'user';
      addMsgDom(role,m.content);
      chatMsgList.push({role:role,content:m.content});
    });
    if(chat.mode)setMode(chat.mode);
    loadChatList();
  }catch(e){console.error('loadChat error:',e)}
}

async function saveChat(msgs){
  if(!currentUser)return;
  var title=msgs.length>0?msgs[0].content.substring(0,40):'New chat';
  var apiMsgs=msgs.map(function(m){return{role:m.role==='ai'?'assistant':m.role,content:m.content}});
  try{
    if(currentChatId){
      await fetch('/api/chats?id='+currentChatId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:apiMsgs,title:title,mode:chatMode})});
    }else{
      var res=await fetch('/api/chats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:currentUser.email,title:title,messages:apiMsgs,mode:chatMode})});
      var d=await res.json();
      if(d.data){currentChatId=d.data.id;sessionStorage.setItem('medai_chat_id',String(d.data.id))}
    }
    loadChatList();
  }catch(e){}
}

async function deleteChat(id){
  if(!confirm('Delete chat?'))return;
  try{
    await fetch('/api/chats?id='+id,{method:'DELETE'});
    if(id===currentChatId){sessionStorage.removeItem('medai_chat_id');newChat();}
    else loadChatList();
  }catch(e){}
}

/* ═══ CHAT MESSAGES ═══ */
var chatMsgList=[];

function insertPrompt(t){document.getElementById('chatInput').value=t;sendMessage()}
function handleKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}
function autoGrow(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,96)+'px'}

function addMsgDom(role,content){
  var w=document.getElementById('chatMessages');
  // Move logo from centered to top when messages start
  var logo=document.getElementById('chatLogoWrap');
  if(logo&&logo.classList.contains('centered')){logo.classList.remove('centered');logo.classList.add('top')}
  var d=document.createElement('div');d.className='msg msg-'+role;
  d.innerHTML='<div class="msg-ava">'+(role==='user'?'👤':'✦')+'</div><div class="msg-text">'+(role==='ai'?md(content):esc(content))+'</div>';
  w.appendChild(d);w.scrollTop=w.scrollHeight
}

function showTyping(){var w=document.getElementById('chatMessages');var d=document.createElement('div');d.className='msg msg-ai';d.id='typingEl';d.innerHTML='<div class="msg-ava">✦</div><div class="msg-text"><div class="typing"><span></span><span></span><span></span></div></div>';w.appendChild(d);w.scrollTop=w.scrollHeight}
function hideTyping(){var el=document.getElementById('typingEl');if(el)el.remove()}

async function sendMessage(){
  var inp=document.getElementById('chatInput');var txt=inp.value.trim();
  if(!txt||sending)return;inp.value='';inp.style.height='auto';
  sending=true;document.getElementById('sendBtn').disabled=true;
  addMsgDom('user',txt);chatMsgList.push({role:'user',content:txt});
  showTyping();
  try{
    var hist=chatMsgList.slice(-6).map(function(m){return{role:m.role==='ai'?'assistant':m.role,content:m.content}});
    // Draft mode sends as 'medical' to API but never saves
    var apiMode=chatMode==='draft'?'medical':chatMode;
    var res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:txt,mode:apiMode,history:hist})});
    hideTyping();
    var raw=await res.text();var data;
    try{data=JSON.parse(raw)}catch(e){addMsgDom('ai','Error: invalid server response');sending=false;document.getElementById('sendBtn').disabled=false;return}
    var reply=data.reply||data.error||'Empty response';
    addMsgDom('ai',reply);chatMsgList.push({role:'ai',content:reply});
    // Only save if NOT in draft mode
    if(chatMode!=='draft'){saveChat(chatMsgList)}
  }catch(e){hideTyping();addMsgDom('ai','Error: '+e.message)}
  sending=false;document.getElementById('sendBtn').disabled=false
}

/* ═══ DEPARTMENTS FILTER ═══ */
async function loadDepartmentsFilter(){
  try{
    var res=await fetch('/api/stats');var d=await res.json();
    var sel=document.getElementById('fDept');if(!sel)return;
    (d.allDepartments||[]).forEach(function(dep){var o=document.createElement('option');o.value=dep;o.textContent=dep;sel.appendChild(o)});
  }catch(e){}
}

var staffList=[];
async function loadStaffDropdown(){
  try{
    var res=await fetch('/api/staff?is_active=true');var d=await res.json();
    staffList=d.data||[];
    var sel=document.getElementById('aDoctor');if(!sel)return;
    sel.innerHTML='<option value="">— Select doctor —</option>';
    staffList.forEach(function(s){
      var o=document.createElement('option');
      o.value=s.full_name;
      o.textContent=s.full_name+' ('+s.department+')';
      sel.appendChild(o);
    });
  }catch(e){}
}

function calcDaysInHospital(admissionDate){
  if(!admissionDate)return null;
  var ad=new Date(admissionDate);
  var today=new Date();
  var diff=Math.ceil((today-ad)/(1000*60*60*24));
  return Math.max(1,diff);
}

/* ═══ DASHBOARD ═══ */
async function loadDashboard(){
  var loader=document.getElementById('dashLoader');var content=document.getElementById('dashContent');
  loader.style.display='flex';content.style.display='none';
  try{
    var res=await fetch('/api/stats');var raw=await res.text();var data;
    try{data=JSON.parse(raw)}catch(e){loader.innerHTML='<p style="color:#ef4444">Invalid server response</p>';return}
    if(data.error&&data.summary.total===0){loader.innerHTML='<p style="color:#ef4444">'+esc(data.error)+'</p>';return}
    renderDash(data);statsLoaded=true;loader.style.display='none';content.style.display='block';
  }catch(e){loader.innerHTML='<p style="color:#ef4444">'+esc(e.message)+'</p>'}
}

function renderDash(d){
  var s=d.summary;
  document.getElementById('kpiRow').innerHTML=kpi('Total records',s.total,'for all months',0)+kpi('Unique',s.unique_patients,'patients',.08)+kpi('Readmissions',s.readmissions,s.readmission_rate+'%',.16)+kpi('Readmission %',s.readmission_rate+'%','overall',.24);

  var activeMonths=d.byMonth.filter(function(m){return m.total>0});
  var maxM=Math.max.apply(null,activeMonths.map(function(m){return m.total}));
  document.getElementById('monthBars').innerHTML=(activeMonths.length>0?activeMonths:d.byMonth.slice(0,3)).map(function(m){
    var w=maxM>0?(m.total/maxM*100).toFixed(0):'0';
    return '<div class="bar-row"><div class="bar-lbl">'+m.month.substring(0,3)+'</div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%">'+m.total+'</div>'+(m.readmissions>0?'<div class="bar-re" style="width:'+(m.readmissions/maxM*100).toFixed(0)+'%">'+m.readmissions+'</div>':'')+'</div><div class="bar-meta">'+m.rate+'%</div></div>'
  }).join('');

  var maxA=Math.max.apply(null,d.byAge.map(function(a){return a.total}));
  document.getElementById('ageBars').innerHTML=d.byAge.map(function(a){
    var w=maxA>0?(a.total/maxA*100).toFixed(0):'0';
    return '<div class="bar-row"><div class="bar-lbl">'+a.age_group+'</div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%">'+a.total+'</div>'+(a.readmissions>0?'<div class="bar-re" style="width:'+(a.readmissions/maxA*100).toFixed(0)+'%">'+a.readmissions+'</div>':'')+'</div><div class="bar-meta">'+a.rate+'%</div></div>'
  }).join('');

  var depts=d.byDepartment||[];
  var maxD=depts.length>0?Math.max.apply(null,depts.map(function(x){return x.total})):1;
  document.getElementById('deptBars').innerHTML=depts.map(function(x){
    var w=(x.total/maxD*100).toFixed(0);
    return '<div class="bar-row"><div class="bar-lbl" style="width:110px;font-size:.72rem">'+x.department+'</div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%">'+x.total+'</div>'+(x.readmissions>0?'<div class="bar-re" style="width:'+(x.readmissions/maxD*100).toFixed(0)+'%">'+x.readmissions+'</div>':'')+'</div><div class="bar-meta">'+x.rate+'%</div></div>'
  }).join('');

  var tb=document.querySelector('#diagTbl tbody');
  tb.innerHTML=(d.byDiagnosis||[]).map(function(x){
    var c=parseFloat(x.rate)>30?'#dc2626':parseFloat(x.rate)>15?'#d97706':'#059669';
    return '<tr><td>'+esc(x.diagnosis)+'</td><td class="icd-code">'+x.icd+'</td><td><span class="tag tag-dept">'+(x.department||'—')+'</span></td><td>'+x.total+'</td><td>'+x.readmissions+'</td><td style="color:'+c+';font-weight:600">'+x.rate+'%</td><td>'+x.avg_days+'</td></tr>'
  }).join('');
}

function kpi(l,v,s,d){return'<div class="kpi" style="animation-delay:'+d+'s"><div class="kpi-label">'+l+'</div><div class="kpi-val">'+v+'</div>'+(s?'<div class="kpi-sub">'+s+'</div>':'')+'</div>'}

/* ═══ PATIENTS ═══ */
async function loadPatients(){
  var p=new URLSearchParams();
  var fd=document.getElementById('fDiag').value.trim();var fi=document.getElementById('fIcd').value.trim();
  var fa=document.getElementById('fAge').value;var fg=document.getElementById('fGender').value;
  var fm=document.getElementById('fMonth').value;var fr=document.getElementById('fReadmit').value;
  var fn=document.getElementById('fIin').value.trim();var fdp=document.getElementById('fDept').value;
  if(fd)p.set('search',fd);if(fi)p.set('icd_code',fi);if(fa)p.set('age_group',fa);
  if(fg)p.set('gender',fg);if(fm)p.set('month',fm);if(fr)p.set('is_readmission',fr);
  if(fn)p.set('iin',fn);if(fdp)p.set('department',fdp);
  p.set('page',curPage);p.set('pageSize',30);p.set('sort_by',sortCol);p.set('sort_dir',sortDir);
  try{
    var res=await fetch('/api/patients?'+p.toString());var raw=await res.text();var data;
    try{data=JSON.parse(raw)}catch(e){document.getElementById('patientsBody').innerHTML='<tr><td colspan="12" style="text-align:center;color:#ef4444;padding:30px">Invalid response</td></tr>';return}
    renderPatients(data);
  }catch(e){document.getElementById('patientsBody').innerHTML='<tr><td colspan="12" style="text-align:center;color:#ef4444;padding:30px">'+esc(e.message)+'</td></tr>'}
}

function renderPatients(data){
  document.getElementById('resultCount').textContent='Found: '+(data.count||0);
  var tb=document.getElementById('patientsBody');
  if(!data.data||!data.data.length){tb.innerHTML='<tr><td colspan="12" style="text-align:center;color:#9ca3af;padding:40px">Not found</td></tr>';document.getElementById('pager').innerHTML='';return}
  tb.innerHTML=data.data.map(function(p){
    return '<tr onclick="openPatientDetail('+p.id+')"'+(p.is_cured?' style="opacity:.55"':'')+'><td><strong>'+esc(p.patient_name)+'</strong></td><td class="icd-code">'+esc(p.iin)+'</td><td>'+p.age+'</td><td>'+esc(p.age_group)+'</td><td>'+esc(p.gender)+'</td><td>'+esc(p.diagnosis)+'</td><td class="icd-code">'+esc(p.icd_code)+'</td><td><span class="tag tag-dept">'+esc(p.department||'—')+'</span></td><td>'+p.hospitalization_days+'</td><td>'+esc(p.month)+'</td><td>'+(p.is_cured?'<span class="tag" style="background:#dbeafe;color:#2563eb">Cured</span>':p.is_readmission?'<span class="tag tag-re">Readmission</span>':'<span class="tag tag-ok">In treatment</span>')+'</td><td style="white-space:nowrap">'+(!p.is_cured?'<button class="btn-del-sm" onclick="event.stopPropagation();curePatient('+p.id+')" title="Cured" style="border-color:#93c5fd;color:#2563eb;margin-right:3px">✓</button>':'')+'<button class="btn-del-sm" onclick="event.stopPropagation();deletePatient('+p.id+')" title="Delete">✕</button></td></tr>'
  }).join('');
  var total=Math.ceil((data.count||0)/(data.pageSize||30));var pg=document.getElementById('pager');
  if(total<=1){pg.innerHTML='';return}
  var html='';if(curPage>0)html+='<button onclick="goPage('+(curPage-1)+')">←</button>';
  for(var i=0;i<total;i++){if(total>7&&i>1&&i<total-2&&Math.abs(i-curPage)>1){if(i===2||i===total-3)html+='<button disabled>…</button>';continue}html+='<button class="'+(i===curPage?'cur':'')+'" onclick="goPage('+i+')">'+(i+1)+'</button>'}
  if(curPage<total-1)html+='<button onclick="goPage('+(curPage+1)+')">→</button>';pg.innerHTML=html
}

function goPage(n){curPage=n;loadPatients()}
function sortBy(col){if(sortCol===col)sortDir=sortDir==='asc'?'desc':'asc';else{sortCol=col;sortDir='asc'}curPage=0;loadPatients()}
function debounceFilter(){clearTimeout(filterTimer);filterTimer=setTimeout(function(){curPage=0;loadPatients()},350)}
function applyFilters(){curPage=0;loadPatients()}
function resetFilters(){['fDiag','fIcd','fIin'].forEach(function(id){document.getElementById(id).value=''});['fAge','fGender','fMonth','fReadmit','fDept'].forEach(function(id){document.getElementById(id).value=''});curPage=0;loadPatients()}

/* ═══ PATIENT DETAIL SIDE PANEL ═══ */
async function openPatientDetail(id){
  var panel=document.getElementById('sidePanel');
  var body=document.getElementById('spBody');
  body.innerHTML='<div class="dash-loader" style="padding:40px"><div class="loader-ring"></div></div>';
  panel.classList.add('open');
  try{
    var res=await fetch('/api/patients?id='+id);var d=await res.json();var p=d.data;
    if(!p){body.innerHTML='<p>Patient not found</p>';return}
    document.getElementById('spTitle').textContent=p.patient_name;

    var notesRes=await fetch('/api/notes?patient_id='+id);var nd=await notesRes.json();
    var note=(nd.data&&nd.data[0])||{};

    var liveDays=calcDaysInHospital(p.admission_date);
    var liveDaysHtml=liveDays?'<span style="color:#7c3aed;font-weight:700;font-size:1.1rem">'+liveDays+' days</span> <span style="font-size:.78rem;color:#6b7280">(from '+p.admission_date+')</span>':'—';

    var doctorOpts='<option value="">— Select —</option>';
    staffList.forEach(function(s){
      var sel=(p.attending_doctor===s.full_name||(note.attending_doctor||'')=== s.full_name)?' selected':'';
      doctorOpts+='<option value="'+esc(s.full_name)+'"'+sel+'>'+esc(s.full_name)+' ('+esc(s.department)+')</option>';
    });
    var curDoc=p.attending_doctor||note.attending_doctor||'';
    if(curDoc&&!staffList.find(function(s){return s.full_name===curDoc})){
      doctorOpts+='<option value="'+esc(curDoc)+'" selected>'+esc(curDoc)+'</option>';
    }

    body.innerHTML=
      '<div class="sp-section">Main information</div>'+
      row('IIN',p.iin)+row('Age',p.age+' years ('+p.age_group+')')+row('Gender',p.gender)+
      row('Admission date',p.admission_date||'—')+row('Month',p.month)+
      '<div class="sp-section">Currently in hospital</div>'+
      '<div class="sp-row"><div class="sp-label">Days in hospital</div><div class="sp-val">'+liveDaysHtml+'</div></div>'+
      row('Planned duration',p.hospitalization_days+' days')+
      (liveDays&&liveDays>p.hospitalization_days?'<div style="background:#fef2f2;color:#dc2626;padding:8px 12px;border-radius:8px;font-size:.8rem;margin:6px 0">⚠ Patient exceeded planned duration by '+(liveDays-p.hospitalization_days)+' days</div>':'')+
      '<div class="sp-section">Medical data</div>'+
      row('Diagnosis',p.diagnosis)+row('ICD-10 code','<span class="icd-code">'+esc(p.icd_code)+'</span>')+
      row('Department','<span class="tag tag-dept">'+esc(p.department||'—')+'</span>')+
      row('Comorbidity',p.comorbidity||'—')+
      row('Status',p.is_cured?'<span class="tag" style="background:#dbeafe;color:#2563eb">Cured</span>':p.is_readmission?'<span class="tag tag-re">Readmission</span>':'<span class="tag tag-ok">In treatment</span>')+
      '<div class="sp-section">Additional medical data</div>'+
      row('Previous operations',p.previous_operations||'None')+
      row('Drug allergies','<span style="color:'+(p.drug_allergies&&p.drug_allergies!=='None'?'#dc2626':'inherit')+'">'+esc(p.drug_allergies||'None')+'</span>')+
      row('Contraindications','<span style="color:'+(p.contraindications&&p.contraindications!=='None'?'#d97706':'inherit')+'">'+esc(p.contraindications||'None')+'</span>')+
      row('Contact',p.phone||'—')+
      '<div class="sp-section">Medical staff</div>'+
      '<div class="fg" style="margin-bottom:8px"><label>Attending doctor</label><select id="spDoctor" style="width:100%;padding:8px 11px;border:1px solid #e5e7eb;border-radius:8px;font:.86rem var(--font);outline:none">'+doctorOpts+'</select></div>'+
      '<div class="fg" style="margin-bottom:8px"><label>Caretaker</label><input id="spCaretaker" value="'+esc(note.caretaker||'')+'" placeholder="Nurse Petrova"></div>'+
      '<div class="fg" style="margin-bottom:12px"><label>Notes</label><textarea id="spNotes" placeholder="Additional notes...">'+(esc(note.notes||''))+'</textarea></div>'+
      '<button class="btn-primary" onclick="savePatientNotes('+id+')" style="width:100%">Save</button>'+
      (!p.is_cured?'<button class="btn-ghost" onclick="curePatient('+id+')" style="width:100%;margin-top:8px;color:#2563eb;border-color:#93c5fd">✓ Mark as cured</button>':'<div style="text-align:center;margin-top:10px;font-size:.82rem;color:#2563eb;font-weight:500">✓ Patient cured</div>');
  }catch(e){body.innerHTML='<p style="color:#ef4444">'+esc(e.message)+'</p>'}
}

function row(l,v){return'<div class="sp-row"><div class="sp-label">'+l+'</div><div class="sp-val">'+v+'</div></div>'}

function closeSidePanel(){document.getElementById('sidePanel').classList.remove('open')}

async function curePatient(id){
  if(!confirm('Mark patient as cured?'))return;
  try{
    var res=await fetch('/api/patients?id='+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({is_cured:true})});
    var d=await res.json();
    if(d.error){alert(d.error);return}
    closeSidePanel();statsLoaded=false;loadPatients();
  }catch(e){alert(e.message)}
}

async function savePatientNotes(pid){
  try{
    var res=await fetch('/api/notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      patient_id:pid,
      attending_doctor:document.getElementById('spDoctor').value.trim(),
      caretaker:document.getElementById('spCaretaker').value.trim(),
      notes:document.getElementById('spNotes').value.trim()
    })});
    var d=await res.json();
    if(d.error)alert(d.error);else alert('Saved');
  }catch(e){alert(e.message)}
}

/* ═══ ADD PATIENT MODAL ═══ */
function openAddModal(){document.getElementById('addOverlay').classList.add('open')}
function closeAddModal(e){if(e&&e.target!==e.currentTarget)return;document.getElementById('addOverlay').classList.remove('open')}
function setToggle(el){el.parentNode.querySelectorAll('.toggle-opt').forEach(function(b){b.classList.remove('active')});el.classList.add('active');addReadmit=el.dataset.val==='true'}

async function submitPatient(){
  var body={
    patient_name:document.getElementById('aName').value.trim(),
    iin:document.getElementById('aIin').value.trim(),
    age:parseInt(document.getElementById('aAge').value)||0,
    age_group:document.getElementById('aGroup').value,
    gender:document.getElementById('aGender').value,
    diagnosis:document.getElementById('aDiag').value.trim(),
    icd_code:document.getElementById('aIcd').value.trim(),
    hospitalization_days:parseInt(document.getElementById('aDays').value)||1,
    comorbidity:document.getElementById('aComorbid').value.trim()||null,
    month:document.getElementById('aMonth').value,
    department:document.getElementById('aDept').value,
    admission_date:document.getElementById('aDate').value||null,
    attending_doctor:document.getElementById('aDoctor').value.trim()||null,
    is_readmission:addReadmit,
    previous_operations:document.getElementById('aPrevOps').value||'None',
    drug_allergies:document.getElementById('aAllergy').value.trim()||'None',
    contraindications:document.getElementById('aContra').value.trim()||'None',
    phone:document.getElementById('aPhone').value.trim()||null
  };
  if(!body.patient_name||!body.iin||!body.diagnosis||!body.icd_code){alert('Fill required fields');return}
  var btn=document.getElementById('submitBtn');btn.disabled=true;btn.textContent='Adding...';
  try{
    var res=await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    var raw=await res.text();var data;
    try{data=JSON.parse(raw)}catch(e){alert('Invalid response');btn.disabled=false;btn.textContent='Add';return}
    if(data.error){alert(data.error);btn.disabled=false;btn.textContent='Add';return}
    closeAddModal();statsLoaded=false;loadPatients();
    ['aName','aIin','aAge','aDiag','aIcd','aDays','aComorbid','aAllergy','aContra','aPhone'].forEach(function(id){document.getElementById(id).value=''});
  }catch(e){alert(e.message)}
  btn.disabled=false;btn.textContent='Add'
}

async function deletePatient(id){
  if(!confirm('Delete?'))return;
  try{var res=await fetch('/api/patients?id='+id,{method:'DELETE'});var d=await res.json();if(d.error)alert(d.error);statsLoaded=false;loadPatients()}catch(e){alert(e.message)}
}

/* ═══ DATE → MONTH SYNC ═══ */
var dateEl=document.getElementById('aDate');
if(dateEl){dateEl.addEventListener('change',function(){
  var v=this.value;if(!v)return;
  var m=parseInt(v.split('-')[1]);
  var months=['','January','February','March','April','May','June','July','August','September','October','November','December'];
  if(months[m])document.getElementById('aMonth').value=months[m];
})}

/* ═══ VOICE RECORDING (Whisper) ═══ */
var mediaRecorder=null, audioChunks=[], isRecording=false;

async function toggleRecording(){
  if(isRecording){stopRecording();return}
  var btn=document.getElementById('micBtn');
  try{
    var stream=await navigator.mediaDevices.getUserMedia({audio:true});
    // Pick best supported format
    var mimeType='audio/webm';
    if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))mimeType='audio/webm;codecs=opus';
    else if(MediaRecorder.isTypeSupported('audio/ogg;codecs=opus'))mimeType='audio/ogg;codecs=opus';
    else if(MediaRecorder.isTypeSupported('audio/mp4'))mimeType='audio/mp4';

    audioChunks=[];
    mediaRecorder=new MediaRecorder(stream,{mimeType:mimeType});
    mediaRecorder.ondataavailable=function(e){if(e.data.size>0)audioChunks.push(e.data)};
    mediaRecorder.onstop=function(){
      stream.getTracks().forEach(function(t){t.stop()});
      var blob=new Blob(audioChunks,{type:mimeType});
      transcribeAudio(blob,mimeType);
    };
    mediaRecorder.start();
    isRecording=true;
    btn.classList.add('recording');
    btn.title='Stop recording';
  }catch(e){
    alert('Could not access microphone: '+e.message);
  }
}

function stopRecording(){
  if(mediaRecorder&&mediaRecorder.state!=='inactive'){
    mediaRecorder.stop();
  }
  isRecording=false;
  var btn=document.getElementById('micBtn');
  btn.classList.remove('recording');
  btn.title='Voice input';
}

async function transcribeAudio(blob,mimeType){
  var btn=document.getElementById('micBtn');
  btn.classList.add('transcribing');
  btn.title='Transcribing...';
  try{
    var resp=await fetch('/api/whisper',{
      method:'POST',
      headers:{'Content-Type':'application/octet-stream','X-Audio-Type':mimeType},
      body:blob
    });
    var raw=await resp.text();
    var data;
    try{data=JSON.parse(raw)}catch(e){alert('Recognition error');btn.classList.remove('transcribing');return}
    if(data.error){alert('Whisper: '+data.error);btn.classList.remove('transcribing');return}
    if(data.text){
      var inp=document.getElementById('chatInput');
      // Append to existing text if any
      var existing=inp.value.trim();
      inp.value=existing?(existing+' '+data.text):data.text;
      inp.focus();
      autoGrow(inp);
    }
  }catch(e){
    alert('Error: '+e.message);
  }
  btn.classList.remove('transcribing');
  btn.title='Voice input';
}
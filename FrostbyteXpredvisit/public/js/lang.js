var LANG = (function(){
  var cur = localStorage.getItem('pv_lang') || 'en';
  var T = {
    en: {
      brand:'PredVisit', brandSub:'Medical Assistant',
      navChat:'AI Chat', navAnalytics:'Analytics', navPatients:'Patients',
      navOperations:'Operations', navStaff:'Medical Staff', navGroupChat:'Group Chat',
      navChatHistory:'Chat History',
      chatTitle:'AI Chat', modeDb:'Database', modeMed:'Medical', modeDraft:'Draft',
      analyticsTitle:'Hospitalization Analytics',
      byMonth:'By Month', byAge:'By Age Group', byDept:'By Department', topDiag:'Top Diagnoses',
      patientsTitle:'Patients', addPatient:'Add Patient',
      fDiag:'Diagnosis', fIcd:'ICD-10', fDept:'Department', fGroup:'Age Group',
      fGender:'Gender', fMonth:'Month', fReadmit:'Readmit', fIin:'IIN',
      fAll:'All', fMale:'Male', fFemale:'Female', fRepeat:'Readmitted', fPrimary:'Primary',
      reset:'Reset', found:'Found', records:'records',
      newPatient:'New Patient', name:'Name', age:'Age', group:'Group', gender:'Gender',
      admDate:'Admission Date', month:'Month', dept:'Department', hospDays:'Hospital Days',
      comorbidity:'Comorbidity', prevOps:'Previous Operations', allergies:'Drug Allergies',
      contra:'Contraindications', phone:'Phone', doctor:'Attending Doctor', readmitQ:'Readmission',
      yes:'Yes', no:'No', cancel:'Cancel', add:'Add', save:'Save',
      disclaimer:'Responses are based on patient database',
      disclaimerMed:'⚠ May be inaccurate, does not replace medical consultation',
      disclaimerDraft:'✏ Draft mode — messages are NOT saved',
      inputPh:'Ask a question...',
      settings:'Settings', language:'Language', aboutUs:'About Us',
      aboutText:'PredVisit is a medical data management system with integrated AI.',
      logout:'Logout', sysActive:'System active',
      chipRepeats:'📈 Readmissions', chipPneumonia:'🫁 Pneumonia',
      chipDuration:'⏱ Duration', chipDepts:'🏥 Departments',
      loading:'Loading...',
    },
    ru: {
      brand:'PredVisit', brandSub:'Ассистент врача',
      navChat:'ИИ Чат', navAnalytics:'Аналитика', navPatients:'Пациенты',
      navOperations:'Операции', navStaff:'Мед персонал', navGroupChat:'Общий чат',
      navChatHistory:'История чатов',
      chatTitle:'ИИ Чат', modeDb:'База данных', modeMed:'Медик', modeDraft:'Черновик',
      analyticsTitle:'Аналитика госпитализаций',
      byMonth:'По месяцам', byAge:'По возрастным группам', byDept:'По отделениям', topDiag:'Топ диагнозы',
      patientsTitle:'Пациенты', addPatient:'Добавить',
      fDiag:'Диагноз', fIcd:'МКБ-10', fDept:'Отделение', fGroup:'Группа',
      fGender:'Пол', fMonth:'Месяц', fReadmit:'Повтор', fIin:'ИИН',
      fAll:'Все', fMale:'Муж', fFemale:'Жен', fRepeat:'Повторные', fPrimary:'Первичные',
      reset:'Сбросить', found:'Найдено', records:'записей',
      newPatient:'Новый пациент', name:'Имя', age:'Возраст', group:'Группа', gender:'Пол',
      admDate:'Дата госпитализации', month:'Месяц', dept:'Отделение', hospDays:'Дни госпитализации',
      comorbidity:'Коморбидность', prevOps:'Предыдущие операции', allergies:'Аллергии на препараты',
      contra:'Противопоказания', phone:'Телефон', doctor:'Лечащий врач', readmitQ:'Повторная',
      yes:'Да', no:'Нет', cancel:'Отмена', add:'Добавить', save:'Сохранить',
      disclaimer:'Ответы основаны на данных из базы пациентов',
      disclaimerMed:'⚠ Информация может быть неточной и не заменяет консультацию врача',
      disclaimerDraft:'✏ Режим черновика — сообщения НЕ сохраняются',
      inputPh:'Задайте вопрос...',
      settings:'Настройки', language:'Язык', aboutUs:'О нас',
      aboutText:'PredVisit — система управления медицинскими данными с интегрированным ИИ.',
      logout:'Выйти', sysActive:'Система активна',
      chipRepeats:'📈 Повторы', chipPneumonia:'🫁 Пневмония',
      chipDuration:'⏱ Длительность', chipDepts:'🏥 Отделения',
      loading:'Загрузка...',
    },
    kz: {
      brand:'PredVisit', brandSub:'Дәрігер көмекшісі',
      navChat:'AI Чат', navAnalytics:'Аналитика', navPatients:'Пациенттер',
      navOperations:'Операциялар', navStaff:'Мед персонал', navGroupChat:'Жалпы чат',
      navChatHistory:'Чат тарихы',
      chatTitle:'AI Чат', modeDb:'Деректер базасы', modeMed:'Медик', modeDraft:'Жоба',
      analyticsTitle:'Госпитализация аналитикасы',
      byMonth:'Айлар бойынша', byAge:'Жас тобы бойынша', byDept:'Бөлімдер бойынша', topDiag:'Топ диагноздар',
      patientsTitle:'Пациенттер', addPatient:'Қосу',
      fDiag:'Диагноз', fIcd:'МКБ-10', fDept:'Бөлім', fGroup:'Тобы', fGender:'Жынысы',
      fMonth:'Ай', fReadmit:'Қайта', fIin:'ЖСН',
      fAll:'Барлығы', fMale:'Ер', fFemale:'Әйел', fRepeat:'Қайта', fPrimary:'Бастапқы',
      reset:'Тазалау', found:'Табылды', records:'жазба',
      newPatient:'Жаңа пациент', name:'Аты', age:'Жасы', group:'Тобы', gender:'Жынысы',
      cancel:'Бас тарту', add:'Қосу', save:'Сақтау',
      disclaimer:'Жауаптар пациенттер базасына негізделген',
      inputPh:'Сұрақ қойыңыз...',
      settings:'Баптаулар', language:'Тіл', aboutUs:'Біз туралы',
      aboutText:'PredVisit — AI интеграциясы бар медициналық деректерді басқару жүйесі.',
      logout:'Шығу', sysActive:'Жүйе белсенді',
      loading:'Жүктелуде...',
    }
  };

  function t(k){ return (T[cur]&&T[cur][k]) || (T.en&&T.en[k]) || k; }
  function setLang(l){ cur=l; localStorage.setItem('pv_lang',l); }
  function getLang(){ return cur; }

  // Apply translations to all elements with data-i18n attribute
  function applyToDOM(){
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key=el.getAttribute('data-i18n');
      var val=t(key);
      if(val){
        if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){el.placeholder=val}
        else if(el.tagName==='OPTION'&&el.value===''){el.textContent=val}
        else{el.textContent=val}
      }
    });
    // Update brand sub
    document.querySelectorAll('.brand-sub').forEach(function(el){el.textContent=t('brandSub')});
  }

  return { t:t, setLang:setLang, getLang:getLang, applyToDOM:applyToDOM };
})();
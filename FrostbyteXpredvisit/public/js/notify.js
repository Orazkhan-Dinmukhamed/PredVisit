(function(){
  var _notifySb=null, _notifyEmail='';

  async function initNotify(){
    try{
      var user=await AUTH.getUser();
      if(!user)return;
      _notifyEmail=user.email||'';
      var cfg=window.MEDAI_CONFIG;
      if(!cfg||!cfg.SUPABASE_ANON_KEY)return;
      _notifySb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);

      _notifySb.channel('gc-notify')
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages'},function(payload){
          var msg=payload.new;
          if(msg.user_email===_notifyEmail)return;
          // Don't show if already on groupchat page
          if(window.location.pathname.includes('groupchat'))return;
          showGcToast(msg.user_name||msg.user_email.split('@')[0],msg.message);
        })
        .subscribe();
    }catch(e){}
  }

  var _toastTimer=null;
  function showGcToast(name,text){
    var c=document.getElementById('gcToastBox');
    if(!c){c=document.createElement('div');c.id='gcToastBox';c.style.cssText='position:fixed;top:16px;right:16px;z-index:9999';document.body.appendChild(c)}
    var old=c.querySelector('.gc-toast');
    if(old)old.remove();
    clearTimeout(_toastTimer);
    var t=document.createElement('div');
    t.className='gc-toast';
    t.style.cssText='background:#fff;border:1px solid #e5e7eb;border-left:3px solid #8b5cf6;border-radius:10px;padding:10px 16px;box-shadow:0 8px 24px rgba(0,0,0,.1);max-width:300px;cursor:pointer;animation:gcToastIn .3s ease;font-family:DM Sans,system-ui,sans-serif';
    t.innerHTML='<div style="font-weight:600;color:#7c3aed;font-size:.78rem">💬 '+esc(name)+'</div><div style="color:#374151;font-size:.82rem;margin-top:2px">'+esc(text.substring(0,80))+(text.length>80?'...':'')+'</div>';
    t.onclick=function(){window.location.href='/groupchat.html'};
    c.appendChild(t);
    // Add animation keyframes if not present
    if(!document.getElementById('gcToastStyle')){
      var s=document.createElement('style');s.id='gcToastStyle';
      s.textContent='@keyframes gcToastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}';
      document.head.appendChild(s);
    }
    _toastTimer=setTimeout(function(){t.style.transition='opacity .3s,transform .3s';t.style.opacity='0';t.style.transform='translateX(40px)';setTimeout(function(){t.remove()},300)},2000);
  }

  function esc(s){if(!s)return'';var d=document.createElement('div');d.textContent=s;return d.innerHTML}

  // Wait for Supabase SDK and AUTH to load
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){setTimeout(initNotify,500)})}
  else{setTimeout(initNotify,500)}
})();
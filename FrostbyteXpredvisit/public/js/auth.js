var AUTH = (function() {
  var sb = null;

  function init() {
    if (sb) return sb;
    var cfg = window.MEDAI_CONFIG;
    if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.length < 20) {
      console.warn('AUTH: config.js не загружен или ключ пустой');
      return null;
    }
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      console.warn('AUTH: Supabase JS SDK не загружен (CDN)');
      return null;
    }
    try {
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    } catch (e) {
      console.error('AUTH: Ошибка создания клиента:', e);
      return null;
    }
    return sb;
  }

  async function getSession() {
    var client = init();
    if (!client) return null;
    try {
      var res = await client.auth.getSession();
      return res.data.session;
    } catch (e) { return null; }
  }

  async function getUser() {
    var session = await getSession();
    return session ? session.user : null;
  }

  async function getToken() {
    var session = await getSession();
    return session ? session.access_token : null;
  }

  // Register: email + password → sends OTP to email
  async function signUp(email, password) {
    var client = init();
    if (!client) throw new Error('Supabase не настроен');
    var res = await client.auth.signUp({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data;
  }

  // Login: email + password → immediate session
  async function signIn(email, password) {
    var client = init();
    if (!client) throw new Error('Supabase не настроен');
    var res = await client.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data;
  }

  // Verify OTP after signUp
  async function verifyOtp(email, token) {
    var client = init();
    if (!client) throw new Error('Supabase не настроен');
    var res = await client.auth.verifyOtp({ email: email, token: token, type: 'signup' });
    if (res.error) throw res.error;
    return res.data;
  }

  async function logout() {
    var client = init();
    if (client) await client.auth.signOut();
    window.location.href = '/login.html';
  }

  async function requireAuth() {
    var user = await getUser();
    if (!user) {
      window.location.href = '/login.html';
      return null;
    }
    return user;
  }

  return {
    init: init, getSession: getSession, getUser: getUser, getToken: getToken,
    signUp: signUp, signIn: signIn, verifyOtp: verifyOtp,
    logout: logout, requireAuth: requireAuth
  };
})();
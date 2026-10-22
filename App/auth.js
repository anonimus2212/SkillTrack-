// =====================================================
// SKILLTRACK - Auth Module
// =====================================================

const Auth = (() => {
  let _currentUser = null;
  let _currentProfile = null;

  async function getSession() {
    const { data: { session } } = await db.auth.getSession();
    return session;
  }

  async function getUser() {
    if (_currentUser) return _currentUser;
    const { data: { user } } = await db.auth.getUser();
    _currentUser = user;
    return user;
  }

  async function getProfile() {
    if (_currentProfile) return _currentProfile;
    const user = await getUser();
    if (!user) return null;
    const { data } = await db.from('perfiles').select('*').eq('id', user.id).single();
    _currentProfile = data;
    return data;
  }

  function clearCache() {
    _currentUser = null;
    _currentProfile = null;
  }

  async function register(nombre, email, password) {
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { data: { nombre } }
    });
    if (error) throw error;
    return data;
  }

  async function login(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    clearCache();
    return data;
  }

  async function logout() {
    clearCache();
    const { error } = await db.auth.signOut();
    if (error) throw error;
  }

  async function sendPasswordReset(email) {
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/index.html'
    });
    if (error) throw error;
  }

  function onAuthStateChange(callback) {
    return db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') clearCache();
      callback(event, session);
    });
  }

  return { getSession, getUser, getProfile, register, login, logout, sendPasswordReset, onAuthStateChange, clearCache };
})();

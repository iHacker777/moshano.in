(function(){
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Theme toggle: respects prefers-color-scheme by default, toggles a data-theme attr for custom control
  const toggle = document.getElementById('themeToggle');
  const root = document.documentElement;
  const THEME_KEY = 'moshano_theme';

  function applyTheme(theme){
    if(theme === 'light'){
      root.setAttribute('data-theme', 'light');
      toggle.textContent = '☾';
    } else if(theme === 'dark'){
      root.setAttribute('data-theme', 'dark');
      toggle.textContent = '☀︎';
    } else {
      root.removeAttribute('data-theme');
      toggle.textContent = '☀︎';
    }
  }

  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved);

  toggle && toggle.addEventListener('click', function(e){
    e.preventDefault();
    const current = localStorage.getItem(THEME_KEY);
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next || 'dark');
    applyTheme(next);
  });
})();
// Contact form wiring (Formspree AJAX)
(function(){
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = document.getElementById('contactSubmit');
  const ok = document.getElementById('contactSuccess');
  const err = document.getElementById('contactError');

  function getFormspreeId(){
    const dataId = form.getAttribute('data-formspree-id');
    if (dataId && dataId !== 'REPLACE_FORMSPREE_ID') return dataId;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('fsid');
    return fromQuery || null;
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    if (ok) ok.style.display = 'none';
    if (err) err.style.display = 'none';

    const fsid = getFormspreeId();
    if (!fsid) {
      if (err) { err.textContent = 'Form not configured: add your Formspree ID.'; err.style.display = 'block'; }
      return;
    }
    const endpoint = `https://formspree.io/f/${fsid}`;
    const data = new FormData(form);
    data.append('_subject', 'New inquiry — moshano.in');
    data.append('_origin', window.location.href);

    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Accept': 'application/json' }, body: data });
      if (res.ok) {
        if (ok) ok.style.display = 'block';
        form.reset();
      } else {
        const j = await res.json().catch(() => null);
        if (err) {
          err.textContent = (j && j.errors && j.errors[0] && j.errors[0].message) || 'Submission failed.';
          err.style.display = 'block';
        }
      }
    } catch (e2) {
      if (err) { err.textContent = 'Network error. Please try again.'; err.style.display = 'block'; }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();

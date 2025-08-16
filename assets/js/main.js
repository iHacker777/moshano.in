(function(){
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Theme toggle
  const root = document.documentElement;       // <html>
  const toggle = document.getElementById('themeToggle');
  const KEY = 'moshano_theme';                 // 'light' | 'dark' | null

  function applyTheme(theme){
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      if (toggle) toggle.textContent = '☾';
    } else if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      if (toggle) toggle.textContent = '☀︎';
    } else {
      // follow system preference
      root.removeAttribute('data-theme');
      if (toggle) toggle.textContent = '☀︎';
    }
  }

  // Initialize from saved value (or follow system)
  const saved = localStorage.getItem(KEY);     // 'light' | 'dark' | null
  applyTheme(saved);

  if (toggle) {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const current = localStorage.getItem(KEY);         // may be null
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(KEY, next);
      applyTheme(next);
    });
  }
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

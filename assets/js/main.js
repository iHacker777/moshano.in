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

// Marca activo en navbar según archivo actual
function setActiveNav() {
  const path = (location.pathname.split('/').pop() || 'online.html').toLowerCase();
  document.querySelectorAll<HTMLAnchorElement>('.nav-menu a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    a.classList.toggle('active', href.endsWith(path));
    a.addEventListener('click', () => {
      document.querySelectorAll('.nav-menu a').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
    });
  });
}

// Año dinámico en footer
function setFooterYear() {
  const el = document.getElementById('ft-year');
  if (el) el.textContent = String(new Date().getFullYear());
}

export function initCommonUI() {
  setActiveNav();
  setFooterYear();
}

// Importa CSS global para que Vite lo procese
import './styles/main.css';

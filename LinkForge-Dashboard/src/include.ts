import { initCommonUI } from './main';

async function inject(id: string, url: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const res = await fetch(url);
  el.innerHTML = await res.text();
}

document.addEventListener('DOMContentLoaded', async () => {
  // Los parciales viven en /public/partials → se sirven como /partials/...
  await Promise.all([
    inject('app-nav', '/partials/nav.html'),
    inject('app-footer', '/partials/footer.html')
  ]);
  initCommonUI();
});

// /src/devices.ts

// --- helpers ---
const PAGE_SIZE = 50;

function fmtDate(v: any) {
  if (!v) return '';
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

// --- estado ---
let devicesData: Array<{
  id: number;
  device_id?: string | number | null;
  device_category?: string | null;
  device_name?: string | null;
  client_id?: string | number | null;
  location?: string | null;
  area?: string | null;
  subarea?: string | null;
  received_at?: string | null;
  version?: string | null;
  event_timestamp?: string | null;
}> = [];

let currentPage = 1;

// --- render ---
function totalPages() {
  return Math.max(1, Math.ceil(devicesData.length / PAGE_SIZE));
}

function renderTable() {
  const tbody = document.querySelector<HTMLTableSectionElement>('#tbl-devices tbody');
  if (!tbody) return;

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, devicesData.length);
  const slice = devicesData.slice(start, end);

  if (slice.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12">Sin datos.</td></tr>`;
    const info = document.getElementById('dev-pager-info');
    if (info) info.textContent = `Mostrando 0–0 de 0`;
    return;
  }

  tbody.innerHTML = slice.map(r => `
    <tr>
      <td>${r.id ?? ''}</td>
      <td>${r.device_id ?? ''}</td>
      <td>${r.device_category ?? ''}</td>
      <td>${r.device_name ?? ''}</td>
      <td>${r.client_id ?? ''}</td>
      <td>${r.location ?? ''}</td>
      <td>${r.area ?? ''}</td>
      <td>${r.subarea ?? ''}</td>
      <td>${fmtDate(r.received_at)}</td>
      <td>${r.version ?? ''}</td>
      <td>${fmtDate(r.event_timestamp)}</td>
      <td class="col-actions"><button class="btn btn-view" data-id="${r.id}">Ver</button></td>
    </tr>
  `).join('');

  // Botones "Ver" (placeholder)
  tbody.querySelectorAll<HTMLButtonElement>('.btn-view').forEach(btn => {
    btn.addEventListener('click', () => {
      // Placeholder: sin acción todavía
      // console.log('Ver device id:', btn.dataset.id);
    });
  });

  const info = document.getElementById('dev-pager-info');
  if (info) info.textContent = `Mostrando ${start + 1}–${end} de ${devicesData.length}`;
}

function renderPager() {
  const pagesWrap = document.getElementById('dev-pager-pages');
  if (!pagesWrap) return;

  pagesWrap.innerHTML = '';
  const tp = totalPages();

  for (let i = 1; i <= tp; i++) {
    const b = document.createElement('button');
    b.className = 'btn btn-page' + (i === currentPage ? ' is-active' : '');
    b.textContent = String(i);
    b.setAttribute('aria-label', 'Página ' + i);
    if (i === currentPage) b.setAttribute('aria-current', 'page');
    b.addEventListener('click', () => {
      currentPage = i;
      renderTable();
      renderPager();
    });
    pagesWrap.appendChild(b);
  }
}

function wirePagerNav() {
  const q = (a: string) => document.querySelector<HTMLButtonElement>('.pager [data-action="' + a + '"]');
  q('first')?.addEventListener('click', () => {
    currentPage = 1;
    renderTable();
    renderPager();
  });
  q('prev')?.addEventListener('click', () => {
    currentPage = Math.max(1, currentPage - 1);
    renderTable();
    renderPager();
  });
  q('next')?.addEventListener('click', () => {
    currentPage = Math.min(totalPages(), currentPage + 1);
    renderTable();
    renderPager();
  });
  q('last')?.addEventListener('click', () => {
    currentPage = totalPages();
    renderTable();
    renderPager();
  });
}

// --- init ---
async function loadDevices() {
  try {
    const res = await fetch('/api/devices-list');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    devicesData = await res.json();
  } catch (err) {
    console.error('Error cargando devices:', err);
    devicesData = [];
  }
  currentPage = 1;
  renderTable();
  renderPager();
}

document.addEventListener('DOMContentLoaded', () => {
  wirePagerNav();
  loadDevices();
});

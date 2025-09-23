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

function qs<T extends Element>(sel: string, root: Document | Element = document) {
  return root.querySelector<T>(sel);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]!));
}

function fmtTimeShort(d: Date) {
  // hh:mm DD/MM
  const hh = d.getHours().toString().padStart(2,'0');
  const mm = d.getMinutes().toString().padStart(2,'0');
  const dd = d.getDate().toString().padStart(2,'0');
  const mo = (d.getMonth()+1).toString().padStart(2,'0');
  return `${hh}:${mm} ${dd}/${mo}`;
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

// --- MODAL preview datapoint ---
const dpModal = {
  root: null as HTMLDivElement | null,
  overlay: null as HTMLDivElement | null,
  btnCloseList: [] as HTMLButtonElement[],
  select: null as HTMLSelectElement | null,
  deviceLabel: null as HTMLSpanElement | null,
  loading: null as HTMLDivElement | null,
  empty: null as HTMLDivElement | null,
  error: null as HTMLDivElement | null,
  chartWrap: null as HTMLDivElement | null,
  chartCanvas: null as HTMLCanvasElement | null,
  chartTitle: null as HTMLSpanElement | null,
  chartUnits: null as HTMLSpanElement | null,
  chartEmpty: null as HTMLDivElement | null,

  currentDeviceId: '' as string,
  currentDeviceName: '' as string,
  datapointsList: [] as string[],
};

function initDpModal() {
  dpModal.root = qs<HTMLDivElement>('#dp-modal')!;
  dpModal.overlay = qs<HTMLDivElement>('#dp-modal .modal-overlay')!;
  dpModal.btnCloseList = Array.from(document.querySelectorAll<HTMLButtonElement>('#dp-modal [data-action="close"]'));
  dpModal.select = qs<HTMLSelectElement>('#dp-select')!;
  dpModal.deviceLabel = qs<HTMLSpanElement>('#dp-device-label')!;
  dpModal.loading = qs<HTMLDivElement>('#dp-loading')!;
  dpModal.empty = qs<HTMLDivElement>('#dp-empty')!;
  dpModal.error = qs<HTMLDivElement>('#dp-error')!;
  dpModal.chartWrap = qs<HTMLDivElement>('#chart-wrap')!;
  dpModal.chartCanvas = qs<HTMLCanvasElement>('#dp-chart')!;
  dpModal.chartTitle = qs<HTMLSpanElement>('#chart-title')!;
  dpModal.chartUnits = qs<HTMLSpanElement>('#chart-units')!;
  dpModal.chartEmpty = qs<HTMLDivElement>('#chart-empty')!;

  // cerrar
  const close = () => closeDpModal();
  dpModal.overlay.addEventListener('click', close);
  dpModal.btnCloseList.forEach(b => b.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (!dpModal.root || dpModal.root.classList.contains('is-hidden')) return;
    if (e.key === 'Escape') closeDpModal();
  });

  // cambio de datapoint => cargar serie y graficar
  dpModal.select.addEventListener('change', () => {
    const name = dpModal.select!.value;
    if (!name) {
      dpModal.chartWrap!.classList.add('is-hidden');
      return;
    }
    loadAndPlotSeries(dpModal.currentDeviceId, name);
  });
}

function openDpModal(deviceId: string, deviceName: string) {
  dpModal.currentDeviceId = deviceId;
  dpModal.currentDeviceName = deviceName || '';
  dpModal.deviceLabel!.textContent = deviceName ? `Device: ${deviceName} (${deviceId})` : `Device: ${deviceId}`;

  // reset UI
  dpModal.select!.innerHTML = '';
  dpModal.chartWrap!.classList.add('is-hidden');
  dpModal.chartEmpty!.classList.add('is-hidden');
  dpModal.chartTitle!.textContent = '—';
  dpModal.chartUnits!.textContent = '';
  showDpState({ loading: true }); // muestra cargando

  // mostrar modal
  dpModal.root!.classList.remove('is-hidden');
  dpModal.root!.setAttribute('aria-hidden', 'false');

  // 1) cargar lista de datapoints
  fetch(`/api/device/${encodeURIComponent(deviceId)}/datapoints`)
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((list: string[]) => {
      if (!Array.isArray(list) || list.length === 0) {
        showDpState({ empty: true });
        return;
      }
      dpModal.datapointsList = list;

      // poblar select
      const frag = document.createDocumentFragment();
      const ph = document.createElement('option');
      ph.value = '';
      ph.textContent = '— Selecciona un datapoint —';
      frag.appendChild(ph);
      list.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        frag.appendChild(opt);
      });
      dpModal.select!.appendChild(frag);

      showDpState({ list: true });

      // 2) auto-seleccionar el primero y graficar
      if (list.length > 0) {
        dpModal.select!.value = list[0];
        loadAndPlotSeries(deviceId, list[0]);
      }
    })
    .catch(err => {
      console.error('Error cargando nombres de datapoints:', err);
      showDpState({ error: true });
    });
}

function closeDpModal() {
  if (!dpModal.root) return;
  dpModal.root.classList.add('is-hidden');
  dpModal.root.setAttribute('aria-hidden', 'true');
}

function showDpState(opts: { loading?: boolean; list?: boolean; empty?: boolean; error?: boolean }) {
  // oculta todo
  dpModal.loading?.classList.add('is-hidden');
  dpModal.select?.classList.add('is-hidden');
  dpModal.empty?.classList.add('is-hidden');
  dpModal.error?.classList.add('is-hidden');

  // muestra lo requerido
  if (opts.loading) dpModal.loading?.classList.remove('is-hidden');
  if (opts.list) dpModal.select?.classList.remove('is-hidden');
  if (opts.empty) dpModal.empty?.classList.remove('is-hidden');
  if (opts.error) dpModal.error?.classList.remove('is-hidden');
}

async function loadAndPlotSeries(deviceId: string, name: string) {
  // mostrar estado
  dpModal.chartWrap!.classList.remove('is-hidden');
  dpModal.chartEmpty!.classList.add('is-hidden');
  dpModal.chartTitle!.textContent = name;
  dpModal.chartUnits!.textContent = '';

  try {
    // Trae últimos N puntos (preview liviano)
    const limit = 300; // ajustable
    const url = `/api/device/${encodeURIComponent(deviceId)}/datapoints/${encodeURIComponent(name)}?order=asc&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const raw = await res.json();

    // filtramos numéricos y armamos pares (x,y)
    type Row = { ts: string; value_num: number | null; units?: string | null };
    const rows: Row[] = Array.isArray(raw) ? raw : [];
    const points = rows
      .filter(r => typeof r.value_num === 'number' && r.value_num !== null)
      .map(r => ({ x: new Date(r.ts), y: (r.value_num as number) }));

    const units = (rows.find(r => r.units)?.units) || '';
    dpModal.chartUnits!.textContent = units ? `(${units})` : '';

    if (points.length < 2) {
      clearCanvas(dpModal.chartCanvas!);
      dpModal.chartEmpty!.classList.remove('is-hidden');
      return;
    }

    // dibujar
    drawSimpleLineChart(dpModal.chartCanvas!, points, {
      yLabel: units,
      strokeWidth: 2,
      grid: true,
      dots: true,
      padding: { top: 16, right: 16, bottom: 28, left: 48 },
      xTickCount: 5,
      yTickCount: 4,
    });
  } catch (err) {
    console.error('Error cargando serie para preview:', err);
    clearCanvas(dpModal.chartCanvas!);
    dpModal.chartEmpty!.classList.remove('is-hidden');
  }
}

// --- mini chart engine (Canvas 2D) ---
type XY = { x: Date; y: number };
type ChartOpts = {
  yLabel?: string;
  strokeWidth?: number;
  grid?: boolean;
  dots?: boolean;
  padding?: { top:number; right:number; bottom:number; left:number };
  xTickCount?: number;
  yTickCount?: number;
};

function clearCanvas(cnv: HTMLCanvasElement) {
  const ctx = cnv.getContext('2d')!;
  ctx.clearRect(0, 0, cnv.width, cnv.height);
}

function drawSimpleLineChart(cnv: HTMLCanvasElement, data: XY[], opts: ChartOpts = {}) {
  const ctx = cnv.getContext('2d')!;
  const W = cnv.width, H = cnv.height;

  // DPI fix for crisp lines on HiDPI screens
  const dpr = window.devicePixelRatio || 1;
  if (cnv.dataset.dprApplied !== String(dpr)) {
    cnv.width = Math.floor(cnv.clientWidth * dpr) || W;
    cnv.height = Math.floor(280 * dpr);
    cnv.style.width = '100%';
    cnv.style.height = 'auto';
    (cnv as any).dataset.dprApplied = String(dpr);
  }

  const pad = Object.assign({ top:16, right:16, bottom:28, left:48 }, opts.padding);
  const plotW = cnv.width - pad.left - pad.right;
  const plotH = cnv.height - pad.top - pad.bottom;

  // ranges
  const xs = data.map(p => p.x.getTime());
  const ys = data.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const ySpan = maxY - minY || 1;
  const xSpan = maxX - minX || 1;

  // helpers map
  const xToPx = (t:number) => pad.left + ((t - minX) / xSpan) * plotW;
  const yToPx = (v:number) => pad.top + (1 - (v - minY) / ySpan) * plotH;

  // clear
  ctx.clearRect(0,0,cnv.width, cnv.height);

  // styles
  const gridColor = 'rgba(255,255,255,0.08)';
  const axisColor = 'rgba(255,255,255,0.35)';
  const lineColor = '#6ee7ff';
  const textColor = '#cbd5e1';
  ctx.lineWidth = 1 * dpr;
  ctx.font = `${12 * dpr}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.strokeStyle = axisColor;

  // grid & axes
  if (opts.grid !== false) {
    // y ticks
    const yTicks = opts.yTickCount ?? 4;
    for (let i = 0; i <= yTicks; i++) {
      const v = minY + (ySpan * i / yTicks);
      const py = yToPx(v);
      // grid line
      ctx.strokeStyle = gridColor;
      ctx.beginPath();
      ctx.moveTo(pad.left, py);
      ctx.lineTo(cnv.width - pad.right, py);
      ctx.stroke();
      // label
      ctx.fillStyle = textColor;
      ctx.fillText(v.toFixed(2), pad.left - 8 * dpr, py);
    }

    // x ticks
    const xTicks = opts.xTickCount ?? 5;
    ctx.textAlign = 'center';
    for (let i = 0; i <= xTicks; i++) {
      const t = minX + (xSpan * i / xTicks);
      const px = xToPx(t);
      ctx.strokeStyle = gridColor;
      ctx.beginPath();
      ctx.moveTo(px, pad.top);
      ctx.lineTo(px, cnv.height - pad.bottom);
      ctx.stroke();

      const label = fmtTimeShort(new Date(t));
      ctx.fillStyle = textColor;
      ctx.fillText(label, px, cnv.height - pad.bottom + 12 * dpr);
    }
  }

  // axes lines
  ctx.strokeStyle = axisColor;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, cnv.height - pad.bottom);
  ctx.lineTo(cnv.width - pad.right, cnv.height - pad.bottom);
  ctx.stroke();

  // series
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = (opts.strokeWidth ?? 2) * dpr;
  ctx.beginPath();
  data.forEach((p, idx) => {
    const px = xToPx(p.x.getTime());
    const py = yToPx(p.y);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // dots
  if (opts.dots) {
    ctx.fillStyle = lineColor;
    const r = 2.5 * dpr;
    data.forEach(p => {
      const px = xToPx(p.x.getTime());
      const py = yToPx(p.y);
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fill();
    });
  }
}

// --- render tabla/paginación ---
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
      <td class="col-actions">
        <button class="btn btn-view"
          data-device-id="${r.device_id ?? ''}"
          data-device-name="${escapeHtml(String(r.device_name ?? ''))}"
          title="Ver datapoints">
          Ver
        </button>
      </td>
    </tr>
  `).join('');

  // Botones "Ver": abrir modal
  tbody.querySelectorAll<HTMLButtonElement>('.btn-view').forEach(btn => {
    btn.addEventListener('click', () => {
      const deviceId = String(btn.dataset.deviceId || '');
      const deviceName = String(btn.dataset.deviceName || '');
      if (!deviceId) return;
      openDpModal(deviceId, deviceName);
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
  initDpModal();
  loadDevices();
});

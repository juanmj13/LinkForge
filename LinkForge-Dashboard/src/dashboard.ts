// /src/online.ts

// ===== Helpers =====
function fmtDate(v: any) {
  if (!v) return '';
  try { return new Date(v).toLocaleString(); } catch { return String(v); }
}
function fmtDuration(sec: any) {
  const s = Number(sec) || 0;
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
  if (h) return `${h}h ${m}m ${ss}s`;
  if (m) return `${m}m ${ss}s`;
  return `${ss}s`;
}
function statusTag(s: string | null | undefined) {
  const val = (s || '').toString().toUpperCase();
  let cls = 'activo';
  if (/(PEND|QUEUE|COLA|WAIT|PROC|ANALY)/.test(val)) cls = 'cola';
  if (/(FAIL|ERR|CANCEL|INACTIVO|INACTIVE)/.test(val)) cls = 'inactivo';
  return `<span class="tag ${cls}">${s ?? ''}</span>`;
}
function firstVehicle(row: EventRow) {
  return row.vehicle1_name || row.vehicle2_name || row.vehicle3_name || row.vehicle4_name || '';
}

// ===== Tipos (sin created_at) =====
type EventRow = {
  id: number;
  vehicle1_name: string | null;
  vehicle2_name: string | null;
  vehicle3_name: string | null;
  vehicle4_name: string | null;
  vehicle_exceeded: boolean | number | null;
  status: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number | null;
};

// ===== Galería (para botón Ver) =====
function selectVehicleByName(name: string) {
  const title = document.getElementById("selected-title")!;
  const card = document.querySelector<HTMLElement>(`.gallery-item[data-name="${name}"]`);
  if (!card) {
    title.textContent = `Vehículo seleccionado: ${name} (no encontrado en galería)`;
    title.style.display = "block";
    return;
  }
  title.textContent = `Vehículo seleccionado: ${name}`;
  title.style.display = "block";
  card.classList.remove("highlight"); void (card as any).offsetWidth; card.classList.add("highlight");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}
function bindGallery() {
  document.querySelectorAll<HTMLImageElement>(".gallery-item img").forEach(img=>{
    img.addEventListener("click", e=>{
      e.preventDefault();
      const name = img.closest(".gallery-item")!.getAttribute("data-name")!;
      selectVehicleByName(name);
    });
  });
}

// ===== Estado de tabla/paginación =====
const PAGE_SIZE = 10;
let currentPage = 1;
let eventsData: EventRow[] = [];

const tp = () => Math.max(1, Math.ceil(eventsData.length / PAGE_SIZE));

// ===== Render =====
function renderTable(){
  const tbody = document.querySelector("#tbl-inspecciones tbody") as HTMLElement | null;
  if (!tbody) return;

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, eventsData.length);
  const slice = eventsData.slice(start, end);

  if (slice.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11">Sin datos.</td></tr>`;
    return;
  }

  tbody.innerHTML = slice.map(r => {
    const exceeded = (r.vehicle_exceeded === true || r.vehicle_exceeded === 1) ? 'Sí' : 'No';
    const target = firstVehicle(r);
    return `
      <tr>
        <td>${r.id}</td>
        <td>${r.vehicle1_name ?? ''}</td>
        <td>${r.vehicle2_name ?? ''}</td>
        <td>${r.vehicle3_name ?? ''}</td>
        <td>${r.vehicle4_name ?? ''}</td>
        <td>${exceeded}</td>
        <td>${statusTag(r.status)}</td>
        <td>${fmtDate(r.start_time)}</td>
        <td>${fmtDate(r.end_time)}</td>
        <td>${fmtDuration(r.duration_seconds)}</td>
        <td><button class="btn btn-ver" data-target="${target}">Ver</button></td>
      </tr>
    `;
  }).join('');

  // Botones "Ver"
  tbody.querySelectorAll<HTMLButtonElement>(".btn-ver").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const target = btn.dataset.target || '';
      if (target) {
        document.querySelector('#vehiculos')?.scrollIntoView({behavior:'smooth', block:'start'});
        setTimeout(()=>selectVehicleByName(target), 350);
      }
    });
  });

  const info = document.getElementById("pager-info");
  if (info) info.textContent = `Mostrando ${start+1}–${end} de ${eventsData.length}`;
}

function renderPager(){
  const wrap = document.getElementById("pager-pages");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (let i=1; i<=tp(); i++){
    const b = document.createElement("button");
    b.className = "btn btn-page" + (i===currentPage ? " is-active" : "");
    b.textContent = String(i);
    b.setAttribute("aria-label", "Página " + i);
    if (i===currentPage) b.setAttribute("aria-current","page");
    b.addEventListener("click", ()=>{ currentPage=i; renderTable(); renderPager(); });
    wrap.appendChild(b);
  }
}

function wirePagerNav(){
  const q = (a:string)=>document.querySelector<HTMLButtonElement>('.pager [data-action="'+a+'"]');
  q("first")?.addEventListener("click", ()=>{ currentPage=1; renderTable(); renderPager(); });
  q("prev") ?.addEventListener("click", ()=>{ currentPage=Math.max(1,currentPage-1); renderTable(); renderPager(); });
  q("next") ?.addEventListener("click", ()=>{ currentPage=Math.min(tp(),currentPage+1); renderTable(); renderPager(); });
  q("last") ?.addEventListener("click", ()=>{ currentPage=tp(); renderTable(); renderPager(); });
}

// ===== Carga de datos =====
async function loadRecentEvents(){
  try{
    const res = await fetch('/api/recent-events');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    eventsData = await res.json();
  }catch(err){
    console.error('Error cargando /api/recent-events:', err);
    eventsData = [];
  }
  currentPage = 1;
  renderTable();
  renderPager();
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', ()=>{
  bindGallery();
  wirePagerNav();
  loadRecentEvents();
});

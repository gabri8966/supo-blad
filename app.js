let rawData = [];
let cleanData = [];

fetch("ventas_raw.csv")
  .then(res => res.text())
  .then(text => {
    rawData = parseCSV(text);
    cleanData = cleanDataset(rawData);
    initUI();
  });

// ================= CSV =================
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(line => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
    return obj;
  });
}

// ================= LIMPIEZA =================
function cleanDataset(data) {
  const seen = new Set();
  const familias = ["Bebida", "Entrante", "Principal", "Postre"];

  return data.map(d => {
    const fecha = new Date(d.fecha);
    if (isNaN(fecha)) return null;

    if (!["Desayuno", "Comida"].includes(d.franja)) return null;
    if (!familias.includes(d.familia)) return null;

    const producto = d.producto?.trim().toLowerCase();
    if (!producto) return null;

    const unidades = Number(d.unidades);
    const precio = Number(d.precio_unitario);
    if (unidades <= 0 || precio <= 0) return null;

    const clean = {
      fecha: fecha.toISOString().slice(0,10),
      franja: d.franja,
      producto,
      familia: d.familia,
      unidades,
      precio_unitario: precio,
      importe: unidades * precio
    };

    const key = JSON.stringify(clean);
    if (seen.has(key)) return null;
    seen.add(key);

    return clean;
  }).filter(Boolean);
}

// ================= UI =================
function initUI() {
  document.getElementById("rowsInfo").textContent =
    `Filas RAW: ${rawData.length} | Filas limpias: ${cleanData.length}`;

  renderTable(rawData.slice(0,10), "rawTable");
  applyFilters();

  document.querySelectorAll("select,input").forEach(el =>
    el.addEventListener("change", applyFilters)
  );

  document.getElementById("downloadBtn")
    .addEventListener("click", () => downloadCSV(cleanData));
}

// ================= FILTROS =================
function applyFilters() {
  let data = [...cleanData];

  const franja = filterFranja.value;
  const familia = filterFamilia.value;
  const from = dateFrom.value;
  const to = dateTo.value;

  if (franja) data = data.filter(d => d.franja === franja);
  if (familia) data = data.filter(d => d.familia === familia);
  if (from) data = data.filter(d => d.fecha >= from);
  if (to) data = data.filter(d => d.fecha <= to);

  renderTable(data.slice(0,10), "cleanTable");
  renderKPIs(data);
  renderCharts(data);
}

// ================= KPIs =================
function renderKPIs(data) {
  const ventas = data.reduce((s,d)=>s+d.importe,0);
  const unidades = data.reduce((s,d)=>s+d.unidades,0);

  kpiVentas.textContent = `Ventas totales (€): ${ventas.toFixed(2)}`;
  kpiUnidades.textContent = `Unidades totales: ${unidades}`;
}

// ================= GRÁFICOS =================
let charts = [];

function renderCharts(data) {
  charts.forEach(c => c.destroy());
  charts = [];

  charts.push(barChart("chartTop", topN(data,"producto",5)));
  charts.push(pieChart("chartFranja", groupSum(data,"franja")));
  charts.push(pieChart("chartFamilia", groupSum(data,"familia")));
}

function groupSum(data, field) {
  return data.reduce((acc,d)=>{
    acc[d[field]]=(acc[d[field]]||0)+d.importe;
    return acc;
  },{});
}

function topN(data, field, n) {
  return Object.entries(groupSum(data,field))
    .sort((a,b)=>b[1]-a[1]).slice(0,n);
}

function barChart(id, entries) {
  return new Chart(document.getElementById(id),{
    type:"bar",
    data:{
      labels:entries.map(e=>e[0]),
      datasets:[{data:entries.map(e=>e[1]),label:"€"}]
    }
  });
}

function pieChart(id, obj) {
  return new Chart(document.getElementById(id),{
    type:"pie",
    data:{labels:Object.keys(obj),datasets:[{data:Object.values(obj)}]}
  });
}

// ================= TABLAS =================
function renderTable(data, id) {
  const table = document.getElementById(id);
  table.innerHTML = "";
  if (!data.length) return;

  const h = table.insertRow();
  Object.keys(data[0]).forEach(k=>{
    const th=document.createElement("th");
    th.textContent=k;
    h.appendChild(th);
  });

  data.forEach(r=>{
    const tr=table.insertRow();
    Object.values(r).forEach(v=>{
      tr.insertCell().textContent=v;
    });
  });
}

// ================= DESCARGA =================
function downloadCSV(data) {
  const csv = [
    Object.keys(data[0]).join(","),
    ...data.map(d=>Object.values(d).join(","))
  ].join("\n");

  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv]));
  a.download="ventas_clean.csv";
  a.click();
}

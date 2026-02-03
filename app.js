// app.js

// Cargar CSV al iniciar
fetch("ventas_raw.csv")
  .then(r => r.text())
  .then(text => init(text));

function init(csvText) {
  const rawData = parseCSV(csvText);
  renderTable(rawData.slice(0, 10), "rawTable");

  const cleanedData = cleanData(rawData);

  document.getElementById("rowsInfo").textContent =
    `Filas RAW: ${rawData.length} | Filas limpias: ${cleanedData.length}`;

  renderTable(cleanedData.slice(0, 10), "cleanTable");

  calculateKPIs(cleanedData);
  renderCharts(cleanedData);

  document.getElementById("downloadBtn")
    .addEventListener("click", () => downloadCSV(cleanedData));
}

// -------- CSV --------
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

// -------- LIMPIEZA --------
function cleanData(data) {
  const seen = new Set();
  return data
    .map(d => {
      const date = new Date(d.fecha);
      if (isNaN(date)) return null;

      const franja = d.franja === "Desayuno" ? "Desayuno" :
                     d.franja === "Comida" ? "Comida" : null;

      const familiaMap = {
        Bebida: "Bebida",
        Entrante: "Entrante",
        Principal: "Principal",
        Postre: "Postre"
      };
      const familia = familiaMap[d.familia];

      const producto = d.producto?.trim().toLowerCase();
      const unidades = Number(d.unidades);
      const precio = Number(d.precio_unitario);

      if (!franja || !familia || !producto) return null;
      if (unidades <= 0 || precio <= 0) return null;

      const importe = unidades * precio;

      const clean = {
        fecha: date.toISOString().slice(0, 10),
        franja,
        producto,
        familia,
        unidades,
        precio_unitario: precio,
        importe
      };

      const key = JSON.stringify(clean);
      if (seen.has(key)) return null;
      seen.add(key);

      return clean;
    })
    .filter(Boolean);
}

// -------- KPI --------
function calculateKPIs(data) {
  const totalVentas = data.reduce((s, d) => s + d.importe, 0);
  const totalUnidades = data.reduce((s, d) => s + d.unidades, 0);

  document.getElementById("kpiVentas").textContent =
    `Ventas totales: €${totalVentas.toFixed(2)}`;

  document.getElementById("kpiUnidades").textContent =
    `Unidades totales: ${totalUnidades}`;
}

// -------- GRÁFICOS --------
function renderCharts(data) {
  const byProduct = groupSum(data, "producto");
  const top5 = Object.entries(byProduct)
    .sort((a,b) => b[1]-a[1]).slice(0,5);

  new Chart(chartTop, {
    type: "bar",
    data: {
      labels: top5.map(d => d[0]),
      datasets: [{ label: "€", data: top5.map(d => d[1]) }]
    }
  });

  renderPie("chartFranja", groupSum(data, "franja"));
  renderPie("chartFamilia", groupSum(data, "familia"));
}

function groupSum(data, field) {
  return data.reduce((acc, d) => {
    acc[d[field]] = (acc[d[field]] || 0) + d.importe;
    return acc;
  }, {});
}

function renderPie(id, obj) {
  new Chart(document.getElementById(id), {
    type: "pie",
    data: {
      labels: Object.keys(obj),
      datasets: [{ data: Object.values(obj) }]
    }
  });
}

// -------- TABLAS --------
function renderTable(data, id) {
  const table = document.getElementById(id);
  if (!data.length) return;

  table.innerHTML = "";
  const thead = table.insertRow();
  Object.keys(data[0]).forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    thead.appendChild(th);
  });

  data.forEach(row => {
    const tr = table.insertRow();
    Object.values(row).forEach(v => {
      const td = tr.insertCell();
      td.textContent = v;
    });
  });
}

// -------- DESCARGA --------
function downloadCSV(data) {
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(d => Object.values(d).join(","));
  const csv = [headers, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ventas_clean.csv";
  a.click();
}

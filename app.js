// =====================
// CARGA DEL CSV
// =====================
fetch("ventas_raw.csv")
  .then(res => res.text())
  .then(text => startApp(text));

function startApp(csvText) {
  const rawData = parseCSV(csvText);
  const cleanData = cleanDataset(rawData);

  // INFO FILAS
  document.getElementById("rowsInfo").textContent =
    `Filas RAW: ${rawData.length} | Filas limpias: ${cleanData.length}`;

  // TABLAS (solo 10 filas visuales)
  renderTable(rawData.slice(0, 10), "rawTable");
  renderTable(cleanData.slice(0, 10), "cleanTable");

  // KPIs (USANDO TODAS LAS FILAS LIMPIAS)
  calculateKPIs(cleanData);

  // GRÁFICOS
  renderCharts(cleanData);

  // DESCARGA
  document.getElementById("downloadBtn")
    .addEventListener("click", () => downloadCSV(cleanData));
}

// =====================
// PARSE CSV
// =====================
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

// =====================
// LIMPIEZA DE DATOS
// =====================
function cleanDataset(data) {
  const seen = new Set();
  const familiasValidas = ["Bebida", "Entrante", "Principal", "Postre"];

  return data
    .map(d => {
      // Fecha válida
      const fecha = new Date(d.fecha);
      if (isNaN(fecha)) return null;

      // Franja
      const franja = d.franja === "Desayuno" || d.franja === "Comida"
        ? d.franja
        : null;

      // Familia
      const familia = familiasValidas.includes(d.familia)
        ? d.familia
        : null;

      // Producto normalizado
      const producto = d.producto
        ? d.producto.trim().toLowerCase()
        : null;

      const unidades = Number(d.unidades);
      const precio = Number(d.precio_unitario);

      if (!franja || !familia || !producto) return null;
      if (unidades <= 0 || precio <= 0) return null;

      const importe = unidades * precio;

      const clean = {
        fecha: fecha.toISOString().slice(0, 10),
        franja,
        producto,
        familia,
        unidades,
        precio_unitario: precio,
        importe
      };

      // Eliminar duplicados exactos
      const key = JSON.stringify(clean);
      if (seen.has(key)) return null;
      seen.add(key);

      return clean;
    })
    .filter(Boolean);
}

// =====================
// KPIs
// =====================
function calculateKPIs(data) {
  const totalVentas = data.reduce((s, d) => s + d.importe, 0);
  const totalUnidades = data.reduce((s, d) => s + d.unidades, 0);

  document.getElementById("kpiVentas").textContent =
    `Ventas totales (€): ${totalVentas.toFixed(2)}`;

  document.getElementById("kpiUnidades").textContent =
    `Unidades totales: ${totalUnidades}`;
}

// =====================
// GRÁFICOS
// =====================
function renderCharts(data) {
  const ventasProducto = groupBySum(data, "producto");
  const top5 = Object.entries(ventasProducto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  new Chart(chartTop, {
    type: "bar",
    data: {
      labels: top5.map(d => d[0]),
      datasets: [{
        label: "Importe (€)",
        data: top5.map(d => d[1]),
        backgroundColor: "#4e79a7"
      }]
    }
  });

  createPieChart("chartFranja", groupBySum(data, "franja"));
  createPieChart("chartFamilia", groupBySum(data, "familia"));
}

function groupBySum(data, field) {
  return data.reduce((acc, d) => {
    acc[d[field]] = (acc[d[field]] || 0) + d.importe;
    return acc;
  }, {});
}

function createPieChart(id, values) {
  new Chart(document.getElementById(id), {
    type: "pie",
    data: {
      labels: Object.keys(values),
      datasets: [{
        data: Object.values(values)
      }]
    }
  });
}

// =====================
// TABLAS
// =====================
function renderTable(data, tableId) {
  const table = document.getElementById(tableId);
  table.innerHTML = "";

  if (!data.length) return;

  const header = table.insertRow();
  Object.keys(data[0]).forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    header.appendChild(th);
  });

  data.forEach(row => {
    const tr = table.insertRow();
    Object.values(row).forEach(v => {
      const td = tr.insertCell();
      td.textContent = v;
    });
  });
}

// =====================
// DESCARGA CSV LIMPIO
// =====================
function downloadCSV(data) {
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(d => Object.values(d).join(","));
  const csv = [headers, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "ventas_clean.csv";
  link.click();
}

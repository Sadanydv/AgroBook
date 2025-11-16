/* ---------- persistence & state ---------- */
let quantities = JSON.parse(localStorage.getItem("quantities")) || [];
let prices = JSON.parse(localStorage.getItem("prices")) || [];
let historyStack = JSON.parse(localStorage.getItem("quantities_history")) || [];

// When page loads, restore UI
window.onload = function () {
  if (localStorage.getItem("packSize")) {
    document.getElementById("packSize").value =
      localStorage.getItem("packSize");
  }
  if (localStorage.getItem("totalPackPrice")) {
    document.getElementById("totalPackPrice").value =
      localStorage.getItem("totalPackPrice");
  }
  if (localStorage.getItem("darkMode") === "true")
    document.body.classList.add("dark");

  renderPrices();
  updateTotals();
};

/* ---------- helpers for localStorage ---------- */
function saveQuantities() {
  localStorage.setItem("quantities", JSON.stringify(quantities));
  localStorage.setItem("quantities_history", JSON.stringify(historyStack));
}

function savePrices() {
  localStorage.setItem("prices", JSON.stringify(prices));
}

/* ---------- push current snapshot for undo ---------- */
function pushHistory() {
  historyStack = historyStack || [];
  historyStack.push(JSON.stringify(quantities));
  if (historyStack.length > 30) historyStack.shift();
  localStorage.setItem("quantities_history", JSON.stringify(historyStack));
}

/* ---------- quantity operations ---------- */
function addQuantity() {
  const qtyInput = document.getElementById("quantityInput");
  const qty = parseFloat(qtyInput.value);
  if (!isNaN(qty) && qty > 0) {
    pushHistory();
    quantities.push(qty);
    saveQuantities();
    qtyInput.value = "";
    updateTotals();
  }
  qtyInput.focus();
}

function updateTotals() {
  const totalQty = quantities.reduce((a, b) => a + b, 0);
  document.getElementById(
    "totalQty"
  ).textContent = `Total Quantity: ${totalQty} kg`;
  updatePricePerKg();
}

function updatePricePerKg() {
  const packSize = parseFloat(document.getElementById("packSize").value);
  const totalPackPrice = parseFloat(
    document.getElementById("totalPackPrice").value
  );
  const totalQty = quantities.reduce((a, b) => a + b, 0);

  let pricePerKg = 0;
  let totalCost = 0;

  if (!isNaN(totalPackPrice) && packSize > 0) {
    pricePerKg = totalPackPrice / packSize;
    totalCost = totalQty * pricePerKg;
  }

  document.getElementById(
    "pricePerKg"
  ).textContent = `Price per kg: Rs ${pricePerKg.toFixed(2)}`;
  document.getElementById(
    "totalCost"
  ).textContent = `Total Cost: Rs ${totalCost.toFixed(2)}`;
}

/* ---------- input handlers that persist ---------- */
function onPackSizeChange() {
  localStorage.setItem("packSize", document.getElementById("packSize").value);
  updateTotals();
}

function onPackPriceChange() {
  localStorage.setItem(
    "totalPackPrice",
    document.getElementById("totalPackPrice").value
  );
  updateTotals();
}

/* ---------- Enter key ---------- */
document
  .getElementById("quantityInput")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addQuantity();
    }
  });

document
  .getElementById("priceValue")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addPrice();
    }
  });

/* ---------- clear & undo ---------- */
function clearAll() {
  if (!confirm("Clear all quantities and pack price?")) return;
  pushHistory();
  quantities = [];
  saveQuantities();
  document.getElementById("quantityInput").value = "";
  document.getElementById("totalPackPrice").value = "";
  localStorage.removeItem("totalPackPrice");
  document.getElementById("totalQty").textContent = "Total Quantity: 0 kg";
  document.getElementById("pricePerKg").textContent = "Price per kg: Rs 0";
  document.getElementById("totalCost").textContent = "Total Cost: Rs 0";
  document.getElementById("quantityInput").focus();
}

function undo() {
  const history =
    JSON.parse(localStorage.getItem("quantities_history")) ||
    historyStack ||
    [];
  if (history.length === 0) {
    alert("Nothing to undo.");
    return;
  }
  history.pop();
  const prev = history.pop();
  if (!prev) {
    quantities = [];
  } else {
    quantities = JSON.parse(prev);
  }
  historyStack = history;
  localStorage.setItem("quantities_history", JSON.stringify(historyStack));
  saveQuantities();
  updateTotals();
  showChecklist();
}

/* ---------- price list box ---------- */
function addPrice() {
  const nameInput = document.getElementById("priceName");
  const priceInput = document.getElementById("priceValue");
  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value);

  if (name && !isNaN(price) && price >= 0) {
    prices.push({ name, price });
    savePrices();
    renderPrices();
    nameInput.value = "";
    priceInput.value = "";
    nameInput.focus();
  }
}

function renderPrices() {
  const list = document.getElementById("priceList");
  list.innerHTML = "";
  prices.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="item-info">
        <strong>${item.name}</strong>
        <span>Rs ${item.price.toFixed(2)}</span>
      </div>
      <div class="actions">
        <button onclick="editPrice(${index})">Edit</button>
        <button onclick="deletePrice(${index})">Delete</button>
        <button onclick="sendPrice(${index})">Send</button>
      </div>
    `;
    list.appendChild(li);
  });
}

function deletePrice(index) {
  if (!confirm("Delete this saved price?")) return;
  prices.splice(index, 1);
  savePrices();
  renderPrices();
}

function editPrice(index) {
  const newName = prompt("Edit name:", prices[index].name);
  const newPrice = parseFloat(prompt("Edit price (Rs):", prices[index].price));
  if (newName && !isNaN(newPrice) && newPrice >= 0) {
    prices[index].name = newName;
    prices[index].price = newPrice;
    savePrices();
    renderPrices();
  }
}

function sendPrice(index) {
  document.getElementById("totalPackPrice").value = prices[index].price;
  localStorage.setItem("totalPackPrice", prices[index].price);
  updatePricePerKg();
}

/* ---------- checklist modal ---------- */
function showChecklist() {
  const modal = document.getElementById("checklistModal");
  const list = document.getElementById("checklistItems");
  list.innerHTML = "";

  if (quantities.length === 0) {
    list.innerHTML =
      '<p style="text-align:center; color:#888;">No quantities added yet.</p>';
  } else {
    quantities.forEach((qty, i) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${i + 1}. ${qty} kg</span>
        <div class="check-actions">
          <button onclick="editQuantity(${i})">Edit</button>
          <button onclick="deleteQuantity(${i})">Delete</button>
        </div>
      `;
      list.appendChild(li);
    });
  }
  modal.style.display = "block";
}

function closeChecklist() {
  document.getElementById("checklistModal").style.display = "none";
}

function editQuantity(index) {
  const newQty = parseFloat(
    prompt("Enter new quantity (kg):", quantities[index])
  );
  if (!isNaN(newQty) && newQty > 0) {
    pushHistory();
    quantities[index] = newQty;
    saveQuantities();
    updateTotals();
    showChecklist();
  }
}

function deleteQuantity(index) {
  if (!confirm("Delete this quantity?")) return;
  pushHistory();
  quantities.splice(index, 1);
  saveQuantities();
  updateTotals();
  showChecklist();
}

/* close modal when clicking outside */
window.onclick = function (event) {
  const modal = document.getElementById("checklistModal");
  const graphModal = document.getElementById("graphModal");
  if (event.target === modal) modal.style.display = "none";
  if (event.target === graphModal) graphModal.style.display = "none";
};

/* ---------- dark mode ---------- */
function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
}

/* ---------- printing ---------- */
function printChecklist() {
  const w = window.open("", "_blank", "width=800,height=600");
  const totalQty = document.getElementById("totalQty").textContent;
  const pricePerKg = document.getElementById("pricePerKg").textContent;
  const totalCost = document.getElementById("totalCost").textContent;

  let html = `<html><head><title>Checklist</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}li{margin:6px 0;padding:6px}</style>
    </head><body>`;
  html += `<h2>Quantities Checklist</h2><ol>`;
  quantities.forEach((q) => (html += `<li>${q} kg</li>`));
  html += `</ol><hr>`;
  html += `<p><strong>${totalQty}</strong></p>`;
  html += `<p><strong>${pricePerKg}</strong></p>`;
  html += `<p><strong>${totalCost}</strong></p>`;
  html += `</body></html>`;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

/* ---------- export CSV (Excel-friendly) ---------- */
function exportCSV() {
  const rows = [];
  rows.push(["Item", "Value"]);
  quantities.forEach((q, i) => rows.push([`Quantity ${i + 1}`, `${q} kg`]));
  const totalQty = quantities.reduce((a, b) => a + b, 0);
  rows.push(["Total Quantity", totalQty + " kg"]);
  const packSize = document.getElementById("packSize").value;
  const totalPackPrice = document.getElementById("totalPackPrice").value || "";
  rows.push(["Pack Size", packSize + " kg"]);
  rows.push(["Pack Price (Rs)", totalPackPrice]);
  const pricePerKgText = document.getElementById("pricePerKg").textContent;
  const totalCostText = document.getElementById("totalCost").textContent;
  rows.push([pricePerKgText, ""]);
  rows.push([totalCostText, ""]);
  rows.push([]);
  rows.push(["Saved Prices"]);
  rows.push(["Name", "Price"]);
  prices.forEach((p) => rows.push([p.name, p.price]));

  const csvContent = rows
    .map((r) =>
      r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quantities_export_${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/:/g, "-")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- graph modal ---------- */
let chartInstance = null;

function showGraph() {
  const modal = document.getElementById("graphModal");
  modal.style.display = "block";
  renderChart();
}

function closeGraph() {
  const modal = document.getElementById("graphModal");
  modal.style.display = "none";
}

function renderChart() {
  const ctx = document.getElementById("quantChart").getContext("2d");
  const labels = quantities.map((_, i) => `#${i + 1}`);
  const data = quantities.slice();

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.update();
    return;
  }

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Quantity (kg)",
          data,
          backgroundColor: "rgba(3, 169, 244, 0.7)",
          borderColor: "rgba(3, 169, 244, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

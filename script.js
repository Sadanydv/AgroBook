/* ---------- FIREBASE CONFIGURATION ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyCT0tDz3HaGePuDAOThcU1IgI51_0wC4EA",
  authDomain: "agrobook-f59e4.firebaseapp.com",
  databaseURL: "https://agrobook-f59e4-default-rtdb.firebaseio.com",
  projectId: "agrobook-f59e4",
  storageBucket: "agrobook-f59e4.firebasestorage.app",
  messagingSenderId: "818114876174",
  appId: "1:818114876174:web:c04a92f8089da4c5e83d5f",
  measurementId: "G-06KLWW8SSW",
};

// Initialize Firebase (compat version)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

/* ---------- Local state ---------- */
let quantities = [];
let prices = [];
let historyStack = [];

/* ---------- Firebase References ---------- */
const quantitiesRef = database.ref("quantities");
const pricesRef = database.ref("prices");
const settingsRef = database.ref("settings");

/* ---------- Listen for real-time updates ---------- */
quantitiesRef.on("value", (snapshot) => {
  quantities = snapshot.val() || [];
  updateTotals();
  // Update checklist if it's open
  if (document.getElementById("checklistModal").style.display === "block") {
    showChecklist();
  }
});

pricesRef.on("value", (snapshot) => {
  prices = snapshot.val() || [];
  renderPrices();
});

settingsRef.on("value", (snapshot) => {
  const settings = snapshot.val() || {};
  if (settings.packSize) {
    document.getElementById("packSize").value = settings.packSize;
  }
  if (settings.totalPackPrice) {
    document.getElementById("totalPackPrice").value = settings.totalPackPrice;
  }
  if (settings.darkMode) {
    if (settings.darkMode === true) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }
  updateTotals();
});

/* ---------- Page Load ---------- */
window.onload = function () {
  // Dark mode from localStorage (immediate load before Firebase)
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
  }
};

/* ---------- quantity operations ---------- */
function addQuantity() {
  const qtyInput = document.getElementById("quantityInput");
  const qty = parseFloat(qtyInput.value);
  if (!isNaN(qty) && qty > 0) {
    quantities.push(qty);
    quantitiesRef.set(quantities); // Save to Firebase
    qtyInput.value = "";
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

/* ---------- input handlers ---------- */
function onPackSizeChange() {
  const packSize = document.getElementById("packSize").value;
  settingsRef.update({ packSize });
}

function onPackPriceChange() {
  const totalPackPrice = document.getElementById("totalPackPrice").value;
  settingsRef.update({ totalPackPrice });
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

/* ---------- clear ---------- */
function clearAll() {
  if (!confirm("Clear all quantities and pack price?")) return;
  quantities = [];
  quantitiesRef.set(quantities);
  document.getElementById("quantityInput").value = "";
  document.getElementById("totalPackPrice").value = "";
  settingsRef.update({ totalPackPrice: "" });
  document.getElementById("quantityInput").focus();
}

/* ---------- price list box ---------- */
function addPrice() {
  const nameInput = document.getElementById("priceName");
  const priceInput = document.getElementById("priceValue");
  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value);

  if (name && !isNaN(price) && price >= 0) {
    prices.push({ name, price });
    pricesRef.set(prices);
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
  pricesRef.set(prices);
}

function editPrice(index) {
  const newName = prompt("Edit name:", prices[index].name);
  const newPrice = parseFloat(prompt("Edit price (Rs):", prices[index].price));
  if (newName && !isNaN(newPrice) && newPrice >= 0) {
    prices[index].name = newName;
    prices[index].price = newPrice;
    pricesRef.set(prices);
  }
}

function sendPrice(index) {
  document.getElementById("totalPackPrice").value = prices[index].price;
  settingsRef.update({ totalPackPrice: prices[index].price });
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
    quantities[index] = newQty;
    quantitiesRef.set(quantities);
    showChecklist();
  }
}

function deleteQuantity(index) {
  if (!confirm("Delete this quantity?")) return;
  quantities.splice(index, 1);
  quantitiesRef.set(quantities);
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
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("darkMode", isDark);
  settingsRef.update({ darkMode: isDark });
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

/* ---------- export CSV ---------- */
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

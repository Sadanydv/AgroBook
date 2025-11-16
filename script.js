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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

/* ---------- State ---------- */
let currentCustomerId = null;
let customers = {};
let customerData = {};
let sharedPrices = []; // Shared prices for all customers

/* ---------- Firebase References ---------- */
const customersRef = database.ref("customers");
const sharedPricesRef = database.ref("sharedPrices");

/* ---------- Listen for customers list ---------- */
customersRef.on("value", (snapshot) => {
  customers = snapshot.val() || {};
  renderCustomerList();
});

/* ---------- Listen for shared prices ---------- */
sharedPricesRef.on("value", (snapshot) => {
  sharedPrices = snapshot.val() || [];
  renderPrices(sharedPrices);
});

/* ---------- Page Load ---------- */
window.onload = function () {
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
  }
};

/* ---------- Customer Management ---------- */
function showAddCustomerModal() {
  document.getElementById("addCustomerModal").style.display = "block";
  document.getElementById("newCustomerName").value = "";
  document.getElementById("newCustomerPhone").value = "";
  document.getElementById("newCustomerName").focus();
}

function closeAddCustomerModal() {
  document.getElementById("addCustomerModal").style.display = "none";
}

function addCustomer() {
  const name = document.getElementById("newCustomerName").value.trim();
  const phone = document.getElementById("newCustomerPhone").value.trim();

  if (!name) {
    alert("Please enter customer name");
    return;
  }

  const customerId = "customer_" + Date.now();
  const newCustomer = {
    name: name,
    phone: phone || "",
    createdAt: Date.now(),
    quantities: [],
    settings: {
      packSize: "40",
      totalPackPrice: "",
    },
  };

  customersRef.child(customerId).set(newCustomer);
  closeAddCustomerModal();
  selectCustomer(customerId);
}

function renderCustomerList() {
  const list = document.getElementById("customerList");
  list.innerHTML = "";

  if (Object.keys(customers).length === 0) {
    list.innerHTML =
      '<p style="text-align:center; color:#888; padding:20px;">No customers yet. Click "Add Customer" to begin.</p>';
    return;
  }

  Object.keys(customers).forEach((customerId) => {
    const customer = customers[customerId];
    const card = document.createElement("div");
    card.className =
      "customer-card" + (customerId === currentCustomerId ? " active" : "");
    card.innerHTML = `
      <button class="delete-customer" onclick="deleteCustomer('${customerId}', event)">×</button>
      <h4>${customer.name}</h4>
      <p>${customer.phone || "No phone"}</p>
    `;
    card.onclick = () => selectCustomer(customerId);
    list.appendChild(card);
  });
}

function deleteCustomer(customerId, event) {
  event.stopPropagation();
  const customer = customers[customerId];
  if (
    confirm(
      `Delete customer "${customer.name}"? This will delete all their data.`
    )
  ) {
    customersRef.child(customerId).remove();
    if (currentCustomerId === customerId) {
      currentCustomerId = null;
      disableAllInputs();
      document.getElementById("currentCustomerName").textContent =
        "Select a customer to begin";
    }
  }
}

function selectCustomer(customerId) {
  // Unsubscribe from previous customer
  if (currentCustomerId) {
    database.ref(`customers/${currentCustomerId}`).off();
  }

  currentCustomerId = customerId;
  const customer = customers[customerId];

  // Update UI
  document.getElementById(
    "currentCustomerName"
  ).textContent = `📋 ${customer.name}`;
  enableAllInputs();

  // Subscribe to this customer's data
  database.ref(`customers/${customerId}`).on("value", (snapshot) => {
    customerData = snapshot.val() || {};
    loadCustomerData();
  });
}

function loadCustomerData() {
  const quantities = customerData.quantities || [];
  const settings = customerData.settings || {};

  // Load settings
  if (settings.packSize) {
    document.getElementById("packSize").value = settings.packSize;
  }
  if (settings.totalPackPrice) {
    document.getElementById("totalPackPrice").value = settings.totalPackPrice;
  }

  // Update totals
  updateTotals(quantities);

  // Update checklist if open
  if (document.getElementById("checklistModal").style.display === "block") {
    showChecklist();
  }
}

function enableAllInputs() {
  document.getElementById("quantityInput").disabled = false;
  document.getElementById("addBtn").disabled = false;
  document.getElementById("packSize").disabled = false;
  document.getElementById("totalPackPrice").disabled = false;
  document.getElementById("clearBtn").disabled = false;
  document.getElementById("checklistBtn").disabled = false;
  document.getElementById("exportBtn").disabled = false;
  document.getElementById("printBtn").disabled = false;
  document.getElementById("graphBtn").disabled = false;
}

function disableAllInputs() {
  document.getElementById("quantityInput").disabled = true;
  document.getElementById("addBtn").disabled = true;
  document.getElementById("packSize").disabled = true;
  document.getElementById("totalPackPrice").disabled = true;
  document.getElementById("clearBtn").disabled = true;
  document.getElementById("checklistBtn").disabled = true;
  document.getElementById("exportBtn").disabled = true;
  document.getElementById("printBtn").disabled = true;
  document.getElementById("graphBtn").disabled = true;

  // Reset displays
  document.getElementById("totalQty").textContent = "Total Quantity: 0 kg";
  document.getElementById("pricePerKg").textContent = "Price per kg: Rs 0";
  document.getElementById("totalCost").textContent = "Total Cost: Rs 0";
}

/* ---------- Quantity Operations ---------- */
function addQuantity() {
  if (!currentCustomerId) return;

  const qtyInput = document.getElementById("quantityInput");
  const qty = parseFloat(qtyInput.value);

  if (!isNaN(qty) && qty > 0) {
    const quantities = customerData.quantities || [];
    quantities.push(qty);
    database.ref(`customers/${currentCustomerId}/quantities`).set(quantities);
    qtyInput.value = "";
  }
  qtyInput.focus();
}

function updateTotals(quantities = []) {
  const totalQty = quantities.reduce((a, b) => a + b, 0);
  document.getElementById(
    "totalQty"
  ).textContent = `Total Quantity: ${totalQty} kg`;
  updatePricePerKg(quantities);
}

function updatePricePerKg(quantities = []) {
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

function onPackSizeChange() {
  if (!currentCustomerId) return;
  const packSize = document.getElementById("packSize").value;
  database
    .ref(`customers/${currentCustomerId}/settings/packSize`)
    .set(packSize);
}

function onPackPriceChange() {
  if (!currentCustomerId) return;
  const totalPackPrice = document.getElementById("totalPackPrice").value;
  database
    .ref(`customers/${currentCustomerId}/settings/totalPackPrice`)
    .set(totalPackPrice);
}

function clearAll() {
  if (!currentCustomerId) return;
  if (!confirm("Clear all quantities and pack price?")) return;

  database.ref(`customers/${currentCustomerId}/quantities`).set([]);
  database
    .ref(`customers/${currentCustomerId}/settings/totalPackPrice`)
    .set("");
  document.getElementById("totalPackPrice").value = "";
  document.getElementById("quantityInput").value = "";
  document.getElementById("quantityInput").focus();
}

/* ---------- Enter Key ---------- */
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

document
  .getElementById("newCustomerName")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomer();
    }
  });

/* ---------- Shared Price List ---------- */
function addPrice() {
  const nameInput = document.getElementById("priceName");
  const priceInput = document.getElementById("priceValue");
  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value);

  if (name && !isNaN(price) && price >= 0) {
    const prices = [...sharedPrices];
    prices.push({ name, price });
    sharedPricesRef.set(prices);
    nameInput.value = "";
    priceInput.value = "";
    nameInput.focus();
  }
}

function renderPrices(prices = []) {
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

  const prices = [...sharedPrices];
  prices.splice(index, 1);
  sharedPricesRef.set(prices);
}

function editPrice(index) {
  const prices = [...sharedPrices];
  const newName = prompt("Edit name:", prices[index].name);
  const newPrice = parseFloat(prompt("Edit price (Rs):", prices[index].price));

  if (newName && !isNaN(newPrice) && newPrice >= 0) {
    prices[index].name = newName;
    prices[index].price = newPrice;
    sharedPricesRef.set(prices);
  }
}

function sendPrice(index) {
  if (!currentCustomerId) return;

  const prices = [...sharedPrices];
  document.getElementById("totalPackPrice").value = prices[index].price;
  database
    .ref(`customers/${currentCustomerId}/settings/totalPackPrice`)
    .set(prices[index].price);
}

/* ---------- Checklist Modal ---------- */
function showChecklist() {
  if (!currentCustomerId) return;

  const modal = document.getElementById("checklistModal");
  const list = document.getElementById("checklistItems");
  const quantities = customerData.quantities || [];
  const customer = customers[currentCustomerId];

  // Set customer name
  document.getElementById(
    "checklistCustomerName"
  ).textContent = `📋 ${customer.name} - Quantity Checklist`;

  // Render quantities
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

  // Calculate and display totals
  const totalQty = quantities.reduce((a, b) => a + b, 0);
  const packSize = parseFloat(document.getElementById("packSize").value);
  const totalPackPrice = parseFloat(
    document.getElementById("totalPackPrice").value
  );

  let totalAmount = 0;
  if (!isNaN(totalPackPrice) && packSize > 0) {
    const pricePerKg = totalPackPrice / packSize;
    totalAmount = totalQty * pricePerKg;
  }

  document.getElementById(
    "checklistTotalQty"
  ).textContent = `Total Quantity: ${totalQty} kg`;
  document.getElementById(
    "checklistTotalAmount"
  ).textContent = `Total Amount: Rs ${totalAmount.toFixed(2)}`;

  modal.style.display = "block";
}

function closeChecklist() {
  document.getElementById("checklistModal").style.display = "none";
}

function editQuantity(index) {
  if (!currentCustomerId) return;

  const quantities = customerData.quantities || [];
  const newQty = parseFloat(
    prompt("Enter new quantity (kg):", quantities[index])
  );

  if (!isNaN(newQty) && newQty > 0) {
    quantities[index] = newQty;
    database.ref(`customers/${currentCustomerId}/quantities`).set(quantities);
    showChecklist();
  }
}

function deleteQuantity(index) {
  if (!currentCustomerId) return;
  if (!confirm("Delete this quantity?")) return;

  const quantities = customerData.quantities || [];
  quantities.splice(index, 1);
  database.ref(`customers/${currentCustomerId}/quantities`).set(quantities);
  showChecklist();
}

/* ---------- Modal Click Outside ---------- */
window.onclick = function (event) {
  const modal = document.getElementById("checklistModal");
  const graphModal = document.getElementById("graphModal");
  const addCustomerModal = document.getElementById("addCustomerModal");

  if (event.target === modal) modal.style.display = "none";
  if (event.target === graphModal) graphModal.style.display = "none";
  if (event.target === addCustomerModal)
    addCustomerModal.style.display = "none";
};

/* ---------- Dark Mode ---------- */
function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
}

/* ---------- Print ---------- */
function printChecklist() {
  if (!currentCustomerId) return;

  const customer = customers[currentCustomerId];
  const quantities = customerData.quantities || [];
  const w = window.open("", "_blank", "width=800,height=600");
  const totalQty = quantities.reduce((a, b) => a + b, 0);

  const packSize = parseFloat(document.getElementById("packSize").value);
  const totalPackPrice = parseFloat(
    document.getElementById("totalPackPrice").value
  );

  let pricePerKg = 0;
  let totalAmount = 0;
  if (!isNaN(totalPackPrice) && packSize > 0) {
    pricePerKg = totalPackPrice / packSize;
    totalAmount = totalQty * pricePerKg;
  }

  let html = `<html><head><title>Checklist - ${customer.name}</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}li{margin:6px 0;padding:6px}.summary{background:#f0f0f0;padding:15px;margin-top:15px;border-radius:8px;}</style>
    </head><body>`;
  html += `<h2>📋 ${customer.name} - Quantity Checklist</h2>`;
  if (customer.phone) html += `<p>Phone: ${customer.phone}</p>`;
  html += `<ol>`;
  quantities.forEach((q) => (html += `<li>${q} kg</li>`));
  html += `</ol><hr>`;
  html += `<div class="summary">`;
  html += `<p><strong>Total Quantity: ${totalQty} kg</strong></p>`;
  html += `<p><strong>Price per kg: Rs ${pricePerKg.toFixed(2)}</strong></p>`;
  html += `<p style="font-size:1.2em;"><strong>Total Amount: Rs ${totalAmount.toFixed(
    2
  )}</strong></p>`;
  html += `</div>`;
  html += `</body></html>`;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

/* ---------- Export CSV ---------- */
function exportCSV() {
  if (!currentCustomerId) return;

  const customer = customers[currentCustomerId];
  const quantities = customerData.quantities || [];

  const rows = [];
  rows.push(["Customer", customer.name]);
  rows.push(["Phone", customer.phone || ""]);
  rows.push([]);
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
  rows.push(["Shared Pack Prices"]);
  rows.push(["Name", "Price"]);
  sharedPrices.forEach((p) => rows.push([p.name, p.price]));

  const csvContent = rows
    .map((r) =>
      r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${customer.name}_export_${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/:/g, "-")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- Graph ---------- */
let chartInstance = null;

function showGraph() {
  if (!currentCustomerId) return;

  const modal = document.getElementById("graphModal");
  modal.style.display = "block";
  renderChart();
}

function closeGraph() {
  document.getElementById("graphModal").style.display = "none";
}

function renderChart() {
  const quantities = customerData.quantities || [];
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

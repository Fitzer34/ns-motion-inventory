const LS_ITEMS = "ns_inventory_items_v1";
const LS_PIN = "ns_inventory_pin_v1";
const DEFAULT_PIN = "1234";

const defaultCategories = [
  "Automatic Sliding Door",
  "Automatic Swing Door",
  "Locks",
  "Sensors",
  "Motors",
  "Seals",
  "Hardware",
  "Other"
];

let items = loadItems();
let selectedSku = null;
let scanner = null;

// ---------- LOGIN ----------
const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const pinInput = document.getElementById("pinInput");
document.getElementById("loginBtn").addEventListener("click", doLogin);
document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("ns_logged_in");
  show(loginScreen); hide(appScreen);
});

function getPin() {
  return localStorage.getItem(LS_PIN) || DEFAULT_PIN;
}

function doLogin() {
  const pin = (pinInput.value || "").trim();
  if (pin === getPin()) {
    sessionStorage.setItem("ns_logged_in", "1");
    hide(loginScreen); show(appScreen);
    renderAll();
  } else {
    alert("Wrong PIN");
  }
}

function boot() {
  if (sessionStorage.getItem("ns_logged_in") === "1") {
    hide(loginScreen); show(appScreen);
    renderAll();
  } else {
    show(loginScreen); hide(appScreen);
  }
}
boot();

// ---------- UI HOOKS ----------
const tbody = document.getElementById("itemsTbody");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

searchInput.addEventListener("input", renderTable);
categoryFilter.addEventListener("change", renderTable);

document.getElementById("openAddBtn").addEventListener("click", openAddModal);
document.getElementById("closeAddBtn").addEventListener("click", closeAddModal);
document.getElementById("cancelAddBtn").addEventListener("click", closeAddModal);
document.getElementById("addItemBtn").addEventListener("click", addItemFromModal);

document.getElementById("closeDrawerBtn").addEventListener("click", closeDrawer);
document.getElementById("saveBtn").addEventListener("click", saveSelected);
document.getElementById("deleteBtn").addEventListener("click", deleteSelected);
document.getElementById("qrBtn").addEventListener("click", showQrForSelected);
document.getElementById("closeQrBtn").addEventListener("click", () => hide(document.getElementById("qrArea")));

document.getElementById("openScannerBtn").addEventListener("click", openScanner);
document.getElementById("closeScanBtn").addEventListener("click", closeScanner);
document.getElementById("stopScanBtn").addEventListener("click", closeScanner);

document.getElementById("openSettingsBtn").addEventListener("click", openSettings);
document.getElementById("closeSettingsBtn").addEventListener("click", closeSettings);
document.getElementById("closeSettingsBtn2").addEventListener("click", closeSettings);
document.getElementById("savePinBtn").addEventListener("click", savePin);

// drawer fields
const f = {
  name: document.getElementById("fName"),
  sku: document.getElementById("fSku"),
  category: document.getElementById("fCategory"),
  qty: document.getElementById("fQty"),
  low: document.getElementById("fLow"),
  aisle: document.getElementById("fAisle"),
  placement: document.getElementById("fPlacement"),
  notes: document.getElementById("fNotes"),
  photo: document.getElementById("fPhoto")
};

f.photo.addEventListener("change", async () => {
  if (!selectedSku) return;
  const file = f.photo.files?.[0];
  if (!file) return;
  const dataUrl = await fileToDataUrl(file);
  const it = items.find(x => x.sku === selectedSku);
  if (it) {
    it.photo = dataUrl;
    saveItems(items);
    renderDrawer(it);
    renderTable();
  }
});

// add modal fields
const a = {
  name: document.getElementById("aName"),
  sku: document.getElementById("aSku"),
  category: document.getElementById("aCategory"),
  qty: document.getElementById("aQty"),
  low: document.getElementById("aLow"),
  aisle: document.getElementById("aAisle"),
  placement: document.getElementById("aPlacement"),
  notes: document.getElementById("aNotes"),
  photo: document.getElementById("aPhoto")
};

// ---------- DATA ----------
function loadItems() {
  try {
    const raw = localStorage.getItem(LS_ITEMS);
    if (!raw) {
      // seed
      const seed = [
        { name:"Swing Door Operator Kit", sku:"DOOR-SW-01", category:"Automatic Swing Door", qty:4, low:2, aisle:"S1", placement:"Shelf 2", notes:"Complete kit", photo:"" },
        { name:"Sliding Door Operator Kit", sku:"DOOR-SL-01", category:"Automatic Sliding Door", qty:1, low:2, aisle:"S2", placement:"Pallet 1", notes:"Low stock", photo:"" },
        { name:"ABLOY 420 Lock Body", sku:"LOCK-420", category:"Locks", qty:2, low:3, aisle:"B2", placement:"Shelf 1", notes:"Order more", photo:"" },
      ];
      localStorage.setItem(LS_ITEMS, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveItems(list) {
  localStorage.setItem(LS_ITEMS, JSON.stringify(list));
}

// ---------- RENDER ----------
function renderAll() {
  renderCategoryLists();
  renderKPIs();
  renderTable();
  closeDrawer();
}

function renderCategoryLists() {
  // filter dropdown
  const cats = unique(["All", ...defaultCategories, ...items.map(i => i.category || "Other")]);
  categoryFilter.innerHTML = "";
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c; opt.textContent = c;
    categoryFilter.appendChild(opt);
  });
  if (!categoryFilter.value) categoryFilter.value = "All";

  // datalists
  const dl1 = document.getElementById("catList");
  const dl2 = document.getElementById("catList2");
  dl1.innerHTML = ""; dl2.innerHTML = "";
  unique([...defaultCategories, ...items.map(i => i.category || "Other")]).forEach(c => {
    const o1 = document.createElement("option"); o1.value = c; dl1.appendChild(o1);
    const o2 = document.createElement("option"); o2.value = c; dl2.appendChild(o2);
  });
}

function renderKPIs() {
  document.getElementById("kpiTotal").textContent = items.length;
  document.getElementById("kpiLow").textContent = items.filter(i => Number(i.qty) <= Number(i.low)).length;
  document.getElementById("kpiCats").textContent = unique(items.map(i => i.category || "Other")).length;
  document.getElementById("kpiLocs").textContent = unique(items.map(i => (i.aisle || "").trim()).filter(Boolean)).length;
}

function renderTable() {
  renderKPIs();
  renderCategoryLists();

  const q = (searchInput.value || "").trim().toLowerCase();
  const cat = categoryFilter.value || "All";

  const filtered = items.filter(i => {
    const matchQ = !q || (i.name||"").toLowerCase().includes(q)
      || (i.sku||"").toLowerCase().includes(q)
      || (i.aisle||"").toLowerCase().includes(q)
      || (i.placement||"").toLowerCase().includes(q)
      || (i.category||"").toLowerCase().includes(q);

    const matchCat = (cat === "All") || ((i.category || "Other") === cat);
    return matchQ && matchCat;
  });

  tbody.innerHTML = "";
  filtered.forEach(i => {
    const tr = document.createElement("tr");
    const isLow = Number(i.qty) <= Number(i.low);
    if (isLow) tr.classList.add("rowLow");

    tr.innerHTML = `
      <td>${i.photo ? `<img class="thumb" src="${i.photo}" alt="photo"/>` : `<div class="thumb" style="display:flex;align-items:center;justify-content:center;color:var(--muted)">—</div>`}</td>
      <td>
        <a href="#" data-sku="${esc(i.sku)}" class="openItem">${esc(i.name)}</a>
        ${isLow ? `<span class="badgeLow">LOW</span>` : ``}
      </td>
      <td>${esc(i.category || "Other")}</td>
      <td><code>${esc(i.sku)}</code></td>
      <td class="center">${Number(i.qty)}</td>
      <td class="center">${Number(i.low)}</td>
      <td>${esc(i.aisle)}</td>
      <td>${esc(i.placement)}</td>
      <td class="center"><button class="btn" data-qr="${esc(i.sku)}">QR</button></td>
      <td class="right">
        <button class="btn" data-edit="${esc(i.sku)}">Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".openItem").forEach(a => a.addEventListener("click", (e) => {
    e.preventDefault();
    openItem(e.target.getAttribute("data-sku"));
  }));
  tbody.querySelectorAll("button[data-edit]").forEach(b => b.addEventListener("click", () => openItem(b.getAttribute("data-edit"))));
  tbody.querySelectorAll("button[data-qr]").forEach(b => b.addEventListener("click", () => {
    openItem(b.getAttribute("data-qr"));
    showQrForSelected();
  }));
}

function openItem(sku) {
  const it = items.find(x => x.sku === sku);
  if (!it) return alert("Item not found.");
  selectedSku = sku;
  showDrawer();
  renderDrawer(it);
}

function renderDrawer(it) {
  document.getElementById("drawerTitle").textContent = it.name || "Item";
  document.getElementById("drawerSub").textContent = `${it.category || "Other"} • ${it.aisle || ""} ${it.placement || ""}`;

  f.name.value = it.name || "";
  f.sku.value = it.sku || "";
  f.category.value = it.category || "Other";
  f.qty.value = Number(it.qty || 0);
  f.low.value = Number(it.low || 0);
  f.aisle.value = it.aisle || "";
  f.placement.value = it.placement || "";
  f.notes.value = it.notes || "";

  const img = document.getElementById("drawerPhoto");
  const empty = document.getElementById("drawerPhotoEmpty");
  if (it.photo) {
    img.src = it.photo;
    img.style.display = "block";
    empty.style.display = "none";
  } else {
    img.removeAttribute("src");
    img.style.display = "none";
    empty.style.display = "flex";
  }
}

// ---------- CRUD ----------
async function addItemFromModal() {
  const name = (a.name.value || "").trim();
  const sku = (a.sku.value || "").trim();
  const aisle = (a.aisle.value || "").trim();
  const placement = (a.placement.value || "").trim();
  if (!name || !sku || !aisle || !placement) {
    alert("Name, SKU, Aisle, Placement are required.");
    return;
  }
  if (items.some(x => x.sku === sku)) {
    alert("That SKU already exists.");
    return;
  }

  let photo = "";
  if (a.photo.files?.[0]) {
    photo = await fileToDataUrl(a.photo.files[0]);
  }

  const it = {
    name,
    sku,
    category: (a.category.value || "Other").trim() || "Other",
    qty: Number(a.qty.value || 0),
    low: Number(a.low.value || 0),
    aisle,
    placement,
    notes: (a.notes.value || "").trim(),
    photo
  };

  items.push(it);
  saveItems(items);
  closeAddModal();
  renderAll();
  openItem(sku);
}

function saveSelected() {
  if (!selectedSku) return;
  const it = items.find(x => x.sku === selectedSku);
  if (!it) return;

  const name = (f.name.value || "").trim();
  const sku = (f.sku.value || "").trim();
  const aisle = (f.aisle.value || "").trim();
  const placement = (f.placement.value || "").trim();

  if (!name || !sku || !aisle || !placement) {
    alert("Name, SKU, Aisle, Placement are required.");
    return;
  }

  // SKU rename support
  if (sku !== selectedSku && items.some(x => x.sku === sku)) {
    alert("That SKU already exists.");
    return;
  }

  it.name = name;
  it.category = (f.category.value || "Other").trim() || "Other";
  it.qty = Number(f.qty.value || 0);
  it.low = Number(f.low.value || 0);
  it.aisle = aisle;
  it.placement = placement;
  it.notes = (f.notes.value || "").trim();

  if (sku !== selectedSku) {
    it.sku = sku;
    selectedSku = sku;
  }

  saveItems(items);
  renderAll();

  if (Number(it.qty) <= Number(it.low)) {
    alert(`LOW STOCK: ${it.name} is ${it.qty} ≤ ${it.low}`);
  }
}

function deleteSelected() {
  if (!selectedSku) return;
  if (!confirm(`Delete ${selectedSku}?`)) return;
  items = items.filter(x => x.sku !== selectedSku);
  saveItems(items);
  selectedSku = null;
  closeDrawer();
  renderAll();
}

// ---------- QR ----------
function showQrForSelected() {
  if (!selectedSku) return alert("Select an item first.");
  const it = items.find(x => x.sku === selectedSku);
  if (!it) return;

  const payload = {
    sku: it.sku,
    name: it.name,
    category: it.category || "Other",
    aisle: it.aisle,
    placement: it.placement
  };

  const canvas = document.getElementById("qrCanvas");
  const qrArea = document.getElementById("qrArea");
  show(qrArea);

  QRCode.toCanvas(canvas, JSON.stringify(payload), { width: 260, margin: 1 }, (err) => {
    if (err) console.error(err);
  });
}

// ---------- SCANNER ----------
async function openScanner() {
  show(document.getElementById("scanModal"));
  const el = document.getElementById("qrReader");

  if (scanner) {
    try { await scanner.stop(); } catch {}
    scanner = null;
  }

  scanner = new Html5Qrcode("qrReader");

  const onScanSuccess = (decodedText) => {
    // decodedText should be JSON we created
    try {
      const data = JSON.parse(decodedText);
      if (data?.sku) {
        closeScanner();
        openItem(data.sku);
        return;
      }
    } catch {}

    // fallback: treat it as SKU
    closeScanner();
    openItem(decodedText.trim());
  };

  try {
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      onScanSuccess
    );
  } catch (e) {
    alert("Camera start failed. Make sure you allowed camera access.");
    console.error(e);
  }
}

async function closeScanner() {
  hide(document.getElementById("scanModal"));
  if (scanner) {
    try { await scanner.stop(); } catch {}
    try { await scanner.clear(); } catch {}
    scanner = null;
  }
}

// ---------- MODALS / DRAWER ----------
function openAddModal() {
  show(document.getElementById("addModal"));
  a.name.value=""; a.sku.value=""; a.category.value="Automatic Sliding Door";
  a.qty.value=0; a.low.value=0; a.aisle.value=""; a.placement.value="";
  a.notes.value=""; a.photo.value="";
}
function closeAddModal(){ hide(document.getElementById("addModal")); }

function showDrawer(){ show(document.getElementById("drawer")); }
function closeDrawer(){
  selectedSku = null;
  document.getElementById("drawerTitle").textContent = "Select an item";
  document.getElementById("drawerSub").textContent = "Details + QR + stock update";
  hide(document.getElementById("qrArea"));
}

function openSettings(){ show(document.getElementById("settingsModal")); }
function closeSettings(){ hide(document.getElementById("settingsModal")); }
function savePin(){
  const pin = (document.getElementById("newPin").value || "").trim();
  if (!pin || pin.length < 4) return alert("PIN must be at least 4 digits.");
  localStorage.setItem(LS_PIN, pin);
  alert("PIN saved.");
  closeSettings();
}

// ---------- HELPERS ----------
function show(el){ el.classList.remove("hidden"); }
function hide(el){ el.classList.add("hidden"); }
function unique(arr){ return [...new Set(arr.filter(Boolean))]; }

function esc(s){
  return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}

function fileToDataUrl(file){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

const storeKey = "finporyadok.state.v2";
const seedRows = window.ANDROMONEY_DATA?.rows || [];

const state = {
  rows: loadRows(),
  shopping: [
    { name: "Молоко", qty: "2 л", days: 4, price: 92 },
    { name: "Корм", qty: "3 кг", days: 26, price: 1450 },
    { name: "Стиральный порошок", qty: "1 уп.", days: 32, price: 620 }
  ]
};

const views = {
  dashboard: ["Главная", "Сводка по счетам, операциям и обязательствам."],
  transactions: ["Операции", "Поиск, фильтры и проверка импортированных данных."],
  accounts: ["Счета", "Последние остатки и активность по каждому счету."],
  budgets: ["Бюджеты", "Лимиты строятся из ваших фактических категорий расходов."],
  alimony: ["Алименты", "Отдельный учет начислений, поступлений и долга."],
  shopping: ["Покупки", "Список, прогноз повторных покупок и история цен."],
  reports: ["Отчеты", "Категории, проекты, доходы, расходы и экспорт."],
  import: ["Импорт", "Загрузка CSV, предпросмотр и подготовка к проверке."],
  settings: ["Настройки", "Офлайн-режим, синхронизация и безопасность."]
};

function loadRows() {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey) || "null");
    if (saved?.rows?.length) return saved.rows;
  } catch {}
  return seedRows;
}

function saveRows() {
  localStorage.setItem(storeKey, JSON.stringify({ rows: state.rows }));
}

function money(value) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value || 0);
}

function byId(id) {
  return document.getElementById(id);
}

function typeOf(row) {
  if (row.from && row.to && Math.abs(row.amount) < 0.01) return "transfer";
  return row.amount >= 0 ? "income" : "expense";
}

function topBy(rows, key, filter = () => true) {
  const map = new Map();
  rows.filter(filter).forEach((row) => {
    const name = key(row) || "Без значения";
    const item = map.get(name) || { name, total: 0, count: 0, latest: "", balance: 0 };
    item.total += Math.abs(row.amount || 0);
    item.count += 1;
    if (!item.latest || row.date >= item.latest) {
      item.latest = row.date;
      item.balance = row.balance || 0;
    }
    map.set(name, item);
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function summary() {
  const rows = state.rows;
  const dates = rows.map((row) => row.date).sort();
  const income = rows.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
  const expense = rows.filter((row) => row.amount < 0).reduce((sum, row) => sum + Math.abs(row.amount), 0);
  return { rows, income, expense, net: income - expense, minDate: dates[0] || "-", maxDate: dates.at(-1) || "-" };
}

function render() {
  renderMeta();
  renderFilters();
  renderDashboard();
  renderTransactions();
  renderAccounts();
  renderBudgets();
  renderAlimony();
  renderShopping();
  renderReports();
}

function renderMeta() {
  const s = summary();
  byId("sourceName").textContent = window.ANDROMONEY_DATA?.source || "Локальные данные";
  byId("sourceMeta").textContent = `${s.rows.length} операций, ${s.minDate} - ${s.maxDate}`;
  byId("reviewCount").textContent = Math.max(0, Math.round(s.rows.length * 0.04));
}

function renderDashboard() {
  const s = summary();
  byId("metricCount").textContent = s.rows.length.toLocaleString("ru-RU");
  byId("metricPeriod").textContent = `${s.minDate} - ${s.maxDate}`;
  byId("metricIncome").textContent = money(s.income);
  byId("metricExpense").textContent = money(s.expense);
  byId("metricNet").textContent = money(s.net);
  byId("metricNet").className = s.net >= 0 ? "good" : "bad";

  const latest = [...state.rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  byId("latestRows").innerHTML = latest.map(rowTemplate).join("");

  const accounts = topBy(state.rows, (row) => row.account).sort((a, b) => b.latest.localeCompare(a.latest)).slice(0, 6);
  byId("accountSummary").innerHTML = accounts.map((item) => summaryRow(item.name, `${item.count} операций`, money(item.balance))).join("");

  const cats = topBy(state.rows, (row) => row.category.split(":")[0], (row) => row.amount < 0).slice(0, 6);
  byId("categorySummary").innerHTML = cats.map((item) => progressRow(item.name, item.count, item.total, cats[0]?.total || 1)).join("");
}

function rowTemplate(row) {
  const kind = typeOf(row);
  const cls = row.amount >= 0 ? "good" : "bad";
  return `<tr>
    <td>${row.date}</td>
    <td>${row.description || "Операция"}</td>
    <td><span class="tag">${row.category || "Без категории"}</span></td>
    <td>${row.account || "-"}</td>
    <td>${row.project || "-"}</td>
    <td class="amount ${cls}">${kind === "transfer" ? "0 ₽" : money(row.amount)}</td>
  </tr>`;
}

function summaryRow(title, sub, value) {
  return `<article class="row"><div><strong>${title}</strong><small>${sub}</small></div><b>${value}</b></article>`;
}

function progressRow(title, count, total, max) {
  const pct = Math.max(3, Math.round((total / max) * 100));
  return `<article class="row"><div><strong>${title}</strong><small>${count} операций • ${money(total)}</small><div class="bar"><i style="width:${pct}%"></i></div></div></article>`;
}

function renderFilters() {
  fillSelect("accountFilter", topBy(state.rows, (row) => row.account).map((x) => x.name));
  fillSelect("categoryFilter", topBy(state.rows, (row) => row.category.split(":")[0]).map((x) => x.name));
}

function fillSelect(id, values) {
  const select = byId(id);
  if (!select) return;
  const current = select.value;
  const first = select.querySelector("option")?.outerHTML || `<option value="all">Все</option>`;
  select.innerHTML = first + values.slice(0, 80).map((value) => `<option value="${value}">${value}</option>`).join("");
  select.value = [...select.options].some((o) => o.value === current) ? current : "all";
}

function filteredRows() {
  const query = byId("searchInput").value.trim().toLowerCase();
  const account = byId("accountFilter").value;
  const category = byId("categoryFilter").value;
  const type = byId("typeFilter").value;
  return state.rows.filter((row) => {
    const hay = `${row.description} ${row.category} ${row.account} ${row.project} ${row.payee}`.toLowerCase();
    return (!query || hay.includes(query))
      && (account === "all" || row.account === account)
      && (category === "all" || row.category.split(":")[0] === category)
      && (type === "all" || typeOf(row) === type);
  });
}

function renderTransactions() {
  byId("transactionRows").innerHTML = filteredRows().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 500).map((row) => {
    const cls = row.amount >= 0 ? "good" : "bad";
    return `<tr><td>${row.date}</td><td>${row.description}</td><td><span class="tag">${row.category}</span></td><td>${row.account}</td><td>${row.payee || "-"}</td><td>${row.project || "-"}</td><td class="amount ${cls}">${money(row.amount)}</td></tr>`;
  }).join("");
}

function renderAccounts() {
  const accounts = topBy(state.rows, (row) => row.account).sort((a, b) => b.latest.localeCompare(a.latest));
  byId("accountCards").innerHTML = accounts.map((item) => `<article class="card"><h3>${item.name}</h3><p>${item.count} операций • последнее движение ${item.latest}</p><strong>${money(item.balance)}</strong></article>`).join("");
}

function renderBudgets() {
  const cats = topBy(state.rows, (row) => row.category.split(":")[0], (row) => row.amount < 0).slice(0, 12);
  byId("budgetCards").innerHTML = cats.map((item) => {
    const limit = Math.ceil((item.total / Math.max(1, item.count)) * 8 / 1000) * 1000;
    const pct = Math.min(100, Math.round((item.total / Math.max(item.total, limit * item.count / 8)) * 100));
    return `<article class="card"><h3>${item.name}</h3><p>${item.count} операций • рекомендованный лимит ${money(limit)}</p><div class="bar"><i style="width:${pct}%"></i></div><strong>${money(item.total)}</strong></article>`;
  }).join("");
}

function renderAlimony() {
  const rows = state.rows.filter((row) => /алим/i.test(`${row.project} ${row.category} ${row.description}`));
  const total = rows.reduce((sum, row) => sum + Math.abs(row.amount), 0);
  byId("alimonyTotal").textContent = money(total);
  byId("alimonyCount").textContent = rows.length;
  byId("alimonyRows").innerHTML = rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100).map((row) => `<tr><td>${row.date}</td><td>${row.description}</td><td>${row.category}</td><td>${row.account}</td><td class="amount ${row.amount >= 0 ? "good" : "bad"}">${money(row.amount)}</td></tr>`).join("");
}

function renderShopping() {
  byId("shoppingList").innerHTML = state.shopping.map((item) => summaryRow(item.name, item.qty, money(item.price))).join("");
  byId("purchasePredictions").innerHTML = state.shopping.map((item) => summaryRow(item.name, `вероятно через ${item.days} дн.`, `~${money(item.price)}`)).join("");
}

function renderReports() {
  const cats = topBy(state.rows, (row) => row.category.split(":")[0], (row) => row.amount < 0).slice(0, 14);
  const projects = topBy(state.rows, (row) => row.project, (row) => row.project).slice(0, 14);
  byId("reportCategories").innerHTML = cats.map((item) => progressRow(item.name, item.count, item.total, cats[0]?.total || 1)).join("");
  byId("reportProjects").innerHTML = projects.map((item) => progressRow(item.name, item.count, item.total, projects[0]?.total || 1)).join("");
}

function setView(id) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === id));
  byId("pageTitle").textContent = views[id]?.[0] || "ФинПорядок";
  byId("pageSubtitle").textContent = views[id]?.[1] || "";
}

function parseCsvText(text) {
  const decoderText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = decoderText.split(/\r?\n/).filter(Boolean);
  const split = (line) => line.split(";");
  const head = split(lines[0]);
  const index = Object.fromEntries(head.map((h, i) => [h, i]));
  const dateIso = (value) => {
    const [d, m, y] = String(value || "").split("/");
    if (!d || !m || !y) return "";
    return `${Number(y) < 70 ? "20" : "19"}${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  };
  return lines.slice(1).map((line, i) => {
    const c = split(line);
    return {
      id: `import-${Date.now()}-${i}`,
      date: dateIso(c[index["Дата"]]),
      description: c[index["Описание"]] || "Операция",
      amount: Number((c[index["Сумма"]] || "0").replace(",", ".")) || 0,
      balance: Number((c[index["Баланс"]] || "0").replace(",", ".")) || 0,
      category: c[index["Категория"]] || "Без категории",
      account: c[index["Счет"]] || c[index["Счет списания"]] || c[index["Счет зачисления"]] || "Без счета",
      payee: c[index["Контрагент"]] || "",
      project: c[index["Проект"]] || "",
      from: c[index["Счет списания"]] || "",
      to: c[index["Счет зачисления"]] || ""
    };
  }).filter((row) => row.date);
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]");
  const jump = event.target.closest("[data-view-jump]");
  if (nav) setView(nav.dataset.view);
  if (jump) setView(jump.dataset.viewJump);
  if (event.target.closest("[data-close]")) byId("txDialog").close();
});

["searchInput", "accountFilter", "categoryFilter", "typeFilter"].forEach((id) => byId(id)?.addEventListener("input", renderTransactions));
["accountFilter", "categoryFilter", "typeFilter"].forEach((id) => byId(id)?.addEventListener("change", renderTransactions));
byId("clearFilters").addEventListener("click", () => {
  byId("searchInput").value = "";
  byId("accountFilter").value = "all";
  byId("categoryFilter").value = "all";
  byId("typeFilter").value = "all";
  renderTransactions();
});

byId("addTxBtn").addEventListener("click", () => {
  byId("txForm").date.value = new Date().toISOString().slice(0, 10);
  byId("txDialog").showModal();
});

byId("txForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  state.rows.push({ id: `manual-${Date.now()}`, date: data.date, description: data.description, amount: Number(data.amount), balance: 0, category: data.category, account: data.account, payee: "", project: "", from: Number(data.amount) < 0 ? data.account : "", to: Number(data.amount) >= 0 ? data.account : "" });
  saveRows();
  byId("txDialog").close();
  render();
});

byId("fileInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("windows-1251").decode(buffer);
  const rows = parseCsvText(text);
  state.rows = rows;
  saveRows();
  byId("importResult").textContent = `Загружено ${rows.length} операций из ${file.name}.`;
  render();
});

byId("parsePasteBtn").addEventListener("click", () => {
  const rows = parseCsvText(byId("pasteImport").value);
  if (!rows.length) {
    byId("importResult").textContent = "Не удалось распознать строки. Проверьте заголовки CSV.";
    return;
  }
  state.rows = rows;
  saveRows();
  byId("importResult").textContent = `Загружено ${rows.length} операций из вставленного CSV.`;
  render();
});

render();

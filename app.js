const storeKey = "finporyadok.state.v2";
const seedRows = window.ANDROMONEY_DATA?.rows || [];
const savedState = loadState();

const state = {
  rows: savedState.rows,
  accounts: savedState.accounts,
  shopping: [
    { name: "Молоко", qty: "2 л", days: 4, price: 92 },
    { name: "Корм", qty: "3 кг", days: 26, price: 1450 },
    { name: "Стиральный порошок", qty: "1 уп.", days: 32, price: 620 }
  ]
};
ensureRowIds();

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

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey) || "null");
    return {
      rows: saved?.rows?.length ? saved.rows : seedRows,
      accounts: Array.isArray(saved?.accounts) ? saved.accounts : []
    };
  } catch {}
  return { rows: seedRows, accounts: [] };
}

function saveState() {
  localStorage.setItem(storeKey, JSON.stringify({ rows: state.rows, accounts: state.accounts }));
}

function saveRows() {
  saveState();
}

function money(value) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value || 0);
}

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function typeOf(row) {
  if (row.from && row.to && Math.abs(row.amount) < 0.01) return "transfer";
  return row.amount >= 0 ? "income" : "expense";
}

function ensureRowIds() {
  state.rows.forEach((row, index) => {
    if (!row.id) row.id = `row-${index}-${row.date || "date"}-${Math.round(Number(row.amount) || 0)}`;
  });
}

function categoryRoot(row) {
  return String(row.category || "Без категории").split(":")[0];
}

const bankBrands = [
  { id: "sber", name: "Сбербанк", short: "Сб", tone: "#19a64a", text: "#ffffff", aliases: ["сбер", "sber"] },
  { id: "vtb", name: "ВТБ", short: "ВТБ", tone: "#155bd8", text: "#ffffff", aliases: ["втб", "vtb"] },
  { id: "sovcom", name: "Совкомбанк", short: "Сов", tone: "#1f5cb8", text: "#ffffff", aliases: ["совком", "halva", "халва"] },
  { id: "tbank", name: "Т-Банк", short: "Т", tone: "#ffd429", text: "#111827", aliases: ["т-банк", "т банк", "тбанк", "t-bank", "tbank", "тинькофф", "tinkoff", "т-барк"] },
  { id: "alfa", name: "Альфа-Банк", short: "А", tone: "#ef3124", text: "#ffffff", aliases: ["альфа", "alfa", "alpha"] },
  { id: "raiffeisen", name: "Райффайзен", short: "R", tone: "#ffe600", text: "#111827", aliases: ["райфф", "raiff", "raiffeisen"] },
  { id: "domrf", name: "Дом РФ", short: "ДР", tone: "#0f7a6f", text: "#ffffff", aliases: ["дом рф", "дом.рф", "domrf", "домрф"] },
  { id: "domclick", name: "Домклик", short: "ДК", tone: "#14b86f", text: "#ffffff", aliases: ["домклик", "domclick"] },
  { id: "yapay", name: "Яндекс Пэй", short: "Я", tone: "#fc3f1d", text: "#ffffff", aliases: ["яндекс пэй", "яндекс pay", "yandex pay", "yapay", "яндекс банк"] },
  { id: "wildberries", name: "Вайлдберриз банк", short: "WB", tone: "#a600ff", text: "#ffffff", aliases: ["вайлдбер", "wildberries", "wb банк", "wb"] },
  { id: "ozon", name: "Озон банк", short: "OZ", tone: "#005bff", text: "#ffffff", aliases: ["озон", "ozon"] }
];

function normalizeBrandText(value) {
  return String(value || "").toLowerCase().replace(/ё/g, "е").replace(/[._-]/g, " ").replace(/\s+/g, " ").trim();
}

function brandForAccount(accountName) {
  const normalized = normalizeBrandText(accountName);
  return bankBrands.find((brand) => brand.aliases.some((alias) => normalized.includes(normalizeBrandText(alias)))) || null;
}

function bankIcon(accountName) {
  const brand = brandForAccount(accountName);
  if (!brand) {
    return `<span class="bank-icon bank-icon--default" aria-hidden="true">₽</span>`;
  }
  return `<span class="bank-icon" style="--bank-bg:${brand.tone};--bank-fg:${brand.text}" title="${escapeHtml(brand.name)}" aria-label="${escapeHtml(brand.name)}">${escapeHtml(brand.short)}</span>`;
}

function accountPill(accountName) {
  const name = accountName || "-";
  const brand = brandForAccount(name);
  return `<span class="account-pill">${bankIcon(name)}<span>${escapeHtml(name)}</span>${brand ? `<small>${escapeHtml(brand.name)}</small>` : ""}</span>`;
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

function accountSummaries() {
  const map = new Map(topBy(state.rows, (row) => row.account).map((item) => [item.name, item]));
  topBy(state.rows, (row) => row.from || row.to).forEach((item) => {
    if (!item.name || item.name === "Без значения" || map.has(item.name)) return;
    map.set(item.name, item);
  });
  state.accounts.forEach((account) => {
    const name = account.name?.trim();
    if (!name) return;
    const existing = map.get(name);
    if (existing) {
      existing.type = account.type || existing.type;
      if (!existing.balance && account.balance) existing.balance = Number(account.balance) || 0;
      return;
    }
    map.set(name, {
      name,
      total: Math.abs(Number(account.balance) || 0),
      count: 0,
      latest: "создан вручную",
      balance: Number(account.balance) || 0,
      type: account.type || "Счет"
    });
  });
  return [...map.values()].sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    return a.name.localeCompare(b.name, "ru");
  });
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

  const accounts = accountSummaries().slice(0, 6);
  byId("accountSummary").innerHTML = accounts.map((item) => accountSummaryRow(item.name, `${item.count} операций`, money(item.balance))).join("");

  const cats = topBy(state.rows, categoryRoot, (row) => row.amount < 0).slice(0, 6);
  byId("categorySummary").innerHTML = cats.map((item) => progressRow(item.name, item.count, item.total, cats[0]?.total || 1)).join("");
}

function rowTemplate(row) {
  const kind = typeOf(row);
  const cls = row.amount >= 0 ? "good" : "bad";
  return `<tr class="clickable-row" data-row-id="${escapeHtml(row.id)}" tabindex="0">
    <td>${escapeHtml(row.date)}</td>
    <td>${escapeHtml(row.description || "Операция")}</td>
    <td><span class="tag">${escapeHtml(row.category || "Без категории")}</span></td>
    <td>${accountPill(row.account)}</td>
    <td>${escapeHtml(row.project || "-")}</td>
    <td class="amount ${cls}">${kind === "transfer" ? "0 ₽" : money(row.amount)}</td>
  </tr>`;
}

function summaryRow(title, sub, value) {
  return `<article class="row"><div><strong>${title}</strong><small>${sub}</small></div><b>${value}</b></article>`;
}

function accountSummaryRow(title, sub, value) {
  return `<article class="row account-row"><div><strong>${accountPill(title)}</strong><small>${sub}</small></div><b>${value}</b></article>`;
}

function progressRow(title, count, total, max) {
  const pct = Math.max(3, Math.round((total / max) * 100));
  return `<article class="row"><div><strong>${title}</strong><small>${count} операций • ${money(total)}</small><div class="bar"><i style="width:${pct}%"></i></div></div></article>`;
}

function renderFilters() {
  ensureAccountPicker();
  fillSelect("accountFilter", accountSummaries().map((x) => x.name));
  fillSelect("categoryFilter", topBy(state.rows, categoryRoot).map((x) => x.name));
  populateAccountSelect();
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
      && (category === "all" || categoryRoot(row) === category)
      && (type === "all" || typeOf(row) === type);
  });
}

function renderTransactions() {
  const rows = filteredRows().sort((a, b) => b.date.localeCompare(a.date));
  byId("transactionRows").innerHTML = rows.slice(0, 500).map((row) => {
    const cls = row.amount >= 0 ? "good" : "bad";
    return `<tr class="clickable-row" data-row-id="${escapeHtml(row.id)}" tabindex="0"><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.description)}</td><td><span class="tag">${escapeHtml(row.category)}</span></td><td>${accountPill(row.account)}</td><td>${escapeHtml(row.payee || "-")}</td><td>${escapeHtml(row.project || "-")}</td><td class="amount ${cls}">${money(row.amount)}</td></tr>`;
  }).join("");
  if (document.querySelector("#transactions.view.active")) {
    byId("pageSubtitle").textContent = `Найдено ${rows.length.toLocaleString("ru-RU")} операций. Нажмите на строку, чтобы открыть детали.`;
  }
}

function renderAccounts() {
  const accounts = accountSummaries();
  byId("accountCards").innerHTML = accounts.map((item) => `<article class="card account-card"><div class="account-card-title">${bankIcon(item.name)}<h3>${escapeHtml(item.name)}</h3></div><p>${escapeHtml(item.type || brandForAccount(item.name)?.name || "Счет")} • ${item.count} операций • ${escapeHtml(item.latest)}</p><strong>${money(item.balance)}</strong></article>`).join("");
}

function renderBudgets() {
  const cats = topBy(state.rows, categoryRoot, (row) => row.amount < 0).slice(0, 12);
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
  const cats = topBy(state.rows, categoryRoot, (row) => row.amount < 0).slice(0, 14);
  const projects = topBy(state.rows, (row) => row.project, (row) => row.project).slice(0, 14);
  byId("reportCategories").innerHTML = cats.map((item) => progressRow(item.name, item.count, item.total, cats[0]?.total || 1)).join("");
  byId("reportProjects").innerHTML = projects.map((item) => progressRow(item.name, item.count, item.total, projects[0]?.total || 1)).join("");
}

function populateAccountSelect() {
  ensureAccountPicker();
  const select = byId("txAccountSelect");
  if (!select) return;
  const current = select.value;
  const accounts = accountSummaries().map((item) => item.name).filter(Boolean);
  select.innerHTML = accounts.length
    ? accounts.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")
    : `<option value="Наличные">Наличные</option>`;
  if (accounts.includes(current)) select.value = current;
  updateAccountPreview();
}

function ensureAccountPicker() {
  const form = byId("txForm");
  if (!form) return;
  let select = byId("txAccountSelect");
  if (!select) {
    const current = form.elements.account;
    if (!current) return;
    select = document.createElement("select");
    select.name = "account";
    select.id = "txAccountSelect";
    select.required = true;
    select.value = current.value || "";
    current.replaceWith(select);
  }
  if (!byId("txAccountPreview")) {
    const preview = document.createElement("div");
    preview.id = "txAccountPreview";
    preview.className = "account-preview";
    select.closest("label")?.after(preview);
  }
  select.onchange = updateAccountPreview;
}

function updateAccountPreview() {
  const select = byId("txAccountSelect");
  const preview = byId("txAccountPreview");
  if (!select || !preview) return;
  preview.innerHTML = accountPill(select.value || "Наличные");
}

function showOperationDetails(id) {
  const row = state.rows.find((item) => String(item.id) === String(id));
  if (!row) return;
  const kind = typeOf(row);
  const detailRows = [
    ["Дата", row.date],
    ["Описание", row.description || "Операция"],
    ["Тип", kind === "income" ? "Доход" : kind === "expense" ? "Расход" : "Перевод"],
    ["Сумма", kind === "transfer" ? "0 ₽" : money(row.amount)],
    ["Категория", row.category || "Без категории"],
    ["Счет", row.account || "-"],
    ["Контрагент", row.payee || "-"],
    ["Проект", row.project || "-"],
    ["Счет списания", row.from || "-"],
    ["Счет зачисления", row.to || "-"],
    ["Баланс после операции", money(row.balance)],
    ["ID", row.id || "-"]
  ];
  byId("operationDetails").innerHTML = detailRows.map(([label, value]) => `<div class="detail-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  byId("detailDialog").showModal();
}

function setView(id) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === id));
  byId("pageTitle").textContent = views[id]?.[0] || "ФинПорядок";
  byId("pageSubtitle").textContent = views[id]?.[1] || "";
  if (id === "transactions") renderTransactions();
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
  const row = event.target.closest("[data-row-id]");
  if (nav) setView(nav.dataset.view);
  if (jump) setView(jump.dataset.viewJump);
  if (row) showOperationDetails(row.dataset.rowId);
  if (event.target.closest("[data-close]")) event.target.closest("dialog")?.close();
});

document.addEventListener("keydown", (event) => {
  const row = event.target.closest?.("[data-row-id]");
  if (row && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    showOperationDetails(row.dataset.rowId);
  }
});

byId("searchInput")?.addEventListener("input", () => {
  if (byId("searchInput").value.trim()) setView("transactions");
  renderTransactions();
});
["accountFilter", "categoryFilter", "typeFilter"].forEach((id) => byId(id)?.addEventListener("input", renderTransactions));
["accountFilter", "categoryFilter", "typeFilter"].forEach((id) => byId(id)?.addEventListener("change", renderTransactions));
byId("clearFilters").addEventListener("click", () => {
  byId("searchInput").value = "";
  byId("accountFilter").value = "all";
  byId("categoryFilter").value = "all";
  byId("typeFilter").value = "all";
  renderTransactions();
});

byId("addTxBtn").addEventListener("click", () => {
  populateAccountSelect();
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

byId("addAccountBtn")?.addEventListener("click", () => {
  byId("accountForm").reset();
  byId("accountDialog").showModal();
});

byId("accountForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const name = data.name.trim();
  if (!name) return;
  const existing = state.accounts.find((account) => account.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.type = data.type;
    existing.balance = Number(data.balance) || 0;
  } else {
    state.accounts.push({ id: `account-${Date.now()}`, name, type: data.type, balance: Number(data.balance) || 0 });
  }
  saveState();
  byId("accountDialog").close();
  render();
  setView("accounts");
});

byId("fileInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("windows-1251").decode(buffer);
  const rows = parseCsvText(text);
  state.rows = rows;
  ensureRowIds();
  saveState();
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
  ensureRowIds();
  saveState();
  byId("importResult").textContent = `Загружено ${rows.length} операций из вставленного CSV.`;
  render();
});

render();

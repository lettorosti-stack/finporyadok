const storeKey = "finporyadok.state.v2";
const seedRows = window.ANDROMONEY_DATA?.rows || [];
const savedState = loadState();

const state = {
  rows: savedState.rows,
  accounts: savedState.accounts,
  categories: savedState.categories,
  importArchive: savedState.importArchive,
  shopping: savedState.shopping.length ? savedState.shopping : [
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
      accounts: Array.isArray(saved?.accounts) ? saved.accounts : [],
      categories: Array.isArray(saved?.categories) ? saved.categories : [],
      importArchive: Array.isArray(saved?.importArchive) ? saved.importArchive : [],
      shopping: Array.isArray(saved?.shopping) ? saved.shopping : []
    };
  } catch {}
  return { rows: seedRows, accounts: [], categories: [], importArchive: [], shopping: [] };
}

function saveState() {
  localStorage.setItem(storeKey, JSON.stringify({ rows: state.rows, accounts: state.accounts, categories: state.categories, importArchive: state.importArchive, shopping: state.shopping }));
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

const categoryIcons = {
  home: { label: "Дом", tone: "#0f766e", svg: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10.5V20h11v-9.5"/><path d="M10 20v-6h4v6"/>' },
  build: { label: "Материалы", tone: "#b45309", svg: '<path d="M5 19 19 5"/><path d="m14 5 5 5"/><path d="M4 20h7"/><path d="M7 17l-2-2"/>' },
  utility: { label: "Коммуналка", tone: "#0284c7", svg: '<path d="M13 2 5 14h6l-2 8 10-14h-6z"/>' },
  car: { label: "Автомобиль", tone: "#334155", svg: '<path d="M5 13 7 7h10l2 6"/><path d="M4 13h16v5H4z"/><path d="M7 18v2"/><path d="M17 18v2"/><circle cx="8" cy="15.5" r="1"/><circle cx="16" cy="15.5" r="1"/>' },
  fuel: { label: "Бензин", tone: "#dc2626", svg: '<path d="M7 3h7v18H7z"/><path d="M9 7h3"/><path d="M14 8h2l2 2v7a2 2 0 0 0 4 0v-4l-2-2"/>' },
  service: { label: "ТО", tone: "#475569", svg: '<path d="M14.5 6.5 17 4l3 3-2.5 2.5"/><path d="m4 20 8-8"/><path d="m12 12 4 4"/><path d="M6 18l-2-2"/>' },
  credit: { label: "Кредит", tone: "#7c3aed", svg: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7 15h5"/>' },
  food: { label: "Продукты", tone: "#16a34a", svg: '<path d="M6 3v8"/><path d="M10 3v8"/><path d="M6 7h4"/><path d="M8 11v10"/><path d="M16 3v18"/><path d="M16 3c3 2 4 6 1 9"/>' },
  transport: { label: "Транспорт", tone: "#2563eb", svg: '<rect x="5" y="4" width="14" height="14" rx="3"/><path d="M8 18v2"/><path d="M16 18v2"/><path d="M8 8h8"/><circle cx="8.5" cy="14" r="1"/><circle cx="15.5" cy="14" r="1"/>' },
  health: { label: "Здоровье", tone: "#db2777", svg: '<path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 6.5-7 11-7 11z"/><path d="M12 8v6"/><path d="M9 11h6"/>' },
  education: { label: "Обучение", tone: "#4f46e5", svg: '<path d="m3 8 9-4 9 4-9 4z"/><path d="M7 10v5c3 2 7 2 10 0v-5"/>' },
  family: { label: "Семья", tone: "#e11d48", svg: '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3.5 20c.8-4 9.2-4 10 0"/><path d="M12.5 19c1-3 6.5-3 8 0"/>' },
  shopping: { label: "Покупки", tone: "#9333ea", svg: '<path d="M6 8h12l-1 13H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>' },
  income: { label: "Доход", tone: "#059669", svg: '<path d="M12 4v16"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>' },
  travel: { label: "Отдых", tone: "#0891b2", svg: '<path d="M4 16c5-5 11-5 16 0"/><path d="M12 4v12"/><path d="M8 8c2-3 6-3 8 0"/><path d="M8 21h8"/>' },
  entertainment: { label: "Развлечения", tone: "#f59e0b", svg: '<path d="M8 8h8l3 10H5z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M11 16h2"/>' },
  default: { label: "Категория", tone: "#64748b", svg: '<path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/><circle cx="7" cy="5" r="1"/><circle cx="7" cy="12" r="1"/><circle cx="7" cy="19" r="1"/>' }
};

const categoryRules = [
  ["home", ["дом мечта", "дом", "ремонт", "ипотека", "квартира", "аренда"]],
  ["build", ["строй", "строит", "материал", "краска", "плитка", "инструмент", "леруа", "петрович", "доска"]],
  ["utility", ["коммун", "жкх", "электр", "газ", "вода", "интернет", "связь", "телефон"]],
  ["car", ["авто", "машин", "парков", "штраф", "мойка"]],
  ["fuel", ["бенз", "топлив", "азс", "лукойл", "газпромнефть"]],
  ["service", ["сервис", "то", "ремонт авто", "шины", "резина", "запчаст", "страхов"]],
  ["credit", ["кредит", "заем", "долг", "ипотека", "платеж"]],
  ["food", ["продукт", "еда", "пятерочка", "перекресток", "магнит", "вкусвилл", "лента"]],
  ["transport", ["транспорт", "такси", "метро", "автобус", "яндекс go", "яндекс такси"]],
  ["health", ["здоров", "аптек", "врач", "медиц", "клиник"]],
  ["education", ["детский сад", "школ", "обуч", "курсы", "сад"]],
  ["family", ["семья", "алим", "дети", "мама", "подар"]],
  ["shopping", ["одеж", "wildberries", "вайлд", "ozon", "озон", "покуп"]],
  ["income", ["зарплат", "доход", "премия", "аренда квартиры"]],
  ["travel", ["отпуск", "отдых", "отель", "авиа", "жд", "тур"]],
  ["entertainment", ["развлеч", "кино", "кафе", "ресторан", "кофе"]]
];

const storeBrands = [
  { id: "pyaterochka", name: "Пятерочка", short: "5", tone: "#e31e24", text: "#ffffff", aliases: ["пятер", "5ka", "five"] },
  { id: "magnit", name: "Магнит", short: "М", tone: "#e30613", text: "#ffffff", aliases: ["магнит", "magnit"] },
  { id: "chizhik", name: "Чижик", short: "Ч", tone: "#ffd400", text: "#1f2937", aliases: ["чижик", "chizhik"] },
  { id: "svetofor", name: "Светофор", short: "С", tone: "#2f9e44", text: "#ffffff", aliases: ["светофор"] },
  { id: "fixprice", name: "FixPrice", short: "FP", tone: "#1d4ed8", text: "#ffffff", aliases: ["fix", "фикс"] },
  { id: "auchan", name: "Ашан", short: "А", tone: "#d71920", text: "#ffffff", aliases: ["ашан", "auchan"] },
  { id: "baucenter", name: "Бауцентр", short: "Б", tone: "#f97316", text: "#ffffff", aliases: ["бауцентр", "baucenter"] },
  { id: "lemanapro", name: "ЛеманаПро", short: "ЛП", tone: "#16a34a", text: "#ffffff", aliases: ["лемана", "leroy", "леруа", "lemanapro"] },
  { id: "lenta", name: "Лента", short: "Л", tone: "#0050a4", text: "#ffffff", aliases: ["лента", "lenta"] },
  { id: "vkusvill", name: "ВкусВилл", short: "ВВ", tone: "#70b62c", text: "#ffffff", aliases: ["вкусвилл", "vkusvill"] },
  { id: "perekr", name: "Перекресток", short: "П", tone: "#009846", text: "#ffffff", aliases: ["перекрест", "perekrestok"] },
  { id: "ozon", name: "Ozon", short: "OZ", tone: "#005bff", text: "#ffffff", aliases: ["озон", "ozon"] },
  { id: "wildberries", name: "Wildberries", short: "WB", tone: "#a600ff", text: "#ffffff", aliases: ["wildberries", "вайлд", "wb"] }
];

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

function categoryMeta(categoryName) {
  const root = String(categoryName || "Без категории").trim() || "Без категории";
  const saved = state.categories.find((item) => normalizeBrandText(item.name) === normalizeBrandText(root));
  if (saved) return { ...saved, name: root, icon: saved.icon || detectCategoryIcon(root), project: saved.project || "" };
  return { name: root, icon: detectCategoryIcon(root), project: defaultProjectForCategory(root) };
}

function detectCategoryIcon(categoryName) {
  const normalized = normalizeBrandText(categoryName);
  const match = categoryRules.find(([, aliases]) => aliases.some((alias) => normalized.includes(normalizeBrandText(alias))));
  return match?.[0] || "default";
}

function defaultProjectForCategory(categoryName) {
  const normalized = normalizeBrandText(categoryName);
  if (["строй", "материал", "ремонт", "коммун", "жкх", "электр", "газ", "вода"].some((word) => normalized.includes(word))) return "Дом Мечта";
  if (["авто", "машин", "бенз", "топлив", "азс", "кредит", "сервис", "то", "шины", "резина"].some((word) => normalized.includes(word))) return "Автомобиль";
  return "";
}

function categoryIcon(categoryName) {
  const meta = categoryMeta(categoryRoot({ category: categoryName }));
  const icon = categoryIcons[meta.icon] || categoryIcons.default;
  return `<span class="category-icon" style="--cat-bg:${icon.tone}" title="${escapeHtml(icon.label)}" aria-label="${escapeHtml(icon.label)}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon.svg}</svg></span>`;
}

function categoryPill(categoryName) {
  const name = categoryRoot({ category: categoryName });
  const meta = categoryMeta(name);
  return `<span class="category-pill">${categoryIcon(name)}<span>${escapeHtml(name)}</span>${meta.project ? `<small>${escapeHtml(meta.project)}</small>` : ""}</span>`;
}

function projectPill(projectName) {
  const name = projectName || "-";
  const iconId = normalizeBrandText(name).includes("автом") ? "car" : normalizeBrandText(name).includes("дом") ? "home" : "default";
  const icon = categoryIcons[iconId] || categoryIcons.default;
  return `<span class="project-pill"><span class="category-icon" style="--cat-bg:${icon.tone}" aria-hidden="true"><svg viewBox="0 0 24 24">${icon.svg}</svg></span><span>${escapeHtml(name)}</span></span>`;
}

function storeForName(storeName) {
  const normalized = normalizeBrandText(storeName);
  return storeBrands.find((brand) => brand.aliases.some((alias) => normalized.includes(normalizeBrandText(alias)))) || null;
}

function storeIcon(storeName) {
  const brand = storeForName(storeName);
  if (!brand) return `<span class="store-icon store-icon--default" aria-hidden="true">М</span>`;
  return `<span class="store-icon" style="--store-bg:${brand.tone};--store-fg:${brand.text}" title="${escapeHtml(brand.name)}" aria-label="${escapeHtml(brand.name)}">${escapeHtml(brand.short)}</span>`;
}

function storePill(storeName) {
  const name = storeName || "Магазин";
  return `<span class="store-pill">${storeIcon(name)}<span>${escapeHtml(name)}</span></span>`;
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
  renderImportArchive();
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
    <td>${categoryPill(row.category)}</td>
    <td>${accountPill(row.account)}</td>
    <td>${projectPill(row.project || categoryMeta(categoryRoot(row)).project)}</td>
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

function categoryProgressRow(item, max) {
  const pct = Math.max(3, Math.round((item.total / max) * 100));
  return `<article class="row category-row"><div><strong>${categoryPill(item.name)}</strong><small>${item.count} операций • ${money(item.total)}${item.project ? ` • ${escapeHtml(item.project)}` : ""}</small><div class="bar"><i style="width:${pct}%"></i></div></div></article>`;
}

function projectProgressRow(item, max) {
  const pct = Math.max(3, Math.round((item.total / max) * 100));
  return `<article class="row project-row"><div><strong>${projectPill(item.name)}</strong><small>${item.count} операций • ${money(item.total)}</small><div class="bar"><i style="width:${pct}%"></i></div></div></article>`;
}

function categorySummaries(filter = () => true) {
  const map = new Map(topBy(state.rows, categoryRoot, filter).map((item) => {
    const meta = categoryMeta(item.name);
    return [item.name, { ...item, icon: meta.icon, project: meta.project }];
  }));
  state.categories.forEach((category) => {
    const name = category.name?.trim();
    if (!name || map.has(name)) return;
    map.set(name, { name, total: 0, count: 0, latest: "создана вручную", balance: 0, icon: category.icon || detectCategoryIcon(name), project: category.project || "" });
  });
  return [...map.values()].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.name.localeCompare(b.name, "ru");
  });
}

function renderFilters() {
  ensureAccountPicker();
  ensureCategoryPicker();
  ensureProjectPicker();
  fillSelect("accountFilter", accountSummaries().map((x) => x.name));
  fillSelect("categoryFilter", categorySummaries().map((x) => x.name));
  populateAccountSelect();
  populateCategorySelect();
  populateProjectSelect();
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
    return `<tr class="clickable-row" data-row-id="${escapeHtml(row.id)}" tabindex="0"><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.description)}</td><td>${categoryPill(row.category)}</td><td>${accountPill(row.account)}</td><td>${escapeHtml(row.payee || "-")}</td><td>${projectPill(row.project || categoryMeta(categoryRoot(row)).project)}</td><td class="amount ${cls}">${money(row.amount)}</td></tr>`;
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
  const cats = categorySummaries((row) => row.amount < 0).slice(0, 12);
  byId("budgetCards").innerHTML = cats.map((item) => {
    const limit = Math.ceil((item.total / Math.max(1, item.count)) * 8 / 1000) * 1000;
    const pct = Math.min(100, Math.round((item.total / Math.max(item.total, limit * item.count / 8)) * 100));
    return `<article class="card category-card"><div class="category-card-title">${categoryIcon(item.name)}<h3>${escapeHtml(item.name)}</h3></div><p>${item.count} операций • ${item.project ? `проект ${escapeHtml(item.project)} • ` : ""}рекомендованный лимит ${money(limit)}</p><div class="bar"><i style="width:${pct}%"></i></div><strong>${money(item.total)}</strong></article>`;
  }).join("");
}

function renderAlimony() {
  const rows = state.rows.filter((row) => /алим/i.test(`${row.project} ${row.category} ${row.description}`));
  const total = rows.reduce((sum, row) => sum + Math.abs(row.amount), 0);
  byId("alimonyTotal").textContent = money(total);
  byId("alimonyCount").textContent = rows.length;
  byId("alimonyRows").innerHTML = rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100).map((row) => `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.description)}</td><td>${categoryPill(row.category)}</td><td>${accountPill(row.account)}</td><td class="amount ${row.amount >= 0 ? "good" : "bad"}">${money(row.amount)}</td></tr>`).join("");
}

function renderShopping() {
  byId("shoppingList").innerHTML = state.shopping.map((item) => shoppingRow(item)).join("");
  byId("purchasePredictions").innerHTML = state.shopping.map((item) => {
    const days = item.days || 30;
    return summaryRow(item.name, `${item.qty || "1 шт."} • ${storePill(item.store)}`, `~${money(item.price)} / ${days} дн.`);
  }).join("");
  renderShoppingAnalysis();
}

function shoppingRow(item) {
  const date = item.date ? ` • ${escapeHtml(item.date)}` : "";
  return `<article class="row shopping-row"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.qty || "1 шт.")}${date} • ${storePill(item.store)}</small></div><b>${money(item.price)}</b></article>`;
}

function renderShoppingAnalysis() {
  const target = byId("shoppingAnalysis");
  if (!target) return;
  const now = new Date();
  const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const rows = state.shopping.filter((item) => {
    if (!item.date) return false;
    const date = new Date(item.date);
    return date >= firstPrevMonth && date < firstThisMonth;
  });
  const best = new Map();
  rows.forEach((item) => {
    const key = normalizeBrandText(item.name);
    const current = best.get(key);
    if (!current || Number(item.price) < Number(current.price)) best.set(key, item);
  });
  const items = [...best.values()].sort((a, b) => Number(a.price) - Number(b.price)).slice(0, 12);
  target.innerHTML = items.length
    ? items.map((item) => summaryRow(item.name, `выгоднее всего: ${storePill(item.store)} • ${item.date}`, money(item.price))).join("")
    : `<article class="row"><div><strong>Нет истории за прошлый месяц</strong><small>Добавьте покупки с датой и магазином, чтобы увидеть сравнение цен.</small></div><b>-</b></article>`;
}

function renderReports() {
  const cats = categorySummaries((row) => row.amount < 0).slice(0, 14);
  const projects = topBy(state.rows, (row) => row.project, (row) => row.project).slice(0, 14);
  byId("reportCategories").innerHTML = cats.map((item) => categoryProgressRow(item, cats[0]?.total || 1)).join("");
  byId("reportProjects").innerHTML = projects.map((item) => projectProgressRow(item, projects[0]?.total || 1)).join("");
}

function renderImportArchive() {
  const target = byId("duplicateArchive");
  if (!target) return;
  target.innerHTML = state.importArchive.length
    ? state.importArchive.slice(0, 80).map((item) => `<article class="row duplicate-row"><div><strong>${escapeHtml(item.row.description || "Операция")}</strong><small>${escapeHtml(item.row.date)} • ${money(item.row.amount)} • ${escapeHtml(item.reason)} • ${escapeHtml(item.source || "импорт")}</small></div><b>Дубликат</b></article>`).join("")
    : `<article class="row"><div><strong>Архив пуст</strong><small>Здесь появятся операции из PDF/QR, которые уже есть в программе.</small></div><b>-</b></article>`;
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

function projectOptions() {
  const set = new Set(["", "Дом Мечта", "Автомобиль"]);
  state.rows.forEach((row) => { if (row.project) set.add(row.project); });
  state.categories.forEach((category) => { if (category.project) set.add(category.project); });
  return [...set];
}

function populateCategorySelect() {
  ensureCategoryPicker();
  const select = byId("txCategorySelect");
  if (!select) return;
  const current = select.value;
  const categories = categorySummaries().map((item) => item.name);
  select.innerHTML = categories.length
    ? categories.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")
    : `<option value="Без категории">Без категории</option>`;
  if (categories.includes(current)) select.value = current;
  updateCategoryPreview();
}

function populateProjectSelect() {
  ensureProjectPicker();
  const select = byId("txProjectSelect");
  const datalist = byId("projectOptions");
  const options = projectOptions();
  if (select) {
    const current = select.value;
    select.innerHTML = options.map((name) => `<option value="${escapeHtml(name)}">${name ? escapeHtml(name) : "Без проекта"}</option>`).join("");
    if (options.includes(current)) select.value = current;
  }
  if (datalist) datalist.innerHTML = options.filter(Boolean).map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
}

function populateCategoryIconSelect() {
  const select = byId("categoryIconSelect");
  if (!select) return;
  select.innerHTML = Object.entries(categoryIcons).map(([id, icon]) => `<option value="${id}">${escapeHtml(icon.label)}</option>`).join("");
}

function populateStoreSelect() {
  const select = byId("shoppingStoreSelect");
  if (!select) return;
  const used = new Set(state.shopping.map((item) => item.store).filter(Boolean));
  storeBrands.forEach((brand) => used.add(brand.name));
  select.innerHTML = [...used].map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
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

function ensureCategoryPicker() {
  const form = byId("txForm");
  if (!form) return;
  let select = byId("txCategorySelect");
  if (!select) {
    const current = form.elements.category;
    if (!current) return;
    select = document.createElement("select");
    select.name = "category";
    select.id = "txCategorySelect";
    select.required = true;
    select.value = current.value || "";
    current.replaceWith(select);
  }
  if (!byId("txCategoryPreview")) {
    const preview = document.createElement("div");
    preview.id = "txCategoryPreview";
    preview.className = "category-preview";
    select.closest("label")?.after(preview);
  }
  select.onchange = () => {
    const project = categoryMeta(select.value).project;
    if (project && byId("txProjectSelect")) byId("txProjectSelect").value = project;
    updateCategoryPreview();
  };
}

function ensureProjectPicker() {
  const form = byId("txForm");
  if (!form) return;
  let select = byId("txProjectSelect");
  if (select) return;
  const current = form.elements.project;
  if (!current) {
    const label = document.createElement("label");
    label.textContent = "Проект";
    select = document.createElement("select");
    select.name = "project";
    select.id = "txProjectSelect";
    label.append(select);
    byId("txCategoryPreview")?.after(label);
    return;
  }
  select = document.createElement("select");
  select.name = "project";
  select.id = "txProjectSelect";
  select.value = current.value || "";
  current.replaceWith(select);
}

function updateAccountPreview() {
  const select = byId("txAccountSelect");
  const preview = byId("txAccountPreview");
  if (!select || !preview) return;
  preview.innerHTML = accountPill(select.value || "Наличные");
}

function updateCategoryPreview() {
  const select = byId("txCategorySelect");
  const preview = byId("txCategoryPreview");
  if (!select || !preview) return;
  preview.innerHTML = categoryPill(select.value || "Без категории");
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

function normalizeOperationText(value) {
  return normalizeBrandText(value).replace(/[^a-zа-я0-9]+/g, " ").trim();
}

function operationFingerprint(row) {
  return [
    row.date || "",
    Math.round(Number(row.amount || 0) * 100),
    normalizeOperationText(row.account || ""),
    normalizeOperationText(row.description || "").slice(0, 36)
  ].join("|");
}

function findDuplicate(row) {
  const exact = operationFingerprint(row);
  const sameExact = state.rows.find((existing) => operationFingerprint(existing) === exact);
  if (sameExact) return { row: sameExact, reason: "полное совпадение даты, суммы, счета и описания" };
  const sameAmountDate = state.rows.find((existing) => existing.date === row.date && Math.abs(Number(existing.amount) - Number(row.amount)) < 0.01);
  if (sameAmountDate) return { row: sameAmountDate, reason: "совпали дата и сумма" };
  return null;
}

function importRows(rows, source) {
  const added = [];
  const duplicates = [];
  rows.forEach((row, index) => {
    const duplicate = findDuplicate(row);
    if (duplicate) {
      duplicates.push({
        id: `duplicate-${Date.now()}-${index}`,
        archivedAt: new Date().toISOString(),
        source,
        reason: duplicate.reason,
        existingId: duplicate.row.id || "",
        row
      });
      return;
    }
    row.id = row.id || `pdf-${Date.now()}-${index}`;
    row.importSource = source;
    added.push(row);
  });
  state.rows.push(...added);
  state.importArchive.unshift(...duplicates);
  saveState();
  render();
  return { added: added.length, duplicates: duplicates.length };
}

function decodePdfLiteral(value) {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, ch) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" }[ch] || ch))
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function decodePdfHex(hex) {
  const clean = hex.replace(/\s+/g, "");
  const bytes = [];
  for (let i = 0; i < clean.length; i += 2) bytes.push(parseInt(clean.slice(i, i + 2).padEnd(2, "0"), 16));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = "";
    for (let i = 2; i < bytes.length; i += 2) out += String.fromCharCode((bytes[i] << 8) + (bytes[i + 1] || 0));
    return out;
  }
  return new TextDecoder("windows-1251").decode(new Uint8Array(bytes));
}

function extractPdfTextOperators(text) {
  const chunks = [];
  text.replace(/\\((?:\\\\.|[^\\)])*\\)\\s*Tj/g, (match, body) => chunks.push(decodePdfLiteral(body)));
  text.replace(/<([0-9a-fA-F\\s]+)>\\s*Tj/g, (match, body) => chunks.push(decodePdfHex(body)));
  text.replace(/\\[((?:.|\\n)*?)\\]\\s*TJ/g, (match, body) => {
    body.replace(/\\((?:\\\\.|[^\\)])*\\)|<([0-9a-fA-F\\s]+)>/g, (part, hex) => {
      chunks.push(hex ? decodePdfHex(hex) : decodePdfLiteral(part.slice(1, -1)));
      return "";
    });
    return "";
  });
  return chunks.join("\n");
}

async function inflatePdfStream(bytes) {
  if (!("DecompressionStream" in window)) return "";
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
    const buffer = await new Response(stream).arrayBuffer();
    return new TextDecoder("windows-1251").decode(buffer);
  } catch {
    return "";
  }
}

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const raw = new TextDecoder("windows-1252").decode(bytes);
  const parts = [extractPdfTextOperators(raw)];
  const streamRegex = /<<(?:.|[\r\n])*?\/Filter\s*\/FlateDecode(?:.|[\r\n])*?>>\s*stream\r?\n/g;
  let match;
  while ((match = streamRegex.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    const inflated = await inflatePdfStream(bytes.slice(start, end));
    if (inflated) parts.push(extractPdfTextOperators(inflated), inflated);
  }
  return parts.join("\n").replace(/\u0000/g, "");
}

function parseStatementText(text, source) {
  const rows = [];
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const datePattern = /(\d{2})[./-](\d{2})[./-](\d{2,4})/;
  const amountPattern = /([+-]?\s?\d[\d\s]*[,.]\d{2}|[+-]?\s?\d[\d\s]{2,})(?:\s?₽|\s?RUB|\s?руб\.?)?/i;
  lines.forEach((line, index) => {
    const dateMatch = line.match(datePattern);
    if (!dateMatch) return;
    const amountMatches = [...line.matchAll(new RegExp(amountPattern, "gi"))];
    if (!amountMatches.length) return;
    const amountMatch = amountMatches.at(-1);
    const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
    const amount = Number(amountMatch[1].replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(amount)) return;
    const description = line
      .replace(datePattern, "")
      .replace(amountMatch[0], "")
      .replace(/\b(RUB|руб\.?|₽)\b/gi, "")
      .trim() || "Операция из PDF";
    rows.push({
      id: `pdf-${Date.now()}-${index}`,
      date: `${year}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`,
      description,
      amount,
      balance: 0,
      category: "Без категории",
      account: source.replace(/\.(pdf|png|jpg|jpeg|webp)$/i, "") || "PDF импорт",
      payee: "",
      project: "",
      from: amount < 0 ? source : "",
      to: amount >= 0 ? source : ""
    });
  });
  return rows;
}

function getQrParam(text, key) {
  const pipeMatch = text.match(new RegExp(`(?:^|[|&?])${key}=([^|&]+)`, "i"));
  if (!pipeMatch) return "";
  try {
    return decodeURIComponent(pipeMatch[1].replace(/\+/g, " "));
  } catch {
    return pipeMatch[1];
  }
}

function parseQrText(text, source) {
  const rows = parseStatementText(text, source);
  if (rows.length) return rows;
  const sumRaw = getQrParam(text, "Sum") || getQrParam(text, "s") || getQrParam(text, "amount");
  const name = getQrParam(text, "Name") || getQrParam(text, "payee") || getQrParam(text, "receiver");
  const purpose = getQrParam(text, "Purpose") || getQrParam(text, "purpose") || getQrParam(text, "comment");
  const dateParam = getQrParam(text, "Date") || getQrParam(text, "date");
  const amount = Number(String(sumRaw).replace(/\s/g, "").replace(",", ".")) / (String(sumRaw).includes(".") || String(sumRaw).includes(",") ? 1 : 100);
  if (!Number.isFinite(amount) || !amount) return [];
  let date = new Date().toISOString().slice(0, 10);
  const dateMatch = dateParam.match?.(/(\d{2})[./-](\d{2})[./-](\d{2,4})/);
  if (dateMatch) {
    const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
    date = `${year}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`;
  }
  return [{
    id: `qr-${Date.now()}`,
    date,
    description: purpose || name || "Операция из QR",
    amount: -Math.abs(amount),
    balance: 0,
    category: "Без категории",
    account: "QR импорт",
    payee: name || "",
    project: "",
    from: "QR импорт",
    to: ""
  }];
}

async function parseQrFile(file) {
  if (!("BarcodeDetector" in window)) throw new Error("QR-сканер не поддерживается в этом WebView. Загрузите PDF с текстовым слоем или обновите Android System WebView.");
  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  const bitmap = await createImageBitmap(file);
  const codes = await detector.detect(bitmap);
  return codes.map((code) => code.rawValue).join("\n");
}

async function detectQrFromBlob(blob) {
  if (!("BarcodeDetector" in window)) return "";
  try {
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const bitmap = await createImageBitmap(blob);
    const codes = await detector.detect(bitmap);
    return codes.map((code) => code.rawValue).join("\n");
  } catch {
    return "";
  }
}

function findJpegRanges(bytes) {
  const ranges = [];
  for (let i = 0; i < bytes.length - 3; i += 1) {
    if (bytes[i] !== 0xff || bytes[i + 1] !== 0xd8) continue;
    for (let j = i + 2; j < bytes.length - 1; j += 1) {
      if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
        ranges.push([i, j + 2]);
        i = j + 1;
        break;
      }
    }
  }
  return ranges;
}

function findPngRanges(bytes) {
  const ranges = [];
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const end = [0x49, 0x45, 0x4e, 0x44];
  for (let i = 0; i < bytes.length - sig.length; i += 1) {
    if (!sig.every((byte, offset) => bytes[i + offset] === byte)) continue;
    for (let j = i + sig.length; j < bytes.length - 8; j += 1) {
      if (end.every((byte, offset) => bytes[j + offset] === byte)) {
        ranges.push([i, j + 8]);
        i = j + 7;
        break;
      }
    }
  }
  return ranges;
}

async function extractQrTextFromPdfImages(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const imageBlobs = [
    ...findJpegRanges(bytes).map(([start, end]) => new Blob([bytes.slice(start, end)], { type: "image/jpeg" })),
    ...findPngRanges(bytes).map(([start, end]) => new Blob([bytes.slice(start, end)], { type: "image/png" }))
  ];
  const texts = [];
  for (const blob of imageBlobs.slice(0, 40)) {
    const text = await detectQrFromBlob(blob);
    if (text) texts.push(text);
  }
  return texts.join("\n");
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
  populateCategorySelect();
  populateProjectSelect();
  byId("txForm").date.value = new Date().toISOString().slice(0, 10);
  byId("txDialog").showModal();
});

byId("txForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  state.rows.push({ id: `manual-${Date.now()}`, date: data.date, description: data.description, amount: Number(data.amount), balance: 0, category: data.category, account: data.account, payee: "", project: data.project || categoryMeta(data.category).project || "", from: Number(data.amount) < 0 ? data.account : "", to: Number(data.amount) >= 0 ? data.account : "" });
  saveRows();
  byId("txDialog").close();
  render();
});

byId("addCategoryBtn")?.addEventListener("click", () => {
  populateCategoryIconSelect();
  byId("categoryForm").reset();
  byId("categoryDialog").showModal();
});

byId("categoryForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const name = data.name.trim();
  if (!name) return;
  const existing = state.categories.find((category) => normalizeBrandText(category.name) === normalizeBrandText(name));
  const payload = { id: existing?.id || `category-${Date.now()}`, name, project: data.project.trim(), icon: data.icon || detectCategoryIcon(name) };
  if (existing) Object.assign(existing, payload);
  else state.categories.push(payload);
  saveState();
  byId("categoryDialog").close();
  render();
});

byId("addShoppingBtn")?.addEventListener("click", () => {
  populateStoreSelect();
  byId("shoppingForm").reset();
  byId("shoppingForm").date.value = new Date().toISOString().slice(0, 10);
  byId("shoppingDialog").showModal();
});

byId("shoppingForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  state.shopping.unshift({ id: `shopping-${Date.now()}`, name: data.name.trim(), qty: data.qty || "1 шт.", store: data.store, price: Number(data.price) || 0, date: data.date, days: 30 });
  saveState();
  byId("shoppingDialog").close();
  renderShopping();
});

byId("exportBtn")?.addEventListener("click", exportData);

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    source: window.ANDROMONEY_DATA?.source || "Локальные данные",
    rows: state.rows,
    accounts: state.accounts,
    categories: state.categories,
    importArchive: state.importArchive,
    shopping: state.shopping
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `finporyadok-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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

byId("pdfInput")?.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  byId("importResult").textContent = `Читаю PDF ${file.name}...`;
  try {
    const text = await extractPdfText(file);
    const rows = parseStatementText(text, file.name);
    const source = `PDF: ${file.name}`;
    if (!rows.length) {
      byId("importResult").textContent = `В тексте PDF операций нет, проверяю QR подлинности внутри ${file.name}...`;
      const qrText = await extractQrTextFromPdfImages(file);
      if (qrText) {
        state.importArchive.unshift({
          id: `verified-${Date.now()}`,
          archivedAt: new Date().toISOString(),
          source: `PDF QR: ${file.name}`,
          reason: "QR подлинности найден, но операции в QR не хранятся",
          existingId: "",
          row: { date: new Date().toISOString().slice(0, 10), description: file.name, amount: 0, account: "PDF импорт", category: "Подлинность" }
        });
      }
    }
    if (!rows.length) {
      state.importArchive.unshift({
        id: `unparsed-${Date.now()}`,
        archivedAt: new Date().toISOString(),
        source: `PDF: ${file.name}`,
        reason: "файл проверен, текстовые операции не найдены",
        existingId: "",
        row: { date: new Date().toISOString().slice(0, 10), description: file.name, amount: 0, account: "PDF импорт", category: "Не распознано" }
      });
      saveState();
      renderImportArchive();
      byId("importResult").textContent = "PDF проверен, но операции не найдены. QR подтверждает подлинность выписки, но не содержит список операций. Нужен PDF с текстовой таблицей операций или CSV/Excel-выгрузка.";
      return;
    }
    const result = importRows(rows, source);
    byId("importResult").textContent = `${source} обработан: добавлено ${result.added}, дубликатов в архиве ${result.duplicates}.`;
  } catch (error) {
    byId("importResult").textContent = `PDF не распознан: ${error.message || error}`;
  } finally {
    event.target.value = "";
  }
});

byId("qrInput")?.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  byId("importResult").textContent = `Проверяю QR подлинности ${file.name}...`;
  try {
    const text = await parseQrFile(file);
    if (!text) {
      byId("importResult").textContent = "QR на изображении не найден. Попробуйте более четкий скриншот только с QR-кодом.";
      return;
    }
    state.importArchive.unshift({
      id: `qr-verified-${Date.now()}`,
      archivedAt: new Date().toISOString(),
      source: `QR: ${file.name}`,
      reason: "QR подлинности выписки распознан; операции из QR не импортируются",
      existingId: "",
      row: { date: new Date().toISOString().slice(0, 10), description: file.name, amount: 0, account: "QR подлинности", category: "Подлинность" }
    });
    saveState();
    renderImportArchive();
    byId("importResult").textContent = "QR подлинности распознан и сохранен в архиве импорта. Для добавления операций загрузите PDF с текстовой таблицей операций или CSV/Excel-выгрузку.";
  } catch (error) {
    byId("importResult").textContent = `QR не распознан: ${error.message || error}`;
  } finally {
    event.target.value = "";
  }
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

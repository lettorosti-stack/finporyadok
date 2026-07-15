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
reconcileTransfers();

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
  if (row.transferMatched || (row.from && row.to && Math.abs(row.amount) < 0.01)) return "transfer";
  return row.amount >= 0 ? "income" : "expense";
}

function transferDisplayAmount(row) {
  return money(Math.abs(Number(row.transferAmount ?? row.originalAmount ?? row.amount) || 0));
}

function isTransferLike(row) {
  const text = normalizeBrandText(`${row.description || ""} ${row.category || ""} ${row.payee || ""}`);
  return /(перевод|сбп|система быстрых платежей|межбанк|внутрибанк|пополнение|transfer|card2card|c2c)/.test(text);
}

function daysBetween(a, b) {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 999;
  return Math.abs(da - db) / 86400000;
}

function reconcileTransfers() {
  const rows = state.rows;
  const removed = new Set();
  for (let i = 0; i < rows.length; i += 1) {
    const outgoing = rows[i];
    if (removed.has(i) || typeOf(outgoing) === "transfer" || Number(outgoing.amount) >= 0 || !isTransferLike(outgoing)) continue;
    let best = -1;
    let bestDays = 999;
    for (let j = 0; j < rows.length; j += 1) {
      if (i === j || removed.has(j)) continue;
      const incoming = rows[j];
      if (typeOf(incoming) === "transfer" || Number(incoming.amount) <= 0 || !isTransferLike(incoming)) continue;
      if (normalizeBrandText(outgoing.account) === normalizeBrandText(incoming.account)) continue;
      if (Math.abs(Math.abs(Number(outgoing.amount)) - Math.abs(Number(incoming.amount))) > 0.01) continue;
      const diff = daysBetween(outgoing.date, incoming.date);
      if (diff > 3 || diff >= bestDays) continue;
      best = j;
      bestDays = diff;
    }
    if (best < 0) continue;
    const incoming = rows[best];
    const amount = Math.abs(Number(outgoing.amount));
    outgoing.originalAmount = outgoing.amount;
    outgoing.transferAmount = amount;
    outgoing.amount = 0;
    outgoing.from = outgoing.account || outgoing.from || "Счет списания";
    outgoing.to = incoming.account || incoming.to || "Счет зачисления";
    outgoing.account = `${outgoing.from} → ${outgoing.to}`;
    outgoing.category = "Переводы";
    outgoing.payee = incoming.account || outgoing.payee || "";
    outgoing.description = `Перевод: ${outgoing.from} → ${outgoing.to}`;
    outgoing.transferMatched = true;
    outgoing.matchedOperationId = incoming.id || "";
    outgoing.importSource = [outgoing.importSource, incoming.importSource].filter(Boolean).join(" + ");
    removed.add(best);
  }
  if (removed.size) state.rows = rows.filter((_, index) => !removed.has(index));
  return removed.size;
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
  ["salary", ["зарплат", "аванс", "оклад"]],
  ["income", ["доход", "премия", "зачисление", "пополнение"]],
  ["gift", ["подар"]],
  ["investment", ["инвест", "дивиденд", "процент"]],
  ["home", ["дом мечта", "дом", "ремонт", "квартира"]],
  ["rent", ["ипотека", "аренда", "жилье"]],
  ["home", ["строй", "строит", "материал", "краска", "плитка", "инструмент", "леруа", "лемана", "петрович", "доска"]],
  ["utilities", ["коммун", "жкх", "электр", "газ", "вода"]],
  ["internet", ["интернет", "wi-fi", "wifi"]],
  ["phone", ["связь", "телефон", "мобильн"]],
  ["car", ["авто", "машин", "парков", "штраф", "мойка"]],
  ["fuel", ["бенз", "топлив", "азс", "лукойл", "газпромнефть"]],
  ["car", ["сервис", "то", "ремонт авто", "шины", "резина", "запчаст"]],
  ["insurance", ["страхов"]],
  ["debt", ["кредит", "заем", "долг", "платеж"]],
  ["groceries", ["продукт", "еда", "пятерочка", "перекресток", "магнит", "вкусвилл", "лента"]],
  ["cafe", ["кафе", "ресторан", "кофе", "додо", "pizza"]],
  ["transport", ["транспорт", "такси", "метро", "автобус", "яндекс go", "яндекс такси"]],
  ["taxi", ["такси", "яндекс go", "яндекс такси"]],
  ["health", ["здоров", "аптек", "врач", "медиц", "клиник"]],
  ["pharmacy", ["аптек"]],
  ["education", ["школ", "обуч", "курсы"]],
  ["children", ["детский сад", "сад", "дети"]],
  ["children", ["семья", "алим", "мама"]],
  ["clothes", ["одеж"]],
  ["groceries", ["wildberries", "вайлд", "ozon", "озон", "покуп"]],
  ["travel", ["отпуск", "отдых", "отель", "авиа", "жд", "тур"]],
  ["entertainment", ["развлеч", "кино"]],
  ["subscriptions", ["подписк"]],
  ["taxes", ["налог"]],
  ["savings", ["накоп"]],
  ["transfer", ["перевод"]],
  ["cash", ["налич"]],
  ["card", ["карта"]],
  ["wallet", ["кошелек", "кошелёк"]]
];

const financeIconCatalog = {
  income: ["Доходы", "#16A34A"], salary: ["Зарплата", "#16A34A"], freelance: ["Подработка", "#22C55E"], investment: ["Инвестиционный доход", "#059669"], gift: ["Подарки", "#10B981"], "other-income": ["Прочие доходы", "#65A30D"],
  groceries: ["Продукты", "#F97316"], cafe: ["Кафе и рестораны", "#EA580C"], home: ["Дом", "#8B5CF6"], rent: ["Аренда и ипотека", "#7C3AED"], utilities: ["Коммунальные услуги", "#A855F7"], internet: ["Интернет", "#6366F1"], phone: ["Мобильная связь", "#4F46E5"],
  transport: ["Общественный транспорт", "#0EA5E9"], car: ["Автомобиль", "#0284C7"], fuel: ["Топливо", "#0369A1"], taxi: ["Такси", "#F59E0B"],
  health: ["Здоровье", "#EF4444"], pharmacy: ["Аптека", "#DC2626"], sport: ["Спорт", "#14B8A6"], education: ["Образование", "#2563EB"], children: ["Дети", "#EC4899"], clothes: ["Одежда", "#D946EF"], beauty: ["Красота", "#DB2777"], entertainment: ["Развлечения", "#F43F5E"], travel: ["Путешествия", "#06B6D4"], pets: ["Питомцы", "#A16207"], subscriptions: ["Подписки", "#9333EA"],
  insurance: ["Страхование", "#0F766E"], taxes: ["Налоги", "#475569"], debt: ["Кредиты и долги", "#B91C1C"], savings: ["Накопления", "#059669"], emergency: ["Резервный фонд", "#D97706"], goal: ["Финансовая цель", "#7C3AED"], transfer: ["Переводы", "#64748B"], cash: ["Наличные", "#15803D"], card: ["Банковская карта", "#1D4ED8"], wallet: ["Кошелёк", "#0F766E"], custom: ["Своя категория", "#64748B"]
};
const financeIconSymbols = {
  "income": "<g class=\"fi\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 17V7m-3 3 3-3 3 3m-6 4h6\"/></g>",
  "salary": "<g class=\"fi\"><rect x=\"3\" y=\"6\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M8 6V4h8v2m-4 4v5m-2-3h4m-8 4h12\"/></g>",
  "freelance": "<g class=\"fi\"><path d=\"m4 17 4.5-9 3 6 2.5-5 6 8\"/><path d=\"M3 20h18M6 13h12\"/></g>",
  "investment": "<g class=\"fi\"><path d=\"M4 19V9m5 10V5m5 14v-7m5 7V3\"/><path d=\"m3 14 6-6 5 3 6-7\"/></g>",
  "gift": "<g class=\"fi\"><rect x=\"3\" y=\"8\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M12 8v13M2 12h20M12 8C9 8 7 7 7 5.5S8 3 9.5 3C11.5 3 12 8 12 8Zm0 0c3 0 5-1 5-2.5S16 3 14.5 3C12.5 3 12 8 12 8Z\"/></g>",
  "other-income": "<g class=\"fi\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"8\" cy=\"12\" r=\".7\" fill=\"currentColor\"/><circle cx=\"12\" cy=\"12\" r=\".7\" fill=\"currentColor\"/><circle cx=\"16\" cy=\"12\" r=\".7\" fill=\"currentColor\"/></g>",
  "groceries": "<g class=\"fi\"><path d=\"M5 8h14l-1 13H6L5 8Z\"/><path d=\"M9 8a3 3 0 0 1 6 0M3 8h18M9 13h6m-6 4h4\"/></g>",
  "cafe": "<g class=\"fi\"><path d=\"M4 7h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V7Z\"/><path d=\"M17 9h2a2 2 0 0 1 0 4h-2M7 3v2m4-2v2m4-2v2M3 21h16\"/></g>",
  "home": "<g class=\"fi\"><path d=\"m3 11 9-8 9 8v10H3V11Z\"/><path d=\"M9 21v-7h6v7M7 10h2m6 0h2\"/></g>",
  "rent": "<g class=\"fi\"><path d=\"M4 21V7l8-4 8 4v14M8 21v-5h8v5M8 9h2m4 0h2m-8 4h2m4 0h2\"/><path d=\"M2 21h20\"/></g>",
  "utilities": "<g class=\"fi\"><path d=\"M13 2 5 14h7l-1 8 8-12h-7l1-8Z\"/><circle cx=\"12\" cy=\"12\" r=\"9\"/></g>",
  "internet": "<g class=\"fi\"><path d=\"M4 9a12 12 0 0 1 16 0M7 13a8 8 0 0 1 10 0m-7 4a3 3 0 0 1 4 0\"/><circle cx=\"12\" cy=\"20\" r=\"1\" fill=\"currentColor\"/></g>",
  "phone": "<g class=\"fi\"><rect x=\"6\" y=\"2\" width=\"12\" height=\"20\" rx=\"3\"/><path d=\"M9 5h6m-6 13h6\"/><circle cx=\"12\" cy=\"20\" r=\".5\" fill=\"currentColor\"/></g>",
  "transport": "<g class=\"fi\"><rect x=\"4\" y=\"3\" width=\"16\" height=\"17\" rx=\"4\"/><path d=\"M7 7h10v6H7V7Zm-3 7h16M8 20v2m8-2v2\"/><circle cx=\"8\" cy=\"16\" r=\"1\" fill=\"currentColor\"/><circle cx=\"16\" cy=\"16\" r=\"1\" fill=\"currentColor\"/></g>",
  "car": "<g class=\"fi\"><path d=\"m5 10 2-5h10l2 5 2 2v6H3v-6l2-2Z\"/><path d=\"M5 10h14M7 18v2m10-2v2\"/><circle cx=\"7\" cy=\"14\" r=\"1\"/><circle cx=\"17\" cy=\"14\" r=\"1\"/></g>",
  "fuel": "<g class=\"fi\"><rect x=\"4\" y=\"3\" width=\"11\" height=\"18\" rx=\"2\"/><path d=\"M7 6h5v5H7V6Zm8 1h3l2 3v8a2 2 0 0 1-4 0v-4m-12 1h11\"/></g>",
  "taxi": "<g class=\"fi\"><path d=\"m4 11 2-5h12l2 5 1 2v5H3v-5l1-2Z\"/><path d=\"M9 6V3h6v3m-11 5h16M7 18v2m10-2v2\"/><circle cx=\"7\" cy=\"14.5\" r=\"1\"/><circle cx=\"17\" cy=\"14.5\" r=\"1\"/></g>",
  "health": "<g class=\"fi\"><path d=\"M12 21S3 16 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12Z\"/><path d=\"M7 12h3l1-3 2 6 1-3h3\"/></g>",
  "pharmacy": "<g class=\"fi\"><path d=\"M8 3h8v5l3 4v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8l3-4V3Z\"/><path d=\"M8 7h8m-4 5v6m-3-3h6\"/></g>",
  "sport": "<g class=\"fi\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m12 3 3 4-1 4H9L8 7l4-4Zm-3 8-4 3m10-3 4 3M8 19l1-4 3-2 3 2 1 4\"/></g>",
  "education": "<g class=\"fi\"><path d=\"m2 9 10-5 10 5-10 5L2 9Z\"/><path d=\"M6 11v5c3 3 9 3 12 0v-5m4-2v7\"/></g>",
  "children": "<g class=\"fi\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8 10h.01M16 10h.01M8 15c2 2 6 2 8 0M9 4c0 2 2 3 4 2\"/></g>",
  "clothes": "<g class=\"fi\"><path d=\"m8 4-5 4 3 4 2-2v11h8V10l2 2 3-4-5-4c-1 2-7 2-8 0Z\"/><path d=\"M9 4c0 2 6 2 6 0\"/></g>",
  "beauty": "<g class=\"fi\"><path d=\"M8 10h8v11H8V10Zm2-7h4v7h-4V3Z\"/><path d=\"m10 3 4-1m-4 13h4\"/></g>",
  "entertainment": "<g class=\"fi\"><path d=\"M5 8h14l2 11a2 2 0 0 1-3 2l-4-4h-4l-4 4a2 2 0 0 1-3-2L5 8Z\"/><path d=\"M8 11v4m-2-2h4m6-2h.01M18 14h.01M9 8l1-4h4l1 4\"/></g>",
  "travel": "<g class=\"fi\"><path d=\"M10 3h4l1 5h4a2 2 0 0 1 2 2v10H3V10a2 2 0 0 1 2-2h4l1-5Z\"/><path d=\"M8 8v12m8-12v12M3 13h18\"/></g>",
  "pets": "<g class=\"fi\"><circle cx=\"7\" cy=\"8\" r=\"2\"/><circle cx=\"17\" cy=\"8\" r=\"2\"/><circle cx=\"5\" cy=\"13\" r=\"2\"/><circle cx=\"19\" cy=\"13\" r=\"2\"/><path d=\"M12 11c-3 0-6 4-5 7 1 3 4 1 5 1s4 2 5-1c1-3-2-7-5-7Z\"/></g>",
  "subscriptions": "<g class=\"fi\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"3\"/><path d=\"m10 9 5 3-5 3V9Z\"/></g>",
  "insurance": "<g class=\"fi\"><path d=\"M12 2 4 5v6c0 5 3 9 8 11 5-2 8-6 8-11V5l-8-3Z\"/><path d=\"m8 12 3 3 5-6\"/></g>",
  "taxes": "<g class=\"fi\"><path d=\"M6 2h10l3 3v17H6V2Z\"/><path d=\"M15 2v4h4M9 10h6m-6 4h6m-6 4h4\"/></g>",
  "debt": "<g class=\"fi\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9 9c0-2 6-2 6 0 0 3-6 2-6 5 0 2 6 2 6 0M12 6v12\"/></g>",
  "savings": "<g class=\"fi\"><path d=\"M4 10c0-4 4-7 9-7s8 3 8 7v6c0 3-3 5-6 5H8c-3 0-5-2-5-5v-4l1-2Z\"/><path d=\"M14 7c-1-1-3-1-4 0m11 4h-3m-12 8v3m10-3v3\"/><circle cx=\"16.5\" cy=\"10\" r=\".7\" fill=\"currentColor\"/></g>",
  "emergency": "<g class=\"fi\"><path d=\"M12 3 2 21h20L12 3Z\"/><path d=\"M12 9v6m0 3h.01\"/></g>",
  "goal": "<g class=\"fi\"><circle cx=\"11\" cy=\"13\" r=\"8\"/><circle cx=\"11\" cy=\"13\" r=\"4\"/><circle cx=\"11\" cy=\"13\" r=\"1\"/><path d=\"m13 11 7-7m-4 0h4v4\"/></g>",
  "transfer": "<g class=\"fi\"><path d=\"M4 8h14m-4-4 4 4-4 4M20 16H6m4-4-4 4 4 4\"/></g>",
  "cash": "<g class=\"fi\"><rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M6 8H5v1m13-1h1v1M6 16H5v-1m13 1h1v-1\"/></g>",
  "card": "<g class=\"fi\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"3\"/><path d=\"M2 9h20M6 15h5m-5 2h3\"/></g>",
  "wallet": "<g class=\"fi\"><path d=\"M3 6a3 3 0 0 1 3-3h12v4h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z\"/><path d=\"M3 7h15m0 4h4v5h-4a2.5 2.5 0 0 1 0-5Z\"/></g>",
  "custom": "<g class=\"fi\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8v8M8 12h8\"/></g>"
};

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
  const catalog = financeIconCatalog[meta.icon];
  if (catalog) {
    return `<span class="category-icon" style="--cat-bg:${catalog[1]}" title="${escapeHtml(catalog[0])}" aria-label="${escapeHtml(catalog[0])}"><svg viewBox="0 0 24 24" aria-hidden="true">${financeIconSymbols[meta.icon] || ""}</svg></span>`;
  }
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
    <td class="amount ${cls}">${kind === "transfer" ? transferDisplayAmount(row) : money(row.amount)}</td>
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
    return `<tr class="clickable-row" data-row-id="${escapeHtml(row.id)}" tabindex="0"><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.description)}</td><td>${categoryPill(row.category)}</td><td>${accountPill(row.account)}</td><td>${escapeHtml(row.payee || "-")}</td><td>${projectPill(row.project || categoryMeta(categoryRoot(row)).project)}</td><td class="amount ${cls}">${typeOf(row) === "transfer" ? transferDisplayAmount(row) : money(row.amount)}</td></tr>`;
  }).join("");
  if (document.querySelector("#transactions.view.active")) {
    byId("pageSubtitle").textContent = `Найдено ${rows.length.toLocaleString("ru-RU")} операций. Нажмите на строку, чтобы открыть детали.`;
  }
}

function renderAccounts() {
  const accounts = accountSummaries();
  byId("accountCards").innerHTML = accounts.map((item) => `<article class="card account-card clickable-card" data-account-open="${escapeHtml(item.name)}" tabindex="0" role="button"><div class="account-card-title">${bankIcon(item.name)}<h3>${escapeHtml(item.name)}</h3></div><p>${escapeHtml(item.type || brandForAccount(item.name)?.name || "Счет")} • ${item.count} операций • ${escapeHtml(item.latest)}</p><strong>${money(item.balance)}</strong><small>Нажмите, чтобы посмотреть операции</small></article>`).join("");
}

function renderBudgets() {
  const cats = categorySummaries((row) => row.amount < 0).slice(0, 12);
  byId("budgetCards").innerHTML = cats.map((item) => {
    const limit = Math.ceil((item.total / Math.max(1, item.count)) * 8 / 1000) * 1000;
    const pct = Math.min(100, Math.round((item.total / Math.max(item.total, limit * item.count / 8)) * 100));
    return `<article class="card category-card clickable-card" data-category-open="${escapeHtml(item.name)}" tabindex="0" role="button"><div class="category-card-title">${categoryIcon(item.name)}<h3>${escapeHtml(item.name)}</h3></div><p>${item.count} операций • ${item.project ? `проект ${escapeHtml(item.project)} • ` : ""}рекомендованный лимит ${money(limit)}</p><div class="bar"><i style="width:${pct}%"></i></div><strong>${money(item.total)}</strong><small>Нажмите, чтобы посмотреть операции</small></article>`;
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

function rowDate(row) {
  const date = new Date(`${row.date}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShortDate(date) {
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function formatPeriodDate(date) {
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function reportPeriodRange() {
  const value = byId("reportPeriod")?.value || "month";
  const dates = state.rows.map(rowDate).filter(Boolean).sort((a, b) => a - b);
  const end = dates.at(-1) || new Date();
  const start = new Date(end);
  const labels = { week: "Неделя", month: "Месяц", quarter: "Квартал", half: "Полугодие", year: "Год", all: "Все время" };
  if (value === "week") start.setDate(start.getDate() - 6);
  if (value === "month") start.setMonth(start.getMonth() - 1);
  if (value === "quarter") start.setMonth(start.getMonth() - 3);
  if (value === "half") start.setMonth(start.getMonth() - 6);
  if (value === "year") start.setFullYear(start.getFullYear() - 1);
  if (value === "all") start.setTime((dates[0] || end).getTime());
  return { value, label: labels[value] || labels.month, start, end };
}

function rowsInReportPeriod() {
  const range = reportPeriodRange();
  const rows = state.rows.filter((row) => {
    const date = rowDate(row);
    return date && date >= range.start && date <= range.end;
  });
  return { ...range, rows };
}

function summarizeRows(rows, key, filter = () => true) {
  const map = new Map();
  rows.filter(filter).forEach((row) => {
    const name = key(row) || "Без значения";
    const item = map.get(name) || { name, total: 0, count: 0 };
    item.total += Math.abs(Number(row.amount) || 0);
    item.count += 1;
    map.set(name, item);
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function reportShareRow(item, total, type) {
  const pct = total ? Math.round((item.total / total) * 100) : 0;
  const title = type === "project" ? projectPill(item.name) : categoryPill(item.name);
  return `<article class="row share-row"><div><strong>${title}</strong><small>${pct}% пирога • ${item.count} операций • ${money(item.total)}</small><div class="bar"><i style="width:${Math.max(2, pct)}%"></i></div></div><b>${pct}%</b></article>`;
}

function buildExpenseHistogram(rows, range) {
  const expenses = rows.filter((row) => row.amount < 0);
  const days = Math.max(1, Math.round((range.end - range.start) / 86400000) + 1);
  const mode = days <= 45 ? "day" : days <= 190 ? "week" : "month";
  const buckets = new Map();
  const bucketKey = (date) => {
    if (mode === "day") return date.toISOString().slice(0, 10);
    if (mode === "week") {
      const week = new Date(date);
      week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
      return week.toISOString().slice(0, 10);
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  };
  const bucketLabel = (key) => {
    const date = new Date(`${key}T00:00:00`);
    if (mode === "month") return date.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
    return formatShortDate(date);
  };
  expenses.forEach((row) => {
    const date = rowDate(row);
    if (!date) return;
    const key = bucketKey(date);
    buckets.set(key, (buckets.get(key) || 0) + Math.abs(row.amount));
  });
  const values = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, total]) => ({ key, label: bucketLabel(key), total }));
  const max = Math.max(...values.map((item) => item.total), 1);
  return values.map((item) => `<div class="histogram-bar" title="${escapeHtml(item.label)} • ${money(item.total)}"><i style="height:${Math.max(4, Math.round((item.total / max) * 100))}%"></i><span>${escapeHtml(item.label)}</span></div>`).join("");
}

function renderReports() {
  const range = rowsInReportPeriod();
  const expenses = range.rows.filter((row) => row.amount < 0);
  const totalExpense = expenses.reduce((sum, row) => sum + Math.abs(row.amount || 0), 0);
  const categories = summarizeRows(range.rows, categoryRoot, (row) => row.amount < 0).slice(0, 12);
  const projects = summarizeRows(range.rows, (row) => row.project || "", (row) => row.amount < 0 && row.project).slice(0, 12);
  const projectTotal = projects.reduce((sum, item) => sum + item.total, 0);
  byId("reportPeriodLabel").textContent = `${range.label}: ${formatPeriodDate(range.start)} - ${formatPeriodDate(range.end)}`;
  byId("reportTotalExpense").textContent = money(totalExpense);
  byId("reportExpenseCount").textContent = `${expenses.length.toLocaleString("ru-RU")} операций`;
  byId("reportProjectShare").textContent = `${totalExpense ? Math.round((projectTotal / totalExpense) * 100) : 0}%`;
  byId("reportProjectTotal").textContent = `${money(projectTotal)} из расходов`;
  byId("reportCategoryCount").textContent = categories.length.toLocaleString("ru-RU");
  byId("reportTrendTotal").textContent = money(totalExpense);
  byId("reportHistogram").innerHTML = buildExpenseHistogram(range.rows, range) || `<div class="empty-state">Нет расходов за выбранный период</div>`;
  byId("reportCategories").innerHTML = categories.length
    ? categories.map((item) => reportShareRow(item, totalExpense, "category")).join("")
    : `<article class="row"><div><strong>Нет расходов</strong><small>Выберите другой период или импортируйте операции.</small></div><b>-</b></article>`;
  byId("reportProjects").innerHTML = projects.length
    ? projects.map((item) => reportShareRow(item, totalExpense, "project")).join("")
    : `<article class="row"><div><strong>Нет проектов</strong><small>Привяжите категории или операции к проектам, чтобы увидеть их долю.</small></div><b>-</b></article>`;
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
  select.innerHTML = Object.entries(financeIconCatalog).map(([id, icon]) => `<option value="${id}">${escapeHtml(icon[0])}</option>`).join("");
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
    normalizeOperationText(row.authCode || ""),
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
  const matchedTransfers = reconcileTransfers();
  saveState();
  render();
  return { added: added.length, duplicates: duplicates.length, matchedTransfers };
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


function parsePdfCMaps(text) {
  const map = new Map();
  text.split(/\r?\n/).forEach((line) => {
    const range = line.match(/^\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/);
    if (range) {
      const [, a, b, c] = range;
      const start = parseInt(a, 16);
      const end = parseInt(b, 16);
      const dst = parseInt(c, 16);
      if (Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(dst) && end >= start && end - start < 10000) {
        for (let code = start; code <= end; code += 1) map.set(code, String.fromCodePoint(dst + code - start));
      }
      return;
    }
    const single = line.match(/^\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/);
    if (!single) return;
    const [, a, b] = single;
    const code = parseInt(a, 16);
    const dst = parseInt(b, 16);
    if (Number.isFinite(code) && Number.isFinite(dst)) map.set(code, String.fromCodePoint(dst));
  });
  return map;
}

function parsePdfCMapsLegacy(text) {
  const map = new Map();
  text.replace(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g, (_, a, b, c) => {
    const start = parseInt(a, 16);
    const end = parseInt(b, 16);
    const dst = parseInt(c, 16);
    if (Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(dst) && end >= start && end - start < 10000) {
      for (let code = start; code <= end; code += 1) map.set(code, String.fromCodePoint(dst + code - start));
    }
    return "";
  });
  text.replace(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g, (_, a, b) => {
    const code = parseInt(a, 16);
    const dst = parseInt(b, 16);
    if (Number.isFinite(code) && Number.isFinite(dst)) map.set(code, String.fromCodePoint(dst));
    return "";
  });
  return map;
}

function pdfLiteralBytes(value) {
  const bytes = [];
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch !== "\\") {
      bytes.push(ch.charCodeAt(0) & 255);
      continue;
    }
    const next = value[++i] || "";
    if (/[0-7]/.test(next)) {
      let oct = next;
      for (let n = 0; n < 2 && /[0-7]/.test(value[i + 1] || ""); n += 1) oct += value[++i];
      bytes.push(parseInt(oct, 8) & 255);
    } else {
      const map = { n: 10, r: 13, t: 9, b: 8, f: 12, "(": 40, ")": 41, "\\": 92 };
      bytes.push((map[next] ?? next.charCodeAt(0)) & 255);
    }
  }
  return bytes;
}

function decodePdfCMapBytes(bytes, cmap) {
  if (!cmap?.size) return "";
  let out = "";
  for (let i = 0; i < bytes.length; i += 2) {
    const code = (bytes[i] << 8) + (bytes[i + 1] || 0);
    out += cmap.get(code) || (code >= 32 && code < 127 ? String.fromCharCode(code) : "");
  }
  return out;
}

function extractPdfTextOperatorsWithCMap(text, cmap) {
  const chunks = [];
  const pushLiteral = (literal) => {
    const bytes = pdfLiteralBytes(literal);
    const decoded = decodePdfCMapBytes(bytes, cmap) || decodePdfLiteral(literal);
    if (decoded.trim()) chunks.push(decoded);
  };
  text.replace(/\(((?:\\.|[^\)])*)\)\s*Tj/g, (_, body) => { pushLiteral(body); return ""; });
  text.replace(/\[((?:.|\n)*?)\]\s*TJ/g, (_, body) => {
    let line = "";
    body.replace(/\(((?:\\.|[^\)])*)\)|<([0-9a-fA-F\s]+)>/g, (_, lit, hex) => {
      if (hex) line += decodePdfCMapBytes(hex.trim().match(/[0-9a-fA-F]{2}/g)?.map((x) => parseInt(x, 16)) || [], cmap) || decodePdfHex(hex);
      else line += decodePdfCMapBytes(pdfLiteralBytes(lit), cmap) || decodePdfLiteral(lit);
      return "";
    });
    if (line.trim()) chunks.push(line);
    return "";
  });
  return chunks.join("\n");
}

async function inflatePdfStream(bytes) {
  if (!("DecompressionStream" in window)) return "";
  let start = 0;
  let end = bytes.length;
  while (start < end && (bytes[start] === 10 || bytes[start] === 13)) start += 1;
  while (end > start && (bytes[end - 1] === 10 || bytes[end - 1] === 13)) end -= 1;
  const clean = bytes.slice(start, end);
  for (const format of ["deflate", "deflate-raw"]) {
    try {
      const stream = new Blob([clean]).stream().pipeThrough(new DecompressionStream(format));
      const buffer = await new Response(stream).arrayBuffer();
      const inflated = new Uint8Array(buffer);
      let out = "";
      for (let i = 0; i < inflated.length; i += 8192) {
        out += String.fromCharCode(...inflated.slice(i, i + 8192));
      }
      if (out) return out;
    } catch {
      // Try the next deflate flavor.
    }
  }
  return "";
}

async function extractPdfTextLegacy(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const raw = new TextDecoder("windows-1252").decode(bytes);
  const streams = [];
  const streamRegex = /<<(?:.|[\r\n])*?\/Filter\s*\/FlateDecode(?:.|[\r\n])*?>>\s*stream\r?\n/g;
  let match;
  while ((match = streamRegex.exec(raw))) {
    if (/\/Subtype\s*\/Image|\/BitsPerComponent|\/ColorSpace/.test(match[0])) continue;
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    const inflated = await inflatePdfStream(bytes.slice(start, end));
    if (inflated && (/begincmap|beginbfchar|beginbfrange|\bTj\b|\bTJ\b|BT|ET/.test(inflated))) streams.push(inflated);
  }
  const cmap = new Map();
  streams.forEach((stream) => {
    for (const [key, value] of parsePdfCMaps(stream)) cmap.set(key, value);
  });
  const parts = [
    extractPdfTextOperatorsWithCMap(raw, cmap),
    extractPdfTextOperators(raw),
    ...streams.flatMap((stream) => [extractPdfTextOperatorsWithCMap(stream, cmap), extractPdfTextOperators(stream)])
  ];
  return parts.join("\n").replace(/\u0000/g, "").replace(/\u00a0/g, " ");
}

async function loadPdfJs() {
  if (window.pdfjsLib?.getDocument) return window.pdfjsLib;

  const existing = document.querySelector('script[data-finporyadok-pdfjs="1"]');
  if (existing) {
    await new Promise((resolve, reject) => {
      if (window.pdfjsLib?.getDocument) return resolve();
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
    });
    return window.pdfjsLib;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.dataset.finporyadokPdfjs = "1";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Не удалось загрузить модуль PDF.js"));
    document.head.append(script);
  });

  if (!window.pdfjsLib?.getDocument) throw new Error("PDF.js не инициализирован");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return window.pdfjsLib;
}

async function extractPdfTextWithPdfJs(file) {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent({ normalizeWhitespace: true });
    const items = content.items || [];
    const lines = [];
    let currentLine = [];
    let previousY = null;

    items.forEach((item) => {
      const value = String(item.str || "").trim();
      if (!value) return;
      const y = Array.isArray(item.transform) ? Math.round(item.transform[5]) : null;

      if (previousY !== null && y !== null && Math.abs(y - previousY) > 3 && currentLine.length) {
        lines.push(currentLine.join(" "));
        currentLine = [];
      }

      currentLine.push(value);
      previousY = y;
    });

    if (currentLine.length) lines.push(currentLine.join(" "));
    pages.push(`--- Страница ${pageNumber} из ${pdf.numPages} ---\n${lines.join("\n")}`);
    page.cleanup?.();
  }

  pdf.cleanup?.();
  pdf.destroy?.();
  return pages.join("\n");
}

async function extractPdfText(file) {
  try {
    const text = await extractPdfTextWithPdfJs(file);
    if (text.trim()) return text;
  } catch (error) {
    console.warn("PDF.js недоступен, используется встроенный резервный разбор PDF:", error);
  }
  return extractPdfTextLegacy(file);
}

function parseMoneyText(value) {
  const text = String(value || "").replace(/\s/g, "").replace(",", ".");
  const sign = text.startsWith("+") ? 1 : -1;
  const number = Number(text.replace(/^[+-]/, "").replace(/[₽ррубRUB]+/gi, ""));
  if (!Number.isFinite(number)) return null;
  return sign * Math.abs(number);
}

function looksLikeDate(value) {
  return /^\d{2}[./-]\d{2}[./-]\d{4}$/.test(String(value || "").trim());
}

function looksLikeTime(value) {
  return /^\d{2}:\d{2}$/.test(String(value || "").trim());
}

function looksLikeAmount(value) {
  return /^[+-]?\s?\d[\d\s]*[,.]\d{2}$/.test(String(value || "").trim());
}

function parseBankDate(value) {
  const match = String(value || "").trim().match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function guessStatementCategory(description, amount) {
  const text = normalizeBrandText(description);
  if (amount > 0 && /(кэшбек|кэшбэк|cashback|пополнение|зачисление|зарплат|процент|возврат)/.test(text)) return amount > 0 && /кэшбек|кэшбэк|cashback/.test(text) ? "Кэшбэк" : "Доходы";
  if (/перевод|сбп|система быстрых платежей|внутрибанковский|банковский перевод/.test(text)) return "Переводы";
  if (/пятероч|pyaterochka|magnit|магнит|svetofor|светофор|ашан|auchan|lenta|лента|перекрест|vkusvill|вкусвилл|продукт/.test(text)) return "Продукты";
  if (/azs|rusoil|gazprom|лукойл|lukoil|топлив|бенз|заправ/.test(text)) return "Бензин";
  if (/dodo|pizza|kafe|stolovaya|кафе|coffee|кофе|restaurant|ресторан|столов/.test(text)) return "Кафе";
  if (/whoosh|такси|taxi|metro|транспорт|автобус/.test(text)) return "Транспорт";
  if (/apteka|аптек|медиц|clinic|клиник/.test(text)) return "Здоровье";
  if (/ozon|wildberries|wb|market|магазин|оплата в/.test(text)) return "Покупки";
  return amount >= 0 ? "Доходы" : "Без категории";
}

function tbankRow(date, processingDate, amountText, description, card, index) {
  const amount = parseMoneyText(amountText);
  const operationDate = parseBankDate(date);
  if (amount === null || !operationDate) return null;
  const cleanDescription = String(description || "")
    .replace(/\s+/g, " ")
    .replace(/АО «ТБанк».*/i, "")
    .replace(/Дата и времяоперации.*/i, "")
    .replace(/С уважением.*/i, "")
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-zа-я])([A-ZА-Я])/g, "$1 $2")
    .replace(/([A-Za-zА-Яа-я])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-zА-Яа-я])/g, "$1 $2")
    .replace(/([а-я])с договора/gi, "$1 с договора")
    .trim() || "Операция Т-Банка";
  const cardSuffix = /^\d{4}$/.test(card) ? card : "";
  const account = cardSuffix ? `Т-Банк •• ${cardSuffix}` : "Т-Банк";
  return {
    id: `tbank-pdf-${Date.now()}-${index}`,
    date: operationDate,
    description: cleanDescription,
    amount,
    balance: 0,
    category: guessStatementCategory(cleanDescription, amount),
    account,
    payee: cleanDescription.replace(/^(Оплата в|Пополнение\.?|Внешний|Внутрибанковский)\s*/i, "").trim(),
    project: "",
    from: amount < 0 ? account : "",
    to: amount >= 0 ? account : "",
    processingDate: parseBankDate(processingDate),
    card: cardSuffix
  };
}

function parseTbankStatementText(text, source) {
  if (!/ТБАНК|Т-Банк|Tinkoff|Тинькофф|Справка о движении средств/i.test(text)) return [];
  const lines = text.split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const rows = [];
  const seen = new Set();
  const pushRow = (row) => {
    if (!row) return;
    const key = [row.date, row.processingDate, row.amount, normalizeOperationText(row.description).replace(/\s/g, ""), row.card].join("|");
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  for (let i = 0; i < lines.length - 8; i += 1) {
    if (!looksLikeDate(lines[i]) || !looksLikeTime(lines[i + 1]) || !looksLikeDate(lines[i + 2]) || !looksLikeTime(lines[i + 3])) continue;
    if (!looksLikeAmount(lines[i + 4]) || !/^₽|RUB|руб\.?$/i.test(lines[i + 5])) continue;
    const descriptionParts = [];
    let card = "";
    let j = i + 8;
    while (j < lines.length) {
      const cardMatch = lines[j].match(/^(\d{4}|—)$/) || lines[j].match(/^(\d{4}|—)\s+(?=АО «ТБанк»|С уважением|Дата и времяоперации)/i);
      if (cardMatch) {
        card = cardMatch[1];
        break;
      }
      if (looksLikeDate(lines[j]) && looksLikeTime(lines[j + 1] || "")) break;
      descriptionParts.push(lines[j]);
      j += 1;
    }
    if (!card) continue;
    pushRow(tbankRow(lines[i], lines[i + 2], lines[i + 6], descriptionParts.join(" "), card, rows.length));
    i = j;
  }

  const compact = lines.join("");
  const rowRegex = /(\d{2}\.\d{2}\.\d{4})(\d{2}:\d{2})(\d{2}\.\d{2}\.\d{4})(\d{2}:\d{2})([+-]\d[\d\s]*[,.]\d{2})\s*₽([+-]\d[\d\s]*[,.]\d{2})\s*₽(.+?)(\d{4}|—)(?=\d{2}\.\d{2}\.\d{4}\d{2}:\d{2}|[₽\d\s,.]*(?:Пополнения:|Расходы:|С уважением)|АО «ТБанк»|Дата и времяоперации|$)/g;
  let match;
  while ((match = rowRegex.exec(compact))) {
    pushRow(tbankRow(match[1], match[3], match[6], match[7], match[8], rows.length));
  }
  return rows;
}

function parseSberStatementText(text, source) {
  if (!/СберБанк|Сбербанк|Расшифровка операций/i.test(text)) return [];
  const lines = text.split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const accountMatch = text.match(/(?:Visa|Mastercard|МИР|Mir)?\s*[^\\n]*\*\*+\s*(\d{4})/i);
  const account = accountMatch ? `Сбербанк •• ${accountMatch[1]}` : "Сбербанк";
  const rows = [];
  for (let i = 0; i < lines.length - 5; i += 1) {
    if (!looksLikeDate(lines[i]) || !looksLikeTime(lines[i + 1])) continue;
    const category = lines[i + 2];
    const amountLine = lines[i + 3];
    const processingDate = lines[i + 4];
    const authCode = lines[i + 5];
    const description = lines[i + 6] || category;
    if (!looksLikeAmount(amountLine) || !looksLikeDate(processingDate) || !/^\d{4,8}$/.test(authCode)) continue;
    const [day, month, year] = lines[i].split(".");
    const amount = parseMoneyText(amountLine);
    if (amount === null) continue;
    rows.push({
      id: `sber-pdf-${Date.now()}-${rows.length}`,
      date: `${year}-${month}-${day}`,
      description,
      amount,
      balance: 0,
      category: category || "Без категории",
      account,
      payee: description.replace(/\.?\s*Операция по карте.*$/i, ""),
      project: "",
      from: amount < 0 ? account : "",
      to: amount >= 0 ? account : "",
      authCode,
      processingDate
    });
    i += 5;
  }
  return rows;
}

function parseAlfaStatementText(text, source) {
  if (!/АЛЬФА-БАНК|Альфа-Банк|Выписка по счету/i.test(text)) return [];

  const accountNumber = (text.match(/Номер\s+счета\s+(\d{12,})/i) || [])[1] || "";
  const account = accountNumber
    ? `Альфа-Банк •• ${accountNumber.slice(-4)}`
    : "Альфа-Банк";

  // В выписках Альфа-Банка первая операция иногда переносится на две строки:
  // описание заканчивается на одной строке, а сумма находится на следующей.
  // Поэтому сначала объединяем строки таблицы в единый нормализованный текст.
  const tableStart = text.search(/Операции\s+по\s+счету/i);
  const tableText = (tableStart >= 0 ? text.slice(tableStart) : text)
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, " ")
    .trim();

  const rows = [];
  const seen = new Set();
  const operationRegex = /(\d{2}\.\d{2}\.\d{4})\s+([A-ZА-Я0-9-]{6,})\s+(.+?)\s+(-?\s*\d[\d ]*[,.]\d{2})\s*RUR(?=\s+\d{2}\.\d{2}\.\d{4}\s+[A-ZА-Я0-9-]{6,}|\s*$)/gi;
  let match;

  while ((match = operationRegex.exec(tableText))) {
    const date = parseBankDate(match[1]);
    const operationCode = match[2];
    const description = match[3]
      .replace(/\s+/g, " ")
      .replace(/\s*Страница\s+\d+\s+из\s+\d+.*$/i, "")
      .trim();
    const absoluteAmount = Number(match[4].replace(/\s/g, "").replace(",", "."));
    if (!date || !Number.isFinite(absoluteAmount)) continue;

    let amount = Math.abs(absoluteAmount);
    if (/уменьшение|списание|комисси|выдача|расход|перевод со счета/i.test(description) || /^\s*-/.test(match[4])) {
      amount = -Math.abs(absoluteAmount);
    }

    const key = `${date}|${operationCode}|${amount}|${normalizeOperationText(description)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const isInterest = /выплата\s+проц|процент/i.test(description);
    const isDeposit = /депозит|вклад/i.test(description);
    rows.push({
      id: `alfa-pdf-${Date.now()}-${rows.length}`,
      date,
      description,
      amount,
      balance: 0,
      category: isInterest ? "Проценты по вкладу" : isDeposit ? "Вклады и накопления" : guessStatementCategory(description, amount),
      account,
      payee: "Альфа-Банк",
      project: "",
      from: amount < 0 ? account : "",
      to: amount >= 0 ? account : "",
      authCode: operationCode
    });
  }

  return rows;
}

function parseStatementText(text, source) {
  const alfaRows = parseAlfaStatementText(text, source);
  if (alfaRows.length) return alfaRows;
  const sberRows = parseSberStatementText(text, source);
  if (sberRows.length) return sberRows;
  const tbankRows = parseTbankStatementText(text, source);
  if (tbankRows.length) return tbankRows;
  const rows = [];
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const datePattern = /(\d{2})[./-](\d{2})[./-](\d{2,4})/;
  const amountPattern = /([+-]?\s?\d[\d\s]*[,.]\d{2})(?:\s?₽|\s?RUB|\s?руб\.?)?/i;
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
    if (description === "Операция из PDF" || /^(исх|тел|дата|номер|сумма|остаток|движение средств)/i.test(description)) return;
    rows.push({
      id: `pdf-${Date.now()}-${index}`,
      date: `${year}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`,
      description,
      amount,
      balance: 0,
      category: guessStatementCategory(description, amount),
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
  const accountCard = event.target.closest("[data-account-open]");
  const categoryCard = event.target.closest("[data-category-open]");
  if (nav) setView(nav.dataset.view);
  if (jump) setView(jump.dataset.viewJump);
  if (row) showOperationDetails(row.dataset.rowId);
  if (accountCard) {
    setView("transactions");
    byId("accountFilter").value = accountCard.dataset.accountOpen;
    byId("categoryFilter").value = "all";
    renderTransactions();
  }
  if (categoryCard) {
    setView("transactions");
    byId("categoryFilter").value = categoryCard.dataset.categoryOpen;
    byId("accountFilter").value = "all";
    renderTransactions();
  }
  if (event.target.closest("[data-close]")) event.target.closest("dialog")?.close();
});

document.addEventListener("keydown", (event) => {
  const row = event.target.closest?.("[data-row-id]");
  const accountCard = event.target.closest?.("[data-account-open]");
  const categoryCard = event.target.closest?.("[data-category-open]");
  if (row && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    showOperationDetails(row.dataset.rowId);
  }
  if (accountCard && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    accountCard.click();
  }
  if (categoryCard && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    categoryCard.click();
  }
});

byId("searchInput")?.addEventListener("input", () => {
  if (byId("searchInput").value.trim()) setView("transactions");
  renderTransactions();
});
["accountFilter", "categoryFilter", "typeFilter"].forEach((id) => byId(id)?.addEventListener("input", renderTransactions));
["accountFilter", "categoryFilter", "typeFilter"].forEach((id) => byId(id)?.addEventListener("change", renderTransactions));
byId("reportPeriod")?.addEventListener("change", renderReports);
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
  const signedAmount = data.txType === "income" ? Math.abs(Number(data.amount)) : data.txType === "transfer" ? 0 : -Math.abs(Number(data.amount));
  state.rows.push({ id: `manual-${Date.now()}`, date: data.date, description: data.description, amount: signedAmount, balance: 0, category: data.category, account: data.account, payee: "", project: data.project || categoryMeta(data.category).project || "", from: signedAmount < 0 || data.txType === "transfer" ? data.account : "", to: signedAmount >= 0 ? data.account : "" });
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
    byId("importResult").textContent = `${source} обработан: добавлено ${result.added}, дубликатов в архиве ${result.duplicates}, сопоставлено переводов ${result.matchedTransfers || 0}.`;
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

const storeKey = "finporyadok.state.alzex.v1";
["finporyadok.state.v2", "finporyadok.state.v3"].forEach((legacyKey) => {
  try { localStorage.removeItem(legacyKey); } catch {}
});
const seedRows = window.ANDROMONEY_DATA?.rows || [];
const savedState = loadState();

const state = {
  rows: savedState.rows,
  accounts: savedState.accounts,
  categories: savedState.categories,
  importArchive: savedState.importArchive,
  financialProducts: Array.isArray(savedState.financialProducts) ? savedState.financialProducts : [],
  insurancePolicies: Array.isArray(savedState.insurancePolicies) ? savedState.insurancePolicies : [],
  alimonyRules: Array.isArray(savedState.alimonyRules) ? savedState.alimonyRules : [],
  officialSubsistenceData: savedState.officialSubsistenceData || null,
  shopping: savedState.shopping.length ? savedState.shopping : [
    { name: "Молоко", qty: "2 л", days: 4, price: 92 },
    { name: "Корм", qty: "3 кг", days: 26, price: 1450 },
    { name: "Стиральный порошок", qty: "1 уп.", days: 32, price: 620 }
  ]
};
ensureRowIds();

const transactionPage = {
  limit: 40,
  step: 40
};

const views = {
  dashboard: ["Главная", "Сводка по счетам, операциям и обязательствам."],
  transactions: ["Операции", "Поиск, фильтры и проверка импортированных данных."],
  reimbursements: ["Возмещение", "Рабочие расходы, авансовые отчёты и фактические компенсации."],
  accounts: ["Счета", "Последние остатки и активность по каждому счету."],
  budgets: ["Категории", "Отдельные справочники категорий расходов и доходов."],
  "finance-products": ["Вклады и кредиты", "Проценты, платежи и итоговые суммы по финансовым продуктам."],
  insurance: ["Страховки", "Полисы семьи, имущества, автомобиля и спорта."],
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
      shopping: Array.isArray(saved?.shopping) ? saved.shopping : [],
      financialProducts: Array.isArray(saved?.financialProducts) ? saved.financialProducts : [],
      insurancePolicies: Array.isArray(saved?.insurancePolicies) ? saved.insurancePolicies : [],
      alimonyRules: Array.isArray(saved?.alimonyRules) ? saved.alimonyRules : []
    };
  } catch {}
  return { rows: seedRows, accounts: [], categories: [], importArchive: [], shopping: [], financialProducts: [], insurancePolicies: [], alimonyRules: [] };
}

function saveState() {
  const savedAt = new Date().toISOString();
  localStorage.setItem(storeKey, JSON.stringify({
    schemaVersion: 2,
    savedAt,
    rows: state.rows,
    accounts: state.accounts,
    categories: state.categories,
    importArchive: state.importArchive,
    shopping: state.shopping,
    financialProducts: state.financialProducts,
    insurancePolicies: state.insurancePolicies,
    alimonyRules: state.alimonyRules
  }));
  localStorage.setItem(`${storeKey}.lastSavedAt`, savedAt);
  updateDatabaseStatus();
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


const categoryAssetRules = [
  ["groceries.png", ["продукт", "еда", "супермаркет", "пятероч", "магнит", "перекрест", "лента", "вкусвилл"]],
  ["home.png", ["дом", "жилье", "квартира", "ипотека", "аренда"]],
  ["car.png", ["автомобиль", "авто", "машина", "бензин", "топливо", "азс", "мойка", "парковка", "запчаст"]],
  ["health.png", ["здоров", "медицин", "аптек", "врач", "клиник", "лекар"]],
  ["children.png", ["дети", "детск", "ребен", "ребён", "семья", "алим"]],
  ["education.png", ["образован", "обучен", "школ", "курс", "репетитор"]],
  ["cafe-restaurants.png", ["кафе", "ресторан", "кофе", "доставка еды", "фастфуд"]],
  ["clothing-shoes.png", ["одежд", "обув", "гардероб"]],
  ["beauty.png", ["красот", "космет", "салон", "маникюр", "парикмах"]],
  ["travel.png", ["путешеств", "туризм", "отель", "авиа", "самолет", "самолёт", "поездка"]],
  ["entertainment.png", ["развлеч", "кино", "театр", "концерт", "игры"]],
  ["sport.png", ["спорт", "фитнес", "трениров", "гимнаст"]],
  ["gifts.png", ["подар"]],
  ["pets.png", ["животн", "питом", "ветерин", "корм"]],
  ["phone-internet.png", ["связь", "интернет", "телефон", "мобильн", "wi-fi", "wifi"]],
  ["utilities.png", ["коммун", "жкх", "электр", "вода", "газ", "отоплен"]],
  ["transport.png", ["транспорт", "автобус", "метро", "такси", "проезд"]],
  ["insurance.png", ["страхован", "страховка"]],
  ["finance.png", ["финанс", "накоплен", "инвест", "кредит", "долг", "кошелек", "кошелёк"]],
  ["books.png", ["книг", "литератур"]],
  ["taxes-fees.png", ["налог", "сбор", "пошлин"]],
  ["repair.png", ["ремонт", "строит", "материал", "инструмент"]],
  ["garden.png", ["дача", "сад", "огород", "растен"]],
  ["subscriptions.png", ["подписк", "сервис"]],
  ["electronics.png", ["техника", "электроник", "гаджет", "компьютер", "ноутбук"]],
  ["bank-fees.png", ["банк", "комисси", "процент", "обслуживание карты"]],
  ["leisure.png", ["отдых", "досуг"]],
  ["charity.png", ["благотвор", "пожертвован"]],
  ["work.png", ["работа", "бизнес", "офис"]],
  ["other.png", ["другое", "прочее", "без категории"]]
];

const categoryAssetByIconId = {
  groceries: "groceries.png", food: "groceries.png", home: "home.png", rent: "home.png",
  car: "car.png", fuel: "car.png", service: "repair.png", health: "health.png", pharmacy: "health.png",
  children: "children.png", family: "children.png", education: "education.png", cafe: "cafe-restaurants.png",
  clothes: "clothing-shoes.png", beauty: "beauty.png", travel: "travel.png", entertainment: "entertainment.png",
  sport: "sport.png", gift: "gifts.png", pets: "pets.png", internet: "phone-internet.png", phone: "phone-internet.png",
  utilities: "utilities.png", utility: "utilities.png", transport: "transport.png", taxi: "transport.png",
  insurance: "insurance.png", savings: "finance.png", investment: "finance.png", debt: "finance.png",
  wallet: "finance.png", cash: "finance.png", card: "finance.png", taxes: "taxes-fees.png", subscriptions: "subscriptions.png",
  custom: "other.png", default: "other.png"
};

function categoryAssetFile(categoryName, iconId = "") {
  const normalized = normalizeBrandText(categoryName);
  const rule = categoryAssetRules.find(([, aliases]) => aliases.some((alias) => normalized.includes(normalizeBrandText(alias))));
  return rule?.[0] || categoryAssetByIconId[iconId] || "other.png";
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
  if (saved) return { ...saved, name: root, icon: saved.icon || detectCategoryIcon(root), project: saved.project || "", categoryType: saved.categoryType || "expense" };
  return { name: root, icon: detectCategoryIcon(root), project: defaultProjectForCategory(root), categoryType: "expense" };
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
  const root = categoryRoot({ category: categoryName });
  const meta = categoryMeta(root);
  const catalog = financeIconCatalog[meta.icon];
  const fallbackLabel = catalog?.[0] || categoryIcons[meta.icon]?.label || root || "Категория";
  const assetFile = categoryAssetFile(root, meta.icon);
  return `<span class="category-icon category-icon--asset" title="${escapeHtml(fallbackLabel)}" aria-label="${escapeHtml(fallbackLabel)}"><img src="./assets/category-icons/${escapeHtml(assetFile)}" alt="" loading="lazy" decoding="async" onerror="this.closest('.category-icon').classList.add('category-icon--missing');this.remove()"></span>`;
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

function latestAvailableDate() {
  const dates = state.rows.map((row) => rowDate(row)).filter(Boolean).sort((a, b) => a - b);
  return dates.at(-1) || new Date();
}

function periodRangeByValue(value = "month") {
  const end = latestAvailableDate();
  const start = new Date(end);
  let label = "Месяц";
  if (value === "week") {
    start.setDate(end.getDate() - 6);
    label = "Неделя";
  } else if (value === "quarter") {
    start.setMonth(end.getMonth() - 2, 1);
    label = "Квартал";
  } else if (value === "half") {
    start.setMonth(end.getMonth() - 5, 1);
    label = "Полугодие";
  } else if (value === "year") {
    start.setMonth(end.getMonth() - 11, 1);
    label = "Год";
  } else if (value === "all") {
    const min = state.rows.map((row) => rowDate(row)).filter(Boolean).sort((a, b) => a - b)[0];
    if (min) start.setTime(min.getTime());
    label = "Всё время";
  } else {
    start.setDate(1);
    label = "Месяц";
  }
  start.setHours(0,0,0,0);
  end.setHours(23,59,59,999);
  return { start, end, label };
}

function rowsInNamedPeriod(value = "month") {
  const range = periodRangeByValue(value);
  const rows = state.rows.filter((row) => {
    const date = rowDate(row);
    return date && date >= range.start && date <= range.end;
  });
  return { ...range, rows };
}

function formatPeriodCompact(start, end) {
  return `${formatPeriodDate(start)} - ${formatPeriodDate(end)}`;
}

function averageExpense(rows) {
  const expenses = rows.filter((row) => row.amount < 0 && typeOf(row) !== 'transfer');
  if (!expenses.length) return 0;
  const total = expenses.reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0);
  return total / expenses.length;
}

function buildMiniTrend(rows, range) {
  const target = byId('dashboardTrend');
  if (!target) return;
  const bars = buildExpenseHistogram(rows, range);
  target.innerHTML = bars || `<div class="empty-state compact-empty"><strong>Нет данных</strong><p>Выберите другой период.</p></div>`;
}

function insuranceSubjectKey(policy) {
  return `${policy.subjectType || ''}|${normalizeBrandText(policy.subjectName || '')}`;
}

function hasInsuranceRenewal(policy) {
  const currentStart = new Date(`${policy.startDate}T00:00:00`).getTime();
  return state.insurancePolicies.some((candidate) => {
    if (candidate.id === policy.id) return false;
    if (insuranceSubjectKey(candidate) !== insuranceSubjectKey(policy)) return false;
    const candidateStart = new Date(`${candidate.startDate}T00:00:00`).getTime();
    return candidateStart > currentStart;
  });
}

function insuranceReminderPolicies() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return state.insurancePolicies
    .filter((policy) => policy.endDate && !hasInsuranceRenewal(policy))
    .map((policy) => {
      const end = new Date(`${policy.endDate}T00:00:00`);
      if (Number.isNaN(end.getTime())) return null;
      end.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((end.getTime() - today.getTime()) / 86400000);
      return { ...policy, daysLeft };
    })
    .filter((policy) => policy && policy.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

function insuranceReminderCard(policy) {
  const status = policy.daysLeft < 0
    ? `Полис истёк ${Math.abs(policy.daysLeft)} дн. назад`
    : policy.daysLeft === 0
      ? 'Полис заканчивается сегодня'
      : `До окончания ${policy.daysLeft} дн.`;
  return `<article class="alert-card ${policy.daysLeft < 0 ? 'alert-card--danger' : 'alert-card--warning'}">
    <div class="alert-card-copy">
      <strong>${escapeHtml(policy.name)}</strong>
      <small>${escapeHtml(policy.subjectName)} • ${escapeHtml(policy.project || insuranceProjectMap[policy.subjectType] || 'Прочее')}</small>
      <p>${escapeHtml(status)}. Уведомление исчезнет только после продления или оформления нового полиса на этот же объект.</p>
    </div>
    <div class="alert-card-side">
      <span>${formatTransactionDate(policy.endDate)}</span>
      <button class="ghost alert-open-insurance" data-policy-id="${escapeHtml(policy.id)}" type="button">Открыть</button>
    </div>
  </article>`;
}

function renderInsuranceAlerts() {
  const target = byId('insuranceAlerts');
  const countNode = byId('insuranceAlertCount');
  if (!target || !countNode) return;
  const items = insuranceReminderPolicies();
  countNode.textContent = items.length;
  target.innerHTML = items.length
    ? items.map(insuranceReminderCard).join('')
    : `<article class="empty-state"><strong>Всё спокойно</strong><p>На ближайшие 7 дней нет страховок, которые заканчиваются без продления.</p></article>`;
}

const workStatusLabels = {
  new: "Новый расход", prepared: "Подготовлен к отчёту", submitted: "Передан работодателю",
  partial: "Частично возмещён", reimbursed: "Полностью возмещён", rejected: "Отказано"
};

function normalizeWorkExpense(row) {
  if (!row.workExpense) return row;
  row.workStatus = row.workStatus || "new";
  row.reimbursedAmount = Math.max(0, Number(row.reimbursedAmount) || 0);
  row.employer = row.employer || "";
  row.workProject = row.workProject || row.project || "";
  return row;
}

function workExpenseRows(includeClosed = true) {
  return state.rows
    .filter((row) => row.workExpense && row.amount < 0 && typeOf(row) !== "transfer")
    .map(normalizeWorkExpense)
    .filter((row) => includeClosed || !["reimbursed", "rejected"].includes(row.workStatus))
    .sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`));
}

function workExpenseAmount(row) { return Math.abs(Number(row.amount) || 0); }
function workExpenseOutstanding(row) {
  if (row.workStatus === "rejected") return 0;
  return Math.max(0, workExpenseAmount(row) - (Number(row.reimbursedAmount) || 0));
}

function renderWorkReimbursement() {
  const rows = workExpenseRows(false);
  const total = rows.reduce((sum, row) => sum + workExpenseOutstanding(row), 0);
  if (byId("workReimbursementTotal")) byId("workReimbursementTotal").textContent = money(total);
  const target = byId("workReimbursementPreview");
  if (!target) return;
  target.innerHTML = rows.length
    ? rows.slice(0, 4).map((row) => `<article class="reimbursement-row" data-row-id="${escapeHtml(row.id)}" tabindex="0"><div><strong>${escapeHtml(row.description || row.payee || "Рабочая покупка")}</strong><small>${escapeHtml(workStatusLabels[row.workStatus])} • ${escapeHtml(formatTransactionDate(row.date))}</small></div><b>${money(workExpenseOutstanding(row))}</b></article>`).join("")
    : `<article class="empty-state"><strong>Нет расходов к возмещению</strong><p>Все рабочие расходы закрыты или ещё не добавлены.</p></article>`;
}

function filteredWorkExpenses() {
  const status = byId("workStatusFilter")?.value || "all";
  const period = byId("workPeriodFilter")?.value || "month";
  const query = (byId("workEmployerFilter")?.value || "").trim().toLowerCase();
  const range = period === "all" ? null : periodRangeByValue(period);
  return workExpenseRows(true).filter((row) => {
    const date = rowDate(row);
    const hay = `${row.employer} ${row.workProject} ${row.project} ${row.description}`.toLowerCase();
    return (status === "all" || row.workStatus === status) && (!query || hay.includes(query)) && (!range || (date && date >= range.start && date <= range.end));
  });
}

function workExpenseCard(row) {
  const amount = workExpenseAmount(row), reimbursed = Number(row.reimbursedAmount) || 0, outstanding = workExpenseOutstanding(row);
  return `<article class="work-expense-card" data-work-row-id="${escapeHtml(row.id)}" tabindex="0">
    <div class="work-expense-card-head"><div><span class="work-status work-status--${row.workStatus}">${escapeHtml(workStatusLabels[row.workStatus])}</span><h3>${escapeHtml(row.description || row.payee || "Рабочий расход")}</h3><p>${escapeHtml(formatTransactionDate(row.date))} • ${escapeHtml(row.employer || "Работодатель не указан")} • ${escapeHtml(row.workProject || row.project || "Без проекта")}</p></div><strong>${money(amount)}</strong></div>
    <div class="work-expense-progress"><div><span>Возмещено</span><b>${money(reimbursed)}</b></div><div><span>Осталось</span><b>${money(outstanding)}</b></div></div>
    ${row.reportNumber ? `<small>Авансовый отчёт: ${escapeHtml(row.reportNumber)}</small>` : ""}
  </article>`;
}

function renderWorkExpenseCenter() {
  const all = workExpenseRows(true), filtered = filteredWorkExpenses();
  const allTotal = all.reduce((s,r)=>s+workExpenseAmount(r),0);
  const outstanding = all.reduce((s,r)=>s+workExpenseOutstanding(r),0);
  const submitted = all.filter(r=>["submitted","partial"].includes(r.workStatus)).reduce((s,r)=>s+workExpenseOutstanding(r),0);
  const reimbursed = all.reduce((s,r)=>s+(Number(r.reimbursedAmount)||0),0);
  if(byId("workAllTotal")) byId("workAllTotal").textContent=money(allTotal);
  if(byId("workAllCount")) byId("workAllCount").textContent=`${all.length} операций`;
  if(byId("workOutstandingTotal")) byId("workOutstandingTotal").textContent=money(outstanding);
  if(byId("workSubmittedTotal")) byId("workSubmittedTotal").textContent=money(submitted);
  if(byId("workReimbursedTotal")) byId("workReimbursedTotal").textContent=money(reimbursed);
  if(byId("workFilteredCount")) byId("workFilteredCount").textContent=filtered.length;
  if(byId("workExpenseList")) byId("workExpenseList").innerHTML=filtered.length?filtered.map(workExpenseCard).join(""):`<article class="empty-state"><strong>Ничего не найдено</strong><p>Измените фильтры.</p></article>`;
}

function appNotificationCount() {
  return insuranceReminderPolicies().length + workExpenseRows(false).length;
}

function renderNotificationCenterBadge() {
  const badge = byId("notificationBadge"); if (!badge) return;
  const count = appNotificationCount(); badge.textContent = count; badge.hidden = count === 0;
  byId("notificationCenterBtn")?.classList.toggle("has-notifications", count > 0);
}

function render() {
  renderMeta();
  renderFilters();
  renderDashboard();
  renderTransactions();
  renderWorkExpenseCenter();
  renderAccounts();
  renderBudgets();
  renderFinanceProducts();
  renderInsurance();
  renderInsuranceAlerts();
  renderWorkReimbursement();
  renderNotificationCenterBadge();
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
  const selected = byId("dashboardPeriod")?.value || "month";
  const range = rowsInNamedPeriod(selected);
  const rows = range.rows;
  const dates = rows.map((row) => row.date).sort();
  const income = rows.filter((row) => row.amount > 0 && typeOf(row) !== 'transfer').reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const expense = rows.filter((row) => row.amount < 0 && typeOf(row) !== 'transfer').reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);
  const net = income - expense;
  byId("metricCount").textContent = rows.length.toLocaleString("ru-RU");
  byId("metricPeriod").textContent = `${range.label}: ${formatPeriodCompact(range.start, range.end)}`;
  byId("metricIncome").textContent = money(income);
  byId("metricExpense").textContent = money(expense);
  byId("metricNet").textContent = money(net);
  byId("metricNet").className = net >= 0 ? "good" : "bad";
  if (byId("metricIncomeShare")) byId("metricIncomeShare").textContent = rows.length ? `${rows.filter((row) => row.amount > 0 && typeOf(row) !== 'transfer').length} поступлений` : 'Нет поступлений';
  if (byId("metricExpenseShare")) byId("metricExpenseShare").textContent = rows.length ? `${rows.filter((row) => row.amount < 0 && typeOf(row) !== 'transfer').length} расходов` : 'Нет расходов';
  if (byId("metricAverage")) byId("metricAverage").textContent = `${money(averageExpense(rows))} средний расход`;
  const workRows = rows.filter((row) => row.workExpense && row.amount < 0 && typeOf(row) !== "transfer");
  const workTotal = workRows.reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0);
  if (byId("metricWorkExpense")) byId("metricWorkExpense").textContent = money(workTotal);
  if (byId("metricWorkExpenseCount")) byId("metricWorkExpenseCount").textContent = `${workRows.length} покупок`;

  const latest = [...rows].sort((a, b) => `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`)).slice(0, 12);
  byId("latestRows").innerHTML = latest.length ? latest.map(rowTemplate).join("") : `<tr><td colspan="6">Нет операций за выбранный период</td></tr>`;

  const accountTotals = summarizeRows(rows, (row) => row.account || row.from || "Без счёта", (row) => typeOf(row) !== 'transfer');
  byId("accountSummary").innerHTML = accountTotals.slice(0, 6).length
    ? accountTotals.slice(0, 6).map((item) => accountSummaryRow(item.name, `${item.count} операций`, money(item.total))).join("")
    : `<article class="empty-state"><strong>Нет счетов</strong><p>За выбранный период движения не найдены.</p></article>`;

  const cats = topBy(rows, categoryRoot, (row) => row.amount < 0).slice(0, 8);
  byId("categorySummary").innerHTML = cats.length
    ? cats.map((item) => {
        const iconId = detectCategoryIcon(item.name);
        const icon = categoryIcons[iconId] || categoryIcons.default;
        return `<button class="dashboard-category-tile drill-card" data-drill-kind="category" data-drill-value="${escapeHtml(item.name)}" type="button">
          <span class="category-icon" style="--cat-bg:${icon.tone}" aria-hidden="true"><svg viewBox="0 0 24 24">${icon.svg}</svg></span>
          <strong>${escapeHtml(item.name)}</strong>
          <b>${money(item.total)}</b>
          <small>${item.count} операций</small>
        </button>`;
      }).join("")
    : `<article class="empty-state"><strong>Нет категорий</strong><p>За выбранный период расходов пока нет.</p></article>`;

  renderInsuranceAlerts();
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
  return `<article class="row account-row drill-card" data-drill-kind="account" data-drill-value="${escapeHtml(title)}" tabindex="0"><div><strong>${accountPill(title)}</strong><small>${sub}</small></div><b>${value}</b></article>`;
}

function progressRow(title, count, total, max) {
  const pct = Math.max(3, Math.round((total / max) * 100));
  return `<article class="row drill-card" data-drill-kind="category" data-drill-value="${escapeHtml(title)}" tabindex="0"><div><strong>${title}</strong><small>${count} операций • ${money(total)}</small><div class="bar"><i style="width:${pct}%"></i></div></div></article>`;
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
  const workExpense = byId("workExpenseFilter")?.value || "all";
  return state.rows.filter((row) => {
    const hay = `${row.description} ${row.category} ${row.account} ${row.project} ${row.payee}`.toLowerCase();
    return (!query || hay.includes(query))
      && (account === "all" || row.account === account)
      && (category === "all" || categoryRoot(row) === category)
      && (type === "all" || typeOf(row) === type)
      && (workExpense === "all" || (workExpense === "work" ? Boolean(row.workExpense) : !row.workExpense));
  });
}

function transactionCardTemplate(row) {
  const kind = typeOf(row);
  const amountValue = kind === "transfer"
    ? Math.abs(Number(row.transferAmount || 0))
    : Number(row.amount || 0);
  const amountClass = kind === "transfer"
    ? "transfer-amount"
    : amountValue >= 0 ? "good" : "bad";
  const typeLabel = kind === "transfer" ? "Перевод" : kind === "income" ? "Доход" : "Расход";
  const accountText = kind === "transfer"
    ? `${row.from || row.account || "Счёт"} → ${row.to || "Счёт"}`
    : row.account || "Без счёта";
  const categoryName = categoryRoot(row);
  const iconId = detectCategoryIcon(categoryName);
  const icon = categoryIcons[iconId] || categoryIcons.default;

  return `<article class="transaction-card transaction-card--light" data-row-id="${escapeHtml(row.id)}" tabindex="0">
    <div class="transaction-card-icon">
      <span class="category-icon" style="--cat-bg:${icon.tone}" aria-hidden="true">
        <svg viewBox="0 0 24 24">${icon.svg}</svg>
      </span>
    </div>
    <div class="transaction-card-main">
      <div class="transaction-card-top">
        <strong>${escapeHtml(row.description || row.payee || "Операция")}</strong>
        <b class="transaction-card-amount ${amountClass}">${money(amountValue)}</b>
      </div>
      <div class="transaction-card-meta">
        <span>${escapeHtml(formatTransactionDate(row.date))}</span>
        <span>${escapeHtml(typeLabel)}</span>
        <span>${escapeHtml(accountText)}</span>
      </div>
      <div class="transaction-card-tags transaction-card-tags--text">
        <span class="soft-pill">${escapeHtml(categoryName)}</span>
        ${row.workExpense ? `<span class="soft-pill work-expense-pill">Работа · ${escapeHtml(workStatusLabels[normalizeWorkExpense(row).workStatus])}</span>` : ""}
        ${row.payee ? `<span class="soft-pill">${escapeHtml(row.payee)}</span>` : ""}
        ${row.project ? `<span class="soft-pill">${escapeHtml(row.project)}</span>` : ""}
      </div>
    </div>
    <span class="transaction-chevron">›</span>
  </article>`;
}

function formatTransactionDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

function renderTransactions(options = {}) {
  const rows = filteredRows().sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`));
  if (options.reset) transactionPage.limit = transactionPage.step;

  const income = rows.filter((row) => row.amount > 0 && typeOf(row) !== 'transfer').reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const expense = rows.filter((row) => row.amount < 0 && typeOf(row) !== 'transfer').reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);
  const net = income - expense;
  if (byId('txMetricIncome')) byId('txMetricIncome').textContent = money(income);
  if (byId('txMetricExpense')) byId('txMetricExpense').textContent = money(expense);
  if (byId('txMetricNet')) {
    byId('txMetricNet').textContent = money(net);
    byId('txMetricNet').className = net >= 0 ? 'good' : 'bad';
  }
  if (byId('txMetricCount')) byId('txMetricCount').textContent = `${rows.length.toLocaleString('ru-RU')} операций`;
  const workRows = rows.filter((row) => row.workExpense && row.amount < 0 && typeOf(row) !== 'transfer');
  const workTotal = workRows.reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0);
  if (byId('txMetricWork')) byId('txMetricWork').textContent = money(workTotal);
  if (byId('txMetricWorkCount')) byId('txMetricWorkCount').textContent = `${workRows.length.toLocaleString('ru-RU')} операций`;

  const visible = rows.slice(0, transactionPage.limit);
  const target = byId("transactionRows");

  if (target) {
    if (!visible.length) {
      target.innerHTML = `<div class="empty-state"><strong>Операции не найдены</strong><p>Сбросьте фильтры или измените запрос.</p></div>`;
    } else {
      const groups = [];
      visible.forEach((row) => {
        const key = row.date || 'Без даты';
        let group = groups.find((item) => item.key === key);
        if (!group) {
          group = { key, rows: [] };
          groups.push(group);
        }
        group.rows.push(row);
      });
      target.innerHTML = groups.map((group) => `<section class="transaction-group"><header class="transaction-group-head"><strong>${escapeHtml(formatTransactionDate(group.key))}</strong><small>${group.rows.length} операций</small></header>${group.rows.map(transactionCardTemplate).join('')}</section>`).join('');
    }
  }

  if (byId("transactionsVisibleCount")) {
    byId("transactionsVisibleCount").textContent =
      rows.length > visible.length
        ? `Показано ${visible.length} из ${rows.length.toLocaleString("ru-RU")}`
        : `${rows.length.toLocaleString("ru-RU")} операций`;
  }

  const moreButton = byId("showAllTransactions");
  if (moreButton) {
    const remaining = Math.max(0, rows.length - visible.length);
    moreButton.hidden = remaining === 0;
    moreButton.textContent = remaining
      ? `Показать ещё ${Math.min(transactionPage.step, remaining)}`
      : "Все операции показаны";
  }

  if (document.querySelector("#transactions.view.active")) {
    byId("pageSubtitle").textContent = rows.length
      ? `Найдено ${rows.length.toLocaleString("ru-RU")} операций. Доходы ${money(income)}, расходы ${money(expense)}.`
      : "Операции не найдены по текущим фильтрам.";
  }
}

function renderAccounts() {
  const accounts = accountSummaries();
  byId("accountCards").innerHTML = accounts.map((item) => `<article class="card account-card drill-card" data-drill-kind="account" data-drill-value="${escapeHtml(item.name)}" tabindex="0"><div class="account-card-title">${bankIcon(item.name)}<h3>${escapeHtml(item.name)}</h3></div><p>${escapeHtml(item.type || brandForAccount(item.name)?.name || "Счет")} • ${item.count} операций • последнее движение ${escapeHtml(item.latest)}</p><strong>${money(item.balance)}</strong><span class="open-hint">Открыть операции →</span></article>`).join("");
}

function categoryNamesByType(categoryType) {
  const set = new Set();
  state.categories
    .filter((item) => (item.categoryType || "expense") === categoryType)
    .forEach((item) => set.add(item.name));

  state.rows.forEach((row) => {
    const kind = typeOf(row);
    if ((categoryType === "income" && kind === "income") ||
        (categoryType === "expense" && kind === "expense")) {
      const name = categoryRoot(row);
      if (name && name !== "Без категории") set.add(name);
    }
  });
  return [...set].sort((a, b) => a.localeCompare(b, "ru"));
}

function categoryCardHtml(name, categoryType) {
  const rows = state.rows.filter((row) =>
    categoryRoot(row) === name &&
    (categoryType === "income" ? typeOf(row) === "income" : typeOf(row) === "expense")
  );
  const total = rows.reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0);
  const project = categoryMeta(name).project;
  const latest = rows.map((row) => row.date).sort().at(-1) || "";
  const iconId = detectCategoryIcon(name);
  const icon = categoryIcons[iconId] || categoryIcons.default;
  return `<article class="card category-card drill-card category-card--${categoryType}" data-drill-kind="category" data-drill-value="${escapeHtml(name)}" tabindex="0">
    <div class="category-card-title">
      <span class="category-icon" style="--cat-bg:${icon.tone}" aria-hidden="true"><svg viewBox="0 0 24 24">${icon.svg}</svg></span>
      <div><h3>${escapeHtml(name)}</h3><p>${project ? `Проект ${escapeHtml(project)}` : categoryType === 'income' ? 'Доходная категория' : 'Расходная категория'}</p></div>
    </div>
    <strong>${money(total)}</strong>
    <div class="category-card-grid">
      <div><span>Операций</span><b>${rows.length}</b></div>
      <div><span>Последняя</span><b>${latest ? escapeHtml(formatTransactionDate(latest)) : '—'}</b></div>
    </div>
    <span class="category-type-badge">${categoryType === "income" ? "Доход" : "Расход"}</span>
    <span class="open-hint">Открыть операции →</span>
  </article>`;
}

function renderBudgets() {
  const expenseNames = categoryNamesByType("expense");
  const incomeNames = categoryNamesByType("income");

  byId("budgetCards").innerHTML = expenseNames.length
    ? expenseNames.map((name) => categoryCardHtml(name, "expense")).join("")
    : `<article class="empty-state"><strong>Нет категорий расходов</strong><p>Добавьте первую категорию.</p></article>`;

  byId("incomeCategoryCards").innerHTML = incomeNames.length
    ? incomeNames.map((name) => categoryCardHtml(name, "income")).join("")
    : `<article class="empty-state"><strong>Нет категорий доходов</strong><p>Добавьте зарплату, алименты, пособия или другой источник.</p></article>`;

  const expenseTotal = state.rows.filter((row) => typeOf(row) === 'expense').reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0);
  const incomeTotal = state.rows.filter((row) => typeOf(row) === 'income').reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0);

  if (byId("expenseCategoryCount")) byId("expenseCategoryCount").textContent = expenseNames.length;
  if (byId("incomeCategoryCount")) byId("incomeCategoryCount").textContent = incomeNames.length;
  if (byId("categoryExpenseTotal")) byId("categoryExpenseTotal").textContent = money(expenseTotal);
  if (byId("categoryIncomeTotal")) byId("categoryIncomeTotal").textContent = money(incomeTotal);
  if (byId("categoryExpenseMeta")) byId("categoryExpenseMeta").textContent = `${expenseNames.length} категорий`;
  if (byId("categoryIncomeMeta")) byId("categoryIncomeMeta").textContent = `${incomeNames.length} категорий`;
  if (byId("categoryCombinedCount")) byId("categoryCombinedCount").textContent = (expenseNames.length + incomeNames.length).toLocaleString('ru-RU');
}

function ratePerMonth(product) {
  const rate = Math.max(0, Number(product.rate) || 0) / 100;
  if (product.rateMode === "monthly") return rate;
  if (product.rateMode === "annual") return rate / 12;
  return 0;
}

function calculateLoan(product) {
  const principal = Math.max(0, Number(product.principal) || 0);
  const months = Math.max(1, Number(product.termMonths) || 1);
  const rate = Math.max(0, Number(product.rate) || 0) / 100;

  if (product.rateMode === "period") {
    const total = principal * (1 + rate);
    return { monthlyPayment: total / months, total, interest: total - principal };
  }

  const monthlyRate = ratePerMonth(product);
  if (product.paymentType === "differentiated") {
    const first = principal / months + principal * monthlyRate;
    const last = principal / months + (principal / months) * monthlyRate;
    const interest = monthlyRate ? principal * monthlyRate * (months + 1) / 2 : 0;
    return { monthlyPayment: first, lastPayment: last, total: principal + interest, interest };
  }

  const payment = monthlyRate
    ? principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1)
    : principal / months;
  const total = payment * months;
  return { monthlyPayment: payment, total, interest: total - principal };
}

function calculateDeposit(product) {
  const principal = Math.max(0, Number(product.principal) || 0);
  const months = Math.max(1, Number(product.termMonths) || 1);
  const rate = Math.max(0, Number(product.rate) || 0) / 100;
  let maturity = principal;

  if (product.rateMode === "period") {
    maturity = principal * (1 + rate);
  } else if (product.rateMode === "monthly") {
    maturity = product.capitalization === "monthly"
      ? principal * Math.pow(1 + rate, months)
      : principal * (1 + rate * months);
  } else {
    maturity = product.capitalization === "monthly"
      ? principal * Math.pow(1 + rate / 12, months)
      : principal * (1 + rate * months / 12);
  }
  return { maturity, interest: maturity - principal };
}

function addMonthsSafe(dateText, months, paymentDay = null) {
  const source = new Date(`${dateText || new Date().toISOString().slice(0, 10)}T00:00:00`);
  const target = new Date(source.getFullYear(), source.getMonth() + months, 1);
  const day = Math.min(Number(paymentDay) || source.getDate(), 28);
  target.setDate(day);
  return target.toISOString().slice(0, 10);
}

function plannedLoanPaymentsList(monthLimit = 12) {
  const today = new Date();
  const todayText = today.toISOString().slice(0, 10);
  const result = [];

  state.financialProducts
    .filter((item) => item.type === "loan")
    .forEach((product) => {
      const calc = calculateLoan(product);
      const months = Math.max(1, Number(product.termMonths) || 1);
      for (let index = 1; index <= months; index += 1) {
        const date = addMonthsSafe(product.startDate, index, product.paymentDay);
        if (date < todayText) continue;
        const amount = product.paymentType === "differentiated" && product.rateMode !== "period"
          ? Math.max(
              Number(product.principal) / months +
              Math.max(0, Number(product.principal) - Number(product.principal) / months * (index - 1)) * ratePerMonth(product),
              0
            )
          : calc.monthlyPayment;
        result.push({
          id: `${product.id}-payment-${index}`,
          productId: product.id,
          name: product.name,
          bank: product.bank,
          date,
          amount,
          category: product.expenseCategory || "Кредиты",
          planned: true
        });
      }
    });

  return result.sort((a, b) => a.date.localeCompare(b.date)).slice(0, monthLimit * 8);
}

function financeProductCard(product) {
  const isLoan = product.type === "loan";
  const calc = isLoan ? calculateLoan(product) : calculateDeposit(product);
  const finishDate = addMonthsSafe(product.startDate, Number(product.termMonths) || 1);
  return `<article class="finance-product-card">
    <div class="finance-product-card-head">
      <div><span class="finance-product-type ${isLoan ? "loan" : "deposit"}">${isLoan ? "Кредит" : "Вклад"}</span>
      <h3>${escapeHtml(product.name)}</h3>
      <p>${escapeHtml(product.bank || "Банк не указан")} • до ${formatTransactionDate(finishDate)}</p></div>
      <button class="icon-button delete-finance-product" data-product-id="${escapeHtml(product.id)}" title="Удалить">×</button>
    </div>
    <div class="finance-product-values">
      <div><span>Сумма</span><strong>${money(product.principal)}</strong></div>
      <div><span>Ставка</span><strong>${Number(product.rate || 0).toLocaleString("ru-RU")}% ${product.rateMode === "annual" ? "годовых" : product.rateMode === "monthly" ? "в месяц" : "за срок"}</strong></div>
      ${isLoan
        ? `<div><span>Платёж в месяц</span><strong>${money(calc.monthlyPayment)}</strong></div>
           <div><span>Переплата</span><strong>${money(calc.interest)}</strong></div>`
        : `<div><span>В конце срока</span><strong>${money(calc.maturity)}</strong></div>
           <div><span>Доход</span><strong>${money(calc.interest)}</strong></div>`}
    </div>
  </article>`;
}

function renderFinanceProducts() {
  const loans = state.financialProducts.filter((item) => item.type === "loan");
  const deposits = state.financialProducts.filter((item) => item.type === "deposit");
  const plan = plannedLoanPaymentsList(12);

  byId("loanCards").innerHTML = loans.length
    ? loans.map(financeProductCard).join("")
    : `<article class="empty-state"><strong>Кредитов нет</strong><p>Добавьте кредит, чтобы рассчитать платёж и план расходов.</p></article>`;
  byId("depositCards").innerHTML = deposits.length
    ? deposits.map(financeProductCard).join("")
    : `<article class="empty-state"><strong>Вкладов нет</strong><p>Добавьте вклад, чтобы увидеть итоговую сумму и доход.</p></article>`;

  byId("plannedLoanPayments").innerHTML = plan.length
    ? plan.map((item) => `<article class="planned-payment-row">
        <div><strong>${escapeHtml(item.name)}</strong><small>${formatTransactionDate(item.date)} • ${escapeHtml(item.bank || "Банк")} • ${escapeHtml(item.category)}</small></div>
        <b>${money(item.amount)}</b>
      </article>`).join("")
    : `<article class="empty-state"><strong>План пуст</strong><p>После добавления кредита здесь появятся будущие ежемесячные платежи.</p></article>`;

  const loanPrincipal = loans.reduce((sum, item) => sum + Number(item.principal || 0), 0);
  const monthly = loans.reduce((sum, item) => sum + calculateLoan(item).monthlyPayment, 0);
  const depositPrincipal = deposits.reduce((sum, item) => sum + Number(item.principal || 0), 0);
  const maturity = deposits.reduce((sum, item) => sum + calculateDeposit(item).maturity, 0);
  const nextMonthTotal = plan.filter((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).reduce((sum, item) => sum + item.amount, 0);

  byId("loanBalanceTotal").textContent = money(loanPrincipal);
  byId("loanMonthlyTotal").textContent = `${money(monthly)} в месяц`;
  byId("depositPrincipalTotal").textContent = money(depositPrincipal);
  byId("depositMaturityTotal").textContent = `${money(maturity)} к получению`;
  byId("plannedPaymentsTotal").textContent = money(nextMonthTotal || plan.slice(0, loans.length).reduce((sum, item) => sum + item.amount, 0));
}

function populateFinanceCategorySelects() {
  const expenses = categoryNamesByType("expense");
  const incomes = categoryNamesByType("income");
  byId("financeExpenseCategory").innerHTML = (expenses.length ? expenses : ["Кредиты"]).map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  byId("financeIncomeCategory").innerHTML = (incomes.length ? incomes : ["Проценты по вкладам"]).map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
}

function toggleFinanceProductFields() {
  const type = byId("financeProductType").value;
  document.querySelectorAll(".loan-only").forEach((item) => item.hidden = type !== "loan");
  document.querySelectorAll(".deposit-only").forEach((item) => item.hidden = type !== "deposit");
  updateFinanceCalculationPreview();
}

function currentFinanceFormProduct() {
  const data = Object.fromEntries(new FormData(byId("financeProductForm")).entries());
  return {
    type: data.productType,
    name: data.name || "Предварительный расчёт",
    bank: data.bank || "",
    principal: Number(data.principal) || 0,
    rate: Number(data.rate) || 0,
    rateMode: data.rateMode || "annual",
    termMonths: Number(data.termMonths) || 1,
    startDate: data.startDate || new Date().toISOString().slice(0, 10),
    paymentType: data.paymentType || "annuity",
    paymentDay: Number(data.paymentDay) || 10,
    capitalization: data.capitalization || "monthly",
    expenseCategory: data.expenseCategory || "Кредиты",
    incomeCategory: data.incomeCategory || "Проценты по вкладам"
  };
}

function updateFinanceCalculationPreview() {
  const target = byId("financeCalculationPreview");
  if (!target) return;
  const product = currentFinanceFormProduct();
  if (product.type === "loan") {
    const calc = calculateLoan(product);
    target.innerHTML = `<div><span>Ежемесячный платёж</span><strong>${money(calc.monthlyPayment)}</strong></div>
      ${calc.lastPayment ? `<div><span>Последний платёж</span><strong>${money(calc.lastPayment)}</strong></div>` : ""}
      <div><span>Всего выплат</span><strong>${money(calc.total)}</strong></div>
      <div><span>Переплата</span><strong>${money(calc.interest)}</strong></div>`;
  } else {
    const calc = calculateDeposit(product);
    target.innerHTML = `<div><span>Сумма в конце срока</span><strong>${money(calc.maturity)}</strong></div>
      <div><span>Начисленные проценты</span><strong>${money(calc.interest)}</strong></div>`;
  }
}


const insuranceProjectMap = {
  home: "Дом",
  car: "Авто",
  gymnastics: "Гимнастика",
  health: "Здоровье",
  travel: "Путешествия",
  life: "Семья",
  property: "Дом",
  other: "Прочее"
};

function insuranceStatus(policy) {
  const today = new Date();
  const end = new Date(`${policy.endDate}T23:59:59`);
  const days = Math.ceil((end - today) / 86400000);
  if (days < 0) return { key: "expired", label: "Истёк", days };
  if (days <= 45) return { key: "expiring", label: `Осталось ${days} дн.`, days };
  return { key: "active", label: "Действует", days };
}

function insuranceSubjectLabel(type) {
  return {
    home: "Дом / квартира",
    car: "Автомобиль",
    gymnastics: "Гимнастика / спорт",
    health: "Здоровье",
    travel: "Путешествие",
    life: "Жизнь",
    property: "Имущество",
    other: "Другое"
  }[type] || "Другое";
}

function insuranceCard(policy) {
  const status = insuranceStatus(policy);
  return `<article class="insurance-card insurance-card--${status.key}">
    <div class="insurance-card-head">
      <div>
        <span class="insurance-status ${status.key}">${escapeHtml(status.label)}</span>
        <h3>${escapeHtml(policy.name)}</h3>
        <p>${escapeHtml(policy.insurer || "Страховая компания не указана")}${policy.policyNumber ? ` • № ${escapeHtml(policy.policyNumber)}` : ""}</p>
      </div>
      <button class="icon-button delete-insurance" data-policy-id="${escapeHtml(policy.id)}" title="Удалить">×</button>
    </div>
    <div class="insurance-card-body">
      <div><span>Застраховано</span><strong>${escapeHtml(policy.subjectName)}</strong><small>${escapeHtml(insuranceSubjectLabel(policy.subjectType))}</small></div>
      <div><span>Проект</span><strong>${escapeHtml(policy.project || "Не указан")}</strong><small>${escapeHtml(policy.familyMember || "")}</small></div>
      <div><span>Стоимость</span><strong>${money(policy.cost)}</strong><small>${formatTransactionDate(policy.startDate)} — ${formatTransactionDate(policy.endDate)}</small></div>
    </div>
    <div class="insurance-card-actions">
      ${policy.pdfStored ? `<button class="ghost open-insurance-pdf" data-policy-id="${escapeHtml(policy.id)}" type="button">Открыть PDF</button>` : `<span class="muted">PDF не загружен</span>`}
      <button class="ghost edit-insurance" data-policy-id="${escapeHtml(policy.id)}" type="button">Редактировать</button>
    </div>
  </article>`;
}

function filteredInsurancePolicies() {
  const statusFilter = byId("insuranceStatusFilter")?.value || "all";
  const projectFilter = byId("insuranceProjectFilter")?.value || "all";
  return state.insurancePolicies.filter((policy) => {
    const status = insuranceStatus(policy).key;
    return (statusFilter === "all" || status === statusFilter) &&
      (projectFilter === "all" || policy.project === projectFilter);
  });
}

function renderInsurance() {
  const policies = filteredInsurancePolicies();
  const all = state.insurancePolicies;
  const active = all.filter((item) => insuranceStatus(item).key !== "expired");
  const expiring = all.filter((item) => insuranceStatus(item).key === "expiring");
  const projects = [...new Set(all.map((item) => item.project).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));

  if (byId("insuranceCards")) {
    byId("insuranceCards").innerHTML = policies.length
      ? policies.map(insuranceCard).join("")
      : `<article class="empty-state"><strong>Страховок нет</strong><p>Добавьте первый полис и прикрепите PDF.</p></article>`;
  }

  if (byId("activeInsuranceCount")) byId("activeInsuranceCount").textContent = active.length;
  if (byId("expiringInsuranceCount")) byId("expiringInsuranceCount").textContent = expiring.length;
  if (byId("insuredObjectsCount")) byId("insuredObjectsCount").textContent = new Set(all.map((item) => item.subjectName).filter(Boolean)).size;
  if (byId("insuranceTotalCost")) byId("insuranceTotalCost").textContent = `${money(all.reduce((sum, item) => sum + Number(item.cost || 0), 0))} оплачено`;

  const projectSelect = byId("insuranceProjectFilter");
  if (projectSelect) {
    const current = projectSelect.value;
    projectSelect.innerHTML = `<option value="all">Все проекты</option>` +
      projects.map((project) => `<option value="${escapeHtml(project)}">${escapeHtml(project)}</option>`).join("");
    if ([...projectSelect.options].some((option) => option.value === current)) projectSelect.value = current;
  }
}

function populateInsuranceFormOptions() {
  const projects = [...new Set([
    "Дом", "Авто", "Гимнастика", "Здоровье", "Путешествия", "Семья", "Прочее",
    ...state.rows.map((row) => row.project).filter(Boolean),
    ...state.categories.map((item) => item.project).filter(Boolean)
  ])].sort((a, b) => a.localeCompare(b, "ru"));

  byId("insuranceProject").innerHTML = projects.map((project) => `<option value="${escapeHtml(project)}">${escapeHtml(project)}</option>`).join("");
  const expenseCategories = categoryNamesByType("expense");
  const insuranceCategories = ["Страхование", ...expenseCategories.filter((name) => normalizeBrandText(name) !== "страхование")];
  byId("insuranceExpenseCategory").innerHTML = insuranceCategories.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");

  const accountNames = knownAccountNames();
  byId("insuranceAccount").innerHTML = `<option value="">Не указан</option>` +
    accountNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
}

function updateInsuranceProjectBySubject() {
  const type = byId("insuranceSubjectType").value;
  const project = insuranceProjectMap[type] || "Прочее";
  if ([...byId("insuranceProject").options].some((option) => option.value === project)) {
    byId("insuranceProject").value = project;
  }
  document.querySelectorAll(".insurance-person-field").forEach((item) => {
    item.hidden = !["gymnastics", "health", "life", "travel"].includes(type);
  });

  let note = `Полис будет привязан к проекту «${project}».`;
  if (type === "gymnastics") note += " Для страховки по гимнастике обязательно выберите ребёнка.";
  if (byId("insuranceAutoNote")) byId("insuranceAutoNote").textContent = note;
}

function insurancePdfDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("finporyadok-files", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("insurancePdfs")) {
        db.createObjectStore("insurancePdfs");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveInsurancePdf(policyId, file) {
  if (!file) return false;
  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Для страхового полиса нужен PDF-файл.");
  }
  const db = await insurancePdfDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("insurancePdfs", "readwrite");
    tx.objectStore("insurancePdfs").put({
      name: file.name,
      type: file.type || "application/pdf",
      size: file.size,
      updatedAt: new Date().toISOString(),
      blob: file
    }, policyId);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return true;
}

async function getInsurancePdf(policyId) {
  const db = await insurancePdfDb();
  const result = await new Promise((resolve, reject) => {
    const tx = db.transaction("insurancePdfs", "readonly");
    const request = tx.objectStore("insurancePdfs").get(policyId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

async function deleteInsurancePdf(policyId) {
  const db = await insurancePdfDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("insurancePdfs", "readwrite");
    tx.objectStore("insurancePdfs").delete(policyId);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

function insuranceExpenseExists(policyId) {
  return state.rows.some((row) => row.insurancePolicyId === policyId);
}

function addInsuranceExpense(policy) {
  if (!Number(policy.cost) || insuranceExpenseExists(policy.id)) return;
  const row = {
    id: `insurance-expense-${policy.id}`,
    insurancePolicyId: policy.id,
    date: policy.purchaseDate || policy.startDate,
    time: "12:00",
    description: `Страховка: ${policy.name}`,
    amount: -Math.abs(Number(policy.cost)),
    account: policy.account || "",
    from: policy.account || "",
    to: "",
    category: policy.expenseCategory || "Страхование",
    payee: policy.insurer || "",
    project: policy.project || "",
    familyMember: policy.familyMember || "",
    comment: `Полис ${policy.policyNumber || "без номера"} на ${policy.subjectName}`,
    importSource: "Страховки"
  };
  state.rows.push(row);
}

function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`; }
function monthDate(key) { return new Date(`${key}-01T00:00:00`); }
function alimonyRulesSorted() { return [...state.alimonyRules].sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom)); }
function alimonyRuleForMonth(key) { return alimonyRulesSorted().filter(r=>r.effectiveFrom<=key).at(-1) || null; }
function alimonyPaymentRows() {
  return state.rows.filter(row => row.alimonyPayment || (row.amount>0 && /алим/i.test(`${row.project} ${row.category} ${row.description}`))).map(row=>({ ...row, paymentStatus: row.paymentStatus || "confirmed", payerName: row.payerName || (row.alimonyPayment ? "Должник" : row.payee || "Не указан") }));
}
function confirmedAlimonyPayments() { return alimonyPaymentRows().filter(r=>r.paymentStatus==="confirmed"); }
function buildAlimonyLedger() {
  const rules=alimonyRulesSorted(); if(!rules.length) return [];
  const start=monthDate(rules[0].effectiveFrom); const end=latestAvailableDate(); end.setDate(1);
  const payments=confirmedAlimonyPayments(); const rows=[]; let carry=Number(rules[0].openingDebt)||0;
  for(let d=new Date(start); d<=end; d.setMonth(d.getMonth()+1)){
    const key=monthKey(d), rule=alimonyRuleForMonth(key); if(!rule) continue;
    const accrued=(Number(rule.childrenCount)||1)*(Number(rule.amountPerChild)||0);
    const paid=payments.filter(p=>String(p.date||"").slice(0,7)===key).reduce((s,p)=>s+Math.max(0,Number(p.amount)||0),0);
    carry += accrued-paid;
    rows.push({key, accrued, paid, balance:carry, rule});
  }
  return rows;
}
function renderAlimony() {
  const ledger=buildAlimonyLedger(), rules=alimonyRulesSorted(), payments=alimonyPaymentRows().sort((a,b)=>b.date.localeCompare(a.date));
  const accrued=ledger.reduce((s,m)=>s+m.accrued,0), paid=confirmedAlimonyPayments().reduce((s,r)=>s+Math.max(0,Number(r.amount)||0),0);
  const opening=Number(rules[0]?.openingDebt)||0, rawDebt=opening+accrued-paid, debt=Math.max(0,rawDebt), over=Math.max(0,-rawDebt);
  if(byId("alimonyAccruedTotal")) byId("alimonyAccruedTotal").textContent=money(accrued);
  if(byId("alimonyAccruedMeta")) byId("alimonyAccruedMeta").textContent=`${ledger.length} месяцев`;
  if(byId("alimonyPaidTotal")) byId("alimonyPaidTotal").textContent=money(paid);
  if(byId("alimonyPaidMeta")) byId("alimonyPaidMeta").textContent=`${confirmedAlimonyPayments().length} подтверждённых платежей`;
  if(byId("alimonyDebtTotal")) byId("alimonyDebtTotal").textContent=money(debt);
  if(byId("alimonyOpeningDebtMeta")) byId("alimonyOpeningDebtMeta").textContent=`начальный долг ${money(opening)}`;
  if(byId("alimonyOverpaymentTotal")) byId("alimonyOverpaymentTotal").textContent=money(over);
  if(byId("alimonyPaymentCount")) byId("alimonyPaymentCount").textContent=payments.length;
  if(byId("alimonyRules")) byId("alimonyRules").innerHTML=rules.length?rules.map(rule=>{const isPm=rule.calculationType==="subsistence"||Number(rule.subsistenceAmount)>0;const decreeUrl=safeExternalUrl(rule.decreeUrl);return `<article class="alimony-rule-card"><div><strong>С ${escapeHtml(rule.effectiveFrom)}</strong><small>${rule.childrenCount} детей × ${money(rule.amountPerChild)} в месяц</small>${isPm?`<div class="alimony-pm-details"><span>${escapeHtml(rule.subsistenceRegion||"Москва")}: прожиточный минимум ${money(rule.subsistenceAmount||0)}</span><span>${Number(rule.subsistencePercent||0).toLocaleString("ru-RU")}% = ${money(rule.amountPerChild||0)} на ребёнка</span></div>`:""}<p>${escapeHtml(rule.basis||"Основание не указано")}</p>${rule.decreeNumber?`<p class="alimony-decree">${decreeUrl?`<a href="${escapeHtml(decreeUrl)}" target="_blank" rel="noopener">${escapeHtml(rule.decreeNumber)}</a>`:escapeHtml(rule.decreeNumber)}</p>`:""}</div><button class="icon-button delete-alimony-rule" data-rule-id="${escapeHtml(rule.id)}">×</button></article>`;}).join(""):`<article class="empty-state"><strong>Нет правил начисления</strong><p>Добавьте размер алиментов и дату начала.</p></article>`;
  if(byId("alimonyMonthLedger")) byId("alimonyMonthLedger").innerHTML=ledger.length?[...ledger].reverse().slice(0,36).map(m=>`<article class="alimony-month-row"><div><strong>${monthDate(m.key).toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}</strong><small>Начислено ${money(m.accrued)} • Оплачено ${money(m.paid)}</small></div><b class="${m.balance>0?'bad':'good'}">${m.balance>0?`Долг ${money(m.balance)}`:`Переплата ${money(Math.abs(m.balance))}`}</b></article>`).join(""):`<article class="empty-state"><strong>Расчёт пока пуст</strong><p>Добавьте правило начисления.</p></article>`;
  if(byId("alimonyRows")) byId("alimonyRows").innerHTML=payments.length?payments.slice(0,100).map(row=>`<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.payerName||"Не указан")}</td><td>${escapeHtml(row.description||"Алименты")}</td><td>${accountPill(row.account)}</td><td>${escapeHtml(row.paymentStatus==="confirmed"?"Подтверждён":row.paymentStatus==="unidentified"?"Неопознанный":"Спорный")}</td><td class="amount good">${money(row.amount)}</td></tr>`).join(""):`<tr><td colspan="6">Поступлений пока нет</td></tr>`;
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
  return `<article class="row share-row drill-card" data-drill-kind="${type}" data-drill-value="${escapeHtml(item.name)}" tabindex="0"><div><strong>${title}</strong><small>${pct}% расходов • ${item.count} операций • ${money(item.total)}</small><div class="bar"><i style="width:${Math.max(2, pct)}%"></i></div></div><b>${pct}%</b></article>`;
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

function reportMonthlySeries(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const date = rowDate(row);
    if (!date || typeOf(row) === "transfer") return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const item = map.get(key) || { key, income: 0, expense: 0 };
    if (row.amount > 0) item.income += row.amount;
    if (row.amount < 0) item.expense += Math.abs(row.amount);
    map.set(key, item);
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function renderCategoryDonut(items, total) {
  const donut = byId("reportCategoryDonut");
  const legend = byId("reportCategoryLegend");
  if (!donut || !legend) return;
  const palette = ["#5f63f2", "#16a085", "#f59e0b", "#e85d75", "#3b82f6", "#8b5cf6", "#10b981", "#f97316"];
  const top = items.slice(0, 7);
  const used = top.reduce((sum, item) => sum + item.total, 0);
  const data = [...top];
  if (total > used) data.push({ name: "Прочее", total: total - used, count: 0 });
  let cursor = 0;
  const stops = data.map((item, index) => {
    const start = cursor;
    cursor += total ? (item.total / total) * 100 : 0;
    return `${palette[index % palette.length]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  donut.style.background = total ? `conic-gradient(${stops.join(",")})` : "#eef2f7";
  donut.innerHTML = `<div><strong>${money(total)}</strong><span>расходы</span></div>`;
  legend.innerHTML = data.map((item, index) => `<button class="legend-row drill-card" data-drill-kind="category" data-drill-value="${escapeHtml(item.name)}"><i style="background:${palette[index % palette.length]}"></i><span>${escapeHtml(item.name)}</span><b>${total ? Math.round(item.total / total * 100) : 0}%</b></button>`).join("");
}

function renderIncomeExpenseChart(rows) {
  const target = byId("reportIncomeExpense");
  if (!target) return;
  const income = rows.filter((row) => row.amount > 0 && typeOf(row) !== "transfer").reduce((sum, row) => sum + row.amount, 0);
  const expense = rows.filter((row) => row.amount < 0 && typeOf(row) !== "transfer").reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const max = Math.max(income, expense, 1);
  target.innerHTML = [
    { label: "Доходы", value: income, cls: "income" },
    { label: "Расходы", value: expense, cls: "expense" }
  ].map((item) => `<div class="comparison-column"><div class="comparison-value">${money(item.value)}</div><div class="comparison-track"><i class="${item.cls}" style="height:${Math.max(4, Math.round(item.value / max * 100))}%"></i></div><span>${item.label}</span></div>`).join("");
}

function renderMonthlyLineChart(rows) {
  const target = byId("reportMonthlyChart");
  if (!target) return;
  const data = reportMonthlySeries(rows);
  if (!data.length) { target.innerHTML = `<div class="empty-state">Нет данных для графика</div>`; return; }
  const width = 900, height = 280, padX = 48, padY = 28;
  const max = Math.max(...data.flatMap((item) => [item.income, item.expense]), 1);
  const x = (i) => padX + (data.length === 1 ? (width - padX * 2) / 2 : i * (width - padX * 2) / (data.length - 1));
  const y = (v) => height - padY - (v / max) * (height - padY * 2);
  const points = (key) => data.map((item, i) => `${x(i)},${y(item[key])}`).join(" ");
  const labels = data.map((item, i) => `<text x="${x(i)}" y="${height - 7}" text-anchor="middle">${new Date(item.key + '-01T00:00:00').toLocaleDateString('ru-RU',{month:'short',year:'2-digit'})}</text>`).join("");
  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Динамика доходов и расходов"><line x1="${padX}" y1="${height-padY}" x2="${width-padX}" y2="${height-padY}" class="chart-axis"/><polyline points="${points('expense')}" class="chart-line expense-line"/><polyline points="${points('income')}" class="chart-line income-line"/>${data.map((item,i)=>`<circle cx="${x(i)}" cy="${y(item.expense)}" r="5" class="expense-point"><title>Расходы ${item.key}: ${money(item.expense)}</title></circle><circle cx="${x(i)}" cy="${y(item.income)}" r="5" class="income-point"><title>Доходы ${item.key}: ${money(item.income)}</title></circle>`).join('')}<g class="chart-labels">${labels}</g></svg><div class="line-legend"><span><i class="income-dot"></i>Доходы</span><span><i class="expense-dot"></i>Расходы</span></div>`;
}

function renderAccountBars(rows) {
  const target = byId("reportAccountBars");
  if (!target) return;
  const items = summarizeRows(rows, (row) => row.account || row.from || "Без счёта", (row) => row.amount < 0 && typeOf(row) !== "transfer").slice(0, 8);
  const max = items[0]?.total || 1;
  target.innerHTML = items.length ? items.map((item) => `<button class="account-bar drill-card" data-drill-kind="account" data-drill-value="${escapeHtml(item.name)}"><span>${accountPill(item.name)}</span><div><i style="width:${Math.max(3, Math.round(item.total/max*100))}%"></i></div><b>${money(item.total)}</b></button>`).join("") : `<div class="empty-state">Нет расходов по счетам</div>`;
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
  renderCategoryDonut(categories, totalExpense);
  renderIncomeExpenseChart(range.rows);
  renderMonthlyLineChart(range.rows);
  renderAccountBars(range.rows);
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

function populateCategorySelect(categoryType = null) {
  ensureCategoryPicker();
  const select = byId("txCategorySelect");
  if (!select) return;
  const current = select.value;
  const txType = categoryType || byId("txForm")?.elements?.txType?.value || "expense";

  if (txType === "transfer") {
    select.innerHTML = `<option value="Перевод">Перевод</option>`;
    select.value = "Перевод";
    select.disabled = true;
    updateCategoryPreview();
    return;
  }

  select.disabled = false;
  const categories = categoryNamesByType(txType === "income" ? "income" : "expense");
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


function openDrilldown(kind, value) {
  const allRows = state.rows.filter((row) => {
    if (kind === "account") return row.account === value || row.from === value || row.to === value;
    if (kind === "category") return categoryRoot(row) === value;
    if (kind === "project") return (row.project || categoryMeta(categoryRoot(row)).project || "") === value;
    return false;
  }).sort((a, b) => b.date.localeCompare(a.date));
  const expenses = allRows.filter((row) => row.amount < 0).reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const income = allRows.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
  const titleMap = { account: "Счёт", category: "Категория", project: "Проект" };
  byId("drillTitle").textContent = `${titleMap[kind] || "Раздел"}: ${value}`;
  byId("drillSubtitle").textContent = `${allRows.length.toLocaleString("ru-RU")} операций • расходы ${money(expenses)} • поступления ${money(income)}`;
  byId("drillPeriod").value = "all";
  byId("drillSort").value = "date-desc";
  byId("drillDialog").dataset.kind = kind;
  byId("drillDialog").dataset.value = value;
  renderDrilldownRows(allRows);
  byId("drillDialog").showModal();
}

function renderDrilldownRows(sourceRows) {
  let rows = sourceRows || [];
  const period = byId("drillPeriod")?.value || "all";
  if (period !== "all") {
    const days = Number(period);
    const maxDate = rows.map(rowDate).filter(Boolean).sort((a,b)=>b-a)[0] || new Date();
    const minDate = new Date(maxDate); minDate.setDate(minDate.getDate() - days);
    rows = rows.filter((row) => { const d=rowDate(row); return d && d >= minDate; });
  }
  const sort = byId("drillSort")?.value || "date-desc";
  rows = [...rows].sort((a,b) => sort === "amount-desc" ? Math.abs(b.amount)-Math.abs(a.amount) : sort === "date-asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
  byId("drillRows").innerHTML = rows.length ? rows.map((row) => `<article class="timeline-item" data-row-id="${escapeHtml(row.id)}" tabindex="0"><div class="timeline-date">${escapeHtml(row.date)}</div><div class="timeline-main"><strong>${escapeHtml(row.description || "Операция")}</strong><small>${categoryPill(row.category)} ${accountPill(row.account)} ${row.project ? projectPill(row.project) : ""}</small></div><b class="amount ${row.amount >= 0 ? "good" : "bad"}">${typeOf(row)==="transfer" ? money(Math.abs(row.transferAmount || 0)) : money(row.amount)}</b></article>`).join("") : `<div class="empty-state">За выбранный период операций нет.</div>`;
  byId("drillVisibleCount").textContent = `${rows.length.toLocaleString("ru-RU")} операций`;
}

function refreshDrilldown() {
  const dialog = byId("drillDialog");
  if (!dialog?.open) return;
  const kind = dialog.dataset.kind; const value = dialog.dataset.value;
  const rows = state.rows.filter((row) => kind === "account" ? (row.account === value || row.from === value || row.to === value) : kind === "category" ? categoryRoot(row) === value : (row.project || categoryMeta(categoryRoot(row)).project || "") === value);
  renderDrilldownRows(rows);
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
    ["Расход по работе", row.workExpense ? "Да, для возмещения" : "Нет"],
    ["Счет списания", row.from || "-"],
    ["Счет зачисления", row.to || "-"],
    ["Баланс после операции", money(row.balance)],
    ["ФН", row.receipt?.fn || "-"],
    ["ФД", row.receipt?.fd || "-"],
    ["ФП", row.receipt?.fp || "-"],
    ["ID", row.id || "-"]
  ];
  const receiptItemsHtml = Array.isArray(row.receipt?.items) && row.receipt.items.length
    ? `<section class="receipt-fiscal-card"><h3>Позиции чека</h3>${row.receipt.items.map((item) => `<div class="detail-row"><span>${escapeHtml(item.name || "Товар")}</span><strong>${money(Number(item.price) || 0)}</strong></div>`).join("")}</section>`
    : "";
  byId("operationDetails").innerHTML = detailRows.map(([label, value]) => `<div class="detail-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("") + receiptItemsHtml;
  byId("detailDialog").showModal();
}

function setView(id) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === id));
  byId("pageTitle").textContent = views[id]?.[0] || "ФинПорядок";
  byId("pageSubtitle").textContent = views[id]?.[1] || "";
  if (id === "transactions") renderTransactions({ reset: true });
  if (id === "reimbursements") renderWorkExpenseCenter();
  if (id === "alimony") renderAlimony();
  if (id === "reports") renderReports();
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


function knownAccountNames() {
  const names = new Set();
  state.rows.forEach((row) => {
    [row.account, row.from, row.to].forEach((name) => {
      if (name) names.add(String(name).trim());
    });
  });
  state.accounts.forEach((account) => {
    if (account?.name) names.add(String(account.name).trim());
  });
  return [...names].filter(Boolean);
}

function detectBankFamily(value) {
  const text = normalizeBrandText(value || "");
  if (/т.?банк|тинькофф|tinkoff/.test(text)) return "tbank";
  if (/сбер|sber/.test(text)) return "sber";
  if (/альфа|alfa|alpha/.test(text)) return "alfa";
  if (/\bвтб\b|vtb/.test(text)) return "vtb";
  if (/райффайзен|raiffeisen/.test(text)) return "raiffeisen";
  if (/wildberries.?банк|wb.?банк/.test(text)) return "wb";
  return "";
}

function preferredAccountForBank(bankFamily, cardSuffix = "") {
  const candidates = knownAccountNames();
  const familyMatches = candidates.filter((name) => detectBankFamily(name) === bankFamily);
  if (cardSuffix) {
    const exactCard = familyMatches.find((name) =>
      new RegExp(`(?:\\*+|•+|\\s)${cardSuffix}$`).test(name)
    );
    if (exactCard) return exactCard;
  }

  const preferred = {
    tbank: ["Тинькофф", "Т-Банк"],
    sber: ["Сбербанк"],
    alfa: ["Альфа-Банк"],
    vtb: ["ВТБ"],
    raiffeisen: ["Райффайзен"],
    wb: ["Вайлдберриз Банк"]
  }[bankFamily] || [];

  for (const wanted of preferred) {
    const exact = familyMatches.find((name) => normalizeBrandText(name) === normalizeBrandText(wanted));
    if (exact) return exact;
  }
  if (familyMatches.length) return familyMatches[0];

  return {
    tbank: "Тинькофф",
    sber: "Сбербанк",
    alfa: "Альфа-Банк",
    vtb: "ВТБ",
    raiffeisen: "Райффайзен",
    wb: "Вайлдберриз Банк"
  }[bankFamily] || "";
}

function inferImportedBankFamily(row, source = "") {
  return detectBankFamily([
    source,
    row.importSource,
    row.account,
    row.description,
    row.payee
  ].filter(Boolean).join(" "));
}

function reconcileImportedAccount(row, source = "") {
  const bankFamily = inferImportedBankFamily(row, source);
  if (!bankFamily) return row;

  const suffix =
    row.card ||
    ((String(row.account || "").match(/(?:\*+|•+|\s)(\d{4})$/) || [])[1]) ||
    "";
  const account = preferredAccountForBank(bankFamily, suffix);
  if (!account) return row;

  const oldAccount = row.account;
  row.account = account;
  if (row.amount < 0) {
    if (!row.from || row.from === oldAccount || /pdf|выписк/i.test(String(row.from))) row.from = account;
    if (row.to === oldAccount || /pdf|выписк/i.test(String(row.to))) row.to = "";
  } else {
    if (!row.to || row.to === oldAccount || /pdf|выписк/i.test(String(row.to))) row.to = account;
    if (row.from === oldAccount || /pdf|выписк/i.test(String(row.from))) row.from = "";
  }
  return row;
}

function isGeneratedPdfAccount(name) {
  const text = String(name || "").trim();
  return !text ||
    /^PDF импорт$/i.test(text) ||
    /\.pdf$/i.test(text) ||
    /^PDF[:\s]/i.test(text) ||
    /выписк.*\.pdf/i.test(text) ||
    /statement.*\.pdf/i.test(text);
}

function cleanupImportedPdfAccounts() {
  let changed = false;
  state.rows.forEach((row) => {
    const importedPdf = /^PDF(?: QR)?:/i.test(String(row.importSource || "")) ||
      isGeneratedPdfAccount(row.account);
    if (!importedPdf) return;

    const before = [row.account, row.from, row.to].join("|");
    reconcileImportedAccount(row, row.importSource || row.account || "");
    const after = [row.account, row.from, row.to].join("|");
    if (before !== after) changed = true;
  });

  const used = new Set();
  state.rows.forEach((row) => [row.account, row.from, row.to].forEach((name) => name && used.add(name)));
  const originalLength = state.accounts.length;
  state.accounts = state.accounts.filter((account) =>
    !isGeneratedPdfAccount(account?.name) || used.has(account.name)
  );
  if (state.accounts.length !== originalLength) changed = true;

  if (changed) saveState();
  return changed;
}

function operationFingerprint(row) {
  return [
    normalizeOperationText(row.authCode || ""),
    row.date || "",
    Math.round(Number(row.amount || 0) * 100),
    normalizeOperationText(preferredAccountForBank(inferImportedBankFamily(row, row.importSource || ""), row.card || "") || row.account || ""),
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
    reconcileImportedAccount(row, source);
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
      account: preferredAccountForBank(detectBankFamily(`${source} ${text}`)) || "",
      payee: "",
      project: "",
      from: "",
      to: ""
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

function resetTransactionFilters() {
  if (byId("searchInput")) byId("searchInput").value = "";
  if (byId("accountFilter")) byId("accountFilter").value = "all";
  if (byId("categoryFilter")) byId("categoryFilter").value = "all";
  if (byId("typeFilter")) byId("typeFilter").value = "all";  if (byId("workExpenseFilter")) byId("workExpenseFilter").value = "all";
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]");
  const jump = event.target.closest("[data-view-jump]");
  const row = event.target.closest("[data-row-id]");
  const drill = event.target.closest("[data-drill-kind]");
  if (nav) setView(nav.dataset.view);
  if (jump) {
    if (jump.dataset.viewJump === "transactions") resetTransactionFilters();
    setView(jump.dataset.viewJump);
  }
  if (drill) openDrilldown(drill.dataset.drillKind, drill.dataset.drillValue);
  else if (row) showOperationDetails(row.dataset.rowId);
  if (event.target.closest("[data-close]")) event.target.closest("dialog")?.close();
});

document.addEventListener("keydown", (event) => {
  const row = event.target.closest?.("[data-row-id]");
  const drill = event.target.closest?.("[data-drill-kind]");
  if (drill && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openDrilldown(drill.dataset.drillKind, drill.dataset.drillValue); return; }
  if (row && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    showOperationDetails(row.dataset.rowId);
  }
});

byId("searchInput")?.addEventListener("input", () => {
  if (byId("searchInput").value.trim()) setView("transactions");
  renderTransactions({ reset: true });
});
["accountFilter", "categoryFilter", "typeFilter", "workExpenseFilter"].forEach((id) => byId(id)?.addEventListener("input", () => renderTransactions({ reset: true })));
["accountFilter", "categoryFilter", "typeFilter", "workExpenseFilter"].forEach((id) => byId(id)?.addEventListener("change", () => renderTransactions({ reset: true })));
byId("reportPeriod")?.addEventListener("change", renderReports);
byId("dashboardPeriod")?.addEventListener("change", renderDashboard);
byId("drillPeriod")?.addEventListener("change", refreshDrilldown);
byId("drillSort")?.addEventListener("change", refreshDrilldown);
byId("clearFilters").addEventListener("click", () => {
  resetTransactionFilters();
  renderTransactions({ reset: true });
});
byId("openWorkExpensesBtn")?.addEventListener("click", () => {
  setView("transactions");
  resetTransactionFilters();
  byId("workExpenseFilter").value = "work";
  byId("typeFilter").value = "expense";
  renderTransactions({ reset: true });
});

byId("notificationCenterBtn")?.addEventListener("click", () => {
  setView("dashboard");
  const insuranceAlerts = insuranceReminderPolicies();
  const target = insuranceAlerts.length ? byId("insuranceAlertsPanel") : byId("workReimbursementPanel");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
});

byId("showAllTransactions")?.addEventListener("click", () => {
  transactionPage.limit += transactionPage.step;
  renderTransactions();
});

byId("addTxBtn").addEventListener("click", () => {
  populateAccountSelect();
  populateCategorySelect();
  populateProjectSelect();
  byId("txForm").date.value = new Date().toISOString().slice(0, 10);
  byId("txForm").elements.txType.value = "expense";
  byId("txWorkExpense").checked = false;
  byId("txWorkExpenseField").hidden = false;
  populateCategorySelect("expense");
  byId("txDialog").showModal();
});

byId("txForm")?.elements?.txType?.addEventListener("change", (event) => {
  populateCategorySelect(event.target.value);
  const isExpense = event.target.value === "expense";
  byId("txWorkExpenseField").hidden = !isExpense;
  if (!isExpense) byId("txWorkExpense").checked = false;
});

byId("txForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const signedAmount = data.txType === "income" ? Math.abs(Number(data.amount)) : data.txType === "transfer" ? 0 : -Math.abs(Number(data.amount));
  state.rows.push({ id: `manual-${Date.now()}`, date: data.date, description: data.description, amount: signedAmount, balance: 0, category: data.category, account: data.account, payee: "", project: data.project || categoryMeta(data.category).project || "", from: signedAmount < 0 || data.txType === "transfer" ? data.account : "", to: signedAmount >= 0 ? data.account : "", workExpense: data.txType === "expense" && data.workExpense === "true", workStatus: data.txType === "expense" && data.workExpense === "true" ? "new" : "" });
  saveRows();
  byId("txDialog").close();
  render();
});



let editingInsuranceId = null;

byId("addInsuranceBtn")?.addEventListener("click", () => {
  editingInsuranceId = null;
  populateInsuranceFormOptions();
  byId("insuranceForm").reset();
  const today = new Date().toISOString().slice(0, 10);
  byId("insuranceForm").elements.startDate.value = today;
  byId("insuranceForm").elements.endDate.value = addMonthsSafe(today, 12);
  byId("insurancePdfHint").textContent = "Файл не выбран";
  updateInsuranceProjectBySubject();
  byId("insuranceDialog").showModal();
});

byId("insuranceSubjectType")?.addEventListener("change", updateInsuranceProjectBySubject);
byId("insurancePdfInput")?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  byId("insurancePdfHint").textContent = file ? `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} МБ` : "Файл не выбран";
});

byId("insuranceStatusFilter")?.addEventListener("change", renderInsurance);
byId("insuranceProjectFilter")?.addEventListener("change", renderInsurance);

byId("insuranceForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = byId("insuranceForm");
  const data = Object.fromEntries(new FormData(form).entries());
  const file = byId("insurancePdfInput").files?.[0];
  const id = editingInsuranceId || `insurance-${Date.now()}`;
  const existing = state.insurancePolicies.find((item) => item.id === id);

  if (data.subjectType === "gymnastics" && !data.familyMember) {
    byId("insuranceAutoNote").textContent = "Для страховки по гимнастике выберите ребёнка.";
    return;
  }

  const policy = {
    id,
    name: data.name.trim(),
    insurer: data.insurer.trim(),
    policyNumber: data.policyNumber.trim(),
    cost: Number(data.cost) || 0,
    startDate: data.startDate,
    endDate: data.endDate,
    purchaseDate: existing?.purchaseDate || data.startDate,
    subjectType: data.subjectType,
    subjectName: data.subjectName.trim(),
    project: data.project || insuranceProjectMap[data.subjectType] || "Прочее",
    familyMember: data.familyMember || "",
    expenseCategory: data.expenseCategory || "Страхование",
    account: data.account || "",
    comment: data.comment.trim(),
    pdfStored: existing?.pdfStored || false,
    pdfName: existing?.pdfName || "",
    updatedAt: new Date().toISOString()
  };

  try {
    if (file) {
      await saveInsurancePdf(id, file);
      policy.pdfStored = true;
      policy.pdfName = file.name;
    }
  } catch (error) {
    byId("insuranceAutoNote").textContent = `PDF не сохранён: ${error.message || error}`;
    return;
  }

  if (existing) {
    Object.assign(existing, policy);
  } else {
    state.insurancePolicies.push(policy);
    addInsuranceExpense(policy);
  }

  if (!state.categories.some((item) => normalizeBrandText(item.name) === normalizeBrandText(policy.expenseCategory))) {
    state.categories.push({
      id: `category-insurance-${Date.now()}`,
      name: policy.expenseCategory,
      project: policy.project,
      icon: "insurance",
      categoryType: "expense"
    });
  }

  saveState();
  form.reset();
  byId("insuranceDialog").close();
  render();
  setView("insurance");
});

document.addEventListener("click", async (event) => {
  const reminderOpenButton = event.target.closest(".alert-open-insurance");
  if (reminderOpenButton) {
    setView("insurance");
    const card = document.querySelector(`.edit-insurance[data-policy-id="${reminderOpenButton.dataset.policyId}"]`);
    card?.click();
    return;
  }

  const openButton = event.target.closest(".open-insurance-pdf");
  if (openButton) {
    openButton.disabled = true;
    const originalText = openButton.textContent;
    openButton.textContent = "Открываю…";
    try {
      const record = await getInsurancePdf(openButton.dataset.policyId);
      if (!record?.blob) {
        alert("PDF-файл не найден на этом устройстве. Загрузите его повторно в карточке полиса.");
        return;
      }

      if (window.AndroidFileBridge && typeof window.AndroidFileBridge.openPdfBase64 === "function") {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error || new Error("Не удалось прочитать PDF"));
          reader.readAsDataURL(record.blob);
        });
        const base64 = dataUrl.includes(",") ? dataUrl.split(",", 2)[1] : dataUrl;
        window.AndroidFileBridge.openPdfBase64(base64, record.name || "insurance-policy.pdf");
        return;
      }

      const url = URL.createObjectURL(record.blob);
      const popup = window.open(url, "_blank");
      if (!popup) {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener";
        link.download = record.name || "insurance-policy.pdf";
        document.body.append(link);
        link.click();
        link.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      alert(`Не удалось открыть PDF: ${error.message || error}`);
    } finally {
      openButton.disabled = false;
      openButton.textContent = originalText;
    }
    return;
  }

  const editButton = event.target.closest(".edit-insurance");
  if (editButton) {
    const policy = state.insurancePolicies.find((item) => item.id === editButton.dataset.policyId);
    if (!policy) return;
    editingInsuranceId = policy.id;
    populateInsuranceFormOptions();
    const form = byId("insuranceForm");
    Object.entries(policy).forEach(([key, value]) => {
      if (form.elements[key]) form.elements[key].value = value ?? "";
    });
    byId("insurancePdfHint").textContent = policy.pdfStored
      ? `Сохранён файл: ${policy.pdfName || "полис.pdf"}`
      : "PDF не загружен";
    updateInsuranceProjectBySubject();
    byId("insuranceDialog").showModal();
    return;
  }

  const deleteButton = event.target.closest(".delete-insurance");
  if (deleteButton) {
    const id = deleteButton.dataset.policyId;
    state.insurancePolicies = state.insurancePolicies.filter((item) => item.id !== id);
    state.rows = state.rows.filter((row) => row.insurancePolicyId !== id);
    await deleteInsurancePdf(id);
    saveState();
    renderInsurance();
    renderTransactions({ reset: true });
  }
});

let activeWorkExpenseRowId = null;
function openWorkExpenseDialog(rowId) {
  const row=state.rows.find(r=>r.id===rowId); if(!row) return; normalizeWorkExpense(row); activeWorkExpenseRowId=rowId;
  const form=byId("workExpenseForm"); form.elements.rowId.value=row.id; form.elements.workStatus.value=row.workStatus; form.elements.employer.value=row.employer||""; form.elements.workProject.value=row.workProject||row.project||""; form.elements.reportNumber.value=row.reportNumber||""; form.elements.submittedDate.value=row.submittedDate||""; form.elements.requestedAmount.value=workExpenseOutstanding(row).toFixed(2); form.elements.reimbursedAmount.value=Number(row.reimbursedAmount)||0; form.elements.reimbursedDate.value=row.reimbursedDate||""; form.elements.workComment.value=row.workComment||"";
  byId("workExpenseDialogSubtitle").textContent=`${row.description||"Рабочий расход"} • ${money(workExpenseAmount(row))}`; updateWorkExpenseCalculation(); byId("workExpenseDialog").showModal();
}
function updateWorkExpenseCalculation(){ const row=state.rows.find(r=>r.id===activeWorkExpenseRowId); if(!row)return; const reimb=Math.max(0,Number(byId("workExpenseForm").elements.reimbursedAmount.value)||0); const rest=Math.max(0,workExpenseAmount(row)-reimb); byId("workExpenseCalculation").innerHTML=`<div><span>Сумма расхода</span><strong>${money(workExpenseAmount(row))}</strong></div><div><span>Возмещено</span><strong>${money(reimb)}</strong></div><div><span>Осталось</span><strong>${money(rest)}</strong></div>`; }
byId("workExpenseForm")?.addEventListener("input",updateWorkExpenseCalculation);
byId("workExpenseForm")?.addEventListener("submit",event=>{event.preventDefault();const row=state.rows.find(r=>r.id===activeWorkExpenseRowId);if(!row)return;const d=Object.fromEntries(new FormData(event.currentTarget).entries());row.workStatus=d.workStatus;row.employer=d.employer.trim();row.workProject=d.workProject.trim();row.reportNumber=d.reportNumber.trim();row.submittedDate=d.submittedDate;row.reimbursedAmount=Math.min(workExpenseAmount(row),Math.max(0,Number(d.reimbursedAmount)||0));row.reimbursedDate=d.reimbursedDate;row.workComment=d.workComment.trim();if(row.reimbursedAmount>=workExpenseAmount(row)&&row.workStatus!=="rejected")row.workStatus="reimbursed";else if(row.reimbursedAmount>0&&row.workStatus!=="rejected")row.workStatus="partial";saveState();byId("workExpenseDialog").close();render();setView("reimbursements");});
document.addEventListener("click",event=>{const card=event.target.closest("[data-work-row-id]");if(card)openWorkExpenseDialog(card.dataset.workRowId);const preview=event.target.closest(".reimbursement-row");if(preview)openWorkExpenseDialog(preview.dataset.rowId);});
["workStatusFilter","workPeriodFilter","workEmployerFilter"].forEach(id=>byId(id)?.addEventListener("input",renderWorkExpenseCenter));
byId("workClearFilters")?.addEventListener("click",()=>{byId("workStatusFilter").value="all";byId("workPeriodFilter").value="month";byId("workEmployerFilter").value="";renderWorkExpenseCenter();});
byId("openWorkExpensesBtn")?.addEventListener("click",()=>setView("reimbursements"));
byId("exportWorkReportBtn")?.addEventListener("click",()=>{const rows=filteredWorkExpenses();const cols=[["Дата","Описание","Работодатель","Проект","Статус","Расход","Возмещено","Остаток","Авансовый отчёт"],...rows.map(r=>[r.date,r.description,r.employer||"",r.workProject||r.project||"",workStatusLabels[r.workStatus],workExpenseAmount(r),Number(r.reimbursedAmount)||0,workExpenseOutstanding(r),r.reportNumber||""])];const csv="\ufeff"+cols.map(row=>row.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(";")).join("\n");downloadTextFile(`work-expenses-${new Date().toISOString().slice(0,10)}.csv`,csv,"text/csv;charset=utf-8");});



const MOSCOW_PM_SEARCH_URL = "https://www.mos.ru/search/?q=%D0%BF%D1%80%D0%BE%D0%B6%D0%B8%D1%82%D0%BE%D1%87%D0%BD%D1%8B%D0%B9%20%D0%BC%D0%B8%D0%BD%D0%B8%D0%BC%D1%83%D0%BC%20%D0%B4%D0%BB%D1%8F%20%D0%B4%D0%B5%D1%82%D0%B5%D0%B9";
let moscowPmRequestInProgress = false;

function currentAlimonyYear() {
  const raw = byId("alimonyRuleForm")?.elements?.effectiveFrom?.value || "";
  const year = Number(raw.slice(0,4));
  return year || new Date().getFullYear();
}

function officialPmIsFresh(data, year) {
  if (!data || Number(data.year) !== Number(year) || !Number(data.amount)) return false;
  const fetched = new Date(data.fetchedAt || 0).getTime();
  return fetched && Date.now() - fetched < 30 * 86400000;
}

function setMoscowPmStatus(message, tone = "info") {
  const node = byId("moscowPmStatus");
  if (!node) return;
  node.textContent = message;
  node.dataset.tone = tone;
}

function applyOfficialMoscowPm(data, { save = true } = {}) {
  if (!data || !Number(data.amount)) return false;
  const form = byId("alimonyRuleForm");
  if (!form) return false;
  form.elements.subsistenceRegion.value = data.region || "Москва";
  form.elements.subsistenceAmount.value = Number(data.amount);
  if (data.decreeNumber) form.elements.decreeNumber.value = data.decreeNumber;
  if (data.decreeUrl) form.elements.decreeUrl.value = data.decreeUrl;
  const link = byId("moscowPmSourceLink");
  if (link) {
    link.hidden = !data.decreeUrl;
    if (data.decreeUrl) link.href = data.decreeUrl;
  }
  setMoscowPmStatus(`Загружено с официального портала: ${money(Number(data.amount))} на ребёнка, ${data.year} год.`, "success");
  if (save) {
    state.officialSubsistenceData = { ...data, region: data.region || "Москва" };
    saveState();
  }
  updateAlimonyRuleCalculation();
  return true;
}

function requestMoscowChildMinimum({ force = false } = {}) {
  const year = currentAlimonyYear();
  const cached = state.officialSubsistenceData;
  if (!force && officialPmIsFresh(cached, year)) {
    applyOfficialMoscowPm(cached, { save: false });
    return;
  }
  if (moscowPmRequestInProgress) return;
  moscowPmRequestInProgress = true;
  setMoscowPmStatus(`Загружаю официальный прожиточный минимум Москвы за ${year} год…`);
  const button = byId("refreshMoscowPmBtn");
  if (button) button.disabled = true;

  if (window.AndroidOfficialDataBridge?.fetchMoscowChildMinimum) {
    window.AndroidOfficialDataBridge.fetchMoscowChildMinimum(String(year));
    return;
  }

  fetch(MOSCOW_PM_SEARCH_URL, { headers: { "Accept": "text/html" } })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then((html) => {
      const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");
      const amountMatch = text.match(/(?:для\s+детей|дети)[^\d]{0,120}(\d{2}[\s\u00a0]?\d{3})\s*(?:руб|₽)/i);
      if (!amountMatch) throw new Error("На официальной странице значение не найдено");
      window.onMoscowChildMinimumLoaded(JSON.stringify({
        region: "Москва", year, amount: Number(amountMatch[1].replace(/\s/g,"")),
        decreeNumber: "", decreeUrl: MOSCOW_PM_SEARCH_URL, fetchedAt: new Date().toISOString(), source: "mos.ru"
      }));
    })
    .catch((error) => window.onMoscowChildMinimumError(error.message || String(error)));
}

window.onMoscowChildMinimumLoaded = function(payload) {
  moscowPmRequestInProgress = false;
  const button = byId("refreshMoscowPmBtn");
  if (button) button.disabled = false;
  try {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (!applyOfficialMoscowPm(data)) throw new Error("Официальное значение не распознано");
  } catch (error) {
    window.onMoscowChildMinimumError(error.message || String(error));
  }
};

window.onMoscowChildMinimumError = function(message) {
  moscowPmRequestInProgress = false;
  const button = byId("refreshMoscowPmBtn");
  if (button) button.disabled = false;
  const cached = state.officialSubsistenceData;
  if (cached && Number(cached.amount)) {
    applyOfficialMoscowPm(cached, { save: false });
    setMoscowPmStatus(`Не удалось проверить обновление. Используется последнее официальное значение ${money(Number(cached.amount))}.`, "warning");
  } else {
    setMoscowPmStatus(`Не удалось загрузить данные автоматически: ${message}. Проверьте интернет и нажмите «Обновить».`, "error");
  }
};

function updateAlimonyRuleCalculation() {
  const form = byId("alimonyRuleForm");
  if (!form) return;
  const calculationType = form.elements.calculationType.value || "subsistence";
  const isSubsistence = calculationType === "subsistence";
  document.querySelectorAll(".alimony-subsistence-field").forEach((field) => field.hidden = !isSubsistence);
  form.elements.amountPerChild.readOnly = isSubsistence;
  if (isSubsistence) {
    const minimum = Math.max(0, Number(form.elements.subsistenceAmount.value) || 0);
    const percent = Math.max(0, Number(form.elements.subsistencePercent.value) || 0);
    form.elements.amountPerChild.value = minimum && percent ? (minimum * percent / 100).toFixed(2) : "";
  }
  const amount = Math.max(0, Number(form.elements.amountPerChild.value) || 0);
  const children = Math.max(1, Number(form.elements.childrenCount.value) || 1);
  const total = amount * children;
  const preview = byId("alimonyRulePreview");
  if (preview) {
    preview.innerHTML = isSubsistence
      ? `<div><span>Расчёт на одного ребёнка</span><strong>${money(amount)}</strong><small>${Number(form.elements.subsistencePercent.value || 0).toLocaleString("ru-RU")}% от ${money(Number(form.elements.subsistenceAmount.value) || 0)}</small></div><div><span>Начисление на ${children} детей</span><strong>${money(total)}</strong><small>за полный месяц</small></div>`
      : `<div><span>На одного ребёнка</span><strong>${money(amount)}</strong></div><div><span>На ${children} детей</span><strong>${money(total)}</strong><small>за полный месяц</small></div>`;
  }
}

function safeExternalUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

byId("addAlimonyRuleBtn")?.addEventListener("click",()=>{const f=byId("alimonyRuleForm");f.reset();f.elements.effectiveFrom.value=new Date().toISOString().slice(0,7);f.elements.childrenCount.value=2;f.elements.calculationType.value="subsistence";f.elements.subsistenceRegion.value="Москва";f.elements.subsistencePercent.value=100;f.elements.openingDebt.value=state.alimonyRules.length?0:"";updateAlimonyRuleCalculation();byId("alimonyRuleDialog").showModal();requestMoscowChildMinimum();});
byId("alimonyRuleForm")?.addEventListener("submit",event=>{event.preventDefault();const d=Object.fromEntries(new FormData(event.currentTarget).entries());const calculationType=d.calculationType||"fixed";const subsistenceAmount=Math.max(0,Number(d.subsistenceAmount)||0);const subsistencePercent=Math.max(0,Number(d.subsistencePercent)||0);const amountPerChild=calculationType==="subsistence"?subsistenceAmount*subsistencePercent/100:Math.max(0,Number(d.amountPerChild)||0);state.alimonyRules.push({id:`alimony-rule-${Date.now()}`,effectiveFrom:d.effectiveFrom,childrenCount:Number(d.childrenCount)||1,calculationType,subsistenceRegion:(d.subsistenceRegion||"").trim(),subsistenceAmount,subsistencePercent,amountPerChild,openingDebt:Number(d.openingDebt)||0,decreeNumber:(d.decreeNumber||"").trim(),decreeUrl:safeExternalUrl(d.decreeUrl),basis:(d.basis||"").trim()});saveState();byId("alimonyRuleDialog").close();renderAlimony();});
byId("addAlimonyPaymentBtn")?.addEventListener("click",()=>{const f=byId("alimonyPaymentForm");f.reset();f.elements.date.value=new Date().toISOString().slice(0,10);populateAccountSelect();byId("alimonyAccountSelect").innerHTML=byId("txAccountSelect").innerHTML;byId("alimonyPaymentDialog").showModal();});
byId("alimonyRuleForm")?.addEventListener("input",updateAlimonyRuleCalculation);
byId("alimonyRuleForm")?.addEventListener("change",updateAlimonyRuleCalculation);
byId("alimonyPaymentForm")?.addEventListener("submit",event=>{event.preventDefault();const d=Object.fromEntries(new FormData(event.currentTarget).entries());state.rows.push({id:`alimony-payment-${Date.now()}`,date:d.date,time:"12:00",description:d.description||"Алименты",amount:Math.abs(Number(d.amount)||0),balance:0,category:"Алименты",account:d.account,to:d.account,from:"",project:"Алименты",payee:d.payerName||"",payerName:d.payerName||"",payerType:d.payerType,paymentStatus:d.paymentStatus,comment:d.comment||"",alimonyPayment:true});saveState();byId("alimonyPaymentDialog").close();render();setView("alimony");});
document.addEventListener("click",event=>{const b=event.target.closest(".delete-alimony-rule");if(!b)return;state.alimonyRules=state.alimonyRules.filter(r=>r.id!==b.dataset.ruleId);saveState();renderAlimony();});

byId("addFinanceProductBtn")?.addEventListener("click", () => {
  populateFinanceCategorySelects();
  byId("financeProductForm").reset();
  byId("financeProductForm").elements.startDate.value = new Date().toISOString().slice(0, 10);
  byId("financeProductForm").elements.termMonths.value = 12;
  byId("financeProductForm").elements.paymentDay.value = 10;
  toggleFinanceProductFields();
  byId("financeProductDialog").showModal();
});

byId("financeProductType")?.addEventListener("change", toggleFinanceProductFields);
byId("financeProductForm")?.addEventListener("input", updateFinanceCalculationPreview);
byId("financeProductForm")?.addEventListener("change", updateFinanceCalculationPreview);

byId("financeProductForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const product = currentFinanceFormProduct();
  product.id = `finance-${Date.now()}`;
  state.financialProducts.push(product);

  if (product.type === "loan" && !state.categories.some((item) => normalizeBrandText(item.name) === normalizeBrandText(product.expenseCategory))) {
    state.categories.push({ id: `category-${Date.now()}-loan`, name: product.expenseCategory, project: "", icon: "credit", categoryType: "expense" });
  }
  if (product.type === "deposit" && !state.categories.some((item) => normalizeBrandText(item.name) === normalizeBrandText(product.incomeCategory))) {
    state.categories.push({ id: `category-${Date.now()}-deposit`, name: product.incomeCategory, project: "", icon: "income", categoryType: "income" });
  }

  saveState();
  byId("financeProductDialog").close();
  render();
  setView("finance-products");
});

document.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-finance-product");
  if (!button) return;
  const id = button.dataset.productId;
  state.financialProducts = state.financialProducts.filter((item) => item.id !== id);
  saveState();
  renderFinanceProducts();
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
  const payload = { id: existing?.id || `category-${Date.now()}`, name, project: data.project.trim(), icon: data.icon || detectCategoryIcon(name), categoryType: data.categoryType || "expense" };
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

function buildBackupPayload() {
  return {
    app: "ФинПорядок",
    format: "finporyadok-backup",
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    source: window.ANDROMONEY_DATA?.source || "Локальные данные",
    data: {
      rows: state.rows,
      accounts: state.accounts,
      categories: state.categories,
      importArchive: state.importArchive,
      shopping: state.shopping,
      financialProducts: state.financialProducts,
      insurancePolicies: state.insurancePolicies,
      alimonyRules: state.alimonyRules
    }
  };
}

function safeFileDate() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function saveTextFile(filename, mimeType, text) {
  if (window.AndroidFileBridge && typeof window.AndroidFileBridge.saveTextFile === "function") {
    window.AndroidFileBridge.saveTextFile(filename, mimeType, text);
    return;
  }
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportData() {
  const payload = buildBackupPayload();
  const filename = `finporyadok-backup-${safeFileDate()}.json`;
  saveTextFile(filename, "application/json", JSON.stringify(payload, null, 2));
  localStorage.setItem(`${storeKey}.lastBackupAt`, new Date().toISOString());
  showBackupMessage(`Создаётся резервная копия: ${filename}`);
  updateDatabaseStatus();
}

function csvEscape(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportTransactionsCsv() {
  const headers = [
    "ID", "Дата", "Время", "Тип", "Описание", "Сумма", "Счёт",
    "Счёт списания", "Счёт зачисления", "Категория", "Контрагент",
    "Член семьи", "Проект", "Расход по работе", "Комментарий", "Метки", "Источник импорта"
  ];
  const lines = [headers.map(csvEscape).join(";")];
  state.rows.forEach((row) => {
    const txType = typeOf(row);
    lines.push([
      row.id || row.alzexId || "",
      row.date || "",
      row.time || "",
      txType === "income" ? "Доход" : txType === "expense" ? "Расход" : "Перевод",
      row.description || "",
      txType === "transfer" ? Math.abs(Number(row.transferAmount) || 0) : Number(row.amount) || 0,
      row.account || "",
      row.from || "",
      row.to || "",
      row.category || "",
      row.payee || "",
      row.familyMember || "",
      row.project || "",
      row.workExpense ? "Да" : "Нет",
      row.comment || "",
      row.tags || "",
      row.importSource || ""
    ].map(csvEscape).join(";"));
  });
  const filename = `finporyadok-operations-${safeFileDate()}.csv`;
  saveTextFile(filename, "text/csv", "\uFEFF" + lines.join("\r\n"));
  showBackupMessage(`Создаётся CSV-файл: ${filename}`);
}

function updateDatabaseStatus() {
  const savedAt = localStorage.getItem(`${storeKey}.lastSavedAt`);
  const backupAt = localStorage.getItem(`${storeKey}.lastBackupAt`);
  if (byId("lastSavedAt")) {
    byId("lastSavedAt").textContent = savedAt
      ? new Date(savedAt).toLocaleString("ru-RU")
      : "Данные ещё не изменялись";
  }
  if (byId("databaseStats")) {
    byId("databaseStats").textContent =
      `${state.rows.length} операций · ${state.accounts.length} счетов · ${state.categories.length} категорий · ${state.financialProducts.length} вкладов/кредитов · ${state.insurancePolicies.length} страховок`;
  }
  if (byId("backupMessage") && backupAt) {
    byId("backupMessage").textContent =
      `Последняя резервная копия запрошена ${new Date(backupAt).toLocaleString("ru-RU")}.`;
  }
}

function showBackupMessage(message) {
  if (byId("backupMessage")) byId("backupMessage").textContent = message;
}

let pendingBackupRestore = null;

function normalizeBackupPayload(parsed) {
  const data = parsed?.format === "finporyadok-backup" ? parsed.data : parsed;
  if (!data || !Array.isArray(data.rows)) {
    throw new Error("В файле не найден список операций ФинПорядок.");
  }
  return {
    rows: data.rows,
    accounts: Array.isArray(data.accounts) ? data.accounts : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    importArchive: Array.isArray(data.importArchive) ? data.importArchive : [],
    shopping: Array.isArray(data.shopping) ? data.shopping : [],
    financialProducts: Array.isArray(data.financialProducts) ? data.financialProducts : [],
    insurancePolicies: Array.isArray(data.insurancePolicies) ? data.insurancePolicies : [],
    alimonyRules: Array.isArray(data.alimonyRules) ? data.alimonyRules : []
  };
}

function backupRowKey(row) {
  return row.id || row.alzexId || row.receipt?.fiscalKey ||
    [row.date, row.time, row.description, row.amount, row.account].join("|");
}

function mergeUnique(current, incoming, keyFn) {
  const result = [...current];
  const keys = new Set(current.map(keyFn));
  incoming.forEach((item) => {
    const key = keyFn(item);
    if (!keys.has(key)) {
      keys.add(key);
      result.push(item);
    }
  });
  return result;
}

function applyBackup(mode) {
  if (!pendingBackupRestore) return;
  if (mode === "replace") {
    state.rows = pendingBackupRestore.rows;
    state.accounts = pendingBackupRestore.accounts;
    state.categories = pendingBackupRestore.categories;
    state.importArchive = pendingBackupRestore.importArchive;
    state.shopping = pendingBackupRestore.shopping;
    state.financialProducts = pendingBackupRestore.financialProducts;
    state.insurancePolicies = pendingBackupRestore.insurancePolicies;
    state.alimonyRules = pendingBackupRestore.alimonyRules;
    state.officialSubsistenceData = pendingBackupRestore.officialSubsistenceData;
  } else {
    state.rows = mergeUnique(state.rows, pendingBackupRestore.rows, backupRowKey);
    state.accounts = mergeUnique(state.accounts, pendingBackupRestore.accounts, (item) => item.id || item.name);
    state.categories = mergeUnique(state.categories, pendingBackupRestore.categories, (item) => item.id || item.name);
    state.importArchive = mergeUnique(state.importArchive, pendingBackupRestore.importArchive, (item) => item.id || JSON.stringify(item));
    state.shopping = mergeUnique(state.shopping, pendingBackupRestore.shopping, (item) => item.id || `${item.name}|${item.date}`);
    state.financialProducts = mergeUnique(state.financialProducts, pendingBackupRestore.financialProducts, (item) => item.id || `${item.type}|${item.name}|${item.startDate}`);
    state.insurancePolicies = mergeUnique(state.insurancePolicies, pendingBackupRestore.insurancePolicies, (item) => item.id || `${item.policyNumber}|${item.name}|${item.startDate}`);
    state.alimonyRules = mergeUnique(state.alimonyRules, pendingBackupRestore.alimonyRules, (item) => item.id || `${item.effectiveFrom}|${item.amountPerChild}`);
  }
  ensureRowIds();
  saveState();
  pendingBackupRestore = null;
  byId("restoreDialog")?.close();
  render();
  setView("dashboard");
  showBackupMessage(mode === "replace"
    ? "База полностью восстановлена из резервной копии."
    : "Данные из резервной копии объединены с текущей базой.");
}

byId("backupJsonBtn")?.addEventListener("click", exportData);
byId("exportCsvBtn")?.addEventListener("click", exportTransactionsCsv);
byId("restoreBackupBtn")?.addEventListener("click", () => byId("backupRestoreInput")?.click());

byId("backupRestoreInput")?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    pendingBackupRestore = normalizeBackupPayload(JSON.parse(text));
    byId("restoreFileName").textContent = file.name;
    byId("restoreSummary").innerHTML = `
      <div><span>Операции</span><strong>${pendingBackupRestore.rows.length}</strong></div>
      <div><span>Счета</span><strong>${pendingBackupRestore.accounts.length}</strong></div>
      <div><span>Категории</span><strong>${pendingBackupRestore.categories.length}</strong></div>
      <div><span>Покупки</span><strong>${pendingBackupRestore.shopping.length}</strong></div>
      <div><span>Вклады и кредиты</span><strong>${pendingBackupRestore.financialProducts.length}</strong></div>
      <div><span>Страховки</span><strong>${pendingBackupRestore.insurancePolicies.length}</strong></div>
      <div><span>Правила алиментов</span><strong>${pendingBackupRestore.alimonyRules.length}</strong></div>
    `;
    byId("restoreDialog").showModal();
  } catch (error) {
    showBackupMessage(`Не удалось открыть резервную копию: ${error.message || error}`);
  } finally {
    event.target.value = "";
  }
});

byId("mergeBackupBtn")?.addEventListener("click", () => applyBackup("merge"));
byId("replaceBackupBtn")?.addEventListener("click", () => applyBackup("replace"));

window.onNativeFileSaved = function(filename) {
  showBackupMessage(`Файл сохранён: ${filename}`);
};

window.onNativeFileSaveError = function(message) {
  showBackupMessage(`Не удалось сохранить файл: ${message || "неизвестная ошибка"}`);
};

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
          row: { date: new Date().toISOString().slice(0, 10), description: file.name, amount: 0, account: "", category: "Подлинность" }
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
        row: { date: new Date().toISOString().slice(0, 10), description: file.name, amount: 0, account: "", category: "Не распознано" }
      });
      saveState();
      renderImportArchive();
      byId("importResult").textContent = "PDF проверен, но операции не найдены. QR подтверждает подлинность выписки, но не содержит список операций. Нужен PDF с текстовой таблицей операций или CSV/Excel-выгрузка.";
      return;
    }
    const result = importRows(rows, source);
    byId("importResult").textContent = `${source} обработан: добавлено ${result.added}, уже существующих операций ${result.duplicates}. Счёт сопоставлен с существующим банком.`;
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


// ---------------- Кассовые чеки по QR ----------------
function parseFiscalReceiptQr(rawText) {
  const raw = String(rawText || "").trim();
  const params = new URLSearchParams(raw.includes("?") ? raw.split("?").pop() : raw.replace(/^qr:/i, ""));
  const get = (...keys) => keys.map((key) => params.get(key)).find(Boolean) || "";
  const amount = Number(String(get("s", "sum", "amount")).replace(",", "."));
  const timestamp = get("t", "date");
  let date = new Date().toISOString().slice(0, 10);
  let time = new Date().toTimeString().slice(0, 5);
  const match = timestamp.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?/);
  if (match) {
    date = `${match[1]}-${match[2]}-${match[3]}`;
    if (match[4] && match[5]) time = `${match[4]}:${match[5]}`;
  }
  const fn = get("fn");
  const fd = get("i", "fd");
  const fp = get("fp", "fiscalSign");
  const operationType = get("n", "type") || "1";
  if (!Number.isFinite(amount) || amount <= 0 || !(fn || fd || fp)) {
    throw new Error("Это не похоже на QR российского кассового чека: не найдены сумма или фискальные реквизиты.");
  }
  return { raw, amount, date, time, fn, fd, fp, operationType, fiscalKey: [fn, fd, fp].filter(Boolean).join("-") };
}

function receiptSelectOptions() {
  const accounts = [...new Set([
    ...state.rows.flatMap((row) => [row.account, row.from, row.to]),
    ...state.accounts.map((account) => account.name)
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
  const categories = [...new Set([
    ...state.rows.map((row) => row.category),
    ...state.categories.map((category) => category.name)
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
  const projects = [...new Set(state.rows.map((row) => row.project).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
  byId("receiptAccount").innerHTML = accounts.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  byId("receiptCategory").innerHTML = categories.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  byId("receiptProject").innerHTML = `<option value="">Без проекта</option>${projects.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
  const preferredCategory = categories.find((name) => /продукт|еда|покупк/i.test(name)) || categories[0] || "Без категории";
  if (preferredCategory) byId("receiptCategory").value = preferredCategory;
}

function addReceiptItemRow(name = "", price = "") {
  const row = document.createElement("div");
  row.className = "receipt-item";
  row.innerHTML = `<input class="receipt-item-name" placeholder="Название товара" value="${escapeHtml(name)}"><input class="receipt-item-price" type="number" min="0" step="0.01" placeholder="Цена" value="${escapeHtml(price)}"><button type="button" aria-label="Удалить позицию">×</button>`;
  row.querySelector("button").addEventListener("click", () => row.remove());
  byId("receiptItems").append(row);
}

function updateReceiptPreview() {
  byId("receiptAmountPreview").textContent = money(Number(byId("receiptAmount").value) || 0);
  const date = byId("receiptDate").value || "—";
  const time = byId("receiptTime").value || "";
  byId("receiptDatePreview").textContent = `${date}${time ? `, ${time}` : ""}`;
}

function openReceiptEditor(receipt) {
  receiptSelectOptions();
  byId("receiptRawQr").value = receipt.raw;
  byId("receiptFiscalKey").value = receipt.fiscalKey;
  byId("receiptAmount").value = receipt.amount.toFixed(2);
  byId("receiptDate").value = receipt.date;
  byId("receiptTime").value = receipt.time;
  byId("receiptFn").value = receipt.fn;
  byId("receiptFd").value = receipt.fd;
  byId("receiptFp").value = receipt.fp;
  byId("receiptOperationType").value = receipt.operationType;
  byId("receiptMerchant").value = "";
  byId("receiptDescription").value = "Покупка по кассовому чеку";
  byId("receiptItems").innerHTML = "";
  addReceiptItemRow();
  updateReceiptPreview();
  byId("receiptStatus").textContent = "QR распознан. Укажите магазин и при необходимости позиции чека.";
  byId("receiptDialog").showModal();
}


let pendingQrImageUrl = "";

function openQrPasteDialog(statusText = "Вставьте строку QR кассового чека.") {
  byId("qrPasteText").value = "";
  byId("qrPasteStatus").textContent = statusText;
  byId("qrPhotoFallback").hidden = true;
  if (pendingQrImageUrl) {
    URL.revokeObjectURL(pendingQrImageUrl);
    pendingQrImageUrl = "";
  }
  byId("qrPasteDialog").showModal();
  setTimeout(() => byId("qrPasteText").focus(), 50);
}

function processReceiptQrText(raw) {
  const receipt = parseFiscalReceiptQr(raw);
  const duplicate = state.rows.find((row) => row.receipt?.fiscalKey && row.receipt.fiscalKey === receipt.fiscalKey);
  if (duplicate) throw new Error(`Этот чек уже добавлен: ${duplicate.date}, ${duplicate.description}, ${money(Math.abs(duplicate.amount))}.`);
  byId("qrPasteDialog")?.close();
  openReceiptEditor(receipt);
  byId("importResult").textContent = "Кассовый QR распознан. Проверьте данные и сохраните расход.";
}


// Native Android QR scanner bridge.
// The APK exposes window.AndroidQrScanner through MainActivity.
window.onNativeQrScanned = function(rawValue) {
  try {
    processReceiptQrText(String(rawValue || ""));
  } catch (error) {
    const message = `Чек не распознан: ${error.message || error}`;
    if (byId("qrPasteStatus")) byId("qrPasteStatus").textContent = message;
    if (byId("importResult")) byId("importResult").textContent = message;
  }
};

window.onNativeQrScanError = function(message) {
  const text = message || "Не удалось запустить сканер QR.";
  if (byId("qrPasteStatus")) byId("qrPasteStatus").textContent = text;
  if (byId("importResult")) byId("importResult").textContent = text;
};

function startNativeReceiptScanner() {
  if (window.AndroidQrScanner && typeof window.AndroidQrScanner.scanQr === "function") {
    if (byId("importResult")) byId("importResult").textContent = "Открываю камеру для сканирования QR...";
    window.AndroidQrScanner.scanQr();
    return true;
  }
  return false;
}

byId("pasteReceiptQrBtn")?.addEventListener("click", () => openQrPasteDialog());
byId("txPasteReceiptBtn")?.addEventListener("click", () => openQrPasteDialog());

byId("qrPasteForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const raw = byId("qrPasteText").value.trim();
  if (!raw) {
    byId("qrPasteStatus").textContent = "Вставьте строку QR.";
    return;
  }
  try {
    processReceiptQrText(raw);
  } catch (error) {
    byId("qrPasteStatus").textContent = `Чек не распознан: ${error.message || error}`;
  }
});

async function handleReceiptImage(file) {
  if (!file) return;
  byId("importResult").textContent = `Сканирую кассовый QR из ${file.name}...`;
  try {
    const raw = await parseQrFile(file);
    if (!raw) throw new Error("QR-код не найден.");
    const qrLine = raw.split(/\r?\n/).find((line) => /(?:^|[?&])(?:fn|s|t)=/i.test(line)) || raw;
    processReceiptQrText(qrLine);
  } catch (error) {
    openQrPasteDialog("Автоматически прочитать фото не удалось. Скопируйте строку QR через Google Lens и вставьте ниже.");
    pendingQrImageUrl = URL.createObjectURL(file);
    byId("qrPhotoPreview").src = pendingQrImageUrl;
    byId("qrPhotoFallback").hidden = false;
    byId("qrPasteStatus").textContent = `Фото выбрано: ${file.name}. ${error.message || error}`;
    byId("importResult").textContent = "Фото открыто в резервном режиме ручной вставки QR.";
  }
}

byId("receiptQrInput")?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  await handleReceiptImage(file);
  event.target.value = "";
});

byId("txScanReceiptBtn")?.addEventListener("click", () => {
  if (!startNativeReceiptScanner()) {
    byId("txReceiptQrInput")?.click();
  }
});
byId("txReceiptQrInput")?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  byId("txDialog")?.close();
  await handleReceiptImage(file);
  event.target.value = "";
});

byId("addReceiptItem")?.addEventListener("click", () => addReceiptItemRow());
byId("receiptAmount")?.addEventListener("input", updateReceiptPreview);
byId("receiptDate")?.addEventListener("input", updateReceiptPreview);
byId("receiptTime")?.addEventListener("input", updateReceiptPreview);
byId("copyReceiptQr")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(byId("receiptRawQr").value);
    byId("receiptStatus").textContent = "Строка QR скопирована.";
  } catch {
    byId("receiptStatus").textContent = "Не удалось скопировать QR автоматически.";
  }
});

byId("receiptForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const fiscalKey = data.fiscalKey;
  if (state.rows.some((row) => row.receipt?.fiscalKey === fiscalKey)) {
    byId("receiptStatus").textContent = "Этот чек уже существует в приложении.";
    return;
  }
  const items = [...byId("receiptItems").querySelectorAll(".receipt-item")]
    .map((item) => ({ name: item.querySelector(".receipt-item-name").value.trim(), price: Number(item.querySelector(".receipt-item-price").value) || 0 }))
    .filter((item) => item.name || item.price);
  const amount = Math.abs(Number(data.amount) || 0);
  if (!amount) return;
  state.rows.push({
    id: `receipt-${fiscalKey || Date.now()}`,
    date: data.date,
    time: data.time || "",
    description: data.description || data.merchant || "Покупка по кассовому чеку",
    amount: -amount,
    balance: 0,
    category: data.category || "Без категории",
    account: data.account,
    payee: data.merchant,
    project: data.project || "",
    from: data.account,
    to: "",
    importSource: "Кассовый QR",
    workExpense: data.workExpense === "true",
    workStatus: data.workExpense === "true" ? "new" : "",
    receipt: {
      fiscalKey,
      fn: data.fn,
      fd: data.fd,
      fp: data.fp,
      operationType: data.operationType,
      rawQr: data.rawQr,
      items
    }
  });
  state.importArchive.unshift({
    id: `receipt-import-${Date.now()}`,
    archivedAt: new Date().toISOString(),
    source: `Кассовый QR: ${data.merchant}`,
    reason: "Чек добавлен как расход",
    existingId: "",
    row: { date: data.date, description: data.description, amount: -amount, account: data.account, category: data.category }
  });
  ensureRowIds();
  saveState();
  byId("receiptDialog").close();
  byId("importResult").textContent = `Чек добавлен: ${data.merchant}, ${money(amount)}.`;
  render();
});


cleanupImportedPdfAccounts();
render();

byId("nativeReceiptScanBtn")?.addEventListener("click", () => {
  if (!startNativeReceiptScanner()) {
    byId("receiptQrInput")?.click();
  }
});

updateDatabaseStatus();
window.addEventListener("beforeunload", saveState);

byId("refreshMoscowPmBtn")?.addEventListener("click", () => requestMoscowChildMinimum({ force: true }));
byId("alimonyRuleForm")?.elements?.effectiveFrom?.addEventListener("change", () => requestMoscowChildMinimum());

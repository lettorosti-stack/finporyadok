const storeKey = "finporyadok.state.alzex.v1";
["finporyadok.state.v2", "finporyadok.state.v3"].forEach((legacyKey) => {
  try { localStorage.removeItem(legacyKey); } catch {}
});
const seedRows = window.ANDROMONEY_DATA?.rows || [];
const CURRENT_SCHEMA_VERSION = 11;
const savedState = loadState();

const state = {
  rows: savedState.rows,
  accounts: savedState.accounts,
  categories: savedState.categories,
  importArchive: savedState.importArchive,
  financialProducts: Array.isArray(savedState.financialProducts) ? savedState.financialProducts : [],
  insurancePolicies: Array.isArray(savedState.insurancePolicies) ? savedState.insurancePolicies : [],
  alimonyRules: Array.isArray(savedState.alimonyRules) ? savedState.alimonyRules : [],
  regularPayments: Array.isArray(savedState.regularPayments) ? savedState.regularPayments : [],
  plannedPaymentStates: savedState.plannedPaymentStates && typeof savedState.plannedPaymentStates === "object" ? savedState.plannedPaymentStates : {},
  shoppingAliases: savedState.shoppingAliases && typeof savedState.shoppingAliases === "object" ? savedState.shoppingAliases : {},
  officialSubsistenceData: savedState.officialSubsistenceData || null,
  officialSubsistenceByYear: savedState.officialSubsistenceByYear && typeof savedState.officialSubsistenceByYear === "object" ? savedState.officialSubsistenceByYear : {},
  familyMembers: Array.isArray(savedState.familyMembers) ? savedState.familyMembers : [],
  activeMemberId: savedState.activeMemberId || "family-tatiana",
  familyActivityLog: Array.isArray(savedState.familyActivityLog) ? savedState.familyActivityLog : [],
  budgetPlans: Array.isArray(savedState.budgetPlans) ? savedState.budgetPlans : [],
  savingsGoals: Array.isArray(savedState.savingsGoals) ? savedState.savingsGoals : [],
  forecastSettings: savedState.forecastSettings && typeof savedState.forecastSettings === "object" ? savedState.forecastSettings : { reserve: 0, horizonDays: 30 },
  importRules: Array.isArray(savedState.importRules) ? savedState.importRules : [],
  reconciliationReviewed: savedState.reconciliationReviewed && typeof savedState.reconciliationReviewed === "object" ? savedState.reconciliationReviewed : {},
  assets: Array.isArray(savedState.assets) ? savedState.assets : [],
  shopping: savedState.shopping.length ? savedState.shopping : [
    { name: "Молоко", qty: "2 л", days: 4, price: 92 },
    { name: "Корм", qty: "3 кг", days: 26, price: 1450 },
    { name: "Стиральный порошок", qty: "1 уп.", days: 32, price: 620 }
  ]
};
ensureRowIds();
initializeFamilyOwnership();

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
  calendar: ["Регулярные деньги", "Обязательные платежи, календарь и контроль оплаты."],
  "finance-products": ["Вклады и кредиты", "Проценты, платежи и итоговые суммы по финансовым продуктам."],
  insurance: ["Страховки", "Полисы семьи, имущества, автомобиля и спорта."],
  alimony: ["Алименты", "Отдельный учет начислений, поступлений и долга."],
  shopping: ["Покупки", "Список, прогноз повторных покупок и история цен."],
  reports: ["Отчеты", "Категории, проекты, доходы, расходы и экспорт."],
  import: ["Импорт", "Загрузка CSV, предпросмотр и подготовка к проверке."],
  planning: ["Бюджет и цели", "Лимиты, накопления и прогноз остатка денег."],
  assets: ["Имущество и документы", "Недвижимость, автомобили, техника, гарантии и сроки обслуживания."],
  settings: ["Настройки", "Офлайн-режим, синхронизация и безопасность."]
};


function migrateStoredState(raw) {
  const saved = raw && typeof raw === "object" ? structuredCloneSafe(raw) : {};
  let version = Number(saved.schemaVersion || 1);
  if (version < 2) {
    saved.plannedPaymentStates = saved.plannedPaymentStates && typeof saved.plannedPaymentStates === "object" ? saved.plannedPaymentStates : {};
    saved.officialSubsistenceByYear = saved.officialSubsistenceByYear && typeof saved.officialSubsistenceByYear === "object" ? saved.officialSubsistenceByYear : {};
    version = 2;
  }
  if (version < 3) {
    saved.shoppingAliases = saved.shoppingAliases && typeof saved.shoppingAliases === "object" ? saved.shoppingAliases : {};
    (saved.insurancePolicies || []).forEach((policy) => {
      if (policy.reminderDisabled == null) policy.reminderDisabled = false;
    });
    version = 3;
  }
  if (version < 4) {
    (saved.rows || []).forEach((row, index) => {
      if (!row.id) row.id = `row-migrated-${index}-${row.date || "date"}-${Math.round(Number(row.amount) || 0)}`;
      if (row.receipt && !Array.isArray(row.receipt.items)) row.receipt.items = [];
    });
    (saved.regularPayments || []).forEach((payment) => {
      if (payment.paymentType === "utilities" && payment.hasMeters == null) payment.hasMeters = Boolean(payment.meterReadingStartDate);
    });
    version = 4;
  }
  if (version < 5) {
    saved.familyMembers = Array.isArray(saved.familyMembers) && saved.familyMembers.length ? saved.familyMembers : [
      { id: "family-tatiana", name: "Татьяна", role: "admin", color: "teal", pin: "", allowance: 0, canAddOperations: true, canSeeFamilyTotals: true, active: true },
      { id: "family-veronika", name: "Вероника", role: "child", color: "violet", pin: "", allowance: 0, canAddOperations: true, canSeeFamilyTotals: false, active: true },
      { id: "family-diana", name: "Диана", role: "child", color: "amber", pin: "", allowance: 0, canAddOperations: true, canSeeFamilyTotals: false, active: true }
    ];
    saved.activeMemberId = saved.activeMemberId || "family-tatiana";
    saved.familyActivityLog = Array.isArray(saved.familyActivityLog) ? saved.familyActivityLog : [];
    (saved.rows || []).forEach((row) => { if (!row.memberId) row.memberId = "family-tatiana"; });
    (saved.accounts || []).forEach((account) => { if (account && typeof account === "object" && !account.ownerMemberId) account.ownerMemberId = "family-tatiana"; });
    version = 5;
  }
  if (version < 6) {
    saved.syncMeta = saved.syncMeta && typeof saved.syncMeta === "object" ? saved.syncMeta : {};
    version = 6;
  }
  if (version < 7) {
    saved.budgetPlans = Array.isArray(saved.budgetPlans) ? saved.budgetPlans : [];
    saved.savingsGoals = Array.isArray(saved.savingsGoals) ? saved.savingsGoals : [];
    saved.forecastSettings = saved.forecastSettings && typeof saved.forecastSettings === "object" ? saved.forecastSettings : { reserve: 0, horizonDays: 30 };
    version = 7;
  }
  if (version < 8) {
    saved.importRules = Array.isArray(saved.importRules) ? saved.importRules : [];
    saved.reconciliationReviewed = saved.reconciliationReviewed && typeof saved.reconciliationReviewed === "object" ? saved.reconciliationReviewed : {};
    version = 8;
  }
  if (version < 9) {
    saved.savingsGoals = Array.isArray(saved.savingsGoals) ? saved.savingsGoals : [];
    saved.savingsGoals.forEach((goal) => { if (!goal.memberId) goal.memberId = "family-tatiana"; });
    saved.budgetPlans = Array.isArray(saved.budgetPlans) ? saved.budgetPlans : [];
    version = 9;
  }
  if (version < 10) {
    saved.assets = Array.isArray(saved.assets) ? saved.assets : [];
    saved.assets.forEach((asset) => {
      if (!asset.ownerMemberId) asset.ownerMemberId = "family-tatiana";
      if (!Array.isArray(asset.documents)) asset.documents = [];
    });
    version = 10;
  }
  saved.schemaVersion = CURRENT_SCHEMA_VERSION;
  return saved;
}

function structuredCloneSafe(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch { return {}; }
}

function createLocalSafetySnapshot(reason = "automatic") {
  try {
    const now = new Date();
    const last = Number(localStorage.getItem(`${storeKey}.snapshotAt`) || 0);
    if (reason === "automatic" && now.getTime() - last < 24 * 60 * 60 * 1000) return;
    const current = localStorage.getItem(storeKey);
    if (!current) return;
    localStorage.setItem(`${storeKey}.snapshot.previous`, localStorage.getItem(`${storeKey}.snapshot.latest`) || "");
    localStorage.setItem(`${storeKey}.snapshot.latest`, JSON.stringify({ createdAt: now.toISOString(), reason, payload: JSON.parse(current) }));
    localStorage.setItem(`${storeKey}.snapshotAt`, String(now.getTime()));
  } catch (error) {
    console.warn("Safety snapshot failed", error);
  }
}

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey) || "null");
    const saved = migrateStoredState(raw);
    return {
      rows: saved?.rows?.length ? saved.rows : seedRows,
      accounts: Array.isArray(saved?.accounts) ? saved.accounts : [],
      categories: Array.isArray(saved?.categories) ? saved.categories : [],
      importArchive: Array.isArray(saved?.importArchive) ? saved.importArchive : [],
      shopping: Array.isArray(saved?.shopping) ? saved.shopping : [],
      financialProducts: Array.isArray(saved?.financialProducts) ? saved.financialProducts : [],
      insurancePolicies: Array.isArray(saved?.insurancePolicies) ? saved.insurancePolicies : [],
      alimonyRules: Array.isArray(saved?.alimonyRules) ? saved.alimonyRules : [],
      regularPayments: Array.isArray(saved?.regularPayments) ? saved.regularPayments : [],
      plannedPaymentStates: saved?.plannedPaymentStates && typeof saved.plannedPaymentStates === "object" ? saved.plannedPaymentStates : {},
      shoppingAliases: saved?.shoppingAliases && typeof saved.shoppingAliases === "object" ? saved.shoppingAliases : {},
      officialSubsistenceData: saved?.officialSubsistenceData || null,
      officialSubsistenceByYear: saved?.officialSubsistenceByYear && typeof saved.officialSubsistenceByYear === "object" ? saved.officialSubsistenceByYear : {},
      familyMembers: Array.isArray(saved?.familyMembers) && saved.familyMembers.length ? saved.familyMembers : [
        { id: "family-tatiana", name: "Татьяна", role: "admin", color: "teal", pin: "", allowance: 0, canAddOperations: true, canSeeFamilyTotals: true, active: true },
        { id: "family-veronika", name: "Вероника", role: "child", color: "violet", pin: "", allowance: 0, canAddOperations: true, canSeeFamilyTotals: false, active: true },
        { id: "family-diana", name: "Диана", role: "child", color: "amber", pin: "", allowance: 0, canAddOperations: true, canSeeFamilyTotals: false, active: true }
      ],
      activeMemberId: saved?.activeMemberId || "family-tatiana",
      familyActivityLog: Array.isArray(saved?.familyActivityLog) ? saved.familyActivityLog : [],
      budgetPlans: Array.isArray(saved?.budgetPlans) ? saved.budgetPlans : [],
      savingsGoals: Array.isArray(saved?.savingsGoals) ? saved.savingsGoals : [],
      forecastSettings: saved?.forecastSettings && typeof saved.forecastSettings === "object" ? saved.forecastSettings : { reserve: 0, horizonDays: 30 },
      importRules: Array.isArray(saved?.importRules) ? saved.importRules : [],
      reconciliationReviewed: saved?.reconciliationReviewed && typeof saved.reconciliationReviewed === "object" ? saved.reconciliationReviewed : {},
      assets: Array.isArray(saved?.assets) ? saved.assets : []
    };
  } catch {}
  return { rows: seedRows, accounts: [], categories: [], importArchive: [], shopping: [], shoppingAliases: {}, financialProducts: [], insurancePolicies: [], alimonyRules: [], regularPayments: [], plannedPaymentStates: {}, familyMembers: [], activeMemberId: "family-tatiana", familyActivityLog: [], budgetPlans: [], savingsGoals: [], forecastSettings: { reserve: 0, horizonDays: 30 }, importRules: [], reconciliationReviewed: {}, assets: [] };
}

function saveState() {
  createLocalSafetySnapshot("automatic");
  const savedAt = new Date().toISOString();
  localStorage.setItem(storeKey, JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt,
    rows: state.rows,
    accounts: state.accounts,
    categories: state.categories,
    importArchive: state.importArchive,
    shopping: state.shopping,
    shoppingAliases: state.shoppingAliases,
    financialProducts: state.financialProducts,
    insurancePolicies: state.insurancePolicies,
    alimonyRules: state.alimonyRules,
    regularPayments: state.regularPayments,
    plannedPaymentStates: state.plannedPaymentStates,
    officialSubsistenceData: state.officialSubsistenceData,
    officialSubsistenceByYear: state.officialSubsistenceByYear,
    familyMembers: state.familyMembers,
    activeMemberId: state.activeMemberId,
    familyActivityLog: state.familyActivityLog,
    budgetPlans: state.budgetPlans,
    savingsGoals: state.savingsGoals,
    forecastSettings: state.forecastSettings,
    importRules: state.importRules,
    reconciliationReviewed: state.reconciliationReviewed,
    assets: state.assets
  }));
  localStorage.setItem(`${storeKey}.lastSavedAt`, savedAt);
  updateDatabaseStatus();
  scheduleCloudSyncAfterSave();
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
  return `<span class="category-icon category-icon--asset" title="${escapeHtml(fallbackLabel)}" aria-label="${escapeHtml(fallbackLabel)}"><img src="./assets/category-icons-premium/${escapeHtml(assetFile)}" alt="" loading="lazy" decoding="async" onerror="this.closest('.category-icon').classList.add('category-icon--missing');this.remove()"></span>`;
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

function parseLocalDateInput(value, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function periodRangeByValue(value = "month") {
  const customStart = parseLocalDateInput(byId("dashboardDateFrom")?.value);
  const customEnd = parseLocalDateInput(byId("dashboardDateTo")?.value, true);
  if (customStart && customEnd) {
    const start = customStart <= customEnd ? customStart : customEnd;
    const end = customStart <= customEnd ? customEnd : new Date(customStart.setHours(23,59,59,999));
    return { start, end, label: "Выбранный период" };
  }
  const end = new Date();
  const start = new Date(end);
  let label = "Месяц";
  if (value === "week") { start.setDate(end.getDate() - 6); label = "Неделя"; }
  else if (value === "quarter") { start.setMonth(end.getMonth() - 2, 1); label = "Квартал"; }
  else if (value === "half") { start.setMonth(end.getMonth() - 5, 1); label = "Полугодие"; }
  else if (value === "year") { start.setMonth(end.getMonth() - 11, 1); label = "Год"; }
  else if (value === "all") {
    const min = state.rows.map((row) => rowDate(row)).filter(Boolean).sort((a,b)=>a-b)[0];
    if (min) start.setTime(min.getTime());
    label = "Всё время";
  } else { start.setDate(1); label = "Месяц"; }
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);
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
    .filter((policy) => policy.endDate && !policy.reminderDisabled && !hasInsuranceRenewal(policy))
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
      <button class="ghost disable-insurance-reminder" data-policy-id="${escapeHtml(policy.id)}" type="button">Отключить</button>
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

function loanPaymentReminders() {
  const today = new Date(); today.setHours(0,0,0,0);
  return regularOccurrences().filter((item) => item.paymentType === "loan" && occurrenceStatus(item) !== "paid").map((item) => {
    const due = new Date(`${item.dueDate}T00:00:00`);
    const daysLeft = Math.round((due - today) / 86400000);
    return {...item, daysLeft};
  }).filter((item) => item.daysLeft <= 3).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
}

function renderLoanAlerts() {
  const target = byId("loanAlerts"), countNode = byId("loanAlertCount");
  if (!target || !countNode) return;
  const items = loanPaymentReminders(); countNode.textContent = items.length;
  target.innerHTML = items.length ? items.map((item) => {
    const status = item.daysLeft < 0 ? `Просрочен на ${Math.abs(item.daysLeft)} дн.` : item.daysLeft === 0 ? "Платёж сегодня" : `До платежа ${item.daysLeft} дн.`;
    return `<article class="alert-card ${item.daysLeft < 0 ? "alert-card--danger" : "alert-card--warning"}"><div class="alert-card-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.bank || item.payee || "Кредит")}</small><p>${escapeHtml(status)}. Напоминание останется до отметки об оплате или связи с банковской операцией.</p></div><div class="alert-card-side"><span>${money(item.amount)}</span><button class="ghost open-planned-payment" data-occurrence-id="${escapeHtml(item.occurrenceId)}" type="button">Оплатить</button></div></article>`;
  }).join("") : `<article class="empty-state"><strong>Платежи под контролем</strong><p>На ближайшие 3 дня неоплаченных платежей по кредитам нет.</p></article>`;
}



function financeProductClosureEvents() {
  const today = dateLocal(new Date());
  return state.financialProducts.map((product) => {
    const endDate = product.type === "loan"
      ? (pkg9LoanSchedule(product).finishDate || addMonthsSafe(product.startDate, Number(product.termMonths) || 1))
      : addMonthsSafe(product.startDate, Number(product.termMonths) || 1);
    const due = new Date(`${endDate}T00:00:00`);
    const now = new Date(`${today}T00:00:00`);
    const daysLeft = Math.round((due - now) / 86400000);
    return { ...product, endDate, daysLeft };
  });
}

function financeProductMaturityReminders() {
  return financeProductClosureEvents()
    .filter((item) => item.daysLeft === 3)
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

function financeProductClosureCelebrations() {
  return financeProductClosureEvents()
    .filter((item) => item.daysLeft === 0)
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

function renderFinanceProductMaturityAlerts() {
  const target = byId("financeMaturityAlerts");
  const countNode = byId("financeMaturityAlertCount");
  if (!target || !countNode) return;
  const items = financeProductMaturityReminders();
  countNode.textContent = items.length;
  target.innerHTML = items.length ? items.map((item) => {
    const isLoan = item.type === "loan";
    return `<article class="alert-card alert-card--warning"><div class="alert-card-copy"><strong>${escapeHtml(item.name)}</strong><small>${isLoan ? "Кредит" : "Вклад"} • ${escapeHtml(item.bank || "Банк не указан")}</small><p>${isLoan ? "Через 3 дня наступает дата закрытия кредита." : "Через 3 дня заканчивается срок вклада."} Проверьте условия закрытия, пролонгации и зачисления средств.</p></div><div class="alert-card-side"><span>${formatTransactionDate(item.endDate)}</span><button class="ghost open-finance-product-details" data-product-id="${escapeHtml(item.id)}" type="button">Подробнее</button></div></article>`;
  }).join("") : `<article class="empty-state"><strong>Сроки под контролем</strong><p>Через 3 дня не заканчиваются вклады и кредиты.</p></article>`;
}

function renderFinanceClosureCelebration() {
  const panel = byId("financeClosureCelebrationPanel");
  const target = byId("financeClosureCelebration");
  if (!panel || !target) return;
  const items = financeProductClosureCelebrations();
  panel.hidden = items.length === 0;
  target.innerHTML = items.map((item) => {
    const isLoan = item.type === "loan";
    const title = isLoan ? "Сегодня закрывается кредит — ещё одна финансовая цель достигнута!" : "Сегодня завершается вклад — ваши деньги поработали на вас!";
    const text = isLoan ? "Вы освободили часть будущего бюджета. Отличный повод направить её на новую цель или резерв." : "Проверьте зачисление суммы и процентов и решите, куда направить результат дальше.";
    return `<article class="finance-closure-celebration"><div class="celebration-icon">${isLoan ? "🎉" : "✨"}</div><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(item.name)} • ${escapeHtml(text)}</p></div><button class="ghost open-finance-product-details" data-product-id="${escapeHtml(item.id)}" type="button">Открыть</button></article>`;
  }).join("");
}

function utilityEventReminders() {
  const today = new Date(); today.setHours(0,0,0,0);
  return regularOccurrences().filter((item) => item.paymentType === 'utilities' && occurrenceStatus(item) !== 'paid').map((item) => {
    const due = new Date(`${item.dueDate}T00:00:00`);
    const daysLeft = Math.round((due - today) / 86400000);
    return { ...item, daysLeft };
  }).filter((item) => item.daysLeft === 3 || item.daysLeft === 0 || item.daysLeft < 0).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
}

function renderUtilityAlerts() {
  const target = byId('utilityAlerts'), countNode = byId('utilityAlertCount');
  if (!target || !countNode) return;
  const items = utilityEventReminders(); countNode.textContent = items.length;
  target.innerHTML = items.length ? items.map((item) => {
    const isMeter = item.eventKind === 'meter-reading';
    const action = isMeter ? 'Передать показания' : 'Внести платёж';
    const status = item.daysLeft < 0 ? `Срок пропущен на ${Math.abs(item.daysLeft)} дн.` : item.daysLeft === 0 ? `${action} сегодня` : `${action} через 3 дня`;
    return `<article class="alert-card ${item.daysLeft < 0 ? 'alert-card--danger' : 'alert-card--warning'}"><div class="alert-card-copy"><strong>${escapeHtml(item.name)}</strong><small>${isMeter ? 'Передача показаний' : 'Оплата ЖКХ'} • ${escapeHtml(item.payee || item.project || 'Коммунальные услуги')}</small><p>${escapeHtml(status)}. Уведомление показывается за 3 дня и в день события${item.daysLeft < 0 ? ', а затем остаётся до отметки выполнения' : ''}.</p></div><div class="alert-card-side"><span>${formatTransactionDate(item.dueDate)}</span><button class="ghost open-planned-payment" data-occurrence-id="${escapeHtml(item.occurrenceId)}" type="button">${isMeter ? 'Отметить' : 'Оплатить'}</button></div></article>`;
  }).join('') : `<article class="empty-state"><strong>ЖКХ под контролем</strong><p>Сегодня и через 3 дня нет событий по оплате или передаче показаний.</p></article>`;
}

function appNotificationCount() {
  return insuranceReminderPolicies().length + loanPaymentReminders().length + financeProductMaturityReminders().length + utilityEventReminders().length + workExpenseRows(false).length;
}

function renderNotificationCenterBadge() {
  const badge = byId("notificationBadge"); if (!badge) return;
  const count = appNotificationCount(); badge.textContent = count; badge.hidden = count === 0;
  byId("notificationCenterBtn")?.classList.toggle("has-notifications", count > 0);
}


// ===== Пакет 11: системные уведомления Android =====
function nativeNotificationDateTime(dateText, hour = 9, minute = 0) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 0;
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

function nativeNotificationItems() {
  const todayText = dateLocal(new Date());
  const now = Date.now();
  const max = now + 120 * 86400000;
  const items = [];
  const add = (id, dateText, daysBefore, title, body, kind) => {
    if (!dateText) return;
    const triggerDate = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(triggerDate.getTime())) return;
    triggerDate.setDate(triggerDate.getDate() - Math.max(0, Number(daysBefore) || 0));
    const triggerText = dateLocal(triggerDate);
    let triggerAt = nativeNotificationDateTime(triggerText, 9, 0);
    if (triggerText === todayText && triggerAt <= now) triggerAt = now + 5000;
    if (triggerAt < now || triggerAt > max) return;
    items.push({ id: `${id}@${triggerText}`, triggerAt, title, body, kind });
  };

  regularOccurrences(0, 4).forEach((item) => {
    if (occurrenceStatus(item) === 'paid' || item.dueDate < todayText) return;
    const days = Number(item.remindDays ?? (item.paymentType === 'loan' || item.paymentType === 'utilities' ? 3 : 1));
    const typeLabel = item.eventKind === 'meter-reading' ? 'Показания' : (regularTypeLabels[item.paymentType] || 'Платёж');
    const amount = Number(item.amount || 0) > 0 ? ` • ${money(item.amount)}` : '';
    add(`payment-${item.occurrenceId}`, item.dueDate, days, `${typeLabel}: ${item.name}`, `Срок ${formatTransactionDate(item.dueDate)}${amount}`, item.paymentType || 'payment');
    if (days > 0) add(`payment-day-${item.occurrenceId}`, item.dueDate, 0, `${typeLabel} сегодня: ${item.name}`, amount ? `К оплате ${money(item.amount)}` : 'Откройте ФинПорядок и отметьте выполнение', item.paymentType || 'payment');
  });

  insuranceReminderPolicies().forEach((policy) => {
    if (policy.daysLeft >= 0) add(`insurance-${policy.id}`, policy.endDate, Math.min(7, Math.max(0, policy.daysLeft)), `Заканчивается страховка: ${policy.name}`, `${policy.subjectName} • ${formatTransactionDate(policy.endDate)}`, 'insurance');
  });

  financeProductClosureEvents().forEach((product) => {
    if (!product.endDate) return;
    const noun = product.type === 'loan' ? 'кредит' : 'вклад';
    add(`maturity-${product.id}`, product.endDate, 3, `Через 3 дня заканчивается ${noun}`, product.name, 'finance-product');
    add(`maturity-day-${product.id}`, product.endDate, 0, product.type === 'loan' ? 'Сегодня закрывается кредит 🎉' : 'Сегодня заканчивается вклад ✨', product.name, 'finance-product');
  });

  assetVisibleItems().forEach((asset) => {
    assetDeadlineItems(asset).forEach((deadline) => {
      add(`asset-${asset.id}-${deadline.label}`, deadline.date, 30, `${asset.name}: ${deadline.label}`, `Срок ${formatTransactionDate(deadline.date)}`, 'asset');
      add(`asset-week-${asset.id}-${deadline.label}`, deadline.date, 7, `${asset.name}: срок через неделю`, deadline.label, 'asset');
    });
  });

  state.regularPayments.filter((item) => item.paymentType === 'subscription' && item.subscriptionStatus !== 'cancelled').forEach((item) => {
    if (item.trialEndDate) add(`trial-${item.id}`, item.trialEndDate, Math.max(1, Number(item.remindDays) || 3), `Заканчивается пробный период: ${item.name}`, formatTransactionDate(item.trialEndDate), 'subscription');
  });

  const unique = new Map();
  items.forEach((item) => unique.set(item.id, item));
  return [...unique.values()].sort((a, b) => a.triggerAt - b.triggerAt).slice(0, 250);
}

function syncNativeNotifications() {
  const bridge = window.AndroidNotifications;
  const items = nativeNotificationItems();
  const count = byId('nativeNotificationScheduleCount');
  if (count) count.textContent = `${items.length} запланировано`;
  if (!bridge || typeof bridge.sync !== 'function') {
    const status = byId('nativeNotificationStatus');
    if (status) status.textContent = 'Системные уведомления доступны в Android-приложении.';
    byId('enableNativeNotificationsBtn')?.setAttribute('hidden', '');
    return;
  }
  try {
    bridge.sync(JSON.stringify(items));
    const enabled = typeof bridge.areEnabled === 'function' ? bridge.areEnabled() : false;
    window.onNativeNotificationState(Boolean(enabled), '');
  } catch (error) {
    const status = byId('nativeNotificationStatus');
    if (status) status.textContent = `Не удалось обновить расписание: ${error.message || error}`;
  }
}

window.onNativeNotificationState = function(enabled, message = '') {
  const status = byId('nativeNotificationStatus');
  const button = byId('enableNativeNotificationsBtn');
  if (status) status.textContent = message || (enabled ? 'Разрешены. Расписание обновляется автоматически.' : 'Отключены. Нажмите «Включить» и разрешите уведомления Android.');
  if (button) {
    button.hidden = Boolean(enabled);
    button.textContent = 'Включить';
  }
};

byId('enableNativeNotificationsBtn')?.addEventListener('click', () => {
  if (window.AndroidNotifications?.requestPermission) window.AndroidNotifications.requestPermission();
  else alert('Системные уведомления доступны только в Android-приложении.');
});


const UI_PREF_KEY = `${storeKey}.ui`;
const UI_THEMES = new Set(["sky", "warm", "mint", "plain", "dark"]);
const UI_DENSITIES = new Set(["compact", "comfortable", "large"]);

function loadUiPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_PREF_KEY) || "{}");
    return {
      theme: UI_THEMES.has(saved.theme) ? saved.theme : "sky",
      density: UI_DENSITIES.has(saved.density) ? saved.density : "comfortable",
      animations: saved.animations !== false
    };
  } catch { return { theme: "sky", density: "comfortable", animations: true }; }
}

function applyUiPreferences(preferences = loadUiPreferences()) {
  document.body.dataset.uiTheme = preferences.theme;
  document.body.dataset.uiDensity = preferences.density;
  document.body.classList.toggle("reduce-motion", !preferences.animations);
  const theme = byId("uiThemeSelect"), density = byId("uiDensitySelect"), animations = byId("uiAnimationsToggle");
  if (theme) theme.value = preferences.theme;
  if (density) density.value = preferences.density;
  if (animations) animations.checked = preferences.animations;
}

function saveUiPreferences() {
  const preferences = {
    theme: byId("uiThemeSelect")?.value || "sky",
    density: byId("uiDensitySelect")?.value || "comfortable",
    animations: byId("uiAnimationsToggle")?.checked !== false
  };
  localStorage.setItem(UI_PREF_KEY, JSON.stringify(preferences));
  applyUiPreferences(preferences);
}

function arrangeDashboardPanels() {
  const dashboard = byId("dashboard");
  const grid = byId("dashboardPrimaryGrid");
  if (!dashboard || !grid || byId("dashboardApprovedLayout")) return;
  const layout = document.createElement("div");
  layout.id = "dashboardApprovedLayout";
  layout.className = "dashboard-approved-layout";
  grid.parentNode.insertBefore(layout, grid);
  const accounts = byId("dashboardAccountsPanel");
  const categories = byId("dashboardCategoriesPanel");
  const latest = byId("dashboardLatestPanel");
  const payments = byId("utilityAlertsPanel");
  const notifications = byId("nativeNotificationPanel");
  [accounts, payments, notifications, categories, latest].filter(Boolean).forEach((node) => layout.appendChild(node));
  if (!grid.children.length) grid.remove();
}

function buildMobileDrawer() {
  const target = byId("mobileDrawerGrid");
  if (!target || target.children.length) return;
  document.querySelectorAll(".sidebar .nav button[data-view]").forEach((source) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.mobileView = source.dataset.view;
    const img = source.querySelector("img");
    button.innerHTML = `${img ? `<img src="${img.getAttribute("src")}" alt="">` : ""}<span>${escapeHtml(source.textContent.trim())}</span>`;
    target.appendChild(button);
  });
}

function openMobileDrawer(open = true) {
  const drawer = byId("mobileNavDrawer"), backdrop = byId("mobileNavBackdrop");
  if (!drawer || !backdrop) return;
  drawer.classList.toggle("open", open);
  drawer.setAttribute("aria-hidden", String(!open));
  backdrop.hidden = !open;
  document.body.classList.toggle("mobile-nav-open", open);
}

function syncMobileNavigation(viewId) {
  document.querySelectorAll("[data-mobile-view]").forEach((button) => button.classList.toggle("active", button.dataset.mobileView === viewId));
}

document.addEventListener("click", (event) => {
  const mobileView = event.target.closest("[data-mobile-view]");
  if (mobileView) {
    event.preventDefault();
    setView(mobileView.dataset.mobileView);
    syncMobileNavigation(mobileView.dataset.mobileView);
    openMobileDrawer(false);
    return;
  }
  if (event.target.closest("#mobileMenuBtn")) { buildMobileDrawer(); openMobileDrawer(true); return; }
  if (event.target.closest("#closeMobileNavBtn") || event.target.closest("#mobileNavBackdrop")) { openMobileDrawer(false); return; }
  if (event.target.closest("#mobileAddTxBtn")) { byId("addTxBtn")?.click(); return; }
});

["uiThemeSelect", "uiDensitySelect", "uiAnimationsToggle"].forEach((id) => byId(id)?.addEventListener("change", saveUiPreferences));

function render() {
  renderMeta();
  renderFilters();
  renderDashboard();
  renderTransactions();
  renderWorkExpenseCenter();
  renderAccounts();
  renderBudgets();
  renderFinanceProducts();
  renderAssets();
  renderRegularMoney();
  renderInsurance();
  renderInsuranceAlerts();
  renderLoanAlerts();
  renderFinanceProductMaturityAlerts();
  renderFinanceClosureCelebration();
  renderUtilityAlerts();
  renderWorkReimbursement();
  renderNotificationCenterBadge();
  renderAlimony();
  renderShopping();
  renderReports();
  renderImportArchive();
  renderFamilyAccess();
  applyFamilyPermissions();
  setTimeout(syncNativeNotifications, 0);
}


function reviewItems() {
  const items = [];
  const seenDuplicate = new Set();
  const groups = new Map();
  state.rows.forEach((row) => {
    const key = `${row.date || ''}|${Math.round((Number(row.amount) || 0) * 100)}|${normalizeBrandText(row.description || row.payee || '')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
    const reasons = [];
    if (!row.category || row.category === 'Без категории') reasons.push('не указана категория');
    if (!row.account) reasons.push('не указан счёт');
    if (!row.description && !row.payee) reasons.push('нет описания или получателя');
    if (reasons.length) items.push({ kind: 'operation', id: row.id, title: row.description || row.payee || 'Операция без названия', subtitle: `${formatTransactionDate(row.date)} • ${money(row.amount)}`, reason: reasons.join(', ') });
  });
  groups.forEach((rows) => {
    if (rows.length < 2) return;
    rows.forEach((row) => {
      if (seenDuplicate.has(row.id)) return;
      seenDuplicate.add(row.id);
      items.push({ kind: 'operation', id: row.id, title: row.description || row.payee || 'Возможный дубликат', subtitle: `${formatTransactionDate(row.date)} • ${money(row.amount)}`, reason: `возможный дубликат: найдено ${rows.length} операций с одинаковой датой, суммой и описанием` });
    });
  });
  state.insurancePolicies.forEach((policy) => {
    if (!policy.pdfStored) items.push({ kind: 'insurance', id: policy.id, title: policy.name || 'Страховой полис', subtitle: policy.subjectName || 'Объект не указан', reason: 'к полису не приложен PDF-документ' });
  });
  regularOccurrences().forEach((occurrence) => {
    const saved = state.plannedPaymentStates[occurrence.occurrenceId] || {};
    if (saved.paidAmount && Math.abs(Number(saved.paidAmount) - Number(occurrence.amount || 0)) > 1) {
      items.push({ kind: 'planned', id: occurrence.occurrenceId, title: occurrence.name, subtitle: `${formatTransactionDate(occurrence.dueDate)} • план ${money(occurrence.amount)} / факт ${money(saved.paidAmount)}`, reason: 'фактическая сумма отличается от плановой' });
    }
    if (saved.transactionId && !state.rows.some((row) => row.id === saved.transactionId)) {
      items.push({ kind: 'planned', id: occurrence.occurrenceId, title: occurrence.name, subtitle: formatTransactionDate(occurrence.dueDate), reason: 'связанная банковская операция не найдена' });
    }
  });
  return items.slice(0, 250);
}

function renderReviewCenter() {
  const items = reviewItems();
  const count = byId('reviewCount');
  if (count) count.textContent = items.length;
  const target = byId('reviewCenterList');
  if (!target) return;
  target.innerHTML = items.length ? items.map((item) => `<article class="review-item"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.subtitle || '')}</small><p class="review-reason">Причина: ${escapeHtml(item.reason)}</p></div><div class="review-item-actions"><button class="ghost open-review-item" data-review-kind="${escapeHtml(item.kind)}" data-review-id="${escapeHtml(item.id)}" type="button">Открыть</button></div></article>`).join('') : `<article class="empty-state"><strong>Проверка не требуется</strong><p>Спорных документов и операций сейчас нет.</p></article>`;
}

function renderMeta() {
  const s = summary();
  byId("sourceName").textContent = window.ANDROMONEY_DATA?.source || "Локальные данные";
  byId("sourceMeta").textContent = `${s.rows.length} операций, ${s.minDate} - ${s.maxDate}`;
  renderReviewCenter();
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
  const member = activeFamilyMember();
  return state.rows.filter((row) => {
    if (member?.role === "child" && row.memberId !== member.id) return false;
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
        <span class="transaction-bank-meta">${kind === "transfer" ? `${bankIcon(row.from || row.account || "Счёт")}<i aria-hidden="true">→</i>${bankIcon(row.to || "Счёт")}` : bankIcon(row.account || "Без счёта")}</span>
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
  return `<article class="card category-card drill-card category-card--${categoryType}" data-drill-kind="category" data-drill-value="${escapeHtml(name)}" tabindex="0">
    <div class="category-card-title">
      ${categoryIcon(name)}
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
          : (Number(product.monthlyPaymentOverride) || calc.monthlyPayment);
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
  const monthly = loans.reduce((sum, item) => sum + (Number(item.monthlyPaymentOverride) || calculateLoan(item).monthlyPayment), 0);
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
  document.querySelectorAll(".loan-sum-label").forEach((item) => item.hidden = type !== "loan");
  document.querySelectorAll(".deposit-sum-label").forEach((item) => item.hidden = type !== "deposit");
  updateFinanceCalculationPreview();
}

function currentFinanceFormProduct() {
  const data = Object.fromEntries(new FormData(byId("financeProductForm")).entries());
  return {
    type: data.productType,
    name: data.name || "Предварительный расчёт",
    bank: data.bank || "",
    principal: Number(data.principal) || 0,
    downPayment: Number(data.downPayment) || 0,
    openingBalance: Number(data.openingBalance) || Number(data.principal) || 0,
    monthlyPaymentOverride: Number(data.monthlyPaymentOverride) || 0,
    rate: Number(data.rate) || 0,
    rateMode: data.rateMode || "annual",
    termMonths: Number(data.termMonths) || 1,
    startDate: data.startDate || new Date().toISOString().slice(0, 10),
    paymentType: data.paymentType || "annuity",
    paymentDay: Number(data.paymentDay) || 10,
    capitalization: data.capitalization || "monthly",
    expenseCategory: data.expenseCategory || "Кредиты",
    incomeCategory: data.incomeCategory || "Проценты по вкладам",
    earlyRepaymentStrategy: data.earlyRepaymentStrategy || "reduceTerm",
    loanInsuranceAnnual: Number(data.loanInsuranceAnnual) || 0,
    autoProlongation: data.autoProlongation === "true",
    depositTaxRate: Number(data.depositTaxRate) || 0
  };
}

function updateFinanceCalculationPreview() {
  const target = byId("financeCalculationPreview");
  if (!target) return;
  const product = currentFinanceFormProduct();
  if (product.type === "loan") {
    const calc = calculateLoan(product);
    const effectivePayment = Number(product.monthlyPaymentOverride) || calc.monthlyPayment;
    target.innerHTML = `<div><span>Расчётный платёж</span><strong>${money(calc.monthlyPayment)}</strong></div>
      <div><span>Платёж в плане</span><strong>${money(effectivePayment)}</strong></div>
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
    <div class="insurance-card-actions" aria-label="Действия с полисом">
      ${policy.pdfStored
        ? `<button class="insurance-action-icon open-insurance-pdf" data-policy-id="${escapeHtml(policy.id)}" type="button" title="Открыть PDF" aria-label="Открыть PDF">📄</button>`
        : `<button class="insurance-action-icon" type="button" title="PDF не загружен" aria-label="PDF не загружен" disabled>📄</button>`}
      <button class="insurance-action-icon edit-insurance" data-policy-id="${escapeHtml(policy.id)}" type="button" title="Редактировать полис" aria-label="Редактировать полис">✏️</button>
      <button class="insurance-action-icon toggle-insurance-reminder ${policy.reminderDisabled ? "is-muted" : ""}" data-policy-id="${escapeHtml(policy.id)}" type="button" title="${policy.reminderDisabled ? "Включить уведомления" : "Отключить уведомления"}" aria-label="${policy.reminderDisabled ? "Включить уведомления" : "Отключить уведомления"}">${policy.reminderDisabled ? "🔔" : "🔕"}</button>
    </div>
  </article>`;
}

function filteredInsurancePolicies() {
  const statusFilter = byId("insuranceStatusFilter")?.value || "all";
  const projectFilter = byId("insuranceProjectFilter")?.value || "all";
  const objectFilter = byId("insuranceObjectFilter")?.value || "all";
  return state.insurancePolicies.filter((policy) => {
    const status = insuranceStatus(policy).key;
    const objectKey = `${policy.subjectType || "other"}|${normalizeBrandText(policy.subjectName || "")}`;
    return (statusFilter === "all" || status === statusFilter) &&
      (projectFilter === "all" || policy.project === projectFilter) &&
      (objectFilter === "all" || objectKey === objectFilter);
  });
}

function renderInsuranceCostHistory() {
  const panel = byId("insuranceCostHistory");
  const select = byId("insuranceObjectFilter");
  if (!panel || !select) return;
  const key = select.value;
  if (!key || key === "all") { panel.hidden = true; return; }
  const items = state.insurancePolicies.filter((policy) => `${policy.subjectType || "other"}|${normalizeBrandText(policy.subjectName || "")}` === key);
  if (!items.length) { panel.hidden = true; return; }
  const byYear = new Map();
  items.forEach((policy) => {
    const year = String(policy.startDate || policy.endDate || "").slice(0,4) || "Без года";
    const current = byYear.get(year) || { total:0, count:0, policies:[] };
    current.total += Number(policy.cost) || 0; current.count += 1; current.policies.push(policy); byYear.set(year,current);
  });
  const first = items[0];
  byId("insuranceHistorySubtitle").textContent = `${first.subjectName} • ${insuranceSubjectLabel(first.subjectType)}`;
  byId("insuranceHistoryTotal").textContent = money(items.reduce((sum,item)=>sum+(Number(item.cost)||0),0));
  byId("insuranceYearGrid").innerHTML = [...byYear.entries()].sort((a,b)=>String(b[0]).localeCompare(String(a[0]))).map(([year,data]) => {
    const avg = data.count ? data.total / data.count : 0;
    return `<article class="insurance-year-card"><span>${escapeHtml(year)}</span><strong>${money(data.total)}</strong><small>${data.count} ${data.count===1?"полис":"полиса"} • средняя ${money(avg)}</small></article>`;
  }).join("");
  panel.hidden = false;
}

function renderInsurance() {
  const policies = filteredInsurancePolicies();
  const all = state.insurancePolicies;
  const active = all.filter((item) => insuranceStatus(item).key !== "expired");
  const expiring = all.filter((item) => insuranceStatus(item).key === "expiring");
  const projects = [...new Set(all.map((item) => item.project).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
  const objects = [...new Map(all.filter(item=>item.subjectName).map(item=>[`${item.subjectType || "other"}|${normalizeBrandText(item.subjectName)}`, item])).entries()]
    .sort((a,b)=>String(a[1].subjectName).localeCompare(String(b[1].subjectName),"ru"));

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
  const objectSelect = byId("insuranceObjectFilter");
  if (objectSelect) {
    const current = objectSelect.value;
    objectSelect.innerHTML = `<option value="all">Все объекты</option>` + objects.map(([key,item]) => `<option value="${escapeHtml(key)}">${escapeHtml(item.subjectName)} — ${escapeHtml(insuranceSubjectLabel(item.subjectType))}</option>`).join("");
    if ([...objectSelect.options].some(option=>option.value===current)) objectSelect.value=current;
  }
  renderInsuranceCostHistory();
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
function alimonyRuleForMonth(key) { return alimonyRulesSorted().filter(r => r.effectiveFrom <= key && (!r.effectiveTo || key <= r.effectiveTo)).at(-1) || null; }
function alimonyPaymentRows() {
  return state.rows.filter(row => row.alimonyPayment || (row.amount>0 && /алим/i.test(`${row.project} ${row.category} ${row.description}`))).map(row=>({ ...row, paymentStatus: row.paymentStatus || "confirmed", payerName: row.payerName || (row.alimonyPayment ? "Должник" : row.payee || "Не указан") }));
}
function confirmedAlimonyPayments() { return alimonyPaymentRows().filter(r=>r.paymentStatus==="confirmed"); }
function buildAlimonyLedger() {
  const rules=alimonyRulesSorted(); if(!rules.length) return [];
  const start=monthDate(rules[0].effectiveFrom);
  // Алименты за месяц начисляются 1-го числа следующего месяца.
  // Поэтому текущий незавершённый месяц в начисления не включается.
  const now=new Date();
  const end=new Date(now.getFullYear(), now.getMonth()-1, 1);
  const payments=confirmedAlimonyPayments(); const rows=[]; let carry=Number(rules[0].openingDebt)||0;
  for(let d=new Date(start); d<=end; d.setMonth(d.getMonth()+1)){
    const key=monthKey(d), rule=alimonyRuleForMonth(key); if(!rule) continue;
    const accrued=(Number(rule.childrenCount)||1)*(Number(rule.amountPerChild)||0);
    const accrualDate=new Date(d.getFullYear(), d.getMonth()+1, 1);
    const nextAccrualDate=new Date(d.getFullYear(), d.getMonth()+2, 1);
    // Платежи, поступившие после даты начисления и до следующего начисления,
    // показываются рядом с соответствующим расчётным месяцем.
    const paid=payments.filter(p=>{
      const paymentDate=new Date(`${p.date||""}T00:00:00`);
      return !Number.isNaN(paymentDate.getTime()) && paymentDate>=accrualDate && paymentDate<nextAccrualDate;
    }).reduce((s,p)=>s+Math.max(0,Number(p.amount)||0),0);
    carry += accrued-paid;
    rows.push({key, accrualDate:accrualDate.toISOString().slice(0,10), accrued, paid, balance:carry, rule});
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
  if(byId("alimonyRules")) byId("alimonyRules").innerHTML=rules.length?rules.map(rule=>{const isPm=rule.calculationType==="subsistence"||Number(rule.subsistenceAmount)>0;const decreeUrl=safeExternalUrl(rule.decreeUrl);return `<article class="alimony-rule-card" data-alimony-rule-id="${escapeHtml(rule.id)}" role="button" tabindex="0" aria-label="Открыть и редактировать правило с ${escapeHtml(rule.effectiveFrom)}"><div><strong>${rule.effectiveTo ? `С ${escapeHtml(rule.effectiveFrom)} по ${escapeHtml(rule.effectiveTo)}` : `С ${escapeHtml(rule.effectiveFrom)}`}</strong><small>${rule.childrenCount} детей × ${money(rule.amountPerChild)} в месяц</small>${isPm?`<div class="alimony-pm-details"><span>${escapeHtml(rule.subsistenceRegion||"Москва")}: прожиточный минимум ${money(rule.subsistenceAmount||0)}</span><span>${Number(rule.subsistencePercent||0).toLocaleString("ru-RU")}% = ${money(rule.amountPerChild||0)} на ребёнка</span></div>`:""}<p>${escapeHtml(rule.basis||"Основание не указано")}</p>${rule.decreeNumber?`<p class="alimony-decree">${decreeUrl?`<a href="${escapeHtml(decreeUrl)}" target="_blank" rel="noopener">${escapeHtml(rule.decreeNumber)}</a>`:escapeHtml(rule.decreeNumber)}</p>`:""}<small class="alimony-edit-hint">Нажмите, чтобы просмотреть или изменить правило</small></div><button class="icon-button delete-alimony-rule" data-rule-id="${escapeHtml(rule.id)}" aria-label="Удалить правило">×</button></article>`;}).join(""):`<article class="empty-state"><strong>Нет правил начисления</strong><p>Добавьте размер алиментов и дату начала.</p></article>`;
  if(byId("alimonyMonthLedger")) byId("alimonyMonthLedger").innerHTML=ledger.length?[...ledger].reverse().slice(0,36).map(m=>`<article class="alimony-month-row"><div><strong>За ${monthDate(m.key).toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}</strong><small>Начислено ${new Date(`${m.accrualDate}T00:00:00`).toLocaleDateString("ru-RU")} • ${money(m.accrued)} • Оплачено ${money(m.paid)}</small></div><b class="${m.balance>0?'bad':'good'}">${m.balance>0?`Долг ${money(m.balance)}`:`Переплата ${money(Math.abs(m.balance))}`}</b></article>`).join(""):`<article class="empty-state"><strong>Расчёт пока пуст</strong><p>Начисление за месяц появится 1-го числа следующего месяца.</p></article>`;
  if(byId("alimonyRows")) byId("alimonyRows").innerHTML=payments.length?payments.slice(0,100).map(row=>`<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.payerName||"Не указан")}</td><td>${escapeHtml(row.description||"Алименты")}</td><td>${accountPill(row.account)}</td><td>${escapeHtml(row.paymentStatus==="confirmed"?"Подтверждён":row.paymentStatus==="unidentified"?"Неопознанный":"Спорный")}</td><td class="amount good">${money(row.amount)}</td></tr>`).join(""):`<tr><td colspan="6">Поступлений пока нет</td></tr>`;
}


function productBaseName(value) {
  return normalizeBrandText(String(value || ""))
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:кг|г|мл|л|шт|уп|пач|бут|бан)\b/gi, " ")
    .replace(/\b(?:акция|скидка|товар)\b/gi, " ")
    .replace(/\s+/g, " ").trim();
}
function canonicalProductName(name) {
  const raw = productBaseName(name);
  return state.shoppingAliases[raw] || raw;
}
function parseQuantity(value, fallback=1) {
  const text=String(value||"").replace(',', '.'); const m=text.match(/(\d+(?:\.\d+)?)/); const amount=m?Number(m[1]):fallback;
  const unit=/кг/i.test(text)?'кг':/\bг\b/i.test(text)?'г':/мл/i.test(text)?'мл':/\bл\b/i.test(text)?'л':/уп|пач/i.test(text)?'уп.':'шт.';
  return {amount:amount>0?amount:fallback,unit};
}
function purchaseHistoryItems() { return state.shopping.filter(i=>i.recordType!=='planned' && i.date); }
function productCatalog() {
  const groups=new Map();
  purchaseHistoryItems().forEach(item=>{const key=canonicalProductName(item.canonicalName||item.name); if(!key)return; if(!groups.has(key))groups.set(key,[]); groups.get(key).push(item);});
  return [...groups.entries()].map(([key,items])=>{
    items.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const dates=items.map(i=>new Date(`${i.date}T00:00:00`)).filter(d=>!Number.isNaN(d)); const gaps=[];
    for(let i=1;i<dates.length;i++) gaps.push(Math.round((dates[i]-dates[i-1])/86400000));
    const frequency=gaps.length?Math.max(1,Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length)):Number(items.at(-1)?.days)||30;
    const last=items.at(-1); const next=new Date(`${last.date}T00:00:00`); next.setDate(next.getDate()+frequency);
    const stores={}; items.forEach(i=>{const q=Number(i.unitQty)||parseQuantity(i.qty).amount||1; const up=Number(i.unitPrice)||((Number(i.price)||0)/q); if(!stores[i.store])stores[i.store]=[];stores[i.store].push(up);});
    const storeStats=Object.entries(stores).map(([store,prices])=>({store,price:prices.reduce((a,b)=>a+b,0)/prices.length})).sort((a,b)=>a.price-b.price);
    return {key,name:last.canonicalName||last.name,items,last,frequency,nextDate:dateLocal(next),storeStats};
  }).sort((a,b)=>a.nextDate.localeCompare(b.nextDate));
}
function ensurePredictedShoppingList() {
  const limit=new Date(); limit.setDate(limit.getDate()+7); const limitText=dateLocal(limit); let changed=false;
  productCatalog().forEach(p=>{if(p.nextDate>limitText)return; const exists=state.shopping.some(i=>i.recordType==='planned'&&canonicalProductName(i.name)===p.key&&i.checked!==true); if(!exists){state.shopping.unshift({id:`shopping-plan-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,recordType:'planned',name:p.name,canonicalName:p.name,qty:p.last.qty||'1 шт.',store:p.storeStats[0]?.store||p.last.store||'',price:Number(p.last.price)||0,date:p.nextDate,autoAdded:true,checked:false});changed=true;}});
  if(changed) saveState();
}
function renderShopping() {
  ensurePredictedShoppingList();
  const planned=state.shopping.filter(i=>i.recordType==='planned');
  byId("shoppingList").innerHTML = planned.length?planned.map(shoppingRow).join(""):`<article class="empty-state"><strong>Список пуст</strong><p>Товары добавятся автоматически по истории или вручную.</p></article>`;
  const catalog=productCatalog();
  byId("purchasePredictions").innerHTML = catalog.length?catalog.slice(0,20).map(p=>`<article class="row shopping-prediction" data-product-key="${escapeHtml(p.key)}"><div><strong>${escapeHtml(p.name)}</strong><small>Покупается примерно раз в ${p.frequency} дн. • следующая дата ${escapeHtml(p.nextDate)}</small></div><b>${p.nextDate<=dateLocal(new Date())?'Пора купить':'Скоро'}</b></article>`).join(""):`<article class="empty-state"><strong>Недостаточно истории</strong><p>Нужно хотя бы две покупки одного товара.</p></article>`;
  byId("shoppingCatalog").innerHTML=catalog.length?catalog.map(productCatalogCard).join(''):`<article class="empty-state"><strong>Карточек товаров пока нет</strong></article>`;
  renderShoppingAnalysis();
}
function shoppingRow(item) {
  const date = item.date ? ` • до ${escapeHtml(item.date)}` : "";
  return `<article class="row shopping-row ${item.checked?'is-checked':''}" data-shopping-id="${escapeHtml(item.id||'')}"><button class="shopping-check" data-shopping-id="${escapeHtml(item.id||'')}" title="Отметить купленным">${item.checked?'✓':'○'}</button><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.qty || "1 шт.")}${date} • ${storePill(item.store)}${item.autoAdded?' • добавлено автоматически':''}</small></div><b>${money(item.price)}</b></article>`;
}
function productCatalogCard(p){const lastQty=Number(p.last.unitQty)||parseQuantity(p.last.qty).amount||1; const unit=p.last.unitName||parseQuantity(p.last.qty).unit; const unitPrice=Number(p.last.unitPrice)||Number(p.last.price||0)/lastQty; const stores=p.storeStats.slice(0,3).map(x=>`${escapeHtml(x.store||'Без магазина')}: ${money(x.price)}/${escapeHtml(unit)}`).join(' • '); return `<article class="product-card" data-product-key="${escapeHtml(p.key)}" tabindex="0"><div><strong>${escapeHtml(p.name)}</strong><small>${p.items.length} покупок • последняя ${escapeHtml(p.last.date)} • прогноз ${escapeHtml(p.nextDate)}</small><p>${stores||'Нет данных для сравнения магазинов'}</p></div><div><span>Цена за единицу</span><b>${money(unitPrice)} / ${escapeHtml(unit)}</b></div></article>`;}
function renderShoppingAnalysis() {
  const target=byId('shoppingAnalysis'); if(!target)return; const catalog=productCatalog();
  target.innerHTML=catalog.length?catalog.slice(0,12).map(p=>{const best=p.storeStats[0];return `<article class="row"><div><strong>${escapeHtml(p.name)}</strong><small>${best?`выгоднее: ${escapeHtml(best.store||'Без магазина')}`:'магазин не указан'} • история ${p.items.length} покупок</small></div><b>${best?money(best.price):'—'}</b></article>`;}).join(''):`<article class="empty-state"><strong>Нет истории цен</strong></article>`;
}
function openProductDetails(key){const p=productCatalog().find(x=>x.key===key);if(!p)return;byId('productDetailsTitle').textContent=p.name;byId('productDetailsBody').innerHTML=`<section class="product-history"><h3>История цены</h3>${[...p.items].reverse().map(i=>{const q=Number(i.unitQty)||parseQuantity(i.qty).amount||1;const u=i.unitName||parseQuantity(i.qty).unit;const up=Number(i.unitPrice)||Number(i.price||0)/q;return `<article><div><strong>${escapeHtml(i.date)}</strong><small>${escapeHtml(i.store||'Магазин не указан')} • ${escapeHtml(i.name)}</small></div><b>${money(i.price)} · ${money(up)}/${escapeHtml(u)}</b></article>`;}).join('')}</section><section><h3>Объединение названий</h3><p>Все варианты названий этой карточки:</p><div class="alias-list">${[...new Set(p.items.map(i=>i.name))].map(n=>`<span>${escapeHtml(n)}</span>`).join('')}</div><button class="primary add-product-to-list" data-product-key="${escapeHtml(p.key)}">Добавить в список покупок</button></section>`;byId('productDetailsDialog').showModal();}

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

function renderCategoryDonutTo(items, total, targetId, legendId) {
  const donut = byId(targetId);
  const legend = byId(legendId);
  if (!donut || !legend) return;
  const palette = ["#18a7a7", "#4cc9a6", "#ff8a34", "#8f72d8", "#f5c244", "#4a90e2", "#ef6a7b", "#8da2b8"];
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
  donut.style.background = total ? `conic-gradient(${stops.join(",")})` : "#e9eff5";
  donut.innerHTML = `<div><strong>${money(total)}</strong><span>расходы</span></div>`;
  legend.innerHTML = data.map((item, index) => `<button class="legend-row drill-card" data-drill-kind="category" data-drill-value="${escapeHtml(item.name)}"><i style="background:${palette[index % palette.length]}"></i><span>${escapeHtml(item.name)}</span><b>${total ? Math.round(item.total / total * 100) : 0}%</b></button>`).join("");
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


function analyticsLoanBalance(product) {
  if (!product || product.type !== "loan") return 0;
  const direct = Number(product.remainingBalance);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  const principal = Number(product.principal || product.amount || 0);
  const paidPrincipal = (product.actualPayments || []).reduce((sum, payment) => sum + Number(payment.principal || 0), 0);
  return Math.max(0, principal - paidPrincipal);
}

function analyticsSnapshot(rows) {
  const operational = rows.filter((row) => typeOf(row) !== "transfer");
  const income = operational.filter((row) => Number(row.amount) > 0).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const expense = operational.filter((row) => Number(row.amount) < 0).reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);
  const net = income - expense;
  const liquid = accountSummaries().reduce((sum, item) => sum + Number(item.balance || 0), 0);
  const assetValue = (state.assets || []).reduce((sum, asset) => sum + Number(asset.currentValue || asset.purchasePrice || asset.value || 0), 0);
  const debt = (state.financialProducts || []).reduce((sum, product) => sum + analyticsLoanBalance(product), 0);
  const monthlyDebtPayments = (state.financialProducts || []).filter((product) => product.type === "loan" && product.status !== "closed").reduce((sum, product) => sum + Number(product.monthlyPayment || product.paymentAmount || 0), 0);
  const days = Math.max(1, Math.round((reportPeriodRange().end - reportPeriodRange().start) / 86400000) + 1);
  const monthlyIncome = income / days * 30.44;
  const monthlyExpense = expense / days * 30.44;
  const goals = (state.savingsGoals || []).filter((goal) => Number(goal.target || 0) > 0);
  const goalTarget = goals.reduce((sum, goal) => sum + Number(goal.target || 0), 0);
  const goalCurrent = goals.reduce((sum, goal) => sum + Math.min(Number(goal.current || 0), Number(goal.target || 0)), 0);
  return {
    income, expense, net, liquid, assetValue, debt,
    netWorth: liquid + assetValue - debt,
    savingsRate: income > 0 ? net / income * 100 : 0,
    debtLoad: monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome * 100 : 0,
    runway: monthlyExpense > 0 ? Math.max(0, liquid) / monthlyExpense : 0,
    goals, goalTarget, goalCurrent,
    goalProgress: goalTarget > 0 ? goalCurrent / goalTarget * 100 : 0
  };
}

function analyticsInsightCard(title, text, tone = "neutral") {
  return `<article class="analytics-insight ${tone}"><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(text)}</small></div></article>`;
}

function renderAdvancedAnalytics(rows) {
  const snapshot = analyticsSnapshot(rows);
  byId("analyticsNetFlow").textContent = money(snapshot.net);
  byId("analyticsNetFlow").classList.toggle("negative", snapshot.net < 0);
  byId("analyticsSavingsRate").textContent = `${Math.round(snapshot.savingsRate)}%`;
  byId("analyticsNetWorth").textContent = money(snapshot.netWorth);
  byId("analyticsDebtLoad").textContent = `${Math.round(snapshot.debtLoad)}%`;
  byId("analyticsRunway").textContent = `${snapshot.runway.toFixed(snapshot.runway < 10 ? 1 : 0)} мес.`;
  byId("analyticsGoalsProgress").textContent = `${Math.round(snapshot.goalProgress)}%`;
  byId("analyticsGoalsMeta").textContent = snapshot.goals.length ? `${snapshot.goals.length} целей • ${money(snapshot.goalCurrent)} из ${money(snapshot.goalTarget)}` : "цели не созданы";

  const insights = [];
  if (!rows.length) insights.push(analyticsInsightCard("Недостаточно данных", "Добавьте или импортируйте операции, чтобы получить персональные выводы."));
  else {
    insights.push(snapshot.net >= 0
      ? analyticsInsightCard("Период закрыт в плюс", `Свободный денежный поток составил ${money(snapshot.net)}.`, "good")
      : analyticsInsightCard("Расходы выше доходов", `Дефицит за период составляет ${money(Math.abs(snapshot.net))}.`, "warning"));
    if (snapshot.savingsRate >= 20) insights.push(analyticsInsightCard("Хороший темп накоплений", `Сохраняется около ${Math.round(snapshot.savingsRate)}% дохода.`, "good"));
    else if (snapshot.income > 0) insights.push(analyticsInsightCard("Низкая норма сбережений", `Сейчас остаётся около ${Math.round(snapshot.savingsRate)}% дохода. Стоит проверить крупные категории расходов.`, "warning"));
    if (snapshot.debtLoad > 40) insights.push(analyticsInsightCard("Высокая долговая нагрузка", `Оценочно ${Math.round(snapshot.debtLoad)}% среднемесячного дохода уходит на кредиты.`, "warning"));
    else if (snapshot.debt > 0) insights.push(analyticsInsightCard("Долги под контролем", `Остаток по кредитам: ${money(snapshot.debt)}, нагрузка около ${Math.round(snapshot.debtLoad)}%.`, "neutral"));
    if (snapshot.runway < 1 && snapshot.expense > 0) insights.push(analyticsInsightCard("Маленький резерв", "Ликвидных денег меньше чем на один обычный месяц расходов.", "warning"));
    else if (snapshot.runway >= 3) insights.push(analyticsInsightCard("Есть финансовая подушка", `Резерва хватит примерно на ${snapshot.runway.toFixed(1)} месяца обычных расходов.`, "good"));
  }
  byId("analyticsInsights").innerHTML = insights.join("");

  const expenses = rows.filter((row) => Number(row.amount) < 0 && typeOf(row) !== "transfer");
  const amounts = expenses.map((row) => Math.abs(Number(row.amount || 0))).sort((a,b)=>a-b);
  const median = amounts.length ? amounts[Math.floor(amounts.length / 2)] : 0;
  const threshold = Math.max(median * 3, amounts.reduce((a,b)=>a+b,0) / Math.max(1, amounts.length) * 2);
  const anomalies = expenses.filter((row) => Math.abs(Number(row.amount || 0)) >= threshold && Math.abs(Number(row.amount || 0)) > 0).sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount)).slice(0,8);
  byId("analyticsAnomalies").innerHTML = anomalies.length
    ? anomalies.map((row) => `<article class="row"><div><strong>${escapeHtml(row.description || row.payee || "Расход")}</strong><small>${escapeHtml(row.date || "Без даты")} • ${escapeHtml(categoryRoot(row) || "Без категории")} • ${escapeHtml(row.account || "Без счёта")}</small></div><b>${money(Math.abs(row.amount))}</b></article>`).join("")
    : `<div class="empty-state">Крупных выбросов относительно обычных расходов не найдено.</div>`;

  const healthItems = topBy(rows, (row) => categoryRoot(row), (row) => Number(row.amount) < 0 && typeOf(row) !== "transfer").slice(0, 7);
  renderCategoryDonutTo(healthItems, snapshot.expense, "healthCategoryDonut", "healthCategoryLegend");
}

function finalApplicationTests() {
  const tests = [];
  const add = (name, pass, details) => tests.push({ name, pass:Boolean(pass), details });
  add("Основная база загружена", Array.isArray(state.rows), `${state.rows?.length || 0} операций`);
  add("Справочник счетов доступен", Array.isArray(state.accounts), `${state.accounts?.length || 0} счетов`);
  add("Категории доступны", Array.isArray(state.categories), `${state.categories?.length || 0} категорий`);
  add("Регулярные платежи доступны", Array.isArray(state.regularPayments), `${state.regularPayments?.length || 0} платежей`);
  add("Кредиты и вклады доступны", Array.isArray(state.financialProducts), `${state.financialProducts?.length || 0} продуктов`);
  add("Имущество доступно", Array.isArray(state.assets), `${state.assets?.length || 0} объектов`);
  add("Семейные профили доступны", Array.isArray(state.familyMembers) && state.familyMembers.length > 0, `${state.familyMembers?.length || 0} профилей`);
  add("Резервное сохранение работает", typeof saveState === "function" && Boolean(storeKey), storeKey);
  add("Форма имущества присутствует", Boolean(byId("assetInlineForm") || byId("assetForm")), "Проверка формы создания имущества");
  add("Раздел отчётов присутствует", Boolean(byId("reports") && byId("reportPeriod")), "Проверка аналитического интерфейса");
  add("Системные уведомления подключены", typeof window.FinPoryadokNotifications !== "undefined" || typeof scheduleAndroidNotifications === "function" || Boolean(window.AndroidNotifications), "Проверка JS/native-моста");
  const db = diagnoseDatabase();
  add("Нет критических ошибок данных", !db.issues.some((issue) => issue.severity === "error"), `${db.issues.filter((issue)=>issue.severity==="error").length} критических ошибок`);
  return { generatedAt:new Date().toISOString(), appVersion:"0.20.3", schemaVersion:CURRENT_SCHEMA_VERSION, passed:tests.filter(t=>t.pass).length, total:tests.length, tests, diagnostics:db };
}

function renderFinalTests() {
  const report = finalApplicationTests();
  window.__finporyadokFinalTestReport = report;
  byId("finalTestSummary").innerHTML = `<strong>${report.passed} из ${report.total} проверок пройдено</strong><span>${report.passed === report.total ? "Ключевые функции готовы" : "Есть пункты, требующие проверки"}</span>`;
  byId("finalTestResults").innerHTML = report.tests.map((test) => `<article class="final-test-item ${test.pass ? "passed" : "failed"}"><span>${test.pass ? "✓" : "!"}</span><div><strong>${escapeHtml(test.name)}</strong><small>${escapeHtml(test.details || "")}</small></div></article>`).join("");
  return report;
}

function exportAdvancedAnalytics() {
  const range = rowsInReportPeriod();
  const snapshot = analyticsSnapshot(range.rows);
  const report = { generatedAt:new Date().toISOString(), period:{label:range.label,start:range.start.toISOString(),end:range.end.toISOString()}, metrics:snapshot, categories:summarizeRows(range.rows, categoryRoot, row=>row.amount<0), projects:summarizeRows(range.rows,row=>row.project||"",row=>row.amount<0&&row.project), diagnostics:diagnoseDatabase() };
  downloadBlob(new Blob([JSON.stringify(report,null,2)],{type:"application/json;charset=utf-8"}),`finporyadok-analytics-${safeFileDate()}.json`);
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
  renderAdvancedAnalytics(range.rows);
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
  byId("operationDetails").innerHTML = detailRows.map(([label, value]) => `<div class="detail-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("") + receiptItemsHtml + (row.receipt ? `<div class="receipt-actions"><button type="button" class="primary edit-receipt-operation" data-row-id="${escapeHtml(row.id)}">✏️ Изменить чек и позиции</button></div>` : "");
  byId("detailDialog").showModal();
}

function setView(id) {
  const member = activeFamilyMember();
  if (!familyCanAccessView(member, id)) {
    alert("Этот раздел недоступен текущему профилю.");
    id = "dashboard";
  }
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === id));
  byId("pageTitle").textContent = views[id]?.[0] || "ФинПорядок";
  byId("pageSubtitle").textContent = views[id]?.[1] || "";
  syncMobileNavigation(id);
  if (id === "transactions") renderTransactions({ reset: true });
  if (id === "reimbursements") renderWorkExpenseCenter();
  if (id === "alimony") renderAlimony();
  if (id === "reports") renderReports();
  if (id === "assets") renderAssets();
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
function setDashboardDateRangeFromPreset(value) {
  const end = new Date();
  const start = new Date(end);
  if (value === "week") start.setDate(end.getDate() - 6);
  else if (value === "quarter") start.setMonth(end.getMonth() - 2, 1);
  else if (value === "half") start.setMonth(end.getMonth() - 5, 1);
  else if (value === "year") start.setMonth(end.getMonth() - 11, 1);
  else if (value === "all") {
    const first = state.rows.map(rowDate).filter(Boolean).sort((a,b)=>a-b)[0];
    if (first) start.setTime(first.getTime());
  } else start.setDate(1);
  if (byId("dashboardDateFrom")) byId("dashboardDateFrom").value = dateLocal(start);
  if (byId("dashboardDateTo")) byId("dashboardDateTo").value = dateLocal(end);
  localStorage.setItem("finporyadokDashboardDateFrom", byId("dashboardDateFrom")?.value || "");
  localStorage.setItem("finporyadokDashboardDateTo", byId("dashboardDateTo")?.value || "");
  renderDashboard();
}
function initializeDashboardDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const savedFrom = localStorage.getItem("finporyadokDashboardDateFrom");
  const savedTo = localStorage.getItem("finporyadokDashboardDateTo");
  if (byId("dashboardDateFrom")) byId("dashboardDateFrom").value = savedFrom || dateLocal(start);
  if (byId("dashboardDateTo")) byId("dashboardDateTo").value = savedTo || dateLocal(now);
}
byId("dashboardPeriod")?.addEventListener("change", (event) => setDashboardDateRangeFromPreset(event.target.value));
["dashboardDateFrom","dashboardDateTo"].forEach(id => byId(id)?.addEventListener("change", () => {
  localStorage.setItem("finporyadokDashboardDateFrom", byId("dashboardDateFrom")?.value || "");
  localStorage.setItem("finporyadokDashboardDateTo", byId("dashboardDateTo")?.value || "");
  renderDashboard();
}));
byId("dashboardPeriodCurrent")?.addEventListener("click", () => setDashboardDateRangeFromPreset("month"));
byId("drillPeriod")?.addEventListener("change", refreshDrilldown);
byId("drillSort")?.addEventListener("change", refreshDrilldown);
document.addEventListener("click", (event) => {
  const metric = event.target.closest("[data-tx-metric]");
  if (!metric) return;
  resetTransactionFilters();
  const kind = metric.dataset.txMetric;
  if (kind === "income") byId("typeFilter").value = "income";
  if (kind === "expense") byId("typeFilter").value = "expense";
  if (kind === "work") { byId("typeFilter").value = "expense"; byId("workExpenseFilter").value = "work"; }
  setView("transactions");
  renderTransactions({ reset: true });
  byId("transactionRows")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

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
  const loanAlerts = loanPaymentReminders();
  const utilityAlerts = utilityEventReminders();
  const target = insuranceAlerts.length ? byId("insuranceAlertsPanel") : loanAlerts.length ? byId("loanAlertsPanel") : utilityAlerts.length ? byId("utilityAlertsPanel") : byId("workReimbursementPanel");
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
byId("insuranceObjectFilter")?.addEventListener("change", renderInsurance);

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
    reminderDisabled: Boolean(existing?.reminderDisabled),
    reminderDisabledAt: existing?.reminderDisabledAt || "",
    reminderDisabledReason: existing?.reminderDisabledReason || "",
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

  const reminderToggleButton = event.target.closest(".toggle-insurance-reminder, .disable-insurance-reminder");
  if (reminderToggleButton) {
    const policy = state.insurancePolicies.find((item) => item.id === reminderToggleButton.dataset.policyId);
    if (!policy) return;
    if (policy.reminderDisabled) {
      policy.reminderDisabled = false;
      policy.reminderDisabledAt = "";
      policy.reminderDisabledReason = "";
    } else {
      const confirmed = window.confirm(`Отключить уведомления по полису «${policy.name}»?\n\nПосле подтверждения приложение не будет напоминать об окончании этого полиса, даже если новый полис не оформлен. Это действие подходит, например, когда кредит или ипотека погашены и страхование больше не требуется.`);
      if (!confirmed) return;
      policy.reminderDisabled = true;
      policy.reminderDisabledAt = new Date().toISOString();
      policy.reminderDisabledReason = "Отключено пользователем после подтверждения";
    }
    saveState();
    render();
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



const MOSCOW_PM_2026_URL = "https://www.garant.ru/hotlaw/moscow/1908878/";
function moscowPmManualSearchUrl(periodKey=currentAlimonyPeriodKey()) {
  const phrase=`прожиточный минимум для детей Москва ${alimonyPmPeriodLabel(periodKey)} постановление Правительства Москвы`;
  return `https://yandex.ru/search/?text=${encodeURIComponent(phrase)}`;
}
function moscowPmLookupUrl(periodKey=currentAlimonyPeriodKey()) {
  return Number(String(periodKey).slice(0,4))===2026 ? MOSCOW_PM_2026_URL : moscowPmManualSearchUrl(periodKey);
}
let moscowPmRequestInProgress = false;
let moscowPmRequestTimeout = null;

function currentAlimonyPeriodKey() {
  const raw = byId("alimonyRuleForm")?.elements?.effectiveFrom?.value || "";
  return /^\d{4}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0,7);
}
function currentAlimonyYear() { return Number(currentAlimonyPeriodKey().slice(0,4)); }
function alimonyPmPeriodLabel(key) {
  const [year,monthRaw] = String(key).split("-"); const month=Number(monthRaw)||1;
  if (Number(year) >= 2021) return `${year} год`;
  if (Number(year) >= 2013) return `${month <= 6 ? "I" : "II"} полугодие ${year} года`;
  return `${Math.ceil(month/3)} квартал ${year} года`;
}

function alimonyPmCacheKey(periodKey) {
  const [yearRaw, monthRaw] = String(periodKey || "").split("-");
  const year = Number(yearRaw); const month = Math.max(1, Math.min(12, Number(monthRaw) || 1));
  if (year >= 2021) return `year:${year}`;
  if (year >= 2013) return `half:${year}:${month <= 6 ? 1 : 2}`;
  return `quarter:${year}:${Math.ceil(month / 3)}`;
}
function cachedOfficialPm(periodKey) {
  const year = Number(String(periodKey).slice(0,4));
  const canonicalKey = alimonyPmCacheKey(periodKey);
  return state.officialSubsistenceByPeriod?.[canonicalKey]
    || state.officialSubsistenceByPeriod?.[periodKey]
    || state.officialSubsistenceByYear?.[String(year)]
    || (Number(state.officialSubsistenceData?.year) === year ? state.officialSubsistenceData : null);
}
function officialPmIsFresh(data, periodKey) {
  if (!data || !Number(data.amount)) return false;
  const dataKey = data.cacheKey || alimonyPmCacheKey(data.periodKey || `${data.year}-01`);
  if (dataKey !== alimonyPmCacheKey(periodKey)) return false;
  const fetched = new Date(data.fetchedAt || 0).getTime();
  // Установленная величина за завершённый период не меняется. Для текущего года перепроверяем раз в 90 дней.
  const currentYear = new Date().getFullYear();
  if (Number(data.year) < currentYear) return true;
  return fetched && Date.now() - fetched < 90 * 86400000;
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
    const sourceUrl=safeExternalUrl(data.decreeUrl) || moscowPmManualSearchUrl(data.periodKey || currentAlimonyPeriodKey());
    link.hidden = false;
    link.href = sourceUrl;
    link.textContent = data.decreeUrl ? "Открыть источник" : "Найти постановление в браузере";
  }
  setMoscowPmStatus(`Загружено: ${money(Number(data.amount))} на ребёнка за ${data.periodLabel || alimonyPmPeriodLabel(data.periodKey || `${data.year}-01`)}. Источник: ${data.source || "правовая публикация"}.`, "success");
  if (save) {
    const normalized = { ...data, region: data.region || "Москва" };
    state.officialSubsistenceData = normalized;
    const key = normalized.cacheKey || alimonyPmCacheKey(normalized.periodKey || `${normalized.year}-01`);
    normalized.cacheKey = key;
    state.officialSubsistenceByPeriod = { ...(state.officialSubsistenceByPeriod || {}), [key]: normalized };
    state.officialSubsistenceByYear = { ...(state.officialSubsistenceByYear || {}), [String(data.year)]: normalized };
    saveState();
  }
  updateAlimonyRuleCalculation();
  return true;
}

function requestMoscowChildMinimum({ force = false } = {}) {
  const periodKey = currentAlimonyPeriodKey();
  const cached = cachedOfficialPm(periodKey);

  // Сначала мгновенно показываем сохранённое значение. Интернет не блокирует форму.
  if (cached && Number(cached.amount)) {
    applyOfficialMoscowPm(cached, { save: false });
    if (!force && officialPmIsFresh(cached, periodKey)) return;
    if (!force) {
      setMoscowPmStatus(`Используется сохранённое значение ${money(Number(cached.amount))}. Проверить обновление можно кнопкой «Обновить».`, "success");
      return;
    }
  }
  if (moscowPmRequestInProgress) return;
  moscowPmRequestInProgress = true;
  setMoscowPmStatus(`Быстро проверяю ${alimonyPmPeriodLabel(periodKey)}… Обычно это занимает до 12 секунд.`);
  const button = byId("refreshMoscowPmBtn");
  if (button) button.disabled = true;
  clearTimeout(moscowPmRequestTimeout);
  moscowPmRequestTimeout = setTimeout(() => {
    if (!moscowPmRequestInProgress) return;
    window.onMoscowChildMinimumError("Поиск превысил 12 секунд");
  }, 12500);

  if (window.AndroidOfficialDataBridge?.fetchMoscowChildMinimum) {
    window.AndroidOfficialDataBridge.fetchMoscowChildMinimum(periodKey);
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  fetch(moscowPmLookupUrl(periodKey), { headers: { "Accept": "text/html" }, signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then((html) => {
      const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");
      const amountMatch = text.match(/(?:для\s+детей|дети)[^\d]{0,120}(\d{2}[\s ]?\d{3})\s*(?:руб|₽)/i);
      if (!amountMatch) throw new Error("Значение не найдено");
      const year = Number(periodKey.slice(0,4));
      window.onMoscowChildMinimumLoaded(JSON.stringify({
        region: "Москва", year, periodKey, cacheKey: alimonyPmCacheKey(periodKey), periodLabel: alimonyPmPeriodLabel(periodKey),
        amount: Number(amountMatch[1].replace(/\s/g,"")), decreeNumber: "", decreeUrl: moscowPmLookupUrl(periodKey),
        fetchedAt: new Date().toISOString(), source: "ГАРАНТ"
      }));
    })
    .catch((error) => window.onMoscowChildMinimumError(error.name === "AbortError" ? "Сайт не ответил за 8 секунд" : (error.message || String(error))))
    .finally(() => clearTimeout(timer));
}

window.onMoscowChildMinimumLoaded = function(payload) {
  moscowPmRequestInProgress = false;
  clearTimeout(moscowPmRequestTimeout);
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
  clearTimeout(moscowPmRequestTimeout);
  const button = byId("refreshMoscowPmBtn");
  if (button) button.disabled = false;
  const periodKey = currentAlimonyPeriodKey();
  const cached = cachedOfficialPm(periodKey);
  if (cached && Number(cached.amount)) {
    applyOfficialMoscowPm(cached, { save: false });
    setMoscowPmStatus(`Не удалось проверить обновление. Используется последнее официальное значение ${money(Number(cached.amount))}.`, "warning");
  } else {
    setMoscowPmStatus(`Не удалось загрузить данные автоматически: ${message}. Можно открыть поиск постановления в браузере или ввести сумму вручную.`, "error");
    const link=byId("moscowPmSourceLink");
    if(link){link.hidden=false;link.href=moscowPmManualSearchUrl(periodKey);link.textContent="Найти постановление в браузере";}
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

let activeAlimonyRuleId = null;

function fillAlimonyRuleForm(rule = null) {
  const form = byId("alimonyRuleForm");
  if (!form) return;
  form.reset();
  activeAlimonyRuleId = rule?.id || null;
  const title = byId("alimonyRuleDialogTitle");
  const subtitle = byId("alimonyRuleDialogSubtitle");
  const submit = byId("alimonyRuleSubmitBtn");
  if (title) title.textContent = rule ? "Правило начисления алиментов" : "Новое правило начисления";
  if (subtitle) subtitle.textContent = rule ? "Просмотр и редактирование действующего правила" : "Можно добавлять новые правила с даты изменения размера";
  if (submit) submit.textContent = rule ? "Сохранить изменения" : "Сохранить правило";

  form.elements.effectiveFrom.value = rule?.effectiveFrom || new Date().toISOString().slice(0,7);
  form.elements.effectiveTo.value = rule?.effectiveTo || "";
  form.elements.childrenCount.value = Number(rule?.childrenCount) || 2;
  form.elements.calculationType.value = rule?.calculationType || (Number(rule?.subsistenceAmount) > 0 ? "subsistence" : "subsistence");
  form.elements.subsistenceRegion.value = rule?.subsistenceRegion || "Москва";
  form.elements.subsistenceAmount.value = rule?.subsistenceAmount ?? "";
  form.elements.subsistencePercent.value = rule?.subsistencePercent ?? 100;
  form.elements.amountPerChild.value = rule?.amountPerChild ?? "";
  form.elements.openingDebt.value = rule ? (Number(rule.openingDebt) || 0) : (state.alimonyRules.length ? 0 : "");
  form.elements.decreeNumber.value = rule?.decreeNumber || "";
  form.elements.decreeUrl.value = rule?.decreeUrl || "";
  form.elements.basis.value = rule?.basis || "";
  const link = byId("moscowPmSourceLink");
  if (link) {
    const url = safeExternalUrl(rule?.decreeUrl);
    link.hidden = !url;
    if (url) link.href = url;
  }
  setMoscowPmStatus(rule ? "Данные правила загружены. Для проверки значения за выбранный год нажмите «Обновить»." : "Значение будет найдено автоматически за выбранный год.");
  updateAlimonyRuleCalculation();
}

function openAlimonyRuleDialog(ruleId = null) {
  const rule = ruleId ? state.alimonyRules.find(item => item.id === ruleId) : null;
  if (ruleId && !rule) return;
  fillAlimonyRuleForm(rule);
  byId("alimonyRuleDialog")?.showModal();
  if (!rule) requestMoscowChildMinimum();
}

byId("addAlimonyRuleBtn")?.addEventListener("click",()=>openAlimonyRuleDialog());
byId("alimonyRuleForm")?.addEventListener("submit",event=>{
  event.preventDefault();
  const d=Object.fromEntries(new FormData(event.currentTarget).entries());
  const calculationType=d.calculationType||"fixed";
  const subsistenceAmount=Math.max(0,Number(d.subsistenceAmount)||0);
  const subsistencePercent=Math.max(0,Number(d.subsistencePercent)||0);
  const amountPerChild=calculationType==="subsistence"?subsistenceAmount*subsistencePercent/100:Math.max(0,Number(d.amountPerChild)||0);
  const effectiveTo = (d.effectiveTo || "").trim();
  if (effectiveTo && effectiveTo < d.effectiveFrom) { alert("Дата окончания не может быть раньше даты начала начисления."); return; }
  const payload={
    effectiveFrom:d.effectiveFrom,
    effectiveTo,
    childrenCount:Number(d.childrenCount)||1,
    calculationType,
    subsistenceRegion:(d.subsistenceRegion||"").trim(),
    subsistenceAmount,
    subsistencePercent,
    amountPerChild,
    openingDebt:Number(d.openingDebt)||0,
    decreeNumber:(d.decreeNumber||"").trim(),
    decreeUrl:safeExternalUrl(d.decreeUrl),
    basis:(d.basis||"").trim()
  };
  if (activeAlimonyRuleId) {
    const index=state.alimonyRules.findIndex(rule=>rule.id===activeAlimonyRuleId);
    if(index>=0) state.alimonyRules[index]={...state.alimonyRules[index],...payload};
  } else {
    state.alimonyRules.push({id:`alimony-rule-${Date.now()}`,...payload});
  }
  saveState();
  activeAlimonyRuleId=null;
  byId("alimonyRuleDialog").close();
  renderAlimony();
});
byId("addAlimonyPaymentBtn")?.addEventListener("click",()=>{const f=byId("alimonyPaymentForm");f.reset();f.elements.date.value=new Date().toISOString().slice(0,10);populateAccountSelect();byId("alimonyAccountSelect").innerHTML=byId("txAccountSelect").innerHTML;byId("alimonyPaymentDialog").showModal();});
byId("alimonyRuleForm")?.addEventListener("input",updateAlimonyRuleCalculation);
byId("alimonyRuleForm")?.addEventListener("change",updateAlimonyRuleCalculation);
byId("alimonyPaymentForm")?.addEventListener("submit",event=>{event.preventDefault();const d=Object.fromEntries(new FormData(event.currentTarget).entries());state.rows.push({id:`alimony-payment-${Date.now()}`,date:d.date,time:"12:00",description:d.description||"Алименты",amount:Math.abs(Number(d.amount)||0),balance:0,category:"Алименты",account:d.account,to:d.account,from:"",project:"Алименты",payee:d.payerName||"",payerName:d.payerName||"",payerType:d.payerType,paymentStatus:d.paymentStatus,comment:d.comment||"",alimonyPayment:true});saveState();byId("alimonyPaymentDialog").close();render();setView("alimony");});
document.addEventListener("click",event=>{
  const deleteButton=event.target.closest(".delete-alimony-rule");
  if(deleteButton){
    event.stopPropagation();
    state.alimonyRules=state.alimonyRules.filter(r=>r.id!==deleteButton.dataset.ruleId);
    saveState();
    renderAlimony();
    return;
  }
  const card=event.target.closest("[data-alimony-rule-id]");
  if(card && !event.target.closest("a,button")) openAlimonyRuleDialog(card.dataset.alimonyRuleId);
});
document.addEventListener("keydown",event=>{
  const card=event.target.closest?.("[data-alimony-rule-id]");
  if(card && (event.key==="Enter" || event.key===" ")){
    event.preventDefault();
    openAlimonyRuleDialog(card.dataset.alimonyRuleId);
  }
});

let editingFinanceProductId = null;

function openFinanceProductDialog(product = null) {
  populateFinanceCategorySelects();
  const form = byId("financeProductForm");
  form.reset();
  editingFinanceProductId = product?.id || null;
  form.elements.productId.value = product?.id || "";
  form.elements.startDate.value = product?.startDate || new Date().toISOString().slice(0, 10);
  form.elements.termMonths.value = product?.termMonths || 12;
  form.elements.paymentDay.value = product?.paymentDay || 10;
  if (product) {
    Object.entries(product).forEach(([key, value]) => {
      if (form.elements[key] && !["openingBalance", "monthlyPaymentOverride"].includes(key)) form.elements[key].value = value ?? "";
    });
    if (product.type === "loan") {
      form.elements.openingBalance.value = loanRemaining(product);
      form.elements.monthlyPaymentOverride.value = Number(product.monthlyPaymentOverride) || calculateLoan(product).monthlyPayment;
    }
  } else {
    form.elements.productType.value = "loan";
    form.elements.downPayment.value = 0;
    form.elements.openingBalance.value = "";
    form.elements.monthlyPaymentOverride.value = "";
  }
  form.elements.monthlyPaymentOverride.dataset.manual = product?.monthlyPaymentOverride ? "true" : "false";
  toggleFinanceProductFields();
  byId("financeProductDialog").showModal();
}

byId("addFinanceProductBtn")?.addEventListener("click", () => {
  openFinanceProductDialog();
});

byId("financeProductType")?.addEventListener("change", toggleFinanceProductFields);
byId("financeProductForm")?.addEventListener("input", updateFinanceCalculationPreview);
byId("financeProductForm")?.addEventListener("change", updateFinanceCalculationPreview);

byId("financeProductForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const product = currentFinanceFormProduct();
  const existing = editingFinanceProductId ? state.financialProducts.find((item) => item.id === editingFinanceProductId) : null;
  product.id = existing?.id || `finance-${Date.now()}`;
  product.actualPayments = existing?.actualPayments || [];
  product.depositMovements = existing?.depositMovements || [];
  if (product.type === "loan") {
    const paidPrincipal = product.actualPayments.reduce((sum, payment) => sum + Number(payment.principalPart || 0), 0);
    const enteredCurrentBalance = Number(event.currentTarget.elements.openingBalance.value);
    product.openingBalance = (Number.isFinite(enteredCurrentBalance) && enteredCurrentBalance >= 0 ? enteredCurrentBalance : product.principal) + paidPrincipal;
  }
  const existingIndex = state.financialProducts.findIndex((item) => item.id === product.id);
  if (existingIndex >= 0) state.financialProducts[existingIndex] = product;
  else state.financialProducts.push(product);

  if (product.type === "loan" && !state.categories.some((item) => normalizeBrandText(item.name) === normalizeBrandText(product.expenseCategory))) {
    state.categories.push({ id: `category-${Date.now()}-loan`, name: product.expenseCategory, project: "", icon: "credit", categoryType: "expense" });
  }
  if (product.type === "deposit" && !state.categories.some((item) => normalizeBrandText(item.name) === normalizeBrandText(product.incomeCategory))) {
    state.categories.push({ id: `category-${Date.now()}-deposit`, name: product.incomeCategory, project: "", icon: "income", categoryType: "income" });
  }

  saveState();
  byId("financeProductDialog").close();
  editingFinanceProductId = null;
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
  const qty=parseQuantity(data.qty||"1 шт."); state.shopping.unshift({ id: `shopping-${Date.now()}`, recordType: data.recordType||"purchase", name: data.name.trim(), canonicalName: data.canonicalName?.trim()||data.name.trim(), qty: data.qty || "1 шт.", unitQty:Number(data.unitQty)||qty.amount, unitName:data.unitName||qty.unit, unitPrice:(Number(data.price)||0)/(Number(data.unitQty)||qty.amount||1), store: data.store, price: Number(data.price) || 0, date: data.date, days: 30, checked:false });
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
      assets: state.assets,
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
    assets: Array.isArray(data.assets) ? data.assets : [],
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
    state.assets = pendingBackupRestore.assets || [];
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
    state.assets = mergeUnique(state.assets, pendingBackupRestore.assets || [], (item) => item.id || `${item.type}|${item.name}|${item.serialNumber || item.address || ""}`);
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
    const text = await readQrFromSelectedFile(file);
    if (!text) {
      byId("importResult").textContent = "QR в файле не найден. Попробуйте более чёткий JPG/PNG или PDF с QR как изображением.";
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


function normalizedMerchantName(value) {
  return String(value || "").toLowerCase().replace(/[«»"']/g, "").replace(/\s+/g, " ").trim();
}

function receiptMerchantProfiles() {
  const byFn = new Map();
  const names = new Map();
  state.rows.forEach((row) => {
    const merchant = String(row.payee || row.receipt?.merchant || "").trim();
    if (!merchant || !row.receipt) return;
    names.set(normalizedMerchantName(merchant), merchant);
    if (row.receipt.fn) byFn.set(String(row.receipt.fn), merchant);
  });
  return { byFn, names };
}

function merchantForReceipt(receipt) {
  if (!receipt) return "";
  const profiles = receiptMerchantProfiles();
  return profiles.byFn.get(String(receipt.fn || "")) || "";
}

function refreshReceiptMerchantSuggestions() {
  const list = byId("receiptMerchantSuggestions");
  if (!list) return;
  const names = [...receiptMerchantProfiles().names.values()].sort((a, b) => a.localeCompare(b, "ru"));
  list.innerHTML = names.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
}

function parseReceiptMerchant(text) {
  const lines = String(text || "").split(/\r?\n/).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
  for (const line of lines.slice(0, 12)) {
    if (line.length < 3 || line.length > 80) continue;
    if (/кассовый чек|приход|итого|инн|ккт|фн|фд|фп|смена|чек №|сайт фнс|налог|ндс|спасибо|добро пожаловать/i.test(line)) continue;
    if (/^\d+[.,]?\d*\s*(₽|руб)?$/i.test(line)) continue;
    if (/[А-ЯA-Z]{2,}|магазин|маркет|ооо|ип\s/i.test(line)) return line.replace(/^(?:магазин|продавец)\s*[:№-]?\s*/i, "").trim();
  }
  return "";
}

function receiptSelectOptions() {
  refreshReceiptMerchantSuggestions();
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

function addReceiptItemRow(name = "", price = "", qty = 1, unit = "шт.") {
  const row = document.createElement("div"); row.className = "receipt-item";
  const cards=productCatalog().map(p=>`<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');
  row.innerHTML = `<input class="receipt-item-name" placeholder="Название товара" value="${escapeHtml(name)}"><input class="receipt-item-qty" type="number" min="0.001" step="0.001" value="${escapeHtml(qty)}" title="Количество"><select class="receipt-item-unit"><option>шт.</option><option>кг</option><option>г</option><option>л</option><option>мл</option><option>уп.</option></select><input class="receipt-item-price" type="number" min="0" step="0.01" placeholder="Цена" value="${escapeHtml(price)}"><select class="receipt-item-card"><option value="">Новая карточка</option>${cards}</select><button type="button" aria-label="Удалить позицию">×</button>`;
  row.querySelector('.receipt-item-unit').value=unit; row.querySelector("button").addEventListener("click", () => row.remove()); byId("receiptItems").append(row);
}

function updateReceiptPreview() {
  byId("receiptAmountPreview").textContent = money(Number(byId("receiptAmount").value) || 0);
  const date = byId("receiptDate").value || "—";
  const time = byId("receiptTime").value || "";
  byId("receiptDatePreview").textContent = `${date}${time ? `, ${time}` : ""}`;
}

function openReceiptEditor(receipt, existingRow = null) {
  receiptSelectOptions();
  byId("receiptRowId").value = existingRow?.id || "";
  byId("receiptRawQr").value = receipt.raw || existingRow?.receipt?.rawQr || "";
  byId("receiptFiscalKey").value = receipt.fiscalKey || existingRow?.receipt?.fiscalKey || "";
  byId("receiptAmount").value = Math.abs(Number(existingRow?.amount ?? receipt.amount) || 0).toFixed(2);
  byId("receiptDate").value = existingRow?.date || receipt.date || new Date().toISOString().slice(0, 10);
  byId("receiptTime").value = existingRow?.time || receipt.time || "";
  byId("receiptFn").value = receipt.fn || existingRow?.receipt?.fn || "";
  byId("receiptFd").value = receipt.fd || existingRow?.receipt?.fd || "";
  byId("receiptFp").value = receipt.fp || existingRow?.receipt?.fp || "";
  byId("receiptOperationType").value = receipt.operationType || existingRow?.receipt?.operationType || "1";
  const rememberedMerchant = existingRow?.payee || existingRow?.receipt?.merchant || merchantForReceipt(receipt);
  byId("receiptMerchant").value = rememberedMerchant || "";
  byId("receiptDescription").value = existingRow?.description || "Покупка по кассовому чеку";
  if (existingRow?.account) byId("receiptAccount").value = existingRow.account;
  if (existingRow?.category) byId("receiptCategory").value = existingRow.category;
  if (existingRow?.project) byId("receiptProject").value = existingRow.project;
  byId("receiptWorkExpense").checked = Boolean(existingRow?.workExpense);
  byId("receiptItems").innerHTML = "";
  const items = existingRow?.receipt?.items || [];
  if (items.length) {
    items.forEach((item) => {
      addReceiptItemRow(item.name || "", item.price || "", item.qty || item.unitQty || 1, item.unit || item.unitName || "шт.");
      const current = byId("receiptItems").lastElementChild;
      if (current && item.canonicalName) current.querySelector(".receipt-item-card").value = item.canonicalName;
    });
  } else {
    addReceiptItemRow();
  }
  updateReceiptPreview();
  const mode = existingRow ? "Редактирование чека" : "QR распознан";
  const sellerNote = rememberedMerchant && !existingRow ? ` Продавец подставлен по ранее сохранённому чеку с тем же ФН: ${rememberedMerchant}.` : "";
  byId("receiptStatus").textContent = `${mode}. Проверьте продавца и позиции.${sellerNote}`;
  const submit = byId("receiptForm").querySelector('button[type="submit"]');
  if (submit) submit.textContent = existingRow ? "Сохранить изменения" : "Добавить расход";
  byId("receiptDialog").showModal();
}

function editReceiptOperation(rowId) {
  const row = state.rows.find((item) => String(item.id) === String(rowId));
  if (!row?.receipt) return;
  byId("detailDialog")?.close();
  openReceiptEditor({
    raw: row.receipt.rawQr || "",
    fiscalKey: row.receipt.fiscalKey || "",
    amount: Math.abs(Number(row.amount) || 0),
    date: row.date,
    time: row.time || "",
    fn: row.receipt.fn || "",
    fd: row.receipt.fd || "",
    fp: row.receipt.fp || "",
    operationType: row.receipt.operationType || "1"
  }, row);
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

async function readQrFromSelectedFile(file) {
  if (!file) return "";
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    const embedded = await extractQrTextFromPdfImages(file);
    if (embedded) return embedded;
    throw new Error("QR в PDF не найден. Лучше использовать PDF, где QR сохранён как изображение, либо экспортировать нужную страницу в JPG.");
  }
  return parseQrFile(file);
}

async function handleReceiptImage(file) {
  if (!file) return;
  byId("importResult").textContent = `Сканирую кассовый QR из ${file.name}...`;
  try {
    const raw = await readQrFromSelectedFile(file);
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
  const editingRowId = data.receiptRowId || "";
  const duplicate = state.rows.find((row) => row.receipt?.fiscalKey === fiscalKey && String(row.id) !== String(editingRowId));
  if (duplicate) {
    byId("receiptStatus").textContent = "Этот чек уже существует в приложении.";
    return;
  }
  const items = [...byId("receiptItems").querySelectorAll(".receipt-item")]
    .map((item) => {
      const name = item.querySelector(".receipt-item-name").value.trim();
      const qty = Math.max(0.001, Number(item.querySelector(".receipt-item-qty").value) || 1);
      const unit = item.querySelector(".receipt-item-unit").value || "шт.";
      const price = Number(item.querySelector(".receipt-item-price").value) || 0;
      const canonicalName = item.querySelector(".receipt-item-card").value || name;
      return { name, qty, unit, price, canonicalName };
    })
    .filter((item) => item.name || item.price);
  const amount = Math.abs(Number(data.amount) || 0);
  if (!amount) return;
  let savedReceiptRow = editingRowId ? state.rows.find((row) => String(row.id) === String(editingRowId)) : null;
  const rowData = {
    date: data.date,
    time: data.time || "",
    description: data.description || data.merchant || "Покупка по кассовому чеку",
    amount: -amount,
    category: data.category || "Без категории",
    account: data.account,
    payee: data.merchant,
    project: data.project || "",
    from: data.account,
    to: "",
    importSource: "Кассовый QR",
    workExpense: data.workExpense === "true",
    receipt: {
      fiscalKey,
      fn: data.fn,
      fd: data.fd,
      fp: data.fp,
      operationType: data.operationType,
      rawQr: data.rawQr,
      merchant: data.merchant,
      items
    }
  };
  if (savedReceiptRow) {
    Object.assign(savedReceiptRow, rowData);
    if (savedReceiptRow.workExpense && !savedReceiptRow.workStatus) savedReceiptRow.workStatus = "new";
    if (!savedReceiptRow.workExpense) savedReceiptRow.workStatus = "";
  } else {
    savedReceiptRow = {
      id: `receipt-${fiscalKey || Date.now()}`,
      balance: 0,
      workStatus: rowData.workExpense ? "new" : "",
      ...rowData
    };
    state.rows.push(savedReceiptRow);
  }
  state.shopping = state.shopping.filter((item) => String(item.sourceReceiptRowId || "") !== String(savedReceiptRow.id));
  items.forEach((item, index) => {
    const unitQty = Math.max(0.001, Number(item.qty) || 1);
    state.shopping.unshift({
      id: `receipt-item-${savedReceiptRow.id}-${index}`,
      recordType: "purchase",
      name: item.name,
      canonicalName: item.canonicalName || item.name,
      qty: `${unitQty} ${item.unit || "шт."}`,
      unitQty,
      unitName: item.unit || "шт.",
      unitPrice: (Number(item.price) || 0) / unitQty,
      price: Number(item.price) || 0,
      store: data.merchant,
      date: data.date,
      sourceReceiptRowId: savedReceiptRow.id
    });
  });
  if (!editingRowId) {
    state.importArchive.unshift({
      id: `receipt-import-${Date.now()}`,
      archivedAt: new Date().toISOString(),
      source: `Кассовый QR: ${data.merchant}`,
      reason: "Чек добавлен как расход",
      existingId: "",
      row: { date: data.date, description: data.description, amount: -amount, account: data.account, category: data.category }
    });
  }
  ensureRowIds();
  saveState();
  byId("receiptDialog").close();
  byId("importResult").textContent = editingRowId
    ? `Чек обновлён: ${data.merchant}, ${items.length} позиций.`
    : `Чек добавлен: ${data.merchant}, ${money(amount)}.`;
  render();
});

byId("operationDetails")?.addEventListener("click", (event) => {
  const button = event.target.closest(".edit-receipt-operation");
  if (button) editReceiptOperation(button.dataset.rowId);
});



// ===== Package 3: smart shopping and receipt positions =====
byId('shoppingList')?.addEventListener('click',e=>{const b=e.target.closest('.shopping-check');if(!b)return;const i=state.shopping.find(x=>x.id===b.dataset.shoppingId);if(i){i.checked=!i.checked;saveState();renderShopping();}});
byId('shoppingCatalog')?.addEventListener('click',e=>{const c=e.target.closest('[data-product-key]');if(c)openProductDetails(c.dataset.productKey);});
byId('purchasePredictions')?.addEventListener('click',e=>{const c=e.target.closest('[data-product-key]');if(c)openProductDetails(c.dataset.productKey);});
byId('productDetailsBody')?.addEventListener('click',e=>{const b=e.target.closest('.add-product-to-list');if(!b)return;const p=productCatalog().find(x=>x.key===b.dataset.productKey);if(!p)return;state.shopping.unshift({id:`shopping-plan-${Date.now()}`,recordType:'planned',name:p.name,canonicalName:p.name,qty:p.last.qty||'1 шт.',store:p.storeStats[0]?.store||p.last.store||'',price:Number(p.last.price)||0,date:p.nextDate,checked:false});saveState();byId('productDetailsDialog').close();renderShopping();});
function parseReceiptTextLines(text){const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const out=[];for(let i=0;i<lines.length;i++){const line=lines[i].replace(/\s+/g,' ');const m=line.match(/^(.{2,}?)\s+(\d+[.,]\d{2})\s*(?:₽|руб)?$/i);if(m&&!/итого|сумма|налог|скидка|всего/i.test(m[1]))out.push({name:m[1].trim(),price:Number(m[2].replace(',','.'))});}return out.slice(0,80);}
window.onNativeReceiptTextRecognized=function(text){const items=parseReceiptTextLines(text);const merchant=parseReceiptMerchant(text);if(merchant&&!byId('receiptMerchant').value.trim())byId('receiptMerchant').value=merchant;if(!items.length){byId('paperReceiptStatus').textContent='Текст распознан, но позиции не найдены. Проверьте фото или добавьте позиции вручную.';return;}byId('receiptItems').innerHTML='';items.forEach(i=>addReceiptItemRow(i.name,i.price));byId('paperReceiptDialog')?.close();byId('receiptStatus').textContent=`Распознано позиций: ${items.length}. ${merchant?'Продавец: '+merchant+'. ':''}Проверьте названия, количество и цену.`;byId('receiptDialog').showModal();};
window.onNativeReceiptTextError=function(message){byId('paperReceiptStatus').textContent=message||'Не удалось распознать чек.';};
byId('scanPaperReceiptBtn')?.addEventListener('click',()=>byId('paperReceiptInput')?.click());
byId('paperReceiptInput')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;byId('paperReceiptStatus').textContent='Распознаю позиции чека…';try{const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',').pop());r.onerror=rej;r.readAsDataURL(file);});if(window.AndroidReceiptOcr?.recognizeBase64){window.AndroidReceiptOcr.recognizeBase64(data);}else throw new Error('Распознавание доступно в Android-приложении.');}catch(err){byId('paperReceiptStatus').textContent=err.message||String(err);}});


// ===== Package 4: diagnostics, data integrity and safe recovery =====
function diagnoseDatabase() {
  const issues = [];
  const add = (severity, type, title, reason, ref = {}) => issues.push({ id:`diag-${issues.length+1}`, severity, type, title, reason, ...ref });
  const accountNames = new Set(state.accounts.map(a => String(a.name || a.account || "").trim()).filter(Boolean));
  const categoryNames = new Set(state.categories.map(c => String(c.name || c).trim()).filter(Boolean));
  const rowIds = new Set();
  const duplicateKeys = new Map();
  state.rows.forEach((row, index) => {
    if (!row.id) add("error","operation","Операция без идентификатора","Запись невозможно надёжно связать с чеком, платежом или восстановлением.",{index});
    else if (rowIds.has(row.id)) add("error","operation","Повторяющийся ID операции",`Идентификатор ${row.id} используется более одного раза.`,{rowId:row.id});
    else rowIds.add(row.id);
    if (!row.date || Number.isNaN(new Date(`${row.date}T00:00:00`).getTime())) add("error","operation","Некорректная дата операции","Дата отсутствует или имеет неподдерживаемый формат.",{rowId:row.id,index});
    if (!Number.isFinite(Number(row.amount))) add("error","operation","Некорректная сумма операции","Сумма не является числом.",{rowId:row.id,index});
    if (!String(row.account || row.from || row.to || "").trim()) add("warning","operation","Не указан счёт","Операцию нужно привязать к счёту для корректного баланса.",{rowId:row.id,index});
    if (!String(row.category || "").trim()) add("warning","operation","Не указана категория","Операция не попадёт в корректную аналитику по категориям.",{rowId:row.id,index});
    if (row.account && accountNames.size && !accountNames.has(String(row.account).trim())) add("warning","operation","Счёт отсутствует в справочнике",`В операции указан счёт «${row.account}», которого нет в списке счетов.`,{rowId:row.id,index});
    const key = [row.date, Number(row.amount).toFixed(2), String(row.description || row.payee || "").trim().toLowerCase(), String(row.account || "").trim().toLowerCase()].join("|");
    if (duplicateKeys.has(key)) add("warning","duplicate","Возможный дубль операции",`Совпадают дата, сумма, описание и счёт с записью ${duplicateKeys.get(key)}.`,{rowId:row.id,index});
    else duplicateKeys.set(key,row.id || `строка ${index+1}`);
    if (row.receipt) {
      if (!Array.isArray(row.receipt.items) || !row.receipt.items.length) add("warning","receipt","Чек без позиций","У операции есть данные чека, но список товаров пуст.",{rowId:row.id,index});
      const itemTotal = (row.receipt.items || []).reduce((sum,item)=>sum+(Number(item.total)||Number(item.price||0)*Number(item.qty||1)),0);
      const receiptTotal = Math.abs(Number(row.amount)||0);
      if (itemTotal && Math.abs(itemTotal-receiptTotal)>1) add("warning","receipt","Сумма позиций не совпадает с чеком",`Позиции: ${money(itemTotal)}, операция: ${money(receiptTotal)}.`,{rowId:row.id,index});
    }
  });
  Object.entries(state.plannedPaymentStates || {}).forEach(([occurrenceId, saved]) => {
    if (saved.transactionId && !rowIds.has(saved.transactionId)) add("error","planned-payment","Потеряна связанная банковская операция",`Плановый платёж ${occurrenceId} ссылается на удалённую операцию.`,{occurrenceId});
  });
  state.financialProducts.forEach(product => {
    (product.actualPayments || []).forEach(payment => {
      if (payment.transactionId && !rowIds.has(payment.transactionId)) add("error","loan","Платёж по кредиту связан с отсутствующей операцией",`${product.name || "Кредит"}: ${payment.date || "без даты"}.`,{productId:product.id,paymentId:payment.id});
    });
    if (product.type === "loan" && Number(product.remainingBalance) < 0) add("error","loan","Отрицательный остаток кредита","Остаток долга не может быть отрицательным.",{productId:product.id});
  });
  state.insurancePolicies.forEach(policy => {
    if (!policy.subjectName) add("warning","insurance","Не указан объект страховки","Без объекта нельзя корректно фильтровать историю стоимости.",{policyId:policy.id});
    if (policy.startDate && policy.endDate && policy.endDate < policy.startDate) add("error","insurance","Окончание полиса раньше начала","Проверьте даты действия полиса.",{policyId:policy.id});
  });
  state.alimonyRules.forEach(rule => {
    if (rule.effectiveFrom && rule.effectiveTo && rule.effectiveTo < rule.effectiveFrom) add("error","alimony","Окончание правила раньше начала","Период правила начисления задан некорректно.",{ruleId:rule.id});
  });
  return { generatedAt:new Date().toISOString(), schemaVersion:CURRENT_SCHEMA_VERSION, counts:{rows:state.rows.length,accounts:state.accounts.length,categories:state.categories.length,issues:issues.length}, issues };
}

function renderDiagnostics() {
  const host = byId("diagnosticsResults");
  if (!host) return;
  const report = diagnoseDatabase();
  byId("diagnosticsSummary").textContent = report.issues.length ? `Найдено: ${report.issues.length}` : "Ошибок не найдено";
  const grouped = report.issues.reduce((acc,item)=>{(acc[item.severity] ||= []).push(item);return acc;},{});
  host.innerHTML = report.issues.length ? ["error","warning"].flatMap(level => (grouped[level]||[]).map(item => `<article class="diagnostic-item diagnostic-${level}"><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.reason)}</p><small>${escapeHtml(item.type)}</small></div><span>${level==="error"?"Ошибка":"Проверить"}</span></article>`)).join("") : `<div class="empty-state">Целостность базы проверена. Критических проблем не найдено.</div>`;
  byId("diagnosticsMeta").textContent = `Схема ${report.schemaVersion} • ${report.counts.rows} операций • ${new Date(report.generatedAt).toLocaleString("ru-RU")}`;
}

function repairSafeDatabaseIssues() {
  createLocalSafetySnapshot("before-auto-repair");
  let fixed = 0;
  const seen = new Set();
  state.rows.forEach((row,index)=>{
    if (!row.id || seen.has(row.id)) { row.id = `row-repaired-${Date.now()}-${index}`; fixed++; }
    seen.add(row.id);
    if (row.receipt && !Array.isArray(row.receipt.items)) { row.receipt.items=[]; fixed++; }
  });
  Object.entries(state.plannedPaymentStates || {}).forEach(([key,value])=>{
    if (value.transactionId && !seen.has(value.transactionId)) { value.transactionId=""; fixed++; }
  });
  state.financialProducts.forEach(product=>{
    (product.actualPayments||[]).forEach(payment=>{ if(payment.transactionId&&!seen.has(payment.transactionId)){payment.transactionId="";fixed++;} });
    if(product.type==="loan"&&Number(product.remainingBalance)<0){product.remainingBalance=0;fixed++;}
  });
  saveState(); render(); renderDiagnostics();
  byId("diagnosticsMessage").textContent = fixed ? `Безопасно исправлено записей: ${fixed}. Перед исправлением создан локальный снимок.` : "Автоматически исправляемых проблем не найдено.";
}

function downloadDiagnosticsReport() {
  const report = diagnoseDatabase();
  downloadBlob(new Blob([JSON.stringify(report,null,2)],{type:"application/json;charset=utf-8"}),`finporyadok-diagnostics-${safeFileDate()}.json`);
}

byId("runFinalTestsBtn")?.addEventListener("click", renderFinalTests);
byId("downloadFinalTestsBtn")?.addEventListener("click",()=>{ const report=window.__finporyadokFinalTestReport || renderFinalTests(); downloadBlob(new Blob([JSON.stringify(report,null,2)],{type:"application/json;charset=utf-8"}),`finporyadok-final-tests-${safeFileDate()}.json`); });
byId("exportAnalyticsBtn")?.addEventListener("click", exportAdvancedAnalytics);

byId("runDiagnosticsBtn")?.addEventListener("click", renderDiagnostics);
byId("repairDiagnosticsBtn")?.addEventListener("click", repairSafeDatabaseIssues);
byId("downloadDiagnosticsBtn")?.addEventListener("click", downloadDiagnosticsReport);
byId("restoreLatestSnapshotBtn")?.addEventListener("click",()=>{
  try {
    const snapshot = JSON.parse(localStorage.getItem(`${storeKey}.snapshot.latest`) || "null");
    if(!snapshot?.payload) throw new Error("Локальный снимок не найден.");
    createLocalSafetySnapshot("before-snapshot-restore");
    localStorage.setItem(storeKey,JSON.stringify(migrateStoredState(snapshot.payload)));
    location.reload();
  } catch(error) { byId("diagnosticsMessage").textContent=error.message||String(error); }
});

cleanupImportedPdfAccounts();
initializeDashboardDateRange();
applyUiPreferences();
arrangeDashboardPanels();
buildMobileDrawer();
render();
syncMobileNavigation("dashboard");

byId("nativeReceiptScanBtn")?.addEventListener("click", () => {
  if (!startNativeReceiptScanner()) {
    byId("receiptQrInput")?.click();
  }
});

updateDatabaseStatus();


// ===== Пакет 5: семейные профили и права доступа =====
function activeFamilyMember() {
  return state.familyMembers.find((member) => member.id === state.activeMemberId) || state.familyMembers[0] || null;
}
function familyCanAccessView(member, viewId) {
  if (!member || member.role === "admin") return true;
  return ["dashboard", "transactions", "accounts", "calendar", "shopping", "assets", "settings"].includes(viewId);
}
function initializeFamilyOwnership() {
  if (!Array.isArray(state.familyMembers) || !state.familyMembers.length) return;
  state.rows.forEach((row) => { if (!row.memberId) row.memberId = "family-tatiana"; });
  const originalPush = state.rows.push.bind(state.rows);
  state.rows.push = (...items) => originalPush(...items.map((item) => ({ ...item, memberId: item.memberId || state.activeMemberId || "family-tatiana", createdByMemberId: item.createdByMemberId || state.activeMemberId || "family-tatiana" })));
  const originalUnshift = state.rows.unshift.bind(state.rows);
  state.rows.unshift = (...items) => originalUnshift(...items.map((item) => ({ ...item, memberId: item.memberId || state.activeMemberId || "family-tatiana", createdByMemberId: item.createdByMemberId || state.activeMemberId || "family-tatiana" })));
}
function addFamilyLog(action, details = "") {
  const member = activeFamilyMember();
  state.familyActivityLog.unshift({ id: `family-log-${Date.now()}-${Math.random().toString(16).slice(2)}`, at: new Date().toISOString(), memberId: member?.id || "", memberName: member?.name || "Система", action, details });
  state.familyActivityLog = state.familyActivityLog.slice(0, 300);
}
function familyRoleLabel(role) { return role === "admin" ? "Администратор" : "Детский профиль"; }
function renderFamilyAccess() {
  const member = activeFamilyMember();
  const top = byId("activeFamilyProfileBtn");
  if (top && member) top.innerHTML = `<span class="family-avatar family-avatar--${escapeHtml(member.color || "teal")}">${escapeHtml((member.name || "?").slice(0,1).toUpperCase())}</span><span>${escapeHtml(member.name)}</span>`;
  const list = byId("familyMembersList");
  if (list) list.innerHTML = state.familyMembers.map((item) => `<article class="family-member-card ${item.id === state.activeMemberId ? "is-active" : ""}"><div class="family-member-main"><span class="family-avatar family-avatar--${escapeHtml(item.color || "teal")}">${escapeHtml((item.name || "?").slice(0,1).toUpperCase())}</span><div><strong>${escapeHtml(item.name)}</strong><small>${familyRoleLabel(item.role)}${item.allowance ? ` • карманные ${money(item.allowance)}` : ""}</small></div></div><div class="family-member-actions"><button class="ghost switch-family-member" data-member-id="${escapeHtml(item.id)}" type="button">Войти</button>${member?.role === "admin" ? `<button class="icon-action edit-family-member" data-member-id="${escapeHtml(item.id)}" title="Редактировать" type="button">✏️</button>` : ""}</div></article>`).join("");
  const add = byId("addFamilyMemberBtn"); if (add) add.hidden = member?.role !== "admin";
  const log = byId("familyActivityLog");
  if (log) log.innerHTML = state.familyActivityLog.length ? state.familyActivityLog.slice(0,30).map((entry) => `<div class="family-log-row"><span>${new Date(entry.at).toLocaleString("ru-RU")}</span><strong>${escapeHtml(entry.memberName)}</strong><p>${escapeHtml(entry.action)}${entry.details ? ` — ${escapeHtml(entry.details)}` : ""}</p></div>`).join("") : `<div class="empty-state"><strong>Журнал пока пуст</strong><p>Здесь появятся входы в профили и изменения настроек доступа.</p></div>`;
  renderFamilySwitcherList();
  const current = byId("currentFamilyAccessSummary");
  if (current && member) current.textContent = member.role === "admin" ? "Полный доступ ко всем разделам и данным семьи" : `Личный режим: видны собственные операции и разрешённые разделы`;
}
function applyFamilyPermissions() {
  const member = activeFamilyMember();
  document.body.dataset.familyRole = member?.role || "admin";
  document.querySelectorAll("[data-view]").forEach((button) => { button.hidden = !familyCanAccessView(member, button.dataset.view); });
  const addTx = byId("addTxBtn"); if (addTx) addTx.hidden = member?.role === "child" && member.canAddOperations === false;
  document.querySelectorAll("#settings .backup-hero, #settings .backup-grid, #settings .diagnostics-panel").forEach((node) => { node.hidden = member?.role === "child"; });
}
function openFamilyMemberDialog(member = null) {
  if (activeFamilyMember()?.role !== "admin") return;
  const form = byId("familyMemberForm"); form.reset();
  form.elements.memberId.value = member?.id || "";
  form.elements.name.value = member?.name || "";
  form.elements.role.value = member?.role || "child";
  form.elements.pin.value = member?.pin || "";
  form.elements.allowance.value = Number(member?.allowance || 0);
  form.elements.color.value = member?.color || "teal";
  form.elements.canAddOperations.checked = member?.canAddOperations !== false;
  form.elements.canSeeFamilyTotals.checked = member?.canSeeFamilyTotals === true;
  byId("familyMemberDialogTitle").textContent = member ? "Редактирование профиля" : "Новый член семьи";
  byId("deleteFamilyMemberBtn").hidden = !member || member.role === "admin";
  byId("familyMemberDialog").showModal();
}
function switchFamilyMember(memberId) {
  const target = state.familyMembers.find((item) => item.id === memberId); if (!target) return;
  if (target.pin) { const entered = prompt(`Введите PIN профиля «${target.name}»`); if (entered === null) return; if (entered !== target.pin) { alert("Неверный PIN"); return; } }
  state.activeMemberId = target.id;
  addFamilyLog("Вход в профиль");
  saveState(); render(); setView("dashboard");
}
byId("activeFamilyProfileBtn")?.addEventListener("click", () => byId("familySwitcherDialog")?.showModal());
byId("addFamilyMemberBtn")?.addEventListener("click", () => openFamilyMemberDialog());
byId("familyMembersList")?.addEventListener("click", (event) => { const sw = event.target.closest(".switch-family-member"); if (sw) { switchFamilyMember(sw.dataset.memberId); return; } const edit = event.target.closest(".edit-family-member"); if (edit) openFamilyMemberDialog(state.familyMembers.find((item) => item.id === edit.dataset.memberId)); });
byId("familySwitcherList")?.addEventListener("click", (event) => { const button = event.target.closest("[data-family-switch-id]"); if (!button) return; byId("familySwitcherDialog").close(); switchFamilyMember(button.dataset.familySwitchId); });
byId("familyMemberForm")?.addEventListener("submit", (event) => { event.preventDefault(); const form = event.currentTarget, d = Object.fromEntries(new FormData(form).entries()); const existing = state.familyMembers.find((item) => item.id === d.memberId); const obj = { id: existing?.id || `family-${Date.now()}`, name: d.name.trim(), role: d.role, pin: d.pin.trim(), allowance: Number(d.allowance)||0, color: d.color || "teal", canAddOperations: form.elements.canAddOperations.checked, canSeeFamilyTotals: form.elements.canSeeFamilyTotals.checked, active: true }; const index = state.familyMembers.findIndex((item) => item.id === obj.id); if (index >= 0) state.familyMembers[index] = obj; else state.familyMembers.push(obj); addFamilyLog(existing ? "Изменён профиль" : "Добавлен профиль", obj.name); saveState(); byId("familyMemberDialog").close(); render(); });
byId("deleteFamilyMemberBtn")?.addEventListener("click", () => { const id = byId("familyMemberForm").elements.memberId.value; const member = state.familyMembers.find((item) => item.id === id); if (!member || member.role === "admin") return; if (!confirm(`Удалить профиль «${member.name}»? Его операции останутся в базе и будут переданы администратору.`)) return; state.rows.forEach((row) => { if (row.memberId === id) row.memberId = "family-tatiana"; }); state.familyMembers = state.familyMembers.filter((item) => item.id !== id); addFamilyLog("Удалён профиль", member.name); saveState(); byId("familyMemberDialog").close(); render(); });
const originalRenderFamilyAccess = renderFamilyAccess;
const oldRenderFamilySwitcher = renderFamilyAccess;
function renderFamilySwitcherList() { const target = byId("familySwitcherList"); if (target) target.innerHTML = state.familyMembers.map((item) => `<button class="family-switch-row ${item.id===state.activeMemberId?'is-active':''}" data-family-switch-id="${escapeHtml(item.id)}" type="button"><span class="family-avatar family-avatar--${escapeHtml(item.color || 'teal')}">${escapeHtml((item.name||'?').slice(0,1).toUpperCase())}</span><span><strong>${escapeHtml(item.name)}</strong><small>${familyRoleLabel(item.role)}</small></span></button>`).join(""); }
const familyRenderObserver = new MutationObserver(() => {});

window.addEventListener("beforeunload", saveState);

byId("refreshMoscowPmBtn")?.addEventListener("click", () => requestMoscowChildMinimum({ force: true }));
byId("alimonyRuleForm")?.elements?.effectiveFrom?.addEventListener("change", () => requestMoscowChildMinimum());


// Editable automatic monthly payment
byId("financeProductForm")?.addEventListener("input", (event) => {
  const field = event.target;
  const form = event.currentTarget;
  if (field.name === "monthlyPaymentOverride") {
    field.dataset.manual = field.value.trim() ? "true" : "false";
    updateFinanceCalculationPreview();
    return;
  }
  if (!["principal", "rate", "rateMode", "termMonths", "paymentType"].includes(field.name)) return;
  const paymentField = form.elements.monthlyPaymentOverride;
  if (!paymentField || paymentField.dataset.manual === "true") return;
  const product = currentFinanceFormProduct();
  if (product.type === "loan") {
    paymentField.value = calculateLoan({...product, monthlyPaymentOverride: 0}).monthlyPayment.toFixed(2);
    updateFinanceCalculationPreview();
  }
});

// ===== Package 2: regular money, payment calendar and actual loan balance =====
let editingRegularPaymentId = null;
const regularTypeLabels = {utilities:"Коммунальные",education:"Кружки и школа",subscription:"Подписка",tax:"Налог",insurance:"Страховка",loan:"Кредит",other:"Прочее"};
function dateLocal(d){ const x=new Date(d.getTime()-d.getTimezoneOffset()*60000); return x.toISOString().slice(0,10); }
function addFrequency(dateText, frequency, step=1){ const d=new Date(`${dateText}T00:00:00`); if(frequency==='weekly') d.setDate(d.getDate()+7*step); else {const m={monthly:1,quarterly:3,halfyear:6,yearly:12}[frequency]||0; d.setMonth(d.getMonth()+m*step);} return dateLocal(d); }
function regularOccurrences(monthsBack=3, monthsForward=15){
 const now=new Date(); const from=new Date(now.getFullYear(),now.getMonth()-monthsBack,1); const to=new Date(now.getFullYear(),now.getMonth()+monthsForward+1,0); const out=[];
 state.regularPayments.filter(x=>x.autoPlan!==false).forEach(t=>{ let date=t.startDate; let guard=0; while(date && guard++<800){const d=new Date(`${date}T00:00:00`); if(t.endDate && date>t.endDate) break; if(d>to) break; if(d>=from){const id=`${t.id}@${date}`; const saved=state.plannedPaymentStates[id]||{}; out.push({...t, occurrenceId:id, dueDate:date, eventKind:'payment', ...saved});} if(t.frequency==='once') break; date=addFrequency(date,t.frequency,1); } if(t.paymentType==='utilities' && t.hasMeters && t.meterReadingStartDate){let meterDate=t.meterReadingStartDate;let meterGuard=0;while(meterDate&&meterGuard++<800){const md=new Date(`${meterDate}T00:00:00`);if(t.endDate&&meterDate>t.endDate)break;if(md>to)break;if(md>=from){const meterId=`${t.id}@meter@${meterDate}`;const meterSaved=state.plannedPaymentStates[meterId]||{};out.push({...t,name:`Показания: ${t.name}`,amount:0,occurrenceId:meterId,dueDate:meterDate,eventKind:'meter-reading',...meterSaved});}if(t.frequency==='once')break;meterDate=addFrequency(meterDate,t.frequency,1);}}});
 // Insurance annual obligations
 state.insurancePolicies.forEach(pol=>{ if(!pol.endDate) return; const id=`insurance@${pol.id}@${pol.endDate}`; const saved=state.plannedPaymentStates[id]||{}; const d=new Date(`${pol.endDate}T00:00:00`); if(d>=from&&d<=to) out.push({id:pol.id,occurrenceId:id,name:`Продление: ${pol.subjectName}`,paymentType:'insurance',amount:Number(pol.cost)||0,dueDate:pol.endDate,category:'Страхование',project:pol.project||'',...saved,systemGenerated:true}); });
 // Loan schedule obligations
 plannedLoanPaymentsList(24).forEach(item=>{const id=`loan@${item.id}`; const saved=state.plannedPaymentStates[id]||{}; out.push({...item,occurrenceId:id,dueDate:item.date,paymentType:'loan',amount:item.amount,...saved,systemGenerated:true});});
 return out.sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
}
function occurrenceStatus(o){ if(o.paidDate||o.transactionId) return 'paid'; const today=dateLocal(new Date()); if(o.dueDate<today) return 'overdue'; const diff=(new Date(o.dueDate)-new Date(today))/86400000; return diff<=Math.max(0,Number(o.remindDays??3))?'due':'planned'; }
function populateRegularFilters(){
 const sel=byId('regularMonthFilter'); if(!sel) return; const current=sel.value; const now=new Date(); let opts=''; for(let i=-3;i<=12;i++){const d=new Date(now.getFullYear(),now.getMonth()+i,1); const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; opts+=`<option value="${v}">${d.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</option>`;} sel.innerHTML=opts; sel.value=current&&[...sel.options].some(o=>o.value===current)?current:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}
function renderRegularMoney(){
 if(!byId('regularCalendar')) return; populateRegularFilters(); const month=byId('regularMonthFilter').value; const type=byId('regularTypeFilter').value; const status=byId('regularStatusFilter').value; const all=regularOccurrences(); const rows=all.filter(o=>o.dueDate.startsWith(month)&&(type==='all'||o.paymentType===type)&&(status==='all'||occurrenceStatus(o)===status));
 byId('regularCalendar').innerHTML=rows.length?rows.map(o=>{const s=occurrenceStatus(o); return `<article class="regular-payment-row status-${s}" data-occurrence-id="${escapeHtml(o.occurrenceId)}"><div class="regular-date"><strong>${new Date(o.dueDate+'T00:00:00').getDate()}</strong><span>${new Date(o.dueDate+'T00:00:00').toLocaleDateString('ru-RU',{month:'short'})}</span></div><div class="regular-main"><span class="regular-type">${escapeHtml(regularTypeLabels[o.paymentType]||'Платёж')}</span><strong>${escapeHtml(o.name)}</strong><small>${escapeHtml(o.project||o.payee||o.category||'')} ${o.transactionId?'• связано с операцией':''}</small></div><div class="regular-amount"><strong>${money(o.paidAmount||o.amount)}</strong><span>${s==='paid'?'Оплачено':s==='overdue'?'Просрочено':s==='due'?'Скоро':'В плане'}</span></div><button class="icon-button open-planned-payment" data-occurrence-id="${escapeHtml(o.occurrenceId)}" title="Открыть">›</button></article>`}).join(''):`<article class="empty-state"><strong>Платежей нет</strong><p>Добавьте регулярный платёж или выберите другой месяц.</p></article>`;
 byId('regularTemplateCards').innerHTML=state.regularPayments.length?state.regularPayments.map(t=>`<article class="regular-template-card"><div><span>${escapeHtml(regularTypeLabels[t.paymentType]||'Платёж')}</span><h3>${escapeHtml(t.name)}</h3><p>${money(t.amount)} • ${t.frequency==='monthly'?'ежемесячно':t.frequency==='weekly'?'еженедельно':t.frequency==='quarterly'?'раз в квартал':t.frequency==='halfyear'?'раз в полгода':t.frequency==='yearly'?'ежегодно':'однократно'}</p></div><div><button class="insurance-action-icon edit-regular-payment" data-template-id="${escapeHtml(t.id)}" title="Редактировать">✏️</button><button class="insurance-action-icon delete-regular-payment" data-template-id="${escapeHtml(t.id)}" title="Удалить">🗑️</button></div></article>`).join(''):`<article class="empty-state"><strong>Шаблонов нет</strong><p>Добавьте коммунальные платежи, кружки, подписки, налоги или другие обязательства.</p></article>`;
 const today=new Date(), todayText=dateLocal(today), next30=dateLocal(new Date(today.getFullYear(),today.getMonth(),today.getDate()+30)); const upcoming=all.filter(o=>!['paid'].includes(occurrenceStatus(o))&&o.dueDate>=todayText&&o.dueDate<=next30); const overdue=all.filter(o=>occurrenceStatus(o)==='overdue'); const paid=all.filter(o=>occurrenceStatus(o)==='paid'&&String(o.paidDate||o.dueDate).startsWith(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`));
 byId('regularNext30Total').textContent=money(upcoming.reduce((s,o)=>s+Number(o.amount||0),0)); byId('regularNext30Count').textContent=`${upcoming.length} платежей`; byId('regularOverdueTotal').textContent=money(overdue.reduce((s,o)=>s+Number(o.amount||0),0)); byId('regularOverdueCount').textContent=`${overdue.length} платежей`; byId('regularPaidTotal').textContent=money(paid.reduce((s,o)=>s+Number(o.paidAmount||o.amount||0),0)); byId('regularPaidCount').textContent=`${paid.length} платежей`;
}
function updateRegularUtilityFields(){const f=byId('regularPaymentForm');const utility=f?.elements?.paymentType?.value==='utilities';document.querySelectorAll('.utility-only-field').forEach(el=>el.hidden=!utility);const hasMeters=utility&&f?.elements?.hasMeters?.checked;document.querySelectorAll('.meter-date-field').forEach(el=>el.hidden=!hasMeters);if(hasMeters&&f.elements.meterReadingStartDate&&!f.elements.meterReadingStartDate.value){const base=f.elements.startDate.value?new Date(`${f.elements.startDate.value}T00:00:00`):new Date();base.setDate(Math.max(1,base.getDate()-5));f.elements.meterReadingStartDate.value=dateLocal(base);}}
function fillRegularDialog(t=null){ const f=byId('regularPaymentForm'); f.reset(); editingRegularPaymentId=t?.id||null; byId('regularPaymentDialogTitle').textContent=t?'Редактировать платёж':'Регулярный платёж'; const cats=categoryNamesByType('expense'); byId('regularCategorySelect').innerHTML=(cats.length?cats:['Обязательные платежи']).map(x=>`<option>${escapeHtml(x)}</option>`).join(''); byId('regularAccountSelect').innerHTML='<option value="">Не указан</option>'+state.accounts.map(a=>`<option value="${escapeHtml(a.name)}">${escapeHtml(a.name)}</option>`).join(''); const e=f.elements; e.startDate.value=t?.startDate||dateLocal(new Date()); e.remindDays.value=t?.remindDays??3; e.autoPlan.checked=t?.autoPlan!==false; if(t) Object.entries(t).forEach(([k,v])=>{if(e[k]&&k!=='autoPlan') e[k].value=v??'';}); updateRegularUtilityFields(); byId('regularPaymentDialog').showModal(); }
function candidateTransactions(o){return state.rows.filter(r=>Number(r.amount)<0&&Math.abs(Math.abs(Number(r.amount))-Number(o.amount||0))<=Math.max(5,Number(o.amount||0)*.03)&&Math.abs((new Date(r.date)-new Date(o.dueDate))/86400000)<=10).sort((a,b)=>Math.abs(new Date(a.date)-new Date(o.dueDate))-Math.abs(new Date(b.date)-new Date(o.dueDate))).slice(0,30);}
function openPlannedPayment(id){const o=regularOccurrences().find(x=>x.occurrenceId===id); if(!o)return; const f=byId('plannedPaymentForm'), s=state.plannedPaymentStates[id]||{}; f.elements.occurrenceId.value=id; f.elements.paidDate.value=s.paidDate||dateLocal(new Date()); f.elements.paidAmount.value=s.paidAmount||o.amount||''; f.elements.paidAmount.closest('label').hidden=o.eventKind==='meter-reading'; f.elements.comment.value=s.comment||''; byId('plannedPaymentSubtitle').textContent=o.eventKind==='meter-reading'?`${o.name} • передать до ${formatTransactionDate(o.dueDate)}`:`${o.name} • срок ${formatTransactionDate(o.dueDate)} • ${money(o.amount)}`; const candidates=candidateTransactions(o); byId('plannedTransactionSelect').innerHTML='<option value="">Не связывать</option>'+candidates.map(r=>`<option value="${escapeHtml(r.id)}">${formatTransactionDate(r.date)} • ${escapeHtml(r.description)} • ${money(Math.abs(r.amount))}</option>`).join(''); byId('plannedTransactionSelect').value=s.transactionId||''; byId('plannedPaymentDialog').showModal();}
function loanActualPayments(product){return Array.isArray(product.actualPayments)?product.actualPayments:[];}
function loanRemaining(product){const base=Number(product.openingBalance ?? product.principal)||0; return Math.max(0,base-loanActualPayments(product).reduce((s,p)=>s+Number(p.principalPart||0),0));}
function addLoanPaymentButton(card, product){return card.replace('</article>',`<div class="loan-actions"><div><button class="ghost add-loan-payment" data-product-id="${escapeHtml(product.id)}">+ Платёж</button><button class="ghost edit-finance-product" data-product-id="${escapeHtml(product.id)}">Редактировать</button></div><small>Фактических платежей: ${loanActualPayments(product).length}</small></div></article>`)}
const _financeProductCardPkg2=financeProductCard;
financeProductCard=function(product){let h=_financeProductCardPkg2(product); if(product.type==='loan'){const calc=calculateLoan(product);const payment=Number(product.monthlyPaymentOverride)||calc.monthlyPayment; h=h.replace(`<div><span>Сумма</span><strong>${money(product.principal)}</strong></div>`,`<div><span>Первоначальный платёж</span><strong>${money(product.downPayment||0)}</strong></div><div><span>Сумма кредита</span><strong>${money(product.principal)}</strong></div><div><span>Остаток долга</span><strong>${money(loanRemaining(product))}</strong></div>`).replace(`<div><span>Платёж в месяц</span><strong>${money(calc.monthlyPayment)}</strong></div>`,`<div><span>Платёж в месяц</span><strong>${money(payment)}</strong></div>`); h=addLoanPaymentButton(h,product);} return h;};
const _renderFinanceProductsPkg2=renderFinanceProducts;
renderFinanceProducts=function(){_renderFinanceProductsPkg2(); const loans=state.financialProducts.filter(x=>x.type==='loan'); byId('loanBalanceTotal').textContent=money(loans.reduce((s,x)=>s+loanRemaining(x),0));};

byId('openReviewCenterBtn')?.addEventListener('click',()=>{renderReviewCenter();byId('reviewCenterDialog')?.showModal();});
byId('regularPaymentForm')?.elements?.paymentType?.addEventListener('change',updateRegularUtilityFields);byId('regularPaymentForm')?.elements?.hasMeters?.addEventListener('change',updateRegularUtilityFields);
document.addEventListener('click',(event)=>{const button=event.target.closest('.open-review-item');if(!button)return;byId('reviewCenterDialog')?.close();if(button.dataset.reviewKind==='operation'){showOperationDetails(button.dataset.reviewId);return;}if(button.dataset.reviewKind==='planned'){openPlannedPayment(button.dataset.reviewId);return;}if(button.dataset.reviewKind==='insurance'){setView('insurance');setTimeout(()=>{const card=[...document.querySelectorAll('.edit-insurance')].find(el=>el.dataset.policyId===button.dataset.reviewId);card?.click();},50);}});

byId('addRegularPaymentBtn')?.addEventListener('click',()=>fillRegularDialog());
['regularMonthFilter','regularTypeFilter','regularStatusFilter'].forEach(id=>byId(id)?.addEventListener('change',renderRegularMoney));
byId('regularPaymentForm')?.addEventListener('submit',e=>{e.preventDefault(); const f=e.currentTarget,d=Object.fromEntries(new FormData(f).entries()); const obj={id:editingRegularPaymentId||`regular-${Date.now()}`,name:d.name,paymentType:d.paymentType,amount:Number(d.amount)||0,frequency:d.frequency,startDate:d.startDate,endDate:d.endDate||'',category:d.category||'',account:d.account||'',project:d.project||'',payee:d.payee||'',hasMeters:d.hasMeters==='true',meterReadingStartDate:d.hasMeters==='true'?(d.meterReadingStartDate||''):'',remindDays:Number(d.remindDays)||0,autoPlan:d.autoPlan==='true'}; const i=state.regularPayments.findIndex(x=>x.id===obj.id); if(i>=0)state.regularPayments[i]=obj;else state.regularPayments.push(obj); saveState(); byId('regularPaymentDialog').close(); render(); setView('calendar');});
document.addEventListener('click',e=>{const edit=e.target.closest('.edit-regular-payment'); if(edit){fillRegularDialog(state.regularPayments.find(x=>x.id===edit.dataset.templateId));return;} const del=e.target.closest('.delete-regular-payment'); if(del&&confirm('Удалить шаблон и будущие платежи?')){state.regularPayments=state.regularPayments.filter(x=>x.id!==del.dataset.templateId);saveState();renderRegularMoney();return;} const open=e.target.closest('.open-planned-payment'); if(open){openPlannedPayment(open.dataset.occurrenceId);return;} const fp=e.target.closest('.edit-finance-product'); if(fp){const product=state.financialProducts.find(x=>x.id===fp.dataset.productId);if(product)openFinanceProductDialog(product);return;} const lp=e.target.closest('.add-loan-payment'); if(lp){const p=state.financialProducts.find(x=>x.id===lp.dataset.productId); const f=byId('loanPaymentForm');f.reset();f.elements.productId.value=p.id;f.elements.date.value=dateLocal(new Date()); const candidates=state.rows.filter(r=>Number(r.amount)<0).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100);byId('loanTransactionSelect').innerHTML='<option value="">Не связывать</option>'+candidates.map(r=>`<option value="${escapeHtml(r.id)}">${formatTransactionDate(r.date)} • ${escapeHtml(r.description)} • ${money(Math.abs(r.amount))}</option>`).join('');byId('loanPaymentDialog').showModal();}});
byId('plannedPaymentForm')?.addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());state.plannedPaymentStates[d.occurrenceId]={paidDate:d.paidDate||dateLocal(new Date()),paidAmount:d.paidAmount===''?0:Number(d.paidAmount)||0,transactionId:d.transactionId||'',comment:d.comment||''};saveState();byId('plannedPaymentDialog').close();render();});
byId('markPlannedUnpaidBtn')?.addEventListener('click',()=>{const id=byId('plannedPaymentForm').elements.occurrenceId.value;delete state.plannedPaymentStates[id];saveState();byId('plannedPaymentDialog').close();render();});
byId('loanPaymentForm')?.addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());const p=state.financialProducts.find(x=>x.id===d.productId);if(!p)return;const amount=Number(d.amount)||0;let principalPart=Number(d.principalPart)||0;if(!principalPart){const monthlyInterest=loanRemaining(p)*ratePerMonth(p);principalPart=Math.max(0,Math.min(loanRemaining(p),amount-monthlyInterest));if(d.paymentKind==='early')principalPart=Math.min(loanRemaining(p),amount);}p.actualPayments=[...loanActualPayments(p),{id:`loan-payment-${Date.now()}`,date:d.date,amount,paymentKind:d.paymentKind,principalPart,interestPart:Math.max(0,amount-principalPart),transactionId:d.transactionId||'',comment:d.comment||''}];saveState();byId('loanPaymentDialog').close();render();setView('finance-products');});


// Package 6 — offline-first cloud folder synchronization
const CLOUD_SYNC_FILE = "finporyadok-family-sync.json";
const CLOUD_META_KEY = `${storeKey}.cloud.meta`;
const CLOUD_HISTORY_KEY = `${storeKey}.cloud.history`;
let cloudSyncBusy = false;
let cloudSyncTimer = null;
let cloudReadResolver = null;
let cloudWriteResolver = null;
let suppressCloudAutoSync = false;

function cloudMeta(){
  try{return JSON.parse(localStorage.getItem(CLOUD_META_KEY)||"{}");}catch{return {};}
}
function saveCloudMeta(meta){localStorage.setItem(CLOUD_META_KEY,JSON.stringify(meta||{}));renderCloudSyncStatus();}
function cloudHistory(){try{return JSON.parse(localStorage.getItem(CLOUD_HISTORY_KEY)||"[]");}catch{return [];}}
function addCloudHistory(action,detail="",level="info"){
  const rows=cloudHistory();rows.unshift({id:`sync-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,at:new Date().toISOString(),action,detail,level});
  localStorage.setItem(CLOUD_HISTORY_KEY,JSON.stringify(rows.slice(0,100)));renderCloudHistory();
}
function cloudDeviceId(){
  let id=localStorage.getItem(`${storeKey}.deviceId`);if(!id){id=`device-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;localStorage.setItem(`${storeKey}.deviceId`,id);}return id;
}
function cloudDeviceName(){
  let name=localStorage.getItem(`${storeKey}.deviceName`);if(!name){name=`Устройство ${cloudDeviceId().slice(-5).toUpperCase()}`;localStorage.setItem(`${storeKey}.deviceName`,name);}return name;
}
function currentSerializableState(){
  return migrateStoredState(JSON.parse(localStorage.getItem(storeKey)||"{}"));
}
function stableJson(value){
  if(Array.isArray(value))return `[${value.map(stableJson).join(",")}]`;
  if(value&&typeof value==="object")return `{${Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+stableJson(value[k])).join(",")}}`;
  return JSON.stringify(value);
}
function simpleHash(value){
  const text=typeof value==="string"?value:stableJson(value);let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);
}
function makeCloudEnvelope(){
  const payload=currentSerializableState();
  return {format:"finporyadok-cloud-sync",version:1,schemaVersion:CURRENT_SCHEMA_VERSION,updatedAt:new Date().toISOString(),deviceId:cloudDeviceId(),deviceName:cloudDeviceName(),payload,hash:simpleHash(payload)};
}
function arrayKey(item,index){return item?.id||item?.occurrenceId||item?.name||`index-${index}`;}
function mergeArray(local=[],remote=[],remoteNewer=false,conflicts=[]){
  const map=new Map();local.forEach((x,i)=>map.set(arrayKey(x,i),structuredCloneSafe(x)));
  remote.forEach((r,i)=>{const key=arrayKey(r,i),l=map.get(key);if(!l){map.set(key,structuredCloneSafe(r));return;}if(stableJson(l)===stableJson(r))return;
    const lt=Date.parse(l.updatedAt||l.modifiedAt||0)||0,rt=Date.parse(r.updatedAt||r.modifiedAt||0)||0;
    if(rt>lt)map.set(key,structuredCloneSafe(r));else if(!lt&&!rt&&remoteNewer)map.set(key,structuredCloneSafe(r));
    conflicts.push(key);
  });return [...map.values()];
}
function mergeCloudPayload(local,remote,remoteUpdatedAt){
  const out=structuredCloneSafe(local),conflicts=[];const remoteNewer=(Date.parse(remoteUpdatedAt||0)||0)>(Date.parse(local.savedAt||0)||0);
  ["rows","accounts","categories","importArchive","shopping","financialProducts","insurancePolicies","alimonyRules","regularPayments","familyMembers","familyActivityLog"].forEach(k=>{out[k]=mergeArray(local[k]||[],remote[k]||[],remoteNewer,conflicts);});
  ["plannedPaymentStates","shoppingAliases","officialSubsistenceByYear"].forEach(k=>{out[k]={...(local[k]||{}),...(remote[k]||{})};});
  out.officialSubsistenceData=remoteNewer?(remote.officialSubsistenceData||local.officialSubsistenceData):(local.officialSubsistenceData||remote.officialSubsistenceData);
  out.activeMemberId=local.activeMemberId||remote.activeMemberId||"family-tatiana";out.schemaVersion=CURRENT_SCHEMA_VERSION;out.savedAt=new Date().toISOString();
  return {payload:out,conflicts:[...new Set(conflicts)]};
}
function applyCloudPayload(payload){
  suppressCloudAutoSync=true;createLocalSafetySnapshot("before-cloud-apply");localStorage.setItem(storeKey,JSON.stringify(migrateStoredState(payload)));location.reload();
}
function nativeCloudAvailable(){return Boolean(window.AndroidCloudSync&&typeof window.AndroidCloudSync.readSyncFile==="function");}
function requestCloudRead(){
  return new Promise((resolve,reject)=>{if(!nativeCloudAvailable())return reject(new Error("Облачная папка доступна только в Android-приложении."));cloudReadResolver={resolve,reject};window.AndroidCloudSync.readSyncFile(CLOUD_SYNC_FILE);setTimeout(()=>{if(cloudReadResolver){cloudReadResolver=null;reject(new Error("Облако не ответило вовремя."));}},15000);});
}
function requestCloudWrite(text){
  return new Promise((resolve,reject)=>{if(!nativeCloudAvailable())return reject(new Error("Облачная папка доступна только в Android-приложении."));cloudWriteResolver={resolve,reject};window.AndroidCloudSync.writeSyncFile(CLOUD_SYNC_FILE,text);setTimeout(()=>{if(cloudWriteResolver){cloudWriteResolver=null;reject(new Error("Не удалось подтвердить запись в облако."));}},15000);});
}
window.onNativeCloudFolderSelected=(name)=>{const meta=cloudMeta();meta.connected=true;meta.folderName=name||"Облачная папка";meta.autoSync=meta.autoSync!==false;saveCloudMeta(meta);addCloudHistory("Подключена облачная папка",meta.folderName);syncCloudNow("connect");};
window.onNativeCloudFolderDisconnected=()=>{saveCloudMeta({connected:false,autoSync:false});addCloudHistory("Облачная папка отключена");};
window.onNativeCloudRead=(content)=>{if(cloudReadResolver){const r=cloudReadResolver;cloudReadResolver=null;r.resolve(content||"");}};
window.onNativeCloudReadError=(message)=>{if(cloudReadResolver){const r=cloudReadResolver;cloudReadResolver=null;r.reject(new Error(message||"Ошибка чтения облака"));}};
window.onNativeCloudWritten=()=>{if(cloudWriteResolver){const r=cloudWriteResolver;cloudWriteResolver=null;r.resolve(true);}};
window.onNativeCloudWriteError=(message)=>{if(cloudWriteResolver){const r=cloudWriteResolver;cloudWriteResolver=null;r.reject(new Error(message||"Ошибка записи в облако"));}};
window.onNativeCloudStatus=(connected,name)=>{const meta=cloudMeta();meta.connected=Boolean(connected);if(name)meta.folderName=name;saveCloudMeta(meta);if(meta.connected&&meta.autoSync!==false)setTimeout(()=>syncCloudNow("startup"),700);};

async function syncCloudNow(reason="manual"){
  if(cloudSyncBusy)return;const meta=cloudMeta();if(!meta.connected){setCloudMessage("Сначала выберите облачную папку.","error");return;}
  cloudSyncBusy=true;renderCloudSyncStatus("busy");setCloudMessage("Сверяем локальную и облачную базы…");
  try{
    let remoteText="";try{remoteText=await requestCloudRead();}catch(error){if(!/не найден|отсутств/i.test(error.message))throw error;}
    const localEnvelope=makeCloudEnvelope();
    if(!remoteText.trim()){
      await requestCloudWrite(JSON.stringify(localEnvelope));
      saveCloudMeta({...meta,connected:true,lastSyncAt:new Date().toISOString(),lastHash:localEnvelope.hash,lastDirection:"upload"});
      addCloudHistory("Первая база загружена в облако",`${state.rows.length} операций`);setCloudMessage("Облачная база создана.","ok");return;
    }
    let remote;try{remote=JSON.parse(remoteText);}catch{throw new Error("Облачный файл повреждён или имеет неверный формат.");}
    if(remote.format!=="finporyadok-cloud-sync"||!remote.payload)throw new Error("В выбранной папке найден несовместимый файл синхронизации.");
    const remoteHash=remote.hash||simpleHash(remote.payload),localHash=localEnvelope.hash,lastHash=meta.lastHash||"";
    if(remoteHash===localHash){saveCloudMeta({...meta,lastSyncAt:new Date().toISOString(),lastHash:localHash,lastDirection:"equal"});setCloudMessage("Все устройства синхронизированы.","ok");return;}
    const localChanged=!lastHash||localHash!==lastHash,remoteChanged=!lastHash||remoteHash!==lastHash;
    if(!localChanged&&remoteChanged){
      saveCloudMeta({...meta,lastSyncAt:new Date().toISOString(),lastHash:remoteHash,lastDirection:"download"});addCloudHistory("Получены изменения из облака",remote.deviceName||"Другое устройство");setCloudMessage("Получены новые данные. Приложение перезапускается…","ok");applyCloudPayload(remote.payload);return;
    }
    if(localChanged&&!remoteChanged){
      await requestCloudWrite(JSON.stringify(localEnvelope));saveCloudMeta({...meta,lastSyncAt:new Date().toISOString(),lastHash:localHash,lastDirection:"upload"});addCloudHistory("Изменения отправлены в облако",reason);setCloudMessage("Изменения отправлены в облако.","ok");return;
    }
    const merged=mergeCloudPayload(localEnvelope.payload,remote.payload,remote.updatedAt);const mergedEnvelope={...makeCloudEnvelope(),payload:merged.payload};mergedEnvelope.hash=simpleHash(merged.payload);mergedEnvelope.updatedAt=new Date().toISOString();
    await requestCloudWrite(JSON.stringify(mergedEnvelope));saveCloudMeta({...meta,lastSyncAt:new Date().toISOString(),lastHash:mergedEnvelope.hash,lastDirection:"merge",conflictCount:merged.conflicts.length});
    addCloudHistory("Базы объединены",merged.conflicts.length?`Требуют внимания совпадающие записи: ${merged.conflicts.length}`:"Конфликтов не обнаружено",merged.conflicts.length?"conflict":"info");
    if(mergedEnvelope.hash!==localHash){setCloudMessage("Данные объединены. Приложение перезапускается…","ok");applyCloudPayload(merged.payload);return;}
    setCloudMessage("Локальные и облачные изменения объединены.","ok");
  }catch(error){addCloudHistory("Ошибка синхронизации",error.message,"error");setCloudMessage(error.message||"Не удалось синхронизировать данные.","error");}
  finally{cloudSyncBusy=false;renderCloudSyncStatus();}
}
function scheduleCloudSyncAfterSave(){
  if(suppressCloudAutoSync)return;const meta=cloudMeta();if(!meta.connected||meta.autoSync===false)return;clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>syncCloudNow("autosave"),1800);
}
function setCloudMessage(text,stateName=""){const el=byId("cloudSyncMessage");if(el)el.textContent=text;const badge=byId("cloudSyncBadge");if(badge&&stateName)badge.dataset.state=stateName;}
function renderCloudSyncStatus(forceState=""){
  const meta=cloudMeta(),badge=byId("cloudSyncBadge");if(!badge)return;badge.textContent=cloudSyncBusy||forceState==="busy"?"Синхронизация…":meta.connected?"Подключено":"Не подключено";badge.dataset.state=cloudSyncBusy||forceState==="busy"?"busy":meta.connected?"ok":"";
  byId("cloudFolderName").textContent=meta.folderName||"Не выбрана";byId("cloudDeviceName").textContent=cloudDeviceName();byId("cloudAutoSync").checked=meta.autoSync!==false;
  byId("cloudSyncLastAt").textContent=meta.lastSyncAt?`Последняя синхронизация: ${new Date(meta.lastSyncAt).toLocaleString("ru-RU")}`:"Синхронизация ещё не выполнялась";
  byId("cloudSyncStateText").textContent=meta.lastDirection==="download"?"Последние изменения получены из облака":meta.lastDirection==="upload"?"Последние изменения отправлены в облако":meta.lastDirection==="merge"?`Базы объединены${meta.conflictCount?`, совпадений: ${meta.conflictCount}`:""}`:"Локальные данные готовы к синхронизации";
  byId("syncNowBtn").disabled=!meta.connected||cloudSyncBusy;byId("disconnectCloudBtn").disabled=!meta.connected;
}
function renderCloudHistory(){const box=byId("cloudHistoryList");if(!box)return;const rows=cloudHistory();box.innerHTML=rows.length?rows.map(x=>`<article class="cloud-history-item" data-level="${escapeHtml(x.level||"info")}"><strong>${escapeHtml(x.action)}</strong><span>${escapeHtml(x.detail||"")}</span><small>${new Date(x.at).toLocaleString("ru-RU")}</small></article>`).join(""):'<article class="empty-state"><strong>Журнал пуст</strong><p>Здесь появятся результаты синхронизации.</p></article>';}
byId("connectCloudFolderBtn")?.addEventListener("click",()=>{if(!nativeCloudAvailable()){setCloudMessage("Выбор облачной папки работает в установленном Android-приложении.","error");return;}window.AndroidCloudSync.chooseCloudFolder();});
byId("syncNowBtn")?.addEventListener("click",()=>syncCloudNow("manual"));
byId("disconnectCloudBtn")?.addEventListener("click",()=>{if(!confirm("Отключить облачную папку? Локальная база останется на устройстве."))return;window.AndroidCloudSync?.disconnectCloudFolder();saveCloudMeta({connected:false,autoSync:false});});
byId("cloudAutoSync")?.addEventListener("change",e=>{const meta=cloudMeta();meta.autoSync=e.target.checked;saveCloudMeta(meta);addCloudHistory(e.target.checked?"Автосинхронизация включена":"Автосинхронизация выключена");if(e.target.checked&&meta.connected)syncCloudNow("auto-enabled");});
byId("cloudHistoryBtn")?.addEventListener("click",()=>{renderCloudHistory();byId("cloudHistoryDialog")?.showModal();});
renderCloudSyncStatus();renderCloudHistory();
if(nativeCloudAvailable())setTimeout(()=>window.AndroidCloudSync.getCloudStatus(),300);


// PACKAGE 7/9 — budgets, goals, family privacy and cash forecast
function planningMonth(){return byId('planningMonth')?.value||new Date().toISOString().slice(0,7);}
function planningMember(){return activeFamilyMember();}
function isPlanningAdmin(){return planningMember()?.role==='admin';}
function visibleBudgetPlans(month){
  const member=planningMember();
  return state.budgetPlans.filter(p=>p.month===month && (member?.role==='admin' || (p.memberId||'family')===member?.id));
}
function visibleSavingsGoals(){
  const member=planningMember();
  return state.savingsGoals.filter(g=>member?.role==='admin' || (g.memberId||'family-tatiana')===member?.id);
}
function ownerName(ownerId){
  if(ownerId==='family') return 'Вся семья';
  return state.familyMembers.find(m=>m.id===ownerId)?.name||'Профиль';
}
function renderPlanning(){
  const month=planningMonth(); const rows=state.rows.filter(r=>String(r.date||'').slice(0,7)===month);
  const income=rows.reduce((s,r)=>s+incomeValue(r),0), expense=rows.reduce((s,r)=>s+expenseValue(r),0);
  const plans=visibleBudgetPlans(month); const planned=plans.reduce((s,p)=>s+Number(p.limit||0),0);
  const regular=typeof regularOccurrences==='function'?regularOccurrences(new Date(month+'-01'),new Date(month+'-28')).reduce((s,x)=>s+Number(x.amount||0),0):0;
  const reserve=Number(state.forecastSettings.reserve||0); const forecast=income-expense-regular-reserve;
  if(byId('planningIncome')) byId('planningIncome').textContent=moneyText(income);
  if(byId('planningExpense')) byId('planningExpense').textContent=moneyText(expense);
  if(byId('planningAvailable')) byId('planningAvailable').textContent=moneyText(forecast);
  if(byId('planningAvailable')) byId('planningAvailable').className=forecast<0?'bad':'good';
  if(byId('planningMeta')) byId('planningMeta').textContent=`Лимиты: ${moneyText(planned)} · ожидаемые платежи: ${moneyText(regular)} · резерв: ${moneyText(reserve)}`;
  const list=byId('budgetPlanList');
  if(list){ list.innerHTML=plans.length?plans.map(p=>{
    const ownerId=p.memberId||'family'; const spent=rows.filter(r=>ownerId==='family'||r.memberId===ownerId).reduce((sum,r)=>sum+((r.category||'Без категории')===p.category?expenseValue(r):0),0);
    const pct=p.limit?Math.min(999,Math.round(spent/p.limit*100)):0; const ownerLabel=` · ${escapeHtml(ownerName(ownerId))}`;
    return `<article class="budget-plan-card" data-budget-id="${escapeHtml(p.id)}"><div><strong>${escapeHtml(p.category)}</strong><small>${moneyText(spent)} из ${moneyText(p.limit)}${ownerLabel}</small></div><div class="budget-progress"><i style="width:${Math.min(100,pct)}%"></i></div><span class="${pct>100?'bad':pct>80?'warn':'good'}">${pct}%</span><button data-budget-open="${escapeHtml(p.category)}" data-budget-member="${escapeHtml(ownerId)}" type="button">Операции</button><button data-budget-delete="${escapeHtml(p.id)}" type="button">×</button></article>`;
  }).join(''):'<article class="empty-state"><strong>Лимиты не заданы</strong><p>Добавьте бюджет по категории на выбранный месяц.</p></article>'; }
  const visibleGoals=visibleSavingsGoals(); const goals=byId('savingsGoalList');
  if(goals){ goals.innerHTML=visibleGoals.length?visibleGoals.map(g=>{
    const current=Number(g.current||0), target=Number(g.target||0), pct=target?Math.min(100,Math.round(current/target*100)):0; const owner=ownerName(g.memberId||'family-tatiana');
    return `<article class="goal-card"><div><strong>${escapeHtml(g.name)}</strong><small>${moneyText(current)} из ${moneyText(target)} · ${escapeHtml(owner)}${g.deadline?` · до ${escapeHtml(g.deadline)}`:''}</small></div><div class="budget-progress"><i style="width:${pct}%"></i></div><span>${pct}%</span><button data-goal-add="${escapeHtml(g.id)}" type="button">Пополнить</button><button data-goal-delete="${escapeHtml(g.id)}" type="button">×</button></article>`;
  }).join(''):'<article class="empty-state"><strong>Целей пока нет</strong><p>Создайте цель для накоплений.</p></article>'; }
  const reservePanel=byId('forecastReserve')?.closest('.forecast-settings'); if(reservePanel) reservePanel.hidden=!isPlanningAdmin();
}
byId('planningMonth')?.addEventListener('change',e=>{localStorage.setItem(planningMonthKey,e.target.value);renderPlanning();});
function populateBudgetPlanSelectors(){
  const category=byId('budgetPlanCategory'); if(category){ const names=categoryNamesByType('expense'); category.innerHTML='<option value="">Выберите категорию</option>'+names.map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join(''); }
  const member=byId('budgetPlanMember'); const current=planningMember();
  if(member){
    if(current?.role==='admin'){ member.innerHTML='<option value="family">Вся семья</option>'+state.familyMembers.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}${item.role==='child'?' — ребёнок':''}</option>`).join(''); member.disabled=false; }
    else { member.innerHTML=`<option value="${escapeHtml(current?.id||'')}">${escapeHtml(current?.name||'Мой профиль')}</option>`; member.disabled=true; }
  }
}
function populateSavingsGoalOwner(){
  const owner=byId('savingsGoalMember'); const current=planningMember(); if(!owner)return;
  if(current?.role==='admin'){ owner.innerHTML=state.familyMembers.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}${item.role==='child'?' — ребёнок':''}</option>`).join(''); owner.disabled=false; owner.value=current.id; }
  else { owner.innerHTML=`<option value="${escapeHtml(current?.id||'')}">${escapeHtml(current?.name||'Мой профиль')}</option>`; owner.disabled=true; }
}
byId('addBudgetPlanBtn')?.addEventListener('click',()=>{populateBudgetPlanSelectors();byId('budgetPlanDialog')?.showModal();});
byId('budgetPlanForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);const current=planningMember();const category=String(f.get('category')||'').trim();if(!category)return;const memberId=current?.role==='admin'?String(f.get('memberId')||'family'):current?.id;state.budgetPlans.push({id:`budget-${Date.now()}`,month:planningMonth(),category,memberId,limit:Number(f.get('limit')||0),rollover:Boolean(f.get('rollover'))});saveState();e.target.reset();byId('budgetPlanDialog')?.close();renderPlanning();});
byId('addSavingsGoalBtn')?.addEventListener('click',()=>{populateSavingsGoalOwner();byId('savingsGoalDialog')?.showModal();});
byId('savingsGoalForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);const current=planningMember();const memberId=current?.role==='admin'?String(f.get('memberId')||current.id):current?.id;state.savingsGoals.push({id:`goal-${Date.now()}`,name:String(f.get('name')||'Цель'),target:Number(f.get('target')||0),current:Number(f.get('current')||0),deadline:String(f.get('deadline')||''),account:String(f.get('account')||''),memberId});saveState();e.target.reset();byId('savingsGoalDialog')?.close();renderPlanning();});
byId('forecastReserve')?.addEventListener('change',e=>{if(!isPlanningAdmin())return;state.forecastSettings.reserve=Number(e.target.value||0);saveState();renderPlanning();});
document.addEventListener('click',e=>{
  const current=planningMember();
  const b=e.target.closest('[data-budget-delete]'); if(b){const item=state.budgetPlans.find(x=>x.id===b.dataset.budgetDelete);if(item&&(current?.role==='admin'||item.memberId===current?.id)){state.budgetPlans=state.budgetPlans.filter(x=>x.id!==b.dataset.budgetDelete);saveState();renderPlanning();}}
  const g=e.target.closest('[data-goal-delete]'); if(g){const item=state.savingsGoals.find(x=>x.id===g.dataset.goalDelete);if(item&&(current?.role==='admin'||item.memberId===current?.id)){state.savingsGoals=state.savingsGoals.filter(x=>x.id!==g.dataset.goalDelete);saveState();renderPlanning();}}
  const a=e.target.closest('[data-goal-add]'); if(a){const goal=state.savingsGoals.find(x=>x.id===a.dataset.goalAdd);if(goal&&(current?.role==='admin'||goal.memberId===current?.id)){const v=Number(prompt('Сумма пополнения', '0')||0);if(v){goal.current=Number(goal.current||0)+v;saveState();renderPlanning();}}}
  const o=e.target.closest('[data-budget-open]');if(o&&typeof openDrilldown==='function')openDrilldown('category',o.dataset.budgetOpen);
});
renderPlanning();

// PACKAGE 8 — reconciliation and smart import rules
function normalizeRuleText(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ');}
function reconciliationCandidates(){
 const rows=state.rows.filter(r=>!state.reconciliationReviewed[r.id]); const out=[];
 rows.forEach(r=>{if(!r.category||/без категор/i.test(r.category))out.push({kind:'uncategorized',row:r,label:'Без категории'});});
 const seen=new Map(); rows.forEach(r=>{const key=[String(r.date||'').slice(0,10),Math.round(Math.abs(Number(r.amount)||0)*100),normalizeRuleText(r.description||r.payee)].join('|');if(seen.has(key))out.push({kind:'duplicate',row:r,other:seen.get(key),label:'Возможный дубль'});else seen.set(key,r);});
 rows.forEach(r=>{if(/возврат|refund|refunds/i.test(`${r.description||''} ${r.payee||''}`))out.push({kind:'refund',row:r,label:'Возможный возврат'});});
 return out;
}
function renderReconciliationCenter(){
 const box=byId('reconciliationList'); if(!box)return; const items=reconciliationCandidates();
 byId('reconciliationCount').textContent=String(items.length);
 box.innerHTML=items.length?items.slice(0,100).map(x=>`<article class="reconcile-row"><span class="tag">${escapeHtml(x.label)}</span><div><strong>${escapeHtml(x.row.description||x.row.payee||'Операция')}</strong><small>${escapeHtml(String(x.row.date||''))} · ${moneyText(Math.abs(Number(x.row.amount)||0))} · ${escapeHtml(x.row.account||'Без счёта')}</small></div><button data-reconcile-open="${escapeHtml(x.row.id)}" type="button">Открыть</button><button data-reconcile-reviewed="${escapeHtml(x.row.id)}" type="button">Проверено</button></article>`).join(''):'<article class="empty-state"><strong>Всё сверено</strong><p>Неразобранных операций и вероятных дублей нет.</p></article>';
 const rules=byId('importRulesList'); if(rules)rules.innerHTML=state.importRules.length?state.importRules.map(r=>`<article class="rule-row"><div><strong>${escapeHtml(r.contains)}</strong><small>${escapeHtml(r.category||'Категория не меняется')} · ${escapeHtml(r.account||'Счёт не меняется')}</small></div><span>${r.applied||0} применений</span><button data-rule-run="${escapeHtml(r.id)}" type="button">Применить</button><button data-rule-delete="${escapeHtml(r.id)}" type="button">×</button></article>`).join(''):'<article class="empty-state"><strong>Правил нет</strong><p>Создайте правило для автоматической категории или счёта.</p></article>';
}
function applyImportRule(rule){let count=0;const needle=normalizeRuleText(rule.contains);state.rows.forEach(row=>{const hay=normalizeRuleText(`${row.payee||''} ${row.description||''} ${row.merchant||''}`);if(needle&&hay.includes(needle)){if(rule.category)row.category=rule.category;if(rule.account)row.account=rule.account;if(rule.project)row.project=rule.project;count++;}});rule.applied=Number(rule.applied||0)+count;rule.lastAppliedAt=new Date().toISOString();saveState();render();renderReconciliationCenter();return count;}
byId('addImportRuleBtn')?.addEventListener('click',()=>byId('importRuleDialog')?.showModal());
byId('importRuleForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);const rule={id:`rule-${Date.now()}`,contains:String(f.get('contains')||''),category:String(f.get('category')||''),account:String(f.get('account')||''),project:String(f.get('project')||''),applied:0};state.importRules.push(rule);saveState();e.target.reset();byId('importRuleDialog')?.close();applyImportRule(rule);});
byId('applyAllImportRulesBtn')?.addEventListener('click',()=>{let total=0;state.importRules.forEach(r=>total+=applyImportRule(r));alert(`Обновлено операций: ${total}`);});
document.addEventListener('click',e=>{const rr=e.target.closest('[data-rule-run]');if(rr){const r=state.importRules.find(x=>x.id===rr.dataset.ruleRun);if(r)alert(`Обновлено операций: ${applyImportRule(r)}`);}const rd=e.target.closest('[data-rule-delete]');if(rd){state.importRules=state.importRules.filter(x=>x.id!==rd.dataset.ruleDelete);saveState();renderReconciliationCenter();}const rv=e.target.closest('[data-reconcile-reviewed]');if(rv){state.reconciliationReviewed[rv.dataset.reconcileReviewed]=new Date().toISOString();saveState();renderReconciliationCenter();}const ro=e.target.closest('[data-reconcile-open]');if(ro){const row=state.rows.find(x=>x.id===ro.dataset.reconcileOpen);if(row&&typeof openDrilldown==='function')openDrilldown('row',row.id);}});
renderReconciliationCenter();


// Package 9 — completion of loans, deposits and subscriptions
function pkg9DateAddMonths(dateText, count){return addMonthsSafe(dateText,count,new Date(`${dateText}T00:00:00`).getDate());}
function pkg9LoanSchedule(product){
  const rows=[]; let balance=loanRemaining(product); const monthlyRate=ratePerMonth(product); const originalCalc=calculateLoan({...product,principal:balance,openingBalance:balance});
  let payment=Number(product.monthlyPaymentOverride)||originalCalc.monthlyPayment; const actual=[...loanActualPayments(product)].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const start=product.startDate||dateLocal(new Date()); const max=Math.max(1,Number(product.termMonths)||1); let totalInterest=0;
  for(let i=1;i<=max && balance>0.01;i++){
    const date=addMonthsSafe(start,i,product.paymentDay); const interest=product.rateMode==='period'?0:balance*monthlyRate;
    let principal=Math.max(0,Math.min(balance,payment-interest));
    const periodActual=actual.filter(x=>(x.date||'').slice(0,7)===date.slice(0,7));
    const earlyPrincipal=periodActual.filter(x=>x.paymentKind==='early').reduce((s,x)=>s+Number(x.principalPart||x.amount||0),0);
    principal=Math.min(balance,principal+earlyPrincipal); const amount=Math.min(balance+interest,payment+earlyPrincipal); balance=Math.max(0,balance-principal); totalInterest+=interest;
    rows.push({index:i,date,amount,principal,interest,balance,hasActual:periodActual.length>0});
    if(earlyPrincipal>0 && product.earlyRepaymentStrategy==='reducePayment' && balance>0){const left=Math.max(1,max-i); payment=monthlyRate?balance*monthlyRate*Math.pow(1+monthlyRate,left)/(Math.pow(1+monthlyRate,left)-1):balance/left;}
  }
  return {rows,totalInterest,finishDate:rows.at(-1)?.date||start,payment};
}
function pkg9DepositMovements(product){return Array.isArray(product.depositMovements)?product.depositMovements:[];}
function pkg9DepositBalance(product){return Math.max(0,Number(product.principal||0)+pkg9DepositMovements(product).reduce((s,x)=>s+(x.movementType==='withdrawal'?-1:1)*Number(x.amount||0),0));}
function pkg9DepositProjection(product){const balance=pkg9DepositBalance(product);const calc=calculateDeposit({...product,principal:balance});const tax=Math.max(0,calc.interest*(Number(product.depositTaxRate||0)/100));return {...calc,balance,tax,netMaturity:calc.maturity-tax};}
function pkg9FrequencyMonths(f){return f==='yearly'?12:f==='halfyear'?6:f==='quarterly'?3:1;}
function pkg9SubscriptionMonthly(t){return Number(t.amount||0)/pkg9FrequencyMonths(t.frequency||'monthly');}
function pkg9Subscriptions(){return state.regularPayments.filter(x=>x.paymentType==='subscription');}
function pkg9RenderSubscriptions(){
  const target=byId('subscriptionCards'); if(!target)return; const subs=pkg9Subscriptions(); const active=subs.filter(x=>(x.subscriptionStatus||'active')==='active'); const today=dateLocal(new Date()); const soon=addMonthsSafe(today,1,new Date().getDate());
  byId('subscriptionMonthlyTotal').textContent=money(active.reduce((s,x)=>s+pkg9SubscriptionMonthly(x),0)); byId('subscriptionAnnualTotal').textContent=money(active.reduce((s,x)=>s+pkg9SubscriptionMonthly(x)*12,0)); byId('subscriptionActiveCount').textContent=`${active.length} активных`;
  const upcoming=active.filter(x=>x.startDate&&x.startDate>=today&&x.startDate<=soon); byId('subscriptionUpcomingTotal').textContent=money(upcoming.reduce((s,x)=>s+Number(x.amount||0),0)); byId('subscriptionUpcomingCount').textContent=`${upcoming.length} подписок`;
  target.innerHTML=subs.length?subs.map(t=>{const status=t.subscriptionStatus||'active';const trial=t.trialEndDate&&t.trialEndDate>=today?`Пробный период до ${formatTransactionDate(t.trialEndDate)}`:'';const history=Array.isArray(t.priceHistory)?t.priceHistory:[];const old=history.at(-1);return `<article class="finance-product-card subscription-card"><div class="finance-product-card-head"><div><span class="finance-product-type ${status==='canceled'?'deposit':'loan'}">${status==='active'?'Активна':status==='paused'?'Пауза':'Отменена'}</span><h3>${escapeHtml(t.name)}</h3><p>${escapeHtml(t.payee||'Сервис')} • ${t.startDate?`следующее ${formatTransactionDate(t.startDate)}`:'дата не задана'}</p></div><button class="icon-button edit-subscription" data-subscription-id="${escapeHtml(t.id)}">✏️</button></div><div class="finance-product-values"><div><span>Тариф</span><strong>${money(t.amount)}</strong></div><div><span>За год</span><strong>${money(pkg9SubscriptionMonthly(t)*12)}</strong></div>${trial?`<div><span>Пробный период</span><strong>${escapeHtml(trial)}</strong></div>`:''}${old?`<div><span>Предыдущая цена</span><strong>${money(old.amount)}</strong></div>`:''}</div></article>`}).join(''):`<article class="empty-state"><strong>Подписок нет</strong><p>Добавьте сервис, чтобы контролировать списания и пробные периоды.</p></article>`;
}
const pkg9BaseRenderFinanceProducts=renderFinanceProducts;
renderFinanceProducts=function(){pkg9BaseRenderFinanceProducts();pkg9RenderSubscriptions();document.querySelectorAll('.finance-product-card').forEach(card=>{const del=card.querySelector('.delete-finance-product');if(del&&!card.querySelector('.open-finance-product-details')){const b=document.createElement('button');b.className='ghost open-finance-product-details';b.dataset.productId=del.dataset.productId;b.textContent='Подробнее';card.querySelector('.finance-product-card-head').appendChild(b);}});};
function pkg9OpenProductDetails(product){
  const dlg=byId('financeProductDetailsDialog');byId('financeProductDetailsTitle').textContent=product.name;byId('financeProductDetailsSubtitle').textContent=product.type==='loan'?'График, план и фактические платежи':'Движения, проценты и прогноз';
  if(product.type==='loan'){const schedule=pkg9LoanSchedule(product);const actual=loanActualPayments(product);byId('financeProductDetailsBody').innerHTML=`<div class="finance-detail-actions"><button class="primary add-loan-payment" data-product-id="${escapeHtml(product.id)}">+ Платёж</button><button class="ghost edit-finance-product" data-product-id="${escapeHtml(product.id)}">Изменить условия</button></div><div class="finance-metrics"><article class="metric-card"><span>Остаток</span><strong>${money(loanRemaining(product))}</strong><small>основной долг</small></article><article class="metric-card"><span>Прогноз закрытия</span><strong>${formatTransactionDate(schedule.finishDate)}</strong><small>${product.earlyRepaymentStrategy==='reducePayment'?'уменьшается платёж':'уменьшается срок'}</small></article><article class="metric-card"><span>Страховка в год</span><strong>${money(product.loanInsuranceAnnual||0)}</strong></article></div><div class="table-scroll"><table class="finance-schedule-table"><thead><tr><th>№</th><th>Дата</th><th>Платёж</th><th>Проценты</th><th>Основной долг</th><th>Остаток</th></tr></thead><tbody>${schedule.rows.map(r=>`<tr class="${r.hasActual?'is-paid':''}"><td>${r.index}</td><td>${formatTransactionDate(r.date)}</td><td>${money(r.amount)}</td><td>${money(r.interest)}</td><td>${money(r.principal)}</td><td>${money(r.balance)}</td></tr>`).join('')}</tbody></table></div><h3>Фактические платежи</h3>${actual.length?actual.map(x=>`<article class="planned-payment-row"><div><strong>${formatTransactionDate(x.date)} • ${x.paymentKind==='early'?'Досрочный':'Плановый'}</strong><small>Основной долг ${money(x.principalPart||0)} • проценты ${money(x.interestPart||0)}</small></div><b>${money(x.amount)}</b></article>`).join(''):'<p class="muted">Фактических платежей пока нет.</p>'}`;
  }else{const p=pkg9DepositProjection(product),mov=pkg9DepositMovements(product);byId('financeProductDetailsBody').innerHTML=`<div class="finance-detail-actions"><button class="primary add-deposit-movement" data-product-id="${escapeHtml(product.id)}">+ Операция</button><button class="ghost edit-finance-product" data-product-id="${escapeHtml(product.id)}">Изменить условия</button></div><div class="finance-metrics"><article class="metric-card"><span>Текущая сумма</span><strong>${money(p.balance)}</strong></article><article class="metric-card"><span>Прогноз к окончанию</span><strong>${money(p.netMaturity)}</strong><small>после указанного налога</small></article><article class="metric-card"><span>Доход</span><strong>${money(p.interest)}</strong><small>налог ${money(p.tax)}</small></article></div><p class="muted">Автопролонгация: ${product.autoProlongation?'включена':'выключена'}.</p><h3>История движений</h3>${mov.length?mov.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(x=>`<article class="planned-payment-row"><div><strong>${formatTransactionDate(x.date)} • ${x.movementType==='contribution'?'Пополнение':x.movementType==='withdrawal'?'Снятие':'Проценты'}</strong><small>${escapeHtml(x.comment||'')}</small></div><b>${x.movementType==='withdrawal'?'-':'+'}${money(x.amount)}</b></article>`).join(''):'<p class="muted">Движений пока нет.</p>'}`;}dlg.showModal();
}
function pkg9OpenSubscription(t=null){const f=byId('subscriptionForm');f.reset();f.elements.subscriptionId.value=t?.id||'';f.elements.startDate.value=t?.startDate||dateLocal(new Date());f.elements.remindDays.value=t?.remindDays??3;byId('subscriptionCategorySelect').innerHTML=categoryNamesByType('expense').map(x=>`<option>${escapeHtml(x)}</option>`).join('');byId('subscriptionAccountSelect').innerHTML='<option value="">Не указан</option>'+state.accounts.map(x=>`<option>${escapeHtml(x.name)}</option>`).join('');if(t)Object.entries(t).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=typeof v==='boolean'?String(v):v??'';});byId('deleteSubscriptionBtn').hidden=!t;byId('subscriptionDialog').showModal();}
document.addEventListener('click',e=>{const addSub=e.target.closest('#addSubscriptionBtn');if(addSub){e.preventDefault();pkg9OpenSubscription();return;}const d=e.target.closest('.open-finance-product-details');if(d){const p=state.financialProducts.find(x=>x.id===d.dataset.productId);if(p)pkg9OpenProductDetails(p);return;}const dm=e.target.closest('.add-deposit-movement');if(dm){const f=byId('depositMovementForm');f.reset();f.elements.productId.value=dm.dataset.productId;f.elements.date.value=dateLocal(new Date());const candidates=state.rows.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100);byId('depositTransactionSelect').innerHTML='<option value="">Не связывать</option>'+candidates.map(r=>`<option value="${escapeHtml(r.id)}">${formatTransactionDate(r.date)} • ${escapeHtml(r.description)} • ${money(Math.abs(r.amount))}</option>`).join('');byId('depositMovementDialog').showModal();return;}const es=e.target.closest('.edit-subscription');if(es){pkg9OpenSubscription(state.regularPayments.find(x=>x.id===es.dataset.subscriptionId));return;}});
// The add-subscription button is handled by delegated click above so it keeps working after any rerender.
byId('depositMovementForm')?.addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());const p=state.financialProducts.find(x=>x.id===d.productId);if(!p)return;p.depositMovements=[...pkg9DepositMovements(p),{id:`deposit-move-${Date.now()}`,date:d.date,movementType:d.movementType,amount:Number(d.amount)||0,transactionId:d.transactionId||'',comment:d.comment||''}];saveState();byId('depositMovementDialog').close();render();pkg9OpenProductDetails(p);});
byId('subscriptionForm')?.addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());const existing=state.regularPayments.find(x=>x.id===d.subscriptionId);const history=Array.isArray(existing?.priceHistory)?[...existing.priceHistory]:[];if(existing&&Number(existing.amount)!==Number(d.amount))history.push({date:dateLocal(new Date()),amount:Number(existing.amount)||0});const obj={...(existing||{}),id:existing?.id||`regular-${Date.now()}`,name:d.name,paymentType:'subscription',amount:Number(d.amount)||0,frequency:d.frequency,startDate:d.startDate,endDate:'',category:d.category||'Подписки',account:d.account||'',project:'',payee:d.payee||'',remindDays:Number(d.remindDays)||0,autoPlan:true,trialEndDate:d.trialEndDate||'',subscriptionStatus:d.subscriptionStatus||'active',cancellationDate:d.cancellationDate||'',comment:d.comment||'',priceHistory:history};const i=state.regularPayments.findIndex(x=>x.id===obj.id);if(i>=0)state.regularPayments[i]=obj;else state.regularPayments.push(obj);saveState();byId('subscriptionDialog').close();render();setView('finance-products');});
byId('deleteSubscriptionBtn')?.addEventListener('click',()=>{const id=byId('subscriptionForm').elements.subscriptionId.value;if(id&&confirm('Удалить подписку?')){state.regularPayments=state.regularPayments.filter(x=>x.id!==id);saveState();byId('subscriptionDialog').close();render();}});


// ===== Пакет 10: имущество, документы и гарантии =====
let activeAssetId = null;
function assetMember(){ return typeof activeFamilyMember === 'function' ? activeFamilyMember() : null; }
function assetVisibleItems(){ const m=assetMember(); return state.assets.filter(a=>!m||m.role==='admin'||a.ownerMemberId===m.id); }
function assetTypeLabel(type){ return ({realEstate:'Недвижимость',vehicle:'Автомобиль',appliance:'Техника',valuable:'Ценная покупка',other:'Прочее'})[type]||'Имущество'; }
function assetOwnerName(id){ return state.familyMembers.find(x=>x.id===id)?.name||'Татьяна'; }
function assetDaysUntil(date){ if(!date)return null; const a=new Date(`${date}T00:00:00`),b=new Date();b.setHours(0,0,0,0);return Math.round((a-b)/86400000); }
function assetVehicleWarrantyEndDate(asset){
  const years=Number(asset?.vehicleWarrantyYears||0);
  if(asset?.type!=='vehicle'||!years||!asset.purchaseDate)return '';
  const date=new Date(`${asset.purchaseDate}T12:00:00`);
  if(Number.isNaN(date.getTime()))return '';
  const whole=Math.floor(years), months=Math.round((years-whole)*12);
  date.setFullYear(date.getFullYear()+whole);
  date.setMonth(date.getMonth()+months);
  return date.toISOString().slice(0,10);
}
function assetVehicleWarrantyStatus(asset){
  if(asset?.type!=='vehicle')return '';
  const years=Number(asset.vehicleWarrantyYears||0), limit=Number(asset.vehicleWarrantyKm||0), current=Number(asset.currentMileage||0);
  const parts=[];
  if(years)parts.push(`${years} ${years===1?'год':'года/лет'}`);
  if(limit)parts.push(`${Math.round(limit).toLocaleString('ru-RU')} км`);
  if(!parts.length)return '';
  const mileageText=limit?` • пробег ${Math.round(current).toLocaleString('ru-RU')} из ${Math.round(limit).toLocaleString('ru-RU')} км`:'';
  return `${parts.join(' или ')}${mileageText}`;
}
function assetDeadlineItems(asset){ return [
  ['Гарантия',asset.type==='vehicle'?assetVehicleWarrantyEndDate(asset):asset.warrantyEndDate],['Обслуживание',asset.serviceDate],['Налог',asset.taxDate],
  ...(Array.isArray(asset.documents)?asset.documents.filter(d=>d.expiryDate).map(d=>[`Документ: ${d.name}`,d.expiryDate]):[])
].filter(x=>x[1]).map(([label,date])=>({label,date,days:assetDaysUntil(date)})); }
function assetUpcomingDeadlines(days=30){ return assetVisibleItems().flatMap(a=>assetDeadlineItems(a).filter(x=>x.days!==null&&x.days>=0&&x.days<=days).map(x=>({...x,asset:a}))).sort((a,b)=>a.days-b.days); }
function populateAssetSelectors(){
  const m=assetMember(), owner=byId('assetOwnerSelect'), filter=byId('assetOwnerFilter');
  const members=m?.role==='admin'?state.familyMembers.filter(x=>x.active!==false):state.familyMembers.filter(x=>x.id===m?.id);
  if(owner) owner.innerHTML=members.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('');
  if(filter){const current=filter.value;filter.innerHTML='<option value="all">Все владельцы</option>'+members.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('');filter.value=[...filter.options].some(o=>o.value===current)?current:'all';}
  const ins=byId('assetInsuranceSelect'); if(ins) ins.innerHTML='<option value="">Не связана</option>'+state.insurancePolicies.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.objectName||p.name||'Полис')}</option>`).join('');
}
function renderAssetAlerts(){ const panel=byId('assetAlertsPanel'),target=byId('assetAlerts'),count=byId('assetAlertCount');if(!panel||!target)return;const items=assetUpcomingDeadlines(30);if(count)count.textContent=items.length;panel.hidden=!items.length;target.innerHTML=items.map(x=>`<article class="alert-row"><div><strong>${escapeHtml(x.asset.name)}: ${escapeHtml(x.label)}</strong><small>${formatTransactionDate(x.date)} • ${x.days===0?'сегодня':`через ${x.days} дн.`}</small></div><button class="ghost open-asset-details" data-asset-id="${escapeHtml(x.asset.id)}">Открыть</button></article>`).join(''); }
function renderAssets(){
  const target=byId('assetCards'); if(!target)return; populateAssetSelectors(); const m=assetMember(); const add=byId('addAssetBtn');if(add)add.hidden=Boolean(m&&m.role!=='admin'&&!m.canAddOperations);
  const type=byId('assetTypeFilter')?.value||'all',owner=byId('assetOwnerFilter')?.value||'all',q=(byId('assetSearch')?.value||'').trim().toLowerCase();
  const list=assetVisibleItems().filter(a=>(type==='all'||a.type===type)&&(owner==='all'||a.ownerMemberId===owner)&&(!q||[a.name,a.location,a.serialNumber,assetOwnerName(a.ownerMemberId)].join(' ').toLowerCase().includes(q)));
  const all=assetVisibleItems(), upcoming=assetUpcomingDeadlines(30);
  byId('assetTotalValue').textContent=money(all.reduce((s,a)=>s+Number(a.currentValue||a.purchasePrice||0),0));byId('assetCount').textContent=all.length;byId('assetWarrantyCount').textContent=all.filter(a=>assetDaysUntil(a.warrantyEndDate)>=0).length;byId('assetDeadlineCount').textContent=upcoming.length;
  target.innerHTML=list.length?list.map(a=>{const deadlines=assetDeadlineItems(a).filter(x=>x.days!==null&&x.days>=0).sort((x,y)=>x.days-y.days).slice(0,3);return `<article class="asset-card"><div class="asset-card-head"><div><span class="asset-kind">${assetTypeLabel(a.type)}</span><h3>${escapeHtml(a.name)}</h3><p>${escapeHtml(assetOwnerName(a.ownerMemberId))}${a.location?` • ${escapeHtml(a.location)}`:''}</p></div><button class="icon-button edit-asset" data-asset-id="${escapeHtml(a.id)}">✏️</button></div><div class="asset-values"><div><span>Текущая стоимость</span><strong>${money(a.currentValue||a.purchasePrice)}</strong></div><div><span>Документы</span><strong>${Array.isArray(a.documents)?a.documents.length:0}</strong></div></div><div class="asset-deadlines">${deadlines.map(d=>`<span class="asset-deadline ${d.days<=7?'due':''}">${escapeHtml(d.label)}: ${d.days===0?'сегодня':`${d.days} дн.`}</span>`).join('')}</div><div class="asset-actions"><button class="ghost open-asset-details" data-asset-id="${escapeHtml(a.id)}">Подробнее</button><button class="ghost add-asset-document" data-asset-id="${escapeHtml(a.id)}">+ Документ</button></div></article>`}).join(''):'<article class="empty-state"><strong>Имущество не добавлено</strong><p>Создайте карточку недвижимости, автомобиля, техники или другой ценной покупки.</p></article>';
  renderAssetAlerts();
}
function openAssetDialog(asset=null){ const f=byId('assetForm');if(!f)return;f.reset();populateAssetSelectors();activeAssetId=asset?.id||null;byId('assetDialogTitle').textContent=asset?'Изменить имущество':'Добавить имущество';byId('deleteAssetBtn').hidden=!asset;if(asset)Object.entries(asset).forEach(([k,v])=>{if(f.elements[k]&&k!=='documents')f.elements[k].value=v??'';});else{f.elements.ownerMemberId.value=assetMember()?.id||'family-tatiana';}byId('assetDialog').showModal(); }
function openAssetDetails(asset){ activeAssetId=asset.id;const docs=Array.isArray(asset.documents)?asset.documents:[],policy=state.insurancePolicies.find(p=>p.id===asset.insurancePolicyId);byId('assetDetailsTitle').textContent=asset.name;byId('assetDetailsSubtitle').textContent=`${assetTypeLabel(asset.type)} • ${assetOwnerName(asset.ownerMemberId)}`;byId('assetDetailsBody').innerHTML=`<div class="asset-detail-grid"><div><span>Покупка</span><strong>${asset.purchaseDate?formatTransactionDate(asset.purchaseDate):'—'}</strong><small>${money(asset.purchasePrice)}</small></div><div><span>Текущая стоимость</span><strong>${money(asset.currentValue||asset.purchasePrice)}</strong></div><div><span>Серийный номер / VIN</span><strong>${escapeHtml(asset.serialNumber||'—')}</strong></div><div><span>Страховка</span><strong>${escapeHtml(policy?.objectName||policy?.name||'Не связана')}</strong></div></div><h3>Сроки</h3><div class="asset-deadlines">${assetDeadlineItems(asset).map(d=>`<span class="asset-deadline ${d.days!==null&&d.days<=7&&d.days>=0?'due':''}">${escapeHtml(d.label)} • ${formatTransactionDate(d.date)}</span>`).join('')||'<span class="muted">Сроки не заданы</span>'}</div>${asset.notes?`<p>${escapeHtml(asset.notes)}</p>`:''}<div class="panel-head"><div><h3>Документы</h3><p>Чеки, гарантии, договоры и обслуживание</p></div><button class="primary add-asset-document" data-asset-id="${escapeHtml(asset.id)}">+ Документ</button></div><div class="asset-doc-list">${docs.length?docs.map(d=>`<article class="asset-doc-row"><div><strong>${escapeHtml(d.name)}</strong><small>${escapeHtml(d.fileName||'Без файла')}${d.expiryDate?` • до ${formatTransactionDate(d.expiryDate)}`:''}</small></div><div class="asset-doc-actions">${d.dataUrl?`<button class="ghost open-asset-document" data-asset-id="${escapeHtml(asset.id)}" data-document-id="${escapeHtml(d.id)}">Открыть</button>`:''}<button class="icon-button delete-asset-document" data-asset-id="${escapeHtml(asset.id)}" data-document-id="${escapeHtml(d.id)}">🗑</button></div></article>`).join(''):'<p class="muted">Документы ещё не добавлены.</p>'}</div>`;byId('assetDetailsDialog').showModal(); }
function fileAsDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}

['assetTypeFilter','assetOwnerFilter'].forEach(id=>byId(id)?.addEventListener('change',renderAssets));byId('assetSearch')?.addEventListener('input',renderAssets);
byId('assetForm')?.addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries()),old=state.assets.find(a=>a.id===d.assetId);const obj={...(old||{}),id:old?.id||`asset-${Date.now()}`,type:d.type,name:d.name,ownerMemberId:d.ownerMemberId||assetMember()?.id||'family-tatiana',purchaseDate:d.purchaseDate||'',purchasePrice:Number(d.purchasePrice)||0,currentValue:Number(d.currentValue)||0,location:d.location||'',serialNumber:d.serialNumber||'',warrantyEndDate:d.warrantyEndDate||'',serviceDate:d.serviceDate||'',taxDate:d.taxDate||'',insurancePolicyId:d.insurancePolicyId||'',notes:d.notes||'',documents:Array.isArray(old?.documents)?old.documents:[]};const i=state.assets.findIndex(a=>a.id===obj.id);if(i>=0)state.assets[i]=obj;else state.assets.push(obj);saveState();byId('assetDialog').close();render();setView('assets');});
byId('deleteAssetBtn')?.addEventListener('click',()=>{if(activeAssetId&&confirm('Удалить карточку имущества и вложенные документы?')){state.assets=state.assets.filter(a=>a.id!==activeAssetId);saveState();byId('assetDialog').close();render();}});
byId('editAssetFromDetailsBtn')?.addEventListener('click',()=>{const a=state.assets.find(x=>x.id===activeAssetId);byId('assetDetailsDialog').close();if(a)openAssetDialog(a);});
byId('assetDocumentForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f).entries()),a=state.assets.find(x=>x.id===d.assetId);if(!a)return;const file=f.elements.file.files[0];if(file&&file.size>4*1024*1024){alert('Файл больше 4 МБ. Уменьшите размер или сохраните ссылку в заметках.');return;}const dataUrl=file?await fileAsDataUrl(file):'';a.documents=[...(Array.isArray(a.documents)?a.documents:[]),{id:`asset-doc-${Date.now()}`,name:d.name,type:d.type,expiryDate:d.expiryDate||'',fileName:file?.name||'',mimeType:file?.type||'',dataUrl}];saveState();byId('assetDocumentDialog').close();render();openAssetDetails(a);});
document.addEventListener('click',e=>{const edit=e.target.closest('.edit-asset');if(edit){const a=state.assets.find(x=>x.id===edit.dataset.assetId);if(a)openAssetDialog(a);return;}const open=e.target.closest('.open-asset-details');if(open){const a=state.assets.find(x=>x.id===open.dataset.assetId);if(a)openAssetDetails(a);return;}const add=e.target.closest('.add-asset-document');if(add){const f=byId('assetDocumentForm');f.reset();f.elements.assetId.value=add.dataset.assetId;byId('assetDocumentDialog').showModal();return;}const del=e.target.closest('.delete-asset-document');if(del&&confirm('Удалить документ?')){const a=state.assets.find(x=>x.id===del.dataset.assetId);if(a){a.documents=(a.documents||[]).filter(d=>d.id!==del.dataset.documentId);saveState();render();openAssetDetails(a);}return;}const doc=e.target.closest('.open-asset-document');if(doc){const a=state.assets.find(x=>x.id===doc.dataset.assetId),d=a?.documents?.find(x=>x.id===doc.dataset.documentId);if(d?.dataUrl){const w=window.open();if(w)w.location.href=d.dataUrl;else{const link=document.createElement('a');link.href=d.dataUrl;link.download=d.fileName||d.name;link.click();}}}});

// Package 10.1 — utilities and loan links for real estate and vehicles
// Older databases may not yet contain the assets collection. Initialize it before
// any Package 10 code reads or iterates it, otherwise app.js stops loading and
// the Add asset button never receives its handler.
if (!Array.isArray(state.assets)) state.assets = [];
if (!Array.isArray(state.financialProducts)) state.financialProducts = [];
if (!Array.isArray(state.regularPayments)) state.regularPayments = [];
if (!Array.isArray(state.insurancePolicies)) state.insurancePolicies = [];
if (!Array.isArray(state.familyMembers)) state.familyMembers = [];
state.assets.forEach((asset) => {
  if (!Array.isArray(asset.utilityPaymentIds)) asset.utilityPaymentIds = [];
  if (asset.loanProductId == null) asset.loanProductId = '';
});

function isUtilityPaymentTemplate(item) {
  if (!item || typeof item !== 'object') return false;
  const type = String(item.paymentType || item.type || '').trim().toLowerCase();
  // К недвижимости можно привязать не только ЖКХ, но и домашние сервисы:
  // интернет, телевидение и любые подписки, которыми пользуются в этом доме.
  if (['utilities', 'utility', 'communal', 'communal-payment', 'housing', 'subscription', 'subscriptions'].includes(type)) return true;
  const text = [item.name, item.category, item.payee, item.project, item.description]
    .filter(Boolean).join(' ').toLowerCase();
  return /(коммун|жкх|квартплат|электр|водоснаб|водоотвед|газ|отоплен|теплоснаб|содержание жилья|капремонт|вывоз мусор|интернет|wi[- ]?fi|вай[- ]?фай|телевид|тв|онлайн[- ]?кинотеатр|кинопоиск|иви|okko|wink|start|premier|яндекс(?: плюс)?|подписк|стриминг)/i.test(text);
}

function utilityPaymentTemplates() {
  // Для привязки к дому показываем ВСЕ созданные регулярные платежи.
  // Раньше список проходил через распознавание типа/названия и из-за старых
  // значений paymentType часть уже созданных платежей ошибочно скрывалась.
  const rows = Array.isArray(state.regularPayments) ? state.regularPayments : [];
  const subscriptions = Array.isArray(state.subscriptions) ? state.subscriptions : [];
  const combined = [...rows, ...subscriptions];
  const seen = new Set();
  return combined.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const id = String(item.id || '').trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function assetLinkedUtilities(asset) {
  const ids = new Set(Array.isArray(asset?.utilityPaymentIds) ? asset.utilityPaymentIds : []);
  return utilityPaymentTemplates().filter((item) => ids.has(item.id));
}

function assetUtilityPaidSummary(asset) {
  const ids = new Set(assetLinkedUtilities(asset).map((item) => item.id));
  let total = 0;
  let count = 0;
  Object.entries(state.plannedPaymentStates || {}).forEach(([occurrenceId, paymentState]) => {
    const templateId = occurrenceId.split('@')[0];
    if (!ids.has(templateId) || !paymentState?.paidDate || occurrenceId.includes('@meter@')) return;
    total += Number(paymentState.paidAmount || 0);
    count += 1;
  });
  return { total, count };
}

function renderAssetUtilityChecks(asset = null) {
  const target = byId('assetUtilityPaymentChecks');
  if (!target) return;
  const selected = new Set(Array.isArray(asset?.utilityPaymentIds) ? asset.utilityPaymentIds : []);
  const utilities = utilityPaymentTemplates();
  target.innerHTML = utilities.length
    ? utilities.map((item) => `<label class="asset-link-check"><input type="checkbox" name="utilityPaymentIds" value="${escapeHtml(item.id)}" ${selected.has(item.id) ? 'checked' : ''}><span><strong>${escapeHtml(item.name)}</strong><small>${money(item.amount)} • ${escapeHtml(item.frequency || 'регулярно')}</small></span></label>`).join('')
    : '<p class="muted">Регулярные платежи пока не найдены. Создайте их в разделе «Календарь платежей» или в блоке «Подписки».</p>';
}

function updateAssetLinkFields() {
  const form = byId('assetForm');
  if (!form) return;
  const type = form.elements.type.value;
  const utilitySection = byId('assetUtilityLinkSection');
  const loanSection = byId('assetLoanLinkSection');
  const locationField = byId('assetDialogLocationField');
  const serialField = byId('assetDialogSerialField');
  const warrantyDateField = byId('assetDialogWarrantyDateField');
  const vehicleWarrantyFields = byId('assetDialogVehicleWarrantyFields');
  const serviceField = byId('assetDialogServiceField');
  if (utilitySection) utilitySection.hidden = type !== 'realEstate';
  if (loanSection) loanSection.hidden = !['realEstate', 'vehicle'].includes(type);
  if (locationField) locationField.hidden = ['vehicle','appliance'].includes(type);
  if (serialField) serialField.hidden = ['realEstate','appliance'].includes(type);
  if (warrantyDateField) warrantyDateField.hidden = ['realEstate','vehicle'].includes(type);
  if (vehicleWarrantyFields) vehicleWarrantyFields.hidden = type !== 'vehicle';
  if (serviceField) serviceField.hidden = type === 'realEstate';
  const hint = byId('assetLoanHint');
  if (hint) hint.textContent = type === 'vehicle'
    ? 'Можно привязать автокредит по этому автомобилю.'
    : 'Можно привязать ипотеку по этой квартире или дому.';
  if (type === 'realEstate') {
    form.elements.location.value = form.elements.location.value || '';
    form.elements.serialNumber.value = '';
    form.elements.warrantyEndDate.value = '';
    form.elements.serviceDate.value = '';
  }
  if (type === 'vehicle') {
    form.elements.location.value = '';
    form.elements.warrantyEndDate.value = '';
  }
  if (type === 'appliance') {
    form.elements.location.value = '';
    form.elements.serialNumber.value = '';
  }
  if (type !== 'vehicle') {
    if(form.elements.vehicleWarrantyYears) form.elements.vehicleWarrantyYears.value='';
    if(form.elements.vehicleWarrantyKm) form.elements.vehicleWarrantyKm.value='';
    if(form.elements.currentMileage) form.elements.currentMileage.value='';
  }
  if (type !== 'realEstate') {
    form.querySelectorAll('input[name="utilityPaymentIds"]').forEach((input) => { input.checked = false; });
  }
  if (!['realEstate', 'vehicle'].includes(type) && form.elements.loanProductId) {
    form.elements.loanProductId.value = '';
  }
}

const populateAssetSelectorsBase = populateAssetSelectors;
populateAssetSelectors = function populateAssetSelectorsWithLoans() {
  populateAssetSelectorsBase();
  const loanSelect = byId('assetLoanSelect');
  if (!loanSelect) return;
  loanSelect.innerHTML = '<option value="">Не связан</option>' + state.financialProducts
    .filter((item) => item.type === 'loan')
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name || 'Кредит')} • остаток ${money(typeof loanRemaining === 'function' ? loanRemaining(item) : (item.remainingBalance || item.principal || 0))}</option>`)
    .join('');
};

openAssetDialog = function openAssetDialogWithLinks(asset = null) {
  const form = byId('assetForm');
  if (!form) return;
  form.reset();
  populateAssetSelectors();
  activeAssetId = asset?.id || null;
  byId('assetDialogTitle').textContent = asset ? 'Изменить имущество' : 'Добавить имущество';
  byId('deleteAssetBtn').hidden = !asset;
  if (asset) {
    Object.entries(asset).forEach(([key, value]) => {
      if (form.elements[key] && !['documents', 'utilityPaymentIds'].includes(key)) form.elements[key].value = value ?? '';
    });
  } else {
    form.elements.ownerMemberId.value = assetMember()?.id || 'family-tatiana';
  }
  renderAssetUtilityChecks(asset);
  updateAssetLinkFields();
  const dialog = byId('assetDialog');
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
};

openAssetDetails = function openAssetDetailsWithLinks(asset) {
  activeAssetId = asset.id;
  const documents = Array.isArray(asset.documents) ? asset.documents : [];
  const policy = state.insurancePolicies.find((item) => item.id === asset.insurancePolicyId);
  const loan = state.financialProducts.find((item) => item.id === asset.loanProductId && item.type === 'loan');
  const utilities = assetLinkedUtilities(asset);
  const utilitySummary = assetUtilityPaidSummary(asset);
  byId('assetDetailsTitle').textContent = asset.name;
  byId('assetDetailsSubtitle').textContent = `${assetTypeLabel(asset.type)} • ${assetOwnerName(asset.ownerMemberId)}`;
  byId('assetDetailsBody').innerHTML = `
    <div class="asset-detail-grid">
      <div><span>Покупка</span><strong>${asset.purchaseDate ? formatTransactionDate(asset.purchaseDate) : '—'}</strong><small>${money(asset.purchasePrice)}</small></div>
      <div><span>Текущая стоимость</span><strong>${money(asset.currentValue || asset.purchasePrice)}</strong></div>
      ${!['realEstate','appliance'].includes(asset.type)?`<div><span>${asset.type==='vehicle'?'VIN':'Серийный номер'}</span><strong>${escapeHtml(asset.serialNumber || '—')}</strong></div>`:''}
      ${asset.type==='vehicle'?`<div><span>Гарантия автомобиля</span><strong>${escapeHtml(assetVehicleWarrantyStatus(asset)||'Не указана')}</strong></div>`:''}
      <div><span>Страховка</span><strong>${escapeHtml(policy?.objectName || policy?.name || 'Не связана')}</strong></div>
    </div>
    ${asset.type === 'realEstate' ? `<section class="asset-linked-block">
      <div class="panel-head"><div><h3>Расходы и сервисы этой недвижимости</h3><p>${utilities.length ? `${utilities.length} платежей • оплачено ${money(utilitySummary.total)} (${utilitySummary.count} операций)` : 'Платежи и домашние сервисы не привязаны'}</p></div><button class="ghost open-asset-utilities" type="button">Открыть календарь</button></div>
      ${utilities.map((item) => `<div class="asset-linked-row"><div><strong>${escapeHtml(item.name)}</strong><small>${money(item.amount)} • ${escapeHtml(item.frequency || 'регулярно')}</small></div></div>`).join('')}
    </section>` : ''}
    ${['realEstate', 'vehicle'].includes(asset.type) ? `<section class="asset-linked-block"><div class="panel-head"><div><h3>${asset.type === 'realEstate' ? 'Ипотека' : 'Автокредит'}</h3><p>${loan ? `${escapeHtml(loan.name)} • остаток ${money(typeof loanRemaining === 'function' ? loanRemaining(loan) : (loan.remainingBalance || loan.principal || 0))}` : 'Кредит не привязан'}</p></div>${loan ? `<button class="ghost open-linked-loan" type="button" data-product-id="${escapeHtml(loan.id)}">Подробнее</button>` : ''}</div></section>` : ''}
    <h3>Сроки</h3>
    <div class="asset-deadlines">${assetDeadlineItems(asset).map((item) => `<span class="asset-deadline ${item.days !== null && item.days <= 7 && item.days >= 0 ? 'due' : ''}">${escapeHtml(item.label)} • ${formatTransactionDate(item.date)}</span>`).join('') || '<span class="muted">Сроки не заданы</span>'}</div>
    ${asset.notes ? `<p>${escapeHtml(asset.notes)}</p>` : ''}
    <div class="panel-head"><div><h3>Документы</h3><p>Чеки, гарантии, договоры и обслуживание</p></div><button class="primary add-asset-document" data-asset-id="${escapeHtml(asset.id)}">+ Документ</button></div>
    <div class="asset-doc-list">${documents.length ? documents.map((documentItem) => `<article class="asset-doc-row"><div><strong>${escapeHtml(documentItem.name)}</strong><small>${escapeHtml(documentItem.fileName || 'Без файла')}${documentItem.expiryDate ? ` • до ${formatTransactionDate(documentItem.expiryDate)}` : ''}</small></div><div class="asset-doc-actions">${documentItem.dataUrl ? `<button class="ghost open-asset-document" data-asset-id="${escapeHtml(asset.id)}" data-document-id="${escapeHtml(documentItem.id)}">Открыть</button>` : ''}<button class="icon-button delete-asset-document" data-asset-id="${escapeHtml(asset.id)}" data-document-id="${escapeHtml(documentItem.id)}">🗑</button></div></article>`).join('') : '<p class="muted">Документы ещё не добавлены.</p>'}</div>`;
  byId('assetDetailsDialog').showModal();
};

byId('assetForm')?.elements?.type?.addEventListener('change', updateAssetLinkFields);

// Capture mode prevents the older Package 10 submit handler from saving before the new link fields.
byId('assetForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const old = state.assets.find((item) => item.id === data.assetId);
  const asset = {
    ...(old || {}),
    id: old?.id || `asset-${Date.now()}`,
    type: data.type,
    name: data.name,
    ownerMemberId: data.ownerMemberId || assetMember()?.id || 'family-tatiana',
    purchaseDate: data.purchaseDate || '',
    purchasePrice: Number(data.purchasePrice) || 0,
    currentValue: Number(data.currentValue) || 0,
    location: ['vehicle','appliance'].includes(data.type) ? '' : (data.location || ''),
    serialNumber: ['realEstate','appliance'].includes(data.type) ? '' : (data.serialNumber || ''),
    warrantyEndDate: ['realEstate','vehicle'].includes(data.type) ? '' : (data.warrantyEndDate || ''),
    vehicleWarrantyYears: data.type === 'vehicle' ? (Number(data.vehicleWarrantyYears) || 0) : 0,
    vehicleWarrantyKm: data.type === 'vehicle' ? (Number(data.vehicleWarrantyKm) || 0) : 0,
    currentMileage: data.type === 'vehicle' ? (Number(data.currentMileage) || 0) : 0,
    serviceDate: data.type === 'realEstate' ? '' : (data.serviceDate || ''),
    taxDate: data.taxDate || '',
    insurancePolicyId: data.insurancePolicyId || '',
    loanProductId: ['realEstate', 'vehicle'].includes(data.type) ? (data.loanProductId || '') : '',
    utilityPaymentIds: data.type === 'realEstate'
      ? [...form.querySelectorAll('input[name="utilityPaymentIds"]:checked')].map((input) => input.value)
      : [],
    notes: data.notes || '',
    documents: Array.isArray(old?.documents) ? old.documents : []
  };
  const index = state.assets.findIndex((item) => item.id === asset.id);
  if (index >= 0) state.assets[index] = asset;
  else state.assets.push(asset);
  saveState();
  byId('assetDialog').close();
  render();
  setView('assets');
}, true);

document.addEventListener('click', (event) => {
  const addAssetButton = event.target.closest('#addAssetBtn');
  if (addAssetButton) {
    event.preventDefault();
    event.stopPropagation();
    openAssetDialog(null);
    return;
  }

  const utilitiesButton = event.target.closest('.open-asset-utilities');
  if (utilitiesButton) {
    byId('assetDetailsDialog')?.close();
    setView('calendar');
    if (byId('regularTypeFilter')) {
      byId('regularTypeFilter').value = 'utilities';
      renderRegularMoney();
    }
    return;
  }
  const loanButton = event.target.closest('.open-linked-loan');
  if (loanButton) {
    const product = state.financialProducts.find((item) => item.id === loanButton.dataset.productId);
    if (!product) return;
    byId('assetDetailsDialog')?.close();
    setView('finance-products');
    setTimeout(() => pkg9OpenProductDetails(product), 50);
  }
});


// Package 10.4 — hard fix for opening the asset dialog.
// The button calls this function directly from HTML, so opening does not depend
// on delegated listeners or on the order in which the view was rendered.
window.openAssetFormDirect = function openAssetFormDirect(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const dialog = document.getElementById('assetDialog');
  const form = document.getElementById('assetForm');
  if (!dialog || !form) {
    alert('Форма имущества не найдена. Обновите приложение до версии 0.17.4.');
    return false;
  }

  // Open first. Even if filling a selector fails, the user still sees the form.
  try {
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else if (typeof dialog.show === 'function') dialog.show();
      else dialog.setAttribute('open', '');
    }
  } catch (error) {
    dialog.setAttribute('open', '');
  }

  try {
    if (!Array.isArray(state.assets)) state.assets = [];
    form.reset();
    activeAssetId = null;

    const title = document.getElementById('assetDialogTitle');
    if (title) title.textContent = 'Добавить имущество';
    const deleteButton = document.getElementById('deleteAssetBtn');
    if (deleteButton) deleteButton.hidden = true;

    // Fill selectors independently so one damaged collection cannot block the dialog.
    try { populateAssetSelectors(); } catch (error) { console.error('Asset selectors:', error); }
    try { renderAssetUtilityChecks(null); } catch (error) { console.error('Asset utilities:', error); }

    const ownerField = form.elements.ownerMemberId;
    if (ownerField) ownerField.value = assetMember()?.id || 'family-tatiana';
    const typeField = form.elements.type;
    if (typeField && !typeField.value) typeField.value = 'realEstate';
    try { updateAssetLinkFields(); } catch (error) { console.error('Asset links:', error); }
  } catch (error) {
    console.error('Asset form initialization:', error);
  }

  return false;
};

// Also bind directly after the script loads for browsers that ignore inline handlers.
const package104AddAssetButton = document.getElementById('addAssetBtn');
if (package104AddAssetButton) {
  package104AddAssetButton.onclick = window.openAssetFormDirect;
}

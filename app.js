/**
 * ============================================================================
 * AGRI-PROFIT: Core Financial Engine & Dashboard Controller
 * Implements Prompt 3 (Business Logic) & Prompt 4 (Full-Stack Prototype Logic)
 * ============================================================================
 */

// --- PROMPT 3: STANDALONE BUSINESS LOGIC & PROFIT CALCULATION FUNCTION ---
/**
 * Calculates annual income, grouped expenses, net profit, margin %,
 * most profitable crop, and highest expense category from an array of transactions.
 * 
 * @param {Array<Object>} transactions - Array of financial transactions
 * @param {number|null} targetYear - Optional filter year (e.g., 2026)
 * @returns {Object} Comprehensive annual financial summary
 */
function calculateFarmAnnualSummary(transactions, targetYear = null) {
  if (!Array.isArray(transactions)) {
    throw new TypeError("Transactions must be an array of objects.");
  }

  // 1. Filter transactions by target year if provided
  const txList = targetYear
    ? transactions.filter(t => {
        if (!t.date) return false;
        const y = new Date(t.date).getFullYear();
        return isNaN(y) ? String(t.date).startsWith(String(targetYear)) : y === targetYear;
      })
    : transactions;

  let totalIncome = 0;
  let totalExpenses = 0;
  const expensesByCategory = {};
  const incomeByCategory = {};
  const cropFinancials = {};
  const monthlyData = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));

  // 2. Aggregate income and expenses
  for (const tx of txList) {
    const amount = Number(tx.amount) || 0;
    const type = String(tx.type || '').trim().toLowerCase();
    const category = String(tx.category || 'Other').trim();
    const crop = tx.crop_type && String(tx.crop_type).trim().toLowerCase() !== 'none'
      ? String(tx.crop_type).trim()
      : null;

    // Determine calendar month (0-indexed 0 to 11)
    let monthIndex = 0;
    if (tx.date) {
      const parsedDate = new Date(tx.date);
      monthIndex = !isNaN(parsedDate.getMonth()) ? parsedDate.getMonth() : 0;
    }

    if (type === 'income') {
      totalIncome += amount;
      incomeByCategory[category] = (incomeByCategory[category] || 0) + amount;
      monthlyData[monthIndex].income += amount;

      if (crop) {
        if (!cropFinancials[crop]) cropFinancials[crop] = { income: 0, expense: 0 };
        cropFinancials[crop].income += amount;
      }
    } else if (type === 'expense') {
      totalExpenses += amount;
      expensesByCategory[category] = (expensesByCategory[category] || 0) + amount;
      monthlyData[monthIndex].expense += amount;

      if (crop) {
        if (!cropFinancials[crop]) cropFinancials[crop] = { income: 0, expense: 0 };
        cropFinancials[crop].expense += amount;
      }
    }
  }

  // 3. Compute Net Profit & Operating Margin Percentage
  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpenses = Math.round(totalExpenses * 100) / 100;
  const netProfit = Math.round((totalIncome - totalExpenses) * 100) / 100;
  const profitMarginPercentage = totalIncome > 0
    ? Math.round((netProfit / totalIncome) * 10000) / 100
    : 0;

  // 4. Grouped Expenses with percentage shares
  const groupedExpenses = {};
  for (const [cat, amt] of Object.entries(expensesByCategory)) {
    groupedExpenses[cat] = {
      amount: Math.round(amt * 100) / 100,
      percentage: totalExpenses > 0 ? Math.round((amt / totalExpenses) * 1000) / 10 : 0
    };
  }

  // 5. Find Highest Expense Category
  let highestExpenseCategory = null;
  let highestExpenseAmount = 0;
  for (const [cat, amt] of Object.entries(expensesByCategory)) {
    if (amt > highestExpenseAmount) {
      highestExpenseAmount = Math.round(amt * 100) / 100;
      highestExpenseCategory = cat;
    }
  }

  // 6. Crop Margins & Most Profitable Crop
  const cropPerformance = [];
  let mostProfitableCrop = null;
  let maxCropProfit = -Infinity;

  for (const [cropName, data] of Object.entries(cropFinancials)) {
    const inc = Math.round(data.income * 100) / 100;
    const exp = Math.round(data.expense * 100) / 100;
    const net = Math.round((inc - exp) * 100) / 100;
    const margin = inc > 0 ? Math.round((net / inc) * 10000) / 100 : 0;

    const cropObj = {
      crop: cropName,
      revenue: inc,
      expenses: exp,
      netProfit: net,
      marginPercentage: margin
    };
    cropPerformance.push(cropObj);

    if (net > maxCropProfit) {
      maxCropProfit = net;
      mostProfitableCrop = cropObj;
    }
  }

  // Sort crops descending by net profit
  cropPerformance.sort((a, b) => b.netProfit - a.netProfit);

  // 7. Monthly trend chart data
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyTrend = monthlyData.map((m, idx) => ({
    month: monthLabels[idx],
    income: Math.round(m.income * 100) / 100,
    expense: Math.round(m.expense * 100) / 100,
    net: Math.round((m.income - m.expense) * 100) / 100
  }));

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    profitMarginPercentage,
    highestExpenseCategory: highestExpenseCategory
      ? { category: highestExpenseCategory, amount: highestExpenseAmount }
      : null,
    mostProfitableCrop: mostProfitableCrop || null,
    expensesByCategory: groupedExpenses,
    incomeByCategory,
    cropPerformance,
    monthlyTrend
  };
}


// --- INITIAL REALISTIC AGRICULTURAL DATASET ---
const INITIAL_DEMO_TRANSACTIONS = [
  // Income Entries
  { id: 1, type: "income", category: "Crop Sales", crop_type: "Corn", amount: 94200, date: "2026-10-12", notes: "Cargill Terminal - 18,000 bu @ $5.23" },
  { id: 2, type: "income", category: "Crop Sales", crop_type: "Soybeans", amount: 68400, date: "2026-10-25", notes: "Local Co-op - 5,400 bu @ $12.66" },
  { id: 3, type: "income", category: "Crop Sales", crop_type: "Wheat", amount: 33500, date: "2026-07-18", notes: "Flour Mill Contract - 4,800 bu @ $6.98" },
  { id: 4, type: "income", category: "Livestock Sales", crop_type: "Beef Cattle", amount: 28000, date: "2026-09-10", notes: "Livestock Auction - 16 Yearling Steers" },
  { id: 5, type: "income", category: "Government Subsidy", crop_type: null, amount: 15400, date: "2026-05-14", notes: "USDA FSA ARC-County Program" },
  { id: 6, type: "income", category: "Pasture Leasing", crop_type: null, amount: 6200, date: "2026-03-01", notes: "North 80 Acres Grazing Lease" },

  // Expense Entries
  { id: 7, type: "expense", category: "Fertilizer & Lime", crop_type: "Corn", amount: 27500, date: "2026-04-08", notes: "Anhydrous Ammonia & 10-34-0 Starter" },
  { id: 8, type: "expense", category: "Seeds & Seedlings", crop_type: "Corn", amount: 16800, date: "2026-03-20", notes: "Pioneer Triple-Stack Hybrid Seed" },
  { id: 9, type: "expense", category: "Seeds & Seedlings", crop_type: "Soybeans", amount: 12400, date: "2026-04-18", notes: "Enlist E3 Treated Soybeans" },
  { id: 10, type: "expense", category: "Fuel & Diesel", crop_type: null, amount: 19400, date: "2026-06-15", notes: "Bulk Off-Road Red Diesel & DEF" },
  { id: 11, type: "expense", category: "Hired Labor", crop_type: null, amount: 21500, date: "2026-08-30", notes: "Planting & Harvest Seasonal Operators" },
  { id: 12, type: "expense", category: "Chemicals & Protection", crop_type: "Soybeans", amount: 8900, date: "2026-06-02", notes: "Post-emergent herbicide application" },
  { id: 13, type: "expense", category: "Water & Irrigation", crop_type: "Corn", amount: 7200, date: "2026-07-20", notes: "Electric Pivot Pumping Utilities" },
  { id: 14, type: "expense", category: "Equipment Maintenance", crop_type: null, amount: 9600, date: "2026-05-11", notes: "Combine service & tractor hydraulic overhaul" },
  { id: 15, type: "expense", category: "Crop Insurance", crop_type: "Corn", amount: 11200, date: "2026-03-10", notes: "Multi-Peril Crop Insurance (MPCI 80%)" },
  { id: 16, type: "expense", category: "Land Rent", crop_type: "Wheat", amount: 13500, date: "2026-02-15", notes: "Cash rent - Section 14 South" }
];

// --- APP STATE ---
const state = {
  transactions: [],
  selectedYear: 2026,
  filterType: 'all', // 'all', 'income', 'expense'
  searchQuery: '',
  highContrastMode: false,
  chartInstance: null,
  user: null,
  transactionStorageKey: null,
  authMode: 'login',
  authMessageKey: null,
  language: localStorage.getItem('agriprofit_language') || 'en'
};

const translations = {
  en: {
    cropYear: 'Crop Year',
    farmSubtitle: 'GreenValley Family Farm (1,450 Acres)',
    daylightMode: 'Daylight Mode',
    exportCsv: 'Export CSV',
    totalAnnualIncome: 'Total Annual Income',
    incomeHint: 'Crop sales, leases & USDA subsidies',
    totalAnnualExpenses: 'Total Annual Expenses',
    expensesHint: 'Inputs, fuel, labor & overhead',
    netAnnualProfit: 'Net Annual Profit',
    surplus: 'Surplus',
    netFarmIncomeHint: 'Net operating farm income (Pre-tax)',
    profitMargin: 'Profit Margin',
    target25: 'Target: >25%',
    mostProfitableCrop: 'Most Profitable Crop',
    highestExpenseCategory: 'Highest Expense Category',
    operatingHealth: 'Operating health',
    farmPerformanceOverview: 'Farm performance overview',
    strongSeasonalPerformance: 'Strong seasonal performance',
    seasonValue: 'Season value',
    strategyFocus: 'Strategy focus',
    reviewingProductionMix: 'Reviewing production mix',
    cashFlowNoteTitle: 'Cash flow note',
    stableOperation: 'Stable operation',
    targetProgress: 'Target progress',
    farmOperations: 'Farm operations',
    agriculturePlanningTools: 'Agriculture planning tools',
    yieldForecast: 'Yield Forecast',
    yieldForecastDesc: 'Projection based on harvest output entries',
    irrigationPlan: 'Irrigation Plan',
    waterUseTiming: 'Water use and timing check',
    inputEfficiency: 'Input Efficiency',
    costToOutputEfficiency: 'Cost-to-output efficiency',
    riskAlert: 'Risk Alert',
    operationalRiskSummary: 'Operational risk summary',
    fieldActivityChecklist: 'Field activity checklist',
    seasonPlan: 'Season plan',
    cashFlowChartTitle: 'Cash Flow: Monthly Income vs. Expenses',
    cashFlowChartSubtitle: 'Annual monthly comparison for season trends & harvest peaks',
    monthly: 'Monthly',
    enterpriseMarginsTitle: 'Profit Margins per Enterprise / Crop',
    enterpriseMarginsSubtitle: 'Revenue, directly allocated expenses, and return margin',
    enterpriseMarginsLabel: 'Enterprise Margins',
    expenseDistributionTitle: 'Expense Distribution by Category',
    expenseDistributionSubtitle: '% of Total Operating Costs',
    transactionLedger: 'Transaction Ledger',
    transactionLedgerSubtitle: 'Financial entries for active season',
    searchPlaceholder: 'Search category, crop, note...',
    allFilter: 'All',
    incomeFilter: 'Income',
    expenseFilter: 'Expenses',
    resetDemoData: 'Reset Demo Data',
    recordTransaction: 'Record Transaction',
    recordTransactionSubtitle: 'Instantly updates your farm profit metrics',
    entryType: 'Entry Type',
    incomeLabel: '+ Income',
    expenseLabel: '- Expense',
    amountLabel: 'Amount (ETB) *',
    categoryLabel: 'Category *',
    cropAllocationLabel: 'Crop or Enterprise Allocation',
    cropAllocationHint: 'Leave as Overhead if cost applies across the entire farm',
    inputRequirementLabel: 'Input Requirement',
    optionalLabel: 'Optional',
    inputTypeOption: 'Type',
    seedOption: 'Seed',
    fertilizerOption: 'Fertilizer',
    pesticideOption: 'Pesticide',
    waterOption: 'Water',
    laborOption: 'Labor',
    fuelOption: 'Fuel',
    otherOption: 'Other',
    quantityPlaceholder: 'Qty',
    unitOption: 'Unit',
    bagsOption: 'bags',
    litersOption: 'liters',
    hoursOption: 'hours',
    acresOption: 'acres',
    tonsOption: 'tons',
    piecesOption: 'pieces',
    outputYieldLabel: 'Output / Yield',
    cropOption: 'Crop',
    vegetablesOption: 'Vegetables',
    fruitsOption: 'Fruits',
    livestockOption: 'Livestock',
    yieldPlaceholder: 'Yield',
    quintalsOption: 'quintals',
    headsOption: 'heads',
    transactionDateLabel: 'Transaction Date *',
    notesLabel: 'Vendor / Buyer / Description',
    notesPlaceholder: 'e.g., Cargill Terminal, Pioneer Seed Co, Off-Road Diesel',
    recordIncomeEntry: 'Record Income Entry',
    recordExpenseEntry: 'Record Expense Entry',
    selectYear: 'Season',
    noTransactionsMatch: 'No transactions match your current filter',
    noTransactionsHint: 'Try changing the year, type filter, or search term',
    netSurplus: 'Net Surplus',
    netDeficit: 'Net Deficit',
    resetConfirmation: 'Reset all financial records back to realistic demo farm data?',
    deleteEntry: 'Delete entry',
    deleteConfirmation: 'Are you sure you want to delete this transaction?',
    transactionDeleted: 'Transaction deleted.',
    maintainInputDiscipline: 'Maintain input discipline and expand the best-performing enterprise.',
    reduceInputCosts: 'Reduce lower-return input costs and rebalance crop planning.',
    reviewCosts: 'Review fertilizer, labor, and occupancy costs before the next cycle.',
    cashFlowAhead: 'Cash flow is comfortably ahead of target.',
    healthyNeedsOptimization: 'Healthy but needs optimization',
    marginsSteady: 'Margins are steady, but there is room to improve efficiency.',
    marginPressure: 'Margin pressure requires action',
    expenseLoadHigh: 'Expense load is outrunning revenue generation.',
    addYieldData: 'Add yield data',
    monitorMoisture: 'Monitor moisture',
    lowEfficiency: 'Low efficiency',
    moderateEfficiency: 'Moderate',
    healthyEfficiency: 'Healthy',
    actionNeeded: 'Action needed',
    watchClosely: 'Watch closely',
    noMajorIssues: 'No major issues',
    soilStatusManagable: 'Soil nutrient status is manageable',
    reviewInputCosts: 'Review input costs before next cycle',
    irrigationAvailable: 'Irrigation records are available for review',
    addIrrigation: 'Add irrigation records for better planning',
    highInputPressure: 'Reduce high-cost input pressure',
    inputWithinRange: 'Input use is within expected range',
    productionMixGood: 'Production mix is performing well',
    rebalanceCropMix: 'Rebalance crop mix to improve margin',
    noneRecorded: 'None recorded',
    addCropTaggedIncome: 'Add crop-tagged income to calculate',
    noExpensesLogged: 'No expenses logged for this year',
    noEnterpriseTransactions: 'No enterprise/crop specific transactions yet for',
    assignCropsPrompt: 'Assign crops to transactions in the entry form to see enterprise margins.',
    noExpensesRecorded: 'No expenses recorded yet.',
    chartIncomeLabel: 'Income (ETB)',
    chartExpenseLabel: 'Expenses (ETB)',
    dashboardTab: 'Farm Dashboard',
    agricultureGuideTab: 'Agriculture Guide',
    guideEyebrow: 'Practical field reference',
    guideTitle: 'Agriculture in Ethiopia',
    guideIntro: 'A practical starting point for planning crops, caring for soil and water, and keeping farm records.',
    openDashboard: 'Open farm dashboard',
    localConditionsNote: 'Growing seasons and suitable crops vary by region, altitude, rainfall, and local conditions. Use this guide as general information and confirm timing with local agricultural extension workers.',
    fieldPracticesTitle: 'Field practices',
    seasonPlanningTitle: 'Plan around the season',
    seasonPlanningText: 'Check local rainfall forecasts and the crop calendar before choosing planting dates. Prepare seed, labor, and equipment early, and keep a backup plan for delayed or uneven rain.',
    soilSeedsTitle: 'Protect soil and choose seed well',
    soilSeedsText: 'Use locally adapted, quality seed. Where practical, rotate crops, retain ground cover, add compost or other suitable organic matter, and follow soil-test or extension advice for fertilizer.',
    waterCareTitle: 'Use water carefully',
    waterCareText: 'Record irrigation dates and amounts. Reduce runoff and erosion with methods suited to the field, and prioritize water for sensitive crop stages when supplies are limited.',
    pestCareTitle: 'Scout for pests and disease',
    pestCareText: 'Inspect fields regularly and note where symptoms appear. Start with prevention and locally recommended integrated pest management; use registered products only as directed, with protective equipment.',
    seasonChecklistTitle: 'A simple season checklist',
    beforePlantingTitle: 'Before planting',
    beforePlantingText: 'Review the plan, check seed and inputs, and prepare fields and tools.',
    plantingTitle: 'Planting',
    plantingText: 'Use locally advised timing, spacing, and planting depth.',
    growingTitle: 'During growth',
    growingText: 'Check moisture, weeds, crop health, and pest signs; record work and costs.',
    harvestTitle: 'Harvest and storage',
    harvestText: 'Harvest at suitable maturity, dry and store produce safely, and record quantity and sales.',
    farmRecordsTitle: 'Keep records that help decisions',
    farmRecordsText: 'Track crop, field, date, input type and quantity, harvest quantity, sales, and expenses. Consistent records help compare crops and plan the next season.',
    backToRecords: 'Go to farm records',
    authEyebrow: 'Farm management',
    authHeadline: 'Your farm work, in one place.',
    authDescription: 'Sign in to review farm performance, record field inputs and harvests, and plan the season ahead.',
    authSecureNote: 'Passwords are hashed, and sessions use secure cookies.',
    authLoginTitle: 'Sign in to your farm',
    authRegisterTitle: 'Create your farm account',
    authLoginDescription: 'Use your email and password to continue.',
    authRegisterDescription: 'Create an account to access your farm dashboard.',
    authEmailLabel: 'Email address',
    authPasswordLabel: 'Password',
    authSignInButton: 'Sign in',
    authNameLabel: 'Full name',
    authPasswordHint: 'Use at least 12 characters.',
    authConfirmPasswordLabel: 'Confirm password',
    authCreateButton: 'Create account',
    authNeedAccount: 'New to AgriProfit?',
    authHaveAccount: 'Already have an account?',
    authCreateAccount: 'Create an account',
    authSignInLink: 'Sign in',
    authLocalDataNote: 'Farm entries are currently stored in this browser and are not synced between devices.',
    authSignOut: 'Sign out',
    authNetworkError: 'Authentication server is not responding. Start the server and open http://localhost:3000.',
    authOpenThroughServer: 'This page was opened as a file. Start the server and open http://localhost:3000 to sign in.',
    authInvalidName: 'Enter your name (up to 150 characters).',
    authInvalidEmail: 'Enter a valid email address.',
    authInvalidPassword: 'Password must be 12 to 128 characters.',
    authEmailInUse: 'An account with this email already exists.',
    authInvalidCredentials: 'Email or password is incorrect.',
    authRateLimited: 'Too many attempts. Wait a few minutes and try again.',
    authServerError: 'The server could not complete your request. Try again shortly.',
    authInvalidOrigin: 'Request rejected. Reload the page and try again.',
    authPasswordsMismatch: 'The passwords do not match.'
  },
  om: {
    cropYear: 'Waggaa Qorannoo',
    farmSubtitle: 'GreenValley Qonnaa Maatii (1,450 Akkaara)',
    daylightMode: 'Haala Ifa',
    exportCsv: 'CSV baasi',
    totalAnnualIncome: 'Galii Waggaa Guutuu',
    incomeHint: 'Galii midhaan, qophii fi gargaarsa USDA',
    totalAnnualExpenses: 'Baasii Waggaa Guutuu',
    expensesHint: 'Gabatee, nafta, hojjettoota fi baasii gargaaraa',
    netAnnualProfit: 'Bu’aa Waggaa Guutuu',
    surplus: 'Hagaad',
    netFarmIncomeHint: 'Galii qonnaa hojiin (Keenya dhuma)',
    profitMargin: 'Hamma Bu’aa',
    target25: 'Kaallattoo: >25%',
    mostProfitableCrop: 'Midhaan Bu’aa Dabalataa',
    highestExpenseCategory: 'Gosni Baasii Ol’aanaa',
    operatingHealth: 'Haalata hojii',
    farmPerformanceOverview: 'Walii galtee hojii qonnaa',
    strongSeasonalPerformance: 'Qorannoo yeroo gaarii',
    seasonValue: 'Gatii waggaa',
    strategyFocus: 'Himma geggeessuu',
    reviewingProductionMix: 'Mixiin oomishaatti ilaalama',
    cashFlowNoteTitle: 'Yaada maallaqa',
    stableOperation: 'Hojii tasgabbii',
    targetProgress: 'Gara gaarii',
    farmOperations: 'Hojii qonnaa',
    agriculturePlanningTools: 'Meeshaaleen karoora qonnaa',
    yieldForecast: 'Saada waraabuu',
    yieldForecastDesc: 'Hagami qonnaan buusuu danda’u',
    irrigationPlan: 'Karoora bishaan',
    waterUseTiming: 'Fayyadamuu bishaanii fi yeroon',
    inputEfficiency: 'Dhuufama galchaa',
    costToOutputEfficiency: 'Kaffaltii fi oomisha',
    riskAlert: 'Itti yaadannoo balaa',
    operationalRiskSummary: 'Waliigala balaa hojii',
    fieldActivityChecklist: 'Tarree hojii lafa',
    seasonPlan: 'Karoora waggaa',
    cashFlowChartTitle: 'Maallaqa: Galii ji’aa vs. Baasii',
    cashFlowChartSubtitle: 'Walitti ibsaa ji’oota waggaaaf wareeqaaf',
    monthly: 'Ji’aa',
    enterpriseMarginsTitle: 'Hamma Bu’aa Midhaanii / Qonnaa',
    enterpriseMarginsSubtitle: 'Galii, baasii qopheessame fi hinta’ina bu’aa',
    enterpriseMarginsLabel: 'Hamma Bu’aa Qonnaa',
    expenseDistributionTitle: 'Qooddina Baasii Gosa Gosaatiin',
    expenseDistributionSubtitle: '% Baasii Waliigalaa',
    transactionLedger: 'Galmee Maxxansaa',
    transactionLedgerSubtitle: 'Galmeewwan waggaa jiraa',
    searchPlaceholder: 'Gosa, midhaan, yaada barbaadi...',
    allFilter: 'Hunda',
    incomeFilter: 'Galii',
    expenseFilter: 'Baasii',
    resetDemoData: 'Daataa Demosi haajisu',
    recordTransaction: 'Maxxansaa galchi',
    recordTransactionSubtitle: 'Safartuu bu’aa qonnaa amma tasgabsiisa',
    entryType: 'Gosa Galmaa',
    incomeLabel: '+ Galii',
    expenseLabel: '- Baasii',
    amountLabel: 'Maballii (ETB) *',
    categoryLabel: 'Gosa *',
    cropAllocationLabel: 'Qooddina Midhaan ykn Qonnaa',
    cropAllocationHint: 'Baasiin qonnaa guutuu irratti hojiise yoo ta’e “Overhead” ta’i',
    inputRequirementLabel: 'Gabatee Barbaachisu',
    optionalLabel: 'Dhiisofama',
    inputTypeOption: 'Gosa',
    seedOption: 'Sanyii',
    fertilizerOption: 'Xaa’oo',
    pesticideOption: 'Tamsaasa',
    waterOption: 'Bishaan',
    laborOption: 'Hojjettoota',
    fuelOption: 'Nafta',
    otherOption: 'Kan biroo',
    quantityPlaceholder: 'Miqdii',
    unitOption: 'Saala',
    bagsOption: 'boqola',
    litersOption: 'liitira',
    hoursOption: 'sa’aatii',
    acresOption: 'akkaara',
    tonsOption: 'toonii',
    piecesOption: 'qeeqa',
    outputYieldLabel: 'Oomisha / Waraabuu',
    cropOption: 'Midhaan',
    vegetablesOption: 'Muuzii',
    fruitsOption: 'Fuduraa',
    livestockOption: 'Beeyladaa',
    yieldPlaceholder: 'Waraabuu',
    quintalsOption: 'quintals',
    headsOption: 'mataa',
    transactionDateLabel: 'Guyyaa Maxxansaa *',
    notesLabel: 'Dhiheenya / Bittoota / Ibsa',
    notesPlaceholder: 'Fkn. Cargill Terminal, Pioneer Seed Co, Off-Road Diesel',
    recordIncomeEntry: 'Galii galchi',
    recordExpenseEntry: 'Baasii galchi',
    selectYear: 'Waggaa',
    noTransactionsMatch: 'Maxxansoon walqixaa hin argamne',
    noTransactionsHint: 'Waggaa, gosa, ykn jecha barbaadduu jijjiiri',
    netSurplus: 'Bu’aa Hagaad',
    netDeficit: 'Bu’aa Dhiibbaa',
    resetConfirmation: 'Daataa maallaqa hunda gara daataa qonnaa deebi’i?',
    deleteEntry: 'Galmee balleessi',
    deleteConfirmation: 'Maxxansaa kana dhabamsiisuu barbaaduu?',
    transactionDeleted: 'Maxxansaan balleefame.',
    maintainInputDiscipline: 'Dhuufama galchaa eegaa fi midhaanii gaarii dabaladhu.',
    reduceInputCosts: 'Baasii ol’aanaa xiqqessiitii karoora midhaan deebisi.',
    reviewCosts: 'Qorichaa, hojjettoota fi baasii lafa dura waggaa itti aanutti ilaali.',
    cashFlowAhead: 'Maallaqni kaayoo irraa oli ta’uu isaaf jira.',
    healthyNeedsOptimization: 'Fayyaa gaarii garuu fooyyaasa barbaachisa',
    marginsSteady: 'Hamma bu’aan tasgabbii dha, garuu fooyyaasa jira.',
    marginPressure: 'Hamma bu’aa balaa qaba',
    expenseLoadHigh: 'Baasii maallaqa irraa ol gahu jira.',
    addYieldData: 'Waraabuu dabaladhu',
    monitorMoisture: 'Hogguu bishaan ilaali',
    lowEfficiency: 'Dhuufama gadi aanaa',
    moderateEfficiency: 'Giddugaleessa',
    healthyEfficiency: 'Fayyaa',
    actionNeeded: 'Hojii barbaachisa',
    watchClosely: 'Cimaa ilaali',
    noMajorIssues: 'Rakkoo guddaan hin jiru',
    soilStatusManagable: 'Haalli lafa soorri itti fayyadu tola',
    reviewInputCosts: 'Baasii galchaa dura waggaa itti aanutti ilaali',
    irrigationAvailable: 'Galmeewwan bishaan jira',
    addIrrigation: 'Galmeewwan bishaan dabaladhu',
    highInputPressure: 'Baasii ol’aanaa hir’isi',
    inputWithinRange: 'Fayyadamni galchaa karoora keessatti jira',
    productionMixGood: 'Mixiin oomishaatiin gaarii hojjata',
    rebalanceCropMix: 'Mixii midhaan fooyyessi',
    noneRecorded: 'Homaa hin galamne',
    addCropTaggedIncome: 'Galii midhaan dabaladhu',
    noExpensesLogged: 'Baasii waggaa kanaaf hin galamne',
    noEnterpriseTransactions: 'Maxxansoon midhaan/qonnaa waggaa',
    assignCropsPrompt: 'Gosoota midhaaniin maxxansaa galchiin hamma bu’aa ilaali.',
    noExpensesRecorded: 'Baasii hin galamne.',
    chartIncomeLabel: 'Galii (ETB)',
    chartExpenseLabel: 'Baasii (ETB)',
    dashboardTab: 'Gabatee Qonnaa',
    agricultureGuideTab: 'Qajeelfama Qonnaa',
    guideEyebrow: 'Odeeffannoo hojii dirree',
    guideTitle: 'Qonna Itoophiyaa',
    guideIntro: 'Qophii midhaanii, kunuunsa biyyee fi bishaanii, akkasumas galmee qonnaa eeguu irratti jalqaba hojii irra oolu.',
    openDashboard: 'Gabatee qonnaa bani',
    localConditionsNote: 'Yeroon qonnaa fi midhaan mijataan naannoo, olka’iinsa lafaa, rooba fi haala naannoo irratti hundaa’uun garaagarummaa qaba. Odeeffannoo waliigalaa kana akka qajeelfamaatti fayyadami; yeroo hojii ogeeyyii qonnaa naannoo irraa mirkaneeffadhu.',
    fieldPracticesTitle: 'Hojiiwwan dirree',
    seasonPlanningTitle: 'Yeroo qonnaa irratti hundaa’uun karoorsi',
    seasonPlanningText: 'Guyyaa dhaabuu murteessuu dura tilmaama roobaa fi kalaandarii midhaanii naannoo ilaali. Sanyii, humna namaa fi meeshaalee dursee qopheessi; roobni yoo tures ykn walqixa hin taane karoora biraa qabaadhu.',
    soilSeedsTitle: 'Biyyee kunuunsi; sanyii sirrii filadhu',
    soilSeedsText: 'Sanyii qulqulluu fi naannoo sanaaf mijatu fayyadami. Yoo danda’ame midhaan wal-jijjiiri, biyyee haguugi, xaa’oo kompoostii ykn wanta orgaanikii mijatu dabali; xaa’oo irratti gorsa qorannoo biyyee ykn ogeessaa hordofi.',
    waterCareTitle: 'Bishaan sirnaan fayyadami',
    waterCareText: 'Guyyaa fi hamma bishaan obaasuu galmeessi. Mala lafa sanaaf mijatuun bishaan yaa’uu fi biyyeen dhiqamuu hir’isi; bishaan yoo xiqqaatu sadarkaalee midhaan bishaan barbaadan dursa kenni.',
    pestCareTitle: 'Ilbiisota fi dhukkuba midhaanii hordofi',
    pestCareText: 'Dirree yeroo yeroon ilaali; mallattoon rakkoo bakka kamiitti akka mul’atu galmeessi. Ittisaa fi mala to’annoo ilbiisota walitti makame kan naannoo keessatti gorfamuun jalqabi; qoricha hayyamame qajeelfama isaa fi meeshaa ittisaa fayyadamuun qofa hojii irra oolchi.',
    seasonChecklistTitle: 'Tarree hojii yeroo qonnaa',
    beforePlantingTitle: 'Dhaabuu dura',
    beforePlantingText: 'Karoora ilaali, sanyii fi galteewwan qopheessi, dirree fi meeshaalee qopheessi.',
    plantingTitle: 'Yeroo dhaabuu',
    plantingText: 'Yeroo, fageenya fi gadi-fageenya dhaabuu naannoo keessatti gorfame hordofi.',
    growingTitle: 'Yeroo guddinaa',
    growingText: 'Jiidhina, aramaa, fayyaa midhaanii fi mallattoo ilbiisotaa ilaali; hojii fi baasii galmeessi.',
    harvestTitle: 'Haamaa fi kuusaa',
    harvestText: 'Yeroo bilchina mijatu haami; oomisha sirriitti gogsiitii kuusi; hamma oomishaa fi gurgurtaa galmeessi.',
    farmRecordsTitle: 'Murtii gaarii gargaaruuf galmee qabadhu',
    farmRecordsText: 'Midhaan, dirree, guyyaa, gosa fi hamma galtee, hamma haamaa, gurgurtaa fi baasii galmeessi. Galmeen itti fufiinsa qabu midhaan walbira qabuun yeroo itti aanu karoorsuu gargaara.',
    backToRecords: 'Gara galmee qonnaatti deemi',
    authEyebrow: 'Bulchiinsa qonnaa',
    authHeadline: 'Hojii qonnaa kee bakka tokkotti.',
    authDescription: 'Raawwii qonnaa ilaaluuf, galteewwanii fi haamaa galmeessuuf, akkasumas yeroo qonnaa itti aanu karoorsuuf seeni.',
    authSecureNote: 'Jechoonni icciitii ni hashaawamu; seensawwan kukii nageenya qabu fayyadamu.',
    authLoginTitle: 'Gara qonnaa keetti seeni',
    authRegisterTitle: 'Herrega qonnaa kee banuu',
    authLoginDescription: 'Itti fufuuf imeelii fi jecha icciitii kee galchi.',
    authRegisterDescription: 'Gabatee qonnaa kee fayyadamuuf herrega uumi.',
    authEmailLabel: 'Teessoo imeelii',
    authPasswordLabel: 'Jecha icciitii',
    authSignInButton: 'Seeni',
    authNameLabel: 'Maqaa guutuu',
    authPasswordHint: 'Yoo xiqqaate qubee 12 fayyadami.',
    authConfirmPasswordLabel: 'Jecha icciitii irra deebi’i',
    authCreateButton: 'Herrega uumi',
    authNeedAccount: 'AgriProfit irratti haaraa dha?',
    authHaveAccount: 'Herrega duraan qabdaa?',
    authCreateAccount: 'Herrega uumi',
    authSignInLink: 'Seeni',
    authLocalDataNote: 'Galmeewwan qonnaa amma biraawzara kana keessatti kuufamu; meeshaalee gidduutti wal hin-simsiifaman.',
    authSignOut: 'Ba’i',
    authNetworkError: 'Sarvariin mirkaneessaa hin deebine. Sarvaricha jalqabiitii http://localhost:3000 bani.',
    authOpenThroughServer: 'Fuulli kun akka faayiliitti baname. Sarvaricha jalqabiitii seenuuf http://localhost:3000 bani.',
    authInvalidName: 'Maqaa kee galchi (qubee 150 ol hin ta’in).',
    authInvalidEmail: 'Teessoo imeelii sirrii galchi.',
    authInvalidPassword: 'Jecha icciitii qubee 12 hanga 128 qabu galchi.',
    authEmailInUse: 'Imeelii kanaan herregni duraan jira.',
    authInvalidCredentials: 'Imeelii ykn jechi icciitii sirrii miti.',
    authRateLimited: 'Yaalii baay’ee ta’eera. Daqiiqaa muraasa eegiitii irra deebi’i.',
    authServerError: 'Sarvarichi gaaffii kee xumuruu hin dandeenye. Booda irra deebi’i.',
    authInvalidOrigin: 'Gaaffiin hin hayyamamne. Fuula haaromsiitii irra deebi’i.',
    authPasswordsMismatch: 'Jechoonni icciitii wal hin siman.'
  },
  am: {
    cropYear: 'የምርት ዓመት',
    farmSubtitle: 'ግሪንቫሊ የቤተሰብ እርሻ (1,450 የወረዳ)',
    daylightMode: 'የቀን ብርሃን ሁኔታ',
    exportCsv: 'CSV ያስወግዱ',
    totalAnnualIncome: 'የዓመት ጠቅላላ ገቢ',
    incomeHint: 'የምርት ሽያጭ፣ ኪራይ እና የUSDA ድጎማ',
    totalAnnualExpenses: 'የዓመት ጠቅላላ ወጪ',
    expensesHint: 'ንጥረ ነገሮች፣ ነዳጅ፣ ሠራተኞች እና ሌሎች ወጪዎች',
    netAnnualProfit: 'የዓመት የተጣራ ትርፍ',
    surplus: 'ትርፍ',
    netFarmIncomeHint: 'የእርሻ የሥራ ገቢ (ቅድመ-ግብር)',
    profitMargin: 'የትርፍ መጠን',
    target25: 'ዒላማ: >25%',
    mostProfitableCrop: 'በጣም ትርፋማ ምርት',
    highestExpenseCategory: 'ከፍተኛ የወጪ ምድብ',
    operatingHealth: 'የአሠራር ጤና',
    farmPerformanceOverview: 'የእርሻ አፈጻጸም አጠቃላይ',
    strongSeasonalPerformance: 'ጠንካራ የወቅት አፈጻጸም',
    seasonValue: 'የወቅት ዋጋ',
    strategyFocus: 'የስትራቴጂ ትኩረት',
    reviewingProductionMix: 'የምርት ድብልቅ በማጣራት ላይ',
    cashFlowNoteTitle: 'የገንዘብ ፍሰት ማስታወሻ',
    stableOperation: 'የተረጋጋ አሠራር',
    targetProgress: 'የዒላማ እድገት',
    farmOperations: 'የእርሻ ስራዎች',
    agriculturePlanningTools: 'የግብርና ዕቅድ መሳሪያዎች',
    yieldForecast: 'የምርት ትንበያ',
    yieldForecastDesc: 'በመከርስ ውጤት ላይ የተመሠረተ ትንበያ',
    irrigationPlan: 'የመስኖ እቅድ',
    waterUseTiming: 'የውሃ አጠቃቀም እና ጊዜ',
    inputEfficiency: 'የግብዓት ውጤታማነት',
    costToOutputEfficiency: 'የወጪ-ውጤት ውጤታማነት',
    riskAlert: 'የአደጋ ማንቂያ',
    operationalRiskSummary: 'የአሠራር አደጋ ማጠቃለያ',
    fieldActivityChecklist: 'የመስክ ሥራ ዝርዝር',
    seasonPlan: 'የወቅት እቅድ',
    cashFlowChartTitle: 'ገንዘብ ፍሰት: ወርሃዊ ገቢ እና ወጪ',
    cashFlowChartSubtitle: 'የወቅት አመላካች እና የመከርስ ከፍታ ማነፃፀሪያ',
    monthly: 'ወርሃዊ',
    enterpriseMarginsTitle: 'የንግድ እና ምርት ትርፍ መጠን',
    enterpriseMarginsSubtitle: 'ገቢ፣ ቀጥታ የሚመደቡ ወጪዎች እና የትርፍ መጠን',
    enterpriseMarginsLabel: 'የንግድ ትርፍ መጠን',
    expenseDistributionTitle: 'የወጪ ስርጭት በምድብ',
    expenseDistributionSubtitle: '% ከጠቅላላ የአሠራር ወጪ',
    transactionLedger: 'የግብይት መዝገብ',
    transactionLedgerSubtitle: 'ለንቁ ወቅት የሚያገለግሉ ግብይቶች',
    searchPlaceholder: 'ክፍል፣ ምርት ወይም ማስታወሻ ፈልግ...',
    allFilter: 'ሁሉም',
    incomeFilter: 'ገቢ',
    expenseFilter: 'ወጪ',
    resetDemoData: 'የማሳያ መረጃ እንደገና አስጀምር',
    recordTransaction: 'ግብይት መዝግብ',
    recordTransactionSubtitle: 'የእርሻ ትርፍ መለኪያዎችን በፍጥነት ያዘምናል',
    entryType: 'የግብይት አይነት',
    incomeLabel: '+ ገቢ',
    expenseLabel: '- ወጪ',
    amountLabel: 'መጠን (ETB) *',
    categoryLabel: 'ምድብ *',
    cropAllocationLabel: 'የምርት ወይም የንግድ ክፍፍል',
    cropAllocationHint: 'ወጪው ለመላው እርሻ ከሚያገለግል በቀር ከፍተኛ መጠን ያስቀምጡ',
    inputRequirementLabel: 'የግብዓት ፍላጎት',
    optionalLabel: 'አማራጭ',
    inputTypeOption: 'አይነት',
    seedOption: 'ዘር',
    fertilizerOption: 'ማዳበሪያ',
    pesticideOption: 'አሳማዳ',
    waterOption: 'ውሃ',
    laborOption: 'ሰራተኞች',
    fuelOption: 'ነዳጅ',
    otherOption: 'ሌላ',
    quantityPlaceholder: 'ብዛት',
    unitOption: 'ክፍል',
    bagsOption: 'ቦርሳዎች',
    litersOption: 'ሊትር',
    hoursOption: 'ሰዓታት',
    acresOption: 'አካሮች',
    tonsOption: 'ቶን',
    piecesOption: 'ክፍሎች',
    outputYieldLabel: 'ውጤት / ምርት',
    cropOption: 'ምርት',
    vegetablesOption: 'አትክልቶች',
    fruitsOption: 'ፍራፍሬ',
    livestockOption: 'እንስሳት',
    yieldPlaceholder: 'ምርት',
    quintalsOption: 'ኩዊንታል',
    headsOption: 'ራሶች',
    transactionDateLabel: 'የግብይት ቀን *',
    notesLabel: 'አቅራቢ / ገዢ / መግለጫ',
    notesPlaceholder: 'ለምሳሌ Cargill Terminal, Pioneer Seed Co, Off-Road Diesel',
    recordIncomeEntry: 'ገቢ መዝግብ',
    recordExpenseEntry: 'ወጪ መዝግብ',
    selectYear: 'ወቅት',
    noTransactionsMatch: 'ምንም ግብይቶች አልተዛመዱም',
    noTransactionsHint: 'ዓመት፣ አይነት ወይም ፍለጋ ቃል ቀይረው ይሞክሩ',
    netSurplus: 'የተጣራ ትርፍ',
    netDeficit: 'የተጣራ ጉድለት',
    resetConfirmation: 'ሁሉንም የፋይናንስ መረጃዎች ወደ እውነተኛ የእርሻ መረጃ እንደገና ያስጀምራል?',
    deleteEntry: 'ግብይት አስወግድ',
    deleteConfirmation: 'ይህን ግብይት እወገድ ይፈልጋሉ?',
    transactionDeleted: 'ግብይት ተሰርዟል።',
    maintainInputDiscipline: 'የግብዓት አጠባበቅን ይጠብቁ እና የተሻለ ምርትን ያስፋፉ።',
    reduceInputCosts: 'ዝቅተኛ ትርፍ ያላቸውን ወጪዎች ቀንሰው የምርት እቅድን እንደገና ያቀናጃሉ።',
    reviewCosts: 'ከሚቀጥለው ወቅት በፊት ማዳበሪያ፣ ሰራተኞች እና የቦታ ወጪዎችን ይገምግሙ።',
    cashFlowAhead: 'የገንዘብ ፍሰት ከዒላማ በላይ ነው።',
    healthyNeedsOptimization: 'ጤናማ ነው ነገር ግን ማሻሻያ ያስፈልጋል',
    marginsSteady: 'የትርፍ መጠን አስተማማኝ ነው፣ ነገር ግን የውጤታማነት ማሻሻያ አለ።',
    marginPressure: 'የትርፍ መጠን አደጋ ይፈጥራል',
    expenseLoadHigh: 'የወጪ ጫና ከገቢ በላይ ነው።',
    addYieldData: 'የምርት መረጃ አክል',
    monitorMoisture: 'ውሃ ይቆጣጠሩ',
    lowEfficiency: 'ዝቅተኛ ውጤታማነት',
    moderateEfficiency: 'መካከለኛ',
    healthyEfficiency: 'ጤናማ',
    actionNeeded: 'እርምጃ ያስፈልጋል',
    watchClosely: 'በጥንቃቄ ይከታተሉ',
    noMajorIssues: 'ከፍተኛ ችግር የለም',
    soilStatusManagable: 'የአፈር ንጥረ ምግባር የሚተዳደር ነው',
    reviewInputCosts: 'የግብዓት ወጪ በሚቀጥለው ወቅት ይገምግሙ',
    irrigationAvailable: 'የመስኖ መዝገቦች ዝግጁ ናቸው',
    addIrrigation: 'ለተሻለ እቅድ የመስኖ መዝገቦች አክል',
    highInputPressure: 'ከፍተኛ የወጪ ግፊት ቀንስ',
    inputWithinRange: 'የግብዓት አጠቃቀም በሚገባ ውስጥ ነው',
    productionMixGood: 'የምርት ድብልቅ ጥሩ አፈጻጸም አለው',
    rebalanceCropMix: 'የምርት ድብልቅን እንደገና ያቀናጃል',
    noneRecorded: 'ምንም አልተመዘገበም',
    addCropTaggedIncome: 'የምርት ገቢ አክል',
    noExpensesLogged: 'ለዚህ ዓመት ወጪ አልተመዘገበም',
    noEnterpriseTransactions: 'ለዚህ ዓመት የምርት/ንግድ ግብይቶች የሉም',
    assignCropsPrompt: 'ንግድ ማዕከሎችን ለማየት በግብይት ቅጽ ላይ ምርቶችን መድብ.',
    noExpensesRecorded: 'ምንም ወጪ አልተመዘገበም።',
    chartIncomeLabel: 'ገቢ (ETB)',
    chartExpenseLabel: 'ወጪ (ETB)',
    dashboardTab: 'የእርሻ ዳሽቦርድ',
    agricultureGuideTab: 'የግብርና መመሪያ',
    guideEyebrow: 'ተግባራዊ የመስክ መረጃ',
    guideTitle: 'በኢትዮጵያ ግብርና',
    guideIntro: 'ሰብልን ለማቀድ፣ አፈርና ውሃን ለመንከባከብ እና የእርሻ መዝገቦችን ለመያዝ ተግባራዊ መነሻ መረጃ።',
    openDashboard: 'የእርሻ ዳሽቦርድን ክፈት',
    localConditionsNote: 'የእርሻ ወቅቶችና ተስማሚ ሰብሎች እንደ ክልል፣ ከፍታ፣ ዝናብና የአካባቢ ሁኔታ ይለያያሉ። ይህን መመሪያ እንደ አጠቃላይ መረጃ ይጠቀሙ፤ የሥራ ጊዜን ከአካባቢው የግብርና ባለሙያዎች ጋር ያረጋግጡ።',
    fieldPracticesTitle: 'የመስክ አሠራሮች',
    seasonPlanningTitle: 'እንደ ወቅቱ ያቅዱ',
    seasonPlanningText: 'የመዝራት ቀን ከመምረጥዎ በፊት የአካባቢውን የዝናብ ትንበያና የሰብል የጊዜ ሰሌዳ ይመልከቱ። ዘር፣ የሰው ኃይልና መሣሪያዎችን ቀድመው ያዘጋጁ፤ ዝናብ ቢዘገይ ወይም እኩል ባይሆን ሌላ ዕቅድ ይኑርዎት።',
    soilSeedsTitle: 'አፈርን ይጠብቁ፤ ጥሩ ዘር ይምረጡ',
    soilSeedsText: 'ለአካባቢው ተስማሚና ጥራት ያለው ዘር ይጠቀሙ። በሚቻልበት ጊዜ ሰብልን ይቀያይሩ፣ አፈሩን በእፅዋት ይሸፍኑ፣ ብስባሽ ወይም ተስማሚ የኦርጋኒክ ቁስ ይጨምሩ፤ ለማዳበሪያ የአፈር ምርመራ ወይም የባለሙያ ምክር ይከተሉ።',
    waterCareTitle: 'ውሃን በጥንቃቄ ይጠቀሙ',
    waterCareText: 'የመስኖ ቀኖችንና መጠኑን ይመዝግቡ። ለመሬቱ ተስማሚ ዘዴዎችን በመጠቀም የውሃ ፍሰትንና የአፈር መሸርሸርን ይቀንሱ፤ ውሃ ሲያንስ በውሃ ላይ በጣም ለሚመረኮዙ የሰብል ደረጃዎች ቅድሚያ ይስጡ።',
    pestCareTitle: 'ተባይና በሽታን ይከታተሉ',
    pestCareText: 'መስኮችን በየጊዜው ይመርምሩ፤ ምልክቶች የት እንደታዩ ይመዝግቡ። በመከላከልና በአካባቢው በሚመከር የተቀናጀ የተባይ አስተዳደር ይጀምሩ፤ የተመዘገቡ መድኃኒቶችን በመመሪያው መሠረትና መከላከያ በመልበስ ብቻ ይጠቀሙ።',
    seasonChecklistTitle: 'ቀላል የወቅት የሥራ ዝርዝር',
    beforePlantingTitle: 'ከመዝራት በፊት',
    beforePlantingText: 'ዕቅዱን ይከልሱ፣ ዘርና ግብዓቶችን ያረጋግጡ፣ መስክና መሣሪያዎችን ያዘጋጁ።',
    plantingTitle: 'በመዝራት ጊዜ',
    plantingText: 'በአካባቢው የተመከረውን ጊዜ፣ ርቀትና የመዝራት ጥልቀት ይከተሉ።',
    growingTitle: 'በእድገት ወቅት',
    growingText: 'እርጥበትን፣ አረምን፣ የሰብል ጤናንና የተባይ ምልክቶችን ይመልከቱ፤ ሥራና ወጪን ይመዝግቡ።',
    harvestTitle: 'መከርና ማከማቻ',
    harvestText: 'ሰብሉ በተገቢው የብስለት ደረጃ ላይ ሲደርስ ይሰብስቡ፤ በደህና አድርቀው ያከማቹ፤ መጠኑንና ሽያጩን ይመዝግቡ።',
    farmRecordsTitle: 'ውሳኔን የሚያግዙ መዝገቦችን ይያዙ',
    farmRecordsText: 'ሰብል፣ መስክ፣ ቀን፣ የግብዓት ዓይነትና መጠን፣ የምርት መጠን፣ ሽያጭና ወጪን ይመዝግቡ። ተከታታይ መዝገቦች ሰብሎችን ለማነፃፀርና ቀጣዩን ወቅት ለማቀድ ይረዳሉ።',
    backToRecords: 'ወደ የእርሻ መዝገቦች ይሂዱ',
    authEyebrow: 'የእርሻ አስተዳደር',
    authHeadline: 'የእርሻ ሥራዎን በአንድ ቦታ ያስተዳድሩ።',
    authDescription: 'የእርሻ አፈጻጸምን ለመመልከት፣ የመስክ ግብዓቶችና ምርቶችን ለመመዝገብ እና ቀጣዩን ወቅት ለማቀድ ይግቡ።',
    authSecureNote: 'የይለፍ ቃላት በhash ይጠበቃሉ፤ ክፍለ ጊዜዎችም ደህንነቱ በተጠበቀ ኩኪ ይጠቀማሉ።',
    authLoginTitle: 'ወደ እርሻዎ ይግቡ',
    authRegisterTitle: 'የእርሻ መለያ ይፍጠሩ',
    authLoginDescription: 'ለመቀጠል ኢሜይልዎንና የይለፍ ቃልዎን ያስገቡ።',
    authRegisterDescription: 'የእርሻ ዳሽቦርድዎን ለመጠቀም መለያ ይፍጠሩ።',
    authEmailLabel: 'የኢሜይል አድራሻ',
    authPasswordLabel: 'የይለፍ ቃል',
    authSignInButton: 'ይግቡ',
    authNameLabel: 'ሙሉ ስም',
    authPasswordHint: 'ቢያንስ 12 ቁምፊዎችን ይጠቀሙ።',
    authConfirmPasswordLabel: 'የይለፍ ቃሉን ያረጋግጡ',
    authCreateButton: 'መለያ ይፍጠሩ',
    authNeedAccount: 'በAgriProfit አዲስ ነዎት?',
    authHaveAccount: 'መለያ አለዎት?',
    authCreateAccount: 'መለያ ይፍጠሩ',
    authSignInLink: 'ይግቡ',
    authLocalDataNote: 'የእርሻ ግቤቶች አሁን በዚህ አሳሽ ውስጥ ይቀመጣሉ፤ በመሣሪያዎች መካከል አይመሳሰሉም።',
    authSignOut: 'ውጣ',
    authNetworkError: 'የማረጋገጫ ሰርቨሩ ምላሽ አይሰጥም። ሰርቨሩን አስነስተው http://localhost:3000 ይክፈቱ።',
    authOpenThroughServer: 'ይህ ገጽ እንደ ፋይል ተከፍቷል። ለመግባት ሰርቨሩን አስነስተው http://localhost:3000 ይክፈቱ።',
    authInvalidName: 'ስምዎን ያስገቡ (እስከ 150 ቁምፊዎች).',
    authInvalidEmail: 'ትክክለኛ የኢሜይል አድራሻ ያስገቡ።',
    authInvalidPassword: 'የይለፍ ቃሉ ከ12 እስከ 128 ቁምፊዎች መሆን አለበት።',
    authEmailInUse: 'በዚህ ኢሜይል አድራሻ መለያ አስቀድሞ አለ።',
    authInvalidCredentials: 'ኢሜይሉ ወይም የይለፍ ቃሉ ትክክል አይደለም።',
    authRateLimited: 'ብዙ ጊዜ ሞክረዋል። ጥቂት ደቂቃዎች ይጠብቁና እንደገና ይሞክሩ።',
    authServerError: 'ሰርቨሩ ጥያቄዎን ማጠናቀቅ አልቻለም። በቅርቡ እንደገና ይሞክሩ።',
    authInvalidOrigin: 'ጥያቄው አልተቀበለም። ገጹን ያድሱና እንደገና ይሞክሩ።',
    authPasswordsMismatch: 'የይለፍ ቃሎቹ አይዛመዱም።'
  }
};

// Available Categories
const CATEGORIES = {
  income: [
    "Crop Sales",
    "Livestock Sales",
    "Government Subsidy",
    "Crop Insurance Payout",
    "Pasture Leasing",
    "Equipment Rental",
    "Custom Work / Contract",
    "Agritourism",
    "Other Income"
  ],
  expense: [
    "Seeds & Seedlings",
    "Fertilizer & Lime",
    "Chemicals & Protection",
    "Hired Labor",
    "Fuel & Diesel",
    "Equipment Maintenance",
    "Land Rent",
    "Water & Irrigation",
    "Livestock Feed & Vet",
    "Storage & Drying",
    "Crop Insurance",
    "Property Taxes",
    "Utilities",
    "Interest & Loans",
    "Other Operating Expense"
  ]
};

// Available Enterprises
const ENTERPRISES = [
  "Corn",
  "Soybeans",
  "Wheat",
  "Beef Cattle",
  "Hay / Alfalfa",
  "Dairy",
  "General Farm Overhead"
];


// --- UI INITIALIZATION & EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
  // Check daylight high contrast preference
  if (localStorage.getItem('agriprofit_high_contrast') === 'true') {
    state.highContrastMode = true;
    document.documentElement.classList.add('high-contrast');
  }

  bindLanguageButtons();
  bindViewButtons();
  bindAuthForms();
  applyLanguage(state.language);

  // Populate Categories & Enterprises in Add Form
  populateFormOptions();

  // Set default transaction date to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('txDate');
  if (dateInput) dateInput.value = today;

  // Bind Form Listeners
  setupFormEventListeners();

  // Bind Filter & Search Listeners
  setupFilterListeners();

  restoreAuthSession();
});


async function restoreAuthSession() {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
    if (response.ok) {
      const result = await response.json();
      if (result.user) {
        activateAuthenticatedApp(result.user);
        return;
      }
    }
  } catch (error) {
    // Backend server is offline or unreachable; silently check for local session
  }

  // Check for saved local browser session
  try {
    const localSession = localStorage.getItem('agriprofit_active_session');
    if (localSession) {
      const user = JSON.parse(localSession);
      if (user && user.id) {
        activateAuthenticatedApp(user);
        return;
      }
    }
  } catch (e) {
    // Ignore localStorage parse errors
  }
}


function bindAuthForms() {
  document.getElementById('authSwitchButton').addEventListener('click', () => {
    setAuthMode(state.authMode === 'register' ? 'login' : 'register');
  });

  document.getElementById('loginForm').addEventListener('submit', event => handleAuthSubmit(event, 'login'));
  document.getElementById('registerForm').addEventListener('submit', event => handleAuthSubmit(event, 'register'));
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}


function setAuthMode(mode) {
  state.authMode = mode;
  updateAuthModeLabels();
  hideAuthMessage();
}


function updateAuthModeLabels() {
  const registering = state.authMode === 'register';
  document.getElementById('loginForm').classList.toggle('hidden', registering);
  document.getElementById('registerForm').classList.toggle('hidden', !registering);
  document.getElementById('authFormTitle').textContent = getText(registering ? 'authRegisterTitle' : 'authLoginTitle');
  document.getElementById('authFormDescription').textContent = getText(registering ? 'authRegisterDescription' : 'authLoginDescription');
  document.getElementById('authSwitchPrompt').textContent = getText(registering ? 'authHaveAccount' : 'authNeedAccount');
  document.getElementById('authSwitchButton').textContent = getText(registering ? 'authSignInLink' : 'authCreateAccount');
  if (state.authMessageKey) {
    document.getElementById('authMessage').textContent = getText(state.authMessageKey);
  }
}


async function handleAuthSubmit(event, mode) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const password = formData.get('password') || '';
  const email = (formData.get('email') || '').trim().toLowerCase();
  const fullName = (formData.get('fullName') || '').trim();

  if (mode === 'register') {
    if (!fullName || fullName.length > 150) {
      showAuthMessage('authInvalidName');
      return;
    }
    if (password.length < 12 || password.length > 128) {
      showAuthMessage('authInvalidPassword');
      return;
    }
    if (password !== formData.get('passwordConfirm')) {
      showAuthMessage('authPasswordsMismatch');
      return;
    }
  }

  const requestBody = { email, password };
  if (mode === 'register') {
    requestBody.fullName = fullName;
  }

  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  submitButton.setAttribute('aria-busy', 'true');
  hideAuthMessage();

  let serverHandled = false;
  try {
    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    serverHandled = true;
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'SERVER_ERROR');
    form.reset();
    activateAuthenticatedApp(result.user);
  } catch (error) {
    if (serverHandled) {
      const errorKeys = {
        INVALID_NAME: 'authInvalidName',
        INVALID_EMAIL: 'authInvalidEmail',
        INVALID_PASSWORD: 'authInvalidPassword',
        EMAIL_IN_USE: 'authEmailInUse',
        INVALID_CREDENTIALS: 'authInvalidCredentials',
        RATE_LIMITED: 'authRateLimited',
        INVALID_ORIGIN: 'authInvalidOrigin',
        SERVER_ERROR: 'authServerError'
      };
      showAuthMessage(errorKeys[error.message] || 'authServerError');
    } else {
      // Server unreachable; fall back to local browser storage authentication
      handleLocalAuthFallback(mode, { fullName, email, password, form });
    }
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute('aria-busy');
  }
}


function handleLocalAuthFallback(mode, { fullName, email, password, form }) {
  let localUsers = [];
  try {
    localUsers = JSON.parse(localStorage.getItem('agriprofit_registered_users') || '[]');
  } catch (e) {
    localUsers = [];
  }

  if (mode === 'register') {
    const existing = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      showAuthMessage('authEmailInUse');
      return;
    }
    const newUser = {
      id: 'local_' + Date.now(),
      fullName: fullName,
      email: email,
      password: password
    };
    localUsers.push(newUser);
    localStorage.setItem('agriprofit_registered_users', JSON.stringify(localUsers));

    const userSession = { id: newUser.id, fullName: newUser.fullName, email: newUser.email };
    localStorage.setItem('agriprofit_active_session', JSON.stringify(userSession));
    form.reset();
    activateAuthenticatedApp(userSession);
    showToastNotification('Account created successfully (Local Storage Mode)');
  } else {
    // Login mode
    const user = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      // Also allow a default demo sign in if no accounts exist yet
      if (localUsers.length === 0 && email && password.length >= 12) {
        const demoUser = {
          id: 'local_demo',
          fullName: email.split('@')[0],
          email: email
        };
        localStorage.setItem('agriprofit_active_session', JSON.stringify(demoUser));
        form.reset();
        activateAuthenticatedApp(demoUser);
        showToastNotification('Signed in successfully');
        return;
      }
      showAuthMessage('authInvalidCredentials');
      return;
    }
    const userSession = { id: user.id, fullName: user.fullName, email: user.email };
    localStorage.setItem('agriprofit_active_session', JSON.stringify(userSession));
    form.reset();
    activateAuthenticatedApp(userSession);
    showToastNotification('Signed in successfully');
  }
}


async function handleLogout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin'
    }).catch(() => {});
  } catch (error) {
    // Ignore server error on logout
  }
  localStorage.removeItem('agriprofit_active_session');
  state.user = null;
  state.transactions = [];
  state.transactionStorageKey = null;
  document.getElementById('appShell').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  setAuthMode('login');
}


function activateAuthenticatedApp(user) {
  state.user = user;
  state.transactionStorageKey = `agriprofit_transactions_${user.id}`;
  let savedTransactions = localStorage.getItem(state.transactionStorageKey);
  if (!savedTransactions) {
    savedTransactions = localStorage.getItem('agriprofit_transactions');
    if (savedTransactions) localStorage.removeItem('agriprofit_transactions');
  }

  try {
    const parsedTransactions = savedTransactions ? JSON.parse(savedTransactions) : null;
    state.transactions = Array.isArray(parsedTransactions)
      ? parsedTransactions
      : structuredClone(INITIAL_DEMO_TRANSACTIONS);
  } catch (error) {
    state.transactions = structuredClone(INITIAL_DEMO_TRANSACTIONS);
  }

  document.getElementById('currentUserName').textContent = user.fullName;
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  saveState();
  renderDashboard();
}


function showAuthMessage(key) {
  state.authMessageKey = key;
  const message = document.getElementById('authMessage');
  message.textContent = getText(key);
  message.classList.remove('hidden');
}


function hideAuthMessage() {
  state.authMessageKey = null;
  const message = document.getElementById('authMessage');
  message.textContent = '';
  message.classList.add('hidden');
}


function populateFormOptions() {
  const typeRadio = document.querySelector('input[name="txType"]:checked');
  const txType = typeRadio ? typeRadio.value : 'income';
  const categorySelect = document.getElementById('txCategory');
  const cropSelect = document.getElementById('txCrop');

  if (categorySelect) {
    categorySelect.innerHTML = CATEGORIES[txType]
      .map(cat => `<option value="${cat}">${cat}</option>`)
      .join('');
  }

  if (cropSelect) {
    cropSelect.innerHTML = `
      <option value="">General Overhead (No Specific Crop)</option>
      ${ENTERPRISES.filter(e => e !== "General Farm Overhead").map(e => `<option value="${e}">${e}</option>`).join('')}
    `;
  }
}


function setupFormEventListeners() {
  // Switch category list when toggling Income / Expense
  document.querySelectorAll('input[name="txType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      populateFormOptions();
      updateFormTypeStyles();
    });
  });

  // Handle Form Submission
  const form = document.getElementById('transactionForm');
  if (form) {
    form.addEventListener('submit', handleAddTransaction);
  }

  // Live calculation preview while typing amount in form
  const amountInput = document.getElementById('txAmount');
  if (amountInput) {
    amountInput.addEventListener('input', () => {
      // Dynamic visual indicator on amount input
      const val = parseFloat(amountInput.value);
      const isNegative = val < 0;
      if (isNegative) amountInput.value = 0;
    });
  }

  // Daylight High Contrast Toggle
  const contrastBtn = document.getElementById('toggleContrastBtn');
  if (contrastBtn) {
    contrastBtn.addEventListener('click', toggleHighContrastMode);
  }

  // Year Selector
  const yearSelect = document.getElementById('yearSelector');
  if (yearSelect) {
    yearSelect.value = state.selectedYear;
    yearSelect.addEventListener('change', (e) => {
      state.selectedYear = parseInt(e.target.value, 10);
      renderDashboard();
    });
  }

  // Reset Demo Data
  const resetBtn = document.getElementById('resetDataBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm(getText('resetConfirmation'))) {
        state.transactions = [...INITIAL_DEMO_TRANSACTIONS];
        saveState();
        renderDashboard();
      }
    });
  }

  // Export CSV
  const exportBtn = document.getElementById('exportCsvBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToCSV);
  }
}


function setupFilterListeners() {
  // Search Bar
  const searchInput = document.getElementById('searchQuery');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderTransactionList();
    });
  }

  // Filter Buttons (All / Income / Expense)
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active-filter'));
      btn.classList.add('active-filter');
      state.filterType = btn.getAttribute('data-filter');
      renderTransactionList();
    });
  });
}


function updateFormTypeStyles() {
  const isIncome = document.querySelector('input[name="txType"]:checked').value === 'income';
  const labelIncome = document.getElementById('labelTypeIncome');
  const labelExpense = document.getElementById('labelTypeExpense');
  const submitBtn = document.getElementById('submitTxBtn');

  if (isIncome) {
    labelIncome.className = "flex-1 py-3 text-center text-sm font-bold uppercase tracking-wider rounded-lg border-2 border-emerald-600 bg-emerald-600 text-white cursor-pointer shadow-sm transition-all";
    labelExpense.className = "flex-1 py-3 text-center text-sm font-bold uppercase tracking-wider rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 cursor-pointer hover:border-rose-400 transition-all";
    submitBtn.className = "w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-base uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2";
    submitBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
      ${getText('recordIncomeEntry')}
    `;
  } else {
    labelIncome.className = "flex-1 py-3 text-center text-sm font-bold uppercase tracking-wider rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 cursor-pointer hover:border-emerald-400 transition-all";
    labelExpense.className = "flex-1 py-3 text-center text-sm font-bold uppercase tracking-wider rounded-lg border-2 border-rose-600 bg-rose-600 text-white cursor-pointer shadow-sm transition-all";
    submitBtn.className = "w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-base uppercase tracking-wider rounded-xl shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center gap-2";
    submitBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
      ${getText('recordExpenseEntry')}
    `;
  }
}


function handleAddTransaction(e) {
  e.preventDefault();

  const type = document.querySelector('input[name="txType"]:checked').value;
  const amount = parseFloat(document.getElementById('txAmount').value);
  const category = document.getElementById('txCategory').value;
  const crop = document.getElementById('txCrop').value || null;
  const date = document.getElementById('txDate').value;
  const notes = document.getElementById('txNotes').value.trim();

  const inputType = document.getElementById('txInputType').value;
  const inputQty = parseFloat(document.getElementById('txInputQty').value);
  const inputUnit = document.getElementById('txInputUnit').value;

  const outputType = document.getElementById('txOutputType').value;
  const outputQty = parseFloat(document.getElementById('txOutputQty').value);
  const outputUnit = document.getElementById('txOutputUnit').value;

  if (!amount || amount <= 0) {
    alert("Please enter a valid transaction amount greater than 0.");
    document.getElementById('txAmount').focus();
    return;
  }

  if (!date) {
    alert("Please pick a transaction date.");
    return;
  }

  const inputRequirement = inputType || inputQty || inputUnit
    ? {
        type: inputType || 'Other',
        quantity: Number.isFinite(inputQty) ? inputQty : null,
        unit: inputUnit || ''
      }
    : null;

  const outputProduction = outputType || outputQty || outputUnit
    ? {
        type: outputType || crop || 'Crop Output',
        quantity: Number.isFinite(outputQty) ? outputQty : null,
        unit: outputUnit || ''
      }
    : null;

  const newTx = {
    id: Date.now(),
    type,
    amount: Math.round(amount * 100) / 100,
    category,
    crop_type: crop,
    date,
    input_requirement: inputRequirement,
    output_production: outputProduction,
    notes: notes || `${type === 'income' ? 'Received from' : 'Paid for'} ${category}`
  };

  // Prepend new transaction
  state.transactions.unshift(newTx);
  saveState();

  // Reset inputs
  document.getElementById('txAmount').value = '';
  document.getElementById('txNotes').value = '';
  document.getElementById('txInputType').value = '';
  document.getElementById('txInputQty').value = '';
  document.getElementById('txInputUnit').value = '';
  document.getElementById('txOutputType').value = '';
  document.getElementById('txOutputQty').value = '';
  document.getElementById('txOutputUnit').value = '';

  // Trigger flash confirmation
  showToastNotification(`Successfully added $${amount.toLocaleString()} ${type} entry!`);

  // Instant dynamic recalculation
  renderDashboard();
}


function deleteTransaction(id) {
  if (confirm(getText('deleteConfirmation'))) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    renderDashboard();
    showToastNotification(getText('transactionDeleted'));
  }
}


function saveState() {
  if (!state.transactionStorageKey) return;
  localStorage.setItem(state.transactionStorageKey, JSON.stringify(state.transactions));
}


function toggleHighContrastMode() {
  state.highContrastMode = !state.highContrastMode;
  localStorage.setItem('agriprofit_high_contrast', state.highContrastMode);
  
  if (state.highContrastMode) {
    document.documentElement.classList.add('high-contrast');
    showToastNotification("Daylight Outdoor Mode Enabled (WCAG AAA Contrast)");
  } else {
    document.documentElement.classList.remove('high-contrast');
    showToastNotification("Standard High-End Theme Enabled");
  }

  // Refresh chart colors for daylight contrast
  renderChart(calculateFarmAnnualSummary(state.transactions, state.selectedYear));
}


function bindLanguageButtons() {
  document.querySelectorAll('.lang-btn').forEach(button => {
    button.addEventListener('click', () => {
      const lang = button.dataset.langBtn;
      state.language = lang;
      localStorage.setItem('agriprofit_language', lang);
      applyLanguage(lang);
    });
  });
}

function bindViewButtons() {
  document.querySelectorAll('[data-view-target]').forEach(button => {
    button.addEventListener('click', () => setActiveView(button.dataset.viewTarget));
  });
}

function setActiveView(view) {
  const showGuide = view === 'guide';
  document.getElementById('dashboardView').classList.toggle('hidden', showGuide);
  document.getElementById('agricultureGuideView').classList.toggle('hidden', !showGuide);

  document.querySelectorAll('.view-tab').forEach(button => {
    const isActive = button.dataset.viewTarget === view;
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
    button.classList.toggle('border-emerald-600', isActive);
    button.classList.toggle('text-emerald-700', isActive);
    button.classList.toggle('dark:text-emerald-400', isActive);
    button.classList.toggle('border-transparent', !isActive);
    button.classList.toggle('text-slate-500', !isActive);
    button.classList.toggle('dark:text-slate-400', !isActive);
  });
}

function getText(key) {
  const current = translations[state.language] || translations.en;
  return current[key] || translations.en[key] || key;
}

function applyLanguage(lang) {
  state.language = lang;
  const selectedTranslations = translations[lang] || translations.en;
  document.documentElement.lang = lang === 'om' ? 'om' : lang === 'am' ? 'am' : 'en';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (selectedTranslations[key]) {
      el.textContent = selectedTranslations[key];
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (selectedTranslations[key]) {
      el.setAttribute('placeholder', selectedTranslations[key]);
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.dataset.i18nTitle;
    if (selectedTranslations[key]) {
      el.setAttribute('title', selectedTranslations[key]);
    }
  });

  document.querySelectorAll('.lang-btn').forEach(btn => {
    const isActive = btn.dataset.langBtn === lang;
    btn.classList.toggle('bg-white', isActive && lang === 'en');
    btn.classList.toggle('dark:bg-slate-900', isActive && lang === 'en');
    btn.classList.toggle('bg-emerald-500', isActive && lang !== 'en');
    btn.classList.toggle('text-white', isActive);
    btn.classList.toggle('text-slate-600', !isActive);
    btn.classList.toggle('dark:text-slate-300', !isActive);
    btn.classList.toggle('shadow-sm', isActive);
  });

  const yearSelect = document.getElementById('yearSelector');
  if (yearSelect) {
    const selectedValue = yearSelect.value || state.selectedYear;
    yearSelect.value = selectedValue;
    const yearLabel = selectedValue ? `${getText('selectYear')} ${selectedValue}` : getText('selectYear');
    yearSelect.setAttribute('aria-label', yearLabel);
  }

  const searchInput = document.getElementById('searchQuery');
  if (searchInput && !searchInput.dataset.i18nPlaceholder) {
    searchInput.placeholder = getText('searchPlaceholder');
  }

  const submitBtn = document.getElementById('submitTxBtn');
  if (submitBtn) {
    updateFormTypeStyles();
  }

  updateAuthModeLabels();
}

function showToastNotification(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('opacity-0', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-4');
    toast.classList.remove('opacity-100', 'translate-y-0');
  }, 3000);
}


// --- MAIN RENDERING DISPATCHER ---
function renderDashboard() {
  // 1. Run Core Calculation Logic
  const summary = calculateFarmAnnualSummary(state.transactions, state.selectedYear);

  // 2. Update Top Metric KPI Cards
  updateKpiCards(summary);

  // 3. Update executive summary and recommendations
  updateExecutiveSummary(summary);

  // 4. Update agriculture operation insights
  updateAgricultureInsights(summary);

  // 5. Update Insight Highlights
  updateInsights(summary);

  // 6. Update Crop Enterprise Breakdown
  updateCropBreakdown(summary);

  // 7. Update Expense Category Breakdown Progress Bars
  updateCategoryBreakdown(summary);

  // 8. Update Monthly Income vs. Expense Chart
  renderChart(summary);

  // 9. Render Transaction Ledger List
  renderTransactionList();
}


function updateKpiCards(summary) {
  // Income
  const elIncome = document.getElementById('kpiTotalIncome');
  if (elIncome) elIncome.textContent = formatCurrency(summary.totalIncome);

  // Expenses
  const elExpenses = document.getElementById('kpiTotalExpenses');
  if (elExpenses) elExpenses.textContent = formatCurrency(summary.totalExpenses);

  // Net Profit
  const elNetProfit = document.getElementById('kpiNetProfit');
  const elProfitBadge = document.getElementById('kpiProfitBadge');
  if (elNetProfit) {
    elNetProfit.textContent = formatCurrency(summary.netProfit);
    if (summary.netProfit >= 0) {
      elNetProfit.className = "text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight";
      if (elProfitBadge) {
        elProfitBadge.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800";
        elProfitBadge.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg> ${getText('netSurplus')}`;
      }
    } else {
      elNetProfit.className = "text-3xl md:text-4xl font-black text-rose-600 dark:text-rose-400 tracking-tight";
      if (elProfitBadge) {
        elProfitBadge.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800";
        elProfitBadge.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg> ${getText('netDeficit')}`;
      }
    }
  }

  // Margin %
  const elMargin = document.getElementById('kpiProfitMargin');
  const elMarginBar = document.getElementById('kpiMarginProgress');
  if (elMargin) {
    elMargin.textContent = `${summary.profitMarginPercentage.toFixed(1)}%`;
  }
  if (elMarginBar) {
    const clampedWidth = Math.max(0, Math.min(100, summary.profitMarginPercentage));
    elMarginBar.style.width = `${clampedWidth}%`;
    elMarginBar.className = summary.profitMarginPercentage >= 20
      ? "h-full bg-emerald-500 transition-all duration-500 rounded-full"
      : summary.profitMarginPercentage >= 0
      ? "h-full bg-amber-500 transition-all duration-500 rounded-full"
      : "h-full bg-rose-500 transition-all duration-500 rounded-full";
  }
}


function updateExecutiveSummary(summary) {
  const healthStatus = document.getElementById('seasonHealthStatus');
  const summaryValue = document.getElementById('seasonSummaryValue');
  const focusRecommendation = document.getElementById('focusRecommendation');
  const cashFlowNote = document.getElementById('cashFlowNote');
  const targetProgress = document.getElementById('seasonTargetProgress');
  const targetLabel = document.getElementById('seasonTargetLabel');

  if (!healthStatus || !summaryValue || !focusRecommendation || !cashFlowNote || !targetProgress || !targetLabel) {
    return;
  }

  const margin = summary.profitMarginPercentage;
  const targetMargin = 25;
  const targetProgressValue = Math.min(100, (margin / targetMargin) * 100);

  if (margin >= 25) {
    healthStatus.textContent = getText('strongSeasonalPerformance');
    summaryValue.textContent = `${margin.toFixed(1)}%`;
    focusRecommendation.textContent = getText('maintainInputDiscipline');
    cashFlowNote.textContent = getText('cashFlowAhead');
    targetProgress.className = 'h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500';
  } else if (margin >= 10) {
    healthStatus.textContent = getText('healthyNeedsOptimization');
    summaryValue.textContent = `${margin.toFixed(1)}%`;
    focusRecommendation.textContent = getText('reduceInputCosts');
    cashFlowNote.textContent = getText('marginsSteady');
    targetProgress.className = 'h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500';
  } else {
    healthStatus.textContent = getText('marginPressure');
    summaryValue.textContent = `${margin.toFixed(1)}%`;
    focusRecommendation.textContent = getText('reviewCosts');
    cashFlowNote.textContent = getText('expenseLoadHigh');
    targetProgress.className = 'h-full bg-gradient-to-r from-rose-500 to-red-400 rounded-full transition-all duration-500';
  }

  targetProgress.style.width = `${Math.max(5, targetProgressValue)}%`;
  targetLabel.textContent = `${Math.min(100, targetProgressValue).toFixed(0)}% of target`;
}


function updateAgricultureInsights(summary) {
  const yieldForecastEl = document.getElementById('fieldYieldForecast');
  const waterPlanEl = document.getElementById('waterPlan');
  const inputEfficiencyEl = document.getElementById('inputEfficiency');
  const riskAlertEl = document.getElementById('riskAlert');

  if (!yieldForecastEl || !waterPlanEl || !inputEfficiencyEl || !riskAlertEl) return;

  const outputEntries = state.transactions
    .filter(tx => tx.output_production && Number.isFinite(Number(tx.output_production.quantity)))
    .map(tx => ({
      quantity: Number(tx.output_production.quantity),
      unit: tx.output_production.unit || 'units',
      type: tx.output_production.type || 'Crop'
    }));

  const totalOutput = outputEntries.reduce((sum, item) => sum + item.quantity, 0);
  const waterEntries = state.transactions.filter(tx => {
    const val = tx.input_requirement ? tx.input_requirement.type : '';
    const category = tx.category ? tx.category.toLowerCase() : '';
    return val.toLowerCase().includes('water') || category.includes('water') || category.includes('irrigation');
  });

  const waterQty = waterEntries.reduce((sum, tx) => {
    const qty = tx.input_requirement && Number.isFinite(Number(tx.input_requirement.quantity)) ? Number(tx.input_requirement.quantity) : 0;
    return sum + qty;
  }, 0);

  const topExpenseCategory = summary.highestExpenseCategory ? summary.highestExpenseCategory.category : null;
  const fertilizerShare = summary.expensesByCategory && topExpenseCategory && summary.expensesByCategory[topExpenseCategory]
    ? summary.expensesByCategory[topExpenseCategory].percentage
    : 0;

  if (totalOutput > 0) {
    yieldForecastEl.textContent = `${totalOutput.toFixed(1)} ${outputEntries[0]?.unit || 'units'}`;
  } else {
    yieldForecastEl.textContent = getText('addYieldData');
  }

  if (waterQty > 0) {
    waterPlanEl.textContent = `${waterQty.toFixed(1)} ${waterEntries[0]?.input_requirement?.unit || 'units'}`;
  } else {
    waterPlanEl.textContent = getText('monitorMoisture');
  }

  if (fertilizerShare > 30) {
    inputEfficiencyEl.textContent = getText('lowEfficiency');
  } else if (fertilizerShare > 18) {
    inputEfficiencyEl.textContent = getText('moderateEfficiency');
  } else {
    inputEfficiencyEl.textContent = getText('healthyEfficiency');
  }

  if (summary.netProfit < 0 || fertilizerShare > 30) {
    riskAlertEl.textContent = getText('actionNeeded');
  } else if (summary.profitMarginPercentage < 15) {
    riskAlertEl.textContent = getText('watchClosely');
  } else {
    riskAlertEl.textContent = getText('noMajorIssues');
  }

  const checklist = document.getElementById('fieldChecklistList');
  if (checklist) {
    const items = [
      summary.netProfit >= 0 ? getText('soilStatusManagable') : getText('reviewInputCosts'),
      waterQty > 0 ? getText('irrigationAvailable') : getText('addIrrigation'),
      fertilizerShare > 25 ? getText('highInputPressure') : getText('inputWithinRange'),
      summary.profitMarginPercentage >= 20 ? getText('productionMixGood') : getText('rebalanceCropMix')
    ];

    checklist.innerHTML = items.map((item, index) => {
      const colors = ['emerald', 'sky', 'amber', 'rose'];
      return `<li class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"><span class="w-2.5 h-2.5 rounded-full bg-${colors[index]}-500"></span>${item}</li>`;
    }).join('');
  }
}


function updateInsights(summary) {
  // Most Profitable Crop
  const elTopCrop = document.getElementById('insightTopCrop');
  const elTopCropStats = document.getElementById('insightTopCropStats');
  if (elTopCrop && elTopCropStats) {
    if (summary.mostProfitableCrop) {
      elTopCrop.textContent = summary.mostProfitableCrop.crop;
      elTopCropStats.textContent = `+${formatCurrency(summary.mostProfitableCrop.netProfit)} profit (${summary.mostProfitableCrop.marginPercentage}% margin)`;
    } else {
      elTopCrop.textContent = getText('noneRecorded');
      elTopCropStats.textContent = getText('addCropTaggedIncome');
    }
  }

  // Highest Expense Category
  const elTopExpense = document.getElementById('insightTopExpense');
  const elTopExpenseStats = document.getElementById('insightTopExpenseStats');
  if (elTopExpense && elTopExpenseStats) {
    if (summary.highestExpenseCategory) {
      elTopExpense.textContent = summary.highestExpenseCategory.category;
      const expenseItem = summary.expensesByCategory[summary.highestExpenseCategory.category];
      const pct = expenseItem ? expenseItem.percentage : 0;
      elTopExpenseStats.textContent = `${formatCurrency(summary.highestExpenseCategory.amount)} (${pct}% of all expenses)`;
    } else {
      elTopExpense.textContent = getText('noneRecorded');
      elTopExpenseStats.textContent = getText('noExpensesLogged');
    }
  }
}


function updateCropBreakdown(summary) {
  const container = document.getElementById('cropBreakdownList');
  if (!container) return;

  if (summary.cropPerformance.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-slate-500 dark:text-slate-400">
        <p class="font-medium">${getText('noEnterpriseTransactions')} ${state.selectedYear}.</p>
        <p class="text-xs mt-1 text-slate-400">${getText('assignCropsPrompt')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = summary.cropPerformance.map(crop => {
    const isProfitable = crop.netProfit >= 0;
    const profitColorClass = isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
    const marginBadgeClass = isProfitable 
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
      : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";

    return `
      <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-emerald-500/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300/40">
            ${crop.crop.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 class="font-bold text-slate-900 dark:text-white text-base">${crop.crop}</h4>
            <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Rev: <strong class="text-slate-700 dark:text-slate-300">${formatCurrency(crop.revenue)}</strong></span>
              <span>•</span>
              <span>Exp: <strong class="text-slate-700 dark:text-slate-300">${formatCurrency(crop.expenses)}</strong></span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 dark:border-slate-800">
          <div class="text-right">
            <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Profit</div>
            <div class="font-extrabold text-lg ${profitColorClass}">
              ${crop.netProfit >= 0 ? '+' : ''}${formatCurrency(crop.netProfit)}
            </div>
          </div>
          <div class="px-3 py-1 rounded-lg border text-xs font-black tracking-wide ${marginBadgeClass}">
            ${crop.marginPercentage}% Margin
          </div>
        </div>
      </div>
    `;
  }).join('');
}


function updateCategoryBreakdown(summary) {
  const container = document.getElementById('expenseCategoryList');
  if (!container) return;

  const entries = Object.entries(summary.expensesByCategory).sort((a, b) => b[1].amount - a[1].amount);

  if (entries.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 p-4 text-center">${getText('noExpensesRecorded')}</p>`;
    return;
  }

  container.innerHTML = entries.map(([category, data]) => `
    <div class="space-y-1">
      <div class="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
        <span class="truncate max-w-[200px]">${category}</span>
        <span>${formatCurrency(data.amount)} <span class="text-slate-400 font-normal">(${data.percentage}%)</span></span>
      </div>
      <div class="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div class="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all duration-500" style="width: ${Math.min(100, data.percentage)}%"></div>
      </div>
    </div>
  `).join('');
}


function renderChart(summary) {
  const canvas = document.getElementById('monthlyChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (state.chartInstance) {
    state.chartInstance.destroy();
  }

  const isHighContrast = state.highContrastMode;
  const labels = summary.monthlyTrend.map(m => m.month);
  const incomeData = summary.monthlyTrend.map(m => m.income);
  const expenseData = summary.monthlyTrend.map(m => m.expense);

  // Daylight accessible palette
  const incomeColor = isHighContrast ? '#047857' : '#10b981';
  const expenseColor = isHighContrast ? '#b91c1c' : '#f43f5e';
  const gridColor = isHighContrast ? '#d1d5db' : 'rgba(148, 163, 184, 0.15)';
  const textColor = isHighContrast ? '#111827' : '#64748b';

  state.chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: getText('chartIncomeLabel'),
          data: incomeData,
          backgroundColor: incomeColor,
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        },
        {
          label: getText('chartExpenseLabel'),
          data: expenseData,
          backgroundColor: expenseColor,
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: textColor,
            font: { family: 'Inter', weight: 'bold', size: 12 },
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: 'Inter', weight: 'bold', size: 13 },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ETB ${context.raw.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: 'Inter', weight: '600' } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'Inter', weight: '600' },
            callback: function(value) {
              return value >= 1000 ? `ETB ${(value / 1000).toLocaleString()}k` : `ETB ${value}`;
            }
          }
        }
      }
    }
  });
}


function renderTransactionList() {
  const container = document.getElementById('transactionList');
  const countBadge = document.getElementById('txCountBadge');
  if (!container) return;

  // Filter by year, search, and type
  const filtered = state.transactions.filter(t => {
    // Year filter
    if (state.selectedYear && t.date) {
      const y = new Date(t.date).getFullYear();
      if (!isNaN(y) && y !== state.selectedYear) return false;
    }
    // Type filter
    if (state.filterType !== 'all' && t.type !== state.filterType) return false;
    // Search query
    if (state.searchQuery) {
      const q = state.searchQuery;
      const matchCat = (t.category || '').toLowerCase().includes(q);
      const matchCrop = (t.crop_type || '').toLowerCase().includes(q);
      const matchNotes = (t.notes || '').toLowerCase().includes(q);
      const matchAmount = String(t.amount).includes(q);
      const matchInput = (t.input_requirement && `${t.input_requirement.type || ''} ${t.input_requirement.unit || ''}`.toLowerCase().includes(q)) || false;
      const matchOutput = (t.output_production && `${t.output_production.type || ''} ${t.output_production.unit || ''}`.toLowerCase().includes(q)) || false;
      if (!matchCat && !matchCrop && !matchNotes && !matchAmount && !matchInput && !matchOutput) return false;
    }
    return true;
  });

  if (countBadge) countBadge.textContent = `${filtered.length} entries`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <svg class="w-12 h-12 mx-auto stroke-current mb-3 opacity-40" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <p class="font-bold text-slate-600 dark:text-slate-300">${getText('noTransactionsMatch')}</p>
        <p class="text-xs text-slate-400 mt-1">${getText('noTransactionsHint')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(tx => {
    const isIncome = tx.type === 'income';
    const sign = isIncome ? '+' : '-';
    const amountClass = isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
    const badgeBg = isIncome 
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' 
      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300';
    const typeIcon = isIncome 
      ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 11l5-5m0 0l5 5m-5-5v12"/>' 
      : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 13l-5 5m0 0l-5-5m5 5V6"/>';

    const inputInfo = tx.input_requirement && (tx.input_requirement.type || tx.input_requirement.quantity)
      ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">Input: ${tx.input_requirement.type || 'Resource'} ${tx.input_requirement.quantity ? tx.input_requirement.quantity : ''}${tx.input_requirement.unit ? ` ${tx.input_requirement.unit}` : ''}</span>`
      : '';

    const outputInfo = tx.output_production && (tx.output_production.type || tx.output_production.quantity)
      ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-900">Output: ${tx.output_production.type || 'Yield'} ${tx.output_production.quantity ? tx.output_production.quantity : ''}${tx.output_production.unit ? ` ${tx.output_production.unit}` : ''}</span>`
      : '';

    return `
      <div class="group px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 flex items-center justify-between gap-4 transition-all">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${badgeBg}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">${typeIcon}</svg>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-slate-900 dark:text-white text-sm truncate">${tx.category}</span>
              ${tx.crop_type ? `<span class="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">${tx.crop_type}</span>` : ''}
            </div>
            <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
              ${inputInfo}
              ${outputInfo}
            </div>
            <p class="text-xs text-slate-400 truncate max-w-xs md:max-w-md mt-1">${tx.notes || tx.date} • ${tx.date}</p>
          </div>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <div class="text-right">
            <div class="font-black text-base md:text-lg ${amountClass}">${sign}${formatCurrency(tx.amount)}</div>
          </div>
          <button onclick="deleteTransaction(${tx.id})" title="${getText('deleteEntry')}" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all opacity-70 group-hover:opacity-100">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}


// --- UTILITY FUNCTIONS ---
function formatCurrency(val) {
  const num = Number(val) || 0;
  return 'ETB ' + num.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


function exportToCSV() {
  const summary = calculateFarmAnnualSummary(state.transactions, state.selectedYear);
  const rows = [
    ["AGRI-PROFIT - Farm Financial Report", `Year: ${state.selectedYear}`],
    ["Total Annual Income", summary.totalIncome],
    ["Total Annual Expenses", summary.totalExpenses],
    ["Net Annual Profit", summary.netProfit],
    ["Profit Margin %", `${summary.profitMarginPercentage}%`],
    ["Most Profitable Crop", summary.mostProfitableCrop ? summary.mostProfitableCrop.crop : "N/A"],
    ["Highest Expense Category", summary.highestExpenseCategory ? summary.highestExpenseCategory.category : "N/A"],
    [],
    ["ID", "Date", "Type", "Category", "Enterprise / Crop", "Amount (ETB)", "Input Requirement", "Output / Yield", "Notes"]
  ];

  state.transactions.forEach(t => {
    rows.push([
      t.id,
      t.date,
      t.type,
      `"${t.category}"`,
      `"${t.crop_type || 'Overhead'}"`,
      t.amount,
      `"${(t.input_requirement && (t.input_requirement.type || t.input_requirement.quantity)) ? `${t.input_requirement.type || 'Resource'} ${t.input_requirement.quantity || ''}${t.input_requirement.unit ? ' ' + t.input_requirement.unit : ''}` : ''}"`,
      `"${(t.output_production && (t.output_production.type || t.output_production.quantity)) ? `${t.output_production.type || 'Yield'} ${t.output_production.quantity || ''}${t.output_production.unit ? ' ' + t.output_production.unit : ''}` : ''}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);
  });

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `farm_finances_${state.selectedYear}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

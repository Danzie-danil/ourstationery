// ═══════════════════════════════════════════════════════════════
//  MAIN APPLICATION ENTRY POINT
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabase.js';
import { db } from './database.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

let trendsChart = null;
let inventoryChart = null;

// ═══════════════════════════════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════════════════════════════

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const BASE_ITEM_CATS = ['Pens & Pencils','Notebooks','Paper','Files & Folders',
                        'Correction','Printing Supplies','Art Supplies','Office Supplies','Other'];

let currentUser = null;
let data = {
  inventory: [],
  capital: null,
  income: [],
  categories: [],
  sales: [],
  customers: [],
  incomeMonth: new Date().getMonth()
};

let subscriptions = [];
let saleItems = [];

// Dark mode state
let isDarkMode = localStorage.getItem('darkMode') === 'true';

window.toggleDarkMode = function() {
  isDarkMode = !isDarkMode;
  localStorage.setItem('darkMode', isDarkMode);
  updateDarkMode();
  renderTrendsChart();
  renderInventoryChart();
};

function updateDarkMode() {
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    if (sunIcon) sunIcon.style.display = 'none';
    if (moonIcon) moonIcon.style.display = 'block';
  } else {
    document.body.classList.remove('dark-mode');
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    if (sunIcon) sunIcon.style.display = 'block';
    if (moonIcon) moonIcon.style.display = 'none';
  }
}

// Pagination state
const ITEMS_PER_PAGE = 5;
let paginationState = {
  inventory: 1,
  sales: 1,
  dashboard: 1,
  income: 1,
  balance: 1,
  capital: 1,
  customers: 1
};

// Search state
let searchState = {
  inventory: '',
  sales: '',
  dashboard: '',
  income: '',
  balance: '',
  capital: '',
  customers: ''
};

// Sort state
let sortState = {
  inventory: { column: null, direction: 'asc' },
  sales: { column: null, direction: 'asc' },
  dashboard: { column: null, direction: 'asc' },
  income: { column: null, direction: 'asc' },
  balance: { column: null, direction: 'asc' },
  capital: { column: null, direction: 'asc' },
  customers: { column: null, direction: 'asc' }
};

// Search table function
window.searchTable = function(tableId, query) {
  searchState[tableId] = query.toLowerCase();
  paginationState[tableId] = 1;
  
  switch(tableId) {
    case 'inventory': renderInventory(); break;
    case 'sales': renderSales(); break;
    case 'dashboard': renderDashboard(); break;
    case 'income': renderIncome(); break;
    case 'balance': renderBalance(); break;
    case 'capital': renderCapital(); break;
    case 'customers': renderCustomers(); break;
  }
};

// Sort table function
window.sortTable = function(tableId, column) {
  if (sortState[tableId].column === column) {
    sortState[tableId].direction = sortState[tableId].direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortState[tableId].column = column;
    sortState[tableId].direction = 'asc';
  }
  
  switch(tableId) {
    case 'inventory': renderInventory(); break;
    case 'sales': renderSales(); break;
    case 'dashboard': renderDashboard(); break;
    case 'income': renderIncome(); break;
    case 'balance': renderBalance(); break;
    case 'capital': renderCapital(); break;
    case 'customers': renderCustomers(); break;
  }
};

// Generic sort function
function sortData(dataArray, tableId, columnMap) {
  const sort = sortState[tableId];
  if (!sort.column) return dataArray;
  
  return [...dataArray].sort((a, b) => {
    const key = columnMap[sort.column];
    let valA = typeof key === 'function' ? key(a) : a[key];
    let valB = typeof key === 'function' ? key(b) : b[key];
    
    // Handle numbers
    const numA = parseFloat(valA);
    const numB = parseFloat(valB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return sort.direction === 'asc' ? numA - numB : numB - numA;
    }
    
    // Handle strings
    valA = String(valA || '').toLowerCase();
    valB = String(valB || '').toLowerCase();
    if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Pagination utility function
function renderPaginationControls(totalItems, currentPage, tableId) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages <= 1) return '';
  
  let pagesHtml = '';
  for (let i = 1; i <= totalPages; i++) {
    pagesHtml += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : ''}" onclick="goToPage('${tableId}', ${i})">${i}</button>`;
  }
  
  return `
    <div style="display:flex;justify-content:center;align-items:center;gap:0.5rem;margin-top:1rem;">
      ${currentPage > 1 ? `<button class="btn btn-sm" onclick="goToPage('${tableId}', 1)">Start</button>` : ''}
      ${currentPage > 1 ? `<button class="btn btn-sm" onclick="goToPage('${tableId}', ${currentPage - 1})">← Prev</button>` : ''}
      <div style="display:flex;gap:0.3rem;">${pagesHtml}</div>
      ${currentPage < totalPages ? `<button class="btn btn-sm" onclick="goToPage('${tableId}', ${currentPage + 1})">Next →</button>` : ''}
      ${currentPage < totalPages ? `<button class="btn btn-sm" onclick="goToPage('${tableId}', ${totalPages})">End</button>` : ''}
    </div>
  `;
}

// Go to page function
window.goToPage = function(tableId, page) {
  if (paginationState[tableId] !== undefined) {
    paginationState[tableId] = page;
    switch(tableId) {
      case 'inventory': renderInventory(); break;
      case 'sales': renderSales(); break;
      case 'dashboard': renderDashboard(); break;
      case 'income': renderIncome(); break;
      case 'balance': renderBalance(); break;
      case 'capital': renderCapital(); break;
      case 'customers': renderCustomers(); break;
    }
  }
};

// Get paginated data
function getPaginatedData(dataArray, currentPage) {
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  return dataArray.slice(start, end);
}

// ═══════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════

async function init() {
  // Check if user is already logged in
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    await showMainApp();
  } else {
    showAuthScreen();
  }

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      showMainApp();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      showAuthScreen();
    }
  });
}

function showAuthScreen() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
  unsubscribeAll();
}

async function showMainApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  
  updateDarkMode();
  
  document.getElementById('dateDisplay').textContent =
    new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  
  await loadAllData();
  setupRealtimeSubscriptions();
  renderDashboard();
}

// ═══════════════════════════════════════════════════════════════
//  AUTHENTICATION
// ═══════════════════════════════════════════════════════════════

window.switchAuthTab = function(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  
  if (tab === 'login') {
    document.querySelector('.auth-tab:first-child').classList.add('active');
    document.getElementById('loginForm').classList.add('active');
  } else {
    document.querySelector('.auth-tab:last-child').classList.add('active');
    document.getElementById('signupForm').classList.add('active');
  }
  
  document.getElementById('loginError').textContent = '';
  document.getElementById('signupError').textContent = '';
};

window.handleLogin = async function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  
  try {
    await db.signIn(email, password);
    errorEl.textContent = '';
  } catch (error) {
    errorEl.textContent = error.message || 'Login failed. Please check your credentials.';
  }
};

window.handleSignup = async function(e) {
  e.preventDefault();
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupPasswordConfirm').value;
  const errorEl = document.getElementById('signupError');
  
  if (password !== confirmPassword) {
    errorEl.textContent = 'Passwords do not match.';
    return;
  }
  
  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters.';
    return;
  }
  
  try {
    await db.signUp(email, password);
    errorEl.textContent = '';
    modalAlert('Account Created', 'Please check your email to verify your account.', 'success');
  } catch (error) {
    errorEl.textContent = error.message || 'Signup failed. Please try again.';
  }
};

window.handleLogout = async function() {
  try {
    await db.signOut();
    data = { inventory: [], capital: null, income: [], categories: [], incomeMonth: new Date().getMonth() };
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// ═══════════════════════════════════════════════════════════════
//  DATA LOADING
// ═══════════════════════════════════════════════════════════════

async function loadAllData() {
  if (!currentUser) return;
  
  showSaveStatus('Loading...');
  
  try {
    // Load all data in parallel
    const [inventory, capital, income, categories, sales] = await Promise.all([
      db.getInventory(currentUser.id),
      db.getCapital(currentUser.id),
      db.getIncome(currentUser.id),
      db.getCategories(currentUser.id),
      db.getSales(currentUser.id)
    ]);
    
    data.inventory = inventory || [];
    data.capital = capital || {
      owner1_capital: 0, owner2_capital: 0, loans: 0, savings_account: 0,
      emergency: 0, reinvested: 0, owner1_drawings: 0, owner2_drawings: 0
    };
    
    // Ensure we have data for all 12 months
    data.income = Array(12).fill(null).map((_, i) => {
      const existing = income.find(m => m.month_index === i);
      return existing || {
        month_index: i,
        product_sales: 0, stationery_sales: 0, wholesale: 0,
        stock_purchase: 0, rent: 0, salaries: 0, other_exp: 0
      };
    });
    
    data.categories = categories || [];
    data.sales = sales || [];
    
    showSaveStatus('Synced');
  } catch (error) {
    console.error('Error loading data:', error);
    showToast('❌ Error loading data');
  }
}

// ═══════════════════════════════════════════════════════════════
//  REALTIME SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════════

function setupRealtimeSubscriptions() {
  if (!currentUser) return;
  
  unsubscribeAll();
  
  // Subscribe to inventory changes
  const invSub = db.subscribeToInventory(currentUser.id, (payload) => {
    console.log('Inventory change:', payload);
    handleInventoryChange(payload);
  });
  subscriptions.push(invSub);
  
  // Subscribe to capital changes
  const capSub = db.subscribeToCapital(currentUser.id, (payload) => {
    console.log('Capital change:', payload);
    handleCapitalChange(payload);
  });
  subscriptions.push(capSub);
  
  // Subscribe to income changes
  const incSub = db.subscribeToIncome(currentUser.id, (payload) => {
    console.log('Income change:', payload);
    handleIncomeChange(payload);
  });
  subscriptions.push(incSub);
  
  // Subscribe to sales changes
  const salesSub = db.subscribeToSales(currentUser.id, (payload) => {
    console.log('Sales change:', payload);
    handleSalesChange(payload);
  });
  subscriptions.push(salesSub);
}

function unsubscribeAll() {
  subscriptions.forEach(sub => db.unsubscribe(sub));
  subscriptions = [];
}

function handleInventoryChange(payload) {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  
  if (eventType === 'INSERT') {
    data.inventory.push(newRecord);
  } else if (eventType === 'UPDATE') {
    const idx = data.inventory.findIndex(i => i.id === newRecord.id);
    if (idx !== -1) data.inventory[idx] = newRecord;
  } else if (eventType === 'DELETE') {
    data.inventory = data.inventory.filter(i => i.id !== oldRecord.id);
  }
  
  renderInventory();
  renderDashboard();
  renderBalance();
}

function handleCapitalChange(payload) {
  const { new: newRecord } = payload;
  data.capital = newRecord;
  renderCapital();
  renderBalance();
  renderDashboard();
}

function handleIncomeChange(payload) {
  const { eventType, new: newRecord } = payload;
  
  if (eventType === 'INSERT' || eventType === 'UPDATE') {
    const idx = data.income.findIndex(m => m.month_index === newRecord.month_index);
    if (idx !== -1) {
      data.income[idx] = newRecord;
    } else {
      data.income.push(newRecord);
    }
  }
  
  renderIncome();
  renderDashboard();
}

// ═══════════════════════════════════════════════════════════════
//  SAVE STATUS INDICATOR
// ═══════════════════════════════════════════════════════════════

function showSaveStatus(status) {
  const el = document.getElementById('saveStatus');
  if (status === 'Saving...') {
    el.textContent = status;
    el.classList.add('saving');
  } else {
    el.textContent = status;
    el.classList.remove('saving');
  }
}

// ═══════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════

window.switchTab = function(pageName) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  
  const desktopTab = document.getElementById('tab-' + pageName);
  const mobileTab = document.getElementById('mobile-tab-' + pageName);
  
  if (desktopTab) desktopTab.classList.add('active');
  if (mobileTab) mobileTab.classList.add('active');
  
  document.getElementById('page-' + pageName).classList.add('active');
  renderPage(pageName);
};

window.openMobileMenu = function() {
  document.getElementById('mobileMenuBackdrop').classList.add('open');
};

window.closeMobileMenu = function() {
  document.getElementById('mobileMenuBackdrop').classList.remove('open');
};

function renderPage(name) {
  switch(name) {
    case 'dashboard': renderDashboard(); break;
    case 'inventory': renderInventory(); break;
    case 'capital': renderCapital(); break;
    case 'income': renderIncome(); break;
    case 'balance': renderBalance(); break;
    case 'sales': renderSales(); break;
    case 'customers': renderCustomers(); break;
  }
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════

function renderDashboard() {
  const inv = data.inventory || [];
  const totalStock = inv.reduce((s,i) => s + (parseFloat(i.quantity) || 0), 0);
  const totalValue = inv.reduce((s,i) => s + ((parseFloat(i.quantity) || 0) * (parseFloat(i.unit_cost) || 0)), 0);
  const lowStockItems = inv.filter(i => (parseFloat(i.quantity) || 0) <= (parseFloat(i.reorder_point) || 0));
  const lowStock = lowStockItems.length;
  
  // Show/hide low stock banner
  const lowStockBanner = document.getElementById('lowStockBanner');
  const lowStockItemsDiv = document.getElementById('lowStockItems');
  if (lowStock > 0) {
    lowStockBanner.style.display = 'block';
    lowStockItemsDiv.innerHTML = lowStockItems.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid var(--border)">
        <span><strong>${item.name}</strong> - ${item.quantity} left (reorder at ${item.reorder_point})</span>
        <button class="btn btn-gold btn-sm" onclick="switchTab('inventory')">View</button>
      </div>
    `).join('');
  } else {
    lowStockBanner.style.display = 'none';
  }

  const yearRevenue = data.income.reduce((s,m) => 
    s + (parseFloat(m.product_sales) || 0) + (parseFloat(m.stationery_sales) || 0) + (parseFloat(m.wholesale) || 0), 0);
  const yearExpenses = data.income.reduce((s,m) => 
    s + (parseFloat(m.stock_purchase) || 0) + (parseFloat(m.rent) || 0) + (parseFloat(m.salaries) || 0) + (parseFloat(m.other_exp) || 0), 0);
  const yearProfit = yearRevenue - yearExpenses;

  const kpis = [
    { label:'Total Items', value:inv.length, type:'neutral', sub:`${totalStock.toLocaleString()} units` },
    { label:'Inventory Value', value:'TZS ' + totalValue.toLocaleString(), type:'neutral' },
    { label:'Low Stock Items', value:lowStock, type:lowStock > 0 ? 'loss' : 'profit', sub:lowStock > 0 ? 'Need reorder' : 'All good' },
    { label:'YTD Revenue', value:'TZS ' + yearRevenue.toLocaleString(), type:'neutral' },
    { label:'YTD Expenses', value:'TZS ' + yearExpenses.toLocaleString(), type:'neutral' },
    { label:'YTD Profit', value:'TZS ' + yearProfit.toLocaleString(), type:yearProfit >= 0 ? 'profit' : 'loss' }
  ];

  document.getElementById('dashKPIs').innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.type}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.type === 'profit' ? 'pos' : k.type === 'loss' ? 'neg' : ''}">${k.value}</div>
      ${k.sub ? `<div class="kpi-sub">${k.sub}</div>` : ''}
    </div>
  `).join('');

  const allRows = MONTHS.map((m, i) => {
    const d = data.income[i];
    const rev = (parseFloat(d.product_sales) || 0) + (parseFloat(d.stationery_sales) || 0) + (parseFloat(d.wholesale) || 0);
    const exp = (parseFloat(d.stock_purchase) || 0) + (parseFloat(d.rent) || 0) + (parseFloat(d.salaries) || 0) + (parseFloat(d.other_exp) || 0);
    const profit = rev - exp;
    return { month: m, rev, exp, profit };
  });

  const searchQuery = searchState.dashboard;
  // Filter dashboard rows
  let filteredRows = allRows.filter(row => {
    if (!searchQuery) return true;
    return row.month.toLowerCase().includes(searchQuery);
  });
  
  // Sort dashboard rows
  const columnMap = {
    month: 'month',
    rev: 'rev',
    exp: 'exp',
    profit: 'profit'
  };
  filteredRows = sortData(filteredRows, 'dashboard', columnMap);

  const currentPage = paginationState.dashboard;
  const paginatedRows = getPaginatedData(filteredRows, currentPage);

  const rowsHtml = paginatedRows.map((row) => {
    return `<tr>
      <td>${row.month}</td>
      <td class="num">${row.rev.toLocaleString()}</td>
      <td class="num">${row.exp.toLocaleString()}</td>
      <td class="num ${row.profit >= 0 ? 'pos-cell' : 'neg-cell'}">${row.profit.toLocaleString()}</td>
    </tr>`;
  }).join('');

  // Helper to get sort indicator
  const getSortIndicator = (column) => {
    const sort = sortState.dashboard;
    if (sort.column !== column) return '';
    return sort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  document.getElementById('dashTable').innerHTML = `
    <thead><tr>
      <th style="cursor:pointer" onclick="sortTable('dashboard', 'month')">Month${getSortIndicator('month')}</th>
      <th style="cursor:pointer" onclick="sortTable('dashboard', 'rev')">Revenue${getSortIndicator('rev')}</th>
      <th style="cursor:pointer" onclick="sortTable('dashboard', 'exp')">Expenses${getSortIndicator('exp')}</th>
      <th style="cursor:pointer" onclick="sortTable('dashboard', 'profit')">Profit${getSortIndicator('profit')}</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  `;

  // Render mobile cards for dashboard monthly summary
  const dashCardsHtml = paginatedRows.map((row) => `
    <div class="list-card">
      <div class="card-row">
        <div class="card-col">
          <span class="card-label">Month</span>
          <span class="card-value" style="font-weight:600">${row.month}</span>
        </div>
        <div class="card-col">
          <span class="card-label">Profit</span>
          <span class="card-value ${row.profit >= 0 ? 'ok-stock' : 'low-stock'}">${row.profit.toLocaleString()}</span>
        </div>
      </div>
      <div class="card-row">
        <div class="card-col">
          <span class="card-label">Revenue</span>
          <span class="card-value">${row.rev.toLocaleString()}</span>
        </div>
        <div class="card-col">
          <span class="card-label">Expenses</span>
          <span class="card-value">${row.exp.toLocaleString()}</span>
        </div>
      </div>
    </div>
  `).join('');
  document.getElementById('dashCards').innerHTML = dashCardsHtml;

  document.getElementById('dashPagination').innerHTML = renderPaginationControls(filteredRows.length, currentPage, 'dashboard');
  
  renderTrendsChart();
  renderInventoryChart();
}

function renderTrendsChart() {
  const ctx = document.getElementById('trendsChart');
  if (!ctx) return;
  
  if (trendsChart) {
    trendsChart.destroy();
  }
  
  const revenueData = data.income.map(m => 
    (parseFloat(m.product_sales) || 0) + (parseFloat(m.stationery_sales) || 0) + (parseFloat(m.wholesale) || 0)
  );
  
  const expensesData = data.income.map(m => 
    (parseFloat(m.stock_purchase) || 0) + (parseFloat(m.rent) || 0) + (parseFloat(m.salaries) || 0) + (parseFloat(m.other_exp) || 0)
  );
  
  const profitData = revenueData.map((rev, i) => rev - expensesData[i]);
  
  const textColor = isDarkMode ? '#faf6f0' : '#1a1208';
  
  trendsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: MONTHS,
      datasets: [
        {
          label: 'Revenue',
          data: revenueData,
          borderColor: isDarkMode ? '#3e6fb3' : '#1f3864',
          backgroundColor: isDarkMode ? 'rgba(62, 111, 179, 0.2)' : 'rgba(31, 56, 100, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Expenses',
          data: expensesData,
          borderColor: isDarkMode ? '#e86a4a' : '#b84a2a',
          backgroundColor: isDarkMode ? 'rgba(232, 106, 74, 0.2)' : 'rgba(184, 74, 42, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Profit',
          data: profitData,
          borderColor: isDarkMode ? '#5a9b6a' : '#3a6b4a',
          backgroundColor: isDarkMode ? 'rgba(90, 155, 106, 0.2)' : 'rgba(58, 107, 74, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: textColor
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor
          },
          grid: {
            color: isDarkMode ? 'rgba(250, 246, 240, 0.1)' : 'rgba(26, 18, 8, 0.1)'
          }
        },
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            color: isDarkMode ? 'rgba(250, 246, 240, 0.1)' : 'rgba(26, 18, 8, 0.1)'
          }
        }
      }
    }
  });
}

function renderInventoryChart() {
  const ctx = document.getElementById('inventoryChart');
  if (!ctx) return;
  
  if (inventoryChart) {
    inventoryChart.destroy();
  }
  
  const categoryValues = {};
  data.inventory.forEach(item => {
    const cat = item.category || 'Other';
    const value = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0);
    categoryValues[cat] = (categoryValues[cat] || 0) + value;
  });
  
  const labels = Object.keys(categoryValues);
  const values = Object.values(categoryValues);
  
  const colors = [
    '#1f3864', '#c4952a', '#3a6b4a', '#b84a2a',
    '#2e5fa3', '#e8b84b', '#7a6e60', '#d4c8b8', '#1a1208'
  ];
  
  const textColor = isDarkMode ? '#faf6f0' : '#1a1208';
  
  inventoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: isDarkMode ? '#2e251a' : '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor
          }
        }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
//  INVENTORY
// ═══════════════════════════════════════════════════════════════

function renderInventory() {
  const inv = data.inventory || [];
  const searchQuery = searchState.inventory;
  
  // Filter inventory
  let filteredInv = inv.filter(item => {
    if (!searchQuery) return true;
    return (item.name || '').toLowerCase().includes(searchQuery) ||
           (item.category || '').toLowerCase().includes(searchQuery);
  });
  
  // Sort inventory
  const columnMap = {
    name: 'name',
    category: 'category',
    quantity: 'quantity',
    unit_cost: 'unit_cost',
    total_value: (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0),
    reorder_point: 'reorder_point'
  };
  filteredInv = sortData(filteredInv, 'inventory', columnMap);
  
  if (!filteredInv.length) {
    document.getElementById('inventoryTable').innerHTML = `
      <tbody><tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--mid)">
        No matching items found.
      </td></tr></tbody>
    `;
    document.getElementById('inventoryPagination').innerHTML = '';
    return;
  }

  const currentPage = paginationState.inventory;
  const paginatedInv = getPaginatedData(filteredInv, currentPage);

  const rows = paginatedInv.map((item) => {
    const lowStock = (parseFloat(item.quantity) || 0) <= (parseFloat(item.reorder_point) || 0);
    return `<tr>
      <td><input type="text" value="${item.name || ''}" onchange="updateInvField('${item.id}','name',this.value)"></td>
      <td><select onchange="updateInvField('${item.id}','category',this.value)">
        ${allItemCats().map(c => `<option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select></td>
      <td><input type="number" class="num-input" value="${item.quantity || ''}" onchange="updateInvField('${item.id}','quantity',this.value)"></td>
      <td><input type="number" class="num-input" value="${item.unit_cost || ''}" onchange="updateInvField('${item.id}','unit_cost',this.value)"></td>
      <td class="num">${((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)).toLocaleString()}</td>
      <td><input type="number" class="num-input" value="${item.reorder_point || ''}" onchange="updateInvField('${item.id}','reorder_point',this.value)"></td>
      <td class="${lowStock ? 'warn-cell' : ''}">${lowStock ? '⚠️ Low' : ' ✓ OK'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteInvItem('${item.id}')">Delete</button></td>
    </tr>`;
  }).join('');

  // Helper to get sort indicator
  const getSortIndicator = (column) => {
    const sort = sortState.inventory;
    if (sort.column !== column) return '';
    return sort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  document.getElementById('inventoryTable').innerHTML = `
    <thead><tr>
      <th style="cursor:pointer" onclick="sortTable('inventory', 'name')">Item Name${getSortIndicator('name')}</th>
      <th style="cursor:pointer" onclick="sortTable('inventory', 'category')">Category${getSortIndicator('category')}</th>
      <th style="cursor:pointer" onclick="sortTable('inventory', 'quantity')">Qty${getSortIndicator('quantity')}</th>
      <th style="cursor:pointer" onclick="sortTable('inventory', 'unit_cost')">Unit Cost${getSortIndicator('unit_cost')}</th>
      <th style="cursor:pointer" onclick="sortTable('inventory', 'total_value')">Total Value${getSortIndicator('total_value')}</th>
      <th style="cursor:pointer" onclick="sortTable('inventory', 'reorder_point')">Reorder Pt${getSortIndicator('reorder_point')}</th>
      <th>Status</th>
      <th>Action</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  `;

  // Render mobile cards
  const cardsHtml = paginatedInv.map((item) => {
    const lowStock = (parseFloat(item.quantity) || 0) <= (parseFloat(item.reorder_point) || 0);
    const totalValue = ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)).toLocaleString();
    return `
      <div class="list-card">
        <div class="card-row">
          <div class="card-col">
            <span class="card-label">Item Name</span>
            <input type="text" class="form-input" style="padding:0.4rem;font-size:0.85rem" value="${item.name || ''}" onchange="updateInvField('${item.id}','name',this.value)">
          </div>
          <div class="card-col">
            <span class="card-label">Category</span>
            <select class="form-select" style="padding:0.4rem;font-size:0.85rem" onchange="updateInvField('${item.id}','category',this.value)">
              ${allItemCats().map(c => `<option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="card-row">
          <div class="card-col">
            <span class="card-label">Qty</span>
            <input type="number" class="form-input num" style="padding:0.4rem;font-size:0.85rem" value="${item.quantity || ''}" onchange="updateInvField('${item.id}','quantity',this.value)">
          </div>
          <div class="card-col">
            <span class="card-label">Unit Cost</span>
            <input type="number" class="form-input num" style="padding:0.4rem;font-size:0.85rem" value="${item.unit_cost || ''}" onchange="updateInvField('${item.id}','unit_cost',this.value)">
          </div>
          <div class="card-col">
            <span class="card-label">Total Value</span>
            <span class="card-value">${totalValue}</span>
          </div>
        </div>
        <div class="card-row">
          <div class="card-col">
            <span class="card-label">Reorder Pt</span>
            <input type="number" class="form-input num" style="padding:0.4rem;font-size:0.85rem" value="${item.reorder_point || ''}" onchange="updateInvField('${item.id}','reorder_point',this.value)">
          </div>
          <div class="card-col">
            <span class="card-label">Status</span>
            <span class="card-value ${lowStock ? 'low-stock' : 'ok-stock'}">${lowStock ? '⚠️ Low' : '✓ OK'}</span>
          </div>
          <div class="card-col">
            <span class="card-label">Action</span>
            <button class="btn btn-danger btn-sm card-btn" onclick="deleteInvItem('${item.id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  document.getElementById('inventoryCards').innerHTML = cardsHtml;

  document.getElementById('inventoryPagination').innerHTML = renderPaginationControls(filteredInv.length, currentPage, 'inventory');
}

window.addInventoryItem = async function() {
  if (!currentUser) return;
  
  showSaveStatus('Saving...');
  
  try {
    await db.addInventoryItem(currentUser.id, {
      name: 'New Item',
      category: allItemCats()[0],
      quantity: 0,
      unit_cost: 0,
      reorder_point: 0
    });
    
    showSaveStatus('Synced');
    showToast('✅ Item added');
  } catch (error) {
    console.error('Error adding item:', error);
    showToast('❌ Error adding item');
    showSaveStatus('Error');
  }
};

window.updateInvField = async function(id, field, value) {
  if (!currentUser) return;
  
  showSaveStatus('Saving...');
  
  try {
    const updates = { [field]: value };
    await db.updateInventoryItem(id, updates);
    showSaveStatus('Synced');
  } catch (error) {
    console.error('Error updating item:', error);
    showToast('❌ Error updating item');
    showSaveStatus('Error');
  }
};

window.deleteInvItem = function(id) {
  modalConfirm('Delete Item?', 'This item will be permanently removed.', async () => {
    showSaveStatus('Saving...');
    
    try {
      // Remove from local data first
      data.inventory = data.inventory.filter(i => i.id !== id);
      renderInventory();
      renderDashboard();
      renderBalance();
      
      await db.deleteInventoryItem(id);
      showSaveStatus('Synced');
      showToast('✅ Item deleted');
    } catch (error) {
      console.error('Error deleting item:', error);
      // Revert if error
      await loadAllData();
      showToast('❌ Error deleting item');
      showSaveStatus('Error');
    }
  }, '🗑️');
};

// ═══════════════════════════════════════════════════════════════
//  CAPITAL
// ═══════════════════════════════════════════════════════════════

function renderCapital() {
  const c = data.capital || {};
  const totalCapital = (parseFloat(c.owner1_capital) || 0) + (parseFloat(c.owner2_capital) || 0) + 
                       (parseFloat(c.loans) || 0) + (parseFloat(c.savings_account) || 0) + 
                       (parseFloat(c.emergency) || 0) + (parseFloat(c.reinvested) || 0);
  const totalDrawings = (parseFloat(c.owner1_drawings) || 0) + (parseFloat(c.owner2_drawings) || 0);
  const netCapital = totalCapital - totalDrawings;

  const allRows = [
    { description: 'Owner 1 Capital', amount: c.owner1_capital || 0 },
    { description: 'Owner 2 Capital', amount: c.owner2_capital || 0 },
    { description: 'Loans', amount: c.loans || 0 },
    { description: 'Savings Account', amount: c.savings_account || 0 },
    { description: 'Emergency Fund', amount: c.emergency || 0 },
    { description: 'Reinvested Profit', amount: c.reinvested || 0 },
    { isSeparator: true },
    { description: 'Total Capital', amount: totalCapital, isTotal: true },
    { isSeparator: true },
    { description: 'Owner 1 Drawings', amount: c.owner1_drawings || 0, isSub: true },
    { description: 'Owner 2 Drawings', amount: c.owner2_drawings || 0, isSub: true },
    { isSeparator: true },
    { description: 'Total Drawings', amount: totalDrawings, isSub: true, isTotal: true },
    { isSeparator: true },
    { description: 'Net Capital', amount: netCapital, isTotal: true }
  ];

  const searchQuery = searchState.capital;
  // Filter capital rows
  let filteredRows = allRows.filter(row => {
    if (!searchQuery) return true;
    if (row.isSeparator) return true;
    return (row.description || '').toLowerCase().includes(searchQuery);
  });
  
  // Sort capital rows
  const columnMap = {
    description: 'description',
    amount: 'amount'
  };
  filteredRows = sortData(filteredRows, 'capital', columnMap);

  const currentPage = paginationState.capital;
  const paginatedRows = getPaginatedData(filteredRows, currentPage);

  const rowsHtml = paginatedRows.map(r => {
    if (r.isSeparator) return '<tr><td colspan="2" style="height:0.5rem"></td></tr>';
    const cls = r.isTotal ? 'total-row' : '';
    return `<tr class="${cls}">
      <td style="font-weight:${r.isTotal ? '600' : '400'};padding-left:${r.isSub ? '2rem' : '0.8rem'}">${r.description}</td>
      <td class="num" style="font-weight:${r.isTotal ? '600' : '400'}">${r.amount ? parseFloat(r.amount).toLocaleString() : ''}</td>
    </tr>`;
  }).join('');

  // Helper to get sort indicator
  const getSortIndicator = (column) => {
    const sort = sortState.capital;
    if (sort.column !== column) return '';
    return sort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  document.getElementById('capitalTable').innerHTML = `
    <thead><tr>
      <th style="cursor:pointer" onclick="sortTable('capital', 'description')">Description${getSortIndicator('description')}</th>
      <th style="cursor:pointer" onclick="sortTable('capital', 'amount')">Amount (TZS)${getSortIndicator('amount')}</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  `;

  // Render mobile cards for capital
  const capitalCardsHtml = paginatedRows.map((r) => {
    if (r.isSeparator) return '';
    return `
      <div class="list-card">
        <div class="card-row">
          <div class="card-col" style="flex:2;">
            <span class="card-label">Description</span>
            <span class="card-value" style="font-weight:${r.isTotal ? '600' : '400'};padding-left:${r.isSub ? '1.5rem' : '0'}">${r.description}</span>
          </div>
          <div class="card-col">
            <span class="card-label">Amount</span>
            <span class="card-value" style="font-weight:${r.isTotal ? '600' : '400'}">${r.amount ? parseFloat(r.amount).toLocaleString() : ''}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  document.getElementById('capitalCards').innerHTML = capitalCardsHtml;

  document.getElementById('capitalPagination').innerHTML = renderPaginationControls(filteredRows.length, currentPage, 'capital');
}

const CAP_KEYS = ['owner1Capital','owner2Capital','loans','savingsAccount','emergency','reinvested','owner1Drawings','owner2Drawings'];
const CAP_DB_KEYS = ['owner1_capital','owner2_capital','loans','savings_account','emergency','reinvested','owner1_drawings','owner2_drawings'];

window.openCapitalModal = function() {
  CAP_KEYS.forEach((k, i) => {
    const el = document.getElementById('capIn_' + k);
    if (el) {
      const dbKey = CAP_DB_KEYS[i];
      const v = data.capital[dbKey] || 0;
      el.value = v ? parseFloat(v).toLocaleString('en-US') : '';
      el._modalWired = false;
    }
  });
  openModal('modalCapitalBackdrop');
};

window.saveCapitalModal = async function() {
  if (!currentUser) return;
  
  showSaveStatus('Saving...');
  
  const capitalData = {};
  CAP_KEYS.forEach((k, i) => {
    const el = document.getElementById('capIn_' + k);
    if (el) {
      capitalData[CAP_DB_KEYS[i]] = parseComma(el.value);
    }
  });
  
  try {
    await db.upsertCapital(currentUser.id, capitalData);
    closeModal('modalCapitalBackdrop');
    showSaveStatus('Synced');
    showToast('✅ Capital saved');
  } catch (error) {
    console.error('Error saving capital:', error);
    showToast('❌ Error saving capital');
    showSaveStatus('Error');
  }
};

// ═══════════════════════════════════════════════════════════════
//  INCOME
// ═══════════════════════════════════════════════════════════════

function renderIncome() {
  const allRows = data.income.map((m, i) => {
    const rev = (parseFloat(m.product_sales) || 0) + (parseFloat(m.stationery_sales) || 0) + (parseFloat(m.wholesale) || 0);
    const exp = (parseFloat(m.stock_purchase) || 0) + (parseFloat(m.rent) || 0) + (parseFloat(m.salaries) || 0) + (parseFloat(m.other_exp) || 0);
    const profit = rev - exp;
    return { 
      month: MONTHS[i], 
      productSales: (parseFloat(m.product_sales) || 0),
      stationerySales: (parseFloat(m.stationery_sales) || 0),
      wholesale: (parseFloat(m.wholesale) || 0),
      totalRev: rev,
      stockPurchase: (parseFloat(m.stock_purchase) || 0),
      rent: (parseFloat(m.rent) || 0),
      salaries: (parseFloat(m.salaries) || 0),
      otherExp: (parseFloat(m.other_exp) || 0),
      totalExp: exp,
      profit: profit
    };
  });

  const searchQuery = searchState.income;
  // Filter income rows
  let filteredRows = allRows.filter(row => {
    if (!searchQuery) return true;
    return row.month.toLowerCase().includes(searchQuery);
  });
  
  // Sort income rows
  const columnMap = {
    month: 'month',
    productSales: 'productSales',
    stationerySales: 'stationerySales',
    wholesale: 'wholesale',
    totalRev: 'totalRev',
    stockPurchase: 'stockPurchase',
    rent: 'rent',
    salaries: 'salaries',
    otherExp: 'otherExp',
    totalExp: 'totalExp',
    profit: 'profit'
  };
  filteredRows = sortData(filteredRows, 'income', columnMap);

  const currentPage = paginationState.income;
  const paginatedRows = getPaginatedData(filteredRows, currentPage);

  const totals = data.income.reduce((acc, m) => ({
    prodSales: acc.prodSales + (parseFloat(m.product_sales) || 0),
    statSales: acc.statSales + (parseFloat(m.stationery_sales) || 0),
    wholesale: acc.wholesale + (parseFloat(m.wholesale) || 0),
    stock: acc.stock + (parseFloat(m.stock_purchase) || 0),
    rent: acc.rent + (parseFloat(m.rent) || 0),
    sal: acc.sal + (parseFloat(m.salaries) || 0),
    other: acc.other + (parseFloat(m.other_exp) || 0)
  }), {prodSales:0,statSales:0,wholesale:0,stock:0,rent:0,sal:0,other:0});
  
  const totalRev = totals.prodSales + totals.statSales + totals.wholesale;
  const totalExp = totals.stock + totals.rent + totals.sal + totals.other;
  const totalProfit = totalRev - totalExp;

  const rowsHtml = paginatedRows.map((row) => {
    return `<tr>
      <td>${row.month}</td>
      <td class="num">${row.productSales.toLocaleString()}</td>
      <td class="num">${row.stationerySales.toLocaleString()}</td>
      <td class="num">${row.wholesale.toLocaleString()}</td>
      <td class="num">${row.totalRev.toLocaleString()}</td>
      <td class="num">${row.stockPurchase.toLocaleString()}</td>
      <td class="num">${row.rent.toLocaleString()}</td>
      <td class="num">${row.salaries.toLocaleString()}</td>
      <td class="num">${row.otherExp.toLocaleString()}</td>
      <td class="num">${row.totalExp.toLocaleString()}</td>
      <td class="num ${row.profit >= 0 ? 'pos-cell' : 'neg-cell'}">${row.profit.toLocaleString()}</td>
    </tr>`;
  }).join('');

  const totalRow = `<tr class="total-row">
    <td>TOTAL</td>
    <td class="num">${totals.prodSales.toLocaleString()}</td>
    <td class="num">${totals.statSales.toLocaleString()}</td>
    <td class="num">${totals.wholesale.toLocaleString()}</td>
    <td class="num">${totalRev.toLocaleString()}</td>
    <td class="num">${totals.stock.toLocaleString()}</td>
    <td class="num">${totals.rent.toLocaleString()}</td>
    <td class="num">${totals.sal.toLocaleString()}</td>
    <td class="num">${totals.other.toLocaleString()}</td>
    <td class="num">${totalExp.toLocaleString()}</td>
    <td class="num">${totalProfit.toLocaleString()}</td>
  </tr>`;

  // Helper to get sort indicator
  const getSortIndicator = (column) => {
    const sort = sortState.income;
    if (sort.column !== column) return '';
    return sort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  document.getElementById('incomeTable').innerHTML = `
    <thead><tr>
      <th style="cursor:pointer" onclick="sortTable('income', 'month')">Month${getSortIndicator('month')}</th>
      <th style="cursor:pointer" onclick="sortTable('income', 'productSales')">Product Sales${getSortIndicator('productSales')}</th>
      <th style="cursor:pointer" onclick="sortTable('income', 'stationerySales')">Stationery Sales${getSortIndicator('stationerySales')}</th>
      <th style="cursor:pointer" onclick="sortTable('income', 'wholesale')">Wholesale${getSortIndicator('wholesale')}</th>
      <th style="cursor:pointer" onclick="sortTable('income', 'totalRev')">Total Revenue${getSortIndicator('totalRev')}</th>
      <th style="cursor:pointer" onclick="sortTable('income', 'stockPurchase')">Stock Purchase${getSortIndicator('stockPurchase')}</th>
      <th style="cursor:pointer" onclick="sortTable('income', 'rent')">Rent${getSortIndicator('rent')}</th>
      <th style="cursor:pointer" onclick="sortTable('income', 'salaries')">Salaries${getSortIndicator('salaries')}</th>
      <th style="cursor:pointer" onclick="sortTable('income', 'otherExp')">Other Exp${getSortIndicator('otherExp')}</th>
      <th style="cursor:pointer" onclick="sortTable('income', 'totalExp')">Total Expenses${getSortIndicator('totalExp')}</th>
      <th style="cursor:pointer" onclick="sortTable('income', 'profit')">Profit${getSortIndicator('profit')}</th>
    </tr></thead>
    <tbody>${rowsHtml}${totalRow}</tbody>
  `;

  // Render mobile cards for income
  const incomeCardsHtml = paginatedRows.map((row) => {
    return `
      <div class="list-card">
        <div class="card-row">
          <div class="card-col">
            <span class="card-label">Month</span>
            <span class="card-value" style="font-weight:600">${row.month}</span>
          </div>
          <div class="card-col">
            <span class="card-label">Total Revenue</span>
            <span class="card-value">${row.totalRev.toLocaleString()}</span>
          </div>
          <div class="card-col">
            <span class="card-label">Total Expenses</span>
            <span class="card-value">${row.totalExp.toLocaleString()}</span>
          </div>
        </div>
        <div class="card-row">
          <div class="card-col">
            <span class="card-label">Product Sales</span>
            <span class="card-value">${row.productSales.toLocaleString()}</span>
          </div>
          <div class="card-col">
            <span class="card-label">Stationery Sales</span>
            <span class="card-value">${row.stationerySales.toLocaleString()}</span>
          </div>
          <div class="card-col">
            <span class="card-label">Wholesale</span>
            <span class="card-value">${row.wholesale.toLocaleString()}</span>
          </div>
        </div>
        <div class="card-row">
          <div class="card-col">
            <span class="card-label">Stock Purchase</span>
            <span class="card-value">${row.stockPurchase.toLocaleString()}</span>
          </div>
          <div class="card-col">
            <span class="card-label">Rent</span>
            <span class="card-value">${row.rent.toLocaleString()}</span>
          </div>
          <div class="card-col">
            <span class="card-label">Salaries</span>
            <span class="card-value">${row.salaries.toLocaleString()}</span>
          </div>
        </div>
        <div class="card-row">
          <div class="card-col" style="flex:2;">
            <span class="card-label">Other Expenses</span>
            <span class="card-value">${row.otherExp.toLocaleString()}</span>
          </div>
          <div class="card-col" style="flex:2;">
            <span class="card-label">Profit</span>
            <span class="card-value ${row.profit >= 0 ? 'ok-stock' : 'low-stock'}">${row.profit.toLocaleString()}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  document.getElementById('incomeCards').innerHTML = incomeCardsHtml;

  document.getElementById('incomePagination').innerHTML = renderPaginationControls(filteredRows.length, currentPage, 'income');
}

const INC_MODAL_KEYS = ['productSales','stationerySales','wholesale','stockPurchase','rent','salaries','otherExp'];
const INC_DB_KEYS = ['product_sales','stationery_sales','wholesale','stock_purchase','rent','salaries','other_exp'];

window.openIncomeModal = function() {
  const sel = document.getElementById('incomeModalMonth');
  sel.innerHTML = MONTHS.map((m, i) => `<option value="${i}" ${i === data.incomeMonth ? 'selected' : ''}>${m}</option>`).join('');
  
  const m = data.incomeMonth;
  INC_MODAL_KEYS.forEach((k, i) => {
    const el = document.getElementById('incIn_' + k);
    if (el) {
      const dbKey = INC_DB_KEYS[i];
      const v = data.income[m][dbKey] || 0;
      el.value = v ? parseFloat(v).toLocaleString('en-US') : '';
      el._modalWired = false;
    }
  });
  
  sel.onchange = () => {
    const idx = parseInt(sel.value);
    data.incomeMonth = idx;
    INC_MODAL_KEYS.forEach((k, i) => {
      const el = document.getElementById('incIn_' + k);
      if (el) {
        const dbKey = INC_DB_KEYS[i];
        const v = data.income[idx][dbKey] || 0;
        el.value = v ? parseFloat(v).toLocaleString('en-US') : '';
      }
    });
  };
  
  openModal('modalIncomeBackdrop');
};

window.saveIncomeModal = async function() {
  if (!currentUser) return;
  
  showSaveStatus('Saving...');
  
  const m = parseInt(document.getElementById('incomeModalMonth').value);
  const incomeData = { month_index: m };
  
  INC_MODAL_KEYS.forEach((k, i) => {
    const el = document.getElementById('incIn_' + k);
    if (el) {
      incomeData[INC_DB_KEYS[i]] = parseComma(el.value);
    }
  });
  
  try {
    await db.upsertIncome(currentUser.id, m, incomeData);
    data.incomeMonth = m;
    closeModal('modalIncomeBackdrop');
    showSaveStatus('Synced');
    showToast('✅ Income saved for ' + MONTHS[m]);
  } catch (error) {
    console.error('Error saving income:', error);
    showToast('❌ Error saving income');
    showSaveStatus('Error');
  }
};

// ═══════════════════════════════════════════════════════════════
//  BALANCE SHEET
// ═══════════════════════════════════════════════════════════════

function renderBalance() {
  const inv = data.inventory || [];
  const invValue = inv.reduce((s, i) => s + ((parseFloat(i.quantity) || 0) * (parseFloat(i.unit_cost) || 0)), 0);
  const c = data.capital || {};
  const cash = (parseFloat(c.savings_account) || 0) + (parseFloat(c.emergency) || 0);
  const totalAssets = invValue + cash;

  const totalCapital = (parseFloat(c.owner1_capital) || 0) + (parseFloat(c.owner2_capital) || 0) + 
                       (parseFloat(c.loans) || 0) + (parseFloat(c.savings_account) || 0) + 
                       (parseFloat(c.emergency) || 0) + (parseFloat(c.reinvested) || 0);
  const totalDrawings = (parseFloat(c.owner1_drawings) || 0) + (parseFloat(c.owner2_drawings) || 0);
  const equity = totalCapital - totalDrawings;

  const kpis = [
    { label:'Total Assets', value:'TZS ' + totalAssets.toLocaleString(), type:'neutral' },
    { label:'Equity', value:'TZS ' + equity.toLocaleString(), type:'profit' },
    { label:'Liabilities', value:'TZS ' + (parseFloat(c.loans) || 0).toLocaleString(), type:'neutral' }
  ];

  document.getElementById('balanceKPIs').innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.type}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
    </div>
  `).join('');

  const allRows = [
    { item: 'Inventory', amount: invValue },
    { item: 'Cash (Savings)', amount: c.savings_account || 0 },
    { item: 'Cash (Emergency)', amount: c.emergency || 0 },
    { isSeparator: true },
    { item: 'Total Assets', amount: totalAssets, isTotal: true },
    { isSeparator: true },
    { item: 'Liabilities (Loans)', amount: c.loans || 0 },
    { isSeparator: true },
    { item: 'Equity', amount: equity },
    { isSeparator: true },
    { item: 'Total Liabilities & Equity', amount: (parseFloat(c.loans) || 0) + equity, isTotal: true }
  ];

  const searchQuery = searchState.balance;
  // Filter balance rows
  let filteredRows = allRows.filter(row => {
    if (!searchQuery) return true;
    if (row.isSeparator) return true;
    return (row.item || '').toLowerCase().includes(searchQuery);
  });
  
  // Sort balance rows
  const columnMap = {
    item: 'item',
    amount: 'amount'
  };
  filteredRows = sortData(filteredRows, 'balance', columnMap);

  const currentPage = paginationState.balance;
  const paginatedRows = getPaginatedData(filteredRows, currentPage);

  const rowsHtml = paginatedRows.map(r => {
    if (r.isSeparator) return '<tr><td colspan="2" style="height:0.5rem"></td></tr>';
    const isTotal = r.isTotal === true;
    const cls = isTotal ? 'total-row' : '';
    return `<tr class="${cls}">
      <td style="font-weight:${isTotal ? '600' : '400'}">${r.item}</td>
      <td class="num" style="font-weight:${isTotal ? '600' : '400'}">${r.amount ? parseFloat(r.amount).toLocaleString() : ''}</td>
    </tr>`;
  }).join('');

  // Helper to get sort indicator
  const getSortIndicator = (column) => {
    const sort = sortState.balance;
    if (sort.column !== column) return '';
    return sort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  document.getElementById('balanceTable').innerHTML = `
    <thead><tr>
      <th style="cursor:pointer" onclick="sortTable('balance', 'item')">Item${getSortIndicator('item')}</th>
      <th style="cursor:pointer" onclick="sortTable('balance', 'amount')">Amount (TZS)${getSortIndicator('amount')}</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  `;

  // Render mobile cards for balance
  const balanceCardsHtml = paginatedRows.map((r) => {
    if (r.isSeparator) return '';
    const isTotal = r.isTotal === true;
    return `
      <div class="list-card">
        <div class="card-row">
          <div class="card-col" style="flex:2;">
            <span class="card-label">Item</span>
            <span class="card-value" style="font-weight:${isTotal ? '600' : '400'}">${r.item}</span>
          </div>
          <div class="card-col">
            <span class="card-label">Amount</span>
            <span class="card-value" style="font-weight:${isTotal ? '600' : '400'}">${r.amount ? parseFloat(r.amount).toLocaleString() : ''}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  document.getElementById('balanceCards').innerHTML = balanceCardsHtml;

  document.getElementById('balancePagination').innerHTML = renderPaginationControls(filteredRows.length, currentPage, 'balance');
}

// ═══════════════════════════════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════════════════════════════

function allItemCats() {
  return [...BASE_ITEM_CATS, ...data.categories.map(c => c.name)];
}

window.openManageCategories = function() {
  renderCategoryChips();
  document.getElementById('newCatInput').value = '';
  openModal('modalCategoriesBackdrop');
};

function renderCategoryChips() {
  const list = document.getElementById('catChipList');
  const custom = data.categories || [];
  if (!custom.length) {
    list.innerHTML = '<span style="color:var(--mid);font-size:0.8rem">No custom categories yet.</span>';
    return;
  }
  list.innerHTML = custom.map((c) => `
    <span class="chip">${c.name}
      <button class="chip-del" onclick="deleteCat('${c.id}')" title="Remove">×</button>
    </span>`).join('');
}

window.addCategory = async function() {
  if (!currentUser) return;
  
  const inp = document.getElementById('newCatInput');
  const val = inp.value.trim();
  
  if (!val) {
    modalAlert('Empty Name', 'Please enter a category name.', 'warn');
    return;
  }
  
  if (allItemCats().map(c => c.toLowerCase()).includes(val.toLowerCase())) {
    modalAlert('Already Exists', `"${val}" is already a category.`, 'warn');
    return;
  }
  
  showSaveStatus('Saving...');
  
  try {
    const newCat = await db.addCategory(currentUser.id, val.replace(/\b\w/g, c => c.toUpperCase()));
    data.categories.push(newCat);
    inp.value = '';
    renderCategoryChips();
    showSaveStatus('Synced');
    showToast('✅ Category added');
  } catch (error) {
    console.error('Error adding category:', error);
    showToast('❌ Error adding category');
    showSaveStatus('Error');
  }
};

window.deleteCat = function(id) {
  const cat = data.categories.find(c => c.id === id);
  if (!cat) return;
  
  modalConfirm(`Remove "${cat.name}"?`, 'Items using this category will keep their value but the option will be gone.', async () => {
    showSaveStatus('Saving...');
    
    try {
      // Remove from local data first
      data.categories = data.categories.filter(c => c.id !== id);
      renderCategoryChips();
      
      await db.deleteCategory(id);
      showSaveStatus('Synced');
      showToast('✅ Category removed');
    } catch (error) {
      console.error('Error deleting category:', error);
      await loadAllData();
      showToast('❌ Error deleting category');
      showSaveStatus('Error');
    }
  }, '🗂️');
};

document.getElementById('newCatInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') window.addCategory();
});

// ═══════════════════════════════════════════════════════════════
//  EXPORT / IMPORT
// ═══════════════════════════════════════════════════════════════

window.exportData = function() {
  const exportObj = {
    inventory: data.inventory,
    capital: data.capital,
    income: data.income,
    categories: data.categories,
    exportedAt: new Date().toISOString()
  };
  
  const json = JSON.stringify(exportObj, null, 2);
  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `OurStationery_Backup_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📁 Data exported successfully');
};

window.importData = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.income || !parsed.capital) throw new Error('Invalid file');
      
      modalConfirm(
        'Import Data?',
        `This will REPLACE your current data with the backup from "${file.name}". This cannot be undone.`,
        async () => {
          // Import to database
          showSaveStatus('Importing...');
          modalAlert('Import Started', 'Importing data to database...', 'info');
          
          // Note: Full implementation would batch upload all data
          // For now, show warning that this needs to be done manually
          modalAlert('Manual Import Required', 
            'Please note: Importing from file requires manual data migration. Contact support for assistance.',
            'warn');
        },
        '📂'
      );
    } catch (err) {
      modalAlert('Import Failed', 'The file is not a valid Our Stationery backup.', 'warn');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
};

window.confirmReset = function() {
  modalConfirm(
    'Reset All Data?',
    'This will permanently delete all your business data from the database. This action cannot be undone.',
    async () => {
      showSaveStatus('Deleting...');
      
      try {
        // Delete all data
        const deletePromises = [
          ...data.inventory.map(i => db.deleteInventoryItem(i.id)),
          ...data.categories.map(c => db.deleteCategory(c.id))
        ];
        
        await Promise.all(deletePromises);
        
        if (data.capital && data.capital.id) {
          await db.upsertCapital(currentUser.id, {
            owner1_capital: 0, owner2_capital: 0, loans: 0, savings_account: 0,
            emergency: 0, reinvested: 0, owner1_drawings: 0, owner2_drawings: 0
          });
        }
        
        // Reset all income
        for (let i = 0; i < 12; i++) {
          await db.upsertIncome(currentUser.id, i, {
            month_index: i,
            product_sales: 0, stationery_sales: 0, wholesale: 0,
            stock_purchase: 0, rent: 0, salaries: 0, other_exp: 0
          });
        }
        
        await loadAllData();
        renderPage(document.querySelector('.nav-tab.active').id.replace('tab-', ''));
        showSaveStatus('Synced');
        modalAlert('Data Reset', 'All data has been cleared.', 'success');
      } catch (error) {
        console.error('Error resetting data:', error);
        showToast('❌ Error resetting data');
        showSaveStatus('Error');
      }
    },
    '🗑️'
  );
};

window.exportToCSV = function(tableId) {
  let csvContent = '';
  let filename = 'export';
  let rows = [];

  switch(tableId) {
    case 'dashboard':
      filename = 'dashboard';
      const dashRows = MONTHS.map((m, i) => {
        const d = data.income[i];
        const rev = (parseFloat(d.product_sales) || 0) + (parseFloat(d.stationery_sales) || 0) + (parseFloat(d.wholesale) || 0);
        const exp = (parseFloat(d.stock_purchase) || 0) + (parseFloat(d.rent) || 0) + (parseFloat(d.salaries) || 0) + (parseFloat(d.other_exp) || 0);
        const profit = rev - exp;
        return [m, rev, exp, profit];
      });
      rows = [['Month', 'Revenue', 'Expenses', 'Profit'], ...dashRows];
      break;
    case 'sales':
      filename = 'sales';
      const salesRows = (data.sales || []).map(sale => {
        const date = new Date(sale.sale_date).toLocaleDateString('en-GB');
        return [
          sale.invoice_number || '-',
          date,
          sale.customer_name || 'Walk-in',
          (sale.sale_items || []).length,
          (parseFloat(sale.total_amount) || 0),
          sale.payment_method || 'Cash'
        ];
      });
      rows = [['Invoice #', 'Date', 'Customer', 'Items', 'Total (TZS)', 'Payment Method'], ...salesRows];
      break;
    case 'inventory':
      filename = 'inventory';
      const invRows = (data.inventory || []).map(item => [
        item.name || '',
        item.category || '',
        item.quantity || 0,
        item.unit_cost || 0,
        ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)),
        item.reorder_point || 0
      ]);
      rows = [['Item Name', 'Category', 'Quantity', 'Unit Cost', 'Total Value', 'Reorder Point'], ...invRows];
      break;
    case 'customers':
      filename = 'customers';
      const custRows = (data.customers || []).map(customer => [
        customer.name || '',
        customer.email || '',
        customer.phone || '',
        customer.address || ''
      ]);
      rows = [['Name', 'Email', 'Phone', 'Address'], ...custRows];
      break;
    case 'capital':
      filename = 'capital';
      const c = data.capital || {};
      const capRows = [
        ['Owner 1 Capital', c.owner1_capital || 0],
        ['Owner 2 Capital', c.owner2_capital || 0],
        ['Loans', c.loans || 0],
        ['Savings Account', c.savings_account || 0],
        ['Emergency Fund', c.emergency || 0],
        ['Reinvested Profit', c.reinvested || 0],
        ['Owner 1 Drawings', c.owner1_drawings || 0],
        ['Owner 2 Drawings', c.owner2_drawings || 0]
      ];
      rows = [['Description', 'Amount (TZS)'], ...capRows];
      break;
    case 'income':
      filename = 'income';
      const incRows = data.income.map((m, i) => {
        const rev = (parseFloat(m.product_sales) || 0) + (parseFloat(m.stationery_sales) || 0) + (parseFloat(m.wholesale) || 0);
        const exp = (parseFloat(m.stock_purchase) || 0) + (parseFloat(m.rent) || 0) + (parseFloat(m.salaries) || 0) + (parseFloat(m.other_exp) || 0);
        return [
          MONTHS[i],
          m.product_sales || 0,
          m.stationery_sales || 0,
          m.wholesale || 0,
          rev,
          m.stock_purchase || 0,
          m.rent || 0,
          m.salaries || 0,
          m.other_exp || 0,
          exp,
          rev - exp
        ];
      });
      rows = [
        ['Month', 'Product Sales', 'Stationery Sales', 'Wholesale', 'Total Revenue', 'Stock Purchase', 'Rent', 'Salaries', 'Other Exp', 'Total Expenses', 'Profit'],
        ...incRows
      ];
      break;
    case 'balance':
      filename = 'balance';
      const inv = data.inventory || [];
      const invValue = inv.reduce((s, i) => s + ((parseFloat(i.quantity) || 0) * (parseFloat(i.unit_cost) || 0)), 0);
      const cap = data.capital || {};
      const cash = (parseFloat(cap.savings_account) || 0) + (parseFloat(cap.emergency) || 0);
      const totalAssets = invValue + cash;
      const totalCapital = (parseFloat(cap.owner1_capital) || 0) + (parseFloat(cap.owner2_capital) || 0) + 
                           (parseFloat(cap.loans) || 0) + (parseFloat(cap.savings_account) || 0) + 
                           (parseFloat(cap.emergency) || 0) + (parseFloat(cap.reinvested) || 0);
      const totalDrawings = (parseFloat(cap.owner1_drawings) || 0) + (parseFloat(cap.owner2_drawings) || 0);
      const equity = totalCapital - totalDrawings;
      const balRows = [
        ['ASSETS', ''],
        ['Inventory', invValue],
        ['Cash (Savings)', cap.savings_account || 0],
        ['Cash (Emergency)', cap.emergency || 0],
        ['Total Assets', totalAssets],
        ['LIABILITIES & EQUITY', ''],
        ['Liabilities (Loans)', cap.loans || 0],
        ['Equity', equity],
        ['Total Liabilities & Equity', (parseFloat(cap.loans) || 0) + equity]
      ];
      rows = [['Item', 'Amount (TZS)'], ...balRows];
      break;
  }

  csvContent = rows.map(row => 
    row.map(cell => {
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `OurStationery_${filename}_${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ CSV exported successfully');
};

// ═══════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function parseComma(v) {
  if (typeof v === 'number') return v;
  return parseFloat((v || '').toString().replace(/,/g, '')) || 0;
}

function applyCommaFormat(el) {
  const raw = el.value.replace(/,/g, '');
  const parts = raw.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  el.value = parts.join('.');
}

function openModal(id) {
  const bd = document.getElementById(id);
  bd.classList.add('open');
  bd.querySelectorAll('input.num').forEach(el => {
    if (el._modalWired) return;
    el._modalWired = true;
    el.addEventListener('focus', () => { el.value = (parseComma(el.value) || '').toString(); el.select(); });
    el.addEventListener('input', () => applyCommaFormat(el));
    el.addEventListener('blur', () => { const v = parseComma(el.value); el.value = v ? v.toLocaleString('en-US') : ''; });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') el.blur(); });
  });
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

window.closeModal = closeModal;

document.querySelectorAll('.modal-backdrop').forEach(bd => {
  bd.addEventListener('click', e => { if (e.target === bd) bd.classList.remove('open'); });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop.open').forEach(bd => bd.classList.remove('open'));
});

let _confirmCallback = null;
function modalConfirm(title, msg, onOk, icon = '⚠️') {
  document.getElementById('modalConfirmTitle').textContent = title;
  document.getElementById('modalConfirmMsg').textContent = msg;
  document.getElementById('modalConfirmIcon').textContent = icon;
  _confirmCallback = onOk;
  document.getElementById('modalConfirmOk').onclick = () => {
    closeModal('modalConfirmBackdrop');
    if (_confirmCallback) _confirmCallback();
  };
  openModal('modalConfirmBackdrop');
}

window.modalConfirm = modalConfirm;

function modalAlert(title, msg, type = 'info') {
  const icons = {info: 'ℹ️', success: '✅', warn: '⚠️'};
  document.getElementById('modalAlertTitle').textContent = title;
  document.getElementById('modalAlertMsg').textContent = msg;
  document.getElementById('modalAlertIcon').textContent = icons[type] || 'ℹ️';
  const el = document.getElementById('modalAlertEl');
  el.className = 'modal modal-alert ' + (type === 'warn' ? 'warn' : 'info');
  openModal('modalAlertBackdrop');
}

window.modalAlert = modalAlert;

function showToast(msg) {
  const cont = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  cont.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 2500);
}

window.showToast = showToast;

window.printPage = function(pageName) {
  switchTab(pageName);
  setTimeout(() => window.print(), 300);
};

// ═══════════════════════════════════════════════════════════════
//  CUSTOMER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

let editingCustomerId = null;

function renderCustomers() {
  const customers = data.customers || [];
  const searchQuery = searchState.customers;
  
  let filteredCustomers = customers.filter(customer => {
    if (!searchQuery) return true;
    return (customer.name || '').toLowerCase().includes(searchQuery) ||
           (customer.email || '').toLowerCase().includes(searchQuery) ||
           (customer.phone || '').toLowerCase().includes(searchQuery);
  });
  
  const columnMap = {
    name: 'name',
    email: 'email',
    phone: 'phone'
  };
  filteredCustomers = sortData(filteredCustomers, 'customers', columnMap);
  
  if (!filteredCustomers.length) {
    document.getElementById('customersTable').innerHTML = `
      <tbody><tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--mid)">
        No customers found.
      </td></tr></tbody>
    `;
    document.getElementById('customersPagination').innerHTML = '';
    return;
  }

  const currentPage = paginationState.customers;
  const paginatedCustomers = getPaginatedData(filteredCustomers, currentPage);

  const getSortIndicator = (column) => {
    const sort = sortState.customers;
    if (sort.column !== column) return '';
    return sort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const rows = paginatedCustomers.map((customer) => {
    return `<tr>
      <td>${customer.name || ''}</td>
      <td>${customer.email || ''}</td>
      <td>${customer.phone || ''}</td>
      <td>${customer.address || ''}</td>
      <td>
        <button class="btn btn-gold btn-sm" onclick="openCustomerModal('${customer.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${customer.id}')">Delete</button>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('customersTable').innerHTML = `
    <thead><tr>
      <th style="cursor:pointer" onclick="sortTable('customers', 'name')">Name${getSortIndicator('name')}</th>
      <th style="cursor:pointer" onclick="sortTable('customers', 'email')">Email${getSortIndicator('email')}</th>
      <th style="cursor:pointer" onclick="sortTable('customers', 'phone')">Phone${getSortIndicator('phone')}</th>
      <th>Address</th>
      <th>Actions</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  `;

  // Render mobile cards for customers
  const customerCardsHtml = paginatedCustomers.map((customer) => `
    <div class="list-card">
      <div class="card-row">
        <div class="card-col">
          <span class="card-label">Name</span>
          <span class="card-value">${customer.name || ''}</span>
        </div>
        <div class="card-col">
          <span class="card-label">Phone</span>
          <span class="card-value">${customer.phone || ''}</span>
        </div>
      </div>
      <div class="card-row">
        <div class="card-col" style="flex:2;">
          <span class="card-label">Email</span>
          <span class="card-value">${customer.email || ''}</span>
        </div>
        <div class="card-col" style="flex:2;">
          <span class="card-label">Address</span>
          <span class="card-value">${customer.address || ''}</span>
        </div>
      </div>
      <div class="card-row">
        <div class="card-col">
          <button class="btn btn-gold btn-sm card-btn" onclick="openCustomerModal('${customer.id}')">Edit</button>
        </div>
        <div class="card-col">
          <button class="btn btn-danger btn-sm card-btn" onclick="deleteCustomer('${customer.id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
  document.getElementById('customersCards').innerHTML = customerCardsHtml;

  document.getElementById('customersPagination').innerHTML = renderPaginationControls(filteredCustomers.length, currentPage, 'customers');
}

window.openCustomerModal = function(customerId = null) {
  editingCustomerId = customerId;
  
  if (customerId) {
    const customer = data.customers.find(c => c.id === customerId);
    if (customer) {
      document.getElementById('customerName').value = customer.name || '';
      document.getElementById('customerEmail').value = customer.email || '';
      document.getElementById('customerPhone').value = customer.phone || '';
      document.getElementById('customerAddress').value = customer.address || '';
    }
  } else {
    document.getElementById('customerName').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerAddress').value = '';
  }
  
  openModal('modalCustomerBackdrop');
};

window.saveCustomer = async function() {
  if (!currentUser) return;
  
  const name = document.getElementById('customerName').value.trim();
  if (!name) {
    modalAlert('Name Required', 'Please enter a customer name.', 'warn');
    return;
  }
  
  const customerData = {
    name: name,
    email: document.getElementById('customerEmail').value.trim(),
    phone: document.getElementById('customerPhone').value.trim(),
    address: document.getElementById('customerAddress').value.trim()
  };
  
  showSaveStatus('Saving...');
  
  try {
    if (editingCustomerId) {
      // Update existing customer (we'll just update in local data for now)
      const idx = data.customers.findIndex(c => c.id === editingCustomerId);
      if (idx !== -1) {
        data.customers[idx] = { ...data.customers[idx], ...customerData };
      }
    } else {
      // Add new customer
      const newCustomer = {
        id: 'cust_' + Date.now(),
        user_id: currentUser.id,
        ...customerData,
        created_at: new Date().toISOString()
      };
      data.customers.push(newCustomer);
    }
    
    closeModal('modalCustomerBackdrop');
    renderCustomers();
    showSaveStatus('Synced');
    showToast('✅ Customer saved');
  } catch (error) {
    console.error('Error saving customer:', error);
    showToast('❌ Error saving customer');
    showSaveStatus('Error');
  }
};

window.deleteCustomer = function(id) {
  modalConfirm('Delete Customer?', 'This customer will be permanently removed.', async () => {
    // Remove from local data first
    data.customers = data.customers.filter(c => c.id !== id);
    renderCustomers();
    
    try {
      // In a real app, you'd call db.deleteCustomer(id) here
      showToast('✅ Customer deleted');
    } catch (error) {
      console.error('Error deleting customer:', error);
      await loadAllData();
      showToast('❌ Error deleting customer');
    }
  }, '👥');
};

window.updateSaleCustomer = function() {
  const select = document.getElementById('saleCustomerSelect');
  const input = document.getElementById('saleCustomerName');
  
  if (select.value) {
    const customer = data.customers.find(c => c.id === select.value);
    if (customer) {
      input.value = customer.name;
    }
  }
};

// ═══════════════════════════════════════════════════════════════
//  SALES FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function handleSalesChange(payload) {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  
  if (eventType === 'INSERT') {
    data.sales.unshift(newRecord);
  } else if (eventType === 'UPDATE') {
    const idx = data.sales.findIndex(s => s.id === newRecord.id);
    if (idx !== -1) data.sales[idx] = newRecord;
  } else if (eventType === 'DELETE') {
    data.sales = data.sales.filter(s => s.id !== oldRecord.id);
  }
  
  const activeTab = document.querySelector('.nav-tab.active');
  if (activeTab && activeTab.id === 'tab-sales') {
    renderSales();
  }
  renderDashboard();
}

function renderSales() {
  const sales = data.sales || [];
  const searchQuery = searchState.sales;
  
  // Filter sales
  let filteredSales = sales.filter(sale => {
    if (!searchQuery) return true;
    return (sale.customer_name || '').toLowerCase().includes(searchQuery) ||
           (sale.invoice_number || '').toLowerCase().includes(searchQuery) ||
           (sale.payment_method || '').toLowerCase().includes(searchQuery);
  });
  
  // Sort sales
  const columnMap = {
    invoice_number: 'invoice_number',
    sale_date: 'sale_date',
    customer_name: 'customer_name',
    items: (sale) => (sale.sale_items || []).length,
    total_amount: 'total_amount',
    payment_method: 'payment_method'
  };
  filteredSales = sortData(filteredSales, 'sales', columnMap);
  
  if (!filteredSales.length) {
    document.getElementById('salesTable').innerHTML = `
      <tbody><tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--mid)">
        No matching sales found.
      </td></tr></tbody>
    `;
    document.getElementById('salesPagination').innerHTML = '';
    return;
  }

  const currentPage = paginationState.sales;
  const paginatedSales = getPaginatedData(filteredSales, currentPage);

  const rows = paginatedSales.map((sale) => {
    const date = new Date(sale.sale_date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const items = sale.sale_items || [];
    return `<tr>
      <td>${sale.invoice_number || '-'}</td>
      <td>${date}</td>
      <td>${sale.customer_name || 'Walk-in'}</td>
      <td>${items.length} item${items.length !== 1 ? 's' : ''}</td>
      <td class="num">TZS ${(parseFloat(sale.total_amount) || 0).toLocaleString()}</td>
      <td>${sale.payment_method || 'Cash'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteSale('${sale.id}')">Delete</button></td>
    </tr>`;
  }).join('');

  // Helper to get sort indicator
  const getSortIndicator = (column) => {
    const sort = sortState.sales;
    if (sort.column !== column) return '';
    return sort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  document.getElementById('salesTable').innerHTML = `
    <thead><tr>
      <th style="cursor:pointer" onclick="sortTable('sales', 'invoice_number')">Invoice #${getSortIndicator('invoice_number')}</th>
      <th style="cursor:pointer" onclick="sortTable('sales', 'sale_date')">Date${getSortIndicator('sale_date')}</th>
      <th style="cursor:pointer" onclick="sortTable('sales', 'customer_name')">Customer${getSortIndicator('customer_name')}</th>
      <th style="cursor:pointer" onclick="sortTable('sales', 'items')">Items${getSortIndicator('items')}</th>
      <th style="cursor:pointer" onclick="sortTable('sales', 'total_amount')">Total${getSortIndicator('total_amount')}</th>
      <th style="cursor:pointer" onclick="sortTable('sales', 'payment_method')">Payment${getSortIndicator('payment_method')}</th>
      <th>Action</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  `;

  // Render mobile cards for sales
  const salesCardsHtml = paginatedSales.map((sale) => {
    const date = new Date(sale.sale_date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const items = sale.sale_items || [];
    return `
      <div class="list-card">
        <div class="card-row">
          <div class="card-col">
            <span class="card-label">Invoice #</span>
            <span class="card-value">${sale.invoice_number || '-'}</span>
          </div>
          <div class="card-col">
            <span class="card-label">Date</span>
            <span class="card-value">${date}</span>
          </div>
        </div>
        <div class="card-row">
          <div class="card-col">
            <span class="card-label">Customer</span>
            <span class="card-value">${sale.customer_name || 'Walk-in'}</span>
          </div>
          <div class="card-col">
            <span class="card-label">Items</span>
            <span class="card-value">${items.length} item${items.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="card-row">
          <div class="card-col">
            <span class="card-label">Total</span>
            <span class="card-value">TZS ${(parseFloat(sale.total_amount) || 0).toLocaleString()}</span>
          </div>
          <div class="card-col">
            <span class="card-label">Payment</span>
            <span class="card-value">${sale.payment_method || 'Cash'}</span>
          </div>
          <div class="card-col">
            <span class="card-label">Action</span>
            <button class="btn btn-danger btn-sm card-btn" onclick="deleteSale('${sale.id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  document.getElementById('salesCards').innerHTML = salesCardsHtml;

  document.getElementById('salesPagination').innerHTML = renderPaginationControls(filteredSales.length, currentPage, 'sales');
}

function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `INV-${year}${month}${day}-${random}`;
}

window.openNewSaleModal = function() {
  saleItems = [];
  document.getElementById('saleCustomerSelect').innerHTML = `
    <option value="">Walk-in Customer</option>
    ${(data.customers || []).map(customer => 
      `<option value="${customer.id}">${customer.name}</option>`
    ).join('')}
  `;
  document.getElementById('saleCustomerName').value = '';
  document.getElementById('salePaymentMethod').value = 'Cash';
  document.getElementById('saleNotes').value = '';
  renderSaleItems();
  openModal('modalNewSaleBackdrop');
};

function renderSaleItems() {
  const tbody = document.getElementById('saleItemsBody');
  if (!saleItems.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--mid)">Click "Add Item" to start</td></tr>';
  } else {
    tbody.innerHTML = saleItems.map((item, idx) => `
      <tr>
        <td>
          <select onchange="updateSaleItem(${idx}, 'inventory_item_id', this.value); updateSaleItemName(${idx}, this.value)">
            <option value="">Select item...</option>
            ${data.inventory.map(i => `<option value="${i.id}" ${item.inventory_item_id === i.id ? 'selected' : ''}>${i.name}</option>`).join('')}
            <option value="">Custom item...</option>
          </select>
        </td>
        <td><input type="number" class="num-input" value="${item.quantity}" onchange="updateSaleItem(${idx}, 'quantity', this.value); calculateSaleTotal()" style="width:80px"></td>
        <td><input type="number" class="num-input" value="${item.unit_price}" onchange="updateSaleItem(${idx}, 'unit_price', this.value); calculateSaleTotal()" style="width:100px"></td>
        <td class="num">TZS ${((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toLocaleString()}</td>
        <td><button class="btn btn-danger btn-sm" onclick="removeSaleItem(${idx})">×</button></td>
      </tr>
    `).join('');
  }
  calculateSaleTotal();
}

window.addSaleItem = function() {
  saleItems.push({
    inventory_item_id: '',
    item_name: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0
  });
  renderSaleItems();
};

window.removeSaleItem = function(idx) {
  saleItems.splice(idx, 1);
  renderSaleItems();
};

window.updateSaleItem = function(idx, field, value) {
  saleItems[idx][field] = value;
  saleItems[idx].total_price = (parseFloat(saleItems[idx].quantity) || 0) * (parseFloat(saleItems[idx].unit_price) || 0);
  if (field === 'inventory_item_id' && value) {
    const invItem = data.inventory.find(i => i.id === value);
    if (invItem) {
      saleItems[idx].item_name = invItem.name;
      saleItems[idx].unit_price = parseFloat(invItem.unit_cost) * 1.5 || 0;
      saleItems[idx].total_price = (parseFloat(saleItems[idx].quantity) || 0) * (parseFloat(saleItems[idx].unit_price) || 0);
      renderSaleItems();
    }
  }
};

window.updateSaleItemName = function(idx, invId) {
  if (invId) {
    const invItem = data.inventory.find(i => i.id === invId);
    if (invItem) {
      saleItems[idx].item_name = invItem.name;
      saleItems[idx].unit_price = parseFloat(invItem.unit_cost) * 1.5 || 0;
      saleItems[idx].total_price = (parseFloat(saleItems[idx].quantity) || 0) * (parseFloat(saleItems[idx].unit_price) || 0);
      renderSaleItems();
    }
  }
};

function calculateSaleTotal() {
  const total = saleItems.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)), 0);
  document.getElementById('saleTotal').textContent = 'TZS ' + total.toLocaleString();
  return total;
}

window.saveSale = async function() {
  if (!currentUser) return;
  
  if (!saleItems.length) {
    modalAlert('No Items', 'Please add at least one item to the sale.', 'warn');
    return;
  }
  
  const totalAmount = calculateSaleTotal();
  
  showSaveStatus('Saving...');
  
  try {
    const saleData = {
      invoice_number: generateInvoiceNumber(),
      customer_name: document.getElementById('saleCustomerName').value || 'Walk-in Customer',
      payment_method: document.getElementById('salePaymentMethod').value,
      notes: document.getElementById('saleNotes').value,
      total_amount: totalAmount,
      sale_date: new Date().toISOString()
    };
    
    const itemsToSave = saleItems.map(item => ({
      inventory_item_id: item.inventory_item_id || null,
      item_name: item.item_name || 'Custom Item',
      quantity: parseFloat(item.quantity) || 0,
      unit_price: parseFloat(item.unit_price) || 0,
      total_price: (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
    }));
    
    await db.addSale(currentUser.id, saleData, itemsToSave);
    
    closeModal('modalNewSaleBackdrop');
    showSaveStatus('Synced');
    showToast('✅ Sale recorded successfully');
  } catch (error) {
    console.error('Error saving sale:', error);
    showToast('❌ Error saving sale');
    showSaveStatus('Error');
  }
};

window.deleteSale = function(id) {
  modalConfirm('Delete Sale?', 'This sale will be permanently removed.', async () => {
    showSaveStatus('Deleting...');
    
    try {
      // Remove from local data first
      data.sales = data.sales.filter(s => s.id !== id);
      renderSales();
      renderDashboard();
      
      await db.deleteSale(id);
      showSaveStatus('Synced');
      showToast('✅ Sale deleted');
    } catch (error) {
      console.error('Error deleting sale:', error);
      // Revert if error
      await loadAllData();
      showToast('❌ Error deleting sale');
      showSaveStatus('Error');
    }
  }, '🛒');
};

// ═══════════════════════════════════════════════════════════════
//  START APPLICATION
// ═══════════════════════════════════════════════════════════════

init();

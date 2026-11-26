/**
 * =============================================================================
 * Wood Shop Management System - Owner Dashboard & Business Controller
 * File: script.js
 * Architecture: 100% Offline-First (Native IndexedDB + Service Worker PWA)
 * Standard Units: கன அடி (CFT) & ₹ (Indian Rupees)
 * Language: Tamil and English together throughout
 * =============================================================================
 * 
 * Key Responsibilities:
 * 1. Zero initial values: All metrics start at 0 until transactions are recorded.
 * 2. Customizable Wood Categories: Add, rename, safe-delete & inspect wood stock.
 * 3. Buying vs Selling Financial Comparison: Accurate COGS, revenues, expenses & net profit.
 * 4. Interactive dimension calculator for கன அடி: (Length × Width × Thickness) / 12.
 * 5. Modals for Purchases, Sales, Expenses, and Categories with instant calculations.
 * 6. Recent Transactions logging with multi-filter view (All, Sales, Purchases, Expenses).
 * 7. Mobile-first navigation, drawer toggle & shop name editor with LocalStorage.
 * =============================================================================
 */

(function () {
  'use strict';

  // Global State
  let allCategories = [];
  let allProducts = [];
  let allPurchases = [];
  let allSales = [];
  let allExpenses = [];
  let selectedCategoryId = null;
  let currentTxFilter = 'all';

  // Category visual themes (vibrant badges & icons)
  const THEMES = [
    {
      bg: 'bg-amber-bubble',
      svgIcon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#D97706" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>'
    },
    {
      bg: 'bg-purple-bubble',
      svgIcon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#7C3AED" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
    },
    {
      bg: 'bg-green-bubble',
      svgIcon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#059669" stroke-width="2.2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>'
    },
    {
      bg: 'bg-orange-bubble',
      svgIcon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#EA580C" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>'
    },
    {
      bg: 'bg-cyan-bubble',
      svgIcon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#0891B2" stroke-width="2.2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>'
    },
    {
      bg: 'bg-rose-bubble',
      svgIcon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#E11D48" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline><polyline points="7.5 19.79 7.5 14.6 3 12"></polyline><polyline points="21 12 16.5 14.6 16.5 19.79"></polyline></svg>'
    }
  ];

  // ===========================================================================
  // 1. INITIALIZATION & DATA LOADING
  // ===========================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('🪵 Wood Shop Management System initializing...');
    console.log('100% ஆஃப்லைன் மரக்கடை மேலாண்மை தளம் தயாராகிறது...');

    // 1A. Register Service Worker for offline PWA
    registerServiceWorker();

    // 1B. Setup UI listeners
    setupNavigation();
    setupShopNameEditor();
    setupModalHandlers();
    setupDimensionCalculators();
    setupTransactionFilters();
    setupDataBackupRestore();

    // 1C. Connect to IndexedDB and fetch live data
    try {
      if (typeof window.WoodShopDB !== 'undefined') {
        await window.WoodShopDB.initDB();
        await refreshAll();
      } else {
        console.error('WoodShopDB not found. Please ensure database.js is loaded.');
      }
    } catch (err) {
      console.error('Initialization error:', err);
      showNotification('Error connecting to local database: ' + err.message);
    }
  });

  /**
   * Registers the Service Worker for 100% offline functionality.
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            console.log('🛡️ [SW] Service Worker registered for offline use:', reg.scope);
          })
          .catch(err => {
            console.warn('⚠️ [SW] Service Worker registration note:', err.message);
          });
      });
    }
  }

  /**
   * Reloads all records from IndexedDB and re-renders every dashboard section.
   */
  async function refreshAll() {
    try {
      const [cats, prods, purs, sals, exps] = await Promise.all([
        window.WoodShopDB.getAllRecords('categories'),
        window.WoodShopDB.getAllRecords('products'),
        window.WoodShopDB.getAllRecords('purchases'),
        window.WoodShopDB.getAllRecords('sales'),
        window.WoodShopDB.getAllRecords('expenses')
      ]);

      allCategories = cats || [];
      allProducts = prods || [];
      allPurchases = purs || [];
      allSales = sals || [];
      allExpenses = exps || [];

      // Update UI components
      populateCategoryDropdowns();
      renderCategoriesGrid();
      renderBusinessSummaryAndComparison();
      renderTransactions(currentTxFilter);

      // Refresh inspector if currently viewing a category
      if (selectedCategoryId) {
        const activeCat = allCategories.find(c => c.id === selectedCategoryId);
        if (activeCat) {
          inspectCategory(activeCat);
        } else {
          closeCategoryInspector();
        }
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      showNotification('Failed to load records: ' + err.message);
    }
  }

  // ===========================================================================
  // 2. WOOD CATEGORIES (Section A)
  // ===========================================================================

  /**
   * Renders the category cards into #categoriesGrid.
   * Displays wood categories clearly before individual wood stock.
   */
  function renderCategoriesGrid() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    if (allCategories.length === 0) {
      grid.innerHTML = `
        <div class="categories-empty-state">
          <p>No wood categories found / மர வகைகள் எதுவும் இல்லை.</p>
          <button class="btn-action-primary" id="btnEmptyAddCategory">+ Add First Category / முதல் மர வகை சேர்க்க</button>
        </div>
      `;
      document.getElementById('btnEmptyAddCategory')?.addEventListener('click', openAddCategoryModal);
      return;
    }

    // Calculate stock per category: Purchased volume - Sold volume
    const stockMap = calculateCategoryStocks();

    grid.innerHTML = allCategories.map((cat, index) => {
      const theme = THEMES[index % THEMES.length];
      const stock = stockMap[cat.name] || 0;
      const isSelected = selectedCategoryId === cat.id ? 'selected' : '';

      return `
        <div class="category-card ${isSelected}" data-cat-id="${cat.id}" tabindex="0" role="button" aria-label="Inspect ${cat.name}">
          <div class="category-card-top">
            <div class="cat-illustration ${theme.bg}">
              ${theme.svgIcon}
            </div>
            <div class="cat-actions-row" onclick="event.stopPropagation()">
              <button class="cat-btn-icon cat-btn-edit" data-edit-id="${cat.id}" title="Rename Category / பெயர் திருத்து" aria-label="Edit ${cat.name}">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
              <button class="cat-btn-icon cat-btn-delete" data-del-id="${cat.id}" title="Delete Category / நீக்கு" aria-label="Delete ${cat.name}">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="cat-details">
            <span class="cat-title">${escapeHTML(cat.name)}</span>
            <span class="cat-subtitle">${escapeHTML(cat.nameTamil || '')}</span>
          </div>
          <div class="cat-footer">
            <span class="stock-label">இருப்பு / Stock:</span>
            <span class="stock-value">${formatNumber(stock)} கன அடி</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to cards and action buttons
    grid.querySelectorAll('.category-card').forEach(card => {
      const catId = Number(card.getAttribute('data-cat-id'));
      const cat = allCategories.find(c => c.id === catId);
      if (!cat) return;

      // Card click opens category inspector
      card.addEventListener('click', () => {
        inspectCategory(cat);
      });

      // Keyboard accessibility
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inspectCategory(cat);
        }
      });
    });

    // Edit button clicks
    grid.querySelectorAll('.cat-btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const catId = Number(btn.getAttribute('data-edit-id'));
        const cat = allCategories.find(c => c.id === catId);
        if (cat) openEditCategoryModal(cat);
      });
    });

    // Delete button clicks
    grid.querySelectorAll('.cat-btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const catId = Number(btn.getAttribute('data-del-id'));
        const cat = allCategories.find(c => c.id === catId);
        if (cat) handleDeleteCategory(cat);
      });
    });
  }

  /**
   * Displays the Selected Category Stock Inspector panel.
   * Shows itemized wood logs, purchases, sales, and remaining stock for this category.
   */
  function inspectCategory(cat) {
    selectedCategoryId = cat.id;

    // Highlight selected card in the grid
    document.querySelectorAll('.category-card').forEach(c => {
      c.classList.toggle('selected', Number(c.getAttribute('data-cat-id')) === cat.id);
    });

    const inspector = document.getElementById('categoryStockInspector');
    const badge = document.getElementById('inspCategoryBadge');
    const title = document.getElementById('inspCategoryName');
    const stockPill = document.getElementById('inspCategoryTotalStock');
    const body = document.getElementById('inspectorBody');
    if (!inspector || !body) return;

    // Filter purchases & sales for this category
    const catProducts = allProducts.filter(p =>
      p.category === cat.name && !window.WoodShopDB.isInventoryRecordLinked(p)
    );
    const catPurchases = allPurchases.filter(p => p.category === cat.name);
    const catSales = allSales.filter(s => s.category === cat.name);

    const purVol = catPurchases.reduce((acc, p) => acc + (Number(p.volume) || 0), 0);
    const purAmt = catPurchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
    const soldVol = catSales.reduce((acc, s) => acc + (Number(s.volume) || 0), 0);
    const soldAmt = catSales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
    const remainingStock = calculateCategoryStocks()[cat.name] || 0;
    const avgPurRate = purVol > 0 ? (purAmt / purVol) : 0;

    badge.textContent = 'Selected Category / தேர்ந்தெடுக்கப்பட்ட வகை';
    title.textContent = `${cat.name} (${cat.nameTamil || ''})`;
    stockPill.textContent = `${formatNumber(remainingStock)} கன அடி`;

    // Render inspector body with summary metrics and activity log
    body.innerHTML = `
      <div class="inspector-summary-row">
        <div class="insp-stat-box">
          <span class="insp-stat-label">Total Purchased / மொத்த கொள்முதல்</span>
          <span class="insp-stat-val text-cyan">${formatNumber(purVol)} கன அடி</span>
          <span class="insp-stat-sub">Cost: ₹${formatNumber(purAmt)}</span>
        </div>
        <div class="insp-stat-box">
          <span class="insp-stat-label">Total Sold / மொத்த விற்பனை</span>
          <span class="insp-stat-val text-green">${formatNumber(soldVol)} கன அடி</span>
          <span class="insp-stat-sub">Revenue: ₹${formatNumber(soldAmt)}</span>
        </div>
        <div class="insp-stat-box">
          <span class="insp-stat-label">Remaining Stock / தற்போதைய இருப்பு</span>
          <span class="insp-stat-val text-amber">${formatNumber(remainingStock)} கன அடி</span>
          <span class="insp-stat-sub">Avg Rate: ₹${formatNumber(avgPurRate)} / கன அடி</span>
        </div>
      </div>

      <div class="inspector-section-heading">
        <span>Inventory & Activity / இருப்பு மற்றும் பதிவுகள் (${catProducts.length + catPurchases.length + catSales.length})</span>
        <div class="inventory-header-actions">
          <button class="btn-calc-apply" id="btnQuickAddStock" type="button">+ Add Stock</button>
          <button class="btn-calc-apply" id="btnQuickPurThisCat" type="button">+ Record Purchase</button>
        </div>
      </div>

      <div class="inspector-items-list">
        ${renderCategoryActivityItems(catProducts, catPurchases, catSales)}
      </div>
    `;

    document.getElementById('btnQuickAddStock')?.addEventListener('click', () => {
      openInventoryModal(cat.name);
    });
    document.getElementById('btnQuickPurThisCat')?.addEventListener('click', () => {
      openPurchaseModalWithCategory(cat.name);
    });
    body.querySelectorAll('.inventory-edit-btn').forEach(button => {
      button.addEventListener('click', () => {
        const record = allProducts.find(product => product.id === Number(button.dataset.inventoryEditId));
        if (record) openInventoryModal(cat.name, record);
      });
    });
    body.querySelectorAll('.inventory-delete-btn').forEach(button => {
      button.addEventListener('click', () => {
        handleDeleteInventoryRecord(button.dataset.inventoryDeleteId);
      });
    });

    inspector.style.display = 'flex';
    inspector.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderCategoryActivityItems(products, purchases, sales) {
    if (products.length === 0 && purchases.length === 0 && sales.length === 0) {
      return `
        <div class="inspector-empty">
          No timber entries recorded yet for this wood category.<br>
          <span style="font-size: 0.85rem; color: #94A3B8;">இந்த மர வகையில் இதுவரை கொள்முதல் அல்லது விற்பனை பதிவுகள் இல்லை.</span>
        </div>
      `;
    }

    const items = [];
    products.forEach(product => {
      items.push({
        date: product.updatedAt || product.createdAt,
        type: 'inventory',
        id: product.id,
        title: product.name || 'Manual stock',
        description: product.description || '',
        quantity: product.quantity,
        length: product.length,
        width: product.width,
        thickness: product.thickness,
        vol: product.volume,
        rate: product.rate
      });
    });
    purchases.forEach(p => {
      items.push({
        date: p.date,
        type: 'purchase',
        title: `Purchased from ${p.supplierName || 'Supplier'}`,
        vol: p.volume,
        rate: p.rate,
        amt: p.totalAmount
      });
    });

    sales.forEach(s => {
      items.push({
        date: s.date,
        type: 'sale',
        title: `Sold to ${s.customerName || 'Customer'}`,
        vol: s.volume,
        rate: s.rate,
        amt: s.totalAmount
      });
    });

    // Sort descending by date
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    return items.map(item => {
      if (item.type === 'inventory') {
        const hasDimensions = Number(item.length) > 0 && Number(item.width) > 0 && Number(item.thickness) > 0;
        const dimensions = hasDimensions
          ? `${formatNumber(item.length)} ft × ${formatNumber(item.width)} in × ${formatNumber(item.thickness)} in`
          : 'Dimensions not specified';
        return `
          <div class="insp-item-card inventory-record-card">
            <div class="insp-item-top">
              <span class="tx-badge tx-badge-inventory">Inventory stock</span>
              <span class="insp-item-date">${formatDate(item.date)}</span>
            </div>
            <div class="insp-item-main">
              <span class="insp-item-title">${escapeHTML(item.title)}</span>
              <span class="insp-item-amt text-amber">${formatNumber(item.vol)} CFT</span>
            </div>
            <div class="insp-item-meta">
              <span>Pieces: <strong>${formatNumber(item.quantity)}</strong></span>
              <span>${dimensions}</span>
              <span>Purchase rate: ₹${formatNumber(item.rate)} / CFT</span>
            </div>
            ${item.description ? `<p class="inventory-record-description">${escapeHTML(item.description)}</p>` : ''}
            <div class="inventory-record-actions">
              <button type="button" class="btn-calc-apply inventory-edit-btn" data-inventory-edit-id="${item.id}">Edit stock</button>
              <button type="button" class="tx-delete-btn inventory-delete-btn" data-inventory-delete-id="${item.id}">Delete stock</button>
            </div>
          </div>
        `;
      }

      const isSale = item.type === 'sale';
      const badge = isSale ? '<span class="tx-badge tx-badge-sale">Sale / விற்பனை</span>' : '<span class="tx-badge tx-badge-purchase">Purchase / கொள்முதல்</span>';
      const amtColor = isSale ? 'text-green' : 'text-cyan';
      const sign = isSale ? '+₹' : '-₹';

      return `
        <div class="insp-item-card">
          <div class="insp-item-top">
            ${badge}
            <span class="insp-item-date">${formatDate(item.date)}</span>
          </div>
          <div class="insp-item-main">
            <span class="insp-item-title">${escapeHTML(item.title)}</span>
            <span class="insp-item-amt ${amtColor}">${sign}${formatNumber(item.amt)}</span>
          </div>
          <div class="insp-item-meta">
            <span>அளவு: <strong>${formatNumber(item.vol)} கன அடி</strong></span>
            <span>விலை: ₹${formatNumber(item.rate)} / கன அடி</span>
          </div>
        </div>
      `;
    }).join('');
  }

  async function handleDeleteInventoryRecord(recordId) {
    const record = allProducts.find(product => product.id === Number(recordId));
    if (!record) return;

    const confirmed = window.confirm(
      `Delete stock entry "${record.name || 'Inventory stock'}" (${formatNumber(record.volume)} CFT)?\n\n` +
      `This removes the inventory entry from IndexedDB. Related sales are protected from an invalid stock balance.`
    );
    if (!confirmed) return;

    try {
      await window.WoodShopDB.deleteInventoryRecord(record.id);
      await refreshAll();
      showNotification(`✓ Stock entry "${record.name || 'Inventory stock'}" deleted.`);
    } catch (err) {
      console.error('Failed to delete inventory record:', err);
      showNotification(`Error deleting stock entry: ${err.message}`);
    }
  }

  function closeCategoryInspector() {
    selectedCategoryId = null;
    const inspector = document.getElementById('categoryStockInspector');
    if (inspector) inspector.style.display = 'none';
    document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
  }

  /**
   * Safe Category Deletion: Calls WoodShopDB.deleteCategorySafe to verify
   * that no existing transactions or stock records depend on this category.
   */
  async function handleDeleteCategory(cat) {
    const confirmed = window.confirm(
      `Are you sure you want to delete category "${cat.name} / ${cat.nameTamil || ''}"?\n\n` +
      `இந்த மர வகையை நீக்க விரும்புகிறீர்களா?\n\n` +
      `(Note: Categories with existing sales or purchases cannot be deleted for data integrity.)`
    );
    if (!confirmed) return;

    try {
      await window.WoodShopDB.deleteCategorySafe(cat.id, cat.name);
      showNotification(`✓ Category "${cat.name}" deleted successfully.`);
      if (selectedCategoryId === cat.id) {
        closeCategoryInspector();
      }
      await refreshAll();
    } catch (err) {
      alert(err.message);
      showNotification('❌ Deletion blocked: ' + err.message);
    }
  }

  // ===========================================================================
  // 3. BUSINESS SUMMARY & BUYING VS SELLING COMPARISON (Sections B & C)
  // ===========================================================================

  /**
   * Dynamically computes all 5 summary cards and comparison dashboard metrics.
   * Everything starts at 0 initially when no transactions exist.
   * Uses accurate Cost of Goods Sold (COGS) for gross and net profits.
   */
  function renderBusinessSummaryAndComparison() {
    // 3A. Per-category volume and financial aggregations
    const catStats = {};
    allCategories.forEach(cat => {
      catStats[cat.name] = {
        purchasedVol: 0,
        purchasedAmt: 0,
        inventoryVol: 0,
        inventoryValue: 0,
        soldVol: 0,
        soldAmt: 0,
        buyingExpenses: 0,
        sellingExpenses: 0
      };
    });

    let totalPurchasedVol = 0;
    let totalPurchasedAmt = 0;
    let totalBuyingExpenses = 0;

    allPurchases.forEach(p => {
      const vol = Number(p.volume) || 0;
      const amt = Number(p.totalAmount) || 0;
      const exp = Number(p.expenseAmount) || 0;

      totalPurchasedVol += vol;
      totalPurchasedAmt += amt;
      totalBuyingExpenses += exp;

      if (!catStats[p.category]) {
        catStats[p.category] = { purchasedVol: 0, purchasedAmt: 0, inventoryVol: 0, inventoryValue: 0, soldVol: 0, soldAmt: 0, buyingExpenses: 0, sellingExpenses: 0 };
      }
      catStats[p.category].purchasedVol += vol;
      catStats[p.category].purchasedAmt += amt;
      catStats[p.category].buyingExpenses += exp;
    });

    allProducts.forEach(product => {
      if (window.WoodShopDB.isInventoryRecordLinked(product)) return;
      const vol = Number(product.volume) || 0;
      const value = vol * (Number(product.rate) || 0);
      if (!catStats[product.category]) {
        catStats[product.category] = { purchasedVol: 0, purchasedAmt: 0, inventoryVol: 0, inventoryValue: 0, soldVol: 0, soldAmt: 0, buyingExpenses: 0, sellingExpenses: 0 };
      }
      catStats[product.category].inventoryVol += vol;
      catStats[product.category].inventoryValue += value;
    });

    let totalSoldVol = 0;
    let totalSoldAmt = 0;
    let totalSellingExpenses = 0;

    allSales.forEach(s => {
      const vol = Number(s.volume) || 0;
      const amt = Number(s.totalAmount) || 0;
      const exp = Number(s.expenseAmount) || 0;

      totalSoldVol += vol;
      totalSoldAmt += amt;
      totalSellingExpenses += exp;

      if (!catStats[s.category]) {
        catStats[s.category] = { purchasedVol: 0, purchasedAmt: 0, inventoryVol: 0, inventoryValue: 0, soldVol: 0, soldAmt: 0, buyingExpenses: 0, sellingExpenses: 0 };
      }
      catStats[s.category].soldVol += vol;
      catStats[s.category].soldAmt += amt;
      catStats[s.category].sellingExpenses += exp;
    });

    // Total Operating Expenses
    const totalOperatingExpenses = allExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const allExpensesTotal = totalBuyingExpenses + totalSellingExpenses + totalOperatingExpenses;

    // Total Stock in கன அடி
    const totalStockVol = Object.values(calculateCategoryStocks()).reduce((sum, volume) => sum + volume, 0);

    // Include manual inventory cost when estimating the weighted stock cost.
    const catAvgPurRates = {};
    Object.keys(catStats).forEach(cName => {
      const cs = catStats[cName];
      const costBasisVolume = cs.purchasedVol + cs.inventoryVol;
      const costBasisValue = cs.purchasedAmt + cs.inventoryValue;
      catAvgPurRates[cName] = costBasisVolume > 0 ? (costBasisValue / costBasisVolume) : 0;
    });

    // COGS (Cost of Goods Sold) = Sum of (Sold Volume of Cat C × Avg Purchase Rate of Cat C)
    let cogs = 0;
    allSales.forEach(s => {
      const vol = Number(s.volume) || 0;
      const rate = catAvgPurRates[s.category] || 0;
      cogs += (vol * rate);
    });

    // Gross Profit = Total Sales - COGS
    const grossProfit = totalSoldAmt - cogs;

    // Net Profit = Gross Profit - Selling Expenses - Operating Expenses
    const netProfit = grossProfit - totalSellingExpenses - totalOperatingExpenses;

    // Unsold Inventory Value = Sum of (Remaining Volume of Cat C × Avg Purchase Rate of Cat C)
    let unsoldInventoryVal = 0;
    Object.keys(catStats).forEach(cName => {
      const cs = catStats[cName];
      const remaining = Math.max(0, cs.purchasedVol + cs.inventoryVol - cs.soldVol);
      const rate = catAvgPurRates[cName] || 0;
      unsoldInventoryVal += (remaining * rate);
    });

    // Today's metrics
    const todaySalesList = allSales.filter(s => isToday(s.date));
    const todaySalesAmt = todaySalesList.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const todaySalesCount = todaySalesList.length;

    const todayPurchasesList = allPurchases.filter(p => isToday(p.date));
    const todayPurchasesAmt = todayPurchasesList.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const todayPurchasesCount = todayPurchasesList.length;

    // Unique suppliers & customers
    const uniqueSuppliers = new Set(allPurchases.map(p => p.supplierName).filter(Boolean)).size;
    const uniqueCustomers = new Set(allSales.map(s => s.customerName).filter(Boolean)).size;

    const avgPurchaseRateOverall = totalPurchasedVol > 0 ? (totalPurchasedAmt / totalPurchasedVol) : 0;
    const avgSaleRateOverall = totalSoldVol > 0 ? (totalSoldAmt / totalSoldVol) : 0;

    // -------------------------------------------------------------------------
    // 3B. Render Summary Cards (Section B - All 0 Initially!)
    // -------------------------------------------------------------------------
    setElementText('valTotalStock', `${formatNumber(totalStockVol)} கன அடி`);
    setElementText('valTotalStockSubtitle', `${allCategories.length} categories in yard`);

    setElementText('valTodaySales', `₹${formatNumber(todaySalesAmt)}`);
    setElementText('valTodaySalesCount', `${todaySalesCount} bill${todaySalesCount === 1 ? '' : 's'} recorded`);

    setElementText('valTodayPurchases', `₹${formatNumber(todayPurchasesAmt)}`);
    setElementText('valTodayPurchasesCount', `${todayPurchasesCount} purchase${todayPurchasesCount === 1 ? '' : 's'} recorded`);

    setElementText('valTotalExpenses', `₹${formatNumber(allExpensesTotal)}`);

    const netProfitElem = document.getElementById('valNetProfit');
    if (netProfitElem) {
      netProfitElem.textContent = `${netProfit < 0 ? '-' : ''}₹${formatNumber(Math.abs(netProfit))}`;
      netProfitElem.style.color = netProfit < 0 ? '#E11D48' : '';
    }

    // -------------------------------------------------------------------------
    // 3C. Render Comparison Dashboard (Section C)
    // -------------------------------------------------------------------------
    // 1. Buying Details
    setElementText('compTotalPurchases', `₹${formatNumber(totalPurchasedAmt)}`);
    setElementText('compBuyingExpenses', `₹${formatNumber(totalBuyingExpenses)}`);
    setElementText('compTotalPurchasedVolume', `${formatNumber(totalPurchasedVol)} கன அடி`);
    setElementText('compAvgPurchaseRate', `₹${formatNumber(avgPurchaseRateOverall)} / கன அடி`);
    setElementText('compSuppliersCount', `${uniqueSuppliers} registered`);

    // 2. Selling Details
    setElementText('compTotalSales', `₹${formatNumber(totalSoldAmt)}`);
    setElementText('compSellingExpenses', `₹${formatNumber(totalSellingExpenses)}`);
    setElementText('compTotalSoldVolume', `${formatNumber(totalSoldVol)} கன அடி`);
    setElementText('compAvgSaleRate', `₹${formatNumber(avgSaleRateOverall)} / கன அடி`);
    setElementText('compCustomersCount', `${uniqueCustomers} buyers`);

    // 3. Profit & Performance Analysis
    setElementText('compCOGS', `₹${formatNumber(cogs)}`);
    setElementText('compGrossProfit', `₹${formatNumber(grossProfit)}`);
    setElementText('compAllExpenses', `₹${formatNumber(allExpensesTotal)}`);
    
    const compNetProfitElem = document.getElementById('compNetProfitVal');
    if (compNetProfitElem) {
      compNetProfitElem.textContent = `${netProfit < 0 ? '-' : ''}₹${formatNumber(Math.abs(netProfit))}`;
      compNetProfitElem.style.color = netProfit < 0 ? '#E11D48' : '#7C3AED';
    }

    setElementText('compUnsoldInventoryValue', `₹${formatNumber(unsoldInventoryVal)}`);
  }

  function calculateCategoryStocks() {
    const map = {};
    allCategories.forEach(c => { map[c.name] = 0; });

    allProducts.forEach(product => {
      if (window.WoodShopDB.isInventoryRecordLinked(product)) return;
      const vol = Number(product.volume) || 0;
      map[product.category] = (map[product.category] || 0) + vol;
    });

    allPurchases.forEach(p => {
      const vol = Number(p.volume) || 0;
      map[p.category] = (map[p.category] || 0) + vol;
    });

    allSales.forEach(s => {
      const vol = Number(s.volume) || 0;
      map[s.category] = (map[s.category] || 0) - vol;
    });

    Object.keys(map).forEach(k => {
      map[k] = Math.max(0, map[k]);
    });

    return map;
  }

  // ===========================================================================
  // 4. TRANSACTIONS & FINANCIAL LOGS (Section E)
  // ===========================================================================

  /**
   * Merges purchases, sales, and operating expenses into a unified timeline.
   */
  function renderTransactions(filter = 'all') {
    const tbody = document.getElementById('txTableBody');
    const mobileList = document.getElementById('txMobileList');
    if (!tbody || !mobileList) return;

    const unifiedList = [];

    // 1. Sales
    allSales.forEach(s => {
      unifiedList.push({
        id: `SAL-${s.id}`,
        recordId: s.id,
        type: 'sale',
        typeLabel: 'Sale / விற்பனை',
        date: s.date,
        category: s.category || 'Timber',
        party: s.customerName || 'Customer',
        volume: Number(s.volume) || 0,
        rate: Number(s.rate) || 0,
        expense: Number(s.expenseAmount) || 0,
        amount: Number(s.totalAmount) || 0,
        isIncome: true
      });
    });

    // 2. Purchases
    allPurchases.forEach(p => {
      unifiedList.push({
        id: `PUR-${p.id}`,
        recordId: p.id,
        type: 'purchase',
        typeLabel: 'Purchase / கொள்முதல்',
        date: p.date,
        category: p.category || 'Timber',
        party: p.supplierName || 'Supplier',
        volume: Number(p.volume) || 0,
        rate: Number(p.rate) || 0,
        expense: Number(p.expenseAmount) || 0,
        amount: Number(p.totalAmount) || 0,
        isIncome: false
      });
    });

    // 3. Expenses
    allExpenses.forEach(e => {
      unifiedList.push({
        id: `EXP-${e.id}`,
        recordId: e.id,
        type: 'expense',
        typeLabel: 'Expense / செலவு',
        date: e.date,
        category: e.category || 'General',
        party: e.description || 'Operating Cost',
        volume: 0,
        rate: 0,
        expense: 0,
        amount: Number(e.amount) || 0,
        isIncome: false
      });
    });

    // Sort descending by date
    unifiedList.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Filter
    const filtered = unifiedList.filter(item => {
      if (filter === 'all') return true;
      return item.type === filter;
    });

    // 4A. Empty state
    if (filtered.length === 0) {
      const emptyMsg = `
        <div class="tx-empty-state">
          <p style="font-weight: 700; color: #475569; margin-bottom: 0.25rem;">
            No transactions recorded yet / இதுவரை எந்த பரிவர்த்தனையும் பதிவு செய்யப்படவில்லை.
          </p>
          <span style="font-size: 0.85rem; color: #94A3B8;">
            Use the Quick Actions buttons above to record your first wood purchase, sale, or expense.
          </span>
        </div>
      `;
      tbody.innerHTML = `<tr><td colspan="9">${emptyMsg}</td></tr>`;
      mobileList.innerHTML = emptyMsg;
      return;
    }

    // 4B. Render Desktop Table
    tbody.innerHTML = filtered.map(t => {
      const badgeClass = `tx-badge tx-badge-${t.type}`;
      const amountClass = t.isIncome ? 'tx-amount-in' : 'tx-amount-out';
      const sign = t.isIncome ? '+₹' : '-₹';
      const volText = t.volume > 0 ? `${formatNumber(t.volume)} கன அடி` : '—';
      const rateText = t.rate > 0 ? `₹${formatNumber(t.rate)}` : '—';
      const expText = t.expense > 0 ? `₹${formatNumber(t.expense)}` : '—';

      return `
        <tr>
          <td style="font-weight: 600; color: #475569;">${formatDate(t.date)}</td>
          <td><span class="${badgeClass}">${t.typeLabel}</span></td>
          <td style="font-weight: 700; color: #1E293B;">${escapeHTML(t.category)}</td>
          <td style="color: #475569;">${escapeHTML(t.party)}</td>
          <td style="font-weight: 700;">${volText}</td>
          <td>${rateText}</td>
          <td style="color: #E11D48;">${expText}</td>
          <td class="${amountClass}">${sign}${formatNumber(t.amount)}</td>
          <td><button type="button" class="tx-delete-btn" data-delete-store="${t.type}" data-delete-id="${t.recordId}" aria-label="Delete ${t.typeLabel} ${t.id}">Delete</button></td>
        </tr>
      `;
    }).join('');

    // 4C. Render Mobile Cards View
    mobileList.innerHTML = filtered.map(t => {
      const badgeClass = `tx-badge tx-badge-${t.type}`;
      const amountClass = t.isIncome ? 'tx-amount-in' : 'tx-amount-out';
      const sign = t.isIncome ? '+₹' : '-₹';
      const volText = t.volume > 0 ? ` &bull; ${formatNumber(t.volume)} கன அடி` : '';

      return `
        <div class="tx-mobile-card">
          <div class="tx-m-top">
            <span class="${badgeClass}">${t.typeLabel}</span>
            <span class="tx-m-amount ${amountClass}">${sign}${formatNumber(t.amount)}</span>
          </div>
          <div class="tx-m-title">${escapeHTML(t.category)} — ${escapeHTML(t.party)}</div>
          <div class="tx-m-meta">
            <span>${formatDate(t.date)}${volText}</span>
            <span class="status-pill-done">✓ Saved</span>
          </div>
          <button type="button" class="tx-delete-btn" data-delete-store="${t.type}" data-delete-id="${t.recordId}" aria-label="Delete ${t.typeLabel} ${t.id}">Delete transaction</button>
        </div>
      `;
    }).join('');

    [tbody, mobileList].forEach(container => {
      container.querySelectorAll('.tx-delete-btn').forEach(button => {
        button.addEventListener('click', () => {
          handleDeleteTransaction(
            button.getAttribute('data-delete-store'),
            button.getAttribute('data-delete-id'),
            button
          );
        });
      });
    });
  }

  async function handleDeleteTransaction(storeName, recordId, button) {
    const typeLabels = {
      sale: { label: 'sale', store: 'sales' },
      purchase: { label: 'purchase', store: 'purchases' },
      expense: { label: 'expense', store: 'expenses' }
    };
    const transactionType = typeLabels[storeName];
    if (!transactionType || !recordId) return;

    const confirmed = window.confirm(
      `Delete this ${transactionType.label} transaction (record ${recordId})?\n\n` +
      `This permanently removes the record. The dashboard and stock will be recalculated.`
    );
    if (!confirmed) return;

    button.disabled = true;
    try {
      await window.WoodShopDB.deleteHistoryRecord(transactionType.store, recordId);
      await refreshAll();
      showNotification(`✓ ${transactionType.label.charAt(0).toUpperCase() + transactionType.label.slice(1)} transaction deleted.`);
    } catch (err) {
      console.error(`Failed to delete ${transactionType.label} transaction:`, err);
      showNotification(`Error deleting transaction: ${err.message}`);
      button.disabled = false;
    }
  }

  function setupTransactionFilters() {
    const filterBtns = document.querySelectorAll('.tx-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTxFilter = btn.getAttribute('data-filter') || 'all';
        renderTransactions(currentTxFilter);
      });
    });
  }

  // ===========================================================================
  // 5. INTERACTIVE MODALS & FORM HANDLERS
  // ===========================================================================

  function setupModalHandlers() {
    // 5A. Open Modal Triggers
    document.getElementById('qaRecordPurchaseBtn')?.addEventListener('click', () => openModal('purchaseModalOverlay'));
    document.getElementById('qaNewSaleBtn')?.addEventListener('click', () => openModal('saleModalOverlay'));
    document.getElementById('qaAddExpenseBtn')?.addEventListener('click', () => openModal('expenseModalOverlay'));
    document.getElementById('qaAddCategoryBtn')?.addEventListener('click', openAddCategoryModal);
    document.getElementById('btnOpenAddCategoryModal')?.addEventListener('click', openAddCategoryModal);

    // 5B. Close Modal Triggers
    document.getElementById('closePurchaseModalBtn')?.addEventListener('click', () => closeModal('purchaseModalOverlay'));
    document.getElementById('btnCancelPurchase')?.addEventListener('click', () => closeModal('purchaseModalOverlay'));

    document.getElementById('closeSaleModalBtn')?.addEventListener('click', () => closeModal('saleModalOverlay'));
    document.getElementById('btnCancelSale')?.addEventListener('click', () => closeModal('saleModalOverlay'));

    document.getElementById('closeExpenseModalBtn')?.addEventListener('click', () => closeModal('expenseModalOverlay'));
    document.getElementById('btnCancelExpense')?.addEventListener('click', () => closeModal('expenseModalOverlay'));

    document.getElementById('closeCategoryModalBtn')?.addEventListener('click', () => closeModal('categoryModalOverlay'));
    document.getElementById('btnCancelCategory')?.addEventListener('click', () => closeModal('categoryModalOverlay'));
    document.getElementById('closeInventoryModalBtn')?.addEventListener('click', () => closeModal('inventoryModalOverlay'));
    document.getElementById('btnCancelInventory')?.addEventListener('click', () => closeModal('inventoryModalOverlay'));

    document.getElementById('btnCloseInspector')?.addEventListener('click', closeCategoryInspector);

    // Overlay outside-click closes modal
    document.querySelectorAll('.action-modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal(overlay.id);
        }
      });
    });

    // Escape key closes modals and inspector
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllModals();
        closeCategoryInspector();
      }
    });

    // 5C. Form Submissions
    setupPurchaseFormSubmit();
    setupSaleFormSubmit();
    setupExpenseFormSubmit();
    setupCategoryFormSubmit();
    setupInventoryFormSubmit();

    // 5D. Real-time auto-calculation of total amounts
    setupLiveAmountCalculators();
    setupInventoryDimensionCalculator();
  }

  function setupDataBackupRestore() {
    const exportButton = document.getElementById('btnExportBackup');
    const importButton = document.getElementById('btnImportBackup');
    const fileInput = document.getElementById('backupFileInput');
    if (!exportButton || !importButton || !fileInput) return;

    exportButton.addEventListener('click', async () => {
      exportButton.disabled = true;
      try {
        const backup = await window.WoodShopDB.createBackupData();
        downloadBackupFile(backup, 'backup');
        showNotification('Backup download requested. Check your browser downloads and verify the JSON file.');
      } catch (err) {
        console.error('Failed to export database backup:', err);
        showNotification(`Backup export failed: ${err.message}`);
      } finally {
        exportButton.disabled = false;
      }
    });

    importButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;

      exportButton.disabled = true;
      importButton.disabled = true;
      try {
        const backup = JSON.parse(await file.text());
        const counts = window.WoodShopDB.validateBackupData(backup);
        const incomingCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
        const confirmed = window.confirm(
          `Restore this backup containing ${incomingCount} records?\n\n` +
          `CURRENT BUSINESS DATA WILL BE REPLACED in all six stores.\n\n` +
          `Before proceeding, cancel this restore, use Export Backup, and verify that the current-data JSON file opens and contains your records.\n\n` +
          `The app cannot verify whether the browser saves its extra safety download. Have you exported and verified a separate backup? Select OK only if yes.`
        );
        if (!confirmed) {
          showNotification('Backup restore cancelled. Existing data was not changed.');
          return;
        }

        await window.WoodShopDB.restoreBackupData(backup, existingBackup => {
          const existingCount = Object.values(existingBackup.stores)
            .reduce((sum, records) => sum + records.length, 0);
          if (existingCount > 0) {
            downloadBackupFile(existingBackup, 'before-restore');
          }
        });
        await refreshAll();
        showNotification(`✓ Backup restored. ${incomingCount} records loaded across all six stores.`);
      } catch (err) {
        console.error('Failed to import database backup:', err);
        const reason = err instanceof SyntaxError
          ? 'The selected file is not valid JSON.'
          : err.message;
        showNotification(`Backup restore failed: ${reason}`);
      } finally {
        exportButton.disabled = false;
        importButton.disabled = false;
      }
    });
  }

  function getBackupFilename(suffix) {
    const date = new Date().toISOString().slice(0, 10);
    return `woodshop-${suffix}-${date}.json`;
  }

  function downloadBackupFile(backup, suffix) {
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getBackupFilename(suffix);
    link.style.position = 'fixed';
    link.style.left = '-10000px';
    link.style.top = '0';
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function closeAllModals() {
    document.querySelectorAll('.action-modal-overlay').forEach(m => {
      m.classList.remove('active');
      m.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = '';
  }

  /**
   * Populates category dropdown options in Purchase and Sale modals.
   */
  function populateCategoryDropdowns() {
    const purCatSelect = document.getElementById('purCategory');
    const saleCatSelect = document.getElementById('saleCategory');
    const inventoryCategorySelect = document.getElementById('inventoryCategory');

    const optionsHTML = allCategories.map(c => {
      return `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)} (${escapeHTML(c.nameTamil || '')})</option>`;
    }).join('');

    if (purCatSelect) purCatSelect.innerHTML = optionsHTML;
    if (inventoryCategorySelect) inventoryCategorySelect.innerHTML = optionsHTML;
    if (saleCatSelect) {
      saleCatSelect.innerHTML = optionsHTML;
      updateSaleAvailableStockNotice();
    }
  }

  function openPurchaseModalWithCategory(catName) {
    openModal('purchaseModalOverlay');
    const select = document.getElementById('purCategory');
    if (select && catName) {
      select.value = catName;
    }
  }

  function openInventoryModal(categoryName, record = null) {
    const form = document.getElementById('inventoryForm');
    form?.reset();
    document.getElementById('inventoryRecordId').value = record ? record.id : '';
    document.getElementById('inventoryCategory').value = categoryName || (record && record.category) || '';
    document.getElementById('inventoryQuantity').value = record ? record.quantity : '1';
    document.getElementById('inventoryVolume').value = record ? record.volume : '';
    document.getElementById('inventoryRate').value = record ? record.rate : '0';
    document.getElementById('inventoryName').value = record ? record.name || '' : '';
    document.getElementById('inventoryLength').value = record && record.length ? record.length : '';
    document.getElementById('inventoryWidth').value = record && record.width ? record.width : '';
    document.getElementById('inventoryThickness').value = record && record.thickness ? record.thickness : '';
    document.getElementById('inventoryDescription').value = record ? record.description || '' : '';
    setElementText('inventoryModalTitle', record ? 'Edit Inventory Stock / இருப்பைத் திருத்து' : 'Add Inventory Stock / இருப்பு சேர்க்க');
    setElementText('btnSaveInventory', record ? 'Update Stock / இருப்பை மாற்று' : 'Save Stock / இருப்பை சேமி');
    openModal('inventoryModalOverlay');
  }

  function openAddCategoryModal() {
    document.getElementById('categoryForm')?.reset();
    document.getElementById('editCategoryId').value = '';
    setElementText('modalCategoryTitle', 'Add Wood Category / புதிய மர வகை');
    setElementText('modalCategorySubtitle', 'Customize timber species for your shop');
    setElementText('btnSaveCategory', 'Save Category / சேமி');
    openModal('categoryModalOverlay');
  }

  function openEditCategoryModal(cat) {
    document.getElementById('editCategoryId').value = cat.id;
    const nameInp = document.getElementById('catNameInput');
    const nameTaInp = document.getElementById('catNameTaInput');
    const descInp = document.getElementById('catDescInput');

    if (nameInp) nameInp.value = cat.name || '';
    if (nameTaInp) nameTaInp.value = cat.nameTamil || '';
    if (descInp) descInp.value = cat.description || '';

    setElementText('modalCategoryTitle', 'Rename Wood Category / மர வகை திருத்து');
    setElementText('modalCategorySubtitle', 'Update category name and details');
    setElementText('btnSaveCategory', 'Update / மாற்றுக');

    openModal('categoryModalOverlay');
  }

  /**
   * Live calculation of total purchase/sale amounts on volume or rate change.
   */
  function setupLiveAmountCalculators() {
    // Purchase: Total = (Volume × Rate) + Purchasing Expenses
    const purVol = document.getElementById('purVolume');
    const purRate = document.getElementById('purRate');
    const purExp = document.getElementById('purExpense');
    const purTot = document.getElementById('purTotal');

    function calcPurTotal() {
      const v = parseFloat(purVol?.value) || 0;
      const r = parseFloat(purRate?.value) || 0;
      const e = parseFloat(purExp?.value) || 0;
      if (purTot && (v > 0 || r > 0)) {
        purTot.value = Math.round((v * r) + e);
      }
    }
    purVol?.addEventListener('input', calcPurTotal);
    purRate?.addEventListener('input', calcPurTotal);
    purExp?.addEventListener('input', calcPurTotal);

    // Sale: Total = (Volume × Rate)
    const saleVol = document.getElementById('saleVolume');
    const saleRate = document.getElementById('saleRate');
    const saleTot = document.getElementById('saleTotal');
    const saleCat = document.getElementById('saleCategory');

    function calcSaleTotal() {
      const v = parseFloat(saleVol?.value) || 0;
      const r = parseFloat(saleRate?.value) || 0;
      if (saleTot && (v > 0 || r > 0)) {
        saleTot.value = Math.round(v * r);
      }
    }
    saleVol?.addEventListener('input', calcSaleTotal);
    saleRate?.addEventListener('input', calcSaleTotal);
    saleCat?.addEventListener('change', updateSaleAvailableStockNotice);
  }

  function updateSaleAvailableStockNotice() {
    const saleCat = document.getElementById('saleCategory');
    const notice = document.getElementById('saleStockNotice');
    if (!saleCat || !notice) return;

    const catName = saleCat.value;
    const stockMap = calculateCategoryStocks();
    const available = stockMap[catName] || 0;
    notice.textContent = `Available Stock: ${formatNumber(available)} கன அடி`;
    notice.style.color = available > 0 ? '#059669' : '#E11D48';
  }

  /**
   * Dimension Calculator: (Length × Width × Thickness) / 12 = கன அடி
   */
  function setupDimensionCalculators() {
    // Purchase Calculator
    document.getElementById('btnApplyPurCalc')?.addEventListener('click', () => {
      const l = parseFloat(document.getElementById('purCalcLength')?.value) || 0;
      const w = parseFloat(document.getElementById('purCalcWidth')?.value) || 0;
      const t = parseFloat(document.getElementById('purCalcThickness')?.value) || 0;

      if (l <= 0 || w <= 0 || t <= 0) {
        alert('Please enter valid dimensions (Length, Width & Thickness) / சரியான அளவுகளை உள்ளிடவும்.');
        return;
      }

      const cft = (l * w * t) / 12;
      const rounded = Math.round(cft * 100) / 100;
      const volInp = document.getElementById('purVolume');
      if (volInp) {
        volInp.value = rounded;
        volInp.dispatchEvent(new Event('input'));
      }
      showNotification(`📐 Calculated volume: ${rounded} கன அடி`);
    });

    // Sale Calculator
    document.getElementById('btnApplySaleCalc')?.addEventListener('click', () => {
      const l = parseFloat(document.getElementById('saleCalcLength')?.value) || 0;
      const w = parseFloat(document.getElementById('saleCalcWidth')?.value) || 0;
      const t = parseFloat(document.getElementById('saleCalcThickness')?.value) || 0;

      if (l <= 0 || w <= 0 || t <= 0) {
        alert('Please enter valid dimensions (Length, Width & Thickness) / சரியான அளவுகளை உள்ளிடவும்.');
        return;
      }

      const cft = (l * w * t) / 12;
      const rounded = Math.round(cft * 100) / 100;
      const volInp = document.getElementById('saleVolume');
      if (volInp) {
        volInp.value = rounded;
        volInp.dispatchEvent(new Event('input'));
      }
      showNotification(`📐 Calculated volume: ${rounded} கன அடி`);
    });
  }

  function setupInventoryDimensionCalculator() {
    document.getElementById('btnCalculateInventoryCFT')?.addEventListener('click', () => {
      const length = Number(document.getElementById('inventoryLength').value);
      const width = Number(document.getElementById('inventoryWidth').value);
      const thickness = Number(document.getElementById('inventoryThickness').value);
      const quantity = Number(document.getElementById('inventoryQuantity').value);

      if (![length, width, thickness, quantity].every(Number.isFinite) ||
          length <= 0 || width <= 0 || thickness <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
        showNotification('Enter positive length, width, thickness, and whole-piece quantity before calculating CFT.');
        return;
      }

      const volume = Math.round((length * width * thickness * quantity / 12) * 100) / 100;
      if (!Number.isFinite(volume) || volume <= 0) {
        showNotification('The entered dimensions do not produce a valid positive CFT quantity.');
        return;
      }

      document.getElementById('inventoryVolume').value = volume.toFixed(2);
      showNotification(`Calculated inventory volume: ${formatNumber(volume)} CFT`);
    });
  }

  // ---------------------------------------------------------------------------
  // 5E. Form Submission Handlers
  // ---------------------------------------------------------------------------

  function setupPurchaseFormSubmit() {
    const form = document.getElementById('purchaseForm');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const category = document.getElementById('purCategory')?.value;
      const supplier = document.getElementById('purSupplier')?.value.trim();
      const phone = document.getElementById('purSupplierPhone')?.value.trim();
      const volume = parseFloat(document.getElementById('purVolume')?.value) || 0;
      const rate = parseFloat(document.getElementById('purRate')?.value) || 0;
      const expense = parseFloat(document.getElementById('purExpense')?.value) || 0;
      const total = parseFloat(document.getElementById('purTotal')?.value) || 0;

      if (volume <= 0 || rate <= 0 || total <= 0) {
        alert('Please enter valid purchase volume and rate / சரியான கொள்முதல் அளவும் விலையும் உள்ளிடவும்.');
        return;
      }

      const record = {
        date: new Date().toISOString(),
        category,
        supplierName: supplier,
        supplierPhone: phone,
        volume,
        rate,
        expenseAmount: expense,
        totalAmount: total
      };

      try {
        await window.WoodShopDB.addRecord('purchases', record);
        form.reset();
        closeModal('purchaseModalOverlay');
        await refreshAll();
        showNotification(`✓ Purchase saved: ${formatNumber(volume)} கன அடி of ${category} (₹${formatNumber(total)})`);
      } catch (err) {
        console.error('Failed to save purchase:', err);
        showNotification('Error saving purchase: ' + err.message);
      }
    });
  }

  function setupSaleFormSubmit() {
    const form = document.getElementById('saleForm');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const category = document.getElementById('saleCategory')?.value;
      const customer = document.getElementById('saleCustomer')?.value.trim();
      const phone = document.getElementById('saleCustomerPhone')?.value.trim();
      const volume = parseFloat(document.getElementById('saleVolume')?.value) || 0;
      const rate = parseFloat(document.getElementById('saleRate')?.value) || 0;
      const expense = parseFloat(document.getElementById('saleExpense')?.value) || 0;
      const total = parseFloat(document.getElementById('saleTotal')?.value) || 0;

      if (volume <= 0 || rate <= 0 || total <= 0) {
        alert('Please enter valid sale volume and rate / சரியான விற்பனை அளவும் விலையும் உள்ளிடவும்.');
        return;
      }

      // Stock warning check
      const stockMap = calculateCategoryStocks();
      const available = stockMap[category] || 0;
      if (volume > available) {
        const proceed = window.confirm(
          `Notice: Requested sale volume (${formatNumber(volume)} கன அடி) exceeds current recorded stock (${formatNumber(available)} கன அடி).\n\n` +
          `விற்பனை அளவு தற்போதைய இருப்பை விட அதிகமாக உள்ளது. பதிவை தொடர விரும்புகிறீர்களா?`
        );
        if (!proceed) return;
      }

      const record = {
        date: new Date().toISOString(),
        category,
        customerName: customer,
        customerPhone: phone,
        volume,
        rate,
        expenseAmount: expense,
        totalAmount: total
      };

      try {
        await window.WoodShopDB.addRecord('sales', record);
        form.reset();
        closeModal('saleModalOverlay');
        await refreshAll();
        showNotification(`✓ Sale bill saved: ${formatNumber(volume)} கன அடி to ${customer} (₹${formatNumber(total)})`);
      } catch (err) {
        console.error('Failed to save sale:', err);
        showNotification('Error saving sale: ' + err.message);
      }
    });
  }

  function setupExpenseFormSubmit() {
    const form = document.getElementById('expenseForm');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const category = document.getElementById('expCategory')?.value;
      const description = document.getElementById('expDescription')?.value.trim();
      const amount = parseFloat(document.getElementById('expAmount')?.value) || 0;

      if (amount <= 0 || !description) {
        alert('Please enter valid expense details / சரியான செலவு விவரங்களை உள்ளிடவும்.');
        return;
      }

      const record = {
        date: new Date().toISOString(),
        category,
        description,
        amount
      };

      try {
        await window.WoodShopDB.addRecord('expenses', record);
        form.reset();
        closeModal('expenseModalOverlay');
        await refreshAll();
        showNotification(`✓ Expense recorded: ${category} - ₹${formatNumber(amount)}`);
      } catch (err) {
        console.error('Failed to save expense:', err);
        showNotification('Error saving expense: ' + err.message);
      }
    });
  }

  function setupCategoryFormSubmit() {
    const form = document.getElementById('categoryForm');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const editId = document.getElementById('editCategoryId')?.value;
      const name = document.getElementById('catNameInput')?.value.trim();
      const nameTamil = document.getElementById('catNameTaInput')?.value.trim();
      const description = document.getElementById('catDescInput')?.value.trim();

      if (!name) {
        alert('Please enter a category name / மர வகையின் பெயரை உள்ளிடவும்.');
        return;
      }

      try {
        if (editId) {
          // Update existing category
          await window.WoodShopDB.updateCategoryAndReferences({
            id: Number(editId),
            name,
            nameTamil,
            description
          });
          showNotification(`✓ Category "${name}" updated successfully.`);
        } else {
          // Add new category
          await window.WoodShopDB.addRecord('categories', {
            name,
            nameTamil,
            description
          });
          showNotification(`✓ New category "${name}" added.`);
        }

        form.reset();
        closeModal('categoryModalOverlay');
        await refreshAll();
      } catch (err) {
        console.error('Failed to save category:', err);
        showNotification('Error saving category: ' + err.message);
      }
    });
  }

  function setupInventoryFormSubmit() {
    const form = document.getElementById('inventoryForm');
    form?.addEventListener('submit', async event => {
      event.preventDefault();

      const recordId = document.getElementById('inventoryRecordId').value;
      const category = document.getElementById('inventoryCategory').value;
      const name = document.getElementById('inventoryName').value.trim();
      const quantity = Number(document.getElementById('inventoryQuantity').value);
      const volume = Number(document.getElementById('inventoryVolume').value);
      const rate = Number(document.getElementById('inventoryRate').value || 0);
      const dimensions = ['inventoryLength', 'inventoryWidth', 'inventoryThickness'].map(id => {
        const value = document.getElementById(id).value;
        return value === '' ? null : Number(value);
      });

      if (!name || !category) {
        showNotification('Enter a stock item name and choose its wood category.');
        return;
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        showNotification('Piece quantity must be a positive whole number.');
        return;
      }
      if (!Number.isFinite(volume) || volume <= 0) {
        showNotification('CFT quantity must be greater than zero.');
        return;
      }
      if (!Number.isFinite(rate) || rate < 0) {
        showNotification('Purchase rate must be zero or a positive number.');
        return;
      }

      if (dimensions.some(value => value !== null)) {
        if (dimensions.some(value => value === null || !Number.isFinite(value) || value <= 0)) {
          showNotification('Enter all three dimensions as positive numbers, or leave all dimensions blank.');
          return;
        }
        const expectedVolume = Math.round((dimensions[0] * dimensions[1] * dimensions[2] * quantity / 12) * 100) / 100;
        if (Math.abs(volume - expectedVolume) > 0.01) {
          showNotification(`CFT does not match the dimensions and quantity. Expected ${expectedVolume.toFixed(2)} CFT.`);
          return;
        }
      }

      const record = {
        ...(recordId ? { id: Number(recordId) } : {}),
        category,
        name,
        quantity,
        length: dimensions[0],
        width: dimensions[1],
        thickness: dimensions[2],
        volume,
        rate,
        description: document.getElementById('inventoryDescription').value.trim()
      };

      try {
        await window.WoodShopDB.saveInventoryRecord(record);
        form.reset();
        closeModal('inventoryModalOverlay');
        await refreshAll();
        showNotification(`✓ Stock ${recordId ? 'updated' : 'saved'}: ${name} (${formatNumber(volume)} CFT).`);
      } catch (err) {
        console.error('Failed to save inventory stock:', err);
        showNotification(`Error saving stock: ${err.message}`);
      }
    });
  }

  // ===========================================================================
  // 6. NAVIGATION & MOBILE DRAWER
  // ===========================================================================
  function setupNavigation() {
    const sidebarNav = document.getElementById('sidebarNav');
    const navOverlay = document.getElementById('navOverlay');
    const menuBtn = document.getElementById('menuBtn');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const mNavMoreBtn = document.getElementById('mNavMoreBtn');

    function openMenu() {
      sidebarNav?.classList.add('active');
      navOverlay?.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      sidebarNav?.classList.remove('active');
      navOverlay?.classList.remove('active');
      document.body.style.overflow = '';
    }

    menuBtn?.addEventListener('click', openMenu);
    mNavMoreBtn?.addEventListener('click', openMenu);
    closeDrawerBtn?.addEventListener('click', closeMenu);
    navOverlay?.addEventListener('click', closeMenu);

    const navLinks = document.querySelectorAll('.nav-link');
    const bnavItems = document.querySelectorAll('.m-nav-btn[data-bnav]');

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const targetNav = link.getAttribute('data-nav');
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        bnavItems.forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-bnav') === targetNav);
        });

        if (window.innerWidth < 1024) closeMenu();

        if (targetNav === 'purchases') {
          e.preventDefault();
          openModal('purchaseModalOverlay');
        } else if (targetNav === 'daily-sales') {
          e.preventDefault();
          openModal('saleModalOverlay');
        } else if (targetNav === 'expenses') {
          e.preventDefault();
          openModal('expenseModalOverlay');
        }
      });
    });

    bnavItems.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = btn.getAttribute('data-bnav');
        bnavItems.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (target === 'purchases') {
          e.preventDefault();
          openModal('purchaseModalOverlay');
        }
      });
    });
  }

  // ===========================================================================
  // 7. EDITABLE SHOP NAME
  // ===========================================================================
  function setupShopNameEditor() {
    const editBtn = document.getElementById('shopNameEditBtn');
    const nameText = document.getElementById('shopNameText');

    try {
      const saved = localStorage.getItem('wood_shop_name');
      if (saved && nameText) nameText.textContent = saved;
    } catch (e) {}

    editBtn?.addEventListener('click', () => {
      const current = nameText?.textContent || 'Shop Name / கடை பெயர்';
      const updated = window.prompt('Enter your Wood Shop Name / உங்கள் மரக்கடையின் பெயரை உள்ளிடவும்:', current);
      if (updated && updated.trim().length > 0) {
        const trimmed = updated.trim();
        if (nameText) nameText.textContent = trimmed;
        try {
          localStorage.setItem('wood_shop_name', trimmed);
        } catch (e) {}
        showNotification(`✓ Shop name updated: "${trimmed}"`);
      }
    });
  }

  // ===========================================================================
  // 8. HELPERS & FORMATTERS
  // ===========================================================================

  function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return '0';
    const val = Number(num);
    return val.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: Number.isInteger(val) ? 0 : 2
    });
  }

  function formatDate(isoString) {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return `Today, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return isoString;
    }
  }

  function isToday(isoString) {
    if (!isoString) return false;
    try {
      const d = new Date(isoString);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() &&
             d.getMonth() === now.getMonth() &&
             d.getDate() === now.getDate();
    } catch (e) {
      return false;
    }
  }

  function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showNotification(message) {
    const hub = document.getElementById('toastHub');
    if (!hub) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = `<span>${message}</span>`;
    hub.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 3200);
  }

})();

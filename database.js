/**
 * =============================================================================
 * Wood Shop Management System - Local Database Infrastructure
 * File: database.js
 * Engine: IndexedDB (Offline, Browser-Native Persistent Storage)
 * Version: 2 (Added Customizable Categories & Buying/Selling Expense Tracking)
 * =============================================================================
 * 
 * Object Stores:
 * 1. categories - Customizable wood species (Teak, Rosewood, Neem, Mango, etc.)
 * 2. products   - Wood inventory items by category with volume in கன அடி
 * 3. customers  - Buyer records, contact details, total purchases
 * 4. purchases  - Wood purchase records (volume in கன அடி, rate/கன அடி, buying expenses, supplier)
 * 5. sales      - Wood sales records (volume in கன அடி, rate/கன அடி, selling expenses, customer)
 * 6. expenses   - Operational expenses (sawmill wages, diesel, electricity, transport)
 * =============================================================================
 */

(function (global) {
  'use strict';

  // Database Configuration Constants
  const DB_NAME = 'WoodShopDB';
  const DB_VERSION = 2; // Upgraded for customizable categories store
  const BACKUP_FORMAT = 'woodshop-management-backup';
  const BACKUP_FORMAT_VERSION = 1;

  const OBJECT_STORES = [
    'categories',
    'products',
    'customers',
    'sales',
    'purchases',
    'expenses'
  ];

  // Default customizable wood categories seeded on first run
  const DEFAULT_CATEGORIES = [
    { name: 'Teak Wood', nameTamil: 'தேக்கு மரம்', description: 'High durability premium timber' },
    { name: 'Rosewood', nameTamil: 'ஈட்டி மரம்', description: 'Heavy luxury hardwood' },
    { name: 'Neem Wood', nameTamil: 'வேம்பு மரம்', description: 'Natural insect-resistant timber' },
    { name: 'Mango Wood', nameTamil: 'மாமரம்', description: 'Light furniture & plank timber' },
    { name: 'Country Wood', nameTamil: 'நாட்டு மரம்', description: 'Versatile local structural wood' },
    { name: 'Pine Wood', nameTamil: 'பைன் மரம்', description: 'General utility softwood lumber' }
  ];

  // Cached active database connection
  let dbInstance = null;
  let initPromise = null;

  function isSupported() {
    return 'indexedDB' in global;
  }

  /**
   * Initializes the IndexedDB database and sets up all object stores safely.
   * Handles upgrades without data loss.
   * 
   * @returns {Promise<IDBDatabase>}
   */
  function initDB() {
    if (!isSupported()) {
      return Promise.reject(new Error('IndexedDB is not supported by this browser environment.'));
    }

    if (dbInstance) {
      return Promise.resolve(dbInstance);
    }

    if (initPromise) {
      return initPromise;
    }

    initPromise = new Promise((resolve, reject) => {
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (event) {
        const db = event.target.result;
        console.log(`📦 [WoodShopDB] Upgrading schema to Version ${DB_VERSION}...`);

        // 1. Categories Store
        if (!db.objectStoreNames.contains('categories')) {
          const catStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
          catStore.createIndex('name', 'name', { unique: false });
          catStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('  ✓ Created Object Store: "categories"');
        }

        // 2. Products Store
        if (!db.objectStoreNames.contains('products')) {
          const prodStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
          prodStore.createIndex('name', 'name', { unique: false });
          prodStore.createIndex('category', 'category', { unique: false });
          prodStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('  ✓ Created Object Store: "products"');
        }

        // 3. Customers Store
        if (!db.objectStoreNames.contains('customers')) {
          const custStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
          custStore.createIndex('name', 'name', { unique: false });
          custStore.createIndex('phone', 'phone', { unique: false });
          custStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('  ✓ Created Object Store: "customers"');
        }

        // 4. Sales Store (Selling Details)
        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
          salesStore.createIndex('date', 'date', { unique: false });
          salesStore.createIndex('category', 'category', { unique: false });
          salesStore.createIndex('customerName', 'customerName', { unique: false });
          salesStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('  ✓ Created Object Store: "sales"');
        }

        // 5. Purchases Store (Buying Details)
        if (!db.objectStoreNames.contains('purchases')) {
          const purStore = db.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
          purStore.createIndex('date', 'date', { unique: false });
          purStore.createIndex('category', 'category', { unique: false });
          purStore.createIndex('supplierName', 'supplierName', { unique: false });
          purStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('  ✓ Created Object Store: "purchases"');
        }

        // 6. Expenses Store
        if (!db.objectStoreNames.contains('expenses')) {
          const expStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
          expStore.createIndex('date', 'date', { unique: false });
          expStore.createIndex('category', 'category', { unique: false });
          expStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('  ✓ Created Object Store: "expenses"');
        }
      };

      request.onsuccess = async function (event) {
        dbInstance = event.target.result;
        initPromise = null;

        dbInstance.onversionchange = function () {
          dbInstance.close();
          dbInstance = null;
        };

        dbInstance.onclose = function () {
          dbInstance = null;
        };

        // Seed default categories if store is freshly initialized
        try {
          await seedDefaultCategoriesIfEmpty(dbInstance);
        } catch (e) {
          console.warn('[WoodShopDB] Category seed check note:', e.message);
        }

        console.log(`✅ [WoodShopDB] Connected to "${DB_NAME}" (v${DB_VERSION}).`);
        resolve(dbInstance);
      };

      request.onerror = function (event) {
        initPromise = null;
        const err = event.target.error || new Error('Unknown IndexedDB error');
        console.error('❌ [WoodShopDB] Connection failed:', err);
        reject(err);
      };

      request.onblocked = function () {
        console.warn('⚠️ [WoodShopDB] Database blocked by another open tab.');
      };
    });

    return initPromise;
  }

  async function getDB() {
    if (dbInstance) return dbInstance;
    return initDB();
  }

  function validateStoreName(storeName) {
    if (!OBJECT_STORES.includes(storeName)) {
      throw new Error(`Invalid object store: "${storeName}". Valid stores: ${OBJECT_STORES.join(', ')}`);
    }
  }

  /**
   * Seeds customizable initial categories if the categories table is empty.
   */
  async function seedDefaultCategoriesIfEmpty(db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['categories'], 'readwrite');
      const store = tx.objectStore('categories');
      const countReq = store.count();

      countReq.onsuccess = function () {
        if (countReq.result === 0) {
          console.log('🌱 [WoodShopDB] Seeding initial customizable wood categories...');
          DEFAULT_CATEGORIES.forEach(cat => {
            store.add({
              name: cat.name,
              nameTamil: cat.nameTamil,
              description: cat.description,
              createdAt: new Date().toISOString()
            });
          });
        }
        resolve();
      };

      countReq.onerror = () => reject(countReq.error);
    });
  }

  // ===========================================================================
  // REUSABLE CRUD METHODS
  // ===========================================================================

  async function addRecord(storeName, data) {
    validateStoreName(storeName);
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);

      const record = Object.assign({}, data);
      if (!record.createdAt) {
        record.createdAt = new Date().toISOString();
      }

      const request = store.add(record);
      let recordId;
      request.onsuccess = () => { recordId = request.result; };
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error(`Transaction aborted while adding to "${storeName}".`));
      tx.oncomplete = () => resolve(recordId);
    });
  }

  async function getRecordById(storeName, id) {
    validateStoreName(storeName);
    const db = await getDB();
    const numericId = Number(id);

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(numericId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function getAllRecords(storeName) {
    validateStoreName(storeName);
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function updateRecord(storeName, data) {
    validateStoreName(storeName);
    if (!data || data.id === undefined || data.id === null) {
      return Promise.reject(new Error(`Update failed: missing required "id" in "${storeName}".`));
    }

    const db = await getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);

      const record = Object.assign({}, data, {
        id: Number(data.id),
        updatedAt: new Date().toISOString()
      });

      const request = store.put(record);
      let recordId;
      request.onsuccess = () => { recordId = request.result; };
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error(`Transaction aborted while updating "${storeName}".`));
      tx.oncomplete = () => resolve(recordId);
    });
  }

  async function deleteRecord(storeName, id) {
    validateStoreName(storeName);
    const db = await getDB();
    const numericId = Number(id);

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(numericId);

      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error(`Transaction aborted while deleting from "${storeName}".`));
      tx.oncomplete = () => resolve(true);
    });
  }

  function isLinkedInventoryRecord(record) {
    if (!record) return false;
    const linkedFields = [
      'purchaseId',
      'saleId',
      'transactionId',
      'purchaseRecordId',
      'saleRecordId',
      'linkedPurchaseId',
      'linkedSaleId',
      'purchaseTransactionId',
      'saleTransactionId',
      'linkedTransactionId'
    ];
    return linkedFields.some(field => record[field] !== undefined && record[field] !== null && record[field] !== '') ||
      ['purchase', 'sale'].includes(String(record.sourceType || '').toLowerCase());
  }

  function categoryStockBalance(category, products, purchases, sales) {
    const inventoryVolume = products
      .filter(record => record.category === category && !isLinkedInventoryRecord(record))
      .reduce((sum, record) => sum + (Number(record.volume) || 0), 0);
    const purchasedVolume = purchases
      .filter(record => record.category === category)
      .reduce((sum, record) => sum + (Number(record.volume) || 0), 0);
    const soldVolume = sales
      .filter(record => record.category === category)
      .reduce((sum, record) => sum + (Number(record.volume) || 0), 0);
    return inventoryVolume + purchasedVolume - soldVolume;
  }

  async function saveInventoryRecord(data) {
    if (!data || !String(data.name || '').trim() || !String(data.category || '').trim()) {
      throw new Error('Inventory item name and wood category are required.');
    }

    const volume = Number(data.volume);
    const quantity = Number(data.quantity);
    const rate = data.rate === '' || data.rate === null || data.rate === undefined ? 0 : Number(data.rate);
    if (!Number.isFinite(volume) || volume <= 0) {
      throw new Error('CFT quantity must be a positive number.');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Piece quantity must be a positive whole number.');
    }
    if (!Number.isFinite(rate) || rate < 0) {
      throw new Error('Purchase rate must be zero or a positive number.');
    }

    const dimensions = ['length', 'width', 'thickness'].map(key => {
      const value = data[key];
      return value === '' || value === null || value === undefined ? null : Number(value);
    });
    const hasDimensions = dimensions.some(value => value !== null);
    if (hasDimensions) {
      if (dimensions.some(value => value === null || !Number.isFinite(value) || value <= 0)) {
        throw new Error('Enter all three dimensions as positive numbers, or leave all dimensions blank.');
      }
      const calculatedVolume = Math.round((dimensions[0] * dimensions[1] * dimensions[2] * quantity / 12) * 100) / 100;
      if (Math.abs(volume - calculatedVolume) > 0.01) {
        throw new Error(`CFT does not match the dimensions and quantity. Expected ${calculatedVolume.toFixed(2)} CFT.`);
      }
    }

    const recordData = Object.assign({}, data, {
      name: String(data.name).trim(),
      category: String(data.category).trim(),
      quantity,
      length: dimensions[0],
      width: dimensions[1],
      thickness: dimensions[2],
      volume,
      rate,
      sourceType: 'manual'
    });
    const db = await getDB();
    const storeNames = ['products', 'purchases', 'sales', 'categories'];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      const recordsByStore = {};
      let pendingReads = storeNames.length;
      let recordId;
      let failed = false;
      const fail = error => {
        if (failed) return;
        failed = true;
        reject(error);
        try { tx.abort(); } catch (_) {}
      };

      tx.onerror = () => fail(tx.error || new Error('Inventory save transaction failed.'));
      tx.onabort = () => fail(tx.error || new Error('Inventory save transaction was aborted.'));
      tx.oncomplete = () => resolve(recordId);

      storeNames.forEach(storeName => {
        const request = tx.objectStore(storeName).getAll();
        request.onerror = () => fail(request.error || tx.error);
        request.onsuccess = () => {
          recordsByStore[storeName] = request.result || [];
          pendingReads -= 1;
          if (pendingReads !== 0 || failed) return;

          const current = recordData.id === undefined || recordData.id === null
            ? null
            : recordsByStore.products.find(record => record.id === Number(recordData.id));
          if (recordData.id !== undefined && recordData.id !== null && !current) {
            fail(new Error('The inventory record no longer exists.'));
            return;
          }
          if (isLinkedInventoryRecord(current)) {
            fail(new Error('This stock entry is linked to a purchase or sale. Edit the related transaction instead.'));
            return;
          }
          if (!recordsByStore.categories.some(category => category.name === recordData.category)) {
            fail(new Error('Select a valid wood category.'));
            return;
          }

          const now = new Date().toISOString();
          const savedRecord = Object.assign({}, current || {}, recordData, {
            updatedAt: now
          });
          if (current) {
            savedRecord.id = current.id;
            savedRecord.createdAt = current.createdAt;
          }

          const affectedCategories = new Set([recordData.category]);
          if (current) affectedCategories.add(current.category);
          const productsWithoutCurrent = recordsByStore.products.filter(record =>
            !current || record.id !== current.id
          );
          const projectedProducts = productsWithoutCurrent.concat(savedRecord);

          for (const category of affectedCategories) {
            const before = categoryStockBalance(
              category,
              recordsByStore.products,
              recordsByStore.purchases,
              recordsByStore.sales
            );
            const after = categoryStockBalance(
              category,
              projectedProducts,
              recordsByStore.purchases,
              recordsByStore.sales
            );
            if (after < -1e-9 && after < before - 1e-9) {
              fail(new Error('This edit would make recorded sales exceed available stock.'));
              return;
            }
          }

          const store = tx.objectStore('products');
          const writeRequest = current ? store.put(savedRecord) : store.add(savedRecord);
          writeRequest.onsuccess = () => { recordId = writeRequest.result; };
          writeRequest.onerror = () => fail(writeRequest.error || tx.error);
        };
      });
    });
  }

  async function deleteInventoryRecord(id) {
    const numericId = Number(id);
    const db = await getDB();
    const storeNames = ['products', 'purchases', 'sales'];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      const recordsByStore = {};
      let pendingReads = storeNames.length;
      let deleted = false;
      let failed = false;
      const fail = error => {
        if (failed) return;
        failed = true;
        reject(error);
        try { tx.abort(); } catch (_) {}
      };

      tx.onerror = () => fail(tx.error || new Error('Inventory deletion transaction failed.'));
      tx.onabort = () => fail(tx.error || new Error('Inventory deletion was aborted.'));
      tx.oncomplete = () => {
        if (deleted) resolve(true);
      };

      storeNames.forEach(storeName => {
        const request = tx.objectStore(storeName).getAll();
        request.onerror = () => fail(request.error || tx.error);
        request.onsuccess = () => {
          recordsByStore[storeName] = request.result || [];
          pendingReads -= 1;
          if (pendingReads !== 0 || failed) return;

          const record = recordsByStore.products.find(item => item.id === numericId);
          if (!record) {
            fail(new Error('The inventory record no longer exists.'));
            return;
          }
          if (isLinkedInventoryRecord(record)) {
            fail(new Error('This stock entry is linked to a purchase or sale. Delete or correct the related transaction instead.'));
            return;
          }

          const before = categoryStockBalance(
            record.category,
            recordsByStore.products,
            recordsByStore.purchases,
            recordsByStore.sales
          );
          const remainingProducts = recordsByStore.products.filter(item => item.id !== numericId);
          const after = categoryStockBalance(
            record.category,
            remainingProducts,
            recordsByStore.purchases,
            recordsByStore.sales
          );
          if (after < -1e-9 && after < before - 1e-9) {
            fail(new Error('This stock entry cannot be deleted because recorded sales depend on its quantity.'));
            return;
          }

          const deleteRequest = tx.objectStore('products').delete(numericId);
          deleteRequest.onerror = () => fail(deleteRequest.error || tx.error);
          deleted = true;
        };
      });
    });
  }

  async function updateCategoryAndReferences(data) {
    if (!data || data.id === undefined || data.id === null) {
      throw new Error('Category update failed: missing required "id".');
    }

    const categoryId = Number(data.id);
    const db = await getDB();
    const storeNames = ['categories', 'products', 'purchases', 'sales'];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      const recordsByStore = {};
      let pendingReads = storeNames.length;
      let updatedCategory;

      tx.onerror = () => reject(tx.error || new Error('Category update transaction failed.'));
      tx.onabort = () => reject(tx.error || new Error('Category update transaction was aborted.'));
      tx.oncomplete = () => resolve(updatedCategory);

      storeNames.forEach(storeName => {
        const request = tx.objectStore(storeName).getAll();
        request.onerror = () => reject(request.error || tx.error);
        request.onsuccess = () => {
          recordsByStore[storeName] = request.result || [];
          pendingReads -= 1;
          if (pendingReads !== 0) return;

          const currentCategory = recordsByStore.categories.find(category => category.id === categoryId);
          if (!currentCategory) {
            reject(new Error(`Category ${categoryId} was not found.`));
            tx.abort();
            return;
          }

          const normalizedName = String(data.name || '').trim().toLocaleLowerCase();
          const duplicate = recordsByStore.categories.some(category =>
            category.id !== categoryId &&
            String(category.name || '').trim().toLocaleLowerCase() === normalizedName
          );
          if (duplicate) {
            reject(new Error(`A category named "${String(data.name).trim()}" already exists.`));
            tx.abort();
            return;
          }

          const previousName = currentCategory.name;
          const updatedAt = new Date().toISOString();
          updatedCategory = Object.assign({}, currentCategory, data, {
            id: categoryId,
            name: String(data.name || '').trim(),
            updatedAt
          });

          tx.objectStore('categories').put(updatedCategory);

          if (previousName !== updatedCategory.name) {
            ['products', 'purchases', 'sales'].forEach(referenceStore => {
              recordsByStore[referenceStore].forEach(record => {
                if (record.category === previousName) {
                  tx.objectStore(referenceStore).put(Object.assign({}, record, {
                    category: updatedCategory.name,
                    updatedAt
                  }));
                }
              });
            });
          }
        };
      });
    });
  }

  async function deleteHistoryRecord(storeName, id) {
    if (!['sales', 'purchases', 'expenses'].includes(storeName)) {
      throw new Error(`Cannot delete history from "${storeName}".`);
    }

    const numericId = Number(id);
    const db = await getDB();
    const stores = storeName === 'purchases' ? ['purchases', 'sales', 'products'] : [storeName];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, 'readwrite');
      const recordRequest = tx.objectStore(storeName).get(numericId);
      let complete = false;

      tx.onerror = () => reject(tx.error || new Error('Transaction deletion failed.'));
      tx.onabort = () => reject(tx.error || new Error('Transaction deletion was aborted.'));
      tx.oncomplete = () => {
        if (complete) resolve(true);
      };

      recordRequest.onerror = () => reject(recordRequest.error || tx.error);
      recordRequest.onsuccess = () => {
        const record = recordRequest.result;
        if (!record) {
          reject(new Error('The selected transaction no longer exists.'));
          tx.abort();
          return;
        }

        if (storeName !== 'purchases') {
          tx.objectStore(storeName).delete(numericId);
          complete = true;
          return;
        }

        const purchasesRequest = tx.objectStore('purchases').getAll();
        const salesRequest = tx.objectStore('sales').getAll();
        const productsRequest = tx.objectStore('products').getAll();
        let purchases;
        let sales;
        let products;
        let pendingReads = 3;

        const validateAndDelete = () => {
          pendingReads -= 1;
          if (pendingReads !== 0) return;

          const purchasedVolume = purchases
            .filter(purchase => purchase.category === record.category && purchase.id !== numericId)
            .reduce((sum, purchase) => sum + (Number(purchase.volume) || 0), 0) +
            products
              .filter(product => product.category === record.category && !isLinkedInventoryRecord(product))
              .reduce((sum, product) => sum + (Number(product.volume) || 0), 0);
          const soldVolume = sales
            .filter(sale => sale.category === record.category)
            .reduce((sum, sale) => sum + (Number(sale.volume) || 0), 0);

          if (soldVolume > purchasedVolume + 1e-9) {
            reject(new Error('This purchase cannot be deleted because recorded sales depend on its stock.'));
            tx.abort();
            return;
          }

          tx.objectStore('purchases').delete(numericId);
          complete = true;
        };

        purchasesRequest.onerror = () => reject(purchasesRequest.error || tx.error);
        purchasesRequest.onsuccess = () => {
          purchases = purchasesRequest.result || [];
          validateAndDelete();
        };
        salesRequest.onerror = () => reject(salesRequest.error || tx.error);
        salesRequest.onsuccess = () => {
          sales = salesRequest.result || [];
          validateAndDelete();
        };
        productsRequest.onerror = () => reject(productsRequest.error || tx.error);
        productsRequest.onsuccess = () => {
          products = productsRequest.result || [];
          validateAndDelete();
        };
      };
    });
  }

  async function countRecords(storeName) {
    validateStoreName(storeName);
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    });
  }

  async function clearStore(storeName) {
    validateStoreName(storeName);
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
    });
  }

  function createBackupPayload(db, stores) {
    return {
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      metadata: {
        backupDate: new Date().toISOString(),
        databaseName: db.name,
        databaseVersion: db.version
      },
      stores
    };
  }

  function backupRecordError(storeName, recordIndex, record, message) {
    const recordId = record && Number.isSafeInteger(record.id) ? ` (ID ${record.id})` : '';
    return new Error(`Invalid backup record in "${storeName}" at row ${recordIndex + 1}${recordId}: ${message}`);
  }

  function requireBackupText(storeName, record, recordIndex, field) {
    if (typeof record[field] !== 'string' || record[field].trim() === '') {
      throw backupRecordError(storeName, recordIndex, record, `"${field}" must be a non-empty string.`);
    }
  }

  function validateOptionalBackupText(storeName, record, recordIndex, field) {
    const value = record[field];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      throw backupRecordError(storeName, recordIndex, record, `"${field}" must be a string.`);
    }
  }

  function validateBackupNumber(storeName, record, recordIndex, field, options) {
    const value = record[field];
    const isMissing = value === undefined || value === null || value === '';
    if (isMissing) {
      if (options.required) {
        throw backupRecordError(storeName, recordIndex, record, `"${field}" is required.`);
      }
      return null;
    }

    if (typeof value !== 'number' && !(typeof value === 'string' && value.trim() !== '')) {
      throw backupRecordError(storeName, recordIndex, record, `"${field}" must be numeric.`);
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw backupRecordError(storeName, recordIndex, record, `"${field}" must be a finite number.`);
    }
    if (options.positive && number <= 0) {
      throw backupRecordError(storeName, recordIndex, record, `"${field}" must be greater than zero.`);
    }
    if (options.nonNegative && number < 0) {
      throw backupRecordError(storeName, recordIndex, record, `"${field}" cannot be negative.`);
    }
    if (options.integer && !Number.isInteger(number)) {
      throw backupRecordError(storeName, recordIndex, record, `"${field}" must be a whole number.`);
    }
    return number;
  }

  function validateBackupDate(storeName, record, recordIndex, field, required) {
    const value = record[field];
    if (value === undefined || value === null || value === '') {
      if (required) {
        throw backupRecordError(storeName, recordIndex, record, `"${field}" is required.`);
      }
      return;
    }

    const timestamp = typeof value === 'number'
      ? value
      : (typeof value === 'string' && value.trim() !== '' ? Date.parse(value) : NaN);
    if (!Number.isFinite(timestamp) || !Number.isFinite(new Date(timestamp).getTime())) {
      throw backupRecordError(storeName, recordIndex, record, `"${field}" must be a valid date or timestamp.`);
    }
  }

  function validateBackupRecord(storeName, record, recordIndex) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw backupRecordError(storeName, recordIndex, record, 'record must be an object.');
    }
    if (!Number.isSafeInteger(record.id) || record.id <= 0) {
      throw backupRecordError(storeName, recordIndex, record, '"id" must be a positive safe integer.');
    }

    ['createdAt', 'updatedAt'].forEach(field =>
      validateBackupDate(storeName, record, recordIndex, field, false)
    );

    if (storeName === 'categories') {
      requireBackupText(storeName, record, recordIndex, 'name');
      validateOptionalBackupText(storeName, record, recordIndex, 'nameTamil');
      validateOptionalBackupText(storeName, record, recordIndex, 'description');
      return;
    }

    if (storeName === 'products') {
      requireBackupText(storeName, record, recordIndex, 'category');
      validateOptionalBackupText(storeName, record, recordIndex, 'name');
      validateOptionalBackupText(storeName, record, recordIndex, 'description');
      validateOptionalBackupText(storeName, record, recordIndex, 'sourceType');

      const isManual = String(record.sourceType || '').toLowerCase() === 'manual';
      if (isManual) requireBackupText(storeName, record, recordIndex, 'name');
      const quantity = validateBackupNumber(storeName, record, recordIndex, 'quantity', {
        required: isManual,
        positive: true,
        integer: true
      });
      const volume = validateBackupNumber(storeName, record, recordIndex, 'volume', {
        required: true,
        positive: true
      });
      validateBackupNumber(storeName, record, recordIndex, 'rate', { nonNegative: true });

      const dimensions = ['length', 'width', 'thickness'].map(field =>
        validateBackupNumber(storeName, record, recordIndex, field, { positive: true })
      );
      if (dimensions.some(value => value !== null)) {
        if (dimensions.some(value => value === null)) {
          throw backupRecordError(storeName, recordIndex, record, 'all three dimensions must be provided together.');
        }
        const pieces = quantity === null ? 1 : quantity;
        const expectedVolume = Math.round((dimensions[0] * dimensions[1] * dimensions[2] * pieces / 12) * 100) / 100;
        if (Math.abs(volume - expectedVolume) > 0.01) {
          throw backupRecordError(storeName, recordIndex, record, `volume does not match dimensions; expected ${expectedVolume.toFixed(2)} CFT.`);
        }
      }

      [
        'purchaseId', 'saleId', 'transactionId', 'purchaseRecordId', 'saleRecordId',
        'linkedPurchaseId', 'linkedSaleId', 'purchaseTransactionId',
        'saleTransactionId', 'linkedTransactionId'
      ].forEach(field => {
        const value = record[field];
        if (value === undefined || value === null || value === '') return;
        const referenceId = typeof value === 'number' ? value :
          (typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN);
        if (!Number.isSafeInteger(referenceId) || referenceId <= 0) {
          throw backupRecordError(storeName, recordIndex, record, `"${field}" must be a positive record ID.`);
        }
      });
      return;
    }

    if (storeName === 'customers') {
      ['name', 'customerName', 'fullName', 'email', 'address'].forEach(field =>
        validateOptionalBackupText(storeName, record, recordIndex, field)
      );
      const phoneFields = ['phone', 'phoneNumber', 'mobile', 'mobileNumber'];
      phoneFields.forEach(field => {
        const value = record[field];
        if (value !== undefined && value !== null && typeof value !== 'string' &&
            !(typeof value === 'number' && Number.isFinite(value))) {
          throw backupRecordError(storeName, recordIndex, record, `"${field}" must be text or a finite number.`);
        }
      });
      const hasIdentity = ['name', 'customerName', 'fullName'].some(field =>
        typeof record[field] === 'string' && record[field].trim() !== ''
      ) || phoneFields.some(field => record[field] !== undefined && record[field] !== null &&
        String(record[field]).trim() !== '');
      if (!hasIdentity) {
        throw backupRecordError(storeName, recordIndex, record, 'a customer name or phone number is required.');
      }
      ['totalPurchases', 'totalAmount', 'balance'].forEach(field =>
        validateBackupNumber(storeName, record, recordIndex, field, { nonNegative: true })
      );
      return;
    }

    if (storeName === 'purchases' || storeName === 'sales') {
      requireBackupText(storeName, record, recordIndex, 'category');
      requireBackupText(storeName, record, recordIndex, storeName === 'purchases' ? 'supplierName' : 'customerName');
      validateBackupDate(storeName, record, recordIndex, 'date', true);
      validateBackupNumber(storeName, record, recordIndex, 'volume', { required: true, positive: true });
      validateBackupNumber(storeName, record, recordIndex, 'rate', { required: true, positive: true });
      validateBackupNumber(storeName, record, recordIndex, 'totalAmount', { required: true, positive: true });
      validateBackupNumber(storeName, record, recordIndex, 'expenseAmount', { nonNegative: true });
      validateOptionalBackupText(storeName, record, recordIndex,
        storeName === 'purchases' ? 'supplierPhone' : 'customerPhone');
      return;
    }

    if (storeName === 'expenses') {
      requireBackupText(storeName, record, recordIndex, 'category');
      requireBackupText(storeName, record, recordIndex, 'description');
      validateBackupDate(storeName, record, recordIndex, 'date', true);
      validateBackupNumber(storeName, record, recordIndex, 'amount', { required: true, positive: true });
    }
  }

  function validateBackupData(backup) {
    if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
      throw new Error('Backup must be a JSON object.');
    }
    if (backup.format !== BACKUP_FORMAT || backup.formatVersion !== BACKUP_FORMAT_VERSION) {
      throw new Error('Backup format is not supported.');
    }
    if (!backup.metadata || backup.metadata.databaseName !== DB_NAME ||
        !Number.isInteger(backup.metadata.databaseVersion) ||
        backup.metadata.databaseVersion < 1 || backup.metadata.databaseVersion > DB_VERSION ||
        typeof backup.metadata.backupDate !== 'string' ||
        !Number.isFinite(Date.parse(backup.metadata.backupDate))) {
      throw new Error('Backup metadata is missing or invalid for this database.');
    }
    if (!backup.stores || typeof backup.stores !== 'object' || Array.isArray(backup.stores)) {
      throw new Error('Backup is missing its object stores.');
    }

    const counts = {};
    for (const storeName of OBJECT_STORES) {
      const records = backup.stores[storeName];
      if (!Array.isArray(records)) {
        throw new Error(`Backup store "${storeName}" must be an array.`);
      }

      const ids = new Set();
      records.forEach((record, index) => {
        validateBackupRecord(storeName, record, index);
        if (ids.has(record.id)) {
          throw backupRecordError(storeName, index, record, `duplicate ID ${record.id}.`);
        }
        ids.add(record.id);
      });
      counts[storeName] = records.length;
    }

    const categoryNames = new Set(backup.stores.categories.map(category => category.name));
    ['products', 'purchases', 'sales'].forEach(storeName => {
      backup.stores[storeName].forEach((record, index) => {
        if (!categoryNames.has(record.category)) {
          throw backupRecordError(storeName, index, record, `wood category "${record.category}" does not exist in this backup.`);
        }
      });
    });

    const purchaseIds = new Set(backup.stores.purchases.map(record => record.id));
    const saleIds = new Set(backup.stores.sales.map(record => record.id));
    backup.stores.products.forEach((record, index) => {
      const sourceType = String(record.sourceType || '').toLowerCase();
      const purchaseFields = ['purchaseId', 'purchaseRecordId', 'linkedPurchaseId', 'purchaseTransactionId'];
      const saleFields = ['saleId', 'saleRecordId', 'linkedSaleId', 'saleTransactionId'];

      purchaseFields.forEach(field => {
        const value = record[field];
        if (value !== undefined && value !== null && value !== '' && !purchaseIds.has(Number(value))) {
          throw backupRecordError('products', index, record, `"${field}" does not reference a purchase in this backup.`);
        }
      });
      saleFields.forEach(field => {
        const value = record[field];
        if (value !== undefined && value !== null && value !== '' && !saleIds.has(Number(value))) {
          throw backupRecordError('products', index, record, `"${field}" does not reference a sale in this backup.`);
        }
      });

      ['transactionId', 'linkedTransactionId'].forEach(field => {
        const value = record[field];
        if (value === undefined || value === null || value === '') return;
        const referenceId = Number(value);
        const exists = sourceType === 'purchase'
          ? purchaseIds.has(referenceId)
          : (sourceType === 'sale'
            ? saleIds.has(referenceId)
            : purchaseIds.has(referenceId) || saleIds.has(referenceId));
        if (!exists) {
          throw backupRecordError('products', index, record, `"${field}" does not reference a transaction in this backup.`);
        }
      });
    });

    return counts;
  }

  async function createBackupData() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OBJECT_STORES, 'readonly');
      const stores = {};
      let settled = false;
      const fail = error => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      tx.onerror = () => fail(tx.error || new Error('Backup read transaction failed.'));
      tx.onabort = () => fail(tx.error || new Error('Backup read transaction was aborted.'));
      tx.oncomplete = () => {
        if (settled) return;
        settled = true;
        resolve(createBackupPayload(db, stores));
      };

      OBJECT_STORES.forEach(storeName => {
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => {
          stores[storeName] = request.result || [];
        };
        request.onerror = () => fail(request.error || tx.error);
      });
    });
  }

  async function restoreBackupData(backup, beforeReplace) {
    const restoredCounts = validateBackupData(backup);
    if (beforeReplace !== undefined && typeof beforeReplace !== 'function') {
      throw new Error('The pre-restore backup callback must be a function.');
    }

    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OBJECT_STORES, 'readwrite');
      const existingStores = {};
      let pendingReads = OBJECT_STORES.length;
      let settled = false;
      let replacementStarted = false;
      const fail = error => {
        if (settled) return;
        settled = true;
        reject(error);
        try { tx.abort(); } catch (_) {}
      };

      tx.onerror = () => fail(tx.error || new Error('Restore transaction failed.'));
      tx.onabort = () => fail(tx.error || new Error('Restore transaction was aborted.'));
      tx.oncomplete = () => {
        if (settled) return;
        settled = true;
        resolve({
          restoredCounts,
          replacedCounts: Object.keys(existingStores).reduce((counts, storeName) => {
            counts[storeName] = existingStores[storeName].length;
            return counts;
          }, {})
        });
      };

      const replaceStores = () => {
        if (replacementStarted || settled) return;
        replacementStarted = true;
        try {
          if (beforeReplace) {
            beforeReplace(createBackupPayload(db, existingStores));
          }
          OBJECT_STORES.forEach(storeName => {
            const store = tx.objectStore(storeName);
            store.clear();
            backup.stores[storeName].forEach(record => store.put(record));
          });
        } catch (error) {
          fail(error);
        }
      };

      OBJECT_STORES.forEach(storeName => {
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => {
          existingStores[storeName] = request.result || [];
          pendingReads -= 1;
          if (pendingReads === 0) replaceStores();
        };
        request.onerror = () => fail(request.error || tx.error);
      });
    });
  }

  /**
   * Safe Category Deletion: Verifies if a wood category is currently referenced
   * by any sales, purchases, or inventory records before allowing deletion.
   * 
   * @param {number} categoryId
   * @param {string} categoryName
   * @returns {Promise<{success: boolean, reason?: string}>}
   */
  async function deleteCategorySafe(categoryId, categoryName) {
    const [sales, purchases, products] = await Promise.all([
      getAllRecords('sales'),
      getAllRecords('purchases'),
      getAllRecords('products')
    ]);

    const usedInSales = sales.some(s => s.category === categoryName);
    const usedInPurchases = purchases.some(p => p.category === categoryName);
    const usedInProducts = products.some(pr => pr.category === categoryName);

    if (usedInSales || usedInPurchases || usedInProducts) {
      const msg = `Cannot delete "${categoryName}" because it is currently used in existing transactions or stock records. / இந்த மர வகை பதிவுகளில் உள்ளதால் நீக்க முடியாது.`;
      throw new Error(msg);
    }

    await deleteRecord('categories', categoryId);
    return { success: true };
  }

  // Public API Export
  const WoodShopDB = {
    DB_NAME,
    DB_VERSION,
    OBJECT_STORES,
    initDB,
    isSupported,
    addRecord,
    getRecordById,
    getAllRecords,
    updateRecord,
    saveInventoryRecord,
    deleteInventoryRecord,
    updateCategoryAndReferences,
    deleteRecord,
    deleteHistoryRecord,
    countRecords,
    clearStore,
    createBackupData,
    validateBackupData,
    restoreBackupData,
    isInventoryRecordLinked: isLinkedInventoryRecord,
    deleteCategorySafe
  };

  global.WoodShopDB = WoodShopDB;

  // Auto-initialize connection when DOM is ready
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      initDB().catch(err => {
        console.error('Failed to initialize WoodShopDB on startup:', err);
      });
    });
  }

})(typeof window !== 'undefined' ? window : this);

/* =========================================================
   RETRO RAGS - MAIN SCRIPT
   ---------------------------------------------------------
   This file does everything interactive:
   - builds the filter options
   - filters + sorts the products and draws the cards
   - active filter chips, result count, empty state
   - wishlist (saved in localStorage)
   - Quick View modal, mobile filter drawer, back-to-top button

   The "products" array comes from js/data.js (loaded first).
   ========================================================= */


/* =========================================================
   1. FILTER OPTIONS + SETTINGS
   ========================================================= */

const CATEGORIES = ['Jackets', 'Jeans', 'Dresses', 'Shirts & Tees', 'Sweaters', 'Skirts', 'Accessories'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const ERAS = ['70s', '80s', '90s', 'Y2K'];
const CONDITIONS = ['Like New', 'Good', 'Fair'];
const GENDERS = ['All', 'Men', 'Women', 'Unisex'];

// Colour name -> what the swatch circle looks like
const COLOR_SWATCHES = {
  Black: '#2b2b2b',
  White: '#ffffff',
  Grey: '#9a9a9a',
  Cream: '#f3e6c8',
  Brown: '#7a4a2b',
  Blue: '#3f6fa3',
  Yellow: '#e8b923',
  Red: '#c0392b',
  Pink: '#f19cbb',
  Purple: '#8e6bb8'
};

// Icon + gradient colours for the placeholder shown when a photo fails to load
const CATEGORY_LOOK = {
  'Jackets':       { icon: 'fa-vest',         colorA: '#1d5e5a', colorB: '#e4a72a' },
  'Jeans':         { icon: 'fa-scissors',     colorA: '#2f4f7a', colorB: '#5f8fc4' },
  'Dresses':       { icon: 'fa-person-dress', colorA: '#b8472a', colorB: '#e98a8a' },
  'Shirts & Tees': { icon: 'fa-shirt',        colorA: '#6b4a37', colorB: '#e4a72a' },
  'Sweaters':      { icon: 'fa-mitten',       colorA: '#7a3b69', colorB: '#c4502f' },
  'Skirts':        { icon: 'fa-star',         colorA: '#133f3c', colorB: '#8e6bb8' },
  'Accessories':   { icon: 'fa-glasses',      colorA: '#3a2316', colorB: '#b8472a' }
};

const PRICE_LIMIT_MIN = 0;
const PRICE_LIMIT_MAX = 5000;
const WISHLIST_KEY = 'retroRagsWishlist';


/* =========================================================
   2. STATE (the current choices of the shopper)
   ========================================================= */

// Returns a fresh "nothing selected" filter object
function getDefaultFilters() {
  return {
    categories: [],      // e.g. ['Jackets', 'Jeans']
    sizes: [],           // e.g. ['M', 'L']
    eras: [],            // e.g. ['90s']
    conditions: [],      // e.g. ['Like New']
    colors: [],          // e.g. ['Blue']
    gender: 'All',       // only one gender at a time
    minPrice: PRICE_LIMIT_MIN,
    maxPrice: PRICE_LIMIT_MAX,
    search: '',          // text typed in the search box
    wishlistOnly: false  // true = show only hearted items
  };
}

let filters = getDefaultFilters();
let sortBy = 'featured';
let wishlist = loadWishlist();   // array of product ids
let currentModalId = null;       // id of the product open in Quick View
let lastFocusedElement = null;   // where to put focus back after closing the modal
let toastTimer = null;


/* =========================================================
   3. GRAB THE HTML ELEMENTS WE NEED
   ========================================================= */

const productGrid = document.getElementById('productGrid');
const emptyState = document.getElementById('emptyState');
const resultCount = document.getElementById('resultCount');
const activeChips = document.getElementById('activeChips');
const filterPanel = document.getElementById('filterPanel');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const priceMinInput = document.getElementById('priceMin');
const priceMaxInput = document.getElementById('priceMax');
const priceMinLabel = document.getElementById('priceMinLabel');
const priceMaxLabel = document.getElementById('priceMaxLabel');
const clearAllBtn = document.getElementById('clearAllBtn');
const resetBtn = document.getElementById('resetBtn');
const wishlistToggle = document.getElementById('wishlistToggle');
const wishlistCount = document.getElementById('wishlistCount');
const openFiltersBtn = document.getElementById('openFilters');
const closeFiltersBtn = document.getElementById('closeFilters');
const showResultsBtn = document.getElementById('showResultsBtn');
const filterBadge = document.getElementById('filterBadge');
const drawerOverlay = document.getElementById('drawerOverlay');
const quickViewModal = document.getElementById('quickViewModal');
const modalContent = document.getElementById('modalContent');
const modalClose = document.getElementById('modalClose');
const backToTopBtn = document.getElementById('backToTop');
const toast = document.getElementById('toast');


/* =========================================================
   4. SMALL HELPER FUNCTIONS
   ========================================================= */

// Turns 1899 into "Rs-symbol 1,899" using the Indian number format
function formatPrice(amount) {
  return '\u20B9' + amount.toLocaleString('en-IN');
}

// Works out the % discount compared to the original price
function getDiscount(product) {
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
}

// Counts how many products have a certain value, e.g. how many are "Jackets"
function countProducts(productKey, value) {
  if (value === 'All') {
    return products.length;
  }
  let count = 0;
  for (let i = 0; i < products.length; i++) {
    if (products[i][productKey] === value) {
      count++;
    }
  }
  return count;
}

// Adds a value to a list if it is missing, or removes it if it is already there
function toggleInList(list, value) {
  const index = list.indexOf(value);
  if (index === -1) {
    list.push(value);
  } else {
    list.splice(index, 1);
  }
}

// Removes a value from a list (if it is in the list)
function removeFromList(list, value) {
  const index = list.indexOf(value);
  if (index !== -1) {
    list.splice(index, 1);
  }
}

// Makes typed text safe to put inside HTML (so "<b>" shows as text, not bold)
function escapeHTML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Turns a condition like "Like New" into a CSS class like "cond-like-new"
function getConditionClass(condition) {
  return 'cond-' + condition.toLowerCase().replace(' ', '-');
}

// Called by an <img> when its photo fails to load: hide it so the placeholder behind it shows
function handleImageError(img) {
  img.onerror = null;
  img.style.display = 'none';
}

// Shows a little message at the bottom of the screen for 2 seconds
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, 2000);
}

// Smoothly scrolls the page down to the product section
function scrollToShop() {
  document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
}


/* =========================================================
   5. BUILD THE FILTER OPTIONS
   (We create them with JavaScript so the counts are always correct.)
   ========================================================= */

// Creates checkbox rows, e.g. for Category and Condition
function buildCheckboxOptions(containerId, options, filterName, productKey) {
  let html = '';
  options.forEach(function (option) {
    html += `
      <label class="check-option">
        <input type="checkbox" data-filter="${filterName}" data-value="${option}">
        <span>${option}</span>
        <span class="option-count">${countProducts(productKey, option)}</span>
      </label>`;
  });
  document.getElementById(containerId).innerHTML = html;
}

// Creates clickable pill buttons, e.g. for Size, Era and Gender
function buildPillOptions(containerId, options, filterName, productKey) {
  let html = '';
  options.forEach(function (option) {
    html += `
      <button type="button" class="pill" data-filter="${filterName}" data-value="${option}" aria-pressed="false">
        ${option} <span class="pill-count">${countProducts(productKey, option)}</span>
      </button>`;
  });
  document.getElementById(containerId).innerHTML = html;
}

// Creates the round colour swatches
function buildColorSwatches() {
  let html = '';
  Object.keys(COLOR_SWATCHES).forEach(function (colorName) {
    const count = countProducts('color', colorName);
    html += `
      <button type="button" class="swatch-option" data-filter="colors" data-value="${colorName}"
              aria-pressed="false" aria-label="${colorName} (${count} items)" title="${colorName} (${count})">
        <span class="swatch-dot" style="background: ${COLOR_SWATCHES[colorName]};"></span>
        <span class="swatch-name">${colorName}</span>
      </button>`;
  });
  document.getElementById('colorOptions').innerHTML = html;
}

// Builds every filter group in the panel
function buildFilterOptions() {
  buildCheckboxOptions('categoryOptions', CATEGORIES, 'categories', 'category');
  buildPillOptions('sizeOptions', SIZES, 'sizes', 'size');
  buildPillOptions('eraOptions', ERAS, 'eras', 'era');
  buildCheckboxOptions('conditionOptions', CONDITIONS, 'conditions', 'condition');
  buildPillOptions('genderOptions', GENDERS, 'gender', 'gender');
  buildColorSwatches();
}


/* =========================================================
   6. THE FILTER LOGIC  (the heart of the project!)
   ========================================================= */

// Checks ONE filter group.
// If nothing is selected in the group, every product passes.
// If some options are selected, the product passes if it matches ANY of them (OR logic).
function passesGroup(selectedList, productValue) {
  if (selectedList.length === 0) {
    return true;
  }
  return selectedList.includes(productValue);
}

// Checks ONE product against ALL the filter groups.
// The product must pass EVERY group to be shown (AND logic).
// As soon as one group fails we return false and stop checking.
function matchesFilters(product) {
  if (!passesGroup(filters.categories, product.category)) return false;
  if (!passesGroup(filters.sizes, product.size)) return false;
  if (!passesGroup(filters.eras, product.era)) return false;
  if (!passesGroup(filters.conditions, product.condition)) return false;
  if (!passesGroup(filters.colors, product.color)) return false;

  // Gender: "All" means no gender filter
  if (filters.gender !== 'All' && product.gender !== filters.gender) return false;

  // Price must be between the min and max slider values
  if (product.price < filters.minPrice || product.price > filters.maxPrice) return false;

  // Search: look for the typed text inside the name, brand and description
  const searchText = filters.search.trim().toLowerCase();
  if (searchText !== '') {
    const textToSearch = (product.name + ' ' + product.brand + ' ' + product.description).toLowerCase();
    if (!textToSearch.includes(searchText)) return false;
  }

  // Wishlist-only mode
  if (filters.wishlistOnly && !wishlist.includes(product.id)) return false;

  // It passed every check!
  return true;
}

// Returns a sorted COPY of the list (the original order stays untouched)
function sortProducts(list) {
  const sorted = list.slice();

  if (sortBy === 'price-asc') {
    sorted.sort(function (a, b) { return a.price - b.price; });
  } else if (sortBy === 'price-desc') {
    sorted.sort(function (a, b) { return b.price - a.price; });
  } else if (sortBy === 'newest') {
    // A higher id means the item arrived more recently
    sorted.sort(function (a, b) { return b.id - a.id; });
  } else if (sortBy === 'discount') {
    sorted.sort(function (a, b) { return getDiscount(b) - getDiscount(a); });
  } else {
    // "featured" = the order in data.js
    sorted.sort(function (a, b) { return a.id - b.id; });
  }

  return sorted;
}

// The main function: runs every time ANY filter changes.
// 1) keep only matching products  2) sort them  3) redraw everything
function applyFilters() {
  const matching = products.filter(matchesFilters);
  const sorted = sortProducts(matching);

  renderProducts(sorted);
  updateResultCount(sorted.length);
  renderChips();
  syncFilterControls();
}

/* =========================================================
   7. DRAWING THE PRODUCT CARDS
   ========================================================= */

// Builds the colourful placeholder that sits behind each photo
function createFallbackHTML(product) {
  const look = CATEGORY_LOOK[product.category];
  return `
    <div class="img-fallback" style="background: linear-gradient(135deg, ${look.colorA}, ${look.colorB});">
      <i class="fa-solid ${look.icon}" aria-hidden="true"></i>
      <span>${product.name}</span>
    </div>`;
}

// Builds the HTML for one product card
function createCardHTML(product, index) {
  const isSaved = wishlist.includes(product.id);
  // Each card waits a little longer than the one before = a nice "wave" fade-in
  const delay = Math.min(index * 50, 600);

  return `
    <article class="card" data-id="${product.id}" style="animation-delay: ${delay}ms;">
      <div class="card-img-wrap">
        ${createFallbackHTML(product)}
        <img src="${product.image}" alt="${product.name} - ${product.color} ${product.category}"
             loading="lazy" onerror="handleImageError(this)">
        <div class="card-badges">
          <span class="badge badge-era">${product.era}</span>
          <span class="badge ${getConditionClass(product.condition)}">${product.condition}</span>
        </div>
        <span class="discount-tag">${getDiscount(product)}% OFF</span>
        <button type="button" class="wish-btn ${isSaved ? 'active' : ''}" data-id="${product.id}"
                aria-pressed="${isSaved}" aria-label="Save ${product.name} to wishlist">
          <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>
        </button>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span>${product.brand}</span>
          <span>Size ${product.size}</span>
        </div>
        <h3 class="card-title">${product.name}</h3>
        <div class="card-price">
          <span class="price-now">${formatPrice(product.price)}</span>
          <s class="price-old">${formatPrice(product.originalPrice)}</s>
        </div>
        <div class="card-footer">
          <span class="one-of-kind"><i class="fa-solid fa-star" aria-hidden="true"></i> 1 of 1</span>
          <button type="button" class="quick-view-btn" data-id="${product.id}" aria-label="Quick view: ${product.name}">
            Quick view
          </button>
        </div>
      </div>
    </article>`;
}

// Puts all the cards on the page, or shows the "No items found" message
function renderProducts(list) {
  if (list.length === 0) {
    productGrid.innerHTML = '';
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  let html = '';
  list.forEach(function (product, index) {
    html += createCardHTML(product, index);
  });
  productGrid.innerHTML = html;
}

// Updates "Showing 12 of 30 items" and the mobile buttons
function updateResultCount(shownCount) {
  resultCount.innerHTML = `Showing <strong>${shownCount}</strong> of <strong>${products.length}</strong> items`;
  showResultsBtn.textContent = shownCount === 1 ? 'Show 1 item' : `Show ${shownCount} items`;
}


/* =========================================================
   8. ACTIVE FILTER CHIPS
   ========================================================= */

// Makes a list of every filter that is switched on right now
function getActiveFilterList() {
  const list = [];

  filters.categories.forEach(function (value) {
    list.push({ label: value, filter: 'categories', value: value });
  });
  filters.sizes.forEach(function (value) {
    list.push({ label: 'Size ' + value, filter: 'sizes', value: value });
  });
  filters.eras.forEach(function (value) {
    list.push({ label: value, filter: 'eras', value: value });
  });
  filters.conditions.forEach(function (value) {
    list.push({ label: value, filter: 'conditions', value: value });
  });
  filters.colors.forEach(function (value) {
    list.push({ label: value, filter: 'colors', value: value });
  });

  if (filters.gender !== 'All') {
    list.push({ label: filters.gender, filter: 'gender', value: filters.gender });
  }
  if (filters.minPrice !== PRICE_LIMIT_MIN || filters.maxPrice !== PRICE_LIMIT_MAX) {
    list.push({ label: formatPrice(filters.minPrice) + ' - ' + formatPrice(filters.maxPrice), filter: 'price', value: '' });
  }
  if (filters.search.trim() !== '') {
    list.push({ label: '&quot;' + escapeHTML(filters.search.trim()) + '&quot;', filter: 'search', value: '' });
  }
  if (filters.wishlistOnly) {
    list.push({ label: 'Wishlist only', filter: 'wishlist', value: '' });
  }

  return list;
}

// Draws the chips above the grid (each one has an X button to remove it)
function renderChips() {
  const activeList = getActiveFilterList();
  let html = '';

  activeList.forEach(function (item) {
    html += `
      <span class="chip">
        ${item.label}
        <button type="button" class="chip-remove" data-filter="${item.filter}" data-value="${item.value}"
                aria-label="Remove filter ${item.label}">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </span>`;
  });

  if (activeList.length > 0) {
    html += '<button type="button" class="chip-clear" id="chipClearAll">Clear all</button>';
  }

  activeChips.innerHTML = html;

  // Little number on the mobile "Filters" button
  filterBadge.textContent = activeList.length;
  filterBadge.hidden = activeList.length === 0;
}

// Removes one filter (called when the X on a chip is clicked)
function removeFilter(filterName, value) {
  if (filterName === 'gender') {
    filters.gender = 'All';
  } else if (filterName === 'price') {
    filters.minPrice = PRICE_LIMIT_MIN;
    filters.maxPrice = PRICE_LIMIT_MAX;
  } else if (filterName === 'search') {
    filters.search = '';
  } else if (filterName === 'wishlist') {
    filters.wishlistOnly = false;
  } else {
    removeFromList(filters[filterName], value);
  }
  applyFilters();
}

// Resets every filter back to "nothing selected" (the sort order is kept)
function clearAllFilters() {
  filters = getDefaultFilters();
  applyFilters();
}

// Makes the checkboxes, pills, sliders and search box match the "filters" object.
// Needed because filters can change from other places (chips, Clear all, hero buttons).
function syncFilterControls() {
  const controls = filterPanel.querySelectorAll('[data-filter]');

  controls.forEach(function (control) {
    const name = control.dataset.filter;
    const value = control.dataset.value;
    let isActive;

    if (name === 'gender') {
      isActive = filters.gender === value;
    } else {
      isActive = filters[name].includes(value);
    }

    if (control.type === 'checkbox') {
      control.checked = isActive;
    } else {
      control.classList.toggle('active', isActive);
      control.setAttribute('aria-pressed', isActive);
    }
  });

  priceMinInput.value = filters.minPrice;
  priceMaxInput.value = filters.maxPrice;
  priceMinLabel.textContent = formatPrice(filters.minPrice);
  priceMaxLabel.textContent = formatPrice(filters.maxPrice);

  // Only change the search box if it is different (so we don't jump the cursor while typing)
  if (searchInput.value !== filters.search) {
    searchInput.value = filters.search;
  }

  wishlistToggle.classList.toggle('active', filters.wishlistOnly);
  wishlistToggle.setAttribute('aria-pressed', filters.wishlistOnly);
}


/* =========================================================
   9. WISHLIST (saved in localStorage so it survives a page refresh)
   ========================================================= */

// Reads the saved wishlist from the browser (or starts empty)
function loadWishlist() {
  try {
    const saved = JSON.parse(localStorage.getItem(WISHLIST_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

// Saves the wishlist into the browser
function saveWishlist() {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  } catch (error) {
    // Storage can be blocked (e.g. private mode). The wishlist still works until refresh.
  }
}

// Updates the number on the navbar heart
function updateWishlistCount() {
  wishlistCount.textContent = wishlist.length;
}

// Adds or removes a product from the wishlist
function toggleWishlist(productId) {
  const product = products.find(function (item) { return item.id === productId; });

  if (wishlist.includes(productId)) {
    removeFromList(wishlist, productId);
    showToast('Removed from wishlist');
  } else {
    wishlist.push(productId);
    showToast('Saved to wishlist \u2665 ' + product.name);
  }

  saveWishlist();
  updateWishlistCount();

  // Small "bump" animation on the navbar counter
  wishlistCount.classList.add('bump');
  setTimeout(function () { wishlistCount.classList.remove('bump'); }, 400);

  if (filters.wishlistOnly) {
    applyFilters();             // the list of cards changes, so redraw
  } else {
    updateHeartButtons(productId);
  }

  if (currentModalId === productId) {
    updateModalWishButton();
  }
}

// Changes only the heart icons of one product (no full redraw needed)
function updateHeartButtons(productId) {
  const isSaved = wishlist.includes(productId);
  const buttons = productGrid.querySelectorAll('.wish-btn[data-id="' + productId + '"]');

  buttons.forEach(function (button) {
    button.classList.toggle('active', isSaved);
    button.setAttribute('aria-pressed', isSaved);
    button.innerHTML = `<i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>`;
  });
}

// Switches "wishlist only" mode on/off (navbar heart button)
function toggleWishlistView() {
  filters.wishlistOnly = !filters.wishlistOnly;
  applyFilters();
  scrollToShop();
}

/* =========================================================
   10. QUICK VIEW MODAL
   ========================================================= */

// Returns the text + icon for the wishlist button inside the modal
function getModalWishButtonHTML(isSaved) {
  if (isSaved) {
    return '<i class="fa-solid fa-heart" aria-hidden="true"></i> Saved to wishlist';
  }
  return '<i class="fa-regular fa-heart" aria-hidden="true"></i> Add to wishlist';
}

// Builds all the details shown inside the modal
function createModalHTML(product) {
  const isSaved = wishlist.includes(product.id);

  return `
    <div class="modal-img-wrap">
      ${createFallbackHTML(product)}
      <img src="${product.image}" alt="${product.name} - ${product.color} ${product.category}" onerror="handleImageError(this)">
      <div class="card-badges">
        <span class="badge badge-era">${product.era}</span>
        <span class="badge ${getConditionClass(product.condition)}">${product.condition}</span>
      </div>
    </div>

    <div class="modal-info">
      <p class="modal-brand">${product.brand}</p>
      <h2 id="modalTitle">${product.name}</h2>

      <div class="modal-price">
        <span class="price-now">${formatPrice(product.price)}</span>
        <s class="price-old">${formatPrice(product.originalPrice)}</s>
        <span class="save-tag">You save ${getDiscount(product)}%</span>
      </div>

      <p class="modal-desc">${product.description}</p>

      <dl class="detail-list">
        <div><dt>Category</dt><dd>${product.category}</dd></div>
        <div><dt>Gender</dt><dd>${product.gender}</dd></div>
        <div><dt>Size</dt><dd>${product.size}</dd></div>
        <div><dt>Era</dt><dd>${product.era}</dd></div>
        <div><dt>Condition</dt><dd>${product.condition}</dd></div>
        <div><dt>Colour</dt><dd>${product.color}</dd></div>
      </dl>

      <p class="stock-note">
        <i class="fa-solid fa-bolt" aria-hidden="true"></i>
        One of a kind! Only 1 piece in stock - once it's gone, it's gone.
      </p>

      <button type="button" class="btn btn-primary btn-block modal-wish-btn" data-id="${product.id}">
        ${getModalWishButtonHTML(isSaved)}
      </button>
    </div>`;
}

// Opens the modal for one product
function openQuickView(productId) {
  const product = products.find(function (item) { return item.id === productId; });
  if (!product) return;

  currentModalId = productId;
  lastFocusedElement = document.activeElement;

  modalContent.innerHTML = createModalHTML(product);
  quickViewModal.classList.add('open');
  quickViewModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  modalClose.focus();
}

// Closes the modal and puts keyboard focus back where it was
function closeQuickView() {
  quickViewModal.classList.remove('open');
  quickViewModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  currentModalId = null;

  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
}

// Refreshes the wishlist button inside the open modal
function updateModalWishButton() {
  const button = modalContent.querySelector('.modal-wish-btn');
  if (button) {
    button.innerHTML = getModalWishButtonHTML(wishlist.includes(currentModalId));
  }
}


/* =========================================================
   11. MOBILE FILTER DRAWER
   ========================================================= */

// Slides the filter panel in (mobile / tablet)
function openFilterDrawer() {
  filterPanel.classList.add('open');
  drawerOverlay.classList.add('open');
  document.body.classList.add('no-scroll');
  openFiltersBtn.setAttribute('aria-expanded', 'true');
  closeFiltersBtn.focus();
}

// Slides the filter panel back out
function closeFilterDrawer() {
  if (!filterPanel.classList.contains('open')) return;

  filterPanel.classList.remove('open');
  drawerOverlay.classList.remove('open');
  document.body.classList.remove('no-scroll');
  openFiltersBtn.setAttribute('aria-expanded', 'false');
  openFiltersBtn.focus();
}


/* =========================================================
   12. EVENT LISTENERS (connect clicks / typing to our functions)
   ========================================================= */

// Reacts to clicks on pills and swatches inside the filter panel
function handleFilterButtonClick(event) {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;

  const name = button.dataset.filter;
  const value = button.dataset.value;

  if (name === 'gender') {
    filters.gender = value;          // only one gender can be picked
  } else {
    toggleInList(filters[name], value);
  }
  applyFilters();
}

// Reacts to ticking / unticking a checkbox inside the filter panel
function handleCheckboxChange(event) {
  const checkbox = event.target;
  if (checkbox.type !== 'checkbox' || !checkbox.dataset.filter) return;

  toggleInList(filters[checkbox.dataset.filter], checkbox.dataset.value);
  applyFilters();
}

// Reacts to moving either price slider (and stops min going above max)
function handlePriceChange(event) {
  let min = Number(priceMinInput.value);
  let max = Number(priceMaxInput.value);

  if (min > max) {
    if (event.target === priceMinInput) {
      max = min;
    } else {
      min = max;
    }
  }

  filters.minPrice = min;
  filters.maxPrice = max;
  applyFilters();
}

// Reacts to clicks inside the product grid (heart button or card)
function handleGridClick(event) {
  const heartButton = event.target.closest('.wish-btn');
  if (heartButton) {
    toggleWishlist(Number(heartButton.dataset.id));
    return;   // don't also open the modal
  }

  const card = event.target.closest('.card');
  if (card) {
    openQuickView(Number(card.dataset.id));
  }
}

// Reacts to clicks on the chip X buttons and the "Clear all" chip
function handleChipClick(event) {
  if (event.target.closest('#chipClearAll')) {
    clearAllFilters();
    return;
  }

  const removeButton = event.target.closest('.chip-remove');
  if (removeButton) {
    removeFilter(removeButton.dataset.filter, removeButton.dataset.value);
  }
}

// The "Jump to an era" buttons in the hero
function handleEraQuickClick(event) {
  const button = event.target.closest('.era-quick-btn');
  if (!button) return;

  filters.eras = [button.dataset.era];
  applyFilters();
  scrollToShop();
}

// Escape key closes whichever pop-up is open
function handleKeydown(event) {
  if (event.key !== 'Escape') return;

  if (quickViewModal.classList.contains('open')) {
    closeQuickView();
  } else {
    closeFilterDrawer();
  }
}

// Shows the back-to-top button after scrolling down a bit
function handleScroll() {
  backToTopBtn.classList.toggle('show', window.scrollY > 600);
}

// Connects every event to its function (runs once when the page loads)
function setupEventListeners() {
  // Filters
  filterPanel.addEventListener('click', handleFilterButtonClick);
  filterPanel.addEventListener('change', handleCheckboxChange);
  priceMinInput.addEventListener('input', handlePriceChange);
  priceMaxInput.addEventListener('input', handlePriceChange);

  // Search: filter while typing; pressing Enter just scrolls to the results
  searchInput.addEventListener('input', function () {
    filters.search = searchInput.value;
    applyFilters();
  });
  searchForm.addEventListener('submit', function (event) {
    event.preventDefault();
    scrollToShop();
  });

  // Sort
  sortSelect.addEventListener('change', function () {
    sortBy = sortSelect.value;
    applyFilters();
  });

  // Clear / reset buttons
  clearAllBtn.addEventListener('click', clearAllFilters);
  resetBtn.addEventListener('click', clearAllFilters);
  activeChips.addEventListener('click', handleChipClick);

  // Products + wishlist
  productGrid.addEventListener('click', handleGridClick);
  wishlistToggle.addEventListener('click', toggleWishlistView);
  document.querySelector('.era-quick').addEventListener('click', handleEraQuickClick);

  // Quick View modal
  modalClose.addEventListener('click', closeQuickView);
  quickViewModal.addEventListener('click', function (event) {
    // Clicking the dark area outside the white box closes it
    if (event.target === quickViewModal) {
      closeQuickView();
    }
  });
  modalContent.addEventListener('click', function (event) {
    if (event.target.closest('.modal-wish-btn')) {
      toggleWishlist(currentModalId);
    }
  });

  // Mobile drawer
  openFiltersBtn.addEventListener('click', openFilterDrawer);
  closeFiltersBtn.addEventListener('click', closeFilterDrawer);
  showResultsBtn.addEventListener('click', function () {
    closeFilterDrawer();
    scrollToShop();
  });
  drawerOverlay.addEventListener('click', closeFilterDrawer);
  window.addEventListener('resize', function () {
    // If the screen becomes wide again, the drawer is not needed
    if (window.innerWidth > 960) {
      closeFilterDrawer();
    }
  });

  // Keyboard + scrolling
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('scroll', handleScroll);
  backToTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}


/* =========================================================
   13. START THE APP
   ========================================================= */

// Runs once when the page loads
function init() {
  buildFilterOptions();
  setupEventListeners();
  updateWishlistCount();
  applyFilters();
}

init();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * The Spice Kitchen - Digital Restaurant Menu Vanilla JS Application
 */

import QRCode from 'qrcode';
import { RESTAURANTS, CATEGORIES, MENU_ITEMS } from './data.js';

// Application State
const state = {
  currentRestaurantId: 'spice-kitchen',
  currentTable: 'Table 04',
  selectedCategory: 'all',
  searchQuery: '',
  activeDietFilter: 'all', // 'all' | 'veg' | 'non-veg' | 'popular' | 'spicy' | 'gluten-free'
  shortlist: new Set(),
  shortlistQuantities: {}, // { [dishId]: number }
  shortlistNotes: {}, // { [dishId]: string[] }
  shortlistMode: 'detailed', // 'detailed' | 'readout'
  activeDishModal: null,
  isSearchOpen: false,
  viewMode: 'menu', // 'menu' | 'qr-generator' | 'shortlist'
};

// DOM Helper
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  parseUrlParameters();
  applyRestaurantTheme();
  renderHeader();
  renderCategoryNav();
  renderDietFilters();
  renderDishes();
  setupEventListeners();
  setupScrollSpy();
  registerServiceWorker();
  initQrGenerator();
});

/**
 * Parse URL Query params: ?restaurant=spice-kitchen&table=4
 */
function parseUrlParameters() {
  const params = new URLSearchParams(window.location.search);
  const restParam = params.get('restaurant') || params.get('rest');
  const tableParam = params.get('table');

  if (restParam && RESTAURANTS[restParam]) {
    state.currentRestaurantId = restParam;
  }
  if (tableParam) {
    state.currentTable = tableParam.toLowerCase().startsWith('table')
      ? tableParam
      : `Table ${tableParam.padStart(2, '0')}`;
  } else {
    state.currentTable = RESTAURANTS[state.currentRestaurantId].tableDefault;
  }
}

/**
 * Dynamically Apply CSS Theme Variables based on Selected Restaurant
 */
function applyRestaurantTheme() {
  const rest = RESTAURANTS[state.currentRestaurantId];
  if (!rest) return;

  const root = document.documentElement;
  root.style.setProperty('--primary', rest.themeColor);
  root.style.setProperty('--secondary', rest.accentColor);
  
  // Calculate subtle glow
  root.style.setProperty('--primary-glow', `${rest.themeColor}26`);
  root.style.setProperty('--secondary-glow', `${rest.accentColor}2E`);
}

/**
 * Render Header & Cover
 */
function renderHeader() {
  const rest = RESTAURANTS[state.currentRestaurantId];
  const headerContainer = $('#restaurant-header');
  if (!headerContainer) return;

  headerContainer.innerHTML = `
    <!-- Top Status & Table Floating Pill -->
    <div class="relative w-full overflow-hidden bg-stone-900 text-white">
      <div class="relative h-48 sm:h-56 md:h-64 w-full">
        <img 
          src="${rest.coverImage}" 
          alt="${rest.name}" 
          class="w-full h-full object-cover opacity-80"
          loading="eager"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent"></div>
        
        <!-- Top Action Bar -->
        <div class="absolute top-3 left-0 right-0 px-4 flex items-center justify-between z-10">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900/85 backdrop-blur-md border border-white/15 text-xs font-semibold text-amber-300">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ${state.currentTable}
          </div>
          
          <div class="flex items-center gap-2">
            <button id="btn-wifi-info" class="p-2 rounded-full bg-stone-900/85 backdrop-blur-md border border-white/15 text-stone-200 hover:text-white hover:bg-stone-800 transition" title="Wi-Fi & Info" aria-label="Wi-Fi Information">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>
            </button>
            <button id="btn-open-qr-tool" class="px-2.5 py-1 rounded-full bg-amber-500/90 text-stone-950 font-bold text-xs flex items-center gap-1 shadow-sm hover:bg-amber-400 transition" title="Table QR Stand Generator">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h6v6H4V4zm2 2v2h2V6H6zm8-2h6v6h-6V4zm2 2v2h2V6h-2zM4 14h6v6H4v-6zm2 2v2h2v-2H6zm10 0h2v2h-2v-2zm-2-2h2v2h-2v-2zm4 4h2v2h-2v-2zm-2 2h2v2h-2v-2zm4-4h2v2h-2v-2z"/></svg>
              <span>QR Stand</span>
            </button>
          </div>
        </div>

        <!-- Restaurant Branding Overlay -->
        <div class="absolute bottom-3 left-0 right-0 px-4 sm:px-6">
          <div class="flex items-end gap-3">
            <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white shadow-lg border-2 border-amber-400/40 flex items-center justify-center text-2xl sm:text-3xl shrink-0">
              ${rest.logo}
            </div>
            <div class="flex-1 min-w-0 pb-0.5">
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="font-brand text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm truncate">
                  ${rest.name}
                </h1>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-400/40 text-[11px] font-semibold text-emerald-300">
                  ★ ${rest.rating} (${rest.reviewCount})
                </span>
              </div>
              <p class="text-xs sm:text-sm text-stone-300 line-clamp-1 mt-0.5">${rest.tagline}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Info Bar below cover -->
      <div class="bg-stone-900 border-b border-stone-800 px-4 py-2.5 text-xs text-stone-300 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div class="flex items-center gap-2 shrink-0">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span class="font-medium text-emerald-400">${rest.status}</span>
        </div>
        <div class="text-stone-500">·</div>
        <div class="flex items-center gap-1 shrink-0 text-stone-300">
          <svg class="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span class="truncate max-w-[170px] sm:max-w-none">${rest.address.split(',')[1] || rest.address.split(',')[0]}</span>
        </div>
        <div class="text-stone-500">·</div>
        <button id="btn-call-waiter" class="shrink-0 px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 font-medium text-[11px] border border-stone-700 transition">
          🛎️ Call Waiter
        </button>
      </div>
    </div>
  `;

  // Attach quick header listeners
  $('#btn-wifi-info')?.addEventListener('click', openRestaurantInfoModal);
  $('#btn-open-qr-tool')?.addEventListener('click', openQrModal);
  $('#btn-call-waiter')?.addEventListener('click', triggerWaiterCall);
}

/**
 * Render Category Navigation Bar
 */
function renderCategoryNav() {
  const navContainer = $('#category-nav-list');
  if (!navContainer) return;

  navContainer.innerHTML = CATEGORIES.map(cat => {
    const isActive = state.selectedCategory === cat.id;
    const itemCount = cat.id === 'all' 
      ? MENU_ITEMS.length 
      : cat.id === 'popular'
        ? MENU_ITEMS.filter(m => m.popular).length
        : MENU_ITEMS.filter(m => m.category === cat.id).length;

    return `
      <button 
        id="cat-pill-${cat.id}"
        data-category="${cat.id}" 
        class="category-pill ${isActive ? 'active' : 'bg-stone-100/90 text-stone-700 hover:bg-stone-200/90'} px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 transition"
      >
        <span>${cat.icon}</span>
        <span>${cat.name}</span>
        <span class="text-[10px] opacity-70 ml-0.5">(${itemCount})</span>
      </button>
    `;
  }).join('');

  // Add click handlers
  $$('.category-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.dataset.category;
      if (target) {
        selectCategory(target);
      }
    });
  });
}

/**
 * Render Dietary Filter Chips (Pure Veg, Non-Veg, Popular, Spicy, etc.)
 */
function renderDietFilters() {
  const filterContainer = $('#dietary-filters-list');
  if (!filterContainer) return;

  const filters = [
    { id: 'all', label: 'All Items', icon: '🍽️' },
    { id: 'veg', label: 'Pure Veg', icon: '🌱' },
    { id: 'non-veg', label: 'Non-Veg', icon: '🍗' },
    { id: 'popular', label: 'Bestsellers', icon: '⭐' },
    { id: 'spicy', label: 'Spicy / Tandoor', icon: '🌶️' },
    { id: 'gluten-free', label: 'Gluten-Free', icon: '🌾' },
  ];

  filterContainer.innerHTML = filters.map(f => {
    const isSelected = state.activeDietFilter === f.id;
    return `
      <button 
        id="diet-filter-${f.id}"
        data-diet="${f.id}"
        class="px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1 border ${
          isSelected 
            ? 'bg-stone-900 text-white border-stone-900 shadow-xs' 
            : 'bg-white text-stone-600 border-stone-200/80 hover:bg-stone-50'
        }"
      >
        <span>${f.icon}</span>
        <span>${f.label}</span>
      </button>
    `;
  }).join('');

  $$('#dietary-filters-list button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const diet = e.currentTarget.dataset.diet;
      if (diet) {
        state.activeDietFilter = diet;
        renderDietFilters();
        renderDishes();
      }
    });
  });
}

/**
 * Filter Dishes based on category, search query, and dietary filters
 */
function getFilteredDishes() {
  return MENU_ITEMS.filter(dish => {
    // 1. Category Filter
    if (state.selectedCategory !== 'all') {
      if (state.selectedCategory === 'popular') {
        if (!dish.popular) return false;
      } else if (dish.category !== state.selectedCategory) {
        return false;
      }
    }

    // 2. Dietary Filter
    if (state.activeDietFilter === 'veg' && dish.type !== 'veg') return false;
    if (state.activeDietFilter === 'non-veg' && dish.type !== 'non-veg') return false;
    if (state.activeDietFilter === 'popular' && !dish.popular && !dish.chefSpecial) return false;
    if (state.activeDietFilter === 'spicy' && dish.spice !== 'spicy' && dish.spice !== 'medium') return false;
    if (state.activeDietFilter === 'gluten-free' && !dish.allergens.some(a => a.toLowerCase().includes('gluten-free'))) return false;

    // 3. Search Query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      const matchName = dish.name.toLowerCase().includes(q);
      const matchDesc = dish.description.toLowerCase().includes(q);
      const matchFlavour = dish.flavour ? dish.flavour.toLowerCase().includes(q) : false;
      const matchCategory = dish.category.toLowerCase().includes(q);
      const matchIngredients = dish.ingredients.some(i => i.toLowerCase().includes(q));
      return matchName || matchDesc || matchFlavour || matchCategory || matchIngredients;
    }

    return true;
  });
}

/**
 * Render Dish Cards
 */
function renderDishes() {
  const dishGrid = $('#dish-grid');
  const emptyState = $('#dish-empty-state');
  const resultsCounter = $('#search-results-count');
  if (!dishGrid) return;

  const filteredDishes = getFilteredDishes();

  if (resultsCounter) {
    if (state.searchQuery.trim() || state.activeDietFilter !== 'all' || state.selectedCategory !== 'all') {
      resultsCounter.classList.remove('hidden');
      resultsCounter.textContent = `Showing ${filteredDishes.length} ${filteredDishes.length === 1 ? 'dish' : 'dishes'}`;
    } else {
      resultsCounter.classList.add('hidden');
    }
  }

  if (filteredDishes.length === 0) {
    dishGrid.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  // Render cards
  dishGrid.innerHTML = filteredDishes.map(dish => {
    const isShortlisted = state.shortlist.has(dish.id);
    const qty = state.shortlistQuantities[dish.id] || 1;
    
    // Spice display
    const spiceMap = {
      'none': 'Mild',
      'mild': '🌶️ Mild',
      'medium': '🌶️🌶️ Med',
      'spicy': '🌶️🌶️🌶️ Hot'
    };

    return `
      <article 
        id="dish-card-${dish.id}"
        data-dish-id="${dish.id}"
        class="dish-card flex flex-row items-stretch p-3 sm:p-3.5 gap-3.5 select-none"
        tabindex="0"
        role="button"
        aria-label="${dish.name}, Price ₹${dish.price}"
      >
        <!-- Dish Thumbnail with Badges -->
        <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-stone-200">
          <img 
            src="${dish.image}" 
            alt="${dish.name}" 
            class="w-full h-full object-cover transition duration-300 hover:scale-105"
            loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400&auto=format&fit=crop&q=80'"
          />
          
          <!-- Veg / Non-Veg Indicator -->
          <div class="absolute top-1.5 left-1.5 shadow-sm">
            <span class="diet-indicator ${dish.type}" title="${dish.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}"></span>
          </div>

          ${dish.chefSpecial ? `
            <div class="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-bold text-[9px] uppercase tracking-wider shadow-sm">
              Chef's Pick
            </div>
          ` : dish.popular ? `
            <div class="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-stone-900/90 text-amber-300 font-semibold text-[9px] backdrop-blur-xs shadow-sm">
              ⭐ Popular
            </div>
          ` : ''}
        </div>

        <!-- Dish Content & Details -->
        <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div class="flex items-start justify-between gap-1">
              <h3 class="font-bold text-stone-900 text-sm sm:text-base leading-snug line-clamp-1 font-body">
                ${dish.name}
              </h3>
              <button 
                id="btn-shortlist-${dish.id}"
                data-shortlist-id="${dish.id}"
                class="btn-toggle-shortlist p-1 text-stone-300 hover:text-amber-500 transition shrink-0"
                title="${isShortlisted ? 'Remove bookmark' : 'Bookmark dish'}"
                aria-label="Bookmark dish"
              >
                <svg class="w-4 h-4 ${isShortlisted ? 'text-amber-500 fill-amber-500' : 'text-stone-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
              </button>
            </div>

            <!-- Flavour Badge -->
            <div class="mt-1 flex items-center gap-1.5 flex-wrap">
              <span class="flavour-badge">
                ${dish.flavour || '✨ Clay Oven Char'}
              </span>
              <span class="text-[10px] text-stone-400 font-medium hidden sm:inline-block">
                ${dish.portion ? '· ' + dish.portion.split('(')[0].trim() : ''}
              </span>
            </div>
            
            <p class="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
              ${dish.description}
            </p>
          </div>

          <!-- Bottom Row: Price & Add to Cart Controls -->
          <div class="flex items-center justify-between pt-2 border-t border-stone-100 mt-2 gap-2">
            <div class="flex items-baseline gap-1">
              <span class="text-xs text-stone-500 font-medium">₹</span>
              <span class="text-base font-bold text-stone-900">${dish.price}</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-[11px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full font-medium hidden xs:inline-block">
                ${spiceMap[dish.spice] || 'Mild'}
              </span>

              <!-- Add to Cart / Table Selection Stepper -->
              ${isShortlisted ? `
                <div class="cart-stepper-mini" title="Quantity in Selection">
                  <button type="button" class="btn-card-qty-sub" data-dish-id="${dish.id}" aria-label="Decrease quantity">−</button>
                  <span class="px-2 font-mono font-bold text-xs text-amber-300">${qty}</span>
                  <button type="button" class="btn-card-qty-add" data-dish-id="${dish.id}" aria-label="Increase quantity">+</button>
                </div>
              ` : `
                <button 
                  type="button" 
                  class="cart-add-btn bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-500/30 btn-card-add-cart cursor-pointer shadow-xs" 
                  data-dish-id="${dish.id}" 
                  title="Add to Table Selection"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                  <span>Add to Cart</span>
                </button>
              `}
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Attach card click handlers (opens detail modal)
  $$('.dish-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't trigger modal if clicking interactive controls directly
      if (
        e.target.closest('.btn-toggle-shortlist') || 
        e.target.closest('.btn-card-add-cart') || 
        e.target.closest('.btn-card-qty-sub') || 
        e.target.closest('.btn-card-qty-add')
      ) return;
      
      const dishId = card.dataset.dishId;
      const dish = MENU_ITEMS.find(d => d.id === dishId);
      if (dish) openDishModal(dish);
    });

    // Keyboard enter support
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const dishId = card.dataset.dishId;
        const dish = MENU_ITEMS.find(d => d.id === dishId);
        if (dish) openDishModal(dish);
      }
    });
  });

  // Shortlist buttons (bookmark)
  $$('.btn-toggle-shortlist').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dishId = btn.dataset.shortlistId;
      if (dishId) toggleShortlist(dishId);
    });
  });

  // Direct Add to Cart buttons on cards
  $$('.btn-card-add-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dishId = btn.dataset.dishId;
      if (dishId) {
        if (!state.shortlist.has(dishId)) {
          toggleShortlist(dishId);
        }
      }
    });
  });

  // Direct quantity steppers on cards
  $$('.btn-card-qty-sub').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dishId = btn.dataset.dishId;
      if (dishId) changeDishQuantity(dishId, -1);
    });
  });

  $$('.btn-card-qty-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dishId = btn.dataset.dishId;
      if (dishId) changeDishQuantity(dishId, 1);
    });
  });
}

/**
 * Handle Category Selection
 */
function selectCategory(categoryId) {
  state.selectedCategory = categoryId;
  
  // Update Pills
  $$('.category-pill').forEach(p => {
    const cat = p.dataset.category;
    if (cat === categoryId) {
      p.classList.add('active', 'bg-stone-900', 'text-white');
      p.classList.remove('bg-stone-100/90', 'text-stone-700');
      // Smooth scroll pill into visible area of nav
      p.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } else {
      p.classList.remove('active', 'bg-stone-900', 'text-white');
      p.classList.add('bg-stone-100/90', 'text-stone-700');
    }
  });

  renderDishes();
}

/**
 * Toggle Item in Shortlist (Table Diner's Wishlist)
 */
function toggleShortlist(dishId) {
  if (state.shortlist.has(dishId)) {
    state.shortlist.delete(dishId);
    delete state.shortlistQuantities[dishId];
    delete state.shortlistNotes[dishId];
  } else {
    state.shortlist.add(dishId);
    state.shortlistQuantities[dishId] = 1;
    state.shortlistNotes[dishId] = [];
    
    // Add tactile pulse animation to bottom bar table picks button
    const picksNavBtn = $('#btn-nav-shortlist');
    if (picksNavBtn) {
      picksNavBtn.classList.remove('pulse-amber');
      void picksNavBtn.offsetWidth; // trigger reflow
      picksNavBtn.classList.add('pulse-amber');
    }
  }
  updateShortlistBadges();
  renderDishes();
  if (state.activeDishModal && state.activeDishModal.id === dishId) {
    updateModalShortlistButton();
  }
}

/**
 * Adjust quantity for a shortlisted dish
 */
function changeDishQuantity(dishId, delta) {
  const currentQty = state.shortlistQuantities[dishId] || 1;
  const newQty = currentQty + delta;
  if (newQty <= 0) {
    toggleShortlist(dishId);
  } else {
    state.shortlistQuantities[dishId] = newQty;
    updateShortlistBadges();
    renderDishes();
  }
  renderShortlistContent();
  if (state.activeDishModal && state.activeDishModal.id === dishId) {
    updateModalShortlistButton();
  }
}

/**
 * Toggle quick cooking instruction on a shortlisted item
 */
function toggleDishInstruction(dishId, instruction) {
  if (!state.shortlistNotes[dishId]) {
    state.shortlistNotes[dishId] = [];
  }
  const notes = state.shortlistNotes[dishId];
  const index = notes.indexOf(instruction);
  if (index > -1) {
    notes.splice(index, 1);
  } else {
    notes.push(instruction);
  }
  renderShortlistContent();
}

function updateShortlistBadges() {
  const count = state.shortlist.size;
  const countEls = $$('.shortlist-counter');
  countEls.forEach(el => {
    el.textContent = count.toString();
    if (count > 0) {
      el.classList.remove('hidden');
      el.classList.add('badge-pop');
    } else {
      el.classList.add('hidden');
      el.classList.remove('badge-pop');
    }
  });

  // Calculate total amount across quantities
  let subtotal = 0;
  let totalItemsCount = 0;
  state.shortlist.forEach(id => {
    const dish = MENU_ITEMS.find(d => d.id === id);
    const qty = state.shortlistQuantities[id] || 1;
    if (dish) {
      subtotal += dish.price * qty;
      totalItemsCount += qty;
    }
  });

  const desktopTotal = $('#desktop-picks-total');
  if (desktopTotal) desktopTotal.textContent = `₹${subtotal}`;

  const desktopSubtext = $('#desktop-picks-subtext');
  if (desktopSubtext) {
    desktopSubtext.textContent = count > 0 
      ? `${totalItemsCount} portions ready to order` 
      : 'Review your order with server';
  }
}

/**
 * Open Dish Details Modal
 */
function openDishModal(dish) {
  state.activeDishModal = dish;
  const modal = $('#dish-detail-modal');
  const modalContainer = $('#dish-modal-content');
  if (!modal || !modalContainer) return;

  const isShortlisted = state.shortlist.has(dish.id);
  const qty = state.shortlistQuantities[dish.id] || 1;

  modalContainer.innerHTML = `
    <!-- Modal Hero Image -->
    <div class="relative w-full h-56 sm:h-64 overflow-hidden bg-stone-900">
      <img 
        src="${dish.image}" 
        alt="${dish.name}" 
        class="w-full h-full object-cover"
        loading="eager"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent"></div>
      
      <!-- Close Button -->
      <button 
        id="btn-close-dish-modal" 
        class="absolute top-3 right-3 w-9 h-9 rounded-full bg-stone-900/80 text-stone-200 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition shadow-md cursor-pointer"
        aria-label="Close modal"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>

      <!-- Badge Overlay -->
      <div class="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
        <div class="flex items-center gap-2">
          <span class="diet-indicator ${dish.type} shadow-md"></span>
          <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-900/80 backdrop-blur-md border border-white/10">
            ${dish.type === 'veg' ? 'Pure Vegetarian' : 'Non-Vegetarian'}
          </span>
        </div>
        <div class="text-right">
          <span class="text-xs text-amber-300 font-medium">Price</span>
          <div class="text-xl font-black text-white leading-none">₹${dish.price}</div>
        </div>
      </div>
    </div>

    <!-- Modal Body Details -->
    <div class="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="font-brand text-xl sm:text-2xl font-bold text-stone-900 leading-tight">
            ${dish.name}
          </h2>
        </div>

        <!-- Flavour Badge in Modal -->
        <div class="mt-2.5 flex items-center gap-2 flex-wrap">
          <div class="flavour-badge px-2.5 py-1 text-xs">
            <span class="text-amber-800 font-bold">Flavour Profile:</span>
            <span class="text-stone-900 font-semibold">${dish.flavour || 'Artisanal Clay Tandoor'}</span>
          </div>
          ${dish.chefSpecial ? `
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-stone-950 uppercase tracking-wider">
              Chef's Special
            </span>
          ` : ''}
        </div>

        <p class="text-sm text-stone-600 leading-relaxed mt-2.5 font-normal">
          ${dish.description}
        </p>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="grid grid-cols-3 gap-2 py-3 border-y border-stone-200/80 text-center">
        <div class="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
          <div class="text-[11px] text-stone-500 font-medium">Spice Level</div>
          <div class="text-xs font-bold text-stone-800 mt-0.5 capitalize">${dish.spice === 'none' ? 'Mild' : dish.spice}</div>
        </div>
        <div class="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
          <div class="text-[11px] text-stone-500 font-medium">Portion</div>
          <div class="text-xs font-bold text-stone-800 mt-0.5">${dish.portion}</div>
        </div>
        <div class="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
          <div class="text-[11px] text-stone-500 font-medium">Est. Calories</div>
          <div class="text-xs font-bold text-stone-800 mt-0.5">${dish.calories}</div>
        </div>
      </div>

      <!-- Ingredients -->
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Key Ingredients</h4>
        <div class="flex flex-wrap gap-1.5">
          ${dish.ingredients.map(ing => `
            <span class="px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200/60">
              ${ing}
            </span>
          `).join('')}
        </div>
      </div>

      <!-- Allergens & Dietary Information -->
      <div class="bg-amber-50/80 border border-amber-200/70 p-3 rounded-xl">
        <div class="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
          <svg class="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Allergen & Dietary Information
        </div>
        <div class="text-xs text-amber-800 leading-normal">
          ${dish.allergens.join(' · ')}
        </div>
        <div class="text-[11px] text-amber-700/80 mt-1">
          Preparation time approx: <span class="font-semibold">${dish.prepTime}</span>
        </div>
      </div>
    </div>

    <!-- Modal Footer Actions with Add to Cart and Stepper -->
    <div class="p-4 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between gap-3">
      <!-- Quantity Stepper -->
      <div class="flex items-center bg-stone-200/80 rounded-xl p-1 border border-stone-300">
        <button 
          id="btn-modal-qty-sub" 
          type="button"
          class="w-8 h-8 rounded-lg bg-white text-stone-800 font-bold hover:bg-stone-100 flex items-center justify-center cursor-pointer shadow-xs transition"
          aria-label="Decrease quantity"
        >−</button>
        <span id="modal-dish-qty" class="w-8 text-center font-mono font-bold text-sm text-stone-900">${qty}</span>
        <button 
          id="btn-modal-qty-add" 
          type="button"
          class="w-8 h-8 rounded-lg bg-white text-stone-800 font-bold hover:bg-stone-100 flex items-center justify-center cursor-pointer shadow-xs transition"
          aria-label="Increase quantity"
        >+</button>
      </div>

      <!-- Add / In Cart Button -->
      <button 
        id="btn-modal-shortlist"
        type="button"
        class="flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
          isShortlisted 
            ? 'bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200' 
            : 'bg-stone-900 text-amber-300 hover:bg-stone-800'
        }"
      >
        <svg class="w-4 h-4 ${isShortlisted ? 'fill-amber-600 text-amber-600' : 'text-amber-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        <span id="modal-cart-btn-text">${isShortlisted ? `In Selection (₹${dish.price * qty})` : `Add to Cart · ₹${dish.price * qty}`}</span>
      </button>

      <button 
        id="btn-modal-close-action" 
        type="button"
        class="py-3 px-3.5 rounded-xl bg-white border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-100 transition cursor-pointer"
      >
        Close
      </button>
    </div>
  `;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Attach modal listeners
  $('#btn-close-dish-modal')?.addEventListener('click', closeDishModal);
  $('#btn-modal-close-action')?.addEventListener('click', closeDishModal);
  
  $('#btn-modal-shortlist')?.addEventListener('click', () => {
    if (!state.shortlist.has(dish.id)) {
      toggleShortlist(dish.id);
    } else {
      // Toggle or keep
      openShortlistDrawer();
      closeDishModal();
    }
  });

  $('#btn-modal-qty-sub')?.addEventListener('click', () => {
    if (state.shortlist.has(dish.id)) {
      changeDishQuantity(dish.id, -1);
    } else {
      // If not yet in cart, adjust local display or add
      const qtyEl = $('#modal-dish-qty');
      let val = parseInt(qtyEl?.textContent || '1', 10);
      if (val > 1) {
        val -= 1;
        if (qtyEl) qtyEl.textContent = val.toString();
        const btnText = $('#modal-cart-btn-text');
        if (btnText) btnText.textContent = `Add to Cart · ₹${dish.price * val}`;
      }
    }
  });

  $('#btn-modal-qty-add')?.addEventListener('click', () => {
    if (state.shortlist.has(dish.id)) {
      changeDishQuantity(dish.id, 1);
    } else {
      const qtyEl = $('#modal-dish-qty');
      let val = parseInt(qtyEl?.textContent || '1', 10);
      val += 1;
      if (qtyEl) qtyEl.textContent = val.toString();
      const btnText = $('#modal-cart-btn-text');
      if (btnText) btnText.textContent = `Add to Cart · ₹${dish.price * val}`;
    }
  });
}

function updateModalShortlistButton() {
  if (!state.activeDishModal) return;
  const dish = state.activeDishModal;
  const btn = $('#btn-modal-shortlist');
  const qtyEl = $('#modal-dish-qty');
  if (!btn) return;
  const isShortlisted = state.shortlist.has(dish.id);
  const qty = state.shortlistQuantities[dish.id] || 1;

  if (qtyEl) qtyEl.textContent = qty.toString();

  if (isShortlisted) {
    btn.className = 'flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200 cursor-pointer';
    btn.innerHTML = `
      <svg class="w-4 h-4 fill-amber-600 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
      <span id="modal-cart-btn-text">In Selection · ₹${dish.price * qty}</span>
    `;
  } else {
    btn.className = 'flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition bg-stone-900 text-amber-300 hover:bg-stone-800 cursor-pointer';
    btn.innerHTML = `
      <svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      <span id="modal-cart-btn-text">Add to Cart · ₹${dish.price * qty}</span>
    `;
  }
}

function closeDishModal() {
  const modal = $('#dish-detail-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
  state.activeDishModal = null;
}

/**
 * Open Diner Shortlist Drawer & Render Content
 */
function openShortlistDrawer() {
  const drawer = $('#shortlist-drawer');
  if (!drawer) return;

  const tableTag = $('#shortlist-table-tag');
  if (tableTag) tableTag.textContent = state.currentTable;

  renderShortlistContent();
  drawer.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/**
 * Render Shortlist Content (Detailed vs Waiter Card)
 */
function renderShortlistContent() {
  const listContainer = $('#shortlist-items-list');
  const subtotalEl = $('#shortlist-subtotal');
  const taxEl = $('#shortlist-tax');
  const totalContainer = $('#shortlist-total-amount');
  const summaryStatsEl = $('#shortlist-summary-stats');
  
  if (!listContainer) return;

  const shortlistedDishes = MENU_ITEMS.filter(d => state.shortlist.has(d.id));

  // Compute stats and totals
  let subtotal = 0;
  let vegCount = 0;
  let nonVegCount = 0;
  let totalItemsCount = 0;

  shortlistedDishes.forEach(dish => {
    const qty = state.shortlistQuantities[dish.id] || 1;
    subtotal += dish.price * qty;
    totalItemsCount += qty;
    if (dish.type === 'veg') vegCount += qty;
    else nonVegCount += qty;
  });

  const tax = Math.round(subtotal * 0.05); // 5% GST estimate
  const grandTotal = subtotal + tax;

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (taxEl) taxEl.textContent = `₹${tax}`;
  if (totalContainer) totalContainer.textContent = `₹${grandTotal}`;

  // Summary badges
  if (summaryStatsEl) {
    if (shortlistedDishes.length === 0) {
      summaryStatsEl.innerHTML = `<span class="text-stone-400 font-medium">No items currently selected</span>`;
    } else {
      summaryStatsEl.innerHTML = `
        <span class="font-bold text-stone-900">${totalItemsCount} Total Portion${totalItemsCount > 1 ? 's' : ''}</span>
        <span class="text-stone-300">•</span>
        ${vegCount > 0 ? `<span class="text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 font-semibold text-[11px]">${vegCount} Veg</span>` : ''}
        ${nonVegCount > 0 ? `<span class="text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200 font-semibold text-[11px]">${nonVegCount} Non-Veg</span>` : ''}
      `;
    }
  }

  // Handle Empty State with Classic Fine-Dining Recommendations
  if (shortlistedDishes.length === 0) {
    const suggestions = MENU_ITEMS.slice(0, 3);
    listContainer.innerHTML = `
      <div class="text-center py-9 px-4">
        <div class="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-2xl mx-auto mb-3 shadow-sm text-amber-700">
          📜
        </div>
        <h4 class="font-brand font-bold text-stone-900 text-lg tracking-tight">Your Table Selection is Empty</h4>
        <p class="text-xs text-stone-500 max-w-xs mx-auto mt-1 leading-relaxed">
          Bookmark desired dishes from the menu to curate your meal and review directly with your dining captain.
        </p>

        <!-- Classic 1-Tap Recommendations -->
        <div class="mt-6 text-left max-w-md mx-auto">
          <div class="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2.5 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Chef's Signature Starters:</span>
          </div>
          <div class="space-y-2">
            ${suggestions.map(dish => `
              <div class="flex items-center justify-between p-3 rounded-xl bg-white border border-[#EBE5DC] shadow-sm hover:border-amber-400/80 transition">
                <div class="flex items-center gap-3 min-w-0">
                  <img src="${dish.image}" class="w-11 h-11 rounded-lg object-cover border border-stone-100 shrink-0" alt="${dish.name}" />
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="diet-indicator ${dish.type}"></span>
                      <div class="font-bold text-xs text-stone-900 truncate">${dish.name}</div>
                    </div>
                    <div class="text-[11px] text-stone-500 font-mono font-semibold mt-0.5">₹${dish.price} <span class="text-stone-400 font-sans font-normal">· ${dish.portion}</span></div>
                  </div>
                </div>
                <button 
                  data-quick-add-id="${dish.id}" 
                  class="btn-quick-add py-1.5 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-amber-400/20 active:scale-95 shrink-0"
                >
                  <span class="text-amber-400 font-bold">+</span>
                  <span>Select</span>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    $$('.btn-quick-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dishId = e.currentTarget.dataset.quickAddId;
        if (dishId) {
          toggleShortlist(dishId);
          renderShortlistContent();
        }
      });
    });
    return;
  }

  // Render according to selected mode:
  if (state.shortlistMode === 'readout') {
    // WAITER / SERVER LEDGER CARD MODE (Classic High-Contrast Captain Folio)
    listContainer.innerHTML = `
      <div class="bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 text-white p-5 rounded-2xl border border-amber-500/30 shadow-2xl space-y-4">
        
        <!-- Folio Header -->
        <div class="flex items-start justify-between border-b border-stone-800 pb-3.5">
          <div>
            <div class="text-[9px] uppercase font-mono font-bold tracking-widest text-amber-400">Captain's Order Ledger</div>
            <h4 class="font-brand text-lg font-bold text-stone-100 tracking-tight mt-0.5">${RESTAURANTS[state.currentRestaurantId].name}</h4>
            <div class="text-xs text-stone-400 font-mono mt-0.5">Location: <span class="text-amber-300 font-bold">${state.currentTable}</span></div>
          </div>
          <div class="text-right">
            <span class="text-[10px] uppercase tracking-wider text-stone-400 font-mono">Bill Est.</span>
            <div class="text-lg font-black text-amber-300 font-mono">₹${grandTotal}</div>
          </div>
        </div>

        <!-- Course Row Items -->
        <div class="space-y-3 divide-y divide-stone-800/80">
          ${shortlistedDishes.map((dish, idx) => {
            const qty = state.shortlistQuantities[dish.id] || 1;
            const notes = state.shortlistNotes[dish.id] || [];
            return `
              <div class="pt-2.5 flex items-start justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-amber-400 text-sm bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">${qty}×</span>
                    <span class="font-bold text-sm text-stone-100">${dish.name}</span>
                    <span class="diet-indicator ${dish.type}"></span>
                  </div>
                  ${notes.length > 0 ? `
                    <div class="text-[11px] text-amber-200/90 font-medium pl-8 italic">
                      Special Note: ${notes.join(' • ')}
                    </div>
                  ` : ''}
                </div>
                <div class="text-xs font-mono font-bold text-stone-300 pt-0.5">
                  ₹${dish.price * qty}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Ledger Footer & Quick WhatsApp Action -->
        <div class="pt-3 border-t border-stone-800 space-y-2 text-center">
          <p class="text-[11px] text-stone-400 font-medium">
            Present this card directly to your server or send via WhatsApp.
          </p>
          <button id="btn-readout-whatsapp" type="button" class="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            <span>Share Summary on WhatsApp</span>
          </button>
        </div>
      </div>
    `;

    $('#btn-readout-whatsapp')?.addEventListener('click', shareTablePicksViaWhatsApp);
  } else {
    // ITEMIZED CLASSIC DETAILED MODE
    const presetNotes = [
      { id: 'Mild Tempering 🌶️', label: 'Mild Spice' },
      { id: 'Extra Butter 🧈', label: 'Extra Butter' },
      { id: 'No Onion/Garlic 🌿', label: 'No Alliums' },
      { id: 'Crisp Finish 🔥', label: 'Crisp' },
      { id: 'Fresh Lime 🍋', label: 'Lime Wedge' },
    ];

    listContainer.innerHTML = shortlistedDishes.map(dish => {
      const qty = state.shortlistQuantities[dish.id] || 1;
      const activeNotes = state.shortlistNotes[dish.id] || [];
      const itemSubtotal = dish.price * qty;

      return `
        <div class="p-3.5 rounded-xl bg-white border border-[#E9E3D9] shadow-sm space-y-2.5 transition hover:border-[#D8CFBF]">
          
          <!-- Dish Header -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <img src="${dish.image}" class="w-12 h-12 rounded-lg object-cover shadow-sm shrink-0 border border-stone-100" alt="${dish.name}" />
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="diet-indicator ${dish.type}"></span>
                  <h5 class="font-bold text-sm text-stone-900 truncate tracking-tight">${dish.name}</h5>
                </div>
                <div class="text-xs text-stone-500 font-medium mt-0.5">
                  <span class="font-mono font-bold text-stone-800">₹${dish.price}</span> <span class="font-normal text-stone-400">· ${dish.portion}</span>
                </div>
              </div>
            </div>

            <!-- Stepper Controls & Total -->
            <div class="flex flex-col items-end gap-1 shrink-0">
              <div class="flex items-center bg-[#F5F2EB] rounded-lg p-0.5 border border-[#E0D9CD]">
                <button 
                  data-dish-qty-sub="${dish.id}" 
                  class="stepper-btn text-stone-600 hover:text-stone-950 hover:bg-stone-200 cursor-pointer"
                  title="Decrease quantity"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span class="w-6 text-center text-xs font-mono font-black text-stone-900">${qty}</span>
                <button 
                  data-dish-qty-add="${dish.id}" 
                  class="stepper-btn bg-stone-900 text-amber-300 hover:bg-stone-800 shadow-sm cursor-pointer"
                  title="Increase quantity"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <div class="text-xs font-mono font-bold text-stone-900">
                ₹${itemSubtotal}
              </div>
            </div>
          </div>

          <!-- Chef Instructions / Kitchen Notes -->
          <div class="pt-2 border-t border-stone-100 flex items-center justify-between gap-1 flex-wrap">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[10px] font-bold text-stone-400 uppercase tracking-widest mr-0.5">Notes:</span>
              ${presetNotes.map(note => {
                const isActive = activeNotes.includes(note.id);
                return `
                  <button 
                    data-note-dish="${dish.id}" 
                    data-note-val="${note.id}"
                    class="instruction-tag text-[10px] px-2 py-0.5 rounded-md border ${
                      isActive 
                        ? 'bg-amber-100/90 text-amber-900 border-amber-400/80 font-bold shadow-xs' 
                        : 'bg-[#F9F7F4] text-stone-600 border-[#E5DFD5] hover:bg-[#F2ECE2]'
                    }"
                  >
                    ${note.label}
                  </button>
                `;
              }).join('')}
            </div>

            <!-- Remove Button -->
            <button 
              data-remove-id="${dish.id}" 
              class="btn-remove-shortlist text-stone-400 hover:text-rose-600 p-1 transition cursor-pointer"
              title="Remove item"
              aria-label="Remove item"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>

        </div>
      `;
    }).join('');

    // Attach Stepper Listeners
    $$('[data-dish-qty-sub]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.dishQtySub;
        if (id) changeDishQuantity(id, -1);
      });
    });

    $$('[data-dish-qty-add]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.dishQtyAdd;
        if (id) changeDishQuantity(id, 1);
      });
    });

    // Attach Instruction Tag Listeners
    $$('[data-note-dish]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dishId = e.currentTarget.dataset.noteDish;
        const noteVal = e.currentTarget.dataset.noteVal;
        if (dishId && noteVal) {
          toggleDishInstruction(dishId, noteVal);
        }
      });
    });

    // Attach Remove Listeners
    $$('.btn-remove-shortlist').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dishId = e.currentTarget.dataset.removeId;
        if (dishId) {
          toggleShortlist(dishId);
          renderShortlistContent();
        }
      });
    });
  }
}

/**
 * Generate formatted WhatsApp order text
 */
function generateWhatsAppOrderMessage() {
  const shortlistedDishes = MENU_ITEMS.filter(d => state.shortlist.has(d.id));
  if (shortlistedDishes.length === 0) return null;

  const rest = RESTAURANTS[state.currentRestaurantId];
  let subtotal = 0;
  
  let msg = `🍽️ *${rest.name.toUpperCase()}*\n`;
  msg += `📍 *TABLE SELECTION (${state.currentTable.toUpperCase()})*\n`;
  msg += `─────────────────────────\n\n`;

  shortlistedDishes.forEach((dish, idx) => {
    const qty = state.shortlistQuantities[dish.id] || 1;
    const notes = state.shortlistNotes[dish.id] || [];
    const itemTotal = dish.price * qty;
    subtotal += itemTotal;
    
    const dietIcon = dish.type === 'veg' ? '🟢 [Veg]' : '🔴 [Non-Veg]';
    msg += `${idx + 1}. *${qty}× ${dish.name}* — ₹${itemTotal}\n`;
    msg += `   ${dietIcon} ${dish.flavour ? '• ' + dish.flavour : ''}\n`;
    if (notes.length > 0) {
      msg += `   📝 _Chef Notes: ${notes.join(', ')}_\n`;
    }
    msg += `\n`;
  });

  const tax = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + tax;

  msg += `─────────────────────────\n`;
  msg += `*Subtotal:* ₹${subtotal}\n`;
  msg += `*Estimated GST (5%):* ₹${tax}\n`;
  msg += `*Grand Total: ₹${grandTotal}*\n`;
  msg += `─────────────────────────\n`;
  msg += `📱 _Generated via Digital Table QR Menu_`;

  return msg;
}

/**
 * Share Table Picks directly via WhatsApp
 */
function shareTablePicksViaWhatsApp() {
  const msg = generateWhatsAppOrderMessage();
  if (!msg) {
    showToast('Add some dishes to Table Picks first!');
    return;
  }

  const encodedMsg = encodeURIComponent(msg);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMsg}`;

  // Safe navigation that works on mobile apps & desktop browsers
  const link = document.createElement('a');
  link.href = whatsappUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('💬 Opening WhatsApp with Table Selection...');
}

/**
 * Share Table Picks via Web Share or Clipboard
 */
function shareTablePicks() {
  const text = generateWhatsAppOrderMessage();
  if (!text) {
    showToast('Add some dishes to Table Picks first!');
    return;
  }

  const rest = RESTAURANTS[state.currentRestaurantId];

  if (navigator.share) {
    navigator.share({
      title: `${rest.name} Order for ${state.currentTable}`,
      text: text,
    }).catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 Order summary copied to clipboard!');
  }).catch(() => {
    showToast('Order summary ready to share');
  });
}

function showToast(message) {
  const toast = $('#waiter-toast');
  if (!toast) return;
  toast.innerHTML = `
    <div class="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-900/95 text-white font-bold text-xs shadow-2xl backdrop-blur-md border border-white/20 animate-bounce">
      <span>🔔</span>
      <span>${message}</span>
    </div>
  `;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

function closeShortlistDrawer() {
  const drawer = $('#shortlist-drawer');
  if (drawer) drawer.classList.add('hidden');
  document.body.style.overflow = '';
}

/**
 * Open Restaurant Wi-Fi & Info Modal
 */
function openRestaurantInfoModal() {
  const rest = RESTAURANTS[state.currentRestaurantId];
  const modal = $('#restaurant-info-modal');
  const container = $('#info-modal-content');
  if (!modal || !container) return;

  container.innerHTML = `
    <div class="p-6 space-y-4">
      <div class="text-center pb-2">
        <div class="text-4xl mb-2">${rest.logo}</div>
        <h3 class="font-brand text-xl font-bold text-stone-900">${rest.name}</h3>
        <p class="text-xs text-stone-500">${rest.cuisine}</p>
      </div>

      <!-- Wi-Fi Card -->
      <div class="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 text-xs font-bold text-amber-900">
            <svg class="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>
            Guest Wi-Fi Access
          </div>
          <span class="text-[10px] font-semibold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">Free</span>
        </div>
        <div class="space-y-1.5 text-xs text-stone-700">
          <div class="flex justify-between">
            <span class="text-stone-500">Network:</span>
            <span class="font-mono font-bold text-stone-900">${rest.wifiName}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-stone-500">Password:</span>
            <div class="flex items-center gap-1.5">
              <span class="font-mono font-bold text-stone-900">${rest.wifiPass}</span>
              <button id="btn-copy-wifi" class="text-[11px] text-amber-800 underline font-medium hover:text-amber-900 cursor-pointer">Copy</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Address & Service Details -->
      <div class="space-y-2.5 text-xs text-stone-600 border-t border-stone-100 pt-3">
        <div class="flex items-start gap-2">
          <span class="font-bold text-stone-800 shrink-0">📍 Address:</span>
          <span>${rest.address}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-stone-800 shrink-0">📞 Phone:</span>
          <span>${rest.phone}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-stone-800 shrink-0">⏰ Hours:</span>
          <span>${rest.openHours}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-stone-800 shrink-0">🛡️ FSSAI License:</span>
          <span class="font-mono">${rest.fssaiNumber}</span>
        </div>
      </div>

      <button 
        onclick="document.getElementById('restaurant-info-modal').classList.add('hidden'); document.body.style.overflow='';" 
        class="w-full py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition cursor-pointer"
      >
        Got it, Back to Menu
      </button>
    </div>
  `;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  $('#btn-copy-wifi')?.addEventListener('click', () => {
    navigator.clipboard.writeText(rest.wifiPass).then(() => {
      showToast('Wi-Fi Password copied!');
    });
  });
}

/**
 * Call Waiter Visual Notification
 */
function triggerWaiterCall() {
  const toast = $('#waiter-toast');
  if (!toast) return;

  toast.innerHTML = `
    <div class="flex items-center gap-3 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-stone-700 max-w-sm mx-auto">
      <span class="text-2xl">🛎️</span>
      <div class="text-left flex-1 min-w-0">
        <div class="font-bold text-xs text-amber-300">Server Notified for ${state.currentTable}</div>
        <div class="text-[11px] text-stone-300">Our floor team is heading to your table shortly!</div>
      </div>
    </div>
  `;

  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

/**
 * Setup QR Code Table Stand Generator
 */
function initQrGenerator() {
  const restSelect = $('#qr-select-restaurant');
  const tableInput = $('#qr-input-table');
  const printBtn = $('#qr-btn-print');
  const downloadBtn = $('#qr-btn-download');

  if (restSelect) {
    restSelect.innerHTML = Object.values(RESTAURANTS).map(r => `
      <option value="${r.id}" ${r.id === state.currentRestaurantId ? 'selected' : ''}>
        ${r.name} (${r.cuisine.split('·')[0]})
      </option>
    `).join('');

    restSelect.addEventListener('change', () => {
      renderQrCanvas();
    });
  }

  if (tableInput) {
    tableInput.addEventListener('input', () => {
      renderQrCanvas();
    });
  }

  printBtn?.addEventListener('click', () => {
    window.print();
  });

  downloadBtn?.addEventListener('click', () => {
    downloadQrCard();
  });
}

async function renderQrCanvas() {
  const restSelect = $('#qr-select-restaurant');
  const tableInput = $('#qr-input-table');
  const qrCanvas = $('#qr-canvas');
  const qrUrlDisplay = $('#qr-url-display');
  const qrCardTitle = $('#qr-card-title');
  const qrCardTable = $('#qr-card-table');

  if (!qrCanvas) return;

  const selectedRestId = restSelect?.value || state.currentRestaurantId;
  const selectedTableNum = tableInput?.value.trim() || '04';
  const rest = RESTAURANTS[selectedRestId];

  // Construct target URL for table QR
  const baseUrl = window.location.origin + window.location.pathname;
  const targetUrl = `${baseUrl}?restaurant=${selectedRestId}&table=${encodeURIComponent(selectedTableNum)}`;

  if (qrUrlDisplay) {
    qrUrlDisplay.textContent = targetUrl;
  }
  if (qrCardTitle) {
    qrCardTitle.textContent = rest.name;
  }
  if (qrCardTable) {
    qrCardTable.textContent = `TABLE ${selectedTableNum.toUpperCase()}`;
  }

  try {
    await QRCode.toCanvas(qrCanvas, targetUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: rest.themeColor || '#1C1917',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    });
  } catch (err) {
    console.error('QR Code generation error:', err);
  }
}

function openQrModal() {
  const modal = $('#qr-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderQrCanvas();
  }
}

function closeQrModal() {
  const modal = $('#qr-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function downloadQrCard() {
  const qrCanvas = $('#qr-canvas');
  if (!qrCanvas) return;
  
  const link = document.createElement('a');
  link.download = `table-qr-${state.currentRestaurantId}.png`;
  link.href = qrCanvas.toDataURL('image/png');
  link.click();
}

/**
 * Event Listeners & Search Bar
 */
function setupEventListeners() {
  // Search input live filtering
  const searchInput = $('#search-input');
  const clearSearchBtn = $('#btn-clear-search');
  const searchToggleBtn = $('#btn-toggle-search');

  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    if (clearSearchBtn) {
      if (state.searchQuery.length > 0) {
        clearSearchBtn.classList.remove('hidden');
      } else {
        clearSearchBtn.classList.add('hidden');
      }
    }
    renderDishes();
  });

  clearSearchBtn?.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderDishes();
      searchInput.focus();
    }
  });

  searchToggleBtn?.addEventListener('click', () => {
    const searchSection = $('#search-bar-section');
    searchSection?.classList.toggle('hidden');
    if (!searchSection?.classList.contains('hidden') && searchInput) {
      searchInput.focus();
    }
  });

  // Shortlist Bottom Bar & Drawer Triggers
  $('#btn-open-shortlist')?.addEventListener('click', openShortlistDrawer);
  $('#btn-close-shortlist')?.addEventListener('click', closeShortlistDrawer);
  $('#btn-nav-shortlist')?.addEventListener('click', openShortlistDrawer);
  $('#btn-whatsapp-shortlist')?.addEventListener('click', shareTablePicksViaWhatsApp);
  $('#btn-whatsapp-share-bottom')?.addEventListener('click', shareTablePicksViaWhatsApp);
  $('#btn-share-shortlist')?.addEventListener('click', shareTablePicks);
  $('#btn-call-waiter-shortlist')?.addEventListener('click', triggerWaiterCall);
  $('#btn-done-shortlist')?.addEventListener('click', () => {
    closeShortlistDrawer();
    triggerWaiterCall();
  });

  // Shortlist View Mode toggles
  $('#shortlist-view-normal')?.addEventListener('click', () => {
    state.shortlistMode = 'detailed';
    $('#shortlist-view-normal')?.classList.add('bg-white', 'text-stone-900', 'shadow-sm');
    $('#shortlist-view-normal')?.classList.remove('text-stone-600');
    $('#shortlist-view-readout')?.classList.remove('bg-white', 'text-stone-900', 'shadow-sm');
    $('#shortlist-view-readout')?.classList.add('text-stone-600');
    renderShortlistContent();
  });

  $('#shortlist-view-readout')?.addEventListener('click', () => {
    state.shortlistMode = 'readout';
    $('#shortlist-view-readout')?.classList.add('bg-white', 'text-stone-900', 'shadow-sm');
    $('#shortlist-view-readout')?.classList.remove('text-stone-600');
    $('#shortlist-view-normal')?.classList.remove('bg-white', 'text-stone-900', 'shadow-sm');
    $('#shortlist-view-normal')?.classList.add('text-stone-600');
    renderShortlistContent();
  });

  // Close modals on backdrop click
  $('#dish-detail-modal')?.addEventListener('click', (e) => {
    if (e.target === $('#dish-detail-modal')) closeDishModal();
  });
  $('#shortlist-drawer')?.addEventListener('click', (e) => {
    if (e.target === $('#shortlist-drawer')) closeShortlistDrawer();
  });
  $('#restaurant-info-modal')?.addEventListener('click', (e) => {
    if (e.target === $('#restaurant-info-modal')) {
      $('#restaurant-info-modal')?.classList.add('hidden');
      document.body.style.overflow = '';
    }
  });
  $('#qr-modal')?.addEventListener('click', (e) => {
    if (e.target === $('#qr-modal')) closeQrModal();
  });
  $('#btn-close-qr-modal')?.addEventListener('click', closeQrModal);

  // Keyboard escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDishModal();
      closeShortlistDrawer();
      closeQrModal();
      $('#restaurant-info-modal')?.classList.add('hidden');
      document.body.style.overflow = '';
    }
  });

  // Bottom Navigation Tabs
  $('#nav-tab-menu')?.addEventListener('click', () => {
    updateBottomNavActive('#nav-tab-menu');
    selectCategory('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#nav-tab-popular')?.addEventListener('click', () => {
    updateBottomNavActive('#nav-tab-popular');
    selectCategory('popular');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#nav-tab-qr')?.addEventListener('click', () => {
    updateBottomNavActive('#nav-tab-qr');
    openQrModal();
  });
  $('#nav-tab-info')?.addEventListener('click', openRestaurantInfoModal);
}

function updateBottomNavActive(selector) {
  const tabs = ['#nav-tab-menu', '#nav-tab-popular', '#nav-tab-qr'];
  tabs.forEach(tabSel => {
    const el = $(tabSel);
    if (!el) return;
    if (tabSel === selector) {
      el.classList.add('bg-stone-100/90', 'text-stone-900');
      el.classList.remove('text-stone-500');
    } else {
      el.classList.remove('bg-stone-100/90', 'text-stone-900');
      el.classList.add('text-stone-500');
    }
  });
}

/**
 * ScrollSpy to keep Category nav sticky and smoothly visible
 */
function setupScrollSpy() {
  const stickyNav = $('#sticky-category-container');
  if (!stickyNav) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 220) {
      stickyNav.classList.add('shadow-md', 'bg-white/95', 'backdrop-blur-md');
    } else {
      stickyNav.classList.remove('shadow-md');
    }
  });
}

/**
 * Register PWA Service Worker
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('PWA Service Worker registered:', reg.scope))
        .catch(err => console.log('Service Worker registration error:', err));
    });
  }
}


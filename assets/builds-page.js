/* Builds page — Phase 1 + 2: tabs, localStorage, item picker */

var bc = document.getElementById('breadcrumbs');
if (bc) bc.innerHTML = '<a href="index.html">Home</a> &gt; Builds';

var STORAGE_KEY = 'overlooting-builds';
var MAX_BUILDS  = 10;

var SLOT_ORDER = ['headpiece', 'chestpiece', 'footwear', 'left-hand', 'right-hand', 'ring', 'necklace'];

var SLOT_LABELS = {
  headpiece: 'Head', chestpiece: 'Chest', footwear: 'Feet',
  'left-hand': 'Left', 'right-hand': 'Right', ring: 'Ring', necklace: 'Neck',
};

// Both hand slots accept weapons and shields
var HAND_ITEM_SLOTS = ['weapon', 'shield'];

// The Shadow: body slots and accessory slots are interchangeable within each group
var SHADOW_BODY_SLOTS      = ['headpiece', 'chestpiece', 'footwear'];
var SHADOW_ACCESSORY_SLOTS = ['ring', 'necklace'];

var RARITY_ORDER  = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
var RARITY_COLORS = {
  common: '#c3aa94', uncommon: '#3a8832', rare: '#34A6E2',
  epic: '#6e40a3', legendary: '#cf6b16', mythic: '#d4af37',
};

var STAT_DEFS = [
  { key: 'Physical Damage',      pct: false },
  { key: 'Magic Damage',         pct: false },
  { key: 'Armor',                pct: false },
  { key: 'Max Health',           pct: false },
  { key: 'Critical Chance',      pct: true  },
  { key: 'Critical Damage',      pct: true  },
  { key: 'Dodge',                pct: true  },
  { key: 'Damage Amplification', pct: true  },
  { key: 'Lifesteal',            pct: true  },
  { key: 'Mana Burst',           pct: true  },
  { key: 'Swiftness',            pct: true  },
  { key: 'Regeneration',         pct: false },
  { key: 'Guard',                pct: true  },
  { key: 'Thorns',               pct: true  },
  { key: 'Counterattack',        pct: true  },
  { key: 'Enrage',               pct: true  },
  { key: 'Bludgeoning',          pct: true  },
  { key: 'Poisonous',            pct: true  },
  { key: 'Luck',                 pct: false },
];

var CHARACTER_BASE_HEALTH = {
  maximilian:   50,
  liz:          40,
  'the-shadow': 40,
};

// ── Item, set, and style data ─────────────────────────────────────────────────

var itemsData   = [];
var itemsLookup = {};
var setsData    = [];
var setsLookup  = {};

fetch('data/items.json')
  .then(function (r) { return r.json(); })
  .then(function (arr) {
    itemsData = arr;
    arr.forEach(function (item) { itemsLookup[item.slug] = item; });
    renderEquipSlots();
    renderStats();
    renderSetBonuses();
  });

fetch('data/sets.json')
  .then(function (r) { return r.json(); })
  .then(function (arr) {
    setsData = arr.filter(function (s) { return !s.is_mythic && s.levels && s.levels.length; });
    setsData.forEach(function (s) { setsLookup[s.slug] = s; });
    renderSetBonuses();
  });

var stylesData    = [];
var stylesLookup  = {};
var masteriesData   = [];
var masteriesLookup = {};
var statsDescLookup = {}; // stat name → description
var mastByCharLevel = {}; // key: "character_level" → [mastery, ...]

fetch('data/stats.json')
  .then(function (r) { return r.json(); })
  .then(function (arr) {
    arr.forEach(function (s) { statsDescLookup[s.name] = s.description; });
  });

fetch('data/styles.json')
  .then(function (r) { return r.json(); })
  .then(function (arr) {
    stylesData = arr;
    arr.forEach(function (s) { stylesLookup[s.slug] = s; });
    renderStyleSelectors();
    renderSetBonuses();
  });

fetch('data/masteries.json')
  .then(function (r) { return r.json(); })
  .then(function (arr) {
    masteriesData = arr;
    arr.forEach(function (m) {
      masteriesLookup[m.slug] = m;
      var key = m.character + '_' + m.skill_level;
      (mastByCharLevel[key] = mastByCharLevel[key] || []).push(m);
    });
    renderMasterySlots();
  });

// ── Stat computation ──────────────────────────────────────────────────────────

var DMG_STATS = { 'Physical Damage': true, 'Magic Damage': true };

function parseDmgRange(val) {
  if (typeof val === 'string' && val.indexOf(' - ') !== -1) {
    var parts = val.split(' - ');
    return [parseFloat(parts[0]) || 0, parseFloat(parts[1]) || 0];
  }
  var n = parseFloat(val) || 0;
  return [n, n];
}

function computeStats(build) {
  var totals  = { 'Max Health': CHARACTER_BASE_HEALTH[build.character] || 40 };
  var dmgMin  = { 'Physical Damage': 0, 'Magic Damage': 0 };
  var dmgMax  = { 'Physical Damage': 0, 'Magic Damage': 0 };

  SLOT_ORDER.forEach(function (slotType) {
    var equipped = build.slots[slotType];
    if (!equipped) return;
    var item = itemsLookup[equipped.slug];
    if (!item || !item.stats) return;
    var idx = (equipped.level || 2) - 1;

    Object.keys(item.stats).forEach(function (statName) {
      var val = item.stats[statName][idx];
      if (val === undefined || val === null) return;

      if (DMG_STATS[statName]) {
        var range = parseDmgRange(val);
        dmgMin[statName] += range[0];
        dmgMax[statName] += range[1];
        return;
      }

      var n = parseFloat(val) || 0;
      if (n !== 0) totals[statName] = (totals[statName] || 0) + n;
    });
  });

  // Sum mastery flat stat bonuses
  (build.masteries || []).forEach(function (mastSlug) {
    if (!mastSlug) return;
    var m = masteriesLookup[mastSlug];
    if (!m || !m.stats) return;
    Object.keys(m.stats).forEach(function (statName) {
      var val = m.stats[statName];
      if (!val) return;
      if (DMG_STATS[statName]) {
        dmgMin[statName] += val;
        dmgMax[statName] += val;
        return;
      }
      totals[statName] = (totals[statName] || 0) + val;
    });
  });

  // Format damage ranges back into display strings
  ['Physical Damage', 'Magic Damage'].forEach(function (k) {
    var mn = dmgMin[k], mx = dmgMax[k];
    if (mx > 0) totals[k] = mn === mx ? mn : mn + ' - ' + mx;
  });

  return totals;
}

function computeSetBonuses(build) {
  var equipped = {};
  var style    = {};

  SLOT_ORDER.forEach(function (slotType) {
    var eq = build.slots[slotType];
    if (!eq) return;
    var item = itemsLookup[eq.slug];
    if (!item || !item.set || item.set === 'mythic') return;
    equipped[item.set] = (equipped[item.set] || 0) + 1;
  });

  (build.styles || []).forEach(function (styleSlug) {
    if (!styleSlug) return;
    var s = stylesLookup[styleSlug];
    if (!s) return;
    s.sets.forEach(function (setSlug) {
      style[setSlug] = (style[setSlug] || 0) + 1;
    });
  });

  var all = {};
  Object.keys(equipped).forEach(function (k) { all[k] = true; });
  Object.keys(style).forEach(function (k)    { all[k] = true; });

  return Object.keys(all).sort().reduce(function (acc, slug) {
    var setDef = setsLookup[slug];
    if (!setDef) return acc;
    var eq = equipped[slug] || 0;
    var st = style[slug]    || 0;
    acc.push({ slug: slug, name: setDef.name, img: setDef.img,
               count: eq + st, equippedCount: eq, styleCount: st,
               tiers: setDef.levels });
    return acc;
  }, []);
}

// ── State ─────────────────────────────────────────────────────────────────────

function emptySlots() {
  var s = {};
  SLOT_ORDER.forEach(function (k) { s[k] = null; });
  return s;
}

function defaultBuild(id) {
  return { id: id, name: 'Build ' + (id + 1), character: 'maximilian', slots: emptySlots(), styles: [null, null], masteries: [null, null, null] };
}

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var p = JSON.parse(raw);
      if (p && Array.isArray(p.builds) && p.builds.length === MAX_BUILDS) {
        p.builds.forEach(function (b) {
          SLOT_ORDER.forEach(function (k) { if (!(k in b.slots)) b.slots[k] = null; });
          if (!b.styles)    b.styles    = [null, null];
          if (!b.masteries) b.masteries = [null, null, null];
        });
        return p;
      }
    }
  } catch (e) {}
  var builds = [];
  for (var i = 0; i < MAX_BUILDS; i++) builds.push(defaultBuild(i));
  return { activeBuild: 0, builds: builds };
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

var state = loadState();

function activeBuild() { return state.builds[state.activeBuild]; }

// ── Picker state ──────────────────────────────────────────────────────────────

var activeSlot        = null;
var activeMasterySlot = null;
var container         = document.getElementById('page-container');
var buildLayout       = document.getElementById('build-layout');
var itemPickerEl      = document.getElementById('item-picker');

// ── Mobile panel tabs (Equipment / Stats / Items) ───────────────────────────

var mobileTabBtns      = document.querySelectorAll('#mobile-panel-tabs .mobile-tab-btn');
var mobilePickerTabBtn = document.querySelector('#mobile-panel-tabs .mobile-tab-btn[data-view="picker"]');
var preOpenMobileView  = 'equip';

function setMobileView(view) {
  hideTooltip(); // don't let a tooltip from the previous panel linger over the new one
  buildLayout.setAttribute('data-mobile-view', view);
  mobileTabBtns.forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

mobileTabBtns.forEach(function (btn) {
  btn.addEventListener('click', function () { setMobileView(btn.dataset.view); });
});

function openPicker(slotType) {
  activeSlot        = slotType;
  activeMasterySlot = null;
  itemPickerEl.classList.remove('mastery-mode');
  container.classList.remove('container--wide');
  container.classList.add('container--builds');
  buildLayout.classList.add('picker-open');
  if (buildLayout.getAttribute('data-mobile-view') !== 'picker') {
    preOpenMobileView = buildLayout.getAttribute('data-mobile-view') || 'equip';
  }
  mobilePickerTabBtn.classList.remove('hidden');
  setMobileView('picker');
  renderEquipSlots();
  renderMasterySlots();
  renderPicker(slotType);
}

function openMasteryPicker(idx) {
  activeMasterySlot = idx;
  activeSlot        = null;
  itemPickerEl.classList.add('mastery-mode');
  container.classList.remove('container--wide');
  container.classList.add('container--builds');
  buildLayout.classList.add('picker-open');
  if (buildLayout.getAttribute('data-mobile-view') !== 'picker') {
    preOpenMobileView = buildLayout.getAttribute('data-mobile-view') || 'equip';
  }
  mobilePickerTabBtn.classList.remove('hidden');
  setMobileView('picker');
  renderEquipSlots();
  renderMasterySlots();
  renderMasteryPicker(idx);
}

function closePicker() {
  activeSlot        = null;
  activeMasterySlot = null;
  itemPickerEl.classList.remove('mastery-mode');
  container.classList.remove('container--builds');
  container.classList.add('container--wide');
  buildLayout.classList.remove('picker-open');
  mobilePickerTabBtn.classList.add('hidden');
  setMobileView(preOpenMobileView);
  renderEquipSlots();
  renderMasterySlots();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function trunc(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }

// ── Render: tabs ──────────────────────────────────────────────────────────────

function renderTabs() {
  var el = document.getElementById('build-tabs');
  if (!el) return;
  el.innerHTML = state.builds.map(function (b) {
    var active = b.id === state.activeBuild;
    return '<div class="build-tab' + (active ? ' active' : '') + '" data-id="' + b.id + '">' +
      '<span class="tab-name">' + esc(b.name) + '</span>' +
    '</div>';
  }).join('');
}

// ── Render: character selector ────────────────────────────────────────────────

function renderCharSelector() {
  var char = activeBuild().character;
  document.querySelectorAll('.char-btn').forEach(function (btn) {
    btn.classList.toggle('selected', btn.dataset.char === char);
  });
}

// ── Render: equipment slots ───────────────────────────────────────────────────

function renderGlobalLevelBtns() {
  var slots = activeBuild().slots;
  var levels = SLOT_ORDER.map(function (s) { return slots[s]; })
    .filter(function (eq) { return eq && eq.slug; })
    .map(function (eq) { return eq.level || 2; });
  var unified = levels.length > 0 && levels.every(function (l) { return l === levels[0]; }) ? levels[0] : null;
  document.querySelectorAll('.global-level-btn').forEach(function (btn) {
    btn.classList.toggle('active', parseInt(btn.dataset.level, 10) === unified);
  });
}

function renderEquipSlots() {
  var build = activeBuild();
  document.querySelectorAll('.equip-slot').forEach(function (slotEl) {
    var slotType = slotEl.dataset.slot;
    var equipped = build.slots[slotType];
    slotEl.classList.toggle('active-slot', slotType === activeSlot);

    if (!equipped || !itemsLookup[equipped.slug]) {
      slotEl.classList.remove('equipped');
      slotEl.innerHTML = '<span class="slot-lbl">' + (SLOT_LABELS[slotType] || cap(slotType)) + '</span>';
      return;
    }

    var item  = itemsLookup[equipped.slug];
    var color = RARITY_COLORS[item.rarity] || '#fff';
    var lvl   = equipped.level || 2;
    slotEl.classList.add('equipped');
    slotEl.innerHTML =
      '<div class="slot-content">' +
        '<img class="sprite slot-item-img" src="' + item.img + '" alt="' + esc(item.name) + '">' +
        '<span class="slot-item-name" style="color:' + color + '">' + esc(trunc(item.name, 14)) + '</span>' +
        '<div class="slot-levels">' +
          [1, 2, 3].map(function (l) {
            return '<button class="slot-level-btn' + (l === lvl ? ' active' : '') +
              '" data-level="' + l + '">' + l + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<button class="slot-unequip" data-slot="' + slotType + '" title="Remove">×</button>';
  });
  renderGlobalLevelBtns();
}

// ── Render: item picker ───────────────────────────────────────────────────────

function handSlot(slotType) {
  return slotType === 'left-hand' || slotType === 'right-hand';
}

function matchesSlot(item, slotType, character) {
  if (handSlot(slotType)) return HAND_ITEM_SLOTS.indexOf(item.slot) !== -1;
  if (character === 'the-shadow') {
    if (SHADOW_BODY_SLOTS.indexOf(slotType) !== -1)      return SHADOW_BODY_SLOTS.indexOf(item.slot) !== -1;
    if (SHADOW_ACCESSORY_SLOTS.indexOf(slotType) !== -1) return SHADOW_ACCESSORY_SLOTS.indexOf(item.slot) !== -1;
  }
  return item.slot === slotType;
}

function renderPicker(slotType) {
  document.getElementById('picker-slot-name').textContent = SLOT_LABELS[slotType] || cap(slotType);

  var character = activeBuild().character;
  var slotItems = itemsData.filter(function (i) { return matchesSlot(i, slotType, character); });

  // Build set filter options from items in this slot
  var setFilter = document.getElementById('picker-set-filter');
  var prevSet   = setFilter.value;
  var setsSeen  = {};
  slotItems.forEach(function (i) { setsSeen[i.set] = true; });
  var setNames = Object.keys(setsSeen).sort();

  setFilter.innerHTML = '<option value="">All Sets</option>' +
    setNames.map(function (s) {
      return '<option value="' + esc(s) + '">' + esc(cap(s)) + '</option>';
    }).join('');

  if (setsSeen[prevSet]) setFilter.value = prevSet;

  renderPickerItems(slotType, setFilter.value);
}

function renderPickerItems(slotType, setVal) {
  var equipped     = activeBuild().slots[slotType];
  var equippedSlug = equipped ? equipped.slug : null;

  var character = activeBuild().character;
  var filtered = itemsData.filter(function (i) {
    return matchesSlot(i, slotType, character) && (!setVal || i.set === setVal);
  });

  // Group by rarity
  var groups = {};
  RARITY_ORDER.forEach(function (r) { groups[r] = []; });
  filtered.forEach(function (i) {
    if (groups[i.rarity]) groups[i.rarity].push(i);
  });

  var html = '';
  RARITY_ORDER.forEach(function (rarity) {
    var items = groups[rarity];
    if (!items.length) return;
    var color = RARITY_COLORS[rarity] || '#fff';
    html += '<div class="picker-rarity-header" style="color:' + color + '">' + cap(rarity) + '</div>';
    items.forEach(function (item) {
      var sel     = item.slug === equippedSlug ? ' selected' : '';
      var setLabel = item.set === 'mythic' ? 'Mythic' : cap(item.set);
      html +=
        '<div class="picker-item' + sel + '" data-slug="' + esc(item.slug) + '">' +
          '<img class="sprite" src="' + item.img + '" alt="' + esc(item.name) + '">' +
          '<div>' +
            '<div class="picker-item-name" style="color:' + color + '">' + esc(item.name) + '</div>' +
            '<div class="picker-item-set">' + esc(setLabel) + '</div>' +
          '</div>' +
        '</div>';
    });
  });

  document.getElementById('picker-items').innerHTML =
    html || '<div class="picker-empty">No items found.</div>';
}

// ── Render: stats panel ───────────────────────────────────────────────────────

function renderStats() {
  var list = document.getElementById('stats-list');
  if (!list) return;
  var totals = computeStats(activeBuild());

  // Update health bar
  var maxHp  = totals['Max Health'] || 0;
  var fillEl = document.getElementById('health-fill');
  var textEl = document.getElementById('health-text');
  if (fillEl) fillEl.style.width = '100%';
  if (textEl) textEl.textContent = maxHp + ' / ' + maxHp;

  // Update armor display next to health bar
  var armorEl = document.getElementById('armor-val');
  if (armorEl) armorEl.textContent = totals['Armor'] || 0;

  list.innerHTML = STAT_DEFS.map(function (s) {
    var raw = totals[s.key];
    var lit = raw !== undefined && raw !== 0 && raw !== '0';
    var display = lit
      ? (s.pct ? raw + '%' : raw)
      : ('0' + (s.pct ? '%' : ''));
    return '<div class="stat-row" data-stat-key="' + s.key + '">' +
      '<span class="stat-name">' + s.key + '</span>' +
      '<span class="stat-val' + (lit ? ' lit' : '') + '">' + display + '</span>' +
    '</div>';
  }).join('');
}

function renderSetBonuses() {
  var el = document.getElementById('set-bonuses');
  if (!el || !setsData.length) return;
  var bonuses = computeSetBonuses(activeBuild());
  if (!bonuses.length) {
    el.innerHTML = '<div class="set-bonus-empty">No sets equipped</div>';
    return;
  }
  el.innerHTML = bonuses.map(function (s) {
    var tierHtml = s.tiers.map(function (tier) {
      var active = s.count >= tier.count;
      var more   = tier.count - s.count;
      return '<div class="set-tier' + (active ? ' active' : '') + '">' +
        '<span class="set-tier-pc">' + tier.count + 'pc</span>' +
        '<span class="set-tier-bonus">' + esc(tier.bonus) + '</span>' +
        (!active ? '<span class="set-tier-need">+' + more + '</span>' : '') +
      '</div>';
    }).join('');
    return '<div class="set-bonus-row">' +
      '<div class="set-bonus-hdr">' +
        '<img class="sprite set-bonus-icon" src="' + esc(s.img) + '" alt="">' +
        '<span class="set-bonus-name">' + esc(s.name) + '</span>' +
        '<span class="set-bonus-count">' +
          (s.styleCount > 0 ? s.equippedCount + '+' + s.styleCount + '★' : s.count) +
        '</span>' +
      '</div>' +
      tierHtml +
    '</div>';
  }).join('');
}

function renderStyleSelectors() {
  var build = activeBuild();
  [0, 1].forEach(function (i) {
    var sel = document.getElementById('style-select-' + i);
    if (!sel || !stylesData.length) return;
    var current = (build.styles || [])[i] || '';
    sel.innerHTML = '<option value="">— Not completed —</option>' +
      stylesData.map(function (s) {
        return '<option value="' + esc(s.slug) + '"' + (s.slug === current ? ' selected' : '') + '>' +
          esc(s.name) + ' (' + s.sets.map(cap).join(' + ') + ')' +
        '</option>';
      }).join('');
  });
}

var MASTERY_LABELS = ['I', 'II', 'III'];

function renderMasterySlots() {
  var build = activeBuild();
  document.querySelectorAll('.mastery-slot').forEach(function (el) {
    var idx      = parseInt(el.dataset.masteryIdx, 10);
    var slug     = (build.masteries || [])[idx] || null;
    var mastery  = slug ? masteriesLookup[slug] : null;
    var isActive = activeMasterySlot === idx;

    el.classList.toggle('active-slot', isActive);
    el.classList.toggle('filled', !!mastery);

    if (mastery) {
      el.innerHTML =
        '<img class="sprite mastery-icon" src="' + mastery.img + '" alt="' + esc(mastery.name) + '">' +
        '<button class="mastery-unequip" data-mastery-idx="' + idx + '" title="Remove">×</button>';
    } else {
      el.innerHTML = '<span class="mastery-lbl">' + (MASTERY_LABELS[idx] || (idx + 1)) + '</span>';
    }
  });
}

function renderMasteryPicker(idx) {
  var build    = activeBuild();
  var char     = build.character;
  var level    = idx + 1;
  var key      = char + '_' + level;
  var list     = mastByCharLevel[key] || [];
  var selected = (build.masteries || [])[idx] || null;

  document.getElementById('picker-slot-name').textContent = 'Mastery ' + (MASTERY_LABELS[idx] || (idx + 1));

  document.getElementById('picker-items').innerHTML =
    '<div class="mastery-picker-grid">' +
    list.map(function (m) {
      return '<div class="mastery-picker-item' + (m.slug === selected ? ' selected' : '') +
        '" data-mastery-slug="' + esc(m.slug) + '">' +
        '<img src="' + esc(m.img) + '" alt="' + esc(m.name) + '">' +
        '<span class="mastery-picker-name">' + esc(m.name) + '</span>' +
      '</div>';
    }).join('') +
    '</div>';
}

function renderAll() {
  renderTabs();
  renderCharSelector();
  renderMasterySlots();
  renderStyleSelectors();
  renderEquipSlots();
  renderStats();
  renderSetBonuses();
}

// ── Style selector events ─────────────────────────────────────────────────────

[0, 1].forEach(function (i) {
  var sel = document.getElementById('style-select-' + i);
  if (!sel) return;
  sel.addEventListener('change', function () {
    var b = activeBuild();
    if (!b.styles) b.styles = [null, null];
    b.styles[i] = this.value || null;
    saveState();
    renderSetBonuses();
  });
});

// ── Tab interactions ──────────────────────────────────────────────────────────

var isRenaming = false;

document.getElementById('build-tabs').addEventListener('click', function (e) {
  if (isRenaming) return;
  var tab = e.target.closest('.build-tab');
  if (!tab) return;
  var id = parseInt(tab.dataset.id, 10);

  if (id === state.activeBuild && e.target.classList.contains('tab-name')) {
    startRename(tab, id);
    return;
  }

  if (id !== state.activeBuild) {
    closePicker();
    state.activeBuild = id;
    saveState();
    renderAll();
  }
});

function startRename(tab, id) {
  var nameEl = tab.querySelector('.tab-name');
  if (!nameEl) return;
  isRenaming = true;

  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'tab-name-input';
  input.value = state.builds[id].name;
  input.maxLength = 30;
  tab.replaceChild(input, nameEl);
  input.focus();
  input.select();

  function commit() {
    var v = input.value.trim();
    state.builds[id].name = v || ('Build ' + (id + 1));
    isRenaming = false;
    saveState();
    renderTabs();
  }

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter')  input.blur();
    if (e.key === 'Escape') { input.value = state.builds[id].name; input.blur(); }
  });
}

// ── Character selection ───────────────────────────────────────────────────────

document.querySelectorAll('.char-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var b = activeBuild();
    if (b.character !== btn.dataset.char) {
      b.character = btn.dataset.char;
      b.masteries = [null, null, null]; // masteries are character-specific
      if (activeMasterySlot !== null) closePicker();
    }
    saveState();
    renderCharSelector();
    renderMasterySlots();
    renderStats();
  });
});

// ── Global level buttons ──────────────────────────────────────────────────────

document.getElementById('global-level-row').addEventListener('click', function (e) {
  var btn = e.target.closest('.global-level-btn');
  if (!btn) return;
  var level = parseInt(btn.dataset.level, 10);
  var slots = activeBuild().slots;
  var changed = false;
  SLOT_ORDER.forEach(function (slotType) {
    if (slots[slotType] && slots[slotType].slug) {
      slots[slotType].level = level;
      changed = true;
    }
  });
  if (!changed) return;
  saveState();
  renderEquipSlots();
  renderStats();
  renderSetBonuses();
});

// ── Mastery slot clicks ───────────────────────────────────────────────────────

document.getElementById('mastery-slots').addEventListener('click', function (e) {
  // Unequip button
  var unequipBtn = e.target.closest('.mastery-unequip');
  if (unequipBtn) {
    e.stopPropagation();
    var idx = parseInt(unequipBtn.dataset.masteryIdx, 10);
    activeBuild().masteries[idx] = null;
    saveState();
    renderMasterySlots();
    renderStats();
    if (activeMasterySlot === idx) renderMasteryPicker(idx);
    return;
  }

  // Slot click → open/toggle picker
  var slotEl = e.target.closest('.mastery-slot');
  if (!slotEl) return;
  var idx = parseInt(slotEl.dataset.masteryIdx, 10);
  if (activeMasterySlot === idx) {
    closePicker();
  } else {
    openMasteryPicker(idx);
  }
});

// ── Mastery picker item click ─────────────────────────────────────────────────

document.getElementById('picker-items').addEventListener('click', function (e) {
  if (activeMasterySlot === null) return; // handled by item picker handler below
  var itemEl = e.target.closest('.mastery-picker-item');
  if (!itemEl) return;
  var slug = itemEl.dataset.masterySlug;
  if (!slug) return;
  var b = activeBuild();
  if (!b.masteries) b.masteries = [null, null, null];
  b.masteries[activeMasterySlot] = slug;
  saveState();
  renderMasterySlots();
  renderStats();
  renderMasteryPicker(activeMasterySlot);
});

// ── Equipment slot clicks ─────────────────────────────────────────────────────

document.querySelector('.equip-grid').addEventListener('click', function (e) {
  // Level toggle button
  var levelBtn = e.target.closest('.slot-level-btn');
  if (levelBtn) {
    e.stopPropagation();
    var slotEl   = levelBtn.closest('.equip-slot');
    var slotType = slotEl.dataset.slot;
    var level    = parseInt(levelBtn.dataset.level, 10);
    var equipped = activeBuild().slots[slotType];
    if (equipped && equipped.level !== level) {
      equipped.level = level;
      saveState();
      renderEquipSlots();
      renderStats();
      renderSetBonuses();
    }
    return;
  }

  // Unequip × button
  var unequipBtn = e.target.closest('.slot-unequip');
  if (unequipBtn) {
    e.stopPropagation();
    var slotType = unequipBtn.dataset.slot;
    activeBuild().slots[slotType] = null;
    saveState();
    renderEquipSlots();
    renderStats();
    renderSetBonuses();
    if (activeSlot === slotType) renderPickerItems(slotType, document.getElementById('picker-set-filter').value);
    return;
  }

  // Slot click → open/toggle picker
  var slotEl = e.target.closest('.equip-slot');
  if (!slotEl) return;
  var slotType = slotEl.dataset.slot;

  if (activeSlot === slotType) {
    closePicker();
  } else {
    openPicker(slotType);
  }
});

// ── Picker item click ─────────────────────────────────────────────────────────

document.getElementById('picker-items').addEventListener('click', function (e) {
  if (activeMasterySlot !== null) return; // mastery handler above takes it
  var itemEl = e.target.closest('.picker-item');
  if (!itemEl || !activeSlot) return;
  var slug = itemEl.dataset.slug;
  activeBuild().slots[activeSlot] = { slug: slug, level: 2 };
  saveState();
  renderEquipSlots();
  renderStats();
  renderSetBonuses();
  renderPickerItems(activeSlot, document.getElementById('picker-set-filter').value);
});

// ── Picker set filter ─────────────────────────────────────────────────────────

document.getElementById('picker-set-filter').addEventListener('change', function () {
  if (activeSlot) renderPickerItems(activeSlot, this.value);
});

// ── Picker close ──────────────────────────────────────────────────────────────

document.getElementById('picker-close').addEventListener('click', closePicker);

// ── Encoding (Phase 5) ───────────────────────────────────────────────────────

var B62        = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
var CHAR_KEYS  = ['maximilian', 'liz', 'the-shadow'];
var ENC_BYTES  = 15; // 120 bits; 114 used (2 char + 7×11 slots + 2×7 styles + 3×7 masteries)

function sortedItems() {
  return itemsData.slice().sort(function (a, b) {
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
}

function sortedStyles() {
  return stylesData.slice().sort(function (a, b) {
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
}

function packBits(build) {
  var list = sortedItems();
  var slugToIdx = {};
  list.forEach(function (item, i) { slugToIdx[item.slug] = i + 1; }); // 1-based; 0 = empty

  var bits = [];
  function push(val, n) {
    for (var i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
  }

  var styleList   = sortedStyles();
  var styleToIdx  = {};
  styleList.forEach(function (s, i) { styleToIdx[s.slug] = i + 1; });

  push(Math.max(0, CHAR_KEYS.indexOf(build.character)), 2);
  SLOT_ORDER.forEach(function (slotType) {
    var eq = build.slots[slotType];
    if (eq && slugToIdx[eq.slug]) {
      push(slugToIdx[eq.slug], 9);
      push(eq.level || 2, 2);
    } else {
      push(0, 9);
      push(0, 2);
    }
  });
  (build.styles || [null, null]).forEach(function (styleSlug) {
    push(styleSlug && styleToIdx[styleSlug] ? styleToIdx[styleSlug] : 0, 7);
  });

  var mastList   = masteriesData.slice().sort(function (a, b) { return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0; });
  var mastToIdx  = {};
  mastList.forEach(function (m, i) { mastToIdx[m.slug] = i + 1; });
  (build.masteries || [null, null, null]).forEach(function (mastSlug) {
    push(mastSlug && mastToIdx[mastSlug] ? mastToIdx[mastSlug] : 0, 7);
  });

  while (bits.length < ENC_BYTES * 8) bits.push(0); // pad to 120 bits

  var bytes = [];
  for (var i = 0; i < ENC_BYTES; i++) {
    var b = 0;
    for (var j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
    bytes.push(b);
  }
  return bytes;
}

function unpackBits(bytes) {
  var bits = [];
  bytes.forEach(function (b) {
    for (var i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  });
  var pos = 0;
  function read(n) {
    var v = 0;
    for (var i = 0; i < n; i++) v = (v << 1) | (bits[pos++] || 0);
    return v;
  }

  var list = sortedItems();
  var character = CHAR_KEYS[read(2)] || 'maximilian';
  var slots = emptySlots();
  SLOT_ORDER.forEach(function (slotType) {
    var idx = read(9), lvl = read(2);
    if (idx > 0 && lvl > 0 && list[idx - 1]) {
      slots[slotType] = { slug: list[idx - 1].slug, level: lvl };
    }
  });
  var sList  = sortedStyles();
  var styles = [null, null];
  [0, 1].forEach(function (i) {
    var idx = read(7);
    styles[i] = idx > 0 && sList[idx - 1] ? sList[idx - 1].slug : null;
  });

  var mList    = masteriesData.slice().sort(function (a, b) { return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0; });
  var masteries = [null, null, null];
  [0, 1, 2].forEach(function (i) {
    var idx = read(7);
    masteries[i] = idx > 0 && mList[idx - 1] ? mList[idx - 1].slug : null;
  });

  return { character: character, slots: slots, styles: styles, masteries: masteries };
}

function b62Encode(bytes) {
  var digits = bytes.slice();
  var result = '';
  while (!digits.every(function (b) { return b === 0; })) {
    var rem = 0, next = [];
    digits.forEach(function (b) {
      var v = rem * 256 + b;
      next.push(Math.floor(v / 62));
      rem = v % 62;
    });
    result = B62[rem] + result;
    while (next.length > 1 && next[0] === 0) next.shift();
    digits = next;
  }
  return result || '0';
}

function b62Decode(str) {
  var map = {};
  for (var i = 0; i < B62.length; i++) map[B62[i]] = i;
  var digits = [0];
  for (var i = 0; i < str.length; i++) {
    var c = map[str[i]];
    if (c === undefined) return null;
    var carry = c;
    for (var j = digits.length - 1; j >= 0; j--) {
      var v = digits[j] * 62 + carry;
      digits[j] = v % 256;
      carry = Math.floor(v / 256);
    }
    while (carry > 0) {
      digits.unshift(carry % 256);
      carry = Math.floor(carry / 256);
    }
  }
  while (digits.length < ENC_BYTES) digits.unshift(0);
  return digits.slice(-ENC_BYTES);
}

function encodeBuild(build) {
  return b62Encode(packBits(build));
}

function decodeBuild(str) {
  var bytes = b62Decode(str.trim());
  if (!bytes) return null;
  try { return unpackBits(bytes); } catch (e) { return null; }
}

// ── Reset ─────────────────────────────────────────────────────────────────────

document.getElementById('btn-reset').addEventListener('click', function () {
  var b = activeBuild();
  SLOT_ORDER.forEach(function (slot) { b.slots[slot] = null; });
  b.masteries = [null, null, null];
  b.styles    = [null, null];
  if (activeMasterySlot !== null) closePicker();
  saveState();
  renderAll();
});

// ── Export / Import ───────────────────────────────────────────────────────────

document.getElementById('btn-export').addEventListener('click', function () {
  var code = encodeBuild(activeBuild());
  var btn = this;
  function flash() {
    btn.textContent = 'Copied!';
    setTimeout(function () { btn.textContent = 'Export'; }, 2000);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(flash);
  } else {
    var ta = document.createElement('textarea');
    ta.value = code;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    flash();
  }
});

document.getElementById('btn-import').addEventListener('click', function () {
  var btn    = this;
  var parent = btn.parentNode;

  var input = document.createElement('input');
  input.type      = 'text';
  input.className = 'import-input';
  input.placeholder = 'Paste code + Enter';
  input.maxLength = 30;
  parent.replaceChild(input, btn);
  input.focus();

  var committed = false;

  function cancel() {
    if (!parent.contains(btn)) parent.replaceChild(btn, input);
  }

  function apply() {
    committed = true;
    var decoded = decodeBuild(input.value);
    if (!decoded) {
      committed = false;
      input.classList.add('import-error');
      setTimeout(function () { input.classList.remove('import-error'); }, 500);
      return;
    }
    var b = activeBuild();
    b.character = decoded.character;
    b.slots     = decoded.slots;
    b.styles    = decoded.styles    || [null, null];
    b.masteries = decoded.masteries || [null, null, null];
    saveState();
    cancel();
    renderAll();
  }

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter')  { e.preventDefault(); apply(); }
    if (e.key === 'Escape') { committed = true; cancel(); }
  });
  input.addEventListener('blur', function () {
    setTimeout(function () { if (!committed) cancel(); }, 150);
  });
});

// ── Item tooltip ──────────────────────────────────────────────────────────────

var buildTooltip = document.getElementById('build-tooltip');
var bttImg       = document.getElementById('btt-img');
var bttSetIcon   = document.getElementById('btt-set-icon');
var bttName      = document.getElementById('btt-name');
var bttSlot      = document.getElementById('btt-slot');
var bttStats     = document.getElementById('btt-stats');
var bttDesc      = document.getElementById('btt-desc');
var bttRarity    = document.getElementById('btt-rarity');
var bttSet       = document.getElementById('btt-set');

function positionTooltip(x, y) {
  var pad = 14, tw = buildTooltip.offsetWidth || 240, th = buildTooltip.offsetHeight || 120;
  var left = x + pad, top = y + pad;
  if (left + tw > window.innerWidth)  left = x - tw - pad;
  if (top  + th > window.innerHeight) top  = y - th - pad;
  buildTooltip.style.left = left + 'px';
  buildTooltip.style.top  = top  + 'px';
}

function showItemTooltip(item, level, x, y) {
  bttImg.style.display = 'none';
  var color = RARITY_COLORS[item.rarity] || '#fff';
  if (item.set && item.set !== 'mythic') {
    bttSetIcon.src = 'assets/sets/' + item.set + '.png';
    bttSetIcon.style.display = '';
  } else {
    bttSetIcon.style.display = 'none';
  }
  bttName.textContent     = item.name;
  bttName.style.color     = color;
  bttSlot.textContent     = cap(item.slot) + (level ? '  (Level ' + level + ')' : '');
  bttRarity.textContent   = cap(item.rarity);
  bttRarity.style.color   = color;
  bttSet.textContent      = item.set && item.set !== 'mythic' ? cap(item.set) + ' set' : (item.set === 'mythic' ? 'Mythic' : '');

  var statRows = '';
  Object.keys(item.stats || {}).forEach(function (statName) {
    var vals = item.stats[statName];
    var allZero = vals.every(function (v) { return v === 0 || v === '0 - 0'; });
    if (allZero) return;
    var pct = STAT_DEFS.some(function (d) { return d.key === statName && d.pct; });
    var progression = vals.map(function (v, i) {
      var suffix = pct ? '%' : '';
      return (i + 1) === level
        ? '<strong>' + v + suffix + '</strong>'
        : v + suffix;
    }).join(' → ');
    statRows += '<div class="tt-stat"><span>' + statName + '</span><span class="tt-stat-val">' + progression + '</span></div>';
  });
  bttStats.innerHTML = statRows;

  if (item.description) {
    bttDesc.innerHTML      = item.description.replace(/\n/g, '<br>');
    bttDesc.style.display  = 'block';
  } else {
    bttDesc.style.display  = 'none';
  }

  buildTooltip.style.display = 'block';
  positionTooltip(x, y);
}

function hideTooltip() { buildTooltip.style.display = 'none'; }

// Touch has no real "hover" — a tap fires a synthetic mouseover with no
// matching mouseout, so a tooltip shown by one tap would otherwise linger
// until something happened to hide it. Clear it at the start of every new
// touch; if that tap lands on a hoverable target, the touch->mouse event
// sequence re-shows a fresh tooltip right after (mouseover fires after
// touchstart), so this only ever kills a stale one.
document.addEventListener('touchstart', hideTooltip, true);

function showMasteryTooltip(mastery, x, y) {
  bttSetIcon.style.display = 'none';
  bttImg.src           = mastery.img || '';
  bttImg.style.display = mastery.img ? '' : 'none';
  bttName.textContent   = mastery.name;
  bttName.style.color   = '#e0ddd8';
  bttSlot.textContent   = 'Mastery ' + (MASTERY_LABELS[mastery.skill_level - 1] || mastery.skill_level);
  bttRarity.textContent = '';
  bttSet.textContent    = '';
  bttStats.innerHTML    = '';
  bttDesc.innerHTML     = mastery.description;
  bttDesc.style.display = 'block';
  buildTooltip.style.display = 'block';
  positionTooltip(x, y);
}

function showStatTooltip(key, x, y) {
  var desc = statsDescLookup[key];
  if (!desc) return;
  bttImg.style.display     = 'none';
  bttSetIcon.style.display = 'none';
  bttName.textContent      = key;
  bttName.style.color      = '#e0ddd8';
  bttSlot.textContent      = '';
  bttRarity.textContent    = '';
  bttSet.textContent       = '';
  bttStats.innerHTML       = '';
  bttDesc.innerHTML        = desc;
  bttDesc.style.display    = 'block';
  buildTooltip.style.display = 'block';
  positionTooltip(x, y);
}

// Hover on stats list
document.getElementById('stats-list').addEventListener('mouseover', function (e) {
  var row = e.target.closest('.stat-row[data-stat-key]');
  if (!row) { hideTooltip(); return; }
  showStatTooltip(row.dataset.statKey, e.clientX, e.clientY);
});
document.getElementById('stats-list').addEventListener('mousemove', function (e) {
  if (buildTooltip.style.display === 'block') positionTooltip(e.clientX, e.clientY);
});
document.getElementById('stats-list').addEventListener('mouseout', function (e) {
  var to = e.relatedTarget;
  if (!to || !to.closest('#stats-list')) hideTooltip();
});

// Hover on mastery slots
document.getElementById('mastery-slots').addEventListener('mouseover', function (e) {
  var slotEl = e.target.closest('.mastery-slot.filled');
  if (!slotEl) { hideTooltip(); return; }
  var idx    = parseInt(slotEl.dataset.masteryIdx, 10);
  var slug   = (activeBuild().masteries || [])[idx];
  var m      = slug ? masteriesLookup[slug] : null;
  if (m) showMasteryTooltip(m, e.clientX, e.clientY);
  else hideTooltip();
});
document.getElementById('mastery-slots').addEventListener('mousemove', function (e) {
  if (buildTooltip.style.display === 'block') positionTooltip(e.clientX, e.clientY);
});
document.getElementById('mastery-slots').addEventListener('mouseout', function (e) {
  var to = e.relatedTarget;
  if (!to || !to.closest('.mastery-slot.filled')) hideTooltip();
});

// Hover on mastery picker items
document.getElementById('picker-items').addEventListener('mouseover', function (e) {
  if (activeMasterySlot === null) return;
  var itemEl = e.target.closest('.mastery-picker-item');
  if (!itemEl) { hideTooltip(); return; }
  var m = masteriesLookup[itemEl.dataset.masterySlug];
  if (m) showMasteryTooltip(m, e.clientX, e.clientY);
});
document.getElementById('picker-items').addEventListener('mousemove', function (e) {
  if (activeMasterySlot !== null && buildTooltip.style.display === 'block') positionTooltip(e.clientX, e.clientY);
});
document.getElementById('picker-items').addEventListener('mouseout', function (e) {
  if (activeMasterySlot !== null) {
    var to = e.relatedTarget;
    if (!to || !to.closest('.mastery-picker-item')) hideTooltip();
  }
});

// Hover on equipped slots
document.querySelector('.equip-grid').addEventListener('mouseover', function (e) {
  var slotEl = e.target.closest('.equip-slot.equipped');
  if (!slotEl) { hideTooltip(); return; }
  var slotType = slotEl.dataset.slot;
  var equipped = activeBuild().slots[slotType];
  if (!equipped) { hideTooltip(); return; }
  var item = itemsLookup[equipped.slug];
  if (!item) { hideTooltip(); return; }
  showItemTooltip(item, equipped.level || 2, e.clientX, e.clientY);
});
document.querySelector('.equip-grid').addEventListener('mousemove', function (e) {
  if (buildTooltip.style.display === 'block') positionTooltip(e.clientX, e.clientY);
});
document.querySelector('.equip-grid').addEventListener('mouseout', function (e) {
  var to = e.relatedTarget;
  if (!to || !to.closest('.equip-slot.equipped')) hideTooltip();
});

// Hover on picker items (item mode only)
document.getElementById('picker-items').addEventListener('mouseover', function (e) {
  if (activeMasterySlot !== null) return;
  var itemEl = e.target.closest('.picker-item');
  if (!itemEl) { hideTooltip(); return; }
  var item = itemsLookup[itemEl.dataset.slug];
  if (!item) { hideTooltip(); return; }
  var equipped = activeBuild().slots[activeSlot];
  var level = (equipped && equipped.slug === item.slug && equipped.level) || 2;
  showItemTooltip(item, level, e.clientX, e.clientY);
});
document.getElementById('picker-items').addEventListener('mousemove', function (e) {
  if (buildTooltip.style.display === 'block') positionTooltip(e.clientX, e.clientY);
});
document.getElementById('picker-items').addEventListener('mouseout', function (e) {
  if (activeMasterySlot !== null) return;
  var to = e.relatedTarget;
  if (!to || !to.closest('.picker-item')) hideTooltip();
});

// ── Boot ──────────────────────────────────────────────────────────────────────

renderAll();

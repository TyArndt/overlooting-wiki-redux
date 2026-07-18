/* Items page: listing (with filters + tooltip) and detail view via hash routing */

const RARITY_COLORS = {
  common:    '#c3aa94',
  uncommon:  '#3a8832',
  rare:      '#34A6E2',
  epic:      '#6e40a3',
  legendary: '#cf6b16',
  mythic:    '#d4af37',
};

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };

const SLOT_ORDER = ['headpiece', 'chestpiece', 'footwear', 'weapon', 'shield', 'ring', 'necklace'];

const PCT_STATS = new Set([
  'Critical Chance', 'Critical Damage', 'Dodge', 'Lifesteal',
  'Counterattack', 'Enrage', 'Thorns', 'Guard', 'Damage Amplification',
  'Mana Burst', 'Swiftness', 'Poisonous', 'Bludgeoning',
]);

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

var stylesLookup = {}; // slug → { name, sets }


// ── Listing view ──────────────────────────────────────────────────────────────

function makeCard(item) {
  const color   = RARITY_COLORS[item.rarity] || '#fff';
  const setIcon = 'assets/sets/' + item.set + '.png';
  const href    = '#' + item.slug;
  return (
    '<div class="item-card" style="border: 2px solid ' + color + ';" data-slug="' + item.slug + '">' +
      '<a href="' + href + '">' +
        '<img class="sprite item-sprite" src="' + item.img + '" alt="' + item.name + '" />' +
        '<span class="item-name" style="color:' + color + ';">' + item.name + '</span>' +
      '</a>' +
      '<span class="item-rarity" style="color:' + color + ';opacity:0.85;">' + cap(item.rarity) + '</span>' +
      '<span class="item-slot">' + cap(item.slot) + '</span>' +
      '<span class="item-set">' +
        (item.set !== 'mythic' ? '<img class="sprite" src="' + setIcon + '" alt="' + item.set + '" />' : '') +
        cap(item.set) +
      '</span>' +
    '</div>'
  );
}

function renderListing(data) {
  fetch('data/styles.json')
    .then(function (r) { return r.json(); })
    .then(function (styles) {
      var sel = document.getElementById('style-filter');
      if (!sel) return;
      styles.forEach(function (s) {
        stylesLookup[s.slug] = s;
        var opt = document.createElement('option');
        opt.value = s.slug;
        opt.textContent = s.name + ' (' + s.sets.map(cap).join(' + ') + ')';
        sel.appendChild(opt);
      });
    });
  applyFilters(data);
  setupFilters(data);
}

function setupFilters(data) {
  ['slot-filter', 'rarity-filter', 'set-filter', 'style-filter'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', function () { applyFilters(data); });
  });
}

function applyFilters(data) {
  function sel(id) {
    return Array.from(document.getElementById(id).selectedOptions).map(function (o) { return o.value; });
  }
  const slotVals   = sel('slot-filter');
  const rarityVals = sel('rarity-filter');
  const setVals    = sel('set-filter');
  const grid       = document.getElementById('item-grid');
  const noResults  = document.getElementById('no-results');

  const slotActive   = slotVals.filter(function (v) { return v !== ''; });
  const rarityActive = rarityVals.filter(function (v) { return v !== ''; });
  const setActive    = setVals.filter(function (v) { return v !== ''; });

  const styleEl      = document.getElementById('style-filter');
  const styleSlug    = styleEl ? styleEl.value : '';
  const styleSets    = (styleSlug && stylesLookup[styleSlug])
    ? stylesLookup[styleSlug].sets
    : [];

  const filtered = data.filter(function (item) {
    return (!slotActive.length   || slotActive.includes(item.slot))   &&
           (!rarityActive.length || rarityActive.includes(item.rarity)) &&
           (!setActive.length    || setActive.includes(item.set))      &&
           (!styleSets.length    || styleSets.includes(item.set));
  }).sort(function (a, b) {
    return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
  });

  const bySlot = {};
  SLOT_ORDER.forEach(function (s) { bySlot[s] = []; });
  filtered.forEach(function (item) {
    if (bySlot[item.slot]) bySlot[item.slot].push(item);
  });
  grid.innerHTML = SLOT_ORDER.map(function (slot) {
    const items = bySlot[slot];
    if (!items.length) return '';
    return (
      '<div class="slot-group">' +
        '<div class="slot-group-header">' + cap(slot) + '</div>' +
        '<div class="slot-group-items">' + items.map(makeCard).join('') + '</div>' +
      '</div>'
    );
  }).join('');

  const count = filtered.length;
  var countEl = document.getElementById('filter-count');
  if (countEl) countEl.textContent = count + ' item' + (count !== 1 ? 's' : '');
  noResults.style.display = count === 0 ? 'block' : 'none';
  setupTooltip(data);
}


// ── Tooltip ───────────────────────────────────────────────────────────────────

function setupTooltip(data) {
  var grid = document.getElementById('item-grid');
  if (!grid) return;

  var tooltip    = document.getElementById('item-tooltip');
  var ttImg      = document.getElementById('tt-img');
  var ttSetIcon  = document.getElementById('tt-set-icon');
  var ttName     = document.getElementById('tt-name');
  var ttSlot     = document.getElementById('tt-slot');
  var ttStats    = document.getElementById('tt-stats');
  var ttDesc     = document.getElementById('tt-desc');
  var ttRarity   = document.getElementById('tt-rarity');

  function findItem(src) {
    return data.find(function (it) { return it.img === src; });
  }

  function positionTooltip(x, y) {
    const pad = 12, tw = tooltip.offsetWidth || 240, th = tooltip.offsetHeight || 160;
    var left = x + pad, top = y + pad;
    if (left + tw > window.innerWidth)  left = x - tw - pad;
    if (top  + th > window.innerHeight) top  = y - th - pad;
    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
  }

  function renderStats(stats, slot) {
    var dmg = [], other = [];
    Object.entries(stats || {}).forEach(function (pair) {
      var label = pair[0], vals = pair[1];
      var isDmg = label === 'Physical Damage' || label === 'Magic Damage';
      var isPct = PCT_STATS.has(label);
      var allZero = vals.every(function (v) { return v === 0 || v === '0 - 0'; });
      if (allZero) return;
      var progression = vals.map(function (v) { return v + (isPct ? '%' : ''); }).join(' → ');
      if (isDmg && slot === 'weapon') {
        dmg.push({ label: label, value: progression });
        return;
      }
      other.push({ label: label, value: progression });
    });
    ttStats.innerHTML = dmg.concat(other).map(function (s) {
      return '<div class="tt-stat"><span>' + s.label + '</span><span class="tt-stat-val">' + s.value + '</span></div>';
    }).join('');
  }

  function showTooltip(item, x, y) {
    var color = RARITY_COLORS[item.rarity] || '#fff';
    if (item.set && item.set !== 'mythic') {
      ttSetIcon.src = 'assets/sets/' + item.set + '.png';
      ttSetIcon.style.display = '';
    } else {
      ttSetIcon.style.display = 'none';
    }
    ttName.textContent = item.name;
    ttName.style.color = color;
    ttSlot.textContent = cap(item.slot);
    ttRarity.textContent = cap(item.rarity);
    ttRarity.style.color = color;
    renderStats(item.stats, item.slot);
    if (item.description) {
      ttDesc.innerHTML = item.description.replace(/\n/g, '<br>');
      ttDesc.style.display = 'block';
    } else {
      ttDesc.style.display = 'none';
    }
    positionTooltip(x, y);
    tooltip.style.display = 'block';
  }

  grid.addEventListener('mouseover', function (e) {
    var card = e.target.closest('.item-card');
    if (!card) return;
    var img = card.querySelector('img.item-sprite');
    if (!img) return;
    var item = findItem(img.getAttribute('src'));
    if (item) showTooltip(item, e.clientX, e.clientY);
  });
  grid.addEventListener('mousemove', function (e) {
    if (tooltip.style.display === 'block') positionTooltip(e.clientX, e.clientY);
  });
  grid.addEventListener('mouseout', function (e) {
    if (!e.target.closest('.item-card')) return;
    var to = e.relatedTarget;
    if (to && to.closest('.item-card') === e.target.closest('.item-card')) return;
    tooltip.style.display = 'none';
  });
}


// ── Detail view ───────────────────────────────────────────────────────────────

function renderDetail(slug, data, item) {
  var view  = document.getElementById('detail-view');
  var color = RARITY_COLORS[item.rarity] || '#fff';
  var setHref = 'sets.html#' + item.set;

  // Stats table rows (non-zero only, level 1/2/3)
  var statRows = Object.entries(item.stats || {}).map(function (pair) {
    var label = pair[0], vals = pair[1];
    var isPct = PCT_STATS.has(label);
    return (
      '<tr><th>' + label + '</th>' +
      vals.map(function (v) {
        return '<td>' + v + (isPct && v !== 0 && v !== '0 - 0' ? '%' : '') + '</td>';
      }).join('') + '</tr>'
    );
  }).join('');

  view.innerHTML =
    '<h1>' + item.name + '</h1>' +
    '<img class="sprite" src="' + item.img + '" alt="' + item.name + '" style="width:64px;height:64px;margin-bottom:1rem;" />' +
    '<p>' +
      item.name + ' is a <span style="color:' + color + ';">' + cap(item.rarity) + '</span> ' +
      cap(item.slot) + ' item and part of the <a href="' + setHref + '">' + cap(item.set) + '</a> set.' +
    '</p>' +
    (item.description
      ? '<p style="font-style:italic;color:#d4af37;">' + item.description.replace(/\n/g, '<br>') + '</p>'
      : '') +
    (statRows
      ? '<h2>Stats</h2>' +
        '<table border="1"><thead><tr>' +
          '<th>Stat</th><th>Level 1</th><th>Level 2</th><th>Level 3</th>' +
        '</tr></thead><tbody>' + statRows + '</tbody></table>'
      : '') +
    '<p style="margin-top:1.5rem;"><a href="items.html">&larr; Back to Items</a></p>';
}


// ── Boot ─────────────────────────────────────────────────────────────────────

WikiRouter('items', renderListing, renderDetail);

var RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
var setsData = null;

var RARITY_COLORS = {
  common: '#c3aa94', uncommon: '#3a8832', rare: '#34A6E2',
  epic: '#6e40a3', legendary: '#cf6b16', mythic: '#d4af37',
};

var PCT_STATS = new Set([
  'Critical Chance', 'Critical Damage', 'Dodge', 'Lifesteal',
  'Counterattack', 'Enrage', 'Thorns', 'Guard', 'Damage Amplification',
  'Mana Burst', 'Swiftness', 'Poisonous', 'Bludgeoning',
]);

var itemsLookup = {};
fetch('data/items.json')
  .then(function (r) { return r.json(); })
  .then(function (arr) { arr.forEach(function (it) { itemsLookup[it.slug] = it; }); });

function setupItemTooltip() {
  var tooltip  = document.getElementById('item-tooltip');
  var ttImg    = document.getElementById('tt-img');
  var ttName   = document.getElementById('tt-name');
  var ttSlot   = document.getElementById('tt-slot');
  var ttStats  = document.getElementById('tt-stats');
  var ttDesc   = document.getElementById('tt-desc');
  var ttRarity = document.getElementById('tt-rarity');

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  function positionTooltip(x, y) {
    var pad = 12, tw = tooltip.offsetWidth || 260, th = tooltip.offsetHeight || 160;
    var left = x + pad, top = y + pad;
    if (left + tw > window.innerWidth)  left = x - tw - pad;
    if (top  + th > window.innerHeight) top  = y - th - pad;
    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
  }

  function showItem(item, x, y) {
    var color = RARITY_COLORS[item.rarity] || '#fff';
    ttImg.src = item.img;
    ttName.textContent = item.name;
    ttName.style.color = color;
    ttSlot.textContent = cap(item.slot);
    ttRarity.textContent = cap(item.rarity);
    ttRarity.style.color = color;

    var rows = [];
    Object.entries(item.stats || {}).forEach(function (pair) {
      var label = pair[0], vals = pair[1];
      var allZero = vals.every(function (v) { return v === 0 || v === '0 - 0'; });
      if (allZero) return;
      var isPct = PCT_STATS.has(label);
      var progression = vals.map(function (v) { return v + (isPct ? '%' : ''); }).join(' → ');
      rows.push('<div class="tt-stat"><span>' + label + '</span><span class="tt-stat-val">' + progression + '</span></div>');
    });
    ttStats.innerHTML = rows.join('');

    if (item.description) {
      ttDesc.innerHTML = item.description.replace(/\n/g, '<br>');
      ttDesc.style.display = 'block';
    } else {
      ttDesc.style.display = 'none';
    }

    positionTooltip(x, y);
    tooltip.style.display = 'block';
  }

  var detailView = document.getElementById('detail-view');

  detailView.addEventListener('mouseover', function (e) {
    var a = e.target.closest('a[href*="items.html#"]');
    if (!a) return;
    var slug = a.getAttribute('href').split('#')[1];
    var item = itemsLookup[slug];
    if (item) showItem(item, e.clientX, e.clientY);
  });
  detailView.addEventListener('mousemove', function (e) {
    if (tooltip.style.display === 'block') positionTooltip(e.clientX, e.clientY);
  });
  detailView.addEventListener('mouseout', function (e) {
    var to = e.relatedTarget;
    if (!to || !to.closest('#detail-view')) tooltip.style.display = 'none';
  });
}

function titleCase(s) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

function renderListing(data) {
  setsData = data;
  var regular = data.filter(function (s) { return !s.is_mythic; });
  var mythic  = data.filter(function (s) { return s.is_mythic; });

  function setTable(sets) {
    var html = '<table border="1"><thead><tr><th>Name</th><th>Description</th></tr></thead><tbody>';
    sets.forEach(function (s) {
      html += '<tr data-slug="' + s.slug + '">' +
        '<td><img class="sprite" src="' + s.img + '" width="40" height="40" alt="' + s.name + '" style="vertical-align:middle;margin-right:8px"/><a href="#' + s.slug + '">' + s.name + '</a></td>' +
        '<td>' + s.description + '</td>' +
        '</tr>';
    });
    return html + '</tbody></table>';
  }

  var html = '<h1>Sets</h1>' +
    '<h2>Regular Sets</h2>' + setTable(regular);
  if (mythic.length) {
    html += '<h2>Mythic Sets</h2><p>Mythic sets have no level bonuses and cannot be combined with styles.</p>' +
      setTable(mythic);
  }

  document.getElementById('listing-view').innerHTML = html;
}

function renderDetail(slug, data, set) {
  var html = '<h1>' + set.name + (set.is_mythic ? ' <em>(Mythic)</em>' : '') + '</h1>' +
    '<img class="sprite" src="' + set.img + '" width="64" height="64" alt="' + set.name +
    '" style="display:block;margin-bottom:1rem"/>' +
    '<p>' + set.description + '</p>';

  if (set.levels && set.levels.length) {
    html += '<h2>Set Bonuses</h2><table border="1"><thead><tr><th>Items</th><th>Bonus</th></tr></thead><tbody>';
    set.levels.forEach(function (lv) {
      html += '<tr><td>' + lv.count + '</td><td>' + lv.bonus + '</td></tr>';
    });
    html += '</tbody></table>';
  }

  if (set.items) {
    html += '<h2>Items</h2>';
    RARITY_ORDER.forEach(function (rarity) {
      var items = set.items[rarity];
      if (!items || !items.length) return;
      html += '<h3>' + titleCase(rarity) + '</h3><ul>';
      items.forEach(function (itemSlug) {
        html += '<li><a href="items.html#' + itemSlug + '">' + titleCase(itemSlug) + '</a></li>';
      });
      html += '</ul>';
    });
  }

  if (set.styles && set.styles.length) {
    html += '<h2>Styles</h2><ul>';
    set.styles.forEach(function (s) {
      html += '<li><a href="styles.html#' + s + '">' + titleCase(s) + '</a></li>';
    });
    html += '</ul>';
  }

  html += '<p><a href="sets.html">&larr; Back to Sets</a></p>';
  document.getElementById('detail-view').innerHTML = html;
}

function setupSetTooltip() {
  var tooltip = document.getElementById('set-tooltip');
  var ttImg   = document.getElementById('st-img');
  var ttName  = document.getElementById('st-name');
  var ttBody  = document.getElementById('st-body');

  function positionTooltip(x, y) {
    var pad = 14, tw = tooltip.offsetWidth || 300, th = tooltip.offsetHeight || 200;
    var left = x + pad, top = y + pad;
    if (left + tw > window.innerWidth)  left = x - tw - pad;
    if (top  + th > window.innerHeight) top  = y - th - pad;
    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
  }

  function showSet(set, x, y) {
    ttImg.src = set.img;
    ttName.textContent = set.name + (set.is_mythic ? ' (Mythic)' : '');

    var html = '';

    if (set.description) {
      html += '<div class="st-desc">' + set.description + '</div>';
    }

    if (set.levels && set.levels.length) {
      html += '<div class="st-divider"></div><div class="st-label">Set Bonuses</div>';
      set.levels.forEach(function (lv) {
        html += '<div class="st-bonus">' +
          '<span class="st-count">' + lv.count + ' items</span>' +
          '<span class="st-bonus-text">' + lv.bonus + '</span>' +
        '</div>';
      });
    }

    ttBody.innerHTML = html;
    tooltip.style.display = 'block';
    positionTooltip(x, y);
  }

  var listingView = document.getElementById('listing-view');

  listingView.addEventListener('mouseover', function (e) {
    var row = e.target.closest('tr[data-slug]');
    if (!row) { tooltip.style.display = 'none'; return; }
    if (!setsData) return;
    var slug = row.getAttribute('data-slug');
    var set = setsData.find(function (s) { return s.slug === slug; });
    if (set) showSet(set, e.clientX, e.clientY);
    else tooltip.style.display = 'none';
  });

  listingView.addEventListener('mousemove', function (e) {
    if (tooltip.style.display === 'block') positionTooltip(e.clientX, e.clientY);
  });

  listingView.addEventListener('mouseout', function (e) {
    var to = e.relatedTarget;
    if (!to || !to.closest('#listing-view')) tooltip.style.display = 'none';
  });
}

WikiRouter('sets', renderListing, renderDetail);
setupItemTooltip();
setupSetTooltip();

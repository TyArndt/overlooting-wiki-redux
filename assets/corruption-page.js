// ── Tooltip ───────────────────────────────────────────────────────────────────

var PCT_STATS = new Set([
  'Critical Chance', 'Critical Damage', 'Dodge', 'Lifesteal', 'Counterattack',
  'Enrage', 'Thorns', 'Guard', 'Damage Amplification', 'Mana Burst', 'Swiftness',
  'Poisonous', 'Bludgeoning'
]);

var RARITY_COLORS = {
  common: '#c3aa94', uncommon: '#3a8832', rare: '#34A6E2',
  epic: '#6e40a3', legendary: '#cf6b16', mythic: '#d4af37'
};

var ttCache = {};

['items', 'potions', 'sets'].forEach(function (cat) {
  fetch('data/' + cat + '.json')
    .then(function (r) { return r.json(); })
    .then(function (arr) {
      ttCache[cat] = {};
      arr.forEach(function (e) { ttCache[cat][e.slug] = e; });
    });
});

var tooltip = document.getElementById('wiki-tooltip');
var ttImg   = document.getElementById('wtt-img');
var ttName  = document.getElementById('wtt-name');
var ttBody  = document.getElementById('wtt-body');

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function trunc(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }

function buildTooltipBody(cat, e) {
  if (cat === 'items') {
    var color = RARITY_COLORS[e.rarity] || '#fff';
    var rows = Object.keys(e.stats || {}).map(function (k) {
      var vals = e.stats[k];
      var allZero = vals.every(function (v) { return v === 0 || v === '0 - 0'; });
      if (allZero) return null;
      var isPct = PCT_STATS.has(k);
      var prog = vals.map(function (v) { return v + (isPct ? '%' : ''); }).join(' → ');
      return '<div class="wtt-stat"><span>' + k + '</span><span>' + prog + '</span></div>';
    }).filter(Boolean).slice(0, 4).join('');
    return '<div class="wtt-subtext" style="color:' + color + '">' + cap(e.rarity) + ' ' + cap(e.slot) + '</div>' +
           (rows ? '<div class="wtt-stats">' + rows + '</div>' : '');
  }
  if (cat === 'potions') {
    return '<div class="wtt-desc">' + (e.description || '') + '</div>';
  }
  if (cat === 'sets') {
    var first = e.levels && e.levels.length
      ? '<div class="wtt-subtext">' + e.levels[0].count + ' items: ' + e.levels[0].bonus + '</div>'
      : '';
    return (e.description ? '<div class="wtt-desc">' + trunc(e.description, 120) + '</div>' : '') + first;
  }
  return '';
}

function showTooltip(cat, entry, x, y) {
  ttImg.src          = entry.img || '';
  ttImg.style.display = entry.img ? 'inline-block' : 'none';
  ttName.textContent = entry.name;
  ttName.style.color = (cat === 'items' && RARITY_COLORS[entry.rarity]) || '#fff';
  ttBody.innerHTML   = buildTooltipBody(cat, entry);
  tooltip.style.display = 'block';
  posTooltip(x, y);
}

function posTooltip(x, y) {
  var pad = 14, tw = tooltip.offsetWidth || 240, th = tooltip.offsetHeight || 100;
  var left = x + pad, top = y + pad;
  if (left + tw > window.innerWidth)  left = x - tw - pad;
  if (top  + th > window.innerHeight) top  = y - th - pad;
  tooltip.style.left = left + 'px';
  tooltip.style.top  = top  + 'px';
}

function hideTooltip() { tooltip.style.display = 'none'; }

var list = document.getElementById('corruption-list');
list.addEventListener('mouseover', function (e) {
  var a = e.target.closest('a[href]');
  if (!a) { hideTooltip(); return; }
  var href = a.getAttribute('href');
  var hi   = href.indexOf('#');
  if (hi < 0) { hideTooltip(); return; }
  var cat  = href.slice(0, hi).replace('.html', '');
  var slug = href.slice(hi + 1);
  var entry = ttCache[cat] && ttCache[cat][slug];
  if (entry) showTooltip(cat, entry, e.clientX, e.clientY);
  else hideTooltip();
});
list.addEventListener('mousemove', function (e) {
  if (tooltip.style.display === 'block') posTooltip(e.clientX, e.clientY);
});
list.addEventListener('mouseout', function (e) {
  var to = e.relatedTarget;
  if (!to || !to.closest('#corruption-list')) hideTooltip();
});

// ── Page ──────────────────────────────────────────────────────────────────────

var bc = document.getElementById('breadcrumbs');
if (bc) bc.innerHTML = '<a href="index.html">Home</a> &gt; Corruption';

document.title = 'Corruption — overlooting.wiki';

fetch('data/corruption.json')
  .then(function (r) { return r.json(); })
  .then(function (data) {
    var html = '';
    data.forEach(function (entry) {
      html += '<div class="corruption-card">';
      html += '<div class="corruption-header">';
      html += '<span class="corruption-level">' + entry.name + '</span>';
      html += '</div>';
      html += '<div class="corruption-effect">' + entry.effect + '</div>';
      if (entry.unlocks) {
        if (Array.isArray(entry.unlocks)) {
          html += '<div class="corruption-unlocks">&#10022; ' + (entry.unlocks_label || 'Added to the pool:') + ' ';
          html += entry.unlocks.map(function (u) {
            return '<a href="' + u.type + '.html#' + u.slug + '">' + u.name + '</a>';
          }).join(', ');
          html += '</div>';
        } else {
          html += '<div class="corruption-unlocks">&#10022; ' + entry.unlocks + '</div>';
        }
      }
      html += '</div>';
    });
    document.getElementById('corruption-list').innerHTML = html;
  });

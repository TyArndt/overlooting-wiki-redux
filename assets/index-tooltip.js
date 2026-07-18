(function () {
  var RARITY_COLORS = {
    common: '#c3aa94', uncommon: '#3a8832', rare: '#34A6E2',
    epic: '#6e40a3', legendary: '#cf6b16', mythic: '#d4af37'
  };
  var PCT_STATS = new Set([
    'Critical Chance', 'Critical Damage', 'Dodge', 'Lifesteal', 'Counterattack',
    'Enrage', 'Thorns', 'Guard', 'Damage Amplification', 'Mana Burst', 'Swiftness',
    'Poisonous', 'Bludgeoning'
  ]);
  var CHAR_LABELS = { liz: 'Liz', maximilian: 'Maximilian', 'the-shadow': 'The Shadow' };
  var ROOM_LABELS = {
    'corrupted-forest': 'Corrupted Forest',
    'outer-forest':     'Outer Forest',
    'path-to-the-core': 'Path to the Core'
  };
  var TYPE_LABELS = { regular: 'Regular', minion: 'Minion', boss: 'Boss' };
  var CATEGORIES = [
    'items', 'statuses', 'stats', 'sets', 'masteries', 'potions',
    'styles', 'enemies', 'characters', 'rooms', 'event_areas'
  ];

  // ── Data cache ───────────────────────────────────────────────────────────────
  var cache = {};
  CATEGORIES.forEach(function (cat) {
    fetch('data/' + cat + '.json')
      .then(function (r) { return r.json(); })
      .then(function (arr) {
        cache[cat] = {};
        arr.forEach(function (e) { cache[cat][e.slug] = e; });
      })
      .catch(function () { cache[cat] = {}; });
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function trunc(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }

  function statRow(label, val, isPct) {
    return '<div class="wtt-stat"><span>' + label + '</span><span>' + val + (isPct ? '%' : '') + '</span></div>';
  }

  // ── Per-category tooltip body ─────────────────────────────────────────────────
  function buildBody(cat, e) {
    switch (cat) {

      case 'items': {
        var color = RARITY_COLORS[e.rarity] || '#fff';
        var rows = Object.entries(e.stats || {})
          .map(function (kv) {
            var vals = kv[1];
            var allZero = vals.every(function (v) { return v === 0 || v === '0 - 0'; });
            if (allZero) return null;
            var isPct = PCT_STATS.has(kv[0]);
            var progression = vals.map(function (v) { return v + (isPct ? '%' : ''); }).join(' → ');
            return statRow(kv[0], progression, false);
          })
          .filter(Boolean)
          .slice(0, 4)
          .join('');
        return '<div class="wtt-subtext" style="color:' + color + '">' +
                 cap(e.rarity) + ' ' + cap(e.slot) +
               '</div>' +
               '<div class="wtt-subtext">Set: ' + cap(e.set) + '</div>' +
               (rows ? '<div class="wtt-stats">' + rows + '</div>' : '');
      }

      case 'statuses':
      case 'potions':
        return '<div class="wtt-desc">' + e.description + '</div>';

      case 'stats':
        return '<div class="wtt-desc">' + e.description + '</div>';

      case 'masteries':
        return '<div class="wtt-subtext">' + (CHAR_LABELS[e.character] || e.character) + '</div>' +
               '<div class="wtt-desc">' + trunc(e.description, 130) + '</div>';

      case 'sets': {
        var first = e.levels && e.levels.length
          ? '<div class="wtt-subtext">' + e.levels[0].count + ' items: ' + e.levels[0].bonus + '</div>'
          : '';
        return (e.is_mythic ? '<div class="wtt-subtext">Mythic Set</div>' : '') +
               '<div class="wtt-desc">' + trunc(e.description, 120) + '</div>' +
               first;
      }

      case 'styles':
        return '<div class="wtt-subtext">Sets: ' +
               (e.sets || []).map(cap).join(' + ') + '</div>';

      case 'enemies': {
        var hp  = e.stats && e.stats['Max Health'];
        var dmg = e.stats && e.stats['Min Physical Damage'];
        var statsHtml = (hp !== undefined)
          ? '<div class="wtt-stats">' +
              statRow('HP', hp, false) + statRow('Damage', dmg, false) +
            '</div>'
          : '';
        return '<div class="wtt-subtext">' +
                 (ROOM_LABELS[e.room] || e.room) + ' — ' + (TYPE_LABELS[e.type] || e.type) +
               '</div>' +
               statsHtml +
               (e.description ? '<div class="wtt-desc">' + trunc(e.description.replace(/\n/g, ' '), 120) + '</div>' : '');
      }

      case 'characters':
        return '<div class="wtt-desc">' + trunc(e.lore, 120) + '</div>' +
               (e.passives && e.passives.length
                 ? '<div class="wtt-subtext">▶ ' + trunc(e.passives[0], 100) + '</div>'
                 : '');

      case 'rooms':
        return e.description
          ? '<div class="wtt-desc">' + trunc(e.description, 150) + '</div>'
          : '';

      case 'event_areas':
        return e.description
          ? '<div class="wtt-desc">' + trunc(e.description, 150) + '</div>'
          : '<div class="wtt-subtext"><em>No additional info</em></div>';

      default:
        return '';
    }
  }

  var HAS_SPRITE = { items:1, statuses:1, potions:1, masteries:1, sets:1, enemies:1, characters:1 };

  // ── Tooltip DOM ──────────────────────────────────────────────────────────────
  var tooltip = document.getElementById('wiki-tooltip');
  var ttImg   = document.getElementById('wtt-img');
  var ttName  = document.getElementById('wtt-name');
  var ttBody  = document.getElementById('wtt-body');

  function position(x, y) {
    var pad = 14, tw = tooltip.offsetWidth || 240, th = tooltip.offsetHeight || 100;
    var left = x + pad, top = y + pad;
    if (left + tw > window.innerWidth)  left = x - tw - pad;
    if (top  + th > window.innerHeight) top  = y - th - pad;
    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
  }

  function show(cat, entry, x, y) {
    if (HAS_SPRITE[cat] && entry.img) {
      ttImg.src = entry.img;
      ttImg.style.display = 'inline-block';
    } else {
      ttImg.style.display = 'none';
    }
    ttName.textContent = entry.name;
    ttName.style.color = (cat === 'items' && RARITY_COLORS[entry.rarity]) || '#fff';
    ttBody.innerHTML = buildBody(cat, entry);
    tooltip.style.display = 'block';
    position(x, y);
  }

  function hide() { tooltip.style.display = 'none'; }

  // ── Wire up ──────────────────────────────────────────────────────────────────
  var overview = document.getElementById('overview');
  if (!overview) return;

  overview.addEventListener('mouseover', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) { hide(); return; }

    var href = a.getAttribute('href');
    var hi = href.indexOf('#');
    if (hi < 0) { hide(); return; }

    var cat  = href.slice(0, hi).replace('.html', '');
    var slug = href.slice(hi + 1);

    var catData = cache[cat];
    if (!catData) { hide(); return; }
    var entry = catData[slug];
    if (!entry) { hide(); return; }

    show(cat, entry, e.clientX, e.clientY);
  });

  overview.addEventListener('mousemove', function (e) {
    if (tooltip.style.display === 'block') position(e.clientX, e.clientY);
  });

  overview.addEventListener('mouseout', function (e) {
    var to = e.relatedTarget;
    if (!to || !to.closest || !to.closest('#overview')) hide();
  });
})();

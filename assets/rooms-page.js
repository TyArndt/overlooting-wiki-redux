// ── Constants ─────────────────────────────────────────────────────────────────

var ROOM_IMG = {
  'corrupted-forest':  'assets/rooms/corrupted_forest.png',
  'outer-forest':      'assets/rooms/forest.png',
  'path-to-the-core':  'assets/rooms/cave.png',
};

var ROOM_MAP = {
  'outer-forest': 'assets/rooms/forst_map.png',
};

var TYPE_ORDER  = ['regular', 'minion', 'boss'];
var TYPE_LABELS = { regular: 'Regular Enemies', minion: 'Minions', boss: 'Bosses' };

var EVENT_IMGS = {
  'forge': [
    { src: 'assets/events/forge_window.png',    alt: 'Forge window' },
    { src: 'assets/events/forge_character.png', alt: 'Forge character' },
  ],
};

// ── State ─────────────────────────────────────────────────────────────────────

var roomsData   = null;
var eventData   = null;
var enemiesByRoom = {};

// ── Data loading ──────────────────────────────────────────────────────────────

fetch('data/enemies.json')
  .then(function (r) { return r.json(); })
  .then(function (arr) {
    arr.forEach(function (e) {
      if (!enemiesByRoom[e.room]) enemiesByRoom[e.room] = [];
      enemiesByRoom[e.room].push(e);
    });
  });

fetch('data/rooms.json')
  .then(function (r) { return r.json(); })
  .then(function (data) { roomsData = data; route(); });

fetch('data/event_areas.json')
  .then(function (r) { return r.json(); })
  .then(function (data) { eventData = data; route(); });

// ── Router ────────────────────────────────────────────────────────────────────

function setBreadcrumbs(parts) {
  var el = document.getElementById('breadcrumbs');
  if (!el) return;
  el.innerHTML = parts.map(function (p, i) {
    return i < parts.length - 1
      ? '<a href="' + p.href + '">' + p.label + '</a>'
      : p.label;
  }).join(' &gt; ');
}

function route() {
  if (!roomsData || !eventData) return;
  var slug  = window.location.hash.slice(1);
  var room  = slug && roomsData.find(function (r) { return r.slug === slug; });
  var event = slug && eventData.find(function (e) { return e.slug === slug; });

  if (room)  { showRoomDetail(room);  return; }
  if (event) { showEventDetail(event); return; }
  showListing();
}

window.addEventListener('hashchange', route);

// ── Views ─────────────────────────────────────────────────────────────────────

function showListing() {
  document.getElementById('listing-view').hidden = false;
  document.getElementById('detail-view').hidden  = true;
  document.title = 'Rooms & Events — overlooting.wiki';
  setBreadcrumbs([
    { label: 'Home', href: 'index.html' },
    { label: 'Rooms & Events' }
  ]);

  var roomsHtml = '<ul>';
  roomsData.forEach(function (r) {
    roomsHtml += '<li><a href="#' + r.slug + '">' + r.name + '</a></li>';
  });
  roomsHtml += '</ul>';
  document.getElementById('rooms-list').innerHTML = roomsHtml;

  var eaHtml = '<ul>';
  eventData.forEach(function (e) {
    eaHtml += '<li><a href="#' + e.slug + '">' + e.name + '</a></li>';
  });
  eaHtml += '</ul>';
  document.getElementById('ea-list').innerHTML = eaHtml;
}

function showRoomDetail(room) {
  document.getElementById('listing-view').hidden = true;
  document.getElementById('detail-view').hidden  = false;
  document.title = room.name + ' — overlooting.wiki';
  setBreadcrumbs([
    { label: 'Home',          href: 'index.html' },
    { label: 'Rooms & Events', href: 'rooms.html' },
    { label: room.name }
  ]);

  var img    = ROOM_IMG[room.slug];
  var mapImg = ROOM_MAP[room.slug];
  var html   = '<h1>' + room.name + '</h1>';

  if (img) {
    html += '<img class="room-hero-img" src="' + img + '" alt="' + room.name + '"/>';
  }
  if (mapImg) {
    html += '<h2>Map</h2>';
    html += '<img class="room-map-img" src="' + mapImg + '" alt="' + room.name + ' map"/>';
  }

  var roomEnemies = enemiesByRoom[room.slug] || [];
  if (roomEnemies.length) {
    html += '<h2>Enemies</h2>';
    TYPE_ORDER.forEach(function (type) {
      var group = roomEnemies.filter(function (e) { return e.type === type; });
      if (!group.length) return;
      html += '<h3>' + TYPE_LABELS[type] + '</h3>';
      html += '<ul class="room-enemy-list">';
      group.forEach(function (e) {
        html += '<li><a href="enemies.html#' + e.slug + '">' + e.name + '</a></li>';
      });
      html += '</ul>';
    });
  }

  html += '<p><a href="rooms.html">&larr; Back to Rooms &amp; Events</a></p>';
  document.getElementById('detail-view').innerHTML = html;
}

function showEventDetail(event) {
  document.getElementById('listing-view').hidden = true;
  document.getElementById('detail-view').hidden  = false;
  document.title = event.name + ' — overlooting.wiki';
  setBreadcrumbs([
    { label: 'Home',           href: 'index.html' },
    { label: 'Rooms & Events', href: 'rooms.html' },
    { label: event.name }
  ]);

  var html = '<h1>' + event.name + '</h1>';

  if (event.description) {
    html += '<p class="ea-intro">' + event.description + '</p>';
  }

  var imgs = EVENT_IMGS[event.slug];
  if (imgs && imgs.length) {
    html += '<div class="ea-images">';
    imgs.forEach(function (img) {
      html += '<img class="ea-img" src="' + img.src + '" alt="' + img.alt + '"/>';
    });
    html += '</div>';
  }

  if (event.choices && event.choices.length) {
    html += '<div class="ea-choices">';
    event.choices.forEach(function (c) {
      html += '<div class="ea-choice">';
      html += '<div class="ea-choice-name">' + c.name + '</div>';
      if (c.description) {
        html += '<div class="ea-choice-desc">' + c.description + '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
  }

  html += '<p><a href="rooms.html">&larr; Back to Rooms &amp; Events</a></p>';
  document.getElementById('detail-view').innerHTML = html;
}

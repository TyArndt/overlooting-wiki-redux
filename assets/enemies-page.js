var ROOM_LABELS = {
  'corrupted-forest': 'Corrupted Forest',
  'outer-forest': 'Outer Forest',
  'path-to-the-core': 'Path to the Core'
};
var ROOM_ORDER = ['corrupted-forest', 'outer-forest', 'path-to-the-core'];
var TYPE_ORDER = ['regular', 'minion', 'boss'];
var TYPE_LABELS = { regular: 'Regular Enemies', minion: 'Minions', boss: 'Bosses' };

function renderListing(data) {
  var byRoom = {};
  data.forEach(function (e) {
    if (!byRoom[e.room]) byRoom[e.room] = {};
    if (!byRoom[e.room][e.type]) byRoom[e.room][e.type] = [];
    byRoom[e.room][e.type].push(e);
  });

  var html = '<h1>Enemies</h1>';
  ROOM_ORDER.forEach(function (room) {
    var roomData = byRoom[room] || {};
    html += '<h2><a href="rooms.html#' + room + '">' + ROOM_LABELS[room] + '</a></h2>' +
      '<div class="grid-container">';
    TYPE_ORDER.forEach(function (type) {
      var enemies = roomData[type] || [];
      html += '<div class="grid-item"><h3>' + TYPE_LABELS[type] + '</h3><ul>';
      enemies.forEach(function (e) {
        html += '<li><a href="#' + e.slug + '">' + e.name + '</a></li>';
      });
      html += '</ul></div>';
    });
    html += '</div>';
  });

  document.getElementById('listing-view').innerHTML = html;
}

function renderDetail(slug, data, enemy) {
  var roomLabel = ROOM_LABELS[enemy.room] || enemy.room;
  var typeLabel = TYPE_LABELS[enemy.type] || enemy.type;
  var desc = enemy.description ? enemy.description.replace(/\n/g, '<br/>') : '';

  var statsHtml = '';
  if (enemy.stats && Object.keys(enemy.stats).length) {
    statsHtml = '<h2>Stats</h2><table border="1"><thead><tr><th>Stat</th><th>Value</th></tr></thead><tbody>';
    Object.entries(enemy.stats).forEach(function (kv) {
      statsHtml += '<tr><td>' + kv[0] + '</td><td>' + kv[1] + '</td></tr>';
    });
    statsHtml += '</tbody></table>';
  }

  document.getElementById('detail-view').innerHTML =
    '<h1>' + enemy.name + '</h1>' +
    '<img class="sprite" src="' + enemy.img + '" width="64" height="64" alt="' + enemy.name +
    '" style="display:block;margin-bottom:1rem"/>' +
    '<p><strong>Room:</strong> <a href="rooms.html#' + enemy.room + '">' + roomLabel + '</a> &mdash; ' +
    '<strong>Type:</strong> ' + typeLabel + '</p>' +
    (desc ? '<p>' + desc + '</p>' : '') +
    statsHtml +
    '<p><a href="enemies.html">&larr; Back to Enemies</a></p>';
}

WikiRouter('enemies', renderListing, renderDetail);

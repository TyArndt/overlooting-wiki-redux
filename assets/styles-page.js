function titleCase(s) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

function renderListing(data) {
  // Need sets to build the 2D table — fetch separately
  fetch('data/sets.json')
    .then(function (r) { return r.json(); })
    .then(function (sets) { buildTable(data, sets); })
    .catch(function () {
      // Fallback: plain alphabetical list
      var html = '<h1>Styles</h1><ul>';
      data.forEach(function (s) { html += '<li><a href="#' + s.slug + '">' + s.name + '</a></li>'; });
      html += '</ul>';
      document.getElementById('listing-view').innerHTML = html;
    });
}

function buildTable(styles, sets) {
  var regularSets = sets.filter(function (s) { return !s.is_mythic; });

  // Map set slug → index in regularSets
  var setIndex = {};
  regularSets.forEach(function (s, i) { setIndex[s.slug] = i; });

  // Build cell map: "loIdx:hiIdx" → [style objects]
  var cellMap = {};
  styles.forEach(function (style) {
    if (!style.sets || style.sets.length !== 2) return;
    var a = setIndex[style.sets[0]];
    var b = setIndex[style.sets[1]];
    if (a === undefined || b === undefined) return;
    var lo = Math.min(a, b), hi = Math.max(a, b);
    var key = lo + ':' + hi;
    if (!cellMap[key]) cellMap[key] = [];
    cellMap[key].push(style);
  });

  // Table header
  var html = '<h1>Styles</h1><h2>Styles by Sets</h2>' +
    '<div style="overflow-x:auto;width:100%"><table border="1"><thead><tr><th></th>';
  regularSets.forEach(function (s) {
    html += '<th style="white-space:nowrap">' +
      '<img class="sprite" src="' + s.img + '" width="20" height="20" alt="' + s.name + '"/> ' +
      '<span>' + s.name + '</span></th>';
  });
  html += '</tr></thead><tbody>';

  // Table rows (lower-left triangle has styles)
  regularSets.forEach(function (rowSet, rowIdx) {
    html += '<tr><th style="white-space:nowrap;position:sticky;left:0;background-color:#3A3D4CFF">' +
      '<img class="sprite" src="' + rowSet.img + '" width="20" height="20" alt="' + rowSet.name + '"/> ' +
      '<span>' + rowSet.name + '</span></th>';
    regularSets.forEach(function (colSet, colIdx) {
      html += '<td>';
      if (colIdx < rowIdx) {
        var key = colIdx + ':' + rowIdx;
        (cellMap[key] || []).forEach(function (st) {
          html += '<a href="#' + st.slug + '">' + st.name + '</a><br/>';
        });
      }
      html += '</td>';
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  document.getElementById('listing-view').innerHTML = html;
}

function renderDetail(slug, data, style) {
  var setLinks = (style.sets || []).map(function (s) {
    return '<a href="sets.html#' + s + '">' + titleCase(s) + '</a>';
  }).join(' + ');

  document.getElementById('detail-view').innerHTML =
    '<h1>' + style.name + '</h1>' +
    '<p><strong>Sets:</strong> ' + setLinks + '</p>' +
    '<p><a href="styles.html">&larr; Back to Styles</a></p>';
}

WikiRouter('styles', renderListing, renderDetail);

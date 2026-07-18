function renderListing(data) {
  var html = '<h1>Stats</h1><p>These stats exist:</p>' +
    '<table border="1"><thead><tr><th>Stat</th><th>Description</th></tr></thead><tbody>';
  data.forEach(function (item) {
    html += '<tr>' +
      '<td><a href="#' + item.slug + '">' + item.name + '</a></td>' +
      '<td>' + item.description + '</td>' +
      '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('listing-view').innerHTML = html;
}

function renderDetail(slug, data, item) {
  document.getElementById('detail-view').innerHTML =
    '<h1>' + item.name + '</h1>' +
    '<p>' + item.description + '</p>' +
    '<p><a href="stats.html">&larr; Back to Stats</a></p>';
}

WikiRouter('stats', renderListing, renderDetail);

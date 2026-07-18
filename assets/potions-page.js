function renderListing(data) {
  var html = '<h1>Potions</h1><p>These potions can be acquired:</p>' +
    '<table border="1"><thead><tr><th>Sprite</th><th>Name</th><th>Description</th></tr></thead><tbody>';
  data.forEach(function (item) {
    html += '<tr>' +
      '<td><img class="sprite" height="30" width="30" src="' + item.img + '" alt="' + item.name + '"/></td>' +
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
    (item.img ? '<img class="sprite" src="' + item.img + '" alt="' + item.name + '" style="width:64px;height:64px;display:block;margin-bottom:1rem;" />' : '') +
    '<p>' + item.description + '</p>' +
    '<p><a href="potions.html">&larr; Back to Potions</a></p>';
}

WikiRouter('potions', renderListing, renderDetail);

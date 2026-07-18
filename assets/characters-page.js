(function () {
  document.title = 'Characters — overlooting.wiki';
  var bc = document.getElementById('breadcrumbs');
  if (bc) bc.innerHTML = '<a href="index.html">Home</a> &gt; Characters';

  fetch('data/characters.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var html = '<h1>Characters</h1>';
      data.forEach(function (c, i) {
        if (i > 0) html += '<hr class="char-divider"/>';
        html += '<div class="char-block" id="' + c.slug + '">';
        if (c.img) {
          html += '<img class="sprite char-portrait" src="' + c.img + '" alt="' + c.name + '"/>';
        }
        html += '<div class="char-info">';
        html += '<h2>' + c.name + '</h2>';
        if (c.lore) {
          html += '<p class="char-lore">' + c.lore + '</p>';
        }
        if (c.passives && c.passives.length) {
          html += '<h3>Passive Abilities</h3><ol>';
          c.passives.forEach(function (p) { html += '<li>' + p + '</li>'; });
          html += '</ol>';
        }
        html += '</div></div>';
      });
      document.getElementById('listing-view').innerHTML = html;
    });
})();

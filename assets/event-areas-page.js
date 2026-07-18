var EVENT_IMGS = {
  'forge': [
    { src: 'assets/events/forge_window.png',    alt: 'Forge window' },
    { src: 'assets/events/forge_character.png', alt: 'Forge character' },
  ],
};

function renderListing(data) {
  var html = '<ul>';
  data.forEach(function (item) {
    html += '<li><a href="#' + item.slug + '">' + item.name + '</a></li>';
  });
  html += '</ul>';
  document.getElementById('ea-list').innerHTML = html;
}

function renderDetail(slug, data, item) {
  var html = '<h1>' + item.name + '</h1>';

  if (item.description) {
    html += '<p class="ea-intro">' + item.description + '</p>';
  }

  var imgs = EVENT_IMGS[slug];
  if (imgs && imgs.length) {
    html += '<div class="ea-images">';
    imgs.forEach(function (img) {
      html += '<img class="ea-img" src="' + img.src + '" alt="' + img.alt + '"/>';
    });
    html += '</div>';
  }

  if (item.choices && item.choices.length) {
    html += '<div class="ea-choices">';
    item.choices.forEach(function (c) {
      html += '<div class="ea-choice">';
      html += '<div class="ea-choice-name">' + c.name + '</div>';
      if (c.description) {
        html += '<div class="ea-choice-desc">' + c.description + '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
  }

  html += '<p><a href="event_areas.html">&larr; Back to Event Areas</a></p>';
  document.getElementById('detail-view').innerHTML = html;
}

WikiRouter('event_areas', renderListing, renderDetail);

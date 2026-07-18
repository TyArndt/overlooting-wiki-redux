(function () {
  var CHAR_ORDER  = ['maximilian', 'liz', 'the-shadow'];
  var CHAR_LABELS = { maximilian: 'Maximilian', liz: 'Liz', 'the-shadow': 'The Shadow' };
  var CHAR_IMGS   = {
    maximilian:   'assets/characters/dog.png',
    liz:          'assets/characters/cat.png',
    'the-shadow': 'assets/characters/shadow.png'
  };

  document.title = 'Masteries — overlooting.wiki';
  var bc = document.getElementById('breadcrumbs');
  if (bc) bc.innerHTML = '<a href="index.html">Home</a> &gt; Masteries';

  var groups        = {};
  var selectedChar  = 'maximilian';
  var selectedMastery = null;

  fetch('data/masteries.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      data.forEach(function (m) {
        if (!groups[m.character]) groups[m.character] = [];
        groups[m.character].push(m);
      });
      render();
    });

  function render() {
    var masteries = groups[selectedChar] || [];

    // Character selector
    var charHtml = '<div class="m-char-selector">';
    CHAR_ORDER.forEach(function (char) {
      charHtml += '<button class="m-char-btn' + (char === selectedChar ? ' active' : '') + '" data-char="' + char + '">' +
        '<img class="sprite" src="' + CHAR_IMGS[char] + '" alt="' + CHAR_LABELS[char] + '"/>' +
        '<span class="m-char-name">' + CHAR_LABELS[char] + '</span>' +
        '</button>';
    });
    charHtml += '</div>';

    // Mastery icon grid
    var gridHtml = '<div class="m-grid">';
    masteries.forEach(function (m) {
      var active = selectedMastery && selectedMastery.slug === m.slug;
      gridHtml += '<button class="m-icon-btn' + (active ? ' active' : '') + '" data-slug="' + m.slug + '" title="' + m.name + '">';
      if (m.img) gridHtml += '<img src="' + m.img + '" alt="' + m.name + '"/>';
      gridHtml += '</button>';
    });
    gridHtml += '</div>';

    // Detail card
    var detailHtml = '<div class="m-detail' + (selectedMastery ? ' visible' : '') + '">';
    if (selectedMastery) {
      detailHtml += '<img class="sprite m-detail-icon" src="' + (selectedMastery.img || '') + '" alt="' + selectedMastery.name + '"/>' +
        '<div>' +
        '<div class="m-detail-name">' + selectedMastery.name + '</div>' +
        '<div class="m-detail-desc">' + selectedMastery.description + '</div>' +
        '</div>';
    }
    detailHtml += '</div>';

    document.getElementById('listing-view').innerHTML =
      '<h1>Masteries</h1>' + charHtml + gridHtml + detailHtml;

    // Wire character buttons
    document.querySelectorAll('.m-char-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedChar    = this.getAttribute('data-char');
        selectedMastery = null;
        render();
      });
    });

    // Wire mastery icon buttons
    document.querySelectorAll('.m-icon-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var slug = this.getAttribute('data-slug');
        var m    = (groups[selectedChar] || []).find(function (x) { return x.slug === slug; });
        if (!m) return;
        selectedMastery = (selectedMastery && selectedMastery.slug === slug) ? null : m;
        render();
      });
    });

    // Wire hover tooltip
    var tooltip  = document.getElementById('mastery-tooltip');
    var ttImg    = document.getElementById('mtt-img');
    var ttName   = document.getElementById('mtt-name');
    var grid     = document.querySelector('.m-grid');
    if (tooltip && grid) {
      function posTooltip(x, y) {
        var pad = 12, tw = tooltip.offsetWidth || 160, th = tooltip.offsetHeight || 40;
        var left = x + pad, top = y + pad;
        if (left + tw > window.innerWidth)  left = x - tw - pad;
        if (top  + th > window.innerHeight) top  = y - th - pad;
        tooltip.style.left = left + 'px';
        tooltip.style.top  = top  + 'px';
      }
      grid.addEventListener('mouseover', function (e) {
        var btn = e.target.closest('.m-icon-btn');
        if (!btn) { tooltip.style.display = 'none'; return; }
        var slug = btn.getAttribute('data-slug');
        var m = (groups[selectedChar] || []).find(function (x) { return x.slug === slug; });
        if (!m) { tooltip.style.display = 'none'; return; }
        ttImg.src = m.img || '';
        ttName.textContent = m.name;
        tooltip.style.display = 'flex';
        posTooltip(e.clientX, e.clientY);
      });
      grid.addEventListener('mousemove', function (e) {
        if (tooltip.style.display === 'flex') posTooltip(e.clientX, e.clientY);
      });
      grid.addEventListener('mouseout', function (e) {
        var to = e.relatedTarget;
        if (!to || !to.closest('.m-grid')) tooltip.style.display = 'none';
      });
    }
  }
})();

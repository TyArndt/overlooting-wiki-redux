/**
 * Hash-based page router shared by all category pages.
 *
 * Usage on each category page:
 *   WikiRouter('items', renderListing, renderDetail);
 *
 * onListing(data)              — called when no hash is present
 * onDetail(slug, data, entry)  — called when hash matches a slug; entry may be
 *                                null if the slug isn't found (shows listing instead)
 */
window.WikiRouter = (function () {
  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  function setBreadcrumbs(parts) {
    var el = document.getElementById('breadcrumbs');
    if (!el) return;
    el.innerHTML = parts.map(function (p, i) {
      return i < parts.length - 1
        ? '<a href="' + p.href + '">' + p.label + '</a>'
        : p.label;
    }).join(' &gt; ');
  }

  return function WikiRouter(categoryKey, onListing, onDetail) {
    var data = null;
    var label = categoryKey.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });

    function showListing() {
      var lv = document.getElementById('listing-view');
      var dv = document.getElementById('detail-view');
      if (lv) lv.hidden = false;
      if (dv) dv.hidden = true;
      document.title = label + ' — overlooting.wiki';
      setBreadcrumbs([
        { label: 'Home', href: 'index.html' },
        { label: label }
      ]);
      if (data) onListing(data);
    }

    function showDetail(slug) {
      var entry = data && data.find(function (d) { return d.slug === slug; });
      if (!entry) { showListing(); return; }
      var lv = document.getElementById('listing-view');
      var dv = document.getElementById('detail-view');
      if (lv) lv.hidden = true;
      if (dv) dv.hidden = false;
      document.title = entry.name + ' — overlooting.wiki';
      setBreadcrumbs([
        { label: 'Home',  href: 'index.html' },
        { label: label,   href: categoryKey + '.html' },
        { label: entry.name }
      ]);
      onDetail(slug, data, entry);
    }

    function route() {
      var slug = window.location.hash.slice(1);
      if (slug && data) {
        showDetail(slug);
      } else {
        showListing();
      }
    }

    fetch('data/' + categoryKey + '.json')
      .then(function (r) { return r.json(); })
      .then(function (json) {
        data = json;
        route();
      })
      .catch(function (err) {
        console.error('Failed to load data/' + categoryKey + '.json', err);
        var dv = document.getElementById('detail-view');
        var lv = document.getElementById('listing-view');
        if (lv) lv.hidden = false;
        if (dv) dv.hidden = true;
      });

    window.addEventListener('hashchange', route);
  };
})();

/* Loads the shared header from /assets/includes/header.html into the
   <div id="site-header"></div> placeholder and highlights the link that
   matches the current page. Edit the header in that one file. */
(function () {
  'use strict';

  function markActive(root) {
    var path = window.location.pathname.replace(/index\.html$/, '');
    if (path === '') path = '/';
    var links = root.querySelectorAll('.nav-link');
    var best = null, bestLen = -1;
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      var match = href === '/' ? path === '/' : path.indexOf(href) === 0;
      if (match && href.length > bestLen) { best = links[i]; bestLen = href.length; }
    }
    if (best) {
      best.parentNode.classList.add('navbar-active', 'font-weight-bold');
      var sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = '(current)';
      best.appendChild(sr);
    }
  }

  function loadHeader() {
    var slot = document.getElementById('site-header');
    if (!slot) return;
    fetch('/assets/includes/header.html', { cache: 'no-cache' })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        slot.outerHTML = html;
        var nav = document.getElementById('navbar');
        if (nav) markActive(nav);
      })
      .catch(function (err) { console.error('Could not load site header:', err); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHeader);
  } else {
    loadHeader();
  }
})();

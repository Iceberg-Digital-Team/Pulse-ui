/*
 * Property Pulse instant valuation embed.
 *
 *   <script src="https://harbour-co.property-ai.co.uk/embed.js" async></script>
 *
 * The page shown is the company whose subdomain the script comes from. data-company="<slug>" picks
 * one explicitly (e.g. when the script is loaded from property-ai.co.uk).
 * Optional: data-target="#element-id" to place it somewhere other than right after the script tag.
 * The valuation page runs in an iframe that grows to fit its content.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var slug = (script.getAttribute('data-company') || '').toLowerCase();
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    console.error('[Property Pulse] data-company must be a company slug');
    return;
  }

  var src = new URL(script.src);
  var host = src.hostname;
  var port = src.port ? ':' + src.port : '';
  var page;
  if (!slug) page = src.origin + '/';
  else if (/(^|\.)property-ai\.co\.uk$/.test(host)) page = 'https://' + slug + '.property-ai.co.uk/';
  else if (/(^|\.)localhost$/.test(host)) page = src.protocol + '//' + slug + '.localhost' + port + '/';
  else page = src.origin + '/' + slug; // any other host (e.g. the Railway domain) serves /<slug>
  var pageOrigin = new URL(page).origin;

  var iframe = document.createElement('iframe');
  iframe.src = page + '?embed=1';
  iframe.title = 'Instant property valuation';
  iframe.loading = 'lazy';
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.style.cssText = 'display:block;width:100%;border:0;min-height:560px;overflow:hidden;background:transparent';

  window.addEventListener('message', function (event) {
    if (event.origin !== pageOrigin || event.source !== iframe.contentWindow) return;
    var data = event.data || {};
    if (data.type === 'pulse:height' && typeof data.height === 'number' && data.height > 0) {
      iframe.style.height = Math.ceil(data.height) + 'px';
      iframe.style.minHeight = '0';
    }
  });

  var target = script.getAttribute('data-target');
  var container = target && document.querySelector(target);
  if (container) container.appendChild(iframe);
  else script.parentNode.insertBefore(iframe, script.nextSibling);
})();

(function () {
  var storageKey = 'farsha-mobile-grid-view-v1';

  function isHydrated() {
    return document.documentElement.getAttribute('data-farsha-hydrated') === 'true';
  }

  function matches(element, selector) {
    var fn =
      element.matches ||
      element.msMatchesSelector ||
      element.webkitMatchesSelector;
    return fn ? fn.call(element, selector) : false;
  }

  function closest(element, selector) {
    var node = element;
    if (node && node.nodeType !== 1) {
      node = node.parentElement;
    }
    while (node && node.nodeType === 1) {
      if (matches(node, selector)) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      return;
    }
  }

  function setGrid(columns) {
    var grid = document.querySelector('[data-farsha-grid]');
    if (!grid) {
      return;
    }

    var count = Number(columns);
    if (count !== 1 && count !== 2 && count !== 3) {
      return;
    }

    grid.setAttribute('data-farsha-fallback-columns', String(count));
    grid.style.gridTemplateColumns = 'repeat(' + count + ', minmax(0, 1fr))';
    grid.style.maxWidth = count === 1 ? '36rem' : '';
    grid.style.marginLeft = count === 1 ? 'auto' : '';
    grid.style.marginRight = count === 1 ? 'auto' : '';
    grid.style.gap = count === 1 ? '1.25rem' : count === 2 ? '0.75rem' : '0.375rem';

    var buttons = document.querySelectorAll('[data-farsha-grid-option]');
    for (var index = 0; index < buttons.length; index += 1) {
      var button = buttons[index];
      var selected = button.getAttribute('data-farsha-grid-option') === String(count);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      if (selected) {
        button.classList.add('theme-selected');
        button.classList.remove('theme-muted-strong');
      } else {
        button.classList.remove('theme-selected');
        button.classList.add('theme-muted-strong');
      }
    }

    safeSet(storageKey, String(count));
  }

  function openDrawer() {
    var drawer = document.querySelector('[data-farsha-filter-drawer]');
    if (!drawer) {
      return;
    }
    drawer.classList.remove('hidden');
    drawer.classList.add('flex');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    var drawer = document.querySelector('[data-farsha-filter-drawer]');
    if (!drawer) {
      return;
    }
    drawer.classList.add('hidden');
    drawer.classList.remove('flex');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function statusLabel(status) {
    if (status === 'available') return 'Tersedia';
    if (status === 'rented') return 'Disewa';
    if (status === 'maintenance') return 'Perbaikan';
    return 'Arsip';
  }

  function formatPrice(price) {
    try {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    } catch {
      return 'Rp ' + String(price || 0);
    }
  }

  function cleanPhone(phone) {
    return String(phone || '').replace(/[^0-9]/g, '');
  }

  function appendText(parent, tagName, className, text) {
    var element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function closeModal() {
    var existing = document.querySelector('[data-farsha-fallback-modal]');
    if (existing) {
      existing.parentNode.removeChild(existing);
    }
    document.body.style.overflow = '';
  }

  function openModal(product) {
    var catalog = document.querySelector('[data-farsha-catalog]');
    var phone = cleanPhone(catalog ? catalog.getAttribute('data-farsha-phone') : '');
    var imageUrls = product.imageUrls && product.imageUrls.length ? product.imageUrls : [];
    var imageUrl = imageUrls.length ? imageUrls[0] : '';

    closeModal();

    var overlay = document.createElement('div');
    overlay.setAttribute('data-farsha-fallback-modal', 'true');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center';
    overlay.style.background = 'rgba(0, 0, 0, 0.6)';
    overlay.style.padding = '12px';

    var backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', 'Tutup detail');
    backdrop.className = 'absolute inset-0 h-full w-full cursor-default';
    backdrop.addEventListener('click', closeModal);
    overlay.appendChild(backdrop);

    var modal = document.createElement('div');
    modal.className = 'theme-surface theme-border relative z-10 w-full overflow-y-auto border shadow-2xl';
    modal.style.maxWidth = '56rem';
    modal.style.maxHeight = '92vh';
    overlay.appendChild(modal);

    var closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Tutup');
    closeButton.className = 'theme-surface theme-border absolute right-4 top-4 z-20 border p-2.5';
    closeButton.textContent = 'X';
    closeButton.addEventListener('click', closeModal);
    modal.appendChild(closeButton);

    if (imageUrl) {
      var imageWrap = document.createElement('div');
      imageWrap.className = 'theme-soft-surface w-full overflow-hidden';
      var image = document.createElement('img');
      image.src = imageUrl;
      image.alt = product.name || '';
      image.className = 'w-full';
      image.style.height = '320px';
      image.style.objectFit = 'contain';
      imageWrap.appendChild(image);
      modal.appendChild(imageWrap);
    }

    var content = document.createElement('div');
    content.className = 'p-5 sm:p-6';
    modal.appendChild(content);

    var meta = document.createElement('div');
    meta.className = 'mb-3 flex flex-wrap gap-2';
    var codeLabel = appendText(meta, 'span', 'px-2.5 py-0.5 text-xs font-mono uppercase tracking-widest', product.code || '');
    codeLabel.style.background = 'var(--theme-text)';
    codeLabel.style.color = 'var(--theme-surface)';
    appendText(meta, 'span', 'theme-border border px-2.5 py-0.5 text-xs font-semibold', statusLabel(product.status));
    content.appendChild(meta);

    var title = appendText(content, 'h2', 'font-serif text-2xl font-semibold leading-tight', product.name || '');
    title.style.color = 'var(--theme-text)';
    appendText(content, 'p', 'theme-muted-strong mt-4 text-sm leading-relaxed', product.description || '');

    var specs = document.createElement('div');
    specs.className = 'theme-border my-5 grid grid-cols-2 gap-3 border-y py-4 text-sm';
    appendText(specs, 'span', 'theme-muted font-mono text-[10px] uppercase tracking-wider', 'Model');
    appendText(specs, 'strong', '', product.model || '-').style.color = 'var(--theme-text)';
    appendText(specs, 'span', 'theme-muted font-mono text-[10px] uppercase tracking-wider', 'Warna');
    appendText(specs, 'strong', '', product.color || '-').style.color = 'var(--theme-text)';
    appendText(specs, 'span', 'theme-muted font-mono text-[10px] uppercase tracking-wider', 'Ukuran');
    appendText(specs, 'strong', '', product.size || '-').style.color = 'var(--theme-text)';
    appendText(specs, 'span', 'theme-muted font-mono text-[10px] uppercase tracking-wider', 'Harga');
    appendText(specs, 'strong', '', formatPrice(product.rentalPrice)).style.color = 'var(--theme-text)';
    content.appendChild(specs);

    var link = document.createElement('a');
    var message = 'Halo, saya tertarik dengan ' + (product.name || '') + ' (kode: ' + (product.code || '') + '). Apakah masih tersedia?';
    link.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className =
      'theme-primary-action flex items-center justify-center px-6 py-3.5 text-sm font-semibold uppercase tracking-wider';
    link.textContent = 'Cek Ketersediaan';
    content.appendChild(link);

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  function parseProduct(card) {
    try {
      return JSON.parse(card.getAttribute('data-farsha-product') || '{}');
    } catch {
      return null;
    }
  }

  function initSavedGrid() {
    if (isHydrated()) {
      return;
    }
    var saved = Number(safeGet(storageKey));
    if (saved === 1 || saved === 2 || saved === 3) {
      setGrid(saved);
    }
  }

  document.addEventListener('click', function (event) {
    if (isHydrated()) {
      return;
    }

    var target = event.target;
    var gridButton = closest(target, '[data-farsha-grid-option]');
    if (gridButton) {
      event.preventDefault();
      setGrid(gridButton.getAttribute('data-farsha-grid-option'));
      return;
    }

    if (closest(target, '[data-farsha-filter-open]')) {
      event.preventDefault();
      openDrawer();
      return;
    }

    if (closest(target, '[data-farsha-filter-close]')) {
      event.preventDefault();
      closeDrawer();
      return;
    }

    var card = closest(target, '[data-farsha-card]');
    if (card) {
      var product = parseProduct(card);
      if (product) {
        event.preventDefault();
        openModal(product);
      }
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeModal();
      closeDrawer();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.setTimeout(initSavedGrid, 1000);
    });
  } else {
    window.setTimeout(initSavedGrid, 1000);
  }
})();

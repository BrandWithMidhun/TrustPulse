/**
 * Social Proof Popups - Storefront Widget
 * This script is injected into the merchant's storefront
 */
(function () {
  'use strict';

  // Config injected by Shopify app
  const APP_URL = '{{APP_URL}}';
  const SHOP_DOMAIN = Shopify.shop;

  let config = null;
  let orders = [];
  let liveVisitors = 0;
  let popupEl = null;
  let sessionId = generateSessionId();
  let popupsShown = 0;
  let orderIndex = 0;
  let isVisible = false;
  let hideTimer = null;
  let nextTimer = null;

  // ─── INIT ────────────────────────────────────────────────────────────────────

  async function init() {
    try {
      const res = await fetch(`${APP_URL}/api/popup-data?shop=${SHOP_DOMAIN}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.enabled) return;

      config = data.settings;
      orders = data.recentOrders || [];
      liveVisitors = data.liveVisitors || 5;

      if (config.mobileEnabled === false && isMobile()) return;

      injectStyles();
      createPopupElement();

      setTimeout(() => {
        scheduleNextPopup(0);
      }, (config.showDelay || 3) * 1000);
    } catch (e) {
      // Silently fail - never break the storefront
    }
  }

  // ─── POPUP SCHEDULING ────────────────────────────────────────────────────────

  function scheduleNextPopup(delay) {
    if (nextTimer) clearTimeout(nextTimer);
    if (config.maxPopups > 0 && popupsShown >= config.maxPopups) return;

    nextTimer = setTimeout(() => {
      showNextPopup();
    }, delay * 1000);
  }

  function showNextPopup() {
    const type = config.displayType;

    if (type === 'recent_sales' || (type === 'mixed' && Math.random() > 0.4)) {
      if (orders.length === 0) return;
      showSalesPopup(orders[orderIndex % orders.length]);
      orderIndex++;
    } else if (type === 'live_visitors') {
      showVisitorPopup();
    } else if (type === 'add_to_cart') {
      if (orders.length === 0) return;
      showCartPopup(orders[orderIndex % orders.length]);
      orderIndex++;
    } else if (type === 'mixed') {
      showVisitorPopup();
    }
  }

  // ─── POPUP DISPLAY TYPES ─────────────────────────────────────────────────────

  function showSalesPopup(order) {
    if (!order) return;

    const timeAgo = getTimeAgo(new Date(order.orderCreatedAt));
    const location = [order.customerCity, order.customerCountry].filter(Boolean).join(', ');

    const headline = config.customHeadline || `${order.customerName} in ${order.customerCity || 'somewhere'} purchased`;

    showPopup({
      icon: order.productImage ? `<img src="${order.productImage}" alt="${order.productTitle}" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>` : '🛍️',
      headline: config.showLocation && location ? `${order.customerName} in ${location}` : order.customerName,
      title: order.productTitle,
      subtitle: config.showTimeAgo ? timeAgo : '',
      type: 'recent_sales',
      productHandle: order.productHandle,
    });
  }

  function showVisitorPopup() {
    const count = liveVisitors + Math.floor(Math.random() * 5);
    showPopup({
      icon: '👥',
      headline: 'People are viewing this',
      title: `${count} people are looking right now`,
      subtitle: 'Join them before it\'s gone',
      type: 'live_visitors',
    });
  }

  function showCartPopup(order) {
    if (!order) return;
    const timeAgo = getTimeAgo(new Date(order.orderCreatedAt), true);
    showPopup({
      icon: '🛒',
      headline: 'Recently added to cart',
      title: order.productTitle,
      subtitle: timeAgo,
      type: 'add_to_cart',
    });
  }

  // ─── POPUP RENDERING ─────────────────────────────────────────────────────────

  function showPopup(data) {
    if (!popupEl) return;
    if (isVisible) hidePopup(true);

    // Update content
    const iconEl = popupEl.querySelector('.sp-icon');
    const headlineEl = popupEl.querySelector('.sp-headline');
    const titleEl = popupEl.querySelector('.sp-title');
    const subtitleEl = popupEl.querySelector('.sp-subtitle');
    const progressEl = popupEl.querySelector('.sp-progress-bar');

    if (iconEl) iconEl.innerHTML = data.icon;
    if (headlineEl) headlineEl.textContent = data.headline;
    if (titleEl) titleEl.textContent = data.title;
    if (subtitleEl) {
      subtitleEl.textContent = data.subtitle;
      subtitleEl.style.display = data.subtitle ? 'block' : 'none';
    }

    // Reset + animate progress bar
    if (progressEl) {
      progressEl.style.transition = 'none';
      progressEl.style.width = '100%';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          progressEl.style.transition = `width ${config.displayDuration}s linear`;
          progressEl.style.width = '0%';
        });
      });
    }

    // Click handler
    popupEl.onclick = (e) => {
      if (e.target.closest('.sp-close')) {
        trackEvent('close', data.type);
        hidePopup(false);
        return;
      }
      if (data.productHandle) {
        trackEvent('click', data.type);
        window.location.href = `/products/${data.productHandle}`;
      }
    };

    // Show with animation
    popupEl.style.display = 'flex';
    requestAnimationFrame(() => {
      popupEl.classList.add('sp-visible');
    });

    isVisible = true;
    popupsShown++;
    trackEvent('impression', data.type);

    // Auto hide
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      hidePopup(false);
    }, (config.displayDuration || 6) * 1000);
  }

  function hidePopup(immediate) {
    if (!popupEl || !isVisible) return;
    isVisible = false;

    if (immediate) {
      popupEl.classList.remove('sp-visible');
      popupEl.style.display = 'none';
    } else {
      popupEl.classList.remove('sp-visible');
      setTimeout(() => {
        if (!isVisible) popupEl.style.display = 'none';
      }, 400);
    }

    // Schedule next
    scheduleNextPopup(config.betweenDelay || 8);
  }

  // ─── DOM CREATION ─────────────────────────────────────────────────────────────

  function createPopupElement() {
    popupEl = document.createElement('div');
    popupEl.id = 'sp-popup';
    popupEl.className = `sp-popup sp-${config.position}`;

    popupEl.innerHTML = `
      <div class="sp-progress"></div>
      <button class="sp-close" aria-label="Close">&#x2715;</button>
      <div class="sp-icon-wrap">
        <div class="sp-icon"></div>
      </div>
      <div class="sp-content">
        <div class="sp-headline"></div>
        <div class="sp-title"></div>
        <div class="sp-subtitle"></div>
      </div>
    `;

    // Add a live dot
    const progressBar = document.createElement('div');
    progressBar.className = 'sp-progress-bar';
    popupEl.querySelector('.sp-progress').appendChild(progressBar);

    document.body.appendChild(popupEl);
  }

  function injectStyles() {
    const theme = config.theme;
    let bg, text, accent, shadow;

    if (theme === 'dark') {
      bg = '#1a1a2e'; text = '#ffffff'; accent = '#e94560';
      shadow = '0 12px 40px rgba(0,0,0,0.5)';
    } else if (theme === 'light') {
      bg = '#ffffff'; text = '#1a1a2e'; accent = '#5c6ac4';
      shadow = '0 12px 40px rgba(0,0,0,0.15)';
    } else {
      bg = config.customBgColor || '#1a1a2e';
      text = config.customTextColor || '#ffffff';
      accent = config.customAccentColor || '#e94560';
      shadow = '0 12px 40px rgba(0,0,0,0.4)';
    }

    const positionStyles = {
      'bottom-left': 'bottom: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;',
      'top-left': 'top: 80px; left: 20px;',
      'top-right': 'top: 80px; right: 20px;',
    };
    const posStyle = positionStyles[config.position] || positionStyles['bottom-left'];

    const slideDir = config.position.includes('left') ? 'translateX(-120%)' : 'translateX(120%)';

    const css = `
      #sp-popup {
        position: fixed;
        ${posStyle}
        z-index: 999999;
        display: none;
        align-items: center;
        gap: 12px;
        background: ${bg};
        color: ${text};
        border-radius: 14px;
        padding: 14px 18px 14px 14px;
        max-width: 320px;
        min-width: 260px;
        box-shadow: ${shadow};
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border: 1px solid ${accent}25;
        transform: ${slideDir};
        opacity: 0;
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
        overflow: hidden;
      }
      #sp-popup.sp-visible {
        transform: translateX(0);
        opacity: 1;
      }
      .sp-progress {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: ${accent}30;
      }
      .sp-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, ${accent}, ${accent}88);
        width: 100%;
      }
      .sp-close {
        position: absolute;
        top: 8px; right: 10px;
        background: none;
        border: none;
        color: ${text}60;
        font-size: 14px;
        cursor: pointer;
        padding: 2px 5px;
        line-height: 1;
        transition: color 0.2s;
        z-index: 1;
      }
      .sp-close:hover { color: ${text}; }
      .sp-icon-wrap {
        flex-shrink: 0;
        width: 50px;
        height: 50px;
        border-radius: 10px;
        background: ${accent}20;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        overflow: hidden;
      }
      .sp-content {
        flex: 1;
        min-width: 0;
        padding-right: 16px;
      }
      .sp-headline {
        font-size: 11px;
        color: ${text}70;
        margin-bottom: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sp-title {
        font-size: 13px;
        font-weight: 600;
        color: ${text};
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .sp-subtitle {
        font-size: 11px;
        color: ${accent};
        margin-top: 3px;
        font-weight: 500;
      }
      .sp-live-dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${accent};
        margin-right: 4px;
        animation: sp-pulse 1.5s infinite;
        vertical-align: middle;
      }
      @keyframes sp-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.8); }
      }
      @media (max-width: 480px) {
        #sp-popup {
          max-width: calc(100vw - 30px);
          ${config.position.includes('left') ? 'left: 15px;' : 'right: 15px;'}
          ${config.position.includes('bottom') ? 'bottom: 15px;' : 'top: 70px;'}
        }
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'sp-styles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  function getTimeAgo(date, isCart = false) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const verb = isCart ? 'added' : 'purchased';
    if (minutes < 1) return `Just ${verb}`;
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  function isMobile() {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  function generateSessionId() {
    return Math.random().toString(36).substring(2, 11);
  }

  async function trackEvent(type, popupType) {
    try {
      await fetch(`${APP_URL}/api/popup-data?shop=${SHOP_DOMAIN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, popupType, sessionId }),
      });
    } catch (e) {}
  }

  // ─── START ───────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

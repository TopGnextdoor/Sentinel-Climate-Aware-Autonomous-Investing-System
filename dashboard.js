/* ===========================================================
   SENTINEL — Dashboard Logic
   Mock API, Skeleton Loaders, Chart, Animations
   =========================================================== */

(function () {
  'use strict';

  // ──────────────────────────────────────
  // 1. CLOCK
  // ──────────────────────────────────────
  const timeEl = document.getElementById('topbar-time');
  function updateClock() {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ──────────────────────────────────────
  // 2. SIDEBAR NAV
  // ──────────────────────────────────────
  const navLinks = document.querySelectorAll('.sidebar-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', function (e) {
      if (this.getAttribute('href') === '#') {
        e.preventDefault();
        navLinks.forEach((l) => l.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });

  // ──────────────────────────────────────
  // 3. MOCK API — POST /analyze
  // ──────────────────────────────────────
  const mockData = {
    portfolio: { value: '$2,847,392', change: '+12.4%', updatedAgo: '2s' },
    climate: { score: '34', level: 'warn', label: 'Medium' },
    sharpe: { value: '1.87', change: '+0.14' },
    guard: { value: '4', approved: 3, blocked: 1 },
  };

  function simulateAPI() {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockData), 1600);
    });
  }

  // ──────────────────────────────────────
  // 4. POPULATE CARDS
  // ──────────────────────────────────────
  async function loadDashboard() {
    const data = await simulateAPI();

    // Portfolio
    const portfolioCard = document.getElementById('card-portfolio');
    document.getElementById('val-portfolio').innerHTML = data.portfolio.value;
    portfolioCard.classList.remove('skeleton-card');
    portfolioCard.classList.add('loaded');

    // Climate Risk
    const climateCard = document.getElementById('card-climate');
    const climateVal = document.getElementById('val-climate');
    climateVal.innerHTML = `<span style="color: var(--amber)">${data.climate.score}</span><span style="font-size:14px; color: var(--text-muted); margin-left:4px">/ 100</span>`;
    const climateBadge = climateCard.querySelector('.metric-badge');
    climateBadge.className = `metric-badge badge-${data.climate.level}`;
    climateBadge.textContent = data.climate.label;
    climateCard.classList.remove('skeleton-card');
    climateCard.classList.add('loaded');

    // Sharpe
    const sharpeCard = document.getElementById('card-sharpe');
    document.getElementById('val-sharpe').innerHTML = data.sharpe.value;
    sharpeCard.classList.remove('skeleton-card');
    sharpeCard.classList.add('loaded');

    // Guard
    const guardCard = document.getElementById('card-guard');
    document.getElementById('val-guard').innerHTML = data.guard.value;
    guardCard.querySelector('.metric-sub').textContent = `${data.guard.approved} approved · ${data.guard.blocked} blocked`;
    guardCard.classList.remove('skeleton-card');
    guardCard.classList.add('loaded');

    // Reveal content sections
    const skeletonCards = document.querySelectorAll('.skeleton-card');
    skeletonCards.forEach((card, i) => {
      setTimeout(() => {
        card.classList.remove('skeleton-card');
        card.classList.add('loaded');
      }, i * 120);
    });

    // Animate allocation bars
    setTimeout(animateAllocBars, 300);

    // Draw chart
    setTimeout(drawChart, 200);
  }

  loadDashboard();

  // ──────────────────────────────────────
  // 5. ALLOCATION BARS
  // ──────────────────────────────────────
  function animateAllocBars() {
    const fills = document.querySelectorAll('.alloc-fill');
    fills.forEach((fill, i) => {
      setTimeout(() => {
        const targetWidth = fill.style.getPropertyValue('--target-width');
        fill.style.width = targetWidth;
      }, i * 150);
    });
  }

  // ──────────────────────────────────────
  // 6. PERFORMANCE CHART (Animated Canvas 2D)
  // ──────────────────────────────────────
  let chartAnimId = null;

  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function drawChart(animate) {
    if (chartAnimId) cancelAnimationFrame(chartAnimId);
    const canvas = document.getElementById('perf-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('chart-container');

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const values = [4.2, -1.8, 3.1, 5.6, -0.9, 2.8, 6.1, 3.4, -2.1, 4.8, 7.2, 5.3];

    const padding = { top: 20, right: 16, bottom: 32, left: 40 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    const maxVal = Math.max(...values.map(Math.abs)) * 1.2;
    const barWidth = (chartW / months.length) * 0.6;
    const gap = chartW / months.length;
    const zeroY = padding.top + chartH / 2;

    const duration = 900;
    const startTime = performance.now();

    function renderFrame(now) {
      const elapsed = now - startTime;
      const rawT = animate !== false ? Math.min(elapsed / duration, 1) : 1;
      const t = easeOutExpo(rawT);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      // Grid lines
      ctx.strokeStyle = 'rgba(164, 190, 92, 0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.stroke();
      }

      // Y-axis labels
      ctx.font = '10px "JetBrains Mono"';
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.textAlign = 'right';
      const yLabels = [maxVal, maxVal / 2, 0, -maxVal / 2, -maxVal];
      yLabels.forEach((val, i) => {
        const y = padding.top + (chartH / 4) * i;
        ctx.fillText(val.toFixed(1) + '%', padding.left - 6, y + 3);
      });

      // Zero line
      ctx.strokeStyle = 'rgba(164, 190, 92, 0.15)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, zeroY);
      ctx.lineTo(W - padding.right, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Animated Bars — each bar staggers in
      months.forEach((month, i) => {
        const stagger = Math.max(0, (t - i * 0.04));
        const barT = Math.min(stagger / (1 - months.length * 0.04 + 0.04), 1);
        const x = padding.left + gap * i + (gap - barWidth) / 2;
        const fullBarH = (values[i] / maxVal) * (chartH / 2);
        const barH = fullBarH * barT;
        const y = values[i] >= 0 ? zeroY - barH : zeroY;
        const h = Math.abs(barH);

        if (h < 0.5) { ctx.font = '10px "JetBrains Mono"'; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.textAlign = 'center'; ctx.fillText(month, x + barWidth / 2, H - padding.bottom + 16); return; }

        const grad = ctx.createLinearGradient(x, y, x, y + h);
        if (values[i] >= 0) {
          grad.addColorStop(0, 'rgba(164, 190, 92, 0.8)');
          grad.addColorStop(1, 'rgba(164, 190, 92, 0.3)');
        } else {
          grad.addColorStop(0, 'rgba(248, 113, 113, 0.3)');
          grad.addColorStop(1, 'rgba(248, 113, 113, 0.8)');
        }

        ctx.fillStyle = grad;
        roundedRect(ctx, x, y, barWidth, h, 3);
        ctx.fill();

        if (values[i] >= 0) {
          ctx.shadowColor = 'rgba(164, 190, 92, 0.3)';
          ctx.shadowBlur = 8;
          ctx.fillStyle = grad;
          roundedRect(ctx, x, y, barWidth, h, 3);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.font = '10px "JetBrains Mono"';
        ctx.fillStyle = `rgba(255,255,255,${0.3 * barT})`;
        ctx.textAlign = 'center';
        ctx.fillText(month, x + barWidth / 2, H - padding.bottom + 16);
      });

      ctx.restore();
      if (rawT < 1) chartAnimId = requestAnimationFrame(renderFrame);
    }

    chartAnimId = requestAnimationFrame(renderFrame);
  }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Redraw on resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(drawChart, 200);
  });

  // ──────────────────────────────────────
  // 7. TAB SWITCHING (Chart tabs)
  // ──────────────────────────────────────
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
})();

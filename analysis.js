/* ===========================================================
   SENTINEL — Analysis Pipeline Logic
   Stepper Animation, Agent Data Streaming, Canvas Charts
   =========================================================== */

(function () {
  'use strict';

  // ──────────────────────────────────────
  // 1. PIPELINE STEPPER ANIMATION
  // ──────────────────────────────────────
  const steps = document.querySelectorAll('.step-node');
  const progressLine = document.getElementById('stepper-progress');
  const totalSteps = steps.length;

  // Calculate max width for the progress line
  function getMaxLineWidth() {
    const stepper = document.getElementById('stepper');
    const stepperRect = stepper.getBoundingClientRect();
    return stepperRect.width - 88; // subtract left+right padding offset
  }

  let currentStep = 0;
  const stepDelay = 800; // ms between each step activation

  function activateStep(index) {
    if (index >= totalSteps) {
      // All done — reveal ArmourIQ
      revealArmourIQ();
      return;
    }

    // Mark previous as completed
    if (index > 0) {
      steps[index - 1].classList.remove('active', 'processing');
      steps[index - 1].classList.add('completed');
    }

    // Mark current as processing then active
    steps[index].classList.add('processing');
    setTimeout(() => {
      steps[index].classList.remove('processing');
      steps[index].classList.add('active');
    }, 300);

    // Animate progress line
    const progress = ((index) / (totalSteps - 1)) * 100;
    const maxWidth = getMaxLineWidth();
    progressLine.style.width = (maxWidth * progress / 100) + 'px';

    // Reveal corresponding agent card
    revealAgentCard(index);

    currentStep = index;
  }

  function runPipeline() {
    // Reset
    steps.forEach(s => s.classList.remove('active', 'completed', 'processing'));
    progressLine.style.width = '0px';
    document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('visible'));
    currentStep = 0;

    // Sequentially activate each step
    for (let i = 0; i < totalSteps; i++) {
      setTimeout(() => activateStep(i), i * stepDelay);
    }
    // After all steps, trigger final completion
    setTimeout(() => activateStep(totalSteps), totalSteps * stepDelay);
  }

  // Run on load
  setTimeout(runPipeline, 400);

  // Re-run button
  const runBtn = document.getElementById('btn-run-analysis');
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      runPipeline();
    });
  }

  // ──────────────────────────────────────
  // 2. REVEAL AGENT CARDS
  // ──────────────────────────────────────
  const agentCards = [
    document.getElementById('card-climate-agent'),
    document.getElementById('card-financial-agent'),
    document.getElementById('card-montecarlo'),
  ];

  function revealAgentCard(stepIndex) {
    // Map step indices to agent cards
    // Step 0 → Climate (card 0), Step 1 → Financial (card 1), Step 2 → Monte Carlo (card 2)
    if (stepIndex < agentCards.length && agentCards[stepIndex]) {
      setTimeout(() => {
        agentCards[stepIndex].classList.add('visible');
        // Draw charts after reveal
        if (stepIndex === 0) drawESGChart();
        if (stepIndex === 1) populateMetricsTable();
        if (stepIndex === 2) drawMonteCarloChart();
      }, 400);
    }
  }

  // ──────────────────────────────────────
  // 3. ESG BAR CHART (Animated)
  // ──────────────────────────────────────
  const esgData = [
    { ticker: 'TSLA', score: 82, threshold: 50 },
    { ticker: 'AAPL', score: 74, threshold: 50 },
    { ticker: 'XOM', score: 28, threshold: 50 },
    { ticker: 'ENPH', score: 88, threshold: 50 },
    { ticker: 'CVX', score: 22, threshold: 50 },
    { ticker: 'NEE', score: 91, threshold: 50 },
  ];

  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  let esgAnimId = null;

  function drawESGChart() {
    if (esgAnimId) cancelAnimationFrame(esgAnimId);
    const canvas = document.getElementById('esg-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const W = rect.width - 10;
    const H = 180;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';

    const padding = { top: 12, right: 12, bottom: 28, left: 36 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;
    const barCount = esgData.length;
    const gap = chartW / barCount;
    const barWidth = gap * 0.55;
    const duration = 800;
    const startTime = performance.now();

    function renderFrame(now) {
      const rawT = Math.min((now - startTime) / duration, 1);
      const t = easeOutExpo(rawT);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(dpr, dpr);

      // Grid
      ctx.strokeStyle = 'rgba(164,190,92,0.06)'; ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) { const y = padding.top + (chartH / 4) * i; ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(W - padding.right, y); ctx.stroke(); }

      // Y labels
      ctx.font = '10px "JetBrains Mono"'; ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.textAlign = 'right';
      [100,75,50,25,0].forEach((v,i) => { ctx.fillText(v, padding.left - 6, padding.top + (chartH/4)*i + 3); });

      // Threshold
      const thresholdY = padding.top + chartH * 0.5;
      ctx.strokeStyle = 'rgba(248,113,113,0.3)'; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(padding.left, thresholdY); ctx.lineTo(W - padding.right, thresholdY); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '9px "JetBrains Mono"'; ctx.fillStyle = 'rgba(248,113,113,0.5)'; ctx.textAlign = 'left';
      ctx.fillText('THRESHOLD', W - padding.right - 60, thresholdY - 4);

      // Animated Bars
      esgData.forEach((item, i) => {
        const stagger = Math.max(0, t - i * 0.08);
        const barT = Math.min(stagger / 0.52, 1);
        const x = padding.left + gap * i + (gap - barWidth) / 2;
        const barH = (item.score / 100) * chartH * barT;
        const y = padding.top + chartH - barH;
        const isBelow = item.score < item.threshold;
        if (barH < 1) { ctx.restore(); return; }

        const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH);
        grad.addColorStop(0, isBelow ? 'rgba(248,113,113,0.8)' : 'rgba(52,211,153,0.8)');
        grad.addColorStop(1, isBelow ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)');
        ctx.fillStyle = grad; roundRect(ctx, x, y, barWidth, barH, 3); ctx.fill();
        ctx.shadowColor = isBelow ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)'; ctx.shadowBlur = 6;
        roundRect(ctx, x, y, barWidth, barH, 3); ctx.fill(); ctx.shadowBlur = 0;

        ctx.font = '10px "JetBrains Mono"'; ctx.textAlign = 'center';
        ctx.fillStyle = isBelow ? `rgba(248,113,113,${0.9*barT})` : `rgba(52,211,153,${0.9*barT})`;
        ctx.fillText(item.score, x + barWidth / 2, y - 5);
        ctx.fillStyle = isBelow ? `rgba(248,113,113,${0.6*barT})` : `rgba(255,255,255,${0.35*barT})`;
        ctx.fillText(item.ticker, x + barWidth / 2, H - padding.bottom + 14);
      });

      ctx.restore();
      if (rawT < 1) esgAnimId = requestAnimationFrame(renderFrame);
    }
    esgAnimId = requestAnimationFrame(renderFrame);
  }

  // ──────────────────────────────────────
  // 4. METRICS TABLE (Financial Agent)
  // ──────────────────────────────────────
  const metricsData = [
    { ticker: 'TSLA', momentum: { val: '+8.4%', type: 'up' }, rsi: 62, trend: 'Bullish', pe: 48.2 },
    { ticker: 'XOM', momentum: { val: '-3.1%', type: 'down' }, rsi: 38, trend: 'Bearish', pe: 12.8 },
    { ticker: 'ENPH', momentum: { val: '+1.2%', type: 'neutral' }, rsi: 51, trend: 'Sideways', pe: 34.6 },
    { ticker: 'AAPL', momentum: { val: '+5.7%', type: 'up' }, rsi: 58, trend: 'Bullish', pe: 28.4 },
    { ticker: 'NEE', momentum: { val: '+6.3%', type: 'up' }, rsi: 64, trend: 'Bullish', pe: 22.1 },
  ];

  function populateMetricsTable() {
    const tbody = document.getElementById('metrics-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    metricsData.forEach((row, i) => {
      const tr = document.createElement('tr');
      tr.style.opacity = '0';
      tr.style.transform = 'translateY(8px)';
      tr.style.transition = `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s`;

      const trendClass = row.trend.toLowerCase();
      const rsiColor = row.rsi > 70 ? 'down' : row.rsi < 30 ? 'down' : 'up';

      tr.innerHTML = `
        <td class="ticker-cell">${row.ticker}</td>
        <td><span class="tbl-badge ${row.momentum.type}">${row.momentum.val}</span></td>
        <td><span class="tbl-badge ${rsiColor}">${row.rsi}</span></td>
        <td><span class="tbl-badge ${trendClass}">${row.trend}</span></td>
        <td>${row.pe}</td>
      `;
      tbody.appendChild(tr);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          tr.style.opacity = '1';
          tr.style.transform = 'translateY(0)';
        });
      });
    });
  }

  // ──────────────────────────────────────
  // 5. MONTE CARLO HISTOGRAM
  // ──────────────────────────────────────
  let mcAnimId = null;
  // Pre-generate stable histogram data
  const mcBins = 30;
  const mcCenter = mcBins / 2;
  const mcData = [];
  for (let i = 0; i < mcBins; i++) {
    const dist = Math.abs(i - mcCenter) / mcCenter;
    mcData.push(Math.exp(-dist * dist * 4) * (0.7 + Math.random() * 0.3));
  }

  function drawMonteCarloChart() {
    if (mcAnimId) cancelAnimationFrame(mcAnimId);
    const canvas = document.getElementById('mc-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const W = rect.width - 10; const H = 180;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';

    const padding = { top: 12, right: 12, bottom: 24, left: 12 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;
    const barW = chartW / mcBins - 1;
    const centerX = padding.left + chartW / 2;
    const expectedBin = Math.floor(mcCenter + (mcCenter * 0.45));
    const expectedX = padding.left + (chartW / mcBins) * expectedBin;
    const duration = 700;
    const startTime = performance.now();

    function renderFrame(now) {
      const rawT = Math.min((now - startTime) / duration, 1);
      const t = easeOutExpo(rawT);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(dpr, dpr);

      // Zero line
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(centerX, padding.top); ctx.lineTo(centerX, H - padding.bottom); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '9px "JetBrains Mono"'; ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.textAlign = 'center';
      ctx.fillText('0%', centerX, H - padding.bottom + 14);
      ctx.fillText('-10%', padding.left + 20, H - padding.bottom + 14);
      ctx.fillText('+15%', W - padding.right - 20, H - padding.bottom + 14);

      // Animated bars — sweep from center outward
      mcData.forEach((val, i) => {
        const distFromCenter = Math.abs(i - mcCenter) / mcCenter;
        const barDelay = distFromCenter * 0.4;
        const barT = Math.max(0, Math.min((t - barDelay) / 0.6, 1));
        const x = padding.left + (chartW / mcBins) * i;
        const barH = val * chartH * barT;
        const y = padding.top + chartH - barH;
        const isProfit = i >= mcCenter;
        if (barH < 0.5) return;

        const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH);
        grad.addColorStop(0, isProfit ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)');
        grad.addColorStop(1, isProfit ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)');
        ctx.fillStyle = grad; roundRect(ctx, x, y, barW, barH, 2); ctx.fill();
        ctx.shadowColor = isProfit ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'; ctx.shadowBlur = 4;
        roundRect(ctx, x, y, barW, barH, 2); ctx.fill(); ctx.shadowBlur = 0;
      });

      // Expected return marker (fade in)
      const markerAlpha = Math.max(0, (t - 0.5) * 2);
      ctx.strokeStyle = `rgba(164,190,92,${0.6 * markerAlpha})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(expectedX, padding.top); ctx.lineTo(expectedX, H - padding.bottom); ctx.stroke();
      ctx.font = '9px "JetBrains Mono"'; ctx.fillStyle = `rgba(164,190,92,${0.7 * markerAlpha})`; ctx.textAlign = 'center';
      ctx.fillText('E[R]', expectedX, padding.top - 2);

      ctx.restore();
      if (rawT < 1) mcAnimId = requestAnimationFrame(renderFrame);
    }
    mcAnimId = requestAnimationFrame(renderFrame);
  }

  // ──────────────────────────────────────
  // 6. ARMOURIQ POLICY CHECKLIST
  // ──────────────────────────────────────
  const policies = [
    { name: 'ESG Score ≥ 50', pass: true },
    { name: 'Carbon Intensity < 50 tCO₂', pass: true },
    { name: 'Fossil Fuel Exposure < 10%', pass: true },
    { name: 'Sector Concentration < 25%', pass: true },
    { name: 'Single Position < 5%', pass: false },
    { name: 'Liquidity Ratio > 1.2', pass: true },
    { name: 'VaR 95% < 5%', pass: true },
    { name: 'Max Drawdown < 15%', pass: true },
    { name: 'Stranded Asset Risk < 20%', pass: true },
    { name: 'Governance Score > 60', pass: true },
    { name: 'Deforestation Linked = 0', pass: true },
    { name: 'UN Global Compact Aligned', pass: true },
  ];

  function renderPolicies() {
    const grid = document.getElementById('policy-grid');
    if (!grid) return;
    grid.innerHTML = '';

    policies.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'policy-item';
      item.innerHTML = `
        <div class="policy-icon ${p.pass ? 'pass' : 'fail'}">
          ${p.pass
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
          }
        </div>
        <span class="policy-name">${p.name}</span>
      `;
      grid.appendChild(item);
    });
  }

  renderPolicies();

  function revealArmourIQ() {
    // Animate policy items in
    const items = document.querySelectorAll('.policy-item');
    items.forEach((item, i) => {
      setTimeout(() => {
        item.classList.add('visible');
      }, i * 80);
    });
  }

  // ──────────────────────────────────────
  // 7. UTILITY
  // ──────────────────────────────────────
  function roundRect(ctx, x, y, w, h, r) {
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
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      drawESGChart();
      drawMonteCarloChart();
    }, 200);
  });

  // ──────────────────────────────────────
  // 8. SIDEBAR NAV
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
})();

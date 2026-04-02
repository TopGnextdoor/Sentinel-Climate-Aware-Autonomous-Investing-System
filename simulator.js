/* ===========================================================
   SENTINEL — Simulator Logic
   Client-side Monte Carlo, Live Slider Updates, Charts
   =========================================================== */

(function () {
  'use strict';

  // ──────────────────────────────────────
  // DOM REFS
  // ──────────────────────────────────────
  const inputAmount = document.getElementById('input-amount');
  const inputTicker = document.getElementById('input-ticker');
  const selectDuration = document.getElementById('select-duration');
  const sliderVol = document.getElementById('slider-volatility');
  const sliderDrift = document.getElementById('slider-drift');
  const volValue = document.getElementById('vol-value');
  const driftValue = document.getElementById('drift-value');
  const btnSimulate = document.getElementById('btn-simulate');

  const valReturn = document.getElementById('val-return');
  const valWorst = document.getElementById('val-worst');
  const valProfit = document.getElementById('val-profit');
  const valDrawdown = document.getElementById('val-drawdown');

  // ──────────────────────────────────────
  // 1. SLIDER LIVE UPDATES
  // ──────────────────────────────────────
  sliderVol.addEventListener('input', () => {
    volValue.textContent = sliderVol.value + '%';
    updateSimulation();
  });

  sliderDrift.addEventListener('input', () => {
    const v = parseInt(sliderDrift.value);
    driftValue.textContent = (v >= 0 ? '+' : '') + v + '%';
    updateSimulation();
  });

  // Risk profile toggles
  const toggleBtns = document.querySelectorAll('.toggle-btn');
  const riskPresets = {
    conservative: { vol: 15, drift: 4 },
    moderate: { vol: 35, drift: 8 },
    aggressive: { vol: 65, drift: 18 },
  };

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = riskPresets[btn.dataset.value];
      if (preset) {
        sliderVol.value = preset.vol;
        volValue.textContent = preset.vol + '%';
        sliderDrift.value = preset.drift;
        driftValue.textContent = (preset.drift >= 0 ? '+' : '') + preset.drift + '%';
        updateSimulation();
      }
    });
  });

  // Live update on any input change
  inputAmount.addEventListener('input', () => updateSimulation());
  selectDuration.addEventListener('change', () => updateSimulation());

  // ──────────────────────────────────────
  // 2. MONTE CARLO ENGINE (Client-side GBM)
  // ──────────────────────────────────────
  const NUM_PATHS = 10000;
  const CHART_PATHS = 200; // paths to render on chart

  function gaussianRandom() {
    // Box-Muller transform
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function runMonteCarlo(amount, days, annualVol, annualDrift) {
    const dt = 1 / 252; // daily step
    const mu = annualDrift / 100;
    const sigma = annualVol / 100;
    const steps = days;

    const finalValues = new Float64Array(NUM_PATHS);
    const paths = []; // store subset for chart
    const maxDrawdowns = new Float64Array(NUM_PATHS);

    for (let p = 0; p < NUM_PATHS; p++) {
      let price = amount;
      let peak = price;
      let maxDD = 0;
      const isChartPath = p < CHART_PATHS;
      const path = isChartPath ? [price] : null;

      for (let d = 0; d < steps; d++) {
        const z = gaussianRandom();
        const dailyReturn = (mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z;
        price *= Math.exp(dailyReturn);

        if (price > peak) peak = price;
        const dd = (peak - price) / peak;
        if (dd > maxDD) maxDD = dd;

        if (isChartPath) path.push(price);
      }

      finalValues[p] = price;
      maxDrawdowns[p] = maxDD;
      if (isChartPath) paths.push(path);
    }

    // Sort for percentile calculations
    const sorted = Array.from(finalValues).sort((a, b) => a - b);
    const returns = sorted.map(v => ((v - amount) / amount) * 100);

    const expectedReturn = returns.reduce((s, v) => s + v, 0) / returns.length;
    const worstCase5 = returns[Math.floor(returns.length * 0.05)];
    const profitCount = returns.filter(r => r > 0).length;
    const probProfit = (profitCount / returns.length) * 100;
    const avgMaxDD = Array.from(maxDrawdowns).reduce((s, v) => s + v, 0) / maxDrawdowns.length * 100;

    // Percentile paths for chart
    const percentiles = computePercentilePaths(paths, steps);

    return {
      expectedReturn,
      worstCase5,
      probProfit,
      maxDrawdown: avgMaxDD,
      finalAmount: amount * (1 + expectedReturn / 100),
      worstAmount: amount * (1 + worstCase5 / 100),
      profitCount,
      returns,
      paths,
      percentiles,
      steps,
    };
  }

  function computePercentilePaths(paths, steps) {
    const median = [];
    const p10 = [];
    const p90 = [];

    for (let d = 0; d <= steps; d++) {
      const vals = paths.map(p => p[d]).sort((a, b) => a - b);
      median.push(vals[Math.floor(vals.length * 0.5)]);
      p10.push(vals[Math.floor(vals.length * 0.1)]);
      p90.push(vals[Math.floor(vals.length * 0.9)]);
    }

    return { median, p10, p90 };
  }

  // ──────────────────────────────────────
  // 3. UPDATE SIMULATION
  // ──────────────────────────────────────
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  let simResult = null;
  let histAnimId = null;
  let pathAnimId = null;

  function updateSimulation() {
    const amount = parseFloat(inputAmount.value) || 100000;
    const days = parseInt(selectDuration.value);
    const vol = parseInt(sliderVol.value);
    const drift = parseInt(sliderDrift.value);

    simResult = runMonteCarlo(amount, days, vol, drift);
    updateMetrics(simResult, amount);
    drawHistogram(simResult);
    drawPathChart(simResult, amount);
  }

  function updateMetrics(result, amount) {
    // Expected Return
    const retPct = result.expectedReturn.toFixed(1);
    valReturn.textContent = (retPct >= 0 ? '+' : '') + retPct + '%';
    valReturn.className = 'sm-value ' + (retPct >= 0 ? 'green' : 'red');
    valReturn.parentElement.querySelector('.sm-sub').textContent = '$' + Math.round(result.finalAmount).toLocaleString();

    // Worst Case
    const worstPct = result.worstCase5.toFixed(1);
    valWorst.textContent = (worstPct >= 0 ? '+' : '') + worstPct + '%';
    valWorst.className = 'sm-value red';
    valWorst.parentElement.querySelector('.sm-sub').textContent = '$' + Math.round(result.worstAmount).toLocaleString();

    // Prob of Profit
    valProfit.textContent = result.probProfit.toFixed(1) + '%';
    valProfit.className = 'sm-value ' + (result.probProfit >= 50 ? 'green' : 'red');
    valProfit.parentElement.querySelector('.sm-sub').textContent = result.profitCount.toLocaleString() + ' / 10,000 paths';

    // Max Drawdown
    const ddPct = result.maxDrawdown.toFixed(1);
    valDrawdown.textContent = '-' + ddPct + '%';
    valDrawdown.className = 'sm-value red';

    // Flash animation
    document.querySelectorAll('.sim-metric').forEach(m => {
      m.classList.remove('flash');
      void m.offsetWidth; // trigger reflow
      m.classList.add('flash');
    });
  }

  // ──────────────────────────────────────
  // 4. HISTOGRAM CHART (Animated)
  // ──────────────────────────────────────
  function drawHistogram(result) {
    if (histAnimId) cancelAnimationFrame(histAnimId);
    const canvas = document.getElementById('mc-histogram');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const W = container.clientWidth - 40; const H = 200;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';

    const returns = result.returns;
    const bins = 40;
    const min = Math.min(...returns); const max = Math.max(...returns);
    const range = max - min || 1; const binWidth = range / bins;
    const histogram = new Array(bins).fill(0);
    returns.forEach(r => { histogram[Math.min(Math.floor((r - min) / binWidth), bins - 1)]++; });
    const maxCount = Math.max(...histogram);

    const pad = { top: 10, right: 10, bottom: 28, left: 10 };
    const cW = W - pad.left - pad.right; const cH = H - pad.top - pad.bottom;
    const barW = cW / bins - 1;
    const zeroRatio = (0 - min) / range; const zeroX = pad.left + cW * zeroRatio;
    const zeroBin = Math.floor((0 - min) / binWidth);
    const expRatio = (result.expectedReturn - min) / range;
    const expX = pad.left + cW * expRatio;
    const duration = 700; const startTime = performance.now();

    function renderFrame(now) {
      const rawT = Math.min((now - startTime) / duration, 1);
      const t = easeOutExpo(rawT);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(dpr, dpr);

      // Zero line
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(zeroX, pad.top); ctx.lineTo(zeroX, H - pad.bottom); ctx.stroke(); ctx.setLineDash([]);

      // Animated bars — sweep from center
      histogram.forEach((count, i) => {
        const distFromZero = Math.abs(i - zeroBin) / bins;
        const barDelay = distFromZero * 0.35;
        const barT = Math.max(0, Math.min((t - barDelay) / 0.65, 1));
        const x = pad.left + (cW / bins) * i;
        const barH = (count / maxCount) * cH * barT;
        if (barH < 0.5) return;
        const y = pad.top + cH - barH;
        const binCenter = min + (i + 0.5) * binWidth;
        const isProfit = binCenter >= 0;
        const grad = ctx.createLinearGradient(x, y, x, pad.top + cH);
        grad.addColorStop(0, isProfit ? 'rgba(52,211,153,0.75)' : 'rgba(248,113,113,0.75)');
        grad.addColorStop(1, isProfit ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)');
        ctx.fillStyle = grad; roundRect(ctx, x, y, Math.max(barW,1), barH, 2); ctx.fill();
      });

      // Labels
      ctx.font = '9px "JetBrains Mono"'; ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.textAlign = 'center'; ctx.fillText('0%', zeroX, H - pad.bottom + 14);
      ctx.textAlign = 'left'; ctx.fillText(min.toFixed(0) + '%', pad.left, H - pad.bottom + 14);
      ctx.textAlign = 'right'; ctx.fillText('+' + max.toFixed(0) + '%', W - pad.right, H - pad.bottom + 14);

      // E[R] marker (fade in)
      const a = Math.max(0, (t - 0.5) * 2);
      ctx.strokeStyle = `rgba(164,190,92,${0.6*a})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(expX, pad.top); ctx.lineTo(expX, H - pad.bottom); ctx.stroke();
      ctx.font = '9px "JetBrains Mono"'; ctx.fillStyle = `rgba(164,190,92,${0.7*a})`; ctx.textAlign = 'center';
      ctx.fillText('E[R]', expX, pad.top - 2);

      ctx.restore();
      if (rawT < 1) histAnimId = requestAnimationFrame(renderFrame);
    }
    histAnimId = requestAnimationFrame(renderFrame);
  }

  // ──────────────────────────────────────
  // 5. PATH CHART (Animated — line draws L→R)
  // ──────────────────────────────────────
  function drawPathChart(result, amount) {
    if (pathAnimId) cancelAnimationFrame(pathAnimId);
    const canvas = document.getElementById('paths-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const W = container.clientWidth - 40; const H = 240;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';

    const pad = { top: 16, right: 16, bottom: 32, left: 56 };
    const cW = W - pad.left - pad.right; const cH = H - pad.top - pad.bottom;
    const { median, p10, p90 } = result.percentiles;
    const steps = result.steps;
    const allVals = [...p10, ...p90];
    const minVal = Math.min(...allVals) * 0.98; const maxVal = Math.max(...allVals) * 1.02;
    const valRange = maxVal - minVal || 1;
    function xPos(d) { return pad.left + (d / steps) * cW; }
    function yPos(v) { return pad.top + (1 - (v - minVal) / valRange) * cH; }
    const duration = 1000; const startTime = performance.now();

    function renderFrame(now) {
      const rawT = Math.min((now - startTime) / duration, 1);
      const t = easeOutExpo(rawT);
      const drawSteps = Math.floor(t * steps);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(dpr, dpr);

      // Grid
      ctx.strokeStyle = 'rgba(164,190,92,0.05)'; ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) { const y = pad.top + (cH/4)*i; ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(W-pad.right,y); ctx.stroke(); }

      // Y labels
      ctx.font = '10px "JetBrains Mono"'; ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) { const v = maxVal - (valRange/4)*i; ctx.fillText('$' + Math.round(v/1000) + 'k', pad.left - 6, pad.top + (cH/4)*i + 3); }

      // X labels
      ctx.textAlign = 'center';
      [0, Math.round(steps/4), Math.round(steps/2), Math.round(steps*3/4), steps].forEach(d => { ctx.fillText('D'+d, xPos(d), H - pad.bottom + 16); });

      // Start ref
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(pad.left, yPos(amount)); ctx.lineTo(W-pad.right, yPos(amount)); ctx.stroke(); ctx.setLineDash([]);

      // Band (up to drawSteps)
      if (drawSteps > 0) {
        ctx.beginPath();
        for (let d = 0; d <= drawSteps; d++) d === 0 ? ctx.moveTo(xPos(d), yPos(p90[d])) : ctx.lineTo(xPos(d), yPos(p90[d]));
        for (let d = drawSteps; d >= 0; d--) ctx.lineTo(xPos(d), yPos(p10[d]));
        ctx.closePath(); ctx.fillStyle = 'rgba(164,190,92,0.08)'; ctx.fill();

        ctx.strokeStyle = 'rgba(164,190,92,0.15)'; ctx.lineWidth = 1;
        ctx.beginPath(); for (let d = 0; d <= drawSteps; d++) d === 0 ? ctx.moveTo(xPos(d), yPos(p90[d])) : ctx.lineTo(xPos(d), yPos(p90[d])); ctx.stroke();
        ctx.beginPath(); for (let d = 0; d <= drawSteps; d++) d === 0 ? ctx.moveTo(xPos(d), yPos(p10[d])) : ctx.lineTo(xPos(d), yPos(p10[d])); ctx.stroke();
      }

      // Median line
      if (drawSteps > 0) {
        ctx.strokeStyle = 'rgba(164,190,92,0.9)'; ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(164,190,92,0.4)'; ctx.shadowBlur = 6;
        ctx.beginPath();
        for (let d = 0; d <= drawSteps; d++) d === 0 ? ctx.moveTo(xPos(d), yPos(median[d])) : ctx.lineTo(xPos(d), yPos(median[d]));
        ctx.stroke(); ctx.shadowBlur = 0;
      }

      // Endpoint dot (at current tip)
      if (drawSteps > 0) {
        const tipX = xPos(drawSteps); const tipY = yPos(median[drawSteps]);
        ctx.beginPath(); ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#a4be5c'; ctx.fill();
        ctx.strokeStyle = 'rgba(164,190,92,0.4)'; ctx.lineWidth = 6; ctx.stroke();
        if (rawT >= 0.95) {
          ctx.font = '11px "JetBrains Mono"'; ctx.fillStyle = '#a4be5c'; ctx.textAlign = 'left';
          ctx.fillText('$' + Math.round(median[steps]).toLocaleString(), tipX + 10, tipY + 4);
        }
      }

      ctx.restore();
      if (rawT < 1) pathAnimId = requestAnimationFrame(renderFrame);
    }
    pathAnimId = requestAnimationFrame(renderFrame);
  }

  // ──────────────────────────────────────
  // 6. RUN SIMULATION BUTTON
  // ──────────────────────────────────────
  btnSimulate.addEventListener('click', () => {
    btnSimulate.classList.add('running');
    btnSimulate.querySelector('span:last-child').textContent = 'RUNNING...';

    // Simulate API delay
    setTimeout(() => {
      updateSimulation();
      btnSimulate.classList.remove('running');
      btnSimulate.querySelector('span:last-child').textContent = 'RUN SIMULATION';
    }, 800);
  });

  // ──────────────────────────────────────
  // 7. UTILITY
  // ──────────────────────────────────────
  function roundRect(ctx, x, y, w, h, r) {
    if (h < 1) return;
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

  // Resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (simResult) { drawHistogram(simResult); drawPathChart(simResult, parseFloat(inputAmount.value) || 100000); } }, 200);
  });

  // ──────────────────────────────────────
  // 8. INITIAL RUN
  // ──────────────────────────────────────
  setTimeout(updateSimulation, 300);

  // ──────────────────────────────────────
  // 9. SIDEBAR NAV
  // ──────────────────────────────────────
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', function(e) {
      if (this.getAttribute('href') === '#') {
        e.preventDefault();
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });
})();

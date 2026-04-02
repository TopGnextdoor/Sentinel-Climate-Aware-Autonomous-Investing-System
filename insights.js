/* ===========================================================
   SENTINEL — Insights & Climate Impact Logic
   Animated Charts, Heatmap, Gauge, Scatter Plot, Auto-refresh
   =========================================================== */
(function () {
  'use strict';

  // ──────────────────────────────────────
  // DATA
  // ──────────────────────────────────────
  const holdings = [
    { ticker:'NEE',  name:'NextEra Energy',  esg:91, carbon:8,  env:94, soc:88, gov:90, vol:22, ret:12.4, sector:'Utility' },
    { ticker:'ENPH', name:'Enphase Energy',  esg:88, carbon:5,  env:92, soc:85, gov:86, vol:38, ret:18.2, sector:'Solar' },
    { ticker:'TSLA', name:'Tesla Inc.',      esg:82, carbon:18, env:85, soc:78, gov:82, vol:45, ret:24.6, sector:'EV' },
    { ticker:'MSFT', name:'Microsoft',       esg:78, carbon:10, env:80, soc:82, gov:72, vol:20, ret:14.8, sector:'Tech' },
    { ticker:'AAPL', name:'Apple Inc.',      esg:74, carbon:12, env:76, soc:78, gov:68, vol:18, ret:10.2, sector:'Tech' },
    { ticker:'FSLR', name:'First Solar',     esg:72, carbon:14, env:78, soc:70, gov:66, vol:35, ret:16.1, sector:'Solar' },
    { ticker:'BEP',  name:'Brookfield Ren.', esg:85, carbon:6,  env:90, soc:82, gov:84, vol:24, ret:9.8,  sector:'Utility' },
    { ticker:'SEDG', name:'SolarEdge',       esg:70, carbon:16, env:74, soc:68, gov:66, vol:42, ret:20.3, sector:'Solar' },
    { ticker:'AES',  name:'AES Corp.',       esg:65, carbon:32, env:62, soc:68, gov:64, vol:28, ret:8.4,  sector:'Utility' },
    { ticker:'PLUG', name:'Plug Power',      esg:62, carbon:20, env:66, soc:60, gov:58, vol:52, ret:22.5, sector:'Hydrogen' },
    { ticker:'GE',   name:'GE Vernova',      esg:58, carbon:35, env:55, soc:62, gov:56, vol:30, ret:11.2, sector:'Industrial' },
    { ticker:'DUK',  name:'Duke Energy',     esg:52, carbon:42, env:48, soc:58, gov:50, vol:16, ret:6.2,  sector:'Utility' },
    { ticker:'SO',   name:'Southern Co.',    esg:48, carbon:48, env:42, soc:54, gov:48, vol:14, ret:5.8,  sector:'Utility' },
    { ticker:'XOM',  name:'ExxonMobil',      esg:28, carbon:74, env:20, soc:35, gov:30, vol:25, ret:7.6,  sector:'Oil' },
    { ticker:'CVX',  name:'Chevron',         esg:22, carbon:68, env:18, soc:28, gov:22, vol:24, ret:6.8,  sector:'Oil' },
    { ticker:'BP',   name:'BP plc',          esg:30, carbon:65, env:25, soc:38, gov:28, vol:26, ret:4.2,  sector:'Oil' },
    { ticker:'RUN',  name:'Sunrun Inc.',     esg:76, carbon:8,  env:82, soc:72, gov:70, vol:48, ret:15.6, sector:'Solar' },
    { ticker:'NOVA', name:'Sunnova Energy',  esg:68, carbon:10, env:74, soc:64, gov:62, vol:55, ret:19.8, sector:'Solar' },
    { ticker:'ICLN', name:'iShares Clean',   esg:75, carbon:15, env:78, soc:74, gov:72, vol:20, ret:11.0, sector:'ETF' },
    { ticker:'TAN',  name:'Invesco Solar',   esg:80, carbon:12, env:84, soc:76, gov:78, vol:32, ret:14.2, sector:'ETF' },
  ];

  const sectorCarbon = [
    { sector:'Oil & Gas',    carbon:69, color:'rgba(248,113,113,0.8)' },
    { sector:'Utilities',    carbon:38, color:'rgba(251,191,36,0.7)' },
    { sector:'Industrial',   carbon:35, color:'rgba(251,191,36,0.6)' },
    { sector:'Hydrogen',     carbon:20, color:'rgba(164,190,92,0.7)' },
    { sector:'Tech',         carbon:11, color:'rgba(52,211,153,0.6)' },
    { sector:'Solar/Clean',  carbon:10, color:'rgba(52,211,153,0.7)' },
    { sector:'EV',           carbon:18, color:'rgba(52,211,153,0.5)' },
    { sector:'ETF (Green)',  carbon:14, color:'rgba(52,211,153,0.6)' },
  ];

  // ──────────────────────────────────────
  // SHARED HELPERS
  // ──────────────────────────────────────
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function roundRect(ctx, x, y, w, h, r) {
    if (h < 1 || w < 1) return;
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  let esgAnimId = null, carbonAnimId = null, gaugeAnimId = null, scatterAnimId = null;

  // ──────────────────────────────────────
  // 1. ESG LEADERBOARD (Animated bars grow up)
  // ──────────────────────────────────────
  function drawESGLeaderboard() {
    if (esgAnimId) cancelAnimationFrame(esgAnimId);
    const canvas = document.getElementById('esg-leader-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement.clientWidth - 40; const H = 200;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';

    const sorted = [...holdings].sort((a, b) => b.esg - a.esg).slice(0, 8);
    const pad = { top: 8, right: 10, bottom: 26, left: 42 };
    const cW = W - pad.left - pad.right; const cH = H - pad.top - pad.bottom;
    const gap = cW / sorted.length; const barW = gap * 0.55;
    const duration = 800; const startTime = performance.now();

    function render(now) {
      const rawT = Math.min((now - startTime) / duration, 1);
      const t = easeOutExpo(rawT);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(dpr, dpr);

      // Grid
      ctx.strokeStyle = 'rgba(164,190,92,0.06)'; ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) { const y = pad.top + (cH / 4) * i; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke(); }

      // Y labels
      ctx.font = '9px "JetBrains Mono"'; ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.textAlign = 'right';
      [100, 75, 50, 25, 0].forEach((v, i) => { ctx.fillText(v, pad.left - 5, pad.top + (cH / 4) * i + 3); });

      // Animated bars
      sorted.forEach((item, i) => {
        const stagger = Math.max(0, t - i * 0.05);
        const barT = Math.min(stagger / 0.6, 1);
        const x = pad.left + gap * i + (gap - barW) / 2;
        const barH = (item.esg / 100) * cH * barT;
        const y = pad.top + cH - barH;
        const color = item.esg >= 70 ? 'rgba(52,211,153,' : item.esg >= 40 ? 'rgba(251,191,36,' : 'rgba(248,113,113,';
        if (barH < 1) return;
        const grad = ctx.createLinearGradient(x, y, x, pad.top + cH);
        grad.addColorStop(0, color + '0.8)'); grad.addColorStop(1, color + '0.25)');
        ctx.fillStyle = grad; roundRect(ctx, x, y, barW, barH, 3); ctx.fill();
        ctx.shadowColor = color + '0.3)'; ctx.shadowBlur = 6;
        roundRect(ctx, x, y, barW, barH, 3); ctx.fill(); ctx.shadowBlur = 0;
        // Score + Ticker (fade in)
        ctx.font = '9px "JetBrains Mono"'; ctx.textAlign = 'center';
        ctx.fillStyle = color + (0.9 * barT).toFixed(2) + ')';
        ctx.fillText(item.esg, x + barW / 2, y - 4);
        ctx.fillStyle = `rgba(255,255,255,${(0.3 * barT).toFixed(2)})`;
        ctx.fillText(item.ticker, x + barW / 2, H - pad.bottom + 14);
      });

      ctx.restore();
      if (rawT < 1) esgAnimId = requestAnimationFrame(render);
    }
    esgAnimId = requestAnimationFrame(render);
  }

  // ──────────────────────────────────────
  // 2. SECTOR CARBON (Animated horizontal bars)
  // ──────────────────────────────────────
  function drawCarbonChart() {
    if (carbonAnimId) cancelAnimationFrame(carbonAnimId);
    const canvas = document.getElementById('carbon-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement.clientWidth - 40; const H = 200;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';

    const pad = { top: 6, right: 16, bottom: 6, left: 80 };
    const cW = W - pad.left - pad.right; const cH = H - pad.top - pad.bottom;
    const barH = (cH / sectorCarbon.length) * 0.65;
    const gapY = cH / sectorCarbon.length;
    const maxCarbon = Math.max(...sectorCarbon.map(s => s.carbon)) * 1.15;
    const duration = 800; const startTime = performance.now();

    function render(now) {
      const rawT = Math.min((now - startTime) / duration, 1);
      const t = easeOutExpo(rawT);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(dpr, dpr);

      sectorCarbon.forEach((item, i) => {
        const stagger = Math.max(0, t - i * 0.06);
        const barT = Math.min(stagger / 0.52, 1);
        const y = pad.top + gapY * i + (gapY - barH) / 2;
        const bW = (item.carbon / maxCarbon) * cW * barT;
        if (bW < 1) return;
        const grad = ctx.createLinearGradient(pad.left, y, pad.left + bW, y);
        grad.addColorStop(0, item.color); grad.addColorStop(1, item.color.replace(/[\d.]+\)$/, '0.15)'));
        ctx.fillStyle = grad; roundRect(ctx, pad.left, y, bW, barH, 3); ctx.fill();
        ctx.shadowColor = item.color.replace(/[\d.]+\)$/, '0.25)'); ctx.shadowBlur = 4;
        roundRect(ctx, pad.left, y, bW, barH, 3); ctx.fill(); ctx.shadowBlur = 0;
        // Labels
        ctx.font = '10px "JetBrains Mono"'; ctx.fillStyle = `rgba(255,255,255,${(0.4 * barT).toFixed(2)})`; ctx.textAlign = 'right';
        ctx.fillText(item.sector, pad.left - 6, y + barH / 2 + 3);
        ctx.fillStyle = item.color; ctx.textAlign = 'left';
        ctx.fillText(item.carbon, pad.left + bW + 6, y + barH / 2 + 3);
      });

      ctx.restore();
      if (rawT < 1) carbonAnimId = requestAnimationFrame(render);
    }
    carbonAnimId = requestAnimationFrame(render);
  }

  // ──────────────────────────────────────
  // 3. CLIMATE GAUGE (Animated sweep)
  // ──────────────────────────────────────
  function drawGauge(score) {
    if (gaugeAnimId) cancelAnimationFrame(gaugeAnimId);
    const canvas = document.getElementById('gauge-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 180;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';

    const cx = size / 2, cy = size / 2, r = 70, lw = 10;
    const startAngle = 0.75 * Math.PI; const endAngle = 2.25 * Math.PI;
    const totalArc = endAngle - startAngle;
    const targetProgress = Math.min(score / 100, 1);
    const color = score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171';
    const valEl = document.getElementById('gauge-value');
    const duration = 1000; const startTime = performance.now();

    function render(now) {
      const rawT = Math.min((now - startTime) / duration, 1);
      const t = easeOutExpo(rawT);
      const currentProgress = targetProgress * t;
      const progressAngle = startAngle + totalArc * currentProgress;
      const currentScore = Math.round(score * t);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(dpr, dpr);

      // Background arc
      ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(164,190,92,0.08)'; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();

      // Score arc
      const grad = ctx.createLinearGradient(0, size, size, 0);
      grad.addColorStop(0, color); grad.addColorStop(1, score >= 70 ? '#a4be5c' : color);
      ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, progressAngle);
      ctx.strokeStyle = grad; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();

      // Glow
      ctx.shadowColor = color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, progressAngle);
      ctx.strokeStyle = grad; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
      ctx.shadowBlur = 0;

      // Endpoint dot
      const dotX = cx + r * Math.cos(progressAngle);
      const dotY = cy + r * Math.sin(progressAngle);
      ctx.beginPath(); ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.stroke();

      ctx.restore();

      // Counter text
      if (valEl) { valEl.textContent = currentScore; valEl.style.color = color; }

      if (rawT < 1) gaugeAnimId = requestAnimationFrame(render);
    }
    gaugeAnimId = requestAnimationFrame(render);
  }

  // ──────────────────────────────────────
  // 4. HEATMAP (Cells stagger in)
  // ──────────────────────────────────────
  function buildHeatmap() {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;
    grid.innerHTML = '';

    holdings.forEach((h, idx) => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';

      let bg;
      if (h.esg >= 80) bg = 'rgba(22, 101, 52, 0.6)';
      else if (h.esg >= 70) bg = 'rgba(52, 211, 153, 0.25)';
      else if (h.esg >= 55) bg = 'rgba(164, 190, 92, 0.2)';
      else if (h.esg >= 40) bg = 'rgba(251, 191, 36, 0.2)';
      else bg = 'rgba(248, 113, 113, 0.2)';

      let borderColor;
      if (h.esg >= 70) borderColor = 'rgba(52,211,153,0.2)';
      else if (h.esg >= 40) borderColor = 'rgba(251,191,36,0.2)';
      else borderColor = 'rgba(248,113,113,0.25)';

      cell.style.background = bg;
      cell.style.borderColor = borderColor;
      // Staggered entrance animation
      cell.style.opacity = '0';
      cell.style.transform = 'translateY(12px) scale(0.95)';
      cell.style.transition = `opacity 0.4s ease ${idx * 40}ms, transform 0.4s ease ${idx * 40}ms`;

      const scoreColor = h.esg >= 70 ? '#34d399' : h.esg >= 40 ? '#fbbf24' : '#f87171';

      cell.innerHTML = `
        <span class="hm-ticker">${h.ticker}</span>
        <span class="hm-score" style="color:${scoreColor}">ESG ${h.esg}</span>
        <div class="hm-tooltip">
          <div class="hm-tt-title">${h.name}</div>
          <div class="hm-tt-row"><span>Environmental</span><span class="hm-tt-val" style="color:${scoreColor}">${h.env}</span></div>
          <div class="hm-tt-row"><span>Social</span><span class="hm-tt-val" style="color:${scoreColor}">${h.soc}</span></div>
          <div class="hm-tt-row"><span>Governance</span><span class="hm-tt-val" style="color:${scoreColor}">${h.gov}</span></div>
          <div class="hm-tt-row"><span>Carbon tCO₂e/TJ</span><span class="hm-tt-val">${h.carbon}</span></div>
          <div class="hm-tt-row"><span>Sector</span><span class="hm-tt-val">${h.sector}</span></div>
        </div>
      `;
      grid.appendChild(cell);

      // Trigger entrance
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cell.style.opacity = '1';
          cell.style.transform = 'translateY(0) scale(1)';
        });
      });
    });
  }

  // ──────────────────────────────────────
  // 5. SCATTER PLOT (Bubbles pop in)
  // ──────────────────────────────────────
  function drawScatter() {
    if (scatterAnimId) cancelAnimationFrame(scatterAnimId);
    const canvas = document.getElementById('scatter-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement.clientWidth - 40; const H = 260;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';

    const pad = { top: 16, right: 16, bottom: 32, left: 44 };
    const cW = W - pad.left - pad.right; const cH = H - pad.top - pad.bottom;
    const maxVol = 60, maxRet = 28;
    const duration = 900; const startTime = performance.now();

    function render(now) {
      const rawT = Math.min((now - startTime) / duration, 1);
      const t = easeOutExpo(rawT);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(dpr, dpr);

      // Grid
      ctx.strokeStyle = 'rgba(164,190,92,0.05)'; ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (cH / 4) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
        const x = pad.left + (cW / 4) * i;
        ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, H - pad.bottom); ctx.stroke();
      }

      // Axis labels
      ctx.font = '9px "JetBrains Mono"'; ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) { ctx.fillText((maxRet - (maxRet / 4) * i).toFixed(0) + '%', pad.left - 5, pad.top + (cH / 4) * i + 3); }
      ctx.textAlign = 'center';
      for (let i = 0; i <= 4; i++) { ctx.fillText(((maxVol / 4) * i).toFixed(0) + '%', pad.left + (cW / 4) * i, H - pad.bottom + 16); }
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillText('Volatility →', pad.left + cW / 2, H - 4);

      // Animated bubbles — pop in with stagger
      holdings.forEach((h, idx) => {
        const stagger = Math.max(0, t - idx * 0.03);
        const bubT = Math.min(stagger / 0.4, 1);
        if (bubT <= 0) return;
        const x = pad.left + (h.vol / maxVol) * cW;
        const y = pad.top + (1 - h.ret / maxRet) * cH;
        const fullR = 4 + (h.esg / 100) * 14;
        const bubbleR = fullR * bubT;
        const color = h.esg >= 70 ? 'rgba(52,211,153,' : h.esg >= 40 ? 'rgba(251,191,36,' : 'rgba(248,113,113,';

        ctx.beginPath(); ctx.arc(x, y, bubbleR, 0, Math.PI * 2);
        ctx.fillStyle = color + (0.2 * bubT).toFixed(2) + ')'; ctx.fill();
        ctx.strokeStyle = color + (0.5 * bubT).toFixed(2) + ')'; ctx.lineWidth = 1.5; ctx.stroke();

        ctx.shadowColor = color + '0.3)'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(x, y, bubbleR, 0, Math.PI * 2);
        ctx.fillStyle = color + '0.15)'; ctx.fill(); ctx.shadowBlur = 0;

        // Label (fade in later)
        if (bubT > 0.5) {
          const labelAlpha = (bubT - 0.5) * 2;
          ctx.font = '8px "JetBrains Mono"'; ctx.fillStyle = `rgba(255,255,255,${(0.5 * labelAlpha).toFixed(2)})`;
          ctx.textAlign = 'center'; ctx.fillText(h.ticker, x, y - bubbleR - 3);
        }
      });

      ctx.restore();
      if (rawT < 1) scatterAnimId = requestAnimationFrame(render);
    }
    scatterAnimId = requestAnimationFrame(render);
  }

  // ──────────────────────────────────────
  // 6. AUTO-REFRESH TIMER
  // ──────────────────────────────────────
  let countdown = 60;
  const timerEl = document.getElementById('refresh-timer');

  function tick() {
    countdown--;
    if (countdown <= 0) {
      countdown = 60;
      refreshAll();
    }
    if (timerEl) timerEl.textContent = countdown;
  }
  setInterval(tick, 1000);

  function refreshAll() {
    drawESGLeaderboard();
    drawCarbonChart();
    drawGauge(72);
    drawScatter();
  }

  // ──────────────────────────────────────
  // 7. INIT
  // ──────────────────────────────────────
  setTimeout(() => {
    drawESGLeaderboard();
    drawCarbonChart();
    drawGauge(72);
    buildHeatmap();
    drawScatter();
  }, 200);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refreshAll, 200);
  });

  // Sidebar nav
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', function (e) {
      if (this.getAttribute('href') === '#') {
        e.preventDefault();
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });
})();

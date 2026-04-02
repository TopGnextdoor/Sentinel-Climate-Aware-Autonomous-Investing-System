/* ===========================================================
   SENTINEL — Guard & Policies Logic
   JSON Viewer, Trade Validator, Flow Diagram, Enforcement Log
   =========================================================== */
(function () {
  'use strict';

  // ──────────────────────────────────────
  // 1. POLICY CONFIGURATIONS
  // ──────────────────────────────────────
  const policyProfiles = {
    conservative: {
      profile: "Conservative",
      max_position_pct: 3,
      max_sector_pct: 15,
      max_carbon_intensity: 30,
      min_esg_score: 70,
      max_drawdown_pct: 10,
      max_single_trade_usd: 25000,
      fossil_fuel_exposure_pct: 0,
      var_95_limit_pct: 3,
      stranded_asset_threshold: 10,
      governance_min_score: 75,
      require_un_compact: true,
      deforestation_zero: true
    },
    moderate: {
      profile: "Moderate",
      max_position_pct: 5,
      max_sector_pct: 25,
      max_carbon_intensity: 50,
      min_esg_score: 50,
      max_drawdown_pct: 15,
      max_single_trade_usd: 75000,
      fossil_fuel_exposure_pct: 5,
      var_95_limit_pct: 5,
      stranded_asset_threshold: 20,
      governance_min_score: 60,
      require_un_compact: true,
      deforestation_zero: true
    },
    aggressive: {
      profile: "Aggressive",
      max_position_pct: 8,
      max_sector_pct: 35,
      max_carbon_intensity: 75,
      min_esg_score: 30,
      max_drawdown_pct: 25,
      max_single_trade_usd: 150000,
      fossil_fuel_exposure_pct: 15,
      var_95_limit_pct: 8,
      stranded_asset_threshold: 40,
      governance_min_score: 40,
      require_un_compact: false,
      deforestation_zero: false
    }
  };

  let currentProfile = 'moderate';

  // ──────────────────────────────────────
  // 2. JSON SYNTAX HIGHLIGHTER
  // ──────────────────────────────────────
  function highlightJSON(obj) {
    const json = JSON.stringify(obj, null, 2);
    return json
      .replace(/("[\w_]+")\s*:/g, '<span class="json-key">$1</span>:')
      .replace(/:\s*"([^"]+)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/:\s*(true|false)/g, ': <span class="json-bool">$1</span>')
      .replace(/([{}[\]])/g, '<span class="json-bracket">$1</span>');
  }

  function renderJSON() {
    const el = document.getElementById('json-content');
    if (el) el.innerHTML = highlightJSON(policyProfiles[currentProfile]);
  }

  renderJSON();

  // ──────────────────────────────────────
  // 3. RISK PROFILE TOGGLE
  // ──────────────────────────────────────
  const toggleBtns = document.querySelectorAll('#risk-toggle .toggle-btn');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentProfile = btn.dataset.profile;
      renderJSON();
    });
  });

  // ──────────────────────────────────────
  // 4. TRADE VALIDATOR
  // ──────────────────────────────────────
  const tickerData = {
    TSLA: { esg: 82, carbon: 18, sector: 'EV', fossil: false },
    XOM:  { esg: 28, carbon: 74, sector: 'Oil', fossil: true },
    ENPH: { esg: 88, carbon: 5,  sector: 'Solar', fossil: false },
    AAPL: { esg: 74, carbon: 12, sector: 'Tech', fossil: false },
    CVX:  { esg: 22, carbon: 68, sector: 'Oil', fossil: true },
    NEE:  { esg: 91, carbon: 8,  sector: 'Utility', fossil: false },
    MSFT: { esg: 78, carbon: 10, sector: 'Tech', fossil: false },
    BP:   { esg: 30, carbon: 65, sector: 'Oil', fossil: true },
  };

  const btnValidate = document.getElementById('btn-validate');
  const resultEl = document.getElementById('validation-result');

  btnValidate.addEventListener('click', () => {
    const ticker = document.getElementById('v-ticker').value.toUpperCase().trim();
    const action = document.getElementById('v-action').value;
    const amount = parseFloat(document.getElementById('v-amount').value) || 0;
    const policy = policyProfiles[currentProfile];

    // Simulate validation
    setTimeout(() => {
      const asset = tickerData[ticker];
      let result = 'approved';
      let reason = '';
      let modifiedParams = null;

      if (!asset) {
        result = 'blocked';
        reason = `Unknown ticker "${ticker}" — cannot assess ESG risk profile.`;
      } else if (asset.fossil && policy.fossil_fuel_exposure_pct === 0) {
        result = 'blocked';
        reason = `${ticker} is a fossil fuel asset. Current policy prohibits any fossil fuel exposure (limit: ${policy.fossil_fuel_exposure_pct}%).`;
      } else if (asset.carbon > policy.max_carbon_intensity) {
        result = 'blocked';
        reason = `Carbon intensity ${asset.carbon} tCO₂e/TJ exceeds policy limit of ${policy.max_carbon_intensity}. Stranded asset risk too high.`;
      } else if (asset.esg < policy.min_esg_score) {
        result = 'blocked';
        reason = `ESG score ${asset.esg}/100 is below the minimum threshold of ${policy.min_esg_score}. Governance risk flagged.`;
      } else if (amount > policy.max_single_trade_usd) {
        result = 'modified';
        reason = `Trade amount $${amount.toLocaleString()} exceeds single-trade limit of $${policy.max_single_trade_usd.toLocaleString()}. Amount reduced.`;
        modifiedParams = { original: amount, adjusted: policy.max_single_trade_usd };
      } else {
        reason = 'All compliance checks passed. Trade is within risk parameters.';
      }

      renderValidationResult(result, reason, ticker, action, modifiedParams);
      animateFlowDiagram(result, asset);
      addLogEntry(ticker, action, reason, result);
    }, 600);
  });

  function renderValidationResult(result, reason, ticker, action, modified) {
    resultEl.className = 'validation-result show ' + result;

    let iconSvg, titleText, titleClass;
    if (result === 'approved') {
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
      titleText = `${ticker} ${action} — APPROVED`;
      titleClass = 'green';
    } else if (result === 'blocked') {
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      titleText = `${ticker} ${action} — BLOCKED`;
      titleClass = 'red';
    } else {
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      titleText = `${ticker} ${action} — MODIFIED`;
      titleClass = 'amber';
    }

    resultEl.innerHTML = `
      <div class="vr-header">
        <div class="vr-icon ${result}-icon">${iconSvg}</div>
        <span class="vr-title ${titleClass}">${titleText}</span>
      </div>
      <p class="vr-detail">${reason}</p>
      ${modified ? `<p class="vr-detail" style="margin-top:6px;color:var(--amber)">Original: $${modified.original.toLocaleString()} → Adjusted: $${modified.adjusted.toLocaleString()}</p>` : ''}
    `;
  }

  // ──────────────────────────────────────
  // 5. FLOW DIAGRAM ANIMATION
  // ──────────────────────────────────────
  function animateFlowDiagram(result, asset) {
    const nodes = ['fn-climate', 'fn-position', 'fn-sector', 'fn-drawdown'];
    const arrows = document.querySelectorAll('.flow-arrow');
    const resultNode = document.getElementById('fn-result');
    const resultIcon = resultNode.querySelector('.result-icon');
    const resultLabel = resultNode.querySelector('.fn-result-label');

    // Reset all
    nodes.forEach(id => {
      const n = document.getElementById(id);
      n.classList.remove('active-node', 'fail-node', 'warn-node');
      const st = n.querySelector('.fn-status');
      st.className = 'fn-status pass';
      st.textContent = 'PASS';
    });
    arrows.forEach(a => {
      a.querySelector('.arrow-line').classList.remove('lit');
      a.querySelector('.arrow-head').classList.remove('lit');
    });
    resultIcon.className = 'fn-icon result-icon';
    resultLabel.style.color = '';

    // Sequentially light up
    const delay = 250;
    let failAt = -1;

    // Determine which step fails
    if (result === 'blocked' && asset) {
      const policy = policyProfiles[currentProfile];
      if (asset.fossil && policy.fossil_fuel_exposure_pct === 0) failAt = 0;
      else if (asset.carbon > policy.max_carbon_intensity) failAt = 0;
      else if (asset.esg < policy.min_esg_score) failAt = 0;
    } else if (result === 'modified') {
      failAt = 1; // position size
    }

    nodes.forEach((id, i) => {
      setTimeout(() => {
        const node = document.getElementById(id);
        const status = node.querySelector('.fn-status');

        if (failAt === i && result === 'blocked') {
          node.classList.add('fail-node');
          status.className = 'fn-status fail';
          status.textContent = 'FAIL';
        } else if (failAt === i && result === 'modified') {
          node.classList.add('warn-node');
          status.className = 'fn-status warn';
          status.textContent = 'WARN';
        } else {
          node.classList.add('active-node');
        }

        // Light up preceding arrow
        if (i < arrows.length) {
          arrows[i].querySelector('.arrow-line').classList.add('lit');
          arrows[i].querySelector('.arrow-head').classList.add('lit');
        }

        // Light last arrow and result
        if (i === nodes.length - 1) {
          setTimeout(() => {
            if (arrows[arrows.length - 1]) {
              arrows[arrows.length - 1].querySelector('.arrow-line').classList.add('lit');
              arrows[arrows.length - 1].querySelector('.arrow-head').classList.add('lit');
            }
            if (result === 'approved') {
              resultIcon.className = 'fn-icon result-icon';
              resultIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
              resultLabel.textContent = 'APPROVED';
              resultLabel.style.color = 'var(--green)';
            } else if (result === 'blocked') {
              resultIcon.className = 'fn-icon result-icon blocked-result';
              resultIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
              resultLabel.textContent = 'BLOCKED';
              resultLabel.style.color = 'var(--red)';
            } else {
              resultIcon.className = 'fn-icon result-icon modified-result';
              resultIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
              resultLabel.textContent = 'MODIFIED';
              resultLabel.style.color = 'var(--amber)';
            }
          }, delay);
        }
      }, i * delay);
    });
  }

  // ──────────────────────────────────────
  // 6. ENFORCEMENT LOG
  // ──────────────────────────────────────
  const seedLogs = [
    { ts: '2026-04-02 19:42:18', asset: 'TSLA', action: 'BUY', reason: 'All ESG & risk filters passed', result: 'approved' },
    { ts: '2026-04-02 19:38:05', asset: 'XOM', action: 'BUY', reason: 'Fossil fuel exposure exceeded limit (0%)', result: 'blocked' },
    { ts: '2026-04-02 19:35:22', asset: 'ENPH', action: 'BUY', reason: 'Position size 5.2% exceeds cap — reduced to 3%', result: 'modified' },
    { ts: '2026-04-02 19:30:14', asset: 'AAPL', action: 'BUY', reason: 'All compliance checks passed', result: 'approved' },
    { ts: '2026-04-02 19:28:41', asset: 'CVX', action: 'BUY', reason: 'Carbon intensity 68 > limit 50 tCO₂e/TJ', result: 'blocked' },
    { ts: '2026-04-02 19:25:09', asset: 'NEE', action: 'BUY', reason: 'All ESG & risk filters passed', result: 'approved' },
    { ts: '2026-04-02 19:20:33', asset: 'BP', action: 'BUY', reason: 'ESG score 30 below minimum 50', result: 'blocked' },
    { ts: '2026-04-02 19:18:50', asset: 'MSFT', action: 'BUY', reason: 'All compliance checks passed', result: 'approved' },
    { ts: '2026-04-02 19:15:12', asset: 'TSLA', action: 'SELL', reason: 'All compliance checks passed', result: 'approved' },
    { ts: '2026-04-02 19:10:07', asset: 'ENPH', action: 'BUY', reason: 'Trade amount $120K exceeds $75K limit — reduced', result: 'modified' },
  ];

  let logData = [...seedLogs];
  let activeFilter = 'all';

  function renderLog() {
    const tbody = document.getElementById('log-tbody');
    if (!tbody) return;

    const filtered = activeFilter === 'all' ? logData : logData.filter(l => l.result === activeFilter);

    tbody.innerHTML = '';
    filtered.forEach((entry, i) => {
      const tr = document.createElement('tr');
      tr.style.opacity = '0';
      tr.style.transform = 'translateY(6px)';
      tr.style.transition = `opacity 0.3s ease ${i * 0.04}s, transform 0.3s ease ${i * 0.04}s`;

      const actionColor = entry.action === 'BUY' ? 'var(--green)' : entry.action === 'SELL' ? 'var(--red)' : 'var(--amber)';

      tr.innerHTML = `
        <td class="ts-cell">${entry.ts}</td>
        <td class="ticker-cell">${entry.asset}</td>
        <td class="action-cell" style="color:${actionColor}">${entry.action}</td>
        <td>${entry.reason}</td>
        <td><span class="log-badge ${entry.result}">${entry.result.toUpperCase()}</span></td>
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

  renderLog();

  // Log filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderLog();
    });
  });

  function addLogEntry(ticker, action, reason, result) {
    const now = new Date();
    const ts = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');

    logData.unshift({ ts, asset: ticker, action, reason, result });
    renderLog();
  }

  // ──────────────────────────────────────
  // 7. SIDEBAR NAV
  // ──────────────────────────────────────
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', function (e) {
      if (this.getAttribute('href') === '#') {
        e.preventDefault();
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });

  // ──────────────────────────────────────
  // 8. INITIAL FLOW ANIMATION
  // ──────────────────────────────────────
  setTimeout(() => animateFlowDiagram('approved', tickerData.TSLA), 500);

})();

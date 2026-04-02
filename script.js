document.addEventListener('DOMContentLoaded', () => {
    // Risk Toggle Logic
    const riskBtns = document.querySelectorAll('.risk-btn');
    riskBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            riskBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const guardBox = document.querySelector('.guard-status');
            const statusText = guardBox.querySelector('.status-text');
            const statusIcon = guardBox.querySelector('div[style*="font-size:3rem"]');
            
            if (btn.innerText === 'HIGH') {
                guardBox.style.color = '#ffcc00';
                guardBox.style.borderColor = 'rgba(255, 204, 0, 0.3)';
                statusText.innerText = 'MODIFIED';
                statusIcon.innerText = '⚠️';
                guardBox.classList.remove('status-approved');
                guardBox.style.animation = 'pulseGlow 1s infinite alternate';
            } else {
                guardBox.style.color = '#00ff88';
                guardBox.style.borderColor = 'rgba(0, 255, 136, 0.3)';
                statusText.innerText = 'APPROVED';
                statusIcon.innerText = '🛡️';
                guardBox.classList.add('status-approved');
            }
        });
    });

    // Budget Slider
    const budgetSlider = document.querySelector('#budget-slider');
    const portfolioValue = document.querySelector('.portfolio-info h2');
    if (budgetSlider) {
        budgetSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
            });
            portfolioValue.innerText = val;
        });
    }

    // Chip Toggle
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
        });
    });

    // Animate Gauge on Load
    const gaugeProgress = document.querySelector('#gauge-progress');
    if (gaugeProgress) {
        setTimeout(() => {
            gaugeProgress.style.strokeDashoffset = '70'; 
        }, 500);
    }
});

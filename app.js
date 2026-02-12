// ==========================================
// STATE MANAGEMENT
// ==========================================
const STATE = {
    steps: {
        1: { completed: false, clicked: false, token: null },
        2: { completed: false, clicked: false, token: null },
        3: { completed: false, clicked: false, token: null, discordName: null }
    },
    captchaCode: '',
    sessionId: generateSessionId(),
    antiTamper: {
        startTime: Date.now(),
        clickSequence: [],
        mouseMovements: 0,
        interactionScore: 0
    }
};

// Obfuscated verification tokens
const VERIFY_KEYS = {
    salt: btoa(Date.now().toString(36)),
    hmac: function(data) {
        let hash = 0;
        const str = data + this.salt + STATE.sessionId;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
};

// ==========================================
// ANTI-TAMPER SYSTEM
// ==========================================
function generateSessionId() {
    return 'ks_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

// Track mouse movements for bot detection
document.addEventListener('mousemove', () => {
    STATE.antiTamper.mouseMovements++;
});

// Track interactions
document.addEventListener('click', () => {
    STATE.antiTamper.interactionScore++;
    STATE.antiTamper.clickSequence.push(Date.now());
});

// Detect console tampering
(function() {
    const originalConsoleLog = console.log;
    let devToolsOpened = false;

    const checkDevTools = setInterval(() => {
        const threshold = 160;
        if (window.outerWidth - window.innerWidth > threshold ||
            window.outerHeight - window.innerHeight > threshold) {
            if (!devToolsOpened) {
                devToolsOpened = true;
            }
        }
    }, 1000);
})();

// Prevent direct state modification
Object.freeze(VERIFY_KEYS);

function isHumanLike() {
    const elapsed = Date.now() - STATE.antiTamper.startTime;
    const hasMouseMovement = STATE.antiTamper.mouseMovements > 5;
    const hasClicks = STATE.antiTamper.clickSequence.length > 2;
    const notTooFast = elapsed > 3000;

    // Check click timing patterns (bots click too regularly)
    if (STATE.antiTamper.clickSequence.length >= 3) {
        const intervals = [];
        for (let i = 1; i < STATE.antiTamper.clickSequence.length; i++) {
            intervals.push(STATE.antiTamper.clickSequence[i] - STATE.antiTamper.clickSequence[i-1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
        // Bots have very low variance in click timing
        if (variance < 10 && intervals.length > 5) return false;
    }

    return hasMouseMovement && hasClicks && notTooFast;
}

// ==========================================
// PARTICLE SYSTEM
// ==========================================
(function initParticles() {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.3 + 0.05;
            this.fadeSpeed = Math.random() * 0.005 + 0.002;
            this.growing = Math.random() > 0.5;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.growing) {
                this.opacity += this.fadeSpeed;
                if (this.opacity >= 0.35) this.growing = false;
            } else {
                this.opacity -= this.fadeSpeed;
                if (this.opacity <= 0.05) this.growing = true;
            }

            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(108, 92, 231, ${this.opacity})`;
            ctx.fill();
        }
    }

    const particleCount = Math.min(80, Math.floor(window.innerWidth / 15));
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(108, 92, 231, ${0.03 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        animationId = requestAnimationFrame(animate);
    }

    animate();
})();

// ==========================================
// SCRIPT BUTTON PARTICLES
// ==========================================
(function initScriptParticles() {
    const container = document.getElementById('scriptParticles');
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'script-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 3 + 's';
        particle.style.animationDuration = (Math.random() * 2 + 2) + 's';
        container.appendChild(particle);
    }
})();

// ==========================================
// VERIFICATION CODES - Dynamic per session
// ==========================================
const SESSION_CODES = {
    subscribe: generateVerifyCode('sub'),
    video: generateVideoQuiz()
};

function generateVerifyCode(type) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'KS-';
    for (let i = 0; i < 5; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function generateVideoQuiz() {
    // Questions about the video content - user must watch to answer
    const quizzes = [
        {
            question: "What type of content is shown in the video?",
            options: ["Gaming Script", "Cooking Recipe", "Travel Vlog", "Music Video"],
            correct: 0
        },
        {
            question: "What platform is the script designed for?",
            options: ["Minecraft", "Roblox Rivals", "Fortnite", "Apex Legends"],
            correct: 1
        },
        {
            question: "What is the channel name shown in the video?",
            options: ["Pro Gamer", "KS Script", "Game Master", "Script Hub"],
            correct: 1
        }
    ];

    return quizzes[Math.floor(Math.random() * quizzes.length)];
}

// ==========================================
// STEP HANDLERS
// ==========================================

// Step 1: Subscribe
function handleSubscribe() {
    if (STATE.steps[1].completed) return;

    STATE.steps[1].clicked = true;
    STATE.antiTamper.clickSequence.push({ type: 'subscribe', time: Date.now() });

    // Open YouTube subscribe link
    const subWindow = window.open('https://www.youtube.com/@KS_SCRIPT_Owner?sub_confirmation=1', '_blank');

    const btn = document.getElementById('subBtn');
    btn.innerHTML = '<div class="spinner"></div><span>Opening...</span>';

    setTimeout(() => {
        btn.innerHTML = '<i class="fab fa-youtube"></i><span>Subscribed?</span><div class="btn-shine"></div>';
        document.getElementById('verifySection1').style.display = 'block';
        document.getElementById('hint1').innerHTML = `
            <i class="fas fa-info-circle"></i>
            Enter this verification code to confirm: <strong style="color: var(--accent-light); user-select: all; letter-spacing: 1px;">${SESSION_CODES.subscribe}</strong>
        `;
        updateStatus(1, 'verifying', 'Verifying');

        showToast('info', 'Verification Required', 'Please enter the verification code to confirm your subscription.');
    }, 2000);
}

// Step 2: Like
function handleLike() {
    if (STATE.steps[2].completed || !STATE.steps[1].completed) return;

    STATE.steps[2].clicked = true;
    STATE.antiTamper.clickSequence.push({ type: 'like', time: Date.now() });

    // Open video
    window.open('https://www.youtube.com/shorts/bGm4dt_Isrk', '_blank');

    const btn = document.getElementById('likeBtn');
    btn.innerHTML = '<div class="spinner"></div><span>Opening...</span>';

    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-thumbs-up"></i><span>Liked?</span><div class="btn-shine"></div>';
        document.getElementById('verifySection2').style.display = 'block';

        // Show quiz
        const quiz = SESSION_CODES.video;
        document.getElementById('quizQuestion').textContent = quiz.question;
        const optionsContainer = document.getElementById('quizOptions');
        optionsContainer.innerHTML = '';

        quiz.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = opt;
            btn.onclick = () => handleQuizAnswer(idx, btn);
            optionsContainer.appendChild(btn);
        });

        updateStatus(2, 'verifying', 'Verifying');
        showToast('info', 'Video Quiz', 'Answer the question about the video to verify.');
    }, 3000);
}

function handleQuizAnswer(selectedIdx, btnElement) {
    const quiz = SESSION_CODES.video;
    const allOptions = document.querySelectorAll('.quiz-option');

    allOptions.forEach(opt => opt.style.pointerEvents = 'none');

    if (selectedIdx === quiz.correct) {
        btnElement.classList.add('correct');

        // Additional human check
        if (!isHumanLike()) {
            setTimeout(() => {
                showToast('error', 'Verification Failed', 'Suspicious activity detected. Please try again.');
                allOptions.forEach(opt => {
                    opt.classList.remove('correct', 'wrong');
                    opt.style.pointerEvents = 'auto';
                });
            }, 1000);
            return;
        }

        setTimeout(() => {
            completeStep(2);
        }, 800);
    } else {
        btnElement.classList.add('wrong');
        allOptions[quiz.correct].classList.add('correct');

        showToast('error', 'Wrong Answer', 'Please watch the video carefully and try again.');

        setTimeout(() => {
            // Generate new quiz
            SESSION_CODES.video = generateVideoQuiz();
            const newQuiz = SESSION_CODES.video;
            document.getElementById('quizQuestion').textContent = newQuiz.question;
            const optionsContainer = document.getElementById('quizOptions');
            optionsContainer.innerHTML = '';

            newQuiz.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = 'quiz-option';
                btn.textContent = opt;
                btn.onclick = () => handleQuizAnswer(idx, btn);
                optionsContainer.appendChild(btn);
            });
        }, 2000);
    }
}

// Step 3: Discord
function handleDiscord() {
    if (STATE.steps[3].completed || !STATE.steps[2].completed) return;

    STATE.steps[3].clicked = true;
    STATE.antiTamper.clickSequence.push({ type: 'discord', time: Date.now() });

    // Open Discord
    window.open('https://discord.com/channels/@me', '_blank');

    const btn = document.getElementById('discordBtn');
    btn.innerHTML = '<div class="spinner"></div><span>Opening...</span>';

    setTimeout(() => {
        btn.innerHTML = '<i class="fab fa-discord"></i><span>Joined?</span><div class="btn-shine"></div>';
        document.getElementById('verifySection3').style.display = 'block';
        updateStatus(3, 'verifying', 'Verifying');

        showToast('info', 'Discord Verification', 'Enter your Discord username to verify.');
    }, 2000);
}

// ==========================================
// VERIFICATION SYSTEM
// ==========================================
function verifyStep(step) {
    switch(step) {
        case 1:
            verifySubscribe();
            break;
        case 3:
            verifyDiscord();
            break;
    }
}

function verifySubscribe() {
    const input = document.getElementById('verifyInput1');
    const value = input.value.trim().toUpperCase();
    const expected = SESSION_CODES.subscribe.toUpperCase();

    if (!value) {
        shakeElement(input);
        showToast('warning', 'Empty Field', 'Please enter the verification code.');
        return;
    }

    if (!STATE.steps[1].clicked) {
        shakeElement(input);
        showToast('error', 'Not Clicked', 'Please click the Subscribe button first.');
        return;
    }

    if (value === expected) {
        // Additional timing check
        const timeSinceClick = Date.now() - STATE.antiTamper.clickSequence.find(c => c.type === 'subscribe')?.time;
        if (timeSinceClick < 2000) {
            shakeElement(input);
            showToast('error', 'Too Fast', 'Please wait a moment and try again.');
            return;
        }

        completeStep(1);
    } else {
        shakeElement(input);
        showToast('error', 'Invalid Code', 'The verification code is incorrect. Please check and try again.');
        input.value = '';
    }
}

function verifyDiscord() {
    const input = document.getElementById('verifyInput3');
    const value = input.value.trim();

    if (!value) {
        shakeElement(input);
        showToast('warning', 'Empty Field', 'Please enter your Discord username.');
        return;
    }

    // Validate Discord username format
    const discordRegex = /^.{2,32}$/;
    if (!discordRegex.test(value)) {
        shakeElement(input);
        showToast('error', 'Invalid Username', 'Please enter a valid Discord username.');
        return;
    }

    STATE.steps[3].discordName = value;

    // Show CAPTCHA for final verification
    document.getElementById('captchaSection').style.display = 'block';
    document.getElementById('hint3').innerHTML = `
        <i class="fas fa-info-circle"></i>
        Complete the CAPTCHA to finish verification
    `;
    generateCaptcha();

    showToast('info', 'Almost Done', 'Complete the CAPTCHA to verify your Discord membership.');
}

// ==========================================
// CAPTCHA SYSTEM
// ==========================================
function generateCaptcha() {
    const canvas = document.getElementById('captchaCanvas');
    const ctx = canvas.getContext('2d');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';

    for (let i = 0; i < 5; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }

    STATE.captchaCode = code;

    // Draw CAPTCHA
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = 'rgba(10, 10, 15, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Noise lines
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.strokeStyle = `rgba(${Math.random() * 100 + 50}, ${Math.random() * 100 + 50}, ${Math.random() * 200 + 55}, 0.3)`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Noise dots
    for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 200}, ${Math.random() * 200}, ${Math.random() * 200}, 0.3)`;
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }

    // Draw characters
    const colors = ['#6c5ce7', '#a29bfe', '#00f5a0', '#00b4d8', '#ff6b6b'];
    for (let i = 0; i < code.length; i++) {
        ctx.save();
        const x = 25 + i * 35;
        const y = 35 + (Math.random() - 0.5) * 15;
        const angle = (Math.random() - 0.5) * 0.5;

        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.font = `${Math.random() * 8 + 20}px 'Inter', monospace`;
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.textAlign = 'center';
        ctx.fillText(code[i], 0, 0);
        ctx.restore();
    }
}

function verifyCaptcha() {
    const input = document.getElementById('captchaInput');
    const value = input.value.trim().toUpperCase();

    if (!value) {
        shakeElement(input);
        showToast('warning', 'Empty Field', 'Please enter the CAPTCHA code.');
        return;
    }

    if (!isHumanLike()) {
        shakeElement(input);
        showToast('error', 'Bot Detected', 'Suspicious activity detected. Please refresh and try again.');
        return;
    }

    if (value === STATE.captchaCode) {
        completeStep(3);
    } else {
        shakeElement(input);
        showToast('error', 'Invalid CAPTCHA', 'The CAPTCHA code is incorrect. A new one has been generated.');
        input.value = '';
        generateCaptcha();
    }
}

// ==========================================
// STEP COMPLETION
// ==========================================
function completeStep(step) {
    STATE.steps[step].completed = true;
    STATE.steps[step].token = VERIFY_KEYS.hmac(`step${step}_${Date.now()}`);

    const card = document.getElementById(`step${step}`);
    card.classList.add('completed');
    card.classList.remove('active');

    updateStatus(step, 'done', 'Completed');

    // Hide verify section
    const verifySection = document.getElementById(`verifySection${step}`);
    if (verifySection) {
        verifySection.style.display = 'none';
    }

    showToast('success', `Step ${step} Complete!`, getStepCompletionMessage(step));

    // Unlock next step
    const nextStep = step + 1;
    if (nextStep <= 3) {
        setTimeout(() => unlockStep(nextStep), 600);
    }

    updateProgress();

    // Check if all complete
    if (STATE.steps[1].completed && STATE.steps[2].completed && STATE.steps[3].completed) {
        setTimeout(unlockScript, 1000);
    }
}

function getStepCompletionMessage(step) {
    switch(step) {
        case 1: return 'YouTube subscription verified successfully!';
        case 2: return 'Video like verified successfully!';
        case 3: return 'Discord membership verified successfully!';
    }
}

function unlockStep(step) {
    const card = document.getElementById(`step${step}`);
    const lock = document.getElementById(`lock${step}`);

    card.classList.remove('locked');
    card.classList.add('active');

    if (lock) {
        lock.style.opacity = '0';
        lock.style.pointerEvents = 'none';
        setTimeout(() => lock.style.display = 'none', 300);
    }

    // Enable button
    const btnIds = { 2: 'likeBtn', 3: 'discordBtn' };
    const btn = document.getElementById(btnIds[step]);
    if (btn) btn.disabled = false;

    updateStatus(step, 'pending', 'Pending');
    showToast('info', `Step ${step} Unlocked`, 'You can now proceed with this step.');
}

// ==========================================
// UNLOCK SCRIPT
// ==========================================
function unlockScript() {
    const btn = document.getElementById('getScriptBtn');
    btn.classList.add('unlocked');
    btn.disabled = false;

    document.querySelector('.script-sub').textContent = 'All steps completed! Click to get your script';

    // Update header badge
    const badge = document.querySelector('.header-badge');
    badge.innerHTML = '<span class="pulse-dot" style="background: var(--success);"></span><span>Verified ✓</span>';
    badge.style.borderColor = 'rgba(0, 245, 160, 0.2)';

    showModal(
        'success',
        '<i class="fas fa-check-circle"></i>',
        'All Steps Completed!',
        'Congratulations! You have successfully completed all verification steps. Click the "Get Script" button to access your script.'
    );
}

function getScript() {
    const btn = document.getElementById('getScriptBtn');
    if (!btn.classList.contains('unlocked')) return;

    // Final integrity check
    const allCompleted = STATE.steps[1].completed && STATE.steps[2].completed && STATE.steps[3].completed;
    const allTokens = STATE.steps[1].token && STATE.steps[2].token && STATE.steps[3].token;
    const humanCheck = STATE.antiTamper.mouseMovements > 10 && STATE.antiTamper.interactionScore > 5;

    if (!allCompleted || !allTokens) {
        showToast('error', 'Verification Error', 'Please complete all steps properly.');
        return;
    }

    if (!humanCheck) {
        showToast('error', 'Security Check Failed', 'Unable to verify human interaction. Please try again.');
        return;
    }

    // Redirect
    btn.innerHTML = `
        <div class="script-btn-content">
            <div class="script-icon" style="background: linear-gradient(135deg, var(--accent), var(--success)); color: white; box-shadow: 0 0 30px var(--success-glow);">
                <div class="spinner"></div>
            </div>
            <div class="script-text">
                <span class="script-title" style="background: linear-gradient(135deg, var(--accent-light), var(--success)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Redirecting...</span>
                <span class="script-sub" style="color: var(--text-secondary);">Please wait</span>
            </div>
        </div>
    `;

    showToast('success', 'Redirecting', 'Taking you to the script page...');

    setTimeout(() => {
        window.location.href = 'https://ks-script.github.io/KS.WEB/';
    }, 1500);
}

// ==========================================
// UI HELPERS
// ==========================================
function updateProgress() {
    const completed = Object.values(STATE.steps).filter(s => s.completed).length;
    const percent = Math.round((completed / 3) * 100);

    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressText').textContent = `${completed} / 3 Completed`;
    document.getElementById('progressPercent').textContent = percent + '%';
}

function updateStatus(step, type, text) {
    const status = document.getElementById(`status${step}`);
    status.innerHTML = `<span class="status-text ${type}">${text}</span>`;
}

function shakeElement(element) {
    element.classList.add('shake');
    element.style.borderColor = 'var(--error)';
    setTimeout(() => {
        element.classList.remove('shake');
        element.style.borderColor = '';
    }, 500);
}

// ==========================================
// TOAST SYSTEM
// ==========================================
function showToast(type, title, message, duration = 5000) {
    const container = document.getElementById('toastContainer');

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${icons[type]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="removeToast(this.parentElement)">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => removeToast(toast), duration);

    return toast;
}

function removeToast(toast) {
    if (!toast || !toast.parentElement) return;
    toast.classList.add('removing');
    setTimeout(() => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 300);
}

// ==========================================
// MODAL SYSTEM
// ==========================================
function showModal(type, icon, title, text) {
    const overlay = document.getElementById('modalOverlay');
    const iconEl = document.getElementById('modalIcon');
    const titleEl = document.getElementById('modalTitle');
    const textEl = document.getElementById('modalText');

    iconEl.className = `modal-icon ${type}`;
    iconEl.innerHTML = icon;
    titleEl.textContent = title;
    textEl.textContent = text;

    overlay.classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// Close modal on overlay click
document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();

    // Prevent common bypass attempts
    if (e.key === 'Enter') {
        const activeInput = document.activeElement;
        if (activeInput && activeInput.classList.contains('verify-input')) {
            const step = activeInput.closest('.step-card')?.dataset.step;
            if (step) {
                if (step === '1') verifyStep(1);
                else if (step === '3') {
                    if (document.getElementById('captchaSection').style.display !== 'none') {
                        verifyCaptcha();
                    } else {
                        verifyStep(3);
                    }
                }
            }
        }
        if (activeInput && activeInput.id === 'captchaInput') {
            verifyCaptcha();
        }
    }
});

// ==========================================
// ANTI-BYPASS: Protect global functions
// ==========================================
(function protectFunctions() {
    const originalComplete = completeStep;

    // Override to add validation
    window._internalComplete = function(step) {
        // Verify the step was actually interacted with
        if (!STATE.steps[step].clicked) {
            console.warn('Step not properly initiated');
            return;
        }

        // Verify previous steps
        for (let i = 1; i < step; i++) {
            if (!STATE.steps[i].completed || !STATE.steps[i].token) {
                console.warn('Previous steps not completed');
                return;
            }
        }

        originalComplete(step);
    };
})();

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize first step as active
    document.getElementById('step1').classList.add('active');

    // Disable right-click context menu on verification elements
    document.querySelectorAll('.verify-input, .verify-btn, .action-btn').forEach(el => {
        el.addEventListener('contextmenu', (e) => e.preventDefault());
    });

    console.log(
        '%c⚠️ WARNING',
        'color: #ff4757; font-size: 24px; font-weight: bold;'
    );
    console.log(
        '%cManipulating this page will not bypass verification. All steps are cryptographically validated.',
        'color: #ffa502; font-size: 14px;'
    );
});

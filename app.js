// ========================================
// LinkUnlocker - Advanced Verification System
// ========================================

// Configuration
const CONFIG = {
    links: {
        1: 'https://www.youtube.com/@KS_SCRIPT_Owner?sub_confirmation=1',
        2: 'https://www.youtube.com/shorts/bGm4dt_Isrk',
        3: 'https://discord.com/channels/@me'  // Replace with actual Discord invite link
    },
    redirectUrl: 'https://ks-script.github.io/KS.WEB/',
    verificationTime: {
        1: 8,  // 8 seconds for YouTube subscribe
        2: 10, // 10 seconds for video like (needs to watch)
        3: 6   // 6 seconds for Discord join
    },
    stepNames: {
        1: 'YouTube Subscribe',
        2: 'Video Like',
        3: 'Discord Join'
    }
};

// State Management
const state = {
    steps: {
        1: { completed: false, verifying: false, token: null, attempts: 0 },
        2: { completed: false, verifying: false, token: null, attempts: 0 },
        3: { completed: false, verifying: false, token: null, attempts: 0 }
    },
    currentVerification: null,
    openedWindow: null,
    timerInterval: null,
    visibilityChanged: false,
    antiCheat: {
        mouseMovements: 0,
        lastActivity: Date.now(),
        sessionToken: null
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initAntiCheat();
    loadSavedState();
    updateUI();
});

// ========================================
// Particle Animation
// ========================================
function initParticles() {
    const container = document.getElementById('particles');
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 15}s`;
        particle.style.animationDuration = `${15 + Math.random() * 10}s`;
        
        const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#6366f1'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        container.appendChild(particle);
    }
}

// ========================================
// Anti-Cheat System
// ========================================
function initAntiCheat() {
    // Generate session token
    state.antiCheat.sessionToken = generateToken();
    
    // Track mouse movements
    document.addEventListener('mousemove', () => {
        state.antiCheat.mouseMovements++;
        state.antiCheat.lastActivity = Date.now();
    });
    
    // Track keyboard activity
    document.addEventListener('keydown', () => {
        state.antiCheat.lastActivity = Date.now();
    });
    
    // Detect developer tools
    const devToolsCheck = setInterval(() => {
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        
        if (widthThreshold || heightThreshold) {
            console.clear();
            console.log('%c⚠️ Developer tools detected!', 'color: red; font-size: 24px;');
        }
    }, 1000);
    
    // Visibility change detection
    document.addEventListener('visibilitychange', () => {
        if (state.currentVerification !== null) {
            if (document.hidden) {
                state.visibilityChanged = true;
            }
        }
    });
}

// ========================================
// Token Generation & Verification
// ========================================
function generateToken() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const userAgent = btoa(navigator.userAgent.slice(0, 20));
    return btoa(`${timestamp}:${random}:${userAgent}`);
}

function validateToken(token, step) {
    try {
        const decoded = atob(token);
        const parts = decoded.split(':');
        const timestamp = parseInt(parts[0]);
        const now = Date.now();
        
        // Token must be recent (within last 2 minutes)
        if (now - timestamp > 120000) return false;
        
        // Token must be old enough (verification time passed)
        const minTime = CONFIG.verificationTime[step] * 1000;
        if (now - timestamp < minTime) return false;
        
        return true;
    } catch {
        return false;
    }
}

function encryptState(data) {
    const json = JSON.stringify(data);
    const encoded = btoa(json);
    const shuffled = encoded.split('').reverse().join('');
    return btoa(shuffled + ':' + generateChecksum(json));
}

function decryptState(encrypted) {
    try {
        const decoded = atob(encrypted);
        const [shuffled, checksum] = decoded.split(':');
        const encoded = shuffled.split('').reverse().join('');
        const json = atob(encoded);
        
        if (generateChecksum(json) !== checksum) {
            return null;
        }
        
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function generateChecksum(data) {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// ========================================
// State Management
// ========================================
function saveState() {
    const saveData = {
        steps: {},
        timestamp: Date.now(),
        session: state.antiCheat.sessionToken
    };
    
    for (const step in state.steps) {
        if (state.steps[step].completed) {
            saveData.steps[step] = {
                completed: true,
                token: state.steps[step].token,
                time: Date.now()
            };
        }
    }
    
    const encrypted = encryptState(saveData);
    localStorage.setItem('ks_verify_state', encrypted);
}

function loadSavedState() {
    const saved = localStorage.getItem('ks_verify_state');
    if (!saved) return;
    
    const data = decryptState(saved);
    if (!data) {
        localStorage.removeItem('ks_verify_state');
        return;
    }
    
    // Check if saved state is too old (24 hours)
    if (Date.now() - data.timestamp > 86400000) {
        localStorage.removeItem('ks_verify_state');
        return;
    }
    
    // Restore completed steps
    for (const step in data.steps) {
        if (data.steps[step].completed && data.steps[step].token) {
            state.steps[step].completed = true;
            state.steps[step].token = data.steps[step].token;
        }
    }
}

// ========================================
// Verification Process
// ========================================
function startVerification(step) {
    if (state.steps[step].completed || state.steps[step].verifying) {
        return;
    }
    
    // Anti-spam check
    state.steps[step].attempts++;
    if (state.steps[step].attempts > 5) {
        showToast('Too many attempts. Please wait.', 'warning');
        return;
    }
    
    // Generate verification token
    const token = generateToken();
    state.steps[step].token = token;
    state.steps[step].verifying = true;
    state.currentVerification = step;
    state.visibilityChanged = false;
    
    // Update UI
    updateStepStatus(step, 'verifying');
    showVerificationModal(step);
    
    // Open link in new tab
    state.openedWindow = window.open(CONFIG.links[step], '_blank');
    
    // Start verification timer
    startVerificationTimer(step);
}

function showVerificationModal(step) {
    const modal = document.getElementById('verificationModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalText = document.getElementById('modalText');
    const timerText = document.getElementById('timerText');
    
    modalTitle.textContent = `Verifying ${CONFIG.stepNames[step]}...`;
    modalText.textContent = 'Please complete the action in the new tab and return here.';
    timerText.textContent = CONFIG.verificationTime[step];
    
    // Reset mini steps
    document.querySelectorAll('.mini-step').forEach(el => {
        el.classList.remove('active', 'completed');
    });
    document.getElementById('miniStep1').classList.add('active');
    
    modal.classList.add('show');
    
    // Reset timer circle
    const timerProgress = document.getElementById('timerProgress');
    timerProgress.style.strokeDashoffset = '283';
}

function startVerificationTimer(step) {
    let timeLeft = CONFIG.verificationTime[step];
    const totalTime = CONFIG.verificationTime[step];
    const timerText = document.getElementById('timerText');
    const timerProgress = document.getElementById('timerProgress');
    
    // Mark step 1 as completed after a short delay
    setTimeout(() => {
        document.getElementById('miniStep1').classList.remove('active');
        document.getElementById('miniStep1').classList.add('completed');
        document.getElementById('miniStep2').classList.add('active');
    }, 1000);
    
    state.timerInterval = setInterval(() => {
        timeLeft--;
        timerText.textContent = timeLeft;
        
        // Update progress circle
        const progress = ((totalTime - timeLeft) / totalTime) * 283;
        timerProgress.style.strokeDashoffset = 283 - progress;
        
        if (timeLeft <= 0) {
            clearInterval(state.timerInterval);
            
            // Check if user actually left the page
            if (state.visibilityChanged) {
                document.getElementById('miniStep2').classList.remove('active');
                document.getElementById('miniStep2').classList.add('completed');
                document.getElementById('miniStep3').classList.add('active');
                
                // Complete verification after brief delay
                setTimeout(() => completeVerification(step), 500);
            } else {
                failVerification(step, 'Please visit the link and complete the action.');
            }
        }
    }, 1000);
}

function completeVerification(step) {
    const token = state.steps[step].token;
    
    // Validate token
    if (!validateToken(token, step)) {
        failVerification(step, 'Verification failed. Please try again.');
        return;
    }
    
    // Additional verification checks
    if (!performAdditionalChecks(step)) {
        failVerification(step, 'Verification could not be completed.');
        return;
    }
    
    // Mark as completed
    state.steps[step].completed = true;
    state.steps[step].verifying = false;
    state.currentVerification = null;
    
    // Update UI
    document.getElementById('miniStep3').classList.remove('active');
    document.getElementById('miniStep3').classList.add('completed');
    
    setTimeout(() => {
        hideVerificationModal();
        updateStepStatus(step, 'completed');
        updateProgress();
        saveState();
        
        showToast(`${CONFIG.stepNames[step]} verified!`, 'success');
        
        // Check if all steps completed
        checkAllCompleted();
    }, 1000);
}

function performAdditionalChecks(step) {
    // Check for suspicious patterns
    if (state.antiCheat.mouseMovements < 5) {
        console.log('Low activity detected');
        // Still allow but flag
    }
    
    // Check time since last activity
    if (Date.now() - state.antiCheat.lastActivity > 60000) {
        console.log('User may be inactive');
    }
    
    return true;
}

function failVerification(step, message) {
    state.steps[step].verifying = false;
    state.currentVerification = null;
    
    clearInterval(state.timerInterval);
    hideVerificationModal();
    updateStepStatus(step, 'failed');
    
    showToast(message, 'error');
    
    // Reset step UI after delay
    setTimeout(() => {
        updateStepStatus(step, 'pending');
    }, 2000);
}

function cancelVerification() {
    if (state.currentVerification !== null) {
        const step = state.currentVerification;
        state.steps[step].verifying = false;
        state.currentVerification = null;
        
        clearInterval(state.timerInterval);
        hideVerificationModal();
        updateStepStatus(step, 'pending');
    }
}

function hideVerificationModal() {
    const modal = document.getElementById('verificationModal');
    modal.classList.remove('show');
}

// ========================================
// UI Updates
// ========================================
function updateUI() {
    for (const step in state.steps) {
        if (state.steps[step].completed) {
            updateStepStatus(step, 'completed');
        }
    }
    updateProgress();
    checkAllCompleted();
}

function updateStepStatus(step, status) {
    const stepCard = document.getElementById(`step${step}`);
    const statusEl = document.getElementById(`status${step}`);
    const statusText = statusEl.querySelector('.status-text');
    
    stepCard.classList.remove('completed', 'verifying', 'failed');
    
    switch (status) {
        case 'completed':
            stepCard.classList.add('completed');
            statusText.textContent = 'Completed';
            break;
        case 'verifying':
            stepCard.classList.add('verifying');
            statusText.textContent = 'Verifying...';
            break;
        case 'failed':
            statusText.textContent = 'Failed';
            break;
        default:
            statusText.textContent = 'Not Started';
    }
}

function updateProgress() {
    const completed = Object.values(state.steps).filter(s => s.completed).length;
    const total = Object.keys(state.steps).length;
    const percent = Math.round((completed / total) * 100);
    
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = `${completed} / ${total} Completed`;
    document.getElementById('progressPercent').textContent = `${percent}%`;
}

function checkAllCompleted() {
    const allCompleted = Object.values(state.steps).every(s => s.completed);
    const unlockBtn = document.getElementById('unlockBtn');
    const lockIcon = document.getElementById('lockIcon');
    const unlockText = document.getElementById('unlockText');
    const unlockHint = document.getElementById('unlockHint');
    
    if (allCompleted) {
        unlockBtn.disabled = false;
        unlockBtn.classList.add('active');
        lockIcon.className = 'fas fa-unlock';
        unlockText.textContent = 'Get Script';
        unlockHint.textContent = 'Click to get your script!';
        unlockHint.classList.add('ready');
        
        // Show success modal after a brief delay (first time only)
        if (!localStorage.getItem('ks_success_shown')) {
            setTimeout(() => {
                document.getElementById('successModal').classList.add('show');
                localStorage.setItem('ks_success_shown', 'true');
            }, 500);
        }
    }
}

// ========================================
// Script Unlock
// ========================================
function unlockScript() {
    const allCompleted = Object.values(state.steps).every(s => s.completed);
    
    if (!allCompleted) {
        showToast('Please complete all verification steps.', 'warning');
        return;
    }
    
    // Final verification
    const finalToken = generateFinalToken();
    if (!validateFinalToken(finalToken)) {
        showToast('Verification expired. Please refresh and try again.', 'error');
        return;
    }
    
    // Redirect to script
    window.location.href = CONFIG.redirectUrl;
}

function redirectToScript() {
    document.getElementById('successModal').classList.remove('show');
    unlockScript();
}

function generateFinalToken() {
    const tokens = Object.values(state.steps).map(s => s.token).join(':');
    const session = state.antiCheat.sessionToken;
    return btoa(`${tokens}:${session}:${Date.now()}`);
}

function validateFinalToken(token) {
    try {
        const decoded = atob(token);
        const parts = decoded.split(':');
        const timestamp = parseInt(parts[parts.length - 1]);
        
        // Final token should be recent
        return Date.now() - timestamp < 5000;
    } catch {
        return false;
    }
}

// ========================================
// Toast Notifications
// ========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = toast.querySelector('.toast-icon i');
    const toastTitle = toast.querySelector('.toast-title');
    const toastMessage = toast.querySelector('.toast-message');
    
    // Set icon and color based on type
    const configs = {
        success: { icon: 'fa-check', color: '#10b981', title: 'Success' },
        error: { icon: 'fa-times', color: '#ef4444', title: 'Error' },
        warning: { icon: 'fa-exclamation', color: '#f59e0b', title: 'Warning' }
    };
    
    const config = configs[type] || configs.success;
    
    toastIcon.className = `fas ${config.icon}`;
    toast.style.borderLeftColor = config.color;
    toast.querySelector('.toast-icon').style.background = `${config.color}20`;
    toast.querySelector('.toast-icon').style.color = config.color;
    toast.querySelector('.toast-progress').style.background = config.color;
    
    toastTitle.textContent = config.title;
    toastMessage.textContent = message;
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after delay
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// ========================================
// Prevent Console Manipulation
// ========================================
(function() {
    const originalConsole = { ...console };
    
    // Override console methods
    ['log', 'warn', 'error', 'info'].forEach(method => {
        console[method] = function(...args) {
            // Check for manipulation attempts
            const stack = new Error().stack;
            if (stack && stack.includes('eval')) {
                return;
            }
            originalConsole[method].apply(console, args);
        };
    });
    
    // Disable right-click context menu on buttons
    document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.step-btn, .unlock-btn')) {
            e.preventDefault();
        }
    });
})();

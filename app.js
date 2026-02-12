// ==========================================
// LinkUnlocker - Verification System
// ==========================================

(function() {
    'use strict';

    // ==========================================
    // Configuration
    // ==========================================
    const CONFIG = {
        links: {
            subscribe: 'https://www.youtube.com/@KS_SCRIPT_Owner?sub_confirmation=1',
            like: 'https://www.youtube.com/shorts/bGm4dt_Isrk',
            discord: 'https://discord.com/channels/@me'
        },
        redirectUrl: 'https://ks-script.github.io/KS.WEB/',
        minActionTime: {
            subscribe: 8000,  // 8 seconds minimum
            like: 5000,       // 5 seconds minimum
            discord: 10000    // 10 seconds minimum
        },
        encryptionKey: 'KS_RIVALS_2024_SECURE',
        storageKey: 'ks_verification_data'
    };

    // ==========================================
    // State Management
    // ==========================================
    const state = {
        steps: {
            subscribe: { completed: false, clickTime: null, verifyToken: null },
            like: { completed: false, clickTime: null, verifyToken: null },
            discord: { completed: false, clickTime: null, verifyToken: null }
        },
        sessionId: null,
        activeStep: null,
        isVerifying: false
    };

    // ==========================================
    // Security & Encryption
    // ==========================================
    const Security = {
        generateSessionId() {
            const array = new Uint32Array(4);
            crypto.getRandomValues(array);
            return Array.from(array, x => x.toString(16)).join('');
        },

        generateToken(step, timestamp) {
            const data = `${step}-${timestamp}-${state.sessionId}-${CONFIG.encryptionKey}`;
            return this.hash(data);
        },

        hash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            const hashStr = Math.abs(hash).toString(16);
            return hashStr + this.generateChecksum(hashStr);
        },

        generateChecksum(str) {
            let sum = 0;
            for (let i = 0; i < str.length; i++) {
                sum += str.charCodeAt(i) * (i + 1);
            }
            return (sum % 256).toString(16).padStart(2, '0');
        },

        encrypt(data) {
            const jsonStr = JSON.stringify(data);
            let encrypted = '';
            for (let i = 0; i < jsonStr.length; i++) {
                const charCode = jsonStr.charCodeAt(i) ^ CONFIG.encryptionKey.charCodeAt(i % CONFIG.encryptionKey.length);
                encrypted += String.fromCharCode(charCode);
            }
            return btoa(encrypted);
        },

        decrypt(encryptedData) {
            try {
                const decoded = atob(encryptedData);
                let decrypted = '';
                for (let i = 0; i < decoded.length; i++) {
                    const charCode = decoded.charCodeAt(i) ^ CONFIG.encryptionKey.charCodeAt(i % CONFIG.encryptionKey.length);
                    decrypted += String.fromCharCode(charCode);
                }
                return JSON.parse(decrypted);
            } catch (e) {
                return null;
            }
        },

        validateToken(step, token, timestamp) {
            const expectedToken = this.generateToken(step, timestamp);
            return token === expectedToken;
        },

        antiTamper() {
            // Detect developer tools
            const devtools = {
                isOpen: false,
                orientation: undefined
            };

            const threshold = 160;
            
            const emitEvent = (isOpen, orientation) => {
                if (isOpen && !devtools.isOpen) {
                    console.clear();
                    showToast('warning', 'Security Warning', 'Developer tools detected');
                }
                devtools.isOpen = isOpen;
                devtools.orientation = orientation;
            };

            setInterval(() => {
                const widthThreshold = window.outerWidth - window.innerWidth > threshold;
                const heightThreshold = window.outerHeight - window.innerHeight > threshold;
                
                if (heightThreshold || widthThreshold) {
                    emitEvent(true, heightThreshold ? 'vertical' : 'horizontal');
                } else {
                    emitEvent(false, undefined);
                }
            }, 1000);
        }
    };

    // ==========================================
    // Storage Management
    // ==========================================
    const Storage = {
        save() {
            const data = {
                steps: state.steps,
                sessionId: state.sessionId,
                timestamp: Date.now()
            };
            const encrypted = Security.encrypt(data);
            localStorage.setItem(CONFIG.storageKey, encrypted);
        },

        load() {
            const encrypted = localStorage.getItem(CONFIG.storageKey);
            if (!encrypted) return false;

            const data = Security.decrypt(encrypted);
            if (!data) {
                this.clear();
                return false;
            }

            // Validate session age (24 hours max)
            if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
                this.clear();
                return false;
            }

            // Validate tokens
            for (const step in data.steps) {
                const stepData = data.steps[step];
                if (stepData.completed && stepData.verifyToken) {
                    if (!Security.validateToken(step, stepData.verifyToken, stepData.clickTime)) {
                        this.clear();
                        return false;
                    }
                }
            }

            state.steps = data.steps;
            state.sessionId = data.sessionId;
            return true;
        },

        clear() {
            localStorage.removeItem(CONFIG.storageKey);
        }
    };

    // ==========================================
    // UI Updates
    // ==========================================
    const UI = {
        updateProgress() {
            const completed = Object.values(state.steps).filter(s => s.completed).length;
            const percent = Math.round((completed / 3) * 100);
            
            document.getElementById('progressFill').style.width = `${percent}%`;
            document.getElementById('progressText').textContent = `${completed} / 3 Completed`;
            document.getElementById('progressPercent').textContent = `${percent}%`;
        },

        updateStep(step, status) {
            const stepIndex = { subscribe: 1, like: 2, discord: 3 }[step];
            const stepCard = document.getElementById(`step${stepIndex}`);
            const statusContainer = document.getElementById(`status${stepIndex}`);
            const button = document.getElementById(`btn${stepIndex}`);

            // Remove all status classes
            stepCard.classList.remove('completed', 'verifying');
            
            // Hide all status elements
            statusContainer.querySelectorAll('div').forEach(el => el.classList.add('hidden'));

            switch (status) {
                case 'pending':
                    statusContainer.querySelector('.status-pending').classList.remove('hidden');
                    button.disabled = false;
                    button.classList.remove('completed');
                    break;
                case 'verifying':
                    stepCard.classList.add('verifying');
                    statusContainer.querySelector('.status-verifying').classList.remove('hidden');
                    button.disabled = true;
                    break;
                case 'completed':
                    stepCard.classList.add('completed');
                    statusContainer.querySelector('.status-complete').classList.remove('hidden');
                    button.disabled = true;
                    button.classList.add('completed');
                    button.innerHTML = '<span class="btn-text">Completed</span><span class="btn-icon"><i class="fas fa-check"></i></span>';
                    break;
            }
        },

        updateUnlockButton() {
            const allCompleted = Object.values(state.steps).every(s => s.completed);
            const unlockBtn = document.getElementById('unlockBtn');
            const unlockHint = document.getElementById('unlockHint');

            if (allCompleted) {
                unlockBtn.classList.add('unlocked');
                unlockBtn.disabled = false;
                unlockBtn.querySelector('.unlock-icon').innerHTML = '<i class="fas fa-unlock"></i>';
                unlockBtn.querySelector('.unlock-text').textContent = 'Get Your Script Now!';
                unlockHint.innerHTML = '<i class="fas fa-check-circle"></i> All steps completed! Click to continue';
                unlockHint.classList.add('success');
                
                // Add particle effects
                this.createUnlockParticles();
            }
        },

        createUnlockParticles() {
            const container = document.querySelector('.unlock-particles');
            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: rgba(99, 102, 241, 0.8);
                    border-radius: 50%;
                    top: 50%;
                    left: 50%;
                    pointer-events: none;
                    animation: unlockParticle 2s ease-out infinite;
                    animation-delay: ${i * 0.1}s;
                `;
                container.appendChild(particle);
            }
        },

        showModal(show, text = '', hint = '') {
            const modal = document.getElementById('modalOverlay');
            const modalText = document.getElementById('modalText');
            const modalHint = document.getElementById('modalHint');
            const progressBar = document.getElementById('modalProgressBar');

            if (show) {
                modal.classList.remove('hidden');
                modalText.textContent = text;
                modalHint.textContent = hint;
                progressBar.style.width = '0%';
            } else {
                modal.classList.add('hidden');
            }
        },

        updateModalProgress(percent) {
            document.getElementById('modalProgressBar').style.width = `${percent}%`;
        }
    };

    // ==========================================
    // Toast Notifications
    // ==========================================
    function showToast(type, title, message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check',
            error: 'fa-times',
            warning: 'fa-exclamation',
            info: 'fa-info'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icons[type]}"></i>
            </div>
            <div class="toast-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ==========================================
    // Verification Logic
    // ==========================================
    const Verification = {
        openedTabs: {},
        focusHandlers: {},

        startVerification(step) {
            if (state.steps[step].completed || state.isVerifying) return;

            state.isVerifying = true;
            state.activeStep = step;
            
            const clickTime = Date.now();
            state.steps[step].clickTime = clickTime;
            
            // Generate verification token
            const token = Security.generateToken(step, clickTime);
            state.steps[step].verifyToken = token;
            
            // Open link in new tab
            const newTab = window.open(CONFIG.links[step], '_blank');
            this.openedTabs[step] = newTab;
            
            UI.updateStep(step, 'verifying');
            UI.showModal(true, 
                `Completing ${this.getStepName(step)}...`,
                'Complete the action and return to this page'
            );

            // Start verification check
            this.startVerificationCheck(step, clickTime, token);
        },

        getStepName(step) {
            const names = {
                subscribe: 'YouTube Subscription',
                like: 'Video Like',
                discord: 'Discord Join'
            };
            return names[step];
        },

        startVerificationCheck(step, clickTime, token) {
            const minTime = CONFIG.minActionTime[step];
            let checkInterval;
            let progressInterval;
            let elapsed = 0;

            // Progress update
            progressInterval = setInterval(() => {
                elapsed += 100;
                const percent = Math.min((elapsed / minTime) * 100, 100);
                UI.updateModalProgress(percent);
            }, 100);

            // Focus handler
            const handleFocus = () => {
                const currentTime = Date.now();
                const timeSpent = currentTime - clickTime;

                if (timeSpent >= minTime) {
                    // Verify the action
                    if (this.verifyAction(step, token, clickTime)) {
                        this.completeStep(step);
                    } else {
                        this.failStep(step, 'Verification failed. Please try again.');
                    }
                    
                    clearInterval(progressInterval);
                    window.removeEventListener('focus', handleFocus);
                } else {
                    // Not enough time spent
                    const remaining = Math.ceil((minTime - timeSpent) / 1000);
                    showToast('warning', 'Please Complete Action', 
                        `Return after completing the action (${remaining}s remaining)`);
                }
            };

            // Add focus listener
            window.addEventListener('focus', handleFocus);
            this.focusHandlers[step] = handleFocus;

            // Backup verification after extended time
            setTimeout(() => {
                if (!state.steps[step].completed && state.activeStep === step) {
                    window.removeEventListener('focus', handleFocus);
                    clearInterval(progressInterval);
                    
                    // Final verification attempt
                    if (this.verifyAction(step, token, clickTime)) {
                        this.completeStep(step);
                    } else {
                        this.failStep(step, 'Verification timeout. Please try again.');
                    }
                }
            }, minTime + 30000); // 30 seconds after minimum time
        },

        verifyAction(step, token, clickTime) {
            // Multi-layer verification
            const timeNow = Date.now();
            const timeSpent = timeNow - clickTime;

            // Check 1: Minimum time requirement
            if (timeSpent < CONFIG.minActionTime[step]) {
                return false;
            }

            // Check 2: Token validation
            if (!Security.validateToken(step, token, clickTime)) {
                return false;
            }

            // Check 3: Session validation
            if (!state.sessionId) {
                return false;
            }

            // Check 4: Tab was actually opened
            if (!this.openedTabs[step]) {
                return false;
            }

            // Check 5: Generate completion hash
            const completionHash = Security.hash(
                `${step}-${clickTime}-${timeNow}-${state.sessionId}-complete`
            );

            // Store completion proof
            state.steps[step].completionHash = completionHash;
            state.steps[step].completionTime = timeNow;

            return true;
        },

        completeStep(step) {
            state.steps[step].completed = true;
            state.isVerifying = false;
            state.activeStep = null;

            Storage.save();
            
            UI.showModal(false);
            UI.updateStep(step, 'completed');
            UI.updateProgress();
            UI.updateUnlockButton();

            showToast('success', 'Step Completed!', 
                `${this.getStepName(step)} verified successfully`);
        },

        failStep(step, message) {
            state.isVerifying = false;
            state.activeStep = null;
            state.steps[step].clickTime = null;
            state.steps[step].verifyToken = null;

            UI.showModal(false);
            UI.updateStep(step, 'pending');

            showToast('error', 'Verification Failed', message);
        }
    };

    // ==========================================
    // Global Functions
    // ==========================================
    window.handleStep = function(step) {
        if (state.steps[step].completed) {
            showToast('info', 'Already Completed', 'This step has already been verified');
            return;
        }
        Verification.startVerification(step);
    };

    window.handleUnlock = function() {
        const allCompleted = Object.values(state.steps).every(s => s.completed);
        
        if (!allCompleted) {
            showToast('warning', 'Incomplete', 'Please complete all verification steps');
            return;
        }

        // Final verification
        let isValid = true;
        for (const step in state.steps) {
            const stepData = state.steps[step];
            if (!stepData.completionHash || !stepData.completionTime) {
                isValid = false;
                break;
            }
        }

        if (isValid) {
            showToast('success', 'Redirecting...', 'All verifications passed!');
            setTimeout(() => {
                window.location.href = CONFIG.redirectUrl;
            }, 1500);
        } else {
            showToast('error', 'Verification Error', 'Please refresh and try again');
            Storage.clear();
        }
    };

    // ==========================================
    // Initialization
    // ==========================================
    function init() {
        // Generate or restore session
        if (!Storage.load()) {
            state.sessionId = Security.generateSessionId();
            Storage.save();
        }

        // Create particles
        createParticles();

        // Update UI based on saved state
        for (const step in state.steps) {
            if (state.steps[step].completed) {
                UI.updateStep(step, 'completed');
            }
        }
        UI.updateProgress();
        UI.updateUnlockButton();

        // Add unlock button listener
        document.getElementById('unlockBtn').addEventListener('click', handleUnlock);

        // Initialize anti-tamper
        Security.antiTamper();

        // Add CSS for particles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes unlockParticle {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 1;
                }
                100% {
                    transform: translate(
                        calc(-50% + ${Math.random() * 100 - 50}px),
                        calc(-50% + ${Math.random() * 100 - 50}px)
                    ) scale(1);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function createParticles() {
        const container = document.getElementById('particles');
        const particleCount = 30;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDuration = `${15 + Math.random() * 20}s`;
            particle.style.animationDelay = `${Math.random() * 10}s`;
            particle.style.width = `${2 + Math.random() * 4}px`;
            particle.style.height = particle.style.width;
            container.appendChild(particle);
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

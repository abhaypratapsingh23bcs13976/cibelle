/**
 * Cibelle — Luxury Onboarding Orchestrator
 * ========================================
 * Handles the 4-step invitation journey with smooth transitions.
 */

const Onboarding = (() => {
    let currentStep = 1;
    const totalSteps = 4;

    function init() {
        console.log("Cibelle Onboarding Initialized");
        updateProgress();
        
        // Handle enter key for better UX
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const activeStep = document.querySelector('.onboarding-step.active');
                if (!activeStep) return;
                const nextBtn = activeStep.querySelector('.btn-luxury-action');
                if (nextBtn) nextBtn.click();
            }
        });
    }

    function goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > totalSteps) {
            if (stepNumber === 'success') {
                showStep('success');
            }
            return;
        }

        // Validation for step 2 (Identity)
        if (currentStep === 2 && stepNumber > 2) {
            if (!validateStep2()) return;
        }

        // Prepare Summary for Step 4
        if (stepNumber === 4) {
            prepareSummary();
        }

        showStep(stepNumber);
    }

    function showStep(stepNumber) {
        const currentEl = document.getElementById(`step-${currentStep === 'success' ? 'success' : currentStep}`);
        const nextEl = document.getElementById(`step-${stepNumber}`);

        if (currentEl && nextEl) {
            // Animation Direction
            if (stepNumber === 'success' || stepNumber > currentStep) {
                currentEl.classList.add('prev');
            } else {
                currentEl.classList.remove('prev');
            }

            currentEl.classList.remove('active');
            
            setTimeout(() => {
                nextEl.classList.add('active');
                if (stepNumber !== 'success') {
                    currentStep = stepNumber;
                    updateProgress();
                } else {
                    currentStep = 'success';
                }
            }, 400); // Wait for fade out
        }
    }

    function validateStep2() {
        const first = document.getElementById('firstName').value;
        const last = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;

        if (!first || !last || !email || !pass) {
            alert("Please provide your full identity details.");
            return false;
        }
        
        if (!email.includes('@')) {
            alert("Please provide a valid email address.");
            return false;
        }

        return true;
    }

    function selectRole(role, element) {
        // Update Hidden Input
        document.getElementById('role').value = role;

        // UI Feedback
        document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
        element.classList.add('active');
    }

    function updateProgress() {
        const dots = document.querySelectorAll('.step-dot');
        dots.forEach((dot, index) => {
            if (index < currentStep) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    function prepareSummary() {
        const first = document.getElementById('firstName').value;
        const last = document.getElementById('lastName').value;
        const role = document.getElementById('role').value;
        
        const summaryEl = document.getElementById('review-summary');
        if (summaryEl) {
            summaryEl.innerText = `${first} ${last} | ${role.replace('_', ' ')}`;
        }
    }

    async function submit() {
        const btn = document.getElementById('auth-btn');
        const first = document.getElementById('firstName').value;
        const last = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        btn.disabled = true;
        btn.innerText = "SUBMITTING APPLICATION...";

        try {
            // Use existing CibelleAuth core
            // Note: Middle name is empty for now per user requirements split
            await CibelleAuth.signup(first, '', last, email, pass, role);
            
            // Show Success Screen
            goToStep('success');
            const progress = document.getElementById('onboarding-progress');
            if (progress) progress.style.opacity = '0';

        } catch (err) {
            alert(err.message);
            btn.disabled = false;
            btn.innerText = "SUBMIT APPLICATION";
        }
    }

    return { init, goToStep, selectRole, submit };
})();

document.addEventListener('DOMContentLoaded', () => Onboarding.init());

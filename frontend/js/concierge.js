/**
 * Cibelle Concierge — Real-time Chat Engine
 * Communicates with /api/concierge/message
 * Shows typing indicator, timestamps, smooth animations
 */
const Concierge = (() => {

    let isOpen = false;

    function formatTime() {
        return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }

    function getBody() { return document.getElementById('concierge-body'); }

    function scrollToBottom() {
        const body = getBody();
        if (body) body.scrollTop = body.scrollHeight;
    }

    function showTyping() {
        const el = document.getElementById('concierge-typing');
        if (el) el.style.display = 'flex';
        scrollToBottom();
    }

    function hideTyping() {
        const el = document.getElementById('concierge-typing');
        if (el) el.style.display = 'none';
    }

    function appendMessage(text, role) {
        const body = getBody();
        if (!body) return;

        const msg = document.createElement('div');
        msg.className = `message ${role}`;
        msg.innerHTML = `<p>${text}</p><span class="msg-time">${formatTime()}</span>`;
        msg.style.opacity = '0';
        msg.style.transform = 'translateY(10px)';
        body.appendChild(msg);

        requestAnimationFrame(() => {
            msg.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
            msg.style.opacity = '1';
            msg.style.transform = 'translateY(0)';
        });

        scrollToBottom();
    }

    async function send() {
        const input = document.getElementById('concierge-input');
        const btn   = document.getElementById('concierge-send-btn');
        if (!input) return;

        const message = input.value.trim();
        if (!message) return;

        // Render user message
        appendMessage(message, 'user');
        input.value = '';
        if (btn) btn.disabled = true;

        // Show typing indicator
        showTyping();

        try {
            const res = await fetch('/api/concierge/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            const data = await res.json();

            hideTyping();
            appendMessage(data.reply, 'assistant');
        } catch (err) {
            hideTyping();
            appendMessage("My apologies — I seem to be momentarily unavailable. Please try again shortly.", 'assistant');
        }

        if (btn) btn.disabled = false;
        input.focus();
    }

    function toggle() {
        isOpen = !isOpen;
        const panel = document.getElementById('concierge-panel');
        const fab   = document.getElementById('concierge-fab');
        const unread = document.getElementById('fab-unread');

        if (panel) panel.classList.toggle('active', isOpen);
        if (fab)   fab.classList.toggle('active',   isOpen);
        if (unread && isOpen) unread.style.display = 'none';

        if (isOpen) {
            setTimeout(() => {
                const input = document.getElementById('concierge-input');
                if (input) input.focus();
                scrollToBottom();
            }, 300);
        }
    }

    // Show FAB unread badge after 3s (encourage engagement)
    function init() {
        setTimeout(() => {
            const panel = document.getElementById('concierge-panel');
            if (panel && !panel.classList.contains('active')) {
                const unread = document.getElementById('fab-unread');
                if (unread) unread.style.display = 'flex';
            }
        }, 3000);
    }

    return { send, toggle, init };
})();

// Legacy shim
function toggleConcierge() { Concierge.toggle(); }

document.addEventListener('DOMContentLoaded', () => Concierge.init());

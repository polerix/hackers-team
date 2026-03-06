/* ═══════════════════════════════════════════════════════════
   fx.js — Visual Effects: Matrix Rain, Glitch, Scanlines
   ═══════════════════════════════════════════════════════════ */

const FX = (() => {
    // ── Matrix Rain ──────────────────────────────────────────
    const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ';
    const FONT_SIZE = 13;

    function initRain(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        let drops = [];
        let animId = null;

        function resize() {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const cols = Math.floor(canvas.width / FONT_SIZE);
            drops = Array.from({ length: cols }, () => Math.random() * -50);
        }

        function frame() {
            ctx.fillStyle = 'rgba(5,5,16,0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = `${FONT_SIZE}px "Share Tech Mono", monospace`;

            drops.forEach((y, i) => {
                const char = CHARS[Math.floor(Math.random() * CHARS.length)];
                const bright = y === Math.floor(y) && Math.random() > 0.9;
                ctx.fillStyle = bright ? '#AAFFCC' : i % 5 === 0 ? '#004411' : '#00FF41';
                ctx.fillText(char, i * FONT_SIZE, y * FONT_SIZE);
                if (y * FONT_SIZE > canvas.height && Math.random() > 0.97) {
                    drops[i] = 0;
                }
                drops[i] += 0.5;
            });
            animId = requestAnimationFrame(frame);
        }

        resize();
        window.addEventListener('resize', resize);
        animId = requestAnimationFrame(frame);

        return {
            stop() { cancelAnimationFrame(animId); },
            start() { animId = requestAnimationFrame(frame); }
        };
    }

    // ── Typewriter Effect ────────────────────────────────────
    function typewriter(el, text, speed = 40, onDone = null) {
        el.textContent = '';
        let i = 0;
        function tick() {
            if (i < text.length) {
                el.textContent += text[i++];
                setTimeout(tick, speed + Math.random() * 20);
            } else if (onDone) {
                setTimeout(onDone, 300);
            }
        }
        tick();
    }

    // ── Glitch Transition ────────────────────────────────────
    function glitchEl(el, duration = 400) {
        el.style.animation = 'none';
        el.offsetHeight; // reflow
        el.style.animation = `glitch-in ${duration}ms ease-out`;
    }

    // ── Boot Sequence ─────────────────────────────────────────
    const BOOT_LINES = [
        'INITIALIZING UPLINK STACK...',
        'SPOOFING GIBSON GATEWAY...',
        'CONNECTING TO SERVER...',
    ];

    function runBootSequence(onComplete) {
        const lines = ['boot-line-1', 'boot-line-2', 'boot-line-3'];
        let lineIdx = 0;

        function nextLine() {
            if (lineIdx >= lines.length) {
                if (onComplete) onComplete();
                return;
            }
            const el = document.getElementById(lines[lineIdx]);
            if (el) {
                typewriter(el, BOOT_LINES[lineIdx], 35, () => {
                    lineIdx++;
                    setTimeout(nextLine, 200);
                });
            } else {
                lineIdx++;
                nextLine();
            }
        }
        nextLine();
    }

    // ── Intro Quotes ─────────────────────────────────────────
    const QUOTES = [
        'HACK THE PLANET',
        'WE ARE SAMURAI.\nTHE KEYBOARD COWBOYS.',
        'MESS WITH THE BEST\nDIE LIKE THE REST',
        'ZERO COOL IS BACK',
        'CRASH OVERRIDE\nONLINE',
    ];

    function runIntroAnimation(onDone) {
        const quoteEl = document.getElementById('intro-quote');
        const barFill = document.getElementById('intro-bar-fill');
        if (!quoteEl || !barFill) { if (onDone) onDone(); return; }

        const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        quoteEl.style.whiteSpace = 'pre-line';

        // Animate progress bar
        barFill.style.width = '0%';
        setTimeout(() => { barFill.style.width = '100%'; }, 50);

        typewriter(quoteEl, quote, 60, () => {
            setTimeout(() => { if (onDone) onDone(); }, 1200);
        });
    }

    // ── Rain instances registry ───────────────────────────────
    const rains = {};

    function startRain(id) {
        if (!rains[id]) rains[id] = initRain(id);
        else rains[id].start();
    }

    function stopRain(id) {
        if (rains[id]) rains[id].stop();
    }

    // ── Screen Transition ────────────────────────────────────
    function switchToScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const next = document.getElementById(id);
        if (next) next.classList.add('active');
    }

    return {
        initRain,
        startRain,
        stopRain,
        typewriter,
        glitchEl,
        runBootSequence,
        runIntroAnimation,
        switchToScreen,
        QUOTES,
    };
})();

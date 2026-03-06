/* ═══════════════════════════════════════════════════════════
   app.js — App State Machine
   Coordinates all screens, socket events, and game state.
   ═══════════════════════════════════════════════════════════ */

const App = (() => {

    // ── State ─────────────────────────────────────────────────
    let state = 'boot';  // boot | menu | lobby | intro | game | gameover
    let isHost = false;
    let gameId = null;
    let gridPending = null;   // grid data received before intro done
    let commandTimer = null;
    let commandDuration = 0;
    let showingTrace = false;
    let showingVirus = false;

    // Mouse shake tracking
    let lastMouseX = 0, lastMouseY = 0, shakeCount = 0;

    // ── Matrix rain instances ─────────────────────────────────
    let rains = {};

    // ── Init ──────────────────────────────────────────────────
    function init() {
        FX.startRain('matrix-rain');
        FX.runBootSequence(() => {
            // Boot sequence keeps running until socket welcomes us
        });

        Socket.connect();

        // ── Socket event → App handlers ───────────────────────
        Socket.on('_connected', () => {
            const dot = document.getElementById('conn-dot');
            const lbl = document.getElementById('conn-label');
            if (dot) { dot.classList.add('connected'); }
            if (lbl) lbl.textContent = 'UPLINK ESTABLISHED';
        });

        Socket.on('_disconnected', () => {
            const dot = document.getElementById('conn-dot');
            const lbl = document.getElementById('conn-label');
            if (dot) dot.classList.remove('connected');
            if (lbl) lbl.textContent = 'CONNECTION LOST…';
        });

        Socket.on('welcome', () => {
            // Connected — show main menu
            setTimeout(() => goMenu(), 800);
        });

        Socket.on('game_join_success', data => {
            gameId = data.game_id;
            goLobby(data);
        });

        Socket.on('game_join_fail', data => {
            const err = document.getElementById('menu-error');
            if (err) {
                err.textContent = '⚠ ' + (data.message || 'Connection refused');
                err.classList.remove('hidden');
                setTimeout(() => err.classList.add('hidden'), 3500);
            }
        });

        Socket.on('game_info', data => {
            if (state === 'lobby') updateLobby(data);
        });

        Socket.on('game_started', () => {
            if (state === 'lobby') goIntro();
        });

        Socket.on('grid', data => {
            if (state === 'intro') {
                // Store for after intro done
                gridPending = data;
            } else if (state === 'game') {
                Grid.loadGrid(data);
            }
        });

        Socket.on('command', data => {
            if (state === 'game') handleCommand(data);
        });

        Socket.on('health_info', data => {
            if (state === 'game') updateHealth(data.health, data.death_limit);
        });

        Socket.on('next_level', data => {
            if (state === 'game') showNextLevel(data);
        });

        Socket.on('game_over', () => {
            goGameOver();
        });

        Socket.on('flip_grid', () => {
            if (state === 'game') Grid.flipGrid();
        });

        Socket.on('safe', () => {
            hideSpecialOverlays();
            showingTrace = false;
            showingVirus = false;
        });

        Socket.on('player_disconnected', () => {
            const err = document.getElementById('menu-error');
            showErrorAndGoMenu('A hacker disconnected. Session ended.');
        });

        // ── UI Event bindings ─────────────────────────────────
        bindMenuButtons();
        bindLobbyButtons();
        bindGameButtons();
        bindKeyboard();
        bindMouseShake();
        bindTouchShake();
    }

    // ════════════════════════════════════════════════════
    //  SCREEN: BOOT
    // ════════════════════════════════════════════════════
    // (handled in init + welcome event)

    // ════════════════════════════════════════════════════
    //  SCREEN: MENU
    // ════════════════════════════════════════════════════
    function goMenu() {
        state = 'menu';
        Grid.clearGrid();
        hideSpecialOverlays();
        FX.switchToScreen('screen-menu');
        FX.startRain('matrix-rain-menu');
        isHost = false;
        gameId = null;
    }

    function bindMenuButtons() {
        // Create session
        document.getElementById('btn-create').addEventListener('click', () => {
            document.getElementById('modal-create').classList.remove('hidden');
            document.getElementById('input-session-name').focus();
        });
        document.getElementById('btn-create-cancel').addEventListener('click', () => {
            document.getElementById('modal-create').classList.add('hidden');
        });
        document.getElementById('btn-create-confirm').addEventListener('click', () => {
            const name = document.getElementById('input-session-name').value.trim();
            const pub = document.getElementById('input-public').checked;
            if (!name) return;
            isHost = true;
            Socket.emitCreateGame(name, pub);
            document.getElementById('modal-create').classList.add('hidden');
        });
        document.getElementById('input-session-name').addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('btn-create-confirm').click();
        });

        // Join session
        document.getElementById('btn-join').addEventListener('click', () => {
            document.getElementById('modal-join').classList.remove('hidden');
            document.getElementById('input-game-id').focus();
        });
        document.getElementById('btn-join-cancel').addEventListener('click', () => {
            document.getElementById('modal-join').classList.add('hidden');
        });
        document.getElementById('btn-join-confirm').addEventListener('click', () => {
            const id = document.getElementById('input-game-id').value.trim();
            if (!id) return;
            Socket.emitJoinGame(id);
            document.getElementById('modal-join').classList.add('hidden');
        });
        document.getElementById('input-game-id').addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('btn-join-confirm').click();
        });
    }

    // ════════════════════════════════════════════════════
    //  SCREEN: LOBBY
    // ════════════════════════════════════════════════════
    function goLobby(data) {
        state = 'lobby';
        FX.switchToScreen('screen-lobby');
        if (data) updateLobby(data);

        // Show host controls if we're host
        const hostCtrl = document.getElementById('lobby-host-controls');
        const startBtn = document.getElementById('btn-start');
        if (isHost) {
            hostCtrl.classList.remove('hidden');
            startBtn.classList.remove('hidden');
        } else {
            hostCtrl.classList.add('hidden');
            startBtn.classList.add('hidden');
        }
    }

    function updateLobby(data) {
        // Update session ID display
        if (data.game_id) {
            gameId = data.game_id;
            const el = document.getElementById('lobby-game-id');
            if (el) el.textContent = data.game_id.toUpperCase();
        }

        // Update player slots
        const slotsEl = document.getElementById('lobby-slots');
        if (!slotsEl || !data.slots) return;
        slotsEl.innerHTML = '';

        const maxSlots = data.max_players || 4;
        for (let i = 0; i < maxSlots; i++) {
            const slot = data.slots[i];
            const row = document.createElement('div');
            row.className = 'slot-row' + (slot ? ' filled' : '') + (slot && slot.ready ? ' ready' : '');

            const indicator = document.createElement('span');
            indicator.className = 'slot-indicator';
            indicator.textContent = slot ? (slot.ready ? '▶' : '░') : '░';

            const name = document.createElement('span');
            name.className = 'slot-name';
            name.textContent = slot ? slot.name.toUpperCase() : '— AWAITING UPLINK —';

            const status = document.createElement('span');
            status.className = slot && slot.ready ? 'slot-ready-badge' : 'slot-status';
            status.textContent = slot ? (slot.ready ? '◀ READY' : 'CONNECTED') : '';

            if (slot && slot.host) {
                const hTag = document.createElement('span');
                hTag.className = 'slot-status';
                hTag.textContent = 'HOST';
                row.appendChild(indicator);
                row.appendChild(name);
                row.appendChild(status);
                row.appendChild(hTag);
            } else {
                row.appendChild(indicator);
                row.appendChild(name);
                row.appendChild(status);
            }

            slotsEl.appendChild(row);
        }

        // Update start button state for host
        if (isHost) {
            const allReady = data.slots && data.slots.length >= 1 && data.slots.every(s => s.ready);
            const startBtn = document.getElementById('btn-start');
            if (startBtn) startBtn.disabled = !allReady;

            // Update size picker active state
            document.querySelectorAll('.size-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.size) === data.max_players);
            });
        }
    }

    function bindLobbyButtons() {
        document.getElementById('btn-ready').addEventListener('click', () => {
            Socket.emitReady();
        });

        document.getElementById('btn-start').addEventListener('click', () => {
            Socket.emitStartGame();
        });

        document.getElementById('btn-leave').addEventListener('click', () => {
            Socket.emitLeaveGame();
            goMenu();
        });

        document.getElementById('btn-copy-id').addEventListener('click', () => {
            const el = document.getElementById('lobby-game-id');
            if (el && el.textContent !== '—') {
                navigator.clipboard.writeText(el.textContent).catch(() => { });
                document.getElementById('btn-copy-id').textContent = '✓ OK';
                setTimeout(() => { document.getElementById('btn-copy-id').textContent = 'COPY'; }, 1500);
            }
        });

        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const size = parseInt(btn.dataset.size);
                Socket.emitChangeSettings({ size });
            });
        });
    }

    // ════════════════════════════════════════════════════
    //  SCREEN: INTRO
    // ════════════════════════════════════════════════════
    function goIntro() {
        state = 'intro';
        FX.switchToScreen('screen-intro');
        FX.startRain('matrix-rain-intro');

        FX.runIntroAnimation(() => {
            // Intro done — notify server
            Socket.emitIntroDone();
            // If grid already arrived, load and start game
            if (gridPending) {
                Grid.loadGrid(gridPending);
                gridPending = null;
                goGame();
            } else {
                // Wait for grid event, then go to game
                let gridWait = null;
                gridWait = data => {
                    Grid.loadGrid(data);
                    goGame();
                };
                Socket.on('grid', gridWait);
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  SCREEN: GAME
    // ════════════════════════════════════════════════════
    function goGame() {
        state = 'game';
        FX.switchToScreen('screen-game');
        updateHealth(50, 0);
        updateCommandText('STAND BY…', 'neutral');
    }

    function handleCommand(data) {
        const { text, time, expired } = data;

        // Flash result of PREVIOUS command
        if (expired === true) flashCommand('expired');
        else if (expired === false) flashCommand('completed');

        // Detect special events
        const lc = text.toLowerCase();
        if (lc.includes('trace') || lc.includes('shake')) {
            showTraceOverlay();
            return;
        }
        if (lc.includes('virus') || (lc.includes('mash') && lc.includes('enter'))) {
            showVirusOverlay();
            return;
        }

        // Normal command
        hideSpecialOverlays();
        updateCommandText(text, 'neutral');
        startCommandTimer(time);
    }

    function updateCommandText(text, mode) {
        const el = document.getElementById('command-text');
        if (!el) return;
        el.textContent = text;
        el.className = 'command-text ' + (mode || 'neutral');
    }

    function flashCommand(type) {
        const el = document.getElementById('command-text');
        if (!el) return;
        el.classList.add(type);
        setTimeout(() => el.classList.remove(type), 500);
    }

    function startCommandTimer(seconds) {
        if (commandTimer) clearTimeout(commandTimer);
        const bar = document.getElementById('timer-bar');
        if (!bar) return;

        // Reset bar
        bar.style.transition = 'none';
        bar.style.width = '100%';
        bar.style.background = 'var(--neon-green)';
        bar.style.boxShadow = '0 0 8px var(--neon-green)';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                bar.style.transition = `width ${seconds}s linear`;
                bar.style.width = '0%';

                // Color transitions as time runs out
                const amberAt = seconds * 0.4 * 1000;
                const redAt = seconds * 0.15 * 1000;

                setTimeout(() => {
                    bar.style.background = 'var(--amber)';
                    bar.style.boxShadow = '0 0 8px var(--amber)';
                }, amberAt);
                setTimeout(() => {
                    bar.style.background = 'var(--danger)';
                    bar.style.boxShadow = '0 0 8px var(--danger)';
                }, redAt);
            });
        });
    }

    function updateHealth(health, deathLimit) {
        const fill = document.getElementById('health-fill');
        const pct = document.getElementById('health-pct');
        const mark = document.getElementById('death-marker');
        if (!fill) return;

        const healthPct = Math.max(0, Math.min(100, health));
        fill.style.width = healthPct + '%';
        if (pct) pct.textContent = Math.round(healthPct);

        // Color coding
        fill.className = 'health-fill';
        if (healthPct < 35) fill.classList.add('low');
        else if (healthPct < 60) fill.classList.add('mid');

        // Death limit marker
        if (mark && deathLimit !== undefined) {
            mark.style.left = Math.max(0, Math.min(100, deathLimit)) + '%';
        }
    }

    function showNextLevel(data) {
        const overlay = document.getElementById('overlay-nextlevel');
        const numEl = document.getElementById('next-level-num');
        const modEl = document.getElementById('next-level-mod');
        if (!overlay) return;

        if (numEl) numEl.textContent = `NODE ${data.level}`;
        if (modEl) modEl.textContent = data.text || '';

        document.getElementById('level-tag').textContent = `NODE ${data.level}`;

        overlay.classList.remove('hidden');
        FX.glitchEl(document.getElementById('next-level-num'));
        setTimeout(() => overlay.classList.add('hidden'), 2500);
    }

    // ── Special Events ────────────────────────────────────────
    function showTraceOverlay() {
        showingTrace = true;
        showingVirus = false;
        document.getElementById('overlay-trace').classList.remove('hidden');
        document.getElementById('overlay-virus').classList.add('hidden');
    }

    function showVirusOverlay() {
        showingVirus = true;
        showingTrace = false;
        document.getElementById('overlay-virus').classList.remove('hidden');
        document.getElementById('overlay-trace').classList.add('hidden');
    }

    function hideSpecialOverlays() {
        document.getElementById('overlay-trace').classList.add('hidden');
        document.getElementById('overlay-virus').classList.add('hidden');
    }

    function bindGameButtons() {
        // Overlay tap buttons
        document.getElementById('btn-trace-tap').addEventListener('click', () => {
            Socket.emitDefeatTrace();
        });
        document.getElementById('btn-virus-tap').addEventListener('click', () => {
            Socket.emitDefeatVirus();
        });

        // Emergency strip always-available buttons
        document.getElementById('btn-shake-trace').addEventListener('click', () => {
            if (state === 'game') Socket.emitDefeatTrace();
        });
        document.getElementById('btn-mash-virus').addEventListener('click', () => {
            if (state === 'game') Socket.emitDefeatVirus();
        });

        // Game over retry
        document.getElementById('btn-retry').addEventListener('click', () => {
            goMenu();
        });
    }

    function bindKeyboard() {
        document.addEventListener('keydown', e => {
            if (e.key === 'Enter' && state === 'game') {
                Socket.emitDefeatVirus();
            }
        });
    }

    function bindMouseShake() {
        document.addEventListener('mousemove', e => {
            if (state !== 'game') return;
            const dx = Math.abs(e.clientX - lastMouseX);
            const dy = Math.abs(e.clientY - lastMouseY);
            if (dx > 25 || dy > 25) {
                shakeCount++;
                if (shakeCount >= 5) {
                    Socket.emitDefeatTrace();
                    shakeCount = 0;
                }
            }
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });
    }

    function bindTouchShake() {
        let lastTX = 0, lastTY = 0, touchShakes = 0;
        document.addEventListener('touchmove', e => {
            if (state !== 'game') return;
            const t = e.touches[0];
            const dx = Math.abs(t.clientX - lastTX);
            const dy = Math.abs(t.clientY - lastTY);
            if (dx > 20 || dy > 20) {
                touchShakes++;
                if (touchShakes >= 5) {
                    Socket.emitDefeatTrace();
                    touchShakes = 0;
                }
            }
            lastTX = t.clientX; lastTY = t.clientY;
        }, { passive: true });
    }

    // ════════════════════════════════════════════════════
    //  SCREEN: GAME OVER
    // ════════════════════════════════════════════════════
    function goGameOver() {
        state = 'gameover';
        Grid.clearGrid();
        hideSpecialOverlays();
        FX.switchToScreen('screen-gameover');
    }

    function showErrorAndGoMenu(msg) {
        goMenu();
        setTimeout(() => {
            const err = document.getElementById('menu-error');
            if (err) {
                err.textContent = msg;
                err.classList.remove('hidden');
                setTimeout(() => err.classList.add('hidden'), 4000);
            }
        }, 300);
    }

    // ── Boot ──────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', init);

    return {
        get state() { return state; },
    };
})();

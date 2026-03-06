/* ═══════════════════════════════════════════════════════════
   grid.js — Control Panel Grid Renderer
   Renders the 4×4 game grid and handles all player interactions.
   ═══════════════════════════════════════════════════════════ */

const Grid = (() => {
    let _gridData = [];
    let _flipped = false;

    // ── Public: store and render grid ────────────────────────
    function loadGrid(gridDataArray) {
        _gridData = gridDataArray;
        _flipped = false;
        renderGrid();
    }

    function flipGrid() {
        _flipped = !_flipped;
        const container = document.getElementById('game-grid');
        if (container) {
            container.style.transform = _flipped ? 'scaleX(-1)' : '';
        }
    }

    function clearGrid() {
        const container = document.getElementById('game-grid');
        if (container) container.innerHTML = '';
        _gridData = [];
    }

    // ── Build the grid DOM ────────────────────────────────────
    function renderGrid() {
        const container = document.getElementById('game-grid');
        if (!container) return;
        container.innerHTML = '';

        _gridData.forEach(element => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.style.gridColumn = `${element.x + 1} / span ${element.w}`;
            cell.style.gridRow = `${element.y + 1} / span ${element.h}`;
            cell.dataset.name = element.name;

            // Flip label if grid is mirrored (so text stays legible)
            if (_flipped) cell.style.transform = 'scaleX(-1)';

            // Name label
            const nameEl = document.createElement('div');
            nameEl.className = 'control-name';
            if (element.alien) {
                nameEl.textContent = scrambleName(element.name);
                nameEl.classList.add('alien-name');
            } else if (element.symbol) {
                nameEl.textContent = '$' + element.name.toUpperCase();
            } else {
                nameEl.textContent = element.name.toUpperCase();
            }
            cell.appendChild(nameEl);

            // Control
            const wrap = document.createElement('div');
            wrap.className = 'control-wrap';
            const control = buildControl(element);
            if (control) wrap.appendChild(control);
            cell.appendChild(wrap);

            container.appendChild(cell);
        });
    }

    // ── Scramble text for Alien modifier ─────────────────────
    function scrambleName(name) {
        const GLYPHS = '!@#$%^&*<>?/|~ΩΔΠΣΨ';
        return name.split('').map(c =>
            c === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        ).join('');
    }

    // ── Dispatch to individual renderers ─────────────────────
    function buildControl(element) {
        switch (element.type) {
            case 'button': return buildButton(element);
            case 'slider': return buildSlider(element);
            case 'circular_slider': return buildCircularSlider(element);
            case 'buttons_slider': return buildButtonsSlider(element);
            case 'actions': return buildActions(element);
            case 'switch': return buildSwitch(element);
            default: return null;
        }
    }

    // ── Emit a command back to the server ─────────────────────
    function emitCommand(name, value = null) {
        const payload = { name };
        if (value !== null) payload.value = value;
        if (window.Socket) Socket.emitCommand(payload);
    }

    // ── Highlight a cell as targeted ─────────────────────────
    function highlightTarget(name) {
        document.querySelectorAll('.grid-cell').forEach(c => {
            c.classList.toggle('targeted', c.dataset.name === name);
        });
    }

    function clearHighlights() {
        document.querySelectorAll('.grid-cell.targeted').forEach(c => c.classList.remove('targeted'));
    }

    // ════════════════════════════════════════════════════
    // BUTTON
    // ════════════════════════════════════════════════════
    function buildButton(el) {
        const btn = document.createElement('button');
        btn.className = 'ctrl-button';
        btn.textContent = '▶ PRESS';
        btn.addEventListener('click', () => {
            btn.classList.add('activating');
            setTimeout(() => btn.classList.remove('activating'), 300);
            emitCommand(el.name, null);
        });
        return btn;
    }

    // ════════════════════════════════════════════════════
    // SLIDER
    // ════════════════════════════════════════════════════
    function buildSlider(el) {
        const wrap = document.createElement('div');
        wrap.className = 'ctrl-slider-wrap';

        const valDisplay = document.createElement('div');
        valDisplay.className = 'ctrl-slider-val';
        valDisplay.textContent = el.min ?? 0;

        const sliderEl = document.createElement('input');
        sliderEl.type = 'range';
        sliderEl.className = 'ctrl-slider';
        sliderEl.min = el.min ?? 0;
        sliderEl.max = el.max ?? 5;
        sliderEl.value = el.min ?? 0;
        sliderEl.step = 1;

        // Ticks
        const ticks = document.createElement('div');
        ticks.className = 'slider-ticks';
        for (let i = el.min; i <= el.max; i++) {
            const t = document.createElement('div');
            t.className = 'tick';
            ticks.appendChild(t);
        }

        sliderEl.addEventListener('input', () => {
            valDisplay.textContent = sliderEl.value;
        });
        sliderEl.addEventListener('change', () => {
            emitCommand(el.name, parseInt(sliderEl.value, 10));
        });

        wrap.appendChild(valDisplay);
        wrap.appendChild(sliderEl);
        wrap.appendChild(ticks);
        return wrap;
    }

    // ════════════════════════════════════════════════════
    // CIRCULAR SLIDER (Rotary Knob)
    // ════════════════════════════════════════════════════
    function buildCircularSlider(el) {
        const wrap = document.createElement('div');
        wrap.className = 'ctrl-circular-wrap';

        const min = el.min ?? 0;
        const max = el.max ?? 7;
        let current = min;

        // SVG knob ─────────────────────────
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '-55 -55 110 110');
        svg.classList.add('ctrl-knob');

        const r = 40;
        const circ = 2 * Math.PI * r;
        const startAngle = -220; // degrees (0 = 3 o'clock)
        const totalSweep = 260;  // degrees

        // Background arc
        const bg = document.createElementNS(NS, 'circle');
        bg.setAttribute('cx', 0); bg.setAttribute('cy', 0); bg.setAttribute('r', r);
        bg.setAttribute('fill', 'none');
        bg.setAttribute('stroke', 'rgba(0,255,65,0.15)');
        bg.setAttribute('stroke-width', 8);
        svg.appendChild(bg);

        // Active arc (dasharray trick)
        const arc = document.createElementNS(NS, 'circle');
        arc.setAttribute('cx', 0); arc.setAttribute('cy', 0); arc.setAttribute('r', r);
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke', '#00FF41');
        arc.setAttribute('stroke-width', 8);
        arc.setAttribute('stroke-linecap', 'round');
        arc.style.filter = 'drop-shadow(0 0 4px #00FF41)';
        // rotate so start is at ~220° from top
        arc.setAttribute('transform', 'rotate(-130)');
        svg.appendChild(arc);

        // Indicator dot
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('r', 5);
        dot.setAttribute('fill', '#00FF41');
        dot.style.filter = 'drop-shadow(0 0 4px #00FF41)';
        svg.appendChild(dot);

        // Value label
        const valLabel = document.createElement('div');
        valLabel.className = 'ctrl-knob-val';
        valLabel.textContent = current;

        function updateKnob(val) {
            current = Math.max(min, Math.min(max, val));
            valLabel.textContent = current;

            const pct = max === min ? 0 : (current - min) / (max - min);
            const sweep = totalSweep * pct;
            const dashFill = (sweep / 360) * circ;
            const dashGap = circ - dashFill;

            arc.setAttribute('stroke-dasharray', `${dashFill} ${dashGap}`);
            arc.setAttribute('stroke-dashoffset', '0');

            const angleRad = ((startAngle + sweep) * Math.PI) / 180;
            dot.setAttribute('cx', r * Math.cos(angleRad));
            dot.setAttribute('cy', r * Math.sin(angleRad));
        }
        updateKnob(min);

        // ── Drag / Touch interaction ──────
        let dragging = false, startY = 0, startVal = current;

        function getY(e) { return e.touches ? e.touches[0].clientY : e.clientY; }

        svg.addEventListener('mousedown', e => { dragging = true; startY = getY(e); startVal = current; e.preventDefault(); });
        svg.addEventListener('touchstart', e => { dragging = true; startY = getY(e); startVal = current; e.preventDefault(); }, { passive: false });

        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            const dy = startY - getY(e);
            const newVal = Math.round(startVal + dy / 15 * (max - min) / (max - min + 1));
            updateKnob(newVal);
        });
        document.addEventListener('touchmove', e => {
            if (!dragging) return;
            const dy = startY - getY(e);
            const newVal = Math.round(startVal + dy / 15 * (max - min) / (max - min + 1));
            updateKnob(newVal);
        }, { passive: false });

        const endDrag = () => {
            if (dragging) { dragging = false; emitCommand(el.name, current); }
        };
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);

        wrap.appendChild(svg);
        wrap.appendChild(valLabel);
        return wrap;
    }

    // ════════════════════════════════════════════════════
    // BUTTONS SLIDER (segmented value buttons)
    // ════════════════════════════════════════════════════
    function buildButtonsSlider(el) {
        const wrap = document.createElement('div');
        wrap.className = 'ctrl-btnsslider';

        const min = el.min ?? 0;
        const max = el.max ?? 4;
        let selected = min;

        for (let i = min; i <= max; i++) {
            const btn = document.createElement('button');
            btn.className = 'bslider-btn' + (i === min ? ' selected' : '');
            btn.textContent = i;
            btn.dataset.val = i;

            btn.addEventListener('click', () => {
                wrap.querySelectorAll('.bslider-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selected = i;
                emitCommand(el.name, i);
            });

            wrap.appendChild(btn);
        }
        return wrap;
    }

    // ════════════════════════════════════════════════════
    // ACTIONS (verb buttons)
    // ════════════════════════════════════════════════════
    function buildActions(el) {
        const wrap = document.createElement('div');
        wrap.className = 'ctrl-actions';

        (el.actions || []).forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.textContent = action.toUpperCase();

            btn.addEventListener('click', () => {
                btn.style.background = 'rgba(0,207,255,0.3)';
                setTimeout(() => { btn.style.background = ''; }, 200);
                emitCommand(el.name, action);
            });

            wrap.appendChild(btn);
        });
        return wrap;
    }

    // ════════════════════════════════════════════════════
    // SWITCH
    // ════════════════════════════════════════════════════
    function buildSwitch(el) {
        const wrap = document.createElement('div');
        wrap.className = 'ctrl-switch-wrap';

        let toggled = false;

        const body = document.createElement('div');
        body.className = 'switch-body';

        const thumb = document.createElement('div');
        thumb.className = 'switch-thumb';
        body.appendChild(thumb);

        const label = document.createElement('div');
        label.className = 'switch-label';
        label.textContent = 'OFF';

        function toggle() {
            toggled = !toggled;
            body.classList.toggle('on', toggled);
            label.classList.toggle('on', toggled);
            label.textContent = toggled ? 'ON' : 'OFF';
            emitCommand(el.name, toggled);
        }

        body.addEventListener('click', toggle);

        wrap.appendChild(body);
        wrap.appendChild(label);
        return wrap;
    }

    // ── Public API ────────────────────────────────────────────
    return {
        loadGrid,
        flipGrid,
        clearGrid,
        highlightTarget,
        clearHighlights,
        getGridData: () => _gridData,
    };
})();

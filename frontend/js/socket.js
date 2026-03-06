/* ═══════════════════════════════════════════════════════════
   socket.js — Socket.IO connection and event bindings
   ═══════════════════════════════════════════════════════════ */

const Socket = (() => {
    // ── Config — change to your backend host ─────────────────
    const SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.hostname}:4433`
        : window.location.origin;

    let _socket = null;
    let _handlers = {};

    // ── Connect ───────────────────────────────────────────────
    function connect() {
        _socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
        });

        // ── Server → Client Events ──────────────────────────────

        _socket.on('connect', () => {
            console.log('[Socket] connected as', _socket.id);
            _emit('_connected');
        });

        _socket.on('disconnect', () => {
            console.log('[Socket] disconnected');
            _emit('_disconnected');
        });

        _socket.on('welcome', data => {
            console.log('[Socket] welcome uid:', data.uid);
            _emit('welcome', data);
        });

        _socket.on('game_join_success', data => {
            console.log('[Socket] joined game', data.game_id);
            _emit('game_join_success', data);
        });

        _socket.on('game_join_fail', data => {
            console.warn('[Socket] join failed:', data.message);
            _emit('game_join_fail', data);
        });

        _socket.on('game_info', data => {
            _emit('game_info', data);
        });

        _socket.on('lobby_info', data => {
            _emit('lobby_info', data);
        });

        _socket.on('lobby_disposed', data => {
            _emit('lobby_disposed', data);
        });

        _socket.on('game_started', () => {
            console.log('[Socket] game started!');
            _emit('game_started');
        });

        _socket.on('grid', data => {
            console.log('[Socket] grid received', data);
            _emit('grid', data);
        });

        _socket.on('command', data => {
            console.log('[Socket] command:', data.text, '| time:', data.time, '| expired:', data.expired);
            _emit('command', data);
        });

        _socket.on('health_info', data => {
            _emit('health_info', data);
        });

        _socket.on('next_level', data => {
            console.log('[Socket] next level', data.level, data.text);
            _emit('next_level', data);
        });

        _socket.on('game_over', () => {
            console.log('[Socket] game over');
            _emit('game_over');
        });

        _socket.on('flip_grid', () => {
            console.log('[Socket] flip grid');
            _emit('flip_grid');
        });

        _socket.on('safe', () => {
            console.log('[Socket] safe — clear special overlay');
            _emit('safe');
        });

        _socket.on('player_disconnected', () => {
            console.warn('[Socket] player disconnected mid-game');
            _emit('player_disconnected');
        });

        // Error events (optional)
        const errEvents = [
            'error_missing_arguments', 'error_invalid_arguments',
            'error_unlinkable_client', 'error_not_in_game',
            'error_in_game', 'error_is_not_host',
        ];
        errEvents.forEach(ev => _socket.on(ev, () => console.warn('[Socket]', ev)));

        return _socket;
    }

    // ── Internal event bus ────────────────────────────────────
    function on(event, handler) {
        if (!_handlers[event]) _handlers[event] = [];
        _handlers[event].push(handler);
    }

    function _emit(event, data) {
        (_handlers[event] || []).forEach(h => h(data));
    }

    // ── Client → Server emitters ──────────────────────────────
    function emitCreateGame(name, isPublic) {
        _socket.emit('create_game', { name, public: isPublic });
    }

    function emitJoinGame(gameId) {
        _socket.emit('join_game', { game_id: gameId });
    }

    function emitJoinLobby() {
        _socket.emit('join_lobby');
    }

    function emitLeaveLobby() {
        _socket.emit('leave_lobby');
    }

    function emitReady() {
        _socket.emit('ready');
    }

    function emitLeaveGame() {
        _socket.emit('leave_game');
    }

    function emitStartGame() {
        _socket.emit('start_game');
    }

    function emitIntroDone() {
        _socket.emit('intro_done');
    }

    function emitCommand(payload) {
        _socket.emit('command', payload);
    }

    function emitChangeSettings(opts = {}) {
        _socket.emit('change_game_settings', opts);
    }

    function emitDefeatTrace() {
        _socket.emit('defeat_trace');
    }

    function emitDefeatVirus() {
        _socket.emit('defeat_virus');
    }

    return {
        connect,
        on,
        emitCreateGame,
        emitJoinGame,
        emitJoinLobby,
        emitLeaveLobby,
        emitReady,
        emitLeaveGame,
        emitStartGame,
        emitIntroDone,
        emitCommand,
        emitChangeSettings,
        emitDefeatTrace,
        emitDefeatVirus,
        get id() { return _socket ? _socket.id : null; },
        get connected() { return _socket ? _socket.connected : false; },
    };
})();

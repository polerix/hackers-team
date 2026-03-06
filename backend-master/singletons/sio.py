import socketio

from utils.singleton import singleton


@singleton
class Sio(socketio.AsyncServer):
    def __init__(self):
        super().__init__(async_mode='aiohttp', cors_allowed_origins='*')
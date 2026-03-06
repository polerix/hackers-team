class SpecialCommand:
    pass


class DummyTraceCommand(SpecialCommand):
    """
    A class representing an FBI trace event.
    Named 'dummy' because it's not in the grid — everyone must shake the mouse to break the trace.
    """
    pass


class DummyVirusCommand(SpecialCommand):
    """
    A class representing a virus/worm attack event.
    Named 'dummy' because it's not in the grid — everyone must mash Enter to kill the virus.
    """
    pass

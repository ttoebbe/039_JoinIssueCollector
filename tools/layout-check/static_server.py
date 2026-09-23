"""Static file server for the layout check.

Serves the repository root so the absolute paths of the site (/css/..., /js/...)
resolve. The server binds to port 0, so every run gets a port the operating
system has never handed to this browser profile: cached stylesheets from an
earlier run cannot leak into the measurement. no-store is sent on top.
"""

import contextlib
import functools
import http.server
import threading


class NoStoreHandler(http.server.SimpleHTTPRequestHandler):
    """Request handler that forbids caching and stays quiet."""

    def end_headers(self):
        """Add the no-cache headers before the header block is closed."""
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        """Suppress the per-request log line."""


class QuietThreadingServer(http.server.ThreadingHTTPServer):
    """Threaded server; a single thread refuses parallel script requests."""

    daemon_threads = True


@contextlib.contextmanager
def serve_directory(root):
    """Serve `root` on a fresh loopback port for the duration of the block.

    Args:
        root: Directory that becomes the document root.

    Yields:
        The base URL, for example ``http://127.0.0.1:53817``.
    """
    handler = functools.partial(NoStoreHandler, directory=str(root))
    server = QuietThreadingServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()

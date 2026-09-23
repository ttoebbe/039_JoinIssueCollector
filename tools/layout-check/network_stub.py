"""Network isolation for the layout check.

Firebase reads are answered from fixtures/firebase.json so the board always
has the same cards, independent of the live database. Firebase writes are
acknowledged without being sent, and every other external request (n8n,
analytics, anything new) is aborted: the check never touches live systems.
"""

import json
from pathlib import Path
from urllib.parse import urlsplit

FIREBASE_HOST = "joinv2withn8n-default-rtdb.europe-west1.firebasedatabase.app"
FIXTURE_PATH = Path(__file__).parent / "fixtures" / "firebase.json"
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def load_fixture():
    """Read the Firebase fixture.

    Returns:
        The fixture as a nested dict, shaped like the Realtime Database.
    """
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def lookup_fixture(fixture, url_path):
    """Resolve a Firebase REST path like ``/tasks/t1.json`` in the fixture.

    Args:
        fixture: Fixture dict from `load_fixture`.
        url_path: Path component of the request URL.

    Returns:
        The node at that path, or None when it does not exist.
    """
    node = fixture
    for key in url_path.removesuffix(".json").strip("/").split("/"):
        if not key:
            continue
        if not isinstance(node, dict) or key not in node:
            return None
        node = node[key]
    return node


def build_route_handler(base_url, fixture):
    """Create the handler that decides the fate of every browser request.

    Args:
        base_url: Origin of the local static server.
        fixture: Fixture dict answering Firebase reads.

    Returns:
        A Playwright route handler.
    """
    local_host = urlsplit(base_url).netloc

    def handle_route(route):
        """Serve locally, answer Firebase from the fixture, abort the rest."""
        parts = urlsplit(route.request.url)
        if parts.netloc == local_host:
            return route.continue_()
        if parts.netloc != FIREBASE_HOST:
            return route.abort()
        body = lookup_fixture(fixture, parts.path) if route.request.method == "GET" else {"name": "layout-check"}
        return route.fulfill(status=200, content_type="application/json",
                             headers=CORS_HEADERS, body=json.dumps(body))

    return handle_route

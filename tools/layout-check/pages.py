"""Pages and viewports the layout check covers.

`ready` names a selector that only exists once the page has rendered its data.
Without it an empty page would pass every invariant and the check would be
green for the wrong reason.
"""

VIEWPORTS = [
    (320, 568),
    (375, 667),
    (428, 926),
    (768, 1024),
    (1024, 768),
    (1280, 800),
    (1440, 1024),
]

PAGES = [
    {"name": "index", "path": "/index.html", "session": False, "ready": ".welcome-card"},
    {"name": "add-task", "path": "/html/pages/add-task.html", "session": True, "ready": "#add-task-form"},
    {"name": "add-task-form", "path": "/html/pages/add-task-form.html", "session": False, "ready": "#add-task-form"},
    {"name": "board", "path": "/html/pages/board.html", "session": True, "ready": ".board-card"},
    {"name": "contacts", "path": "/html/pages/contacts.html", "session": True, "ready": ".contact-entry"},
    {"name": "help", "path": "/html/pages/help.html", "session": False, "ready": "main"},
    {"name": "legal-notice", "path": "/html/pages/legal-notice.html", "session": False, "ready": "main"},
    {"name": "login", "path": "/html/pages/login.html", "session": False, "ready": "form"},
    {"name": "privacy-policy", "path": "/html/pages/privacy-policy.html", "session": False, "ready": "main"},
    {"name": "request", "path": "/html/pages/request.html", "session": False, "ready": "main"},
    {"name": "sign-up", "path": "/html/pages/sign-up.html", "session": False, "ready": "form"},
    {"name": "summary", "path": "/html/pages/summary.html", "session": True, "ready": ".summary-kpis > *"},
]

SESSION_SCRIPT = """
sessionStorage.setItem('join_current_user', JSON.stringify({name: 'Guest', guest: true}));
sessionStorage.setItem('animationShown', 'true');
"""


def select_pages(names):
    """Return the page entries whose name is in `names`, or all of them.

    Args:
        names: Page names from the command line, or an empty list.

    Returns:
        The matching page entries in matrix order.

    Raises:
        SystemExit: When a name does not exist, so a typo never passes silently.
    """
    if not names:
        return PAGES
    unknown = set(names) - {page["name"] for page in PAGES}
    if unknown:
        raise SystemExit(f"Unknown page(s): {', '.join(sorted(unknown))}")
    return [page for page in PAGES if page["name"] in names]


def select_viewports(labels):
    """Return the viewports matching labels like ``375x667``, or all of them.

    Args:
        labels: Viewport labels from the command line, or an empty list.

    Returns:
        A list of (width, height) tuples.
    """
    if not labels:
        return VIEWPORTS
    return [tuple(int(part) for part in label.lower().split("x")) for label in labels]

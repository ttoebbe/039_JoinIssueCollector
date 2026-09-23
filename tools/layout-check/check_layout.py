"""Layout regression check for Join.

Loads every page in every viewport of the matrix, waits until fonts and
animations have settled, and measures four invariants in the browser
(see invariants.js). Exits with 1 when at least one violation remains after
the allowlist, so CI turns red.

Usage:
    python tools/layout-check/check_layout.py
    python tools/layout-check/check_layout.py --page board --viewport 375x667
"""

import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

from network_stub import build_route_handler, load_fixture
from pages import SESSION_SCRIPT, select_pages, select_viewports
from report import build_report, publish_report
from static_server import serve_directory

TOOL_DIR = Path(__file__).parent
REPO_ROOT = TOOL_DIR.parent.parent
INVARIANTS_SCRIPT = TOOL_DIR / "invariants.js"
ALLOWLIST_PATH = TOOL_DIR / "allowlist.json"
READY_TIMEOUT_MS = 10000
ANIMATION_TIMEOUT_MS = 5000

SETTLE_SCRIPT = """async () => {
  await document.fonts.ready;
  const finite = document.getAnimations()
    .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity);
  const settled = Promise.all(finite.map((animation) => animation.finished.catch(() => null)));
  await Promise.race([settled, new Promise((resolve) => setTimeout(resolve, ANIMATION_TIMEOUT_MS))]);
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}""".replace("ANIMATION_TIMEOUT_MS", str(ANIMATION_TIMEOUT_MS))


def parse_arguments():
    """Read the command line.

    Returns:
        The parsed arguments.
    """
    parser = argparse.ArgumentParser(description="Check Join pages for layout regressions.")
    parser.add_argument("--page", action="append", default=[], help="Page name, repeatable.")
    parser.add_argument("--viewport", action="append", default=[], help="WIDTHxHEIGHT, repeatable.")
    parser.add_argument("--json", dest="json_path", help="Also write the violations as JSON.")
    return parser.parse_args()


def load_allowlist():
    """Read the allowlist and insist on a reason for every entry.

    Returns:
        The list of allowlist entries.
    """
    entries = json.loads(ALLOWLIST_PATH.read_text(encoding="utf-8"))
    for entry in entries:
        if not entry.get("reason", "").strip():
            raise SystemExit(f"Allowlist entry without reason: {entry}")
    return entries


def is_allowed(violation, allowlist):
    """Check whether an allowlist entry covers a violation.

    Args:
        violation: Violation record including its page name.
        allowlist: Entries from `load_allowlist`.

    Returns:
        True when invariant and selector match and the page matches or is omitted.
    """
    return any(
        entry["invariant"] == violation["invariant"]
        and entry["selector"] == violation["selector"]
        and entry.get("page", violation["page"]) == violation["page"]
        for entry in allowlist
    )


def build_failure(page, viewport_label, kind, detail):
    """Create a record for a page that could not be measured at all.

    Args:
        page: Page entry.
        viewport_label: Label such as ``375x667``.
        kind: Short failure name used in the invariant column.
        detail: What went wrong.

    Returns:
        A violation record, so an unmeasurable page turns the run red.
    """
    return {"page": page["name"], "viewport": viewport_label, "invariant": kind,
            "selector": page["path"], "expected": "page renders", "measured": detail, "culprit": ""}


def open_page(browser, base_url, page, viewport):
    """Open a page in a fresh context with session, stub and error capture.

    Args:
        browser: Playwright browser.
        base_url: Origin of the local server.
        page: Page entry.
        viewport: (width, height) tuple.

    Returns:
        A (context, tab, load_problems) tuple; load_problems collects uncaught
        errors and failed local requests.
    """
    context = browser.new_context(viewport={"width": viewport[0], "height": viewport[1]})
    if page["session"]:
        context.add_init_script(SESSION_SCRIPT)
    context.route("**/*", build_route_handler(base_url, load_fixture()))
    tab = context.new_page()
    load_problems = []
    tab.on("pageerror", lambda error: load_problems.append(str(error)))
    tab.on("requestfailed", lambda request: load_problems.append(
        f"request failed: {request.url} ({request.failure})") if base_url in request.url else None)
    tab.goto(base_url + page["path"], wait_until="networkidle")
    return context, tab, load_problems


def measure_page(browser, base_url, page, viewport):
    """Measure one page in one viewport.

    Args:
        browser: Playwright browser.
        base_url: Origin of the local server.
        page: Page entry.
        viewport: (width, height) tuple.

    Returns:
        The violation records for this combination.
    """
    label = f"{viewport[0]}x{viewport[1]}"
    context, tab, load_problems = open_page(browser, base_url, page, viewport)
    try:
        tab.wait_for_selector(page["ready"], state="attached", timeout=READY_TIMEOUT_MS)
        tab.evaluate(SETTLE_SCRIPT)
        tab.add_script_tag(path=str(INVARIANTS_SCRIPT))
        found = tab.evaluate("window.layoutInvariants.measureAll()")
    except PlaywrightError as error:
        detail = "; ".join([str(error).splitlines()[0], f"at {tab.url}", *load_problems])
        return [build_failure(page, label, "not ready", detail)]
    finally:
        context.close()
    found += [build_failure(page, label, "load error", message) for message in load_problems]
    return [{"page": page["name"], "viewport": label, **item} for item in found]


def run_matrix(pages, viewports):
    """Serve the repository and measure every page x viewport combination.

    Args:
        pages: Page entries to check.
        viewports: (width, height) tuples to check.

    Returns:
        All violation records, allowlisted ones included.
    """
    violations = []
    with serve_directory(REPO_ROOT) as base_url, sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        for page in pages:
            for viewport in viewports:
                violations += measure_page(browser, base_url, page, viewport)
        browser.close()
    return violations


def main():
    """Run the check and exit non-zero when any violation remains."""
    arguments = parse_arguments()
    pages = select_pages(arguments.page)
    viewports = select_viewports(arguments.viewport)
    allowlist = load_allowlist()
    violations = [item for item in run_matrix(pages, viewports) if not is_allowed(item, allowlist)]
    report = build_report(violations, len(pages) * len(viewports))
    publish_report(report, violations, arguments.json_path)
    sys.exit(1 if violations else 0)


if __name__ == "__main__":
    main()

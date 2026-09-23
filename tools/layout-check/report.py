"""Turns violation records into the report table.

The same Markdown table goes to stdout and, inside GitHub Actions, into the
job summary, so a red run shows the numbers without opening the log.
"""

import json
import os

COLUMNS = ["Page", "Viewport", "Inv.", "Selector", "Expected", "Measured", "Culprit"]


def escape_cell(value):
    """Make a value safe for a Markdown table cell.

    Args:
        value: Any printable value.

    Returns:
        The text with pipes escaped and line breaks flattened.
    """
    return str(value).replace("|", "\\|").replace("\n", " ")


def group_by_viewport(violations):
    """Merge records that differ only in their viewport into one row.

    Args:
        violations: Records with page, viewport and the in-page fields.

    Returns:
        Row cell lists in first-seen order, viewports joined with commas.
    """
    rows = {}
    for item in violations:
        key = (item["page"], item["invariant"], item["selector"],
               item["expected"], item["measured"], item.get("culprit", ""))
        rows.setdefault(key, []).append(item["viewport"])
    return [[key[0], ", ".join(viewports), *key[1:]] for key, viewports in rows.items()]


def build_table(violations):
    """Render violations as a Markdown table.

    Args:
        violations: Records with page, viewport and the in-page fields.

    Returns:
        The table as one string, header included.
    """
    lines = ["| " + " | ".join(COLUMNS) + " |", "|" + "---|" * len(COLUMNS)]
    for cells in group_by_viewport(violations):
        lines.append("| " + " | ".join(escape_cell(cell) for cell in cells) + " |")
    return "\n".join(lines)


def build_report(violations, checked_count):
    """Build the full report text: verdict line plus table if anything failed.

    Args:
        violations: All violation records of the run.
        checked_count: Number of page x viewport combinations measured.

    Returns:
        The report as Markdown.
    """
    if not violations:
        return f"Layout check passed: {checked_count} page x viewport combinations, no violations."
    heading = f"Layout check failed: {len(violations)} violation(s) in {checked_count} combinations."
    return heading + "\n\n" + build_table(violations)


def publish_report(text, violations, json_path=None):
    """Print the report and write it to the optional outputs.

    Args:
        text: Report as built by `build_report`.
        violations: Raw records, written as JSON when `json_path` is set.
        json_path: Optional file for machine-readable output.
    """
    print(text)
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as summary:
            summary.write(text + "\n")
    if json_path:
        with open(json_path, "w", encoding="utf-8") as target:
            json.dump(violations, target, indent=2, ensure_ascii=False)

/**
 * @file In-page measurement for the layout check (tools/layout-check).
 * Injected by check_layout.py into every page under test and never shipped
 * with the site. Exposes `window.layoutInvariants.measureAll()`, which
 * returns one record per violated invariant:
 *   1 - a scroll container is wider inside than outside
 *   2 - an element sticks out of its parent's padding box
 *   3 - two stacked siblings overlap vertically
 *   4 - visible content in main comes closer than 16 px to the edge of its surface
 */
(() => {
  const TOLERANCE_PX = 1;
  const SCROLLING = ['auto', 'scroll'];
  const CLIPPING = [...SCROLLING, 'hidden', 'clip'];
  const MAX_SEGMENTS = 4;
  const MIN_GUTTER_PX = 16;
  const REPLACED_TAGS = ['IMG', 'svg', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'VIDEO', 'CANVAS'];

  /**
   * Checks whether an element takes part in the rendered layout.
   * @param {Element} element - Element to test.
   * @returns {boolean} True when it is displayed, visible and has a size.
   */
  function isRendered(element) {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  }

  /**
   * Checks whether an element is positioned outside the normal flow.
   * @param {Element} element - Element to test.
   * @returns {boolean} True for absolute and fixed positioning.
   */
  function isOutOfFlow(element) {
    const position = getComputedStyle(element).position;
    return position === 'absolute' || position === 'fixed';
  }

  /**
   * Builds the tag-and-class signature of an element.
   * @param {Element} element - Element to describe.
   * @returns {string} Tag plus its first two classes, e.g. `section.board-column`.
   */
  function getSignature(element) {
    const classes = [...element.classList].slice(0, 2).map((name) => `.${name}`).join('');
    return `${element.tagName.toLowerCase()}${classes}`;
  }

  /**
   * Builds one readable selector segment for an element.
   * @param {Element} element - Element to describe.
   * @returns {string} Id, or signature plus nth-of-type when siblings share it.
   */
  function describeSegment(element) {
    if (element.id) return `#${element.id}`;
    const signature = getSignature(element);
    const siblings = element.parentElement ? [...element.parentElement.children] : [];
    if (siblings.filter((sibling) => getSignature(sibling) === signature).length < 2) return signature;
    const twins = siblings.filter((sibling) => sibling.tagName === element.tagName);
    return `${signature}:nth-of-type(${twins.indexOf(element) + 1})`;
  }

  /**
   * Builds a selector path up to the nearest ancestor with an id, keeping
   * at most the last MAX_SEGMENTS segments so table cells stay readable.
   * @param {Element} element - Element to describe.
   * @returns {string} Selector such as `.board-columns > section.board-column:nth-of-type(2)`.
   */
  function describe(element) {
    const segments = [];
    let current = element;
    while (current && current !== document.documentElement && current !== document.body) {
      segments.unshift(describeSegment(current));
      if (current.id) break;
      current = current.parentElement;
    }
    if (!segments.length) return 'body';
    const kept = segments.slice(-MAX_SEGMENTS).join(' > ');
    return segments.length > MAX_SEGMENTS ? `... > ${kept}` : kept;
  }

  /**
   * Returns the rendered, in-flow element children of a parent.
   * @param {Element} parent - Parent element.
   * @returns {Element[]} Children that take part in the flow layout.
   */
  function getFlowChildren(parent) {
    return [...parent.children].filter((child) => isRendered(child) && !isOutOfFlow(child));
  }

  /**
   * Checks whether an element covers any area; a zero-width placeholder
   * next to a column shares its left edge without being stacked on it.
   * @param {Element} element - Element to test.
   * @returns {boolean} True when width and height both exceed the tolerance.
   */
  function hasArea(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > TOLERANCE_PX && rect.height > TOLERANCE_PX;
  }

  /**
   * Computes the padding box of an element in viewport coordinates.
   * @param {Element} element - Element to measure.
   * @returns {{left: number, right: number, top: number, bottom: number}} Padding box.
   */
  function getPaddingBox(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      left: rect.left + parseFloat(style.borderLeftWidth),
      right: rect.right - parseFloat(style.borderRightWidth),
      top: rect.top + parseFloat(style.borderTopWidth),
      bottom: rect.bottom - parseFloat(style.borderBottomWidth),
    };
  }

  /**
   * Finds the outermost descendant whose right edge passes a limit.
   * @param {Element} container - Container to search.
   * @param {number} limit - Right edge in viewport coordinates.
   * @returns {Element|null} The first offending descendant in document order.
   */
  function findOverflowCulprit(container, limit) {
    for (const element of container.querySelectorAll('*')) {
      if (element instanceof SVGElement && !(element instanceof SVGSVGElement)) continue;
      if (isRendered(element) && element.getBoundingClientRect().right > limit + TOLERANCE_PX) {
        return element;
      }
    }
    return null;
  }

  /**
   * Checks whether an element clips horizontally without truncating on purpose.
   * @param {Element} element - Element to test.
   * @returns {boolean} True for overflow-x other than visible, unless text-overflow is ellipsis.
   */
  function isUnintendedClipper(element) {
    const style = getComputedStyle(element);
    return CLIPPING.includes(style.overflowX) && style.textOverflow !== 'ellipsis' && isRendered(element);
  }

  /**
   * Lists the containers that can scroll or clip horizontally.
   * @returns {Element[]} The document scroller plus every element with overflow-x set.
   */
  function getScrollContainers() {
    const clippers = [...document.body.querySelectorAll('*')].filter(isUnintendedClipper);
    return [document.scrollingElement, ...clippers];
  }

  /**
   * Invariant 1: no scroll container may be wider inside than outside.
   * @returns {Object[]} Violation records.
   */
  function checkHorizontalOverflow() {
    return getScrollContainers().flatMap((container) => {
      const excess = container.scrollWidth - container.clientWidth;
      if (excess <= TOLERANCE_PX) return [];
      const isRoot = container === document.scrollingElement;
      const limit = isRoot ? container.clientWidth : getPaddingBox(container).left + container.clientWidth;
      const culprit = findOverflowCulprit(isRoot ? document.body : container, limit);
      return [{
        invariant: 1,
        selector: isRoot ? 'document' : describe(container),
        expected: `scrollWidth <= ${container.clientWidth}`,
        measured: `scrollWidth = ${container.scrollWidth} (+${excess})`,
        culprit: culprit ? `${describe(culprit)} right = ${Math.round(culprit.getBoundingClientRect().right)}` : '',
      }];
    });
  }

  /**
   * Lists the sides on which a child leaves its parent's padding box.
   * @param {DOMRect} rect - Child border box.
   * @param {Object} box - Parent padding box.
   * @param {CSSStyleDeclaration} parentStyle - Computed style of the parent.
   * @returns {string[]} Descriptions like `right +40` for every exceeded side.
   */
  function getExceededSides(rect, box, parentStyle) {
    const sides = [];
    const scrollsX = SCROLLING.includes(parentStyle.overflowX);
    const scrollsY = SCROLLING.includes(parentStyle.overflowY);
    if (!scrollsX && box.left - rect.left > TOLERANCE_PX) sides.push(`left +${Math.round(box.left - rect.left)}`);
    if (!scrollsX && rect.right - box.right > TOLERANCE_PX) sides.push(`right +${Math.round(rect.right - box.right)}`);
    if (!scrollsY && box.top - rect.top > TOLERANCE_PX) sides.push(`top +${Math.round(box.top - rect.top)}`);
    if (!scrollsY && rect.bottom - box.bottom > TOLERANCE_PX) sides.push(`bottom +${Math.round(rect.bottom - box.bottom)}`);
    return sides;
  }

  /**
   * Checks whether a child/parent pair is subject to invariant 2.
   * @param {Element} element - Child element.
   * @param {Element} parent - Its parent element.
   * @returns {boolean} False for SVG internals, inline parents and out-of-flow children.
   */
  function isContainmentCandidate(element, parent) {
    if (!parent || parent === document.documentElement) return false;
    if (element instanceof SVGElement && !(element instanceof SVGSVGElement)) return false;
    const display = getComputedStyle(parent).display;
    if (display === 'inline' || display === 'contents') return false;
    return isRendered(element) && !isOutOfFlow(element);
  }

  /**
   * Invariant 2: no element may leave the padding box of its parent.
   * @returns {Object[]} Violation records.
   */
  function checkContainment() {
    return [...document.body.querySelectorAll('*')].flatMap((element) => {
      const parent = element.parentElement;
      if (!isContainmentCandidate(element, parent)) return [];
      const box = getPaddingBox(parent);
      const sides = getExceededSides(element.getBoundingClientRect(), box, getComputedStyle(parent));
      if (!sides.length) return [];
      return [{
        invariant: 2,
        selector: describe(element),
        expected: `inside padding box of ${describeSegment(parent)}`,
        measured: sides.join(', '),
        culprit: '',
      }];
    });
  }

  /**
   * Computes the vertical range an element actually paints, including
   * in-flow descendants that spill out of it. Descendants of clipping
   * elements are cut off there; absolute and fixed descendants are overlays
   * by intent and do not count.
   * @param {Element} element - Element to measure.
   * @returns {{top: number, bottom: number}} Painted vertical extent.
   */
  function getPaintedExtent(element) {
    const rect = element.getBoundingClientRect();
    const extent = { top: rect.top, bottom: rect.bottom };
    if (CLIPPING.includes(getComputedStyle(element).overflowY)) return extent;
    for (const child of element.children) {
      if (!isRendered(child) || isOutOfFlow(child) || child instanceof SVGElement) continue;
      const inner = getPaintedExtent(child);
      extent.top = Math.min(extent.top, inner.top);
      extent.bottom = Math.max(extent.bottom, inner.bottom);
    }
    return extent;
  }

  /**
   * Builds the violation record for two overlapping stacked siblings.
   * @param {Element} upper - Earlier sibling.
   * @param {Element} lower - Later sibling.
   * @param {number} overlap - Overlap in pixels.
   * @returns {Object} Violation record.
   */
  function buildOverlapRecord(upper, lower, overlap) {
    return {
      invariant: 3,
      selector: `${describe(upper)} / ${describeSegment(lower)}`,
      expected: 'painted extents do not intersect',
      measured: `overlap ${Math.round(overlap)} px (upper paints to ${Math.round(getPaintedExtent(upper).bottom)}, lower starts at ${Math.round(getPaintedExtent(lower).top)})`,
      culprit: '',
    };
  }

  /**
   * Checks every pair of left-aligned siblings of one parent for overlap.
   * @param {Element} parent - Parent whose flow children are compared.
   * @returns {Object[]} Violation records.
   */
  function checkSiblingStack(parent) {
    const children = getFlowChildren(parent).filter(hasArea);
    const records = [];
    children.forEach((upper, index) => {
      const upperLeft = upper.getBoundingClientRect().left;
      for (const lower of children.slice(index + 1)) {
        if (Math.abs(lower.getBoundingClientRect().left - upperLeft) > TOLERANCE_PX) continue;
        const overlap = Math.min(getPaintedExtent(upper).bottom, getPaintedExtent(lower).bottom)
          - Math.max(getPaintedExtent(upper).top, getPaintedExtent(lower).top);
        if (overlap > TOLERANCE_PX) records.push(buildOverlapRecord(upper, lower, overlap));
      }
    });
    return records;
  }

  /**
   * Invariant 3: stacked siblings (same left edge) must not overlap.
   * @returns {Object[]} Violation records.
   */
  function checkStackOverlap() {
    return [document.body, ...document.body.querySelectorAll('*')]
      .filter((element) => element.children.length > 1 && isRendered(element) && !(element instanceof SVGElement))
      .flatMap(checkSiblingStack);
  }

  /**
   * Checks whether an element sits in a horizontal scroller or an overlay
   * inside `main`, where touching the edge is intended. `main` itself may
   * scroll without exempting anything.
   * @param {Element} element - Element to test.
   * @param {Element} main - The page's main element, where the search stops.
   * @returns {boolean} True when an ancestor below `main` scrolls in x or is out of flow.
   */
  function isExemptFromGutter(element, main) {
    for (let current = element.parentElement; current && current !== main; current = current.parentElement) {
      if (SCROLLING.includes(getComputedStyle(current).overflowX) || isOutOfFlow(current)) return true;
    }
    return false;
  }

  /**
   * Checks whether an element paints a surface of its own.
   * @param {Element} element - Element to test.
   * @returns {boolean} True for a background, a border or a shadow.
   */
  function paintsSurface(element) {
    const style = getComputedStyle(element);
    const hasBackground = style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none';
    return hasBackground || parseFloat(style.borderLeftWidth) > 0 || style.boxShadow !== 'none';
  }

  /**
   * Checks whether an element draws something the eye sees as content.
   * @param {Element} element - Element to test.
   * @returns {boolean} True for replaced elements, own text, or a visible surface.
   */
  function isVisibleContent(element) {
    if (REPLACED_TAGS.includes(element.tagName)) return true;
    if ([...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) return true;
    return paintsSurface(element);
  }

  /**
   * Finds the surface the gutter of a `main` region is measured against:
   * the closest element from `main` upwards that paints a surface, so a
   * sidebar or a centred page column is not mistaken for a missing gutter.
   * @param {Element} main - The page's main element.
   * @returns {{left: number, right: number, width: number, element: Element|null, main: Element}} Surface.
   */
  function getGutterSurface(main) {
    for (let current = main; current && current !== document.documentElement; current = current.parentElement) {
      if (paintsSurface(current)) {
        const rect = current.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width, element: current, main };
      }
    }
    const width = document.documentElement.clientWidth;
    return { left: 0, right: width, width, element: null, main };
  }

  /**
   * Measures the gaps between an element and the edges of its surface.
   * @param {Element} element - Element to measure.
   * @param {Object} surface - Surface from `getGutterSurface`.
   * @returns {{left: number, right: number}|null} Gaps, or null for full-bleed elements.
   */
  function getGutters(element, surface) {
    const rect = element.getBoundingClientRect();
    if (rect.width >= surface.width - TOLERANCE_PX) return null;
    return { left: rect.left - surface.left, right: surface.right - rect.right };
  }

  /**
   * Checks whether an element is visible content closer than MIN_GUTTER_PX
   * to the left or right edge of its surface.
   * @param {Element} element - Element to test.
   * @param {Object} surface - Surface from `getGutterSurface`.
   * @returns {boolean} True for a gutter offender.
   */
  function isGutterOffender(element, surface) {
    if (element instanceof SVGElement && !(element instanceof SVGSVGElement)) return false;
    if (!hasArea(element) || isOutOfFlow(element) || !isVisibleContent(element)) return false;
    const gutters = getGutters(element, surface);
    if (!gutters || Math.min(gutters.left, gutters.right) >= MIN_GUTTER_PX - TOLERANCE_PX) return false;
    return !isExemptFromGutter(element, surface.main);
  }

  /**
   * Finds the nearest ancestor with different left and right padding, the
   * usual cause of content hugging one edge.
   * @param {Element} element - Offending element.
   * @returns {string} Description of that ancestor, or an empty string.
   */
  function describeAsymmetricPadding(element) {
    for (let current = element.parentElement; current && current !== document.body; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (style.paddingLeft !== style.paddingRight) {
        return `${describeSegment(current)} padding ${style.paddingLeft} / ${style.paddingRight}`;
      }
    }
    return '';
  }

  /**
   * Builds the violation record for an element without enough gutter.
   * @param {Element} element - Offending element.
   * @param {Object} surface - Surface the gutter was measured against.
   * @returns {Object} Violation record.
   */
  function buildGutterRecord(element, surface) {
    const gutters = getGutters(element, surface);
    const edge = surface.element ? describeSegment(surface.element) : 'viewport';
    return {
      invariant: 4,
      selector: describe(element),
      expected: `gutter >= ${MIN_GUTTER_PX} px to ${edge}`,
      measured: `left ${Math.round(gutters.left)} px, right ${Math.round(gutters.right)} px`,
      culprit: describeAsymmetricPadding(element),
    };
  }

  /**
   * Invariant 4: visible content in `main` keeps a gutter to the left and
   * right edge of the surface around it. Only outermost offenders are
   * reported; their descendants inherit the defect.
   * @returns {Object[]} Violation records.
   */
  function checkGutters() {
    return [...document.querySelectorAll('main')].filter(isRendered).flatMap((main) => {
      const surface = getGutterSurface(main);
      const offenders = [...main.querySelectorAll('*')].filter((element) => isGutterOffender(element, surface));
      return offenders
        .filter((element) => !offenders.some((other) => other !== element && other.contains(element)))
        .map((element) => buildGutterRecord(element, surface));
    });
  }

  /**
   * Runs all invariants against the current layout.
   * @returns {Object[]} Every violation found on the page.
   */
  function measureAll() {
    return [...checkHorizontalOverflow(), ...checkContainment(), ...checkStackOverlap(), ...checkGutters()];
  }

  window.layoutInvariants = { measureAll };
})();

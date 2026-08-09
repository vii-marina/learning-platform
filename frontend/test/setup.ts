import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Testing Library does not unmount between tests on its own outside of globals mode,
// and a left-over tree makes the next test's queries ambiguous rather than failing
// outright — which is the hardest kind of test failure to read.
afterEach(() => {
  cleanup();
});

/**
 * jsdom implements neither of these, and both are used by real components: the modal
 * primitive locks scrolling via a media query and several views animate on mount.
 * Without the stubs the component throws before the assertion is ever reached.
 */
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

/**
 * jsdom does no layout, so `offsetParent` is null for every element — including visible
 * ones. Code that filters focusable elements by visibility (the modal focus trap does)
 * therefore sees an empty list and behaves as if the dialog were empty.
 *
 * Reporting the parent element mirrors what a browser returns for a normally positioned,
 * displayed element, which is the case every test here sets up. Elements genuinely hidden
 * via `display: none` are still reported as such, so the filter keeps its meaning.
 */
Object.defineProperty(window.HTMLElement.prototype, "offsetParent", {
  configurable: true,
  get(this: HTMLElement) {
    if (this.style.display === "none" || this.hidden) {
      return null;
    }

    return this.parentElement;
  },
});

// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import PresentationInkOverlay from "./PresentationInkOverlay.vue";

describe("PresentationInkOverlay", () => {
  it("löscht mit dem Radiergummi erst nach einem linken Klick, nicht beim Überfahren", async () => {
    const wrapper = mount(PresentationInkOverlay, {
      props: {
        tool: "eraser",
        strokes: [{
          id: "pen-1",
          slideId: "slide-1",
          points: [{ x: 80, y: 100 }, { x: 120, y: 100 }],
          color: "#e53935",
          width: 5,
          glow: false,
        }],
      },
    });
    const overlay = wrapper.find("svg");
    vi.spyOn(overlay.element, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 1280,
      height: 720,
    } as DOMRect);

    await overlay.trigger("pointermove", { clientX: 100, clientY: 100, pointerId: 1 });
    expect(wrapper.emitted("erase")).toBeUndefined();
    await overlay.trigger("pointerdown", { button: 2, clientX: 100, clientY: 100, pointerId: 1 });
    expect(wrapper.emitted("erase")).toBeUndefined();
    await overlay.trigger("pointerdown", { button: 0, clientX: 100, clientY: 100, pointerId: 1 });

    expect(wrapper.emitted("erase")).toEqual([[['pen-1']]]);
    wrapper.unmount();
  });

  it("lässt Leuchtstiftsegmente ab ihrem jeweiligen Zeichenzeitpunkt verblassen", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T12:00:00Z"));
    const now = Date.now();
    const wrapper = mount(PresentationInkOverlay, {
      props: {
        fadeAfterMs: 1_000,
        strokes: [{
          id: "marker-1",
          slideId: "slide-1",
          points: [
            { x: 20, y: 40, at: now - 2_000 },
            { x: 80, y: 40, at: now - 2_000 },
            { x: 140, y: 40, at: now },
          ],
          color: "#f07d16",
          width: 18,
          glow: true,
          fadeAfterMs: 1_000,
        }],
      },
    });

    expect(wrapper.findAll(".presentation-ink-glow-segment")).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_700);
    await nextTick();
    expect(wrapper.findAll(".presentation-ink-glow-segment")).toHaveLength(0);

    wrapper.unmount();
    vi.useRealTimers();
  });
});

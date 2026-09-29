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

  it("reicht Rechtsklick-Ziehen bei aktivem Zeichenwerkzeug als geglätteten Ausschnitt-Drag weiter", async () => {
    const wrapper = mount(PresentationInkOverlay, { props: { tool: "pen", zoom: 1.5, panEnabled: true, strokes: [] } });
    const overlay = wrapper.find("svg");
    vi.spyOn(overlay.element, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 1280, height: 720 } as DOMRect);

    await overlay.trigger("pointerdown", { button: 2, clientX: 200, clientY: 160, pointerId: 3 });
    await overlay.trigger("pointermove", { clientX: 328, clientY: 232, pointerId: 3 });
    await overlay.trigger("pointerup", { pointerId: 3 });

    const [deltaX, deltaY] = wrapper.emitted("panBy")![0] as [number, number];
    expect(deltaX).toBeGreaterThan(0);
    expect(deltaX).toBeLessThan(10);
    expect(deltaY).toBeGreaterThan(0);
    expect(wrapper.emitted("ink")).toBeUndefined();
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
            { x: 200, y: 90, at: now + 20 },
            { x: 260, y: 40, at: now + 40 },
          ],
          color: "#f07d16",
          width: 18,
          glow: true,
          fadeAfterMs: 1_000,
        }],
      },
    });

    expect(wrapper.find("filter").exists()).toBe(false);
    const glowCores = wrapper.findAll(".presentation-ink-glow-core");
    expect(glowCores.length).toBeGreaterThan(0);
    expect(glowCores.every((core) => core.attributes("stroke-linecap") === "butt")).toBe(true);
    expect(glowCores.some((core) => core.attributes("d")?.includes("Q"))).toBe(true);
    expect(glowCores.every((core) => core.attributes("d")?.split("M").length === 2)).toBe(true);
    expect(wrapper.findAll(".presentation-ink-glow-aura")).toHaveLength(glowCores.length);
    expect(wrapper.findAll(".presentation-ink-glow-sheen")).toHaveLength(glowCores.length);
    expect(wrapper.find(".presentation-ink-glow-sheen").attributes("stroke")).toBe("#fff");
    await vi.advanceTimersByTimeAsync(1_700);
    await nextTick();
    expect(wrapper.findAll(".presentation-ink-glow-segment")).toHaveLength(0);

    wrapper.unmount();
    vi.useRealTimers();
  });
});

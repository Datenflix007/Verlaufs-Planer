// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlan } from "../../domain/factories";
import { SqlitePlanRepository } from "../../repositories/SqlitePlanRepository";
import { addMindmapChild, createMindmapElement } from "../mindmap";
import { ensurePresentation, insertSlide } from "../presentation";
import { presentationChannelName } from "../presenterChannel";
import AudienceView from "./AudienceView.vue";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Audience Window", () => {
  it("zeigt die Mindmap ohne Edit-UI und bietet bei verweigertem Vollbild den Ein-Klick-Fallback", async () => {
    const plan = createPlan();
    const presentation = ensurePresentation(plan);
    const element = createMindmapElement();
    addMindmapChild(
      element.content.mindmap!,
      element.content.mindmap!.rootNodeId,
      "Licht",
    );
    presentation.slides[0]!.elements.push(element);
    vi.spyOn(SqlitePlanRepository.prototype, "get").mockResolvedValue(plan);
    const request = vi
      .fn()
      .mockRejectedValue(new Error("User activation required"));
    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: request,
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/presentation/:presentationId/audience",
          component: AudienceView,
        },
      ],
    });
    await router.push(
      `/presentation/${presentation.id}/audience?planId=${plan.id}`,
    );
    await router.isReady();
    const wrapper = mount(AudienceView, { global: { plugins: [router] } });
    await flushPromises();
    const presenter = new BroadcastChannel(presentationChannelName(presentation.id));
    presenter.postMessage({ type: 'PRESENTATION_VIEW_STATE', slideId: presentation.slides[0]!.id, zoom: 1.5, audienceZoom: true });
    presenter.postMessage({
      type: 'PRESENTATION_INK_STROKE',
      stroke: { id: 'stroke-1', slideId: presentation.slides[0]!.id, points: [{ x: 20, y: 30 }, { x: 80, y: 90 }], color: '#e53935', width: 5, glow: false },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await flushPromises();
    expect(wrapper.findAll(".map-node")).toHaveLength(2);
    expect(wrapper.find(".slide-content").attributes("style")).toContain("scale(1.5)");
    expect(wrapper.findAll(".presentation-ink-overlay path")).toHaveLength(1);
    expect(wrapper.text()).toContain("Licht");
    expect(wrapper.find(".map-toolbar").exists()).toBe(false);
    expect(wrapper.find(".fullscreen-hint").exists()).toBe(true);
    const secondSlide = insertSlide(presentation, presentation.slides[0]!.id);
    presenter.postMessage({
      type: 'PRESENTATION_INK_STATE',
      strokes: [
        { id: 'first-slide-stroke', slideId: presentation.slides[0]!.id, points: [{ x: 20, y: 30 }, { x: 80, y: 90 }], color: '#e53935', width: 5, glow: false },
        { id: 'second-slide-stroke', slideId: secondSlide.id, points: [{ x: 120, y: 130 }, { x: 180, y: 190 }], color: '#1769d2', width: 5, glow: false },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(wrapper.findAll(".presentation-ink-overlay path")).toHaveLength(1);
    presenter.postMessage({ type: 'SLIDE_CHANGE', slideId: secondSlide.id });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(wrapper.findAll(".presentation-ink-overlay path")).toHaveLength(1);
    presenter.postMessage({ type: 'SLIDE_CHANGE', slideId: presentation.slides[0]!.id });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(wrapper.findAll(".presentation-ink-overlay path")).toHaveLength(1);
    presenter.postMessage({ type: 'PRESENTATION_INK_PERMISSION', slideId: presentation.slides[0]!.id, enabled: true });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await flushPromises();
    expect(wrapper.find('[aria-label="Zeichenwerkzeuge für das Präsentationsfenster"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Radiergummi");
    presenter.postMessage({ type: 'PRESENTATION_VIEW_STATE', slideId: presentation.slides[0]!.id, zoom: 1.5, audienceZoom: false });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await flushPromises();
    expect(wrapper.find(".slide-content").attributes("style")).toContain("scale(1)");
    await wrapper.find(".fullscreen-hint button").trigger("click");
    expect(request).toHaveBeenCalledTimes(2);
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: document.documentElement,
    });
    document.dispatchEvent(new Event("fullscreenchange"));
    await flushPromises();
    expect(wrapper.find(".fullscreen-hint").exists()).toBe(false);
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    document.dispatchEvent(new Event("fullscreenchange"));
    await flushPromises();
    expect(wrapper.find(".fullscreen-hint").exists()).toBe(true);
    presenter.close();
    wrapper.unmount();
  });
});

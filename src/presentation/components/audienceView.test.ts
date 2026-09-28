// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlan } from "../../domain/factories";
import { SqlitePlanRepository } from "../../repositories/SqlitePlanRepository";
import { addMindmapChild, createMindmapElement } from "../mindmap";
import { ensurePresentation } from "../presentation";
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
    expect(wrapper.findAll(".map-node")).toHaveLength(2);
    expect(wrapper.text()).toContain("Licht");
    expect(wrapper.find(".map-toolbar").exists()).toBe(false);
    expect(wrapper.find(".fullscreen-hint").exists()).toBe(true);
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
    wrapper.unmount();
  });
});

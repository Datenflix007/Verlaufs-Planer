// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import { createPlan } from "../../domain/factories";
import { reserveAudience, type WindowManagementHost } from "../audienceWindow";
import { ensurePresentation } from "../presentation";
import { createMindmapElement } from "../mindmap";
import { presentationChannelName } from "../presenterChannel";
import PresenterConsole from "./PresenterConsole.vue";
import PresentationInkOverlay from "./PresentationInkOverlay.vue";

describe("Presenter Console mit Zweitbildschirm", () => {
  it("zoomt lokal und sendet den Zoom erst nach Aktivierung an das Plenum", async () => {
    const plan = createPlan();
    const presentation = ensurePresentation(plan);
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { template: "<div />" } }] });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(PresenterConsole, { props: { plan, presentation }, global: { plugins: [router] } });
    await flushPromises();
    const observer = new BroadcastChannel(presentationChannelName(presentation.id));
    const viewStates: Array<{ zoom: number; audienceZoom: boolean }> = [];
    observer.onmessage = (event: MessageEvent) => {
      if (event.data.type === 'PRESENTATION_VIEW_STATE') viewStates.push(event.data);
    };

    await wrapper.find('[aria-label="Referentenansicht vergrößern"]').trigger("click");
    expect(wrapper.find(".slide-content").attributes("style")).toContain("scale(1.25)");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(viewStates).toHaveLength(0);

    await wrapper.find('[aria-label="Zoom im Plenum einschalten"]').trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(viewStates.at(-1)).toMatchObject({ zoom: 1.25, audienceZoom: true });
    observer.close();
    wrapper.unmount();
  });

  it("skaliert die Folienvorschau getrennt vom inhaltlichen Referentenzoom", async () => {
    const plan = createPlan();
    const presentation = ensurePresentation(plan);
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { template: "<div />" } }] });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(PresenterConsole, { props: { plan, presentation }, global: { plugins: [router] } });
    await flushPromises();

    const stage = wrapper.find(".presenter-slide-stage");
    expect(stage.attributes("style")).toContain("width: 1280px");
    await wrapper.find('[aria-label="Folienvorschau verkleinern"]').trigger("click");
    expect(stage.attributes("style")).toContain("width: 1152px");
    expect(wrapper.find(".slide-content").attributes("style")).toContain("scale(1)");
    await wrapper.find('[aria-label="Folienvorschau automatisch anpassen"]').trigger("click");
    expect(stage.attributes("style")).toContain("width: 1280px");
    wrapper.unmount();
  });

  it("wechselt per Stift zwischen Mindmap-Vorschau und Live-Bearbeitung", async () => {
    const plan = createPlan();
    const presentation = ensurePresentation(plan);
    presentation.slides[0]!.elements.push(createMindmapElement());
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: { template: "<div />" } }],
    });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(PresenterConsole, {
      props: { plan, presentation },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(wrapper.find(".slide-canvas").exists()).toBe(true);
    expect(wrapper.find(".map-toolbar").exists()).toBe(false);
    await wrapper.find('[aria-label="Mindmap bearbeiten"]').trigger("click");
    await flushPromises();
    expect(wrapper.find(".slide-canvas").exists()).toBe(false);
    expect(wrapper.find(".map-toolbar").exists()).toBe(true);

    await wrapper.find('[aria-label="Zur Folienvorschau"]').trigger("click");
    await flushPromises();
    expect(wrapper.find(".slide-canvas").exists()).toBe(true);
    expect(wrapper.find(".map-toolbar").exists()).toBe(false);
    wrapper.unmount();
  });

  it("ordnet Plenumszoom neben dem Stift oben rechts an und bietet mehrere Stiftfarben", async () => {
    const plan = createPlan();
    const presentation = ensurePresentation(plan);
    presentation.slides[0]!.elements.push(createMindmapElement());
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { template: "<div />" } }] });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(PresenterConsole, { props: { plan, presentation }, global: { plugins: [router] } });
    await flushPromises();

    const actions = wrapper.findAll(".presenter-slide-actions button");
    expect(actions.at(-1)?.attributes("aria-label")).toBe("Mindmap bearbeiten");
    expect(actions.at(-2)?.attributes("aria-label")).toBe("Zoom im Plenum einschalten");
    expect(wrapper.findAll('[aria-label^="Stiftfarbe "]')).toHaveLength(6);

    wrapper.unmount();
  });

  it("bietet einen Radiergummi und gibt Zeichenwerkzeuge im Präsentationsfenster bewusst frei", async () => {
    const plan = createPlan();
    const presentation = ensurePresentation(plan);
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { template: "<div />" } }] });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(PresenterConsole, { props: { plan, presentation }, global: { plugins: [router] } });
    await flushPromises();
    const observer = new BroadcastChannel(presentationChannelName(presentation.id));
    const permissions: boolean[] = [];
    const sentStrokes: Array<{ id: string; points: Array<{ x: number; y: number }> }> = [];
    const removedStrokes: string[] = [];
    observer.onmessage = (event: MessageEvent) => {
      if (event.data.type === "PRESENTATION_INK_PERMISSION") permissions.push(event.data.enabled);
      if (event.data.type === "PRESENTATION_INK_STROKE") sentStrokes.push(event.data.stroke);
      if (event.data.type === "PRESENTATION_INK_REMOVE") removedStrokes.push(event.data.strokeId);
    };

    expect(wrapper.findAll("button").find((button) => button.text() === "Radiergummi")?.exists()).toBe(true);
    await wrapper.findAll("button").find((button) => button.text().includes("Präsentationsfenster zeichnen"))!.trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(permissions).toEqual([true]);
    expect(wrapper.findAll("button").find((button) => button.text().includes("Präsentationsfenster zeichnen"))?.attributes("aria-pressed")).toBe("true");
    await wrapper.findAll("button").find((button) => button.text() === "Stift")!.trigger("click");
    wrapper.findComponent(PresentationInkOverlay).vm.$emit("ink", "presenter-stroke", [{ x: 20, y: 30 }, { x: 70, y: 80 }]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    wrapper.findComponent(PresentationInkOverlay).vm.$emit("ink", "presenter-stroke", [{ x: 20, y: 30 }, { x: 70, y: 80 }, { x: 110, y: 100 }]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sentStrokes).toHaveLength(2);
    expect(sentStrokes.map((stroke) => stroke.id)).toEqual(["presenter-stroke", "presenter-stroke"]);
    expect(sentStrokes.at(-1)?.points).toHaveLength(3);
    observer.postMessage({
      type: "PRESENTATION_INK_STROKE",
      stroke: { id: "audience-stroke", slideId: presentation.slides[0]!.id, points: [{ x: 20, y: 30 }, { x: 70, y: 80 }], color: "#1769d2", width: 5, glow: false },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(wrapper.findAll(".presentation-ink-overlay path")).toHaveLength(2);
    await wrapper.findAll("button").find((button) => button.text() === "Zeichnungen dieser Folie löschen")!.trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(removedStrokes).toEqual(expect.arrayContaining(["audience-stroke"]));
    expect(wrapper.findAll(".presentation-ink-overlay path")).toHaveLength(0);
    observer.close();
    wrapper.unmount();
  });

  it("öffnet das reservierte Fenster am externen Screen und zeigt Statusereignisse an", async () => {
    const plan = createPlan();
    const presentation = ensurePresentation(plan);
    const main = {
      availLeft: 0,
      availTop: 0,
      availWidth: 1920,
      availHeight: 1040,
      width: 1920,
      height: 1080,
    };
    const beamer = {
      availLeft: 1920,
      availTop: 0,
      availWidth: 1920,
      availHeight: 1080,
      width: 1920,
      height: 1080,
      label: "Beamer",
    };
    const popup = {
      closed: false,
      location: { href: "" },
      moveTo: vi.fn(),
      resizeTo: vi.fn(),
      focus: vi.fn(),
    } as unknown as Window;
    const host = {
      open: vi.fn().mockReturnValue(popup),
      getScreenDetails: vi
        .fn()
        .mockResolvedValue({ screens: [main, beamer], currentScreen: main }),
    } as unknown as WindowManagementHost;
    reserveAudience(host, presentation.id);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        {
          path: "/presentation/:presentationId/audience",
          name: "presentation-audience",
          component: { template: "<div />" },
        },
      ],
    });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(PresenterConsole, {
      props: { plan, presentation },
      global: { plugins: [router] },
    });
    await flushPromises();
    expect(popup.moveTo).toHaveBeenCalledWith(1920, 0);
    expect(popup.location.href).toContain(
      `/presentation/${presentation.id}/audience`,
    );
    const sender = new BroadcastChannel(
      presentationChannelName(presentation.id),
    );
    sender.postMessage({ type: "AUDIENCE_READY" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await flushPromises();
    expect(wrapper.find(".screen-status").text()).toContain("verbunden");
    sender.postMessage({ type: "FULLSCREEN_STATUS", active: true });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await flushPromises();
    expect(wrapper.find(".screen-status").text()).toContain("Vollbild aktiv");
    sender.postMessage({ type: "AUDIENCE_CLOSED" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await flushPromises();
    expect(wrapper.find(".screen-status").text()).toContain("nicht verbunden");
    sender.close();
    wrapper.unmount();
  });

  it("bietet bei mehreren externen Screens eine Auswahl an", async () => {
    const plan = createPlan();
    const presentation = ensurePresentation(plan);
    const main = {
      availLeft: 0,
      availTop: 0,
      availWidth: 1920,
      availHeight: 1040,
      width: 1920,
      height: 1080,
    };
    const left = {
      availLeft: -1600,
      availTop: 0,
      availWidth: 1600,
      availHeight: 900,
      width: 1600,
      height: 900,
    };
    const right = {
      availLeft: 1920,
      availTop: 0,
      availWidth: 1280,
      availHeight: 720,
      width: 1280,
      height: 720,
    };
    const popup = {
      closed: false,
      location: { href: "" },
      moveTo: vi.fn(),
      resizeTo: vi.fn(),
      focus: vi.fn(),
    } as unknown as Window;
    reserveAudience(
      {
        open: vi.fn().mockReturnValue(popup),
        getScreenDetails: vi
          .fn()
          .mockResolvedValue({
            screens: [main, left, right],
            currentScreen: main,
          }),
      } as unknown as WindowManagementHost,
      presentation.id,
    );
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        {
          path: "/presentation/:presentationId/audience",
          name: "presentation-audience",
          component: { template: "<div />" },
        },
      ],
    });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(PresenterConsole, {
      props: { plan, presentation },
      global: { plugins: [router] },
    });
    await flushPromises();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    expect(popup.location.href).toBe("");
    await wrapper.findAll(".screen-dialog button")[2]!.trigger("click");
    expect(popup.moveTo).toHaveBeenCalledWith(1920, 0);
    expect(popup.location.href).toContain(
      `/presentation/${presentation.id}/audience`,
    );
    wrapper.unmount();
  });
});

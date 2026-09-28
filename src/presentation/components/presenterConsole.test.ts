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

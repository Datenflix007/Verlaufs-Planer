// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { nextTick, reactive } from "vue";
import { describe, expect, it, vi } from "vitest";
import { createPlan } from "../../domain/factories";
import { addMindmapChild, createMindmapElement } from "../mindmap";
import { ensurePresentation } from "../presentation";
import PresentationEditor from "./PresentationEditor.vue";
import SlideCanvas from "./SlideCanvas.vue";
import MindmapWidget from "./MindmapWidget.vue";

describe("Mindmap im Präsentationseditor", () => {
  it("erstellt und bearbeitet eine Mindmap direkt auf der Folie", async () => {
    const plan = reactive(createPlan());
    const wrapper = mount(PresentationEditor, { props: { plan } });
    await wrapper.find('[title="Mindmap"]').trigger("click");
    const map = plan.presentation!.slides[0]!.elements[0]!.content.mindmap!;
    expect(map.nodes.map((node) => node.text)).toEqual(["Thema"]);
    expect(wrapper.find(".mindmap-properties").exists()).toBe(true);
    await nextTick();
    const input = wrapper.find(".map-node input");
    expect(input.exists()).toBe(true);
    await input.setValue("Fotosynthese");
    await input.trigger("keydown", { key: "Enter" });
    expect(map.nodes[0]!.text).toBe("Fotosynthese");
    await wrapper.find(".map-toolbar button").trigger("click");
    expect(map.nodes).toHaveLength(2);
    expect(map.edges).toHaveLength(1);
    expect(wrapper.emitted("changed")?.length).toBeGreaterThan(1);
    wrapper.unmount();
  });

  it("rendert die Mindmap im schreibgeschützten Audience-Canvas ohne Edit-Handles", () => {
    const plan = createPlan();
    const presentation = ensurePresentation(plan);
    const element = createMindmapElement();
    const map = element.content.mindmap!;
    addMindmapChild(map, map.rootNodeId, "Licht");
    presentation.slides[0]!.elements.push(element);
    const wrapper = mount(SlideCanvas, {
      props: {
        slide: presentation.slides[0]!,
        themeId: presentation.themeId,
        readonly: true,
        selectedElementId: element.id,
      },
    });
    expect(wrapper.findAll(".map-node")).toHaveLength(2);
    expect(wrapper.text()).toContain("Licht");
    expect(wrapper.find(".map-toolbar").exists()).toBe(false);
    expect(wrapper.find(".resize-handle").exists()).toBe(false);
    expect(wrapper.find(".mindmap-edit-button").exists()).toBe(false);
    wrapper.unmount();
  });

  it("nutzt die Material-Bildquelle im Knoten und erhält sie nach dem Folienwechsel", async () => {
    const plan = reactive(createPlan());
    plan.materials.push({
      id: crypto.randomUUID(),
      name: "Pflanze",
      description: "data:image/png;base64,AA==",
      resourceType: "file",
    });
    const wrapper = mount(PresentationEditor, { props: { plan } });
    await wrapper.find('[title="Mindmap"]').trigger("click");
    const map = plan.presentation!.slides[0]!.elements[0]!.content.mindmap!;
    await wrapper.find(".map-node input").trigger("keydown", { key: "Enter" });
    await wrapper.find(".image-picker button").trigger("click");
    expect(map.nodes[0]!.image?.source).toBe("data:image/png;base64,AA==");
    await wrapper.find(".map-toolbar button:last-child").trigger("click");
    await wrapper.find(".slides > div button").trigger("click");
    await wrapper.findAll(".thumb")[0]!.trigger("click");
    expect(
      plan.presentation!.slides[0]!.elements[0]!.content.mindmap!.nodes[0]!
        .image?.source,
    ).toBe("data:image/png;base64,AA==");
    wrapper.unmount();
  });

  it("bedient Unterast, Geschwister, Text und Löschen per Tastatur", async () => {
    const map = reactive(createMindmapElement().content.mindmap!);
    const wrapper = mount(MindmapWidget, {
      props: { mindmap: map, editing: true, selectedNodeId: map.rootNodeId },
    });
    await wrapper.find(".mindmap-widget").trigger("keydown", { key: "Insert" });
    const child = map.nodes[1]!;
    expect(child.parentId).toBe(map.rootNodeId);
    await wrapper.find(".map-node input").setValue("Voraussetzungen");
    await wrapper.find(".map-node input").trigger("keydown", { key: "Enter" });
    expect(child.text).toBe("Voraussetzungen");
    await wrapper.setProps({ selectedNodeId: child.id });
    await wrapper.find(".mindmap-widget").trigger("keydown", { key: "Enter" });
    expect(map.nodes[2]!.parentId).toBe(map.rootNodeId);
    await wrapper.find(".map-node input").trigger("keydown", { key: "Enter" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await wrapper.setProps({ selectedNodeId: child.id });
    await wrapper.find(".mindmap-widget").trigger("keydown", { key: "Delete" });
    expect(map.nodes.some((node) => node.id === child.id)).toBe(false);
    vi.restoreAllMocks();
    wrapper.unmount();
  });

  it("löscht den ausgewählten Mindmap-Ast über die sichtbare Werkzeugleistenaktion", async () => {
    const map = reactive(createMindmapElement().content.mindmap!);
    const child = addMindmapChild(map, map.rootNodeId, "Zu entfernen")!;
    const wrapper = mount(MindmapWidget, {
      props: { mindmap: map, editing: true, selectedNodeId: child.id },
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await wrapper.find('[aria-label="Ausgewählten Ast löschen"]').trigger("click");

    expect(map.nodes.map((node) => node.id)).toEqual([map.rootNodeId]);
    vi.restoreAllMocks();
    wrapper.unmount();
  });

  it("leert über die sichtbare Werkzeugleiste die Mindmap, wenn kein Ast ausgewählt ist", async () => {
    const map = reactive(createMindmapElement().content.mindmap!);
    addMindmapChild(map, map.rootNodeId, "Zu entfernen");
    const wrapper = mount(MindmapWidget, {
      props: { mindmap: map, editing: true },
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await wrapper.find('[aria-label="Mindmap leeren"]').trigger("click");

    expect(map.nodes.map((node) => node.id)).toEqual([map.rootNodeId]);
    expect(map.edges).toEqual([]);
    vi.restoreAllMocks();
    wrapper.unmount();
  });

  it("ordnet einen Knoten per Drag-and-drop einem anderen Ast unter", async () => {
    const map = reactive(createMindmapElement().content.mindmap!);
    const first = addMindmapChild(map, map.rootNodeId, "Voraussetzungen")!;
    const second = addMindmapChild(map, map.rootNodeId, "Produkte")!;
    const wrapper = mount(MindmapWidget, {
      props: { mindmap: map, editing: true, selectedNodeId: first.id },
    });
    const nodes = wrapper.findAll(".map-node");
    vi.spyOn(nodes[2]!.element, "getBoundingClientRect").mockReturnValue({
      top: 0,
      height: 100,
    } as DOMRect);
    await nodes[1]!.trigger("dragstart", {
      dataTransfer: { setData: vi.fn(), effectAllowed: "move" },
    });
    await nodes[2]!.trigger("drop", { clientY: 50 });
    expect(first.parentId).toBe(second.id);
    expect(
      map.edges.find((edge) => edge.targetNodeId === first.id)?.sourceNodeId,
    ).toBe(second.id);
    wrapper.unmount();
  });

  it("verbindet einen ausgewählten Knoten über den Zielknoten neu", async () => {
    const map = reactive(createMindmapElement().content.mindmap!);
    const source = addMindmapChild(map, map.rootNodeId, "Voraussetzungen")!;
    const target = addMindmapChild(map, map.rootNodeId, "Produkte")!;
    const wrapper = mount(MindmapWidget, {
      props: { mindmap: map, editing: true, selectedNodeId: source.id },
    });

    await wrapper.findAll(".map-toolbar button").find((button) => button.text() === "Neu verbinden")!.trigger("click");
    await wrapper.findAll(".map-node")[2]!.trigger("click");

    expect(source.parentId).toBe(target.id);
    expect(wrapper.emitted("changed")).toHaveLength(1);
    wrapper.unmount();
  });

  it("verschiebt und skaliert das Widget als normales Folienelement", async () => {
    const presentation = ensurePresentation(createPlan());
    const slide = presentation.slides[0]!;
    const element = createMindmapElement();
    slide.elements.push(element);
    const wrapper = mount(SlideCanvas, {
      props: {
        slide,
        themeId: presentation.themeId,
        selectedElementId: element.id,
      },
    });
    vi.spyOn(
      wrapper.find(".slide-canvas").element,
      "getBoundingClientRect",
    ).mockReturnValue({ left: 0, top: 0, width: 1280, height: 720 } as DOMRect);
    await wrapper
      .find(".slide-element")
      .trigger("pointerdown", { clientX: 230, clientY: 160, pointerId: 1 });
    await wrapper
      .find(".slide-canvas")
      .trigger("pointermove", { clientX: 330, clientY: 200, pointerId: 1 });
    expect(element.x).toBe(280);
    expect(element.y).toBe(150);
    await wrapper.find(".slide-canvas").trigger("pointerup", { pointerId: 1 });
    await wrapper
      .find(".resize-handle.e")
      .trigger("pointerdown", { clientX: 1180, clientY: 300, pointerId: 2 });
    await wrapper
      .find(".slide-canvas")
      .trigger("pointermove", { clientX: 1220, clientY: 300, pointerId: 2 });
    expect(element.width).toBe(940);
    wrapper.unmount();
  });

  it("zoomt und verschiebt die Mindmap getrennt vom Folien-Canvas", async () => {
    const map = reactive(createMindmapElement().content.mindmap!);
    const wrapper = mount(MindmapWidget, {
      props: { mindmap: map, editing: true, selectedNodeId: map.rootNodeId },
    });
    const plus = wrapper
      .findAll(".map-toolbar button")
      .find((button) => button.text() === "+")!;
    await plus.trigger("click");
    expect(wrapper.find(".map-toolbar small").text()).toBe("110%");
    await wrapper
      .find(".map-content")
      .trigger("pointerdown", { clientX: 100, clientY: 100, pointerId: 1 });
    await wrapper
      .find(".mindmap-widget")
      .trigger("pointermove", { clientX: 140, clientY: 130, pointerId: 1 });
    expect(wrapper.find(".map-content").attributes("style")).toContain(
      "translate(40px, 30px)",
    );
    wrapper.unmount();
  });
});

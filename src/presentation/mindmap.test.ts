import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqlitePlans } from "../../server/sqlitePlans";
import { createPlan } from "../domain/factories";
import { migratePlan, WorkshopPlanSchema } from "../schemas/plan";
import {
  addMindmapChild,
  addMindmapSibling,
  branchIds,
  colorForNode,
  createMindmap,
  createMindmapElement,
  deleteMindmapBranch,
  duplicateMindmap,
  duplicateMindmapBranch,
  layoutMindmap,
  moveMindmapNode,
} from "./mindmap";
import { duplicateSlide, ensurePresentation } from "./presentation";

describe("Mindmap als Präsentationselement", () => {
  it("beginnt mit einem mittigen Thema-Knoten", () => {
    const map = createMindmap();
    expect(map.nodes).toHaveLength(1);
    expect(map.nodes[0]).toMatchObject({
      id: map.rootNodeId,
      parentId: null,
      text: "Thema",
    });
    expect(layoutMindmap(map).nodes).toMatchObject([{ x: 500, y: 300 }]);
  });

  it("fügt Unter- und Geschwisteräste mit stabilen Verbindungen hinzu", () => {
    const map = createMindmap();
    const child = addMindmapChild(map, map.rootNodeId, "Voraussetzungen")!;
    const sibling = addMindmapSibling(map, child.id, "Produkte")!;
    expect([child.parentId, sibling.parentId]).toEqual([
      map.rootNodeId,
      map.rootNodeId,
    ]);
    expect(map.edges.map((edge) => edge.targetNodeId)).toEqual([
      child.id,
      sibling.id,
    ]);
    expect(map.nodes.map((node) => node.id)).toEqual([
      map.rootNodeId,
      child.id,
      sibling.id,
    ]);
  });

  it("verteilt Hauptäste beidseitig um die Wurzel und behält Unteräste auf ihrer Seite", () => {
    const map = createMindmap();
    const rightBranch = addMindmapChild(map, map.rootNodeId, "Rechts")!;
    const leftBranch = addMindmapChild(map, map.rootNodeId, "Links")!;
    const rightLeaf = addMindmapChild(map, rightBranch.id, "Rechts unten")!;
    const leftLeaf = addMindmapChild(map, leftBranch.id, "Links unten")!;
    const positions = new Map(layoutMindmap(map).nodes.map((item) => [item.node.id, item]));
    const root = positions.get(map.rootNodeId)!;

    expect(positions.get(rightBranch.id)!.x).toBeGreaterThan(root.x);
    expect(positions.get(leftBranch.id)!.x).toBeLessThan(root.x);
    expect(positions.get(rightLeaf.id)!.x).toBeGreaterThan(root.x);
    expect(positions.get(leftLeaf.id)!.x).toBeLessThan(root.x);
  });

  it("löscht einen vollständigen Ast und lässt die Wurzel stehen", () => {
    const map = createMindmap();
    const branch = addMindmapChild(map, map.rootNodeId)!;
    const leaf = addMindmapChild(map, branch.id)!;
    const other = addMindmapChild(map, map.rootNodeId)!;
    expect(branchIds(map, branch.id)).toEqual(new Set([branch.id, leaf.id]));
    expect(deleteMindmapBranch(map, branch.id)).toBe(2);
    expect(map.nodes.map((node) => node.id)).toEqual([
      map.rootNodeId,
      other.id,
    ]);
    expect(map.edges).toHaveLength(1);
    expect(deleteMindmapBranch(map, map.rootNodeId)).toBe(1);
    expect(map.nodes).toHaveLength(1);
  });

  it("ordnet Knoten um, aktualisiert Ebenen und verhindert Zyklen", () => {
    const map = createMindmap();
    const first = addMindmapChild(map, map.rootNodeId)!;
    const second = addMindmapChild(map, map.rootNodeId)!;
    const leaf = addMindmapChild(map, first.id)!;
    expect(moveMindmapNode(map, first.id, leaf.id)).toBe(false);
    expect(moveMindmapNode(map, first.id, second.id)).toBe(true);
    expect(first.parentId).toBe(second.id);
    expect(leaf.level).toBe(3);
    expect(
      map.edges.find((edge) => edge.targetNodeId === first.id)?.sourceNodeId,
    ).toBe(second.id);
  });

  it("ordnet Geschwister über ihre gespeicherte Reihenfolge um", () => {
    const map = createMindmap();
    const first = addMindmapChild(map, map.rootNodeId, "A")!;
    const second = addMindmapChild(map, map.rootNodeId, "B")!;
    const third = addMindmapChild(map, map.rootNodeId, "C")!;
    expect(moveMindmapNode(map, third.id, map.rootNodeId, first.id)).toBe(true);
    expect(
      map.nodes
        .filter((node) => node.parentId === map.rootNodeId)
        .sort((a, b) => a.order - b.order)
        .map((node) => node.text),
    ).toEqual(["C", "A", "B"]);
    expect(second.parentId).toBe(map.rootNodeId);
  });

  it("übernimmt Text, Bilder und Astfarben in Layout und JSON-Roundtrip", () => {
    const plan = createPlan();
    const presentation = ensurePresentation(plan);
    const element = createMindmapElement();
    const map = element.content.mindmap!;
    const branch = addMindmapChild(map, map.rootNodeId, "Licht")!;
    branch.image = { source: "data:image/png;base64,AA==", fit: "contain" };
    branch.style.branchColor = "#cc5500";
    map.settings.layout = "radial";
    presentation.slides[0]!.elements.push(element);
    const restored = migratePlan(
      JSON.parse(JSON.stringify(WorkshopPlanSchema.parse(plan))),
    );
    const savedMap =
      restored.presentation!.slides[0]!.elements[0]!.content.mindmap!;
    expect(savedMap.nodes[1]).toMatchObject({
      text: "Licht",
      image: { fit: "contain" },
    });
    expect(colorForNode(savedMap, branch.id)).toBe("#cc5500");
    expect(layoutMindmap(savedMap).edges).toHaveLength(1);
  });

  it("dupliziert Widgets und Folien mit neuen Widget-, Knoten- und Edge-IDs", () => {
    const plan = createPlan();
    const presentation = ensurePresentation(plan);
    const element = createMindmapElement();
    const map = element.content.mindmap!;
    const branch = addMindmapChild(map, map.rootNodeId)!;
    addMindmapChild(map, branch.id);
    const copy = duplicateMindmap(map);
    expect(copy.id).not.toBe(map.id);
    expect(new Set(copy.nodes.map((node) => node.id)).size).toBe(
      copy.nodes.length,
    );
    expect(
      copy.nodes.every(
        (node) => !map.nodes.some((original) => original.id === node.id),
      ),
    ).toBe(true);
    expect(
      copy.edges.every(
        (edge) => !map.edges.some((original) => original.id === edge.id),
      ),
    ).toBe(true);
    presentation.slides[0]!.elements.push(element);
    const slideCopy = duplicateSlide(presentation, presentation.slides[0]!.id)!;
    expect(slideCopy.elements[0]!.content.mindmap!.rootNodeId).not.toBe(
      map.rootNodeId,
    );
    expect(WorkshopPlanSchema.safeParse(plan).success).toBe(true);
  });

  it("dupliziert einen ganzen Unterast ohne geteilte IDs", () => {
    const map = createMindmap();
    const branch = addMindmapChild(map, map.rootNodeId)!;
    addMindmapChild(map, branch.id);
    const duplicate = duplicateMindmapBranch(map, branch.id)!;
    expect(duplicate.id).not.toBe(branch.id);
    expect(branchIds(map, duplicate.id)).toHaveProperty("size", 2);
    expect(new Set(map.nodes.map((node) => node.id)).size).toBe(
      map.nodes.length,
    );
  });

  it("speichert eine Mindmap im vorhandenen SQLite-Plan-Payload und lädt sie unverändert", () => {
    const plan = createPlan();
    const presentation = ensurePresentation(plan);
    const element = createMindmapElement();
    const map = element.content.mindmap!;
    const branch = addMindmapChild(map, map.rootNodeId, "Voraussetzungen")!;
    addMindmapChild(map, branch.id, "Licht");
    presentation.slides[0]!.elements.push(element);
    const repository = new SqlitePlans(
      join(
        mkdtempSync(join(tmpdir(), "verlaufsplaner-mindmap-")),
        "plan.sqlite",
      ),
    );
    repository.save(plan);
    const loaded = migratePlan(repository.get(plan.id));
    expect(
      loaded.presentation!.slides[0]!.elements[0]!.content.mindmap,
    ).toEqual(map);
    expect(loaded.presentation!.slides[0]!.id).toBe(presentation.slides[0]!.id);
  });

  it("weist beschädigte Parent- und Edge-Referenzen beim Laden zurück", () => {
    const plan = createPlan();
    const presentation = ensurePresentation(plan);
    const element = createMindmapElement();
    const map = element.content.mindmap!;
    const child = addMindmapChild(map, map.rootNodeId)!;
    presentation.slides[0]!.elements.push(element);
    map.edges[0]!.sourceNodeId = child.id;
    expect(WorkshopPlanSchema.safeParse(plan).success).toBe(false);
  });
});

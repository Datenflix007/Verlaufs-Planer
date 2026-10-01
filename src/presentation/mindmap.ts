import { stratify, tree } from "d3-hierarchy";
import { createId } from "../domain/factories";
import type {
  MindmapEdge,
  MindmapNode,
  MindmapWidget,
  PresentationElement,
} from "../domain/types";
import { widgetColorSet } from './widgetDesign';

export const MINDMAP_WIDTH = 1000;
export const MINDMAP_HEIGHT = 600;
export const branchPalette = [
  "#21b8b0",
  "#69b975",
  "#e7a348",
  "#a98ae9",
  "#df7895",
  "#5d9de0",
];

export function createMindmap(): MindmapWidget {
  const rootId = createId();
  return {
    id: createId(),
    rootNodeId: rootId,
    nodes: [
      {
        id: rootId,
        parentId: null,
        text: "Thema",
        level: 0,
        order: 0,
        x: MINDMAP_WIDTH / 2,
        y: MINDMAP_HEIGHT / 2,
        style: {},
      },
    ],
    edges: [],
    settings: {
      layout: "horizontal",
      autoLayout: true,
      spacingX: 180,
      spacingY: 78,
      branchColors: true,
      design: "schlicht",
      colorSet: 'ozean',
    },
  };
}

export function createMindmapElement(
  position = { x: 180, y: 110 },
): PresentationElement {
  const timestamp = new Date().toISOString();
  return {
    id: createId(),
    type: "mindmap",
    x: position.x,
    y: position.y,
    width: 900,
    height: 510,
    rotation: 0,
    zIndex: 1,
    style: { opacity: 1 },
    content: { mindmap: createMindmap() },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const byOrder = (a: MindmapNode, b: MindmapNode) =>
  a.order - b.order || a.id.localeCompare(b.id);
export const mindmapNode = (
  mindmap: MindmapWidget,
  id: string,
): MindmapNode | undefined => mindmap.nodes.find((node) => node.id === id);
export const childrenOf = (
  mindmap: MindmapWidget,
  parentId: string,
): MindmapNode[] =>
  mindmap.nodes.filter((node) => node.parentId === parentId).sort(byOrder);

export function addMindmapChild(
  mindmap: MindmapWidget,
  parentId: string,
  text = "Neuer Ast",
): MindmapNode | undefined {
  const parent = mindmapNode(mindmap, parentId);
  if (!parent) return undefined;
  const node: MindmapNode = {
    id: createId(),
    parentId,
    text,
    level: parent.level + 1,
    order: childrenOf(mindmap, parentId).length,
    style: {},
  };
  mindmap.nodes.push(node);
  mindmap.edges.push({
    id: createId(),
    sourceNodeId: parentId,
    targetNodeId: node.id,
    style: { curve: "smooth", width: 2 },
  });
  return node;
}

export function addMindmapSibling(
  mindmap: MindmapWidget,
  nodeId: string,
  text = "Neuer Ast",
): MindmapNode | undefined {
  const node = mindmapNode(mindmap, nodeId);
  return node
    ? addMindmapChild(mindmap, node.parentId ?? node.id, text)
    : undefined;
}

export function branchIds(mindmap: MindmapWidget, nodeId: string): Set<string> {
  const ids = new Set<string>();
  const visit = (id: string): void => {
    if (ids.has(id)) return;
    ids.add(id);
    for (const child of childrenOf(mindmap, id)) visit(child.id);
  };
  if (mindmapNode(mindmap, nodeId)) visit(nodeId);
  return ids;
}

/** A portable branch snapshot deliberately uses local numeric keys, never node UUIDs. */
export interface MindmapBranchClipboard {
  rootKey: number;
  nodes: Array<{
    key: number;
    parentKey?: number;
    text: string;
    order: number;
    x?: number;
    y?: number;
    collapsed?: boolean;
    style: MindmapNode['style'];
    image?: MindmapNode['image'];
  }>;
  edgeStyles: Array<{ targetKey: number; style: MindmapEdge['style'] }>;
}

export function copyMindmapBranch(
  mindmap: MindmapWidget,
  nodeId: string,
): MindmapBranchClipboard | undefined {
  const ids = branchIds(mindmap, nodeId);
  if (!ids.size) return undefined;
  const originals = mindmap.nodes
    .filter((node) => ids.has(node.id))
    .sort((left, right) => left.level - right.level || left.order - right.order);
  const keys = new Map(originals.map((node, index) => [node.id, index]));
  const rootKey = keys.get(nodeId);
  if (rootKey === undefined) return undefined;
  return {
    rootKey,
    nodes: originals.map((node) => ({
      key: keys.get(node.id)!,
      ...(node.id === nodeId ? {} : { parentKey: keys.get(node.parentId!)! }),
      text: node.text,
      order: node.order,
      ...(node.x === undefined ? {} : { x: node.x }),
      ...(node.y === undefined ? {} : { y: node.y }),
      ...(node.collapsed ? { collapsed: true } : {}),
      style: { ...node.style },
      ...(node.image ? { image: { ...node.image } } : {}),
    })),
    edgeStyles: mindmap.edges
      .filter((edge) => ids.has(edge.targetNodeId))
      .map((edge) => ({ targetKey: keys.get(edge.targetNodeId)!, style: { ...edge.style } })),
  };
}

export function pasteMindmapBranch(
  mindmap: MindmapWidget,
  parentId: string,
  clipboard: MindmapBranchClipboard,
): MindmapNode | undefined {
  if (!mindmapNode(mindmap, parentId) || !clipboard.nodes.length) return undefined;
  const copies = new Map<number, MindmapNode>();
  for (const source of [...clipboard.nodes].sort((left, right) => left.key - right.key)) {
    const targetParentId = source.parentKey === undefined
      ? parentId
      : copies.get(source.parentKey)?.id;
    if (!targetParentId) return undefined;
    const copy = addMindmapChild(mindmap, targetParentId, source.text);
    if (!copy) return undefined;
    copy.style = { ...source.style };
    copy.image = source.image ? { ...source.image } : undefined;
    copy.collapsed = source.collapsed;
    if (!mindmap.settings.autoLayout) {
      copy.x = source.x === undefined ? undefined : source.x + 24;
      copy.y = source.y === undefined ? undefined : source.y + 24;
    }
    const edge = mindmap.edges.find((item) => item.targetNodeId === copy.id);
    const edgeStyle = clipboard.edgeStyles.find((item) => item.targetKey === source.key);
    if (edge && edgeStyle) edge.style = { ...edgeStyle.style };
    copies.set(source.key, copy);
  }
  return copies.get(clipboard.rootKey);
}

export function deleteMindmapBranch(
  mindmap: MindmapWidget,
  nodeId: string,
): number {
  if (nodeId === mindmap.rootNodeId) {
    const removed = mindmap.nodes.length - 1;
    mindmap.nodes = mindmap.nodes.filter((node) => node.id === nodeId);
    mindmap.edges = [];
    return removed;
  }
  const ids = branchIds(mindmap, nodeId);
  mindmap.nodes = mindmap.nodes.filter((node) => !ids.has(node.id));
  mindmap.edges = mindmap.edges.filter(
    (edge) => !ids.has(edge.targetNodeId) && !ids.has(edge.sourceNodeId),
  );
  normalizeOrders(mindmap);
  return ids.size;
}

function normalizeOrders(mindmap: MindmapWidget): void {
  for (const parent of mindmap.nodes)
    childrenOf(mindmap, parent.id).forEach((child, order) => {
      child.order = order;
    });
}

export function moveMindmapNode(
  mindmap: MindmapWidget,
  nodeId: string,
  parentId: string,
  beforeId?: string,
): boolean {
  const node = mindmapNode(mindmap, nodeId);
  const parent = mindmapNode(mindmap, parentId);
  if (
    !node ||
    !parent ||
    nodeId === mindmap.rootNodeId ||
    branchIds(mindmap, nodeId).has(parentId)
  )
    return false;
  const siblings = childrenOf(mindmap, parentId).filter(
    (item) => item.id !== nodeId,
  );
  const beforeIndex = beforeId
    ? siblings.findIndex((item) => item.id === beforeId)
    : -1;
  siblings.splice(beforeIndex < 0 ? siblings.length : beforeIndex, 0, node);
  node.parentId = parentId;
  siblings.forEach((sibling, order) => {
    sibling.order = order;
  });
  normalizeOrders(mindmap);
  const edge = mindmap.edges.find((item) => item.targetNodeId === nodeId);
  if (edge) edge.sourceNodeId = parentId;
  const updateLevel = (current: MindmapNode, level: number): void => {
    current.level = level;
    for (const child of childrenOf(mindmap, current.id))
      updateLevel(child, level + 1);
  };
  updateLevel(node, parent.level + 1);
  return true;
}

export function duplicateMindmap(mindmap: MindmapWidget): MindmapWidget {
  const ids = new Map(mindmap.nodes.map((node) => [node.id, createId()]));
  return {
    ...mindmap,
    id: createId(),
    rootNodeId: ids.get(mindmap.rootNodeId)!,
    nodes: mindmap.nodes.map((node) => ({
      ...node,
      id: ids.get(node.id)!,
      parentId: node.parentId ? ids.get(node.parentId)! : null,
      style: { ...node.style },
      image: node.image ? { ...node.image } : undefined,
    })),
    edges: mindmap.edges.map((edge) => ({
      ...edge,
      id: createId(),
      sourceNodeId: ids.get(edge.sourceNodeId)!,
      targetNodeId: ids.get(edge.targetNodeId)!,
      style: { ...edge.style },
    })),
    settings: { ...mindmap.settings },
  };
}

export function duplicateMindmapBranch(
  mindmap: MindmapWidget,
  nodeId: string,
): MindmapNode | undefined {
  const source = mindmapNode(mindmap, nodeId);
  if (!source) return undefined;
  const parentId = source.parentId ?? source.id;
  const ids = branchIds(mindmap, nodeId);
  const originals = mindmap.nodes
    .filter((node) => ids.has(node.id))
    .sort((a, b) => a.level - b.level || a.order - b.order);
  const remap = new Map<string, string>();
  let copyRoot: MindmapNode | undefined;
  for (const original of originals) {
    const parent =
      original.id === nodeId ? parentId : remap.get(original.parentId!)!;
    const copy = addMindmapChild(mindmap, parent, original.text)!;
    copy.style = { ...original.style };
    copy.image = original.image ? { ...original.image } : undefined;
    copy.collapsed = original.collapsed;
    remap.set(original.id, copy.id);
    if (original.id === nodeId) copyRoot = copy;
  }
  return copyRoot;
}

export function colorForNode(mindmap: MindmapWidget, nodeId: string): string {
  const node = mindmapNode(mindmap, nodeId);
  if (!node || !mindmap.settings.branchColors || node.id === mindmap.rootNodeId)
    return "#21b8b0";
  let top = node;
  while (top.parentId && top.parentId !== mindmap.rootNodeId)
    top = mindmapNode(mindmap, top.parentId) ?? top;
  return (
    top.style.branchColor ?? widgetColorSet(mindmap.settings.colorSet).branches[top.order % branchPalette.length]!
  );
}

export interface PositionedMindmapNode {
  node: MindmapNode;
  x: number;
  y: number;
  color: string;
}
export interface PositionedMindmapEdge {
  edge: MindmapEdge;
  path: string;
  color: string;
}
export interface MindmapLayout {
  nodes: PositionedMindmapNode[];
  edges: PositionedMindmapEdge[];
}

export function layoutMindmap(mindmap: MindmapWidget): MindmapLayout {
  const visible = mindmap.nodes.filter((node) => {
    let parentId = node.parentId;
    while (parentId) {
      const parent = mindmapNode(mindmap, parentId);
      if (!parent || parent.collapsed) return false;
      parentId = parent.parentId;
    }
    return true;
  });
  const hierarchy = stratify<MindmapNode>()
    .id((node) => node.id)
    .parentId((node) => node.parentId)(visible);
  hierarchy.sort((a, b) => byOrder(a.data, b.data));
  const spacingX = mindmap.settings.spacingX;
  const spacingY = mindmap.settings.spacingY;
  const laid = tree<MindmapNode>().nodeSize([spacingY, spacingX])(hierarchy);
  const descendants = laid.descendants();
  const xValues = descendants.map((node) => node.x);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const depth = Math.max(...descendants.map((node) => node.depth));
  const scaleX = Math.min(
    1,
    (MINDMAP_WIDTH / 2 - 120) / Math.max(1, depth * spacingX),
  );
  const scaleY = Math.min(1, (MINDMAP_HEIGHT - 120) / Math.max(1, maxX - minX));
  const positions = new Map<string, PositionedMindmapNode>();
  const rootBranches = hierarchy.children ?? [];
  const branchDirections = new Map(
    rootBranches.map((branch, index) => [branch.id!, index % 2 === 0 ? 1 : -1]),
  );
  const directionFor = (item: typeof descendants[number]): number => {
    let branch = item;
    while (branch.parent && branch.parent.depth > 0) branch = branch.parent;
    return branchDirections.get(branch.id!) ?? 1;
  };
  for (const item of descendants) {
    const direction = item.depth === 0 ? 0 : directionFor(item);
    let x = MINDMAP_WIDTH / 2 + direction * item.y * scaleX;
    let y = MINDMAP_HEIGHT / 2 + (item.x - (minX + maxX) / 2) * scaleY;
    if (descendants.length === 1) x = MINDMAP_WIDTH / 2;
    if (mindmap.settings.layout === "radial") {
      const count = descendants.length;
      const angle =
        count === 1
          ? 0
          : ((item.x - minX) / Math.max(1, maxX - minX)) * Math.PI * 2 -
            Math.PI / 2;
      const radius = item.depth * Math.min(spacingX, 390 / Math.max(1, depth));
      x = MINDMAP_WIDTH / 2 + Math.cos(angle) * radius;
      y = MINDMAP_HEIGHT / 2 + Math.sin(angle) * radius;
    }
    if (
      !mindmap.settings.autoLayout &&
      item.data.x !== undefined &&
      item.data.y !== undefined
    ) {
      x = item.data.x;
      y = item.data.y;
    }
    positions.set(item.id!, {
      node: item.data,
      x,
      y,
      color: colorForNode(mindmap, item.id!),
    });
  }
  const edges: PositionedMindmapEdge[] = mindmap.edges.flatMap((edge) => {
    const source = positions.get(edge.sourceNodeId);
    const target = positions.get(edge.targetNodeId);
    if (!source || !target) return [];
    const mid = (source.x + target.x) / 2;
    const path =
      mindmap.settings.layout === "radial" || edge.style.curve === "straight"
        ? `M ${source.x} ${source.y} L ${target.x} ${target.y}`
        : `M ${source.x} ${source.y} C ${mid} ${source.y}, ${mid} ${target.y}, ${target.x} ${target.y}`;
    return [{ edge, path, color: edge.style.color ?? target.color }];
  });
  return { nodes: [...positions.values()], edges };
}

/** Window Management is optional and experimental. Keep the fallback window usable without it. */
export interface PresentationScreen {
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
  width: number;
  height: number;
  label?: string;
  isPrimary?: boolean;
  isInternal?: boolean;
}
export interface PresentationScreenDetails {
  screens: PresentationScreen[];
  currentScreen: PresentationScreen;
  addEventListener?: (type: "screenschange", listener: () => void) => void;
  removeEventListener?: (type: "screenschange", listener: () => void) => void;
}
export interface ScreenDiscovery {
  details?: PresentationScreenDetails;
  screens: PresentationScreen[];
  current?: PresentationScreen;
  reason?: "unavailable" | "denied";
}
export type WindowManagementHost = Pick<Window, "open"> & {
  getScreenDetails?: () => Promise<PresentationScreenDetails>;
};
export interface PreparedAudience {
  popup: Window | null;
  discovery: Promise<ScreenDiscovery>;
  presentationId: string;
}
let prepared: PreparedAudience | undefined;

export function sameScreen(
  a: PresentationScreen,
  b: PresentationScreen,
): boolean {
  return (
    a === b ||
    (a.availLeft === b.availLeft &&
      a.availTop === b.availTop &&
      a.width === b.width &&
      a.height === b.height)
  );
}
export function externalScreens(
  discovery: ScreenDiscovery,
): PresentationScreen[] {
  return discovery.screens.filter(
    (screen) => !discovery.current || !sameScreen(screen, discovery.current),
  );
}
export function automaticScreen(
  discovery: ScreenDiscovery,
): PresentationScreen | undefined {
  const external = externalScreens(discovery);
  return external.length === 1 ? external[0] : undefined;
}
export function screenConnected(
  details: PresentationScreenDetails,
  selected: PresentationScreen,
): boolean {
  return details.screens.some((screen) => sameScreen(screen, selected));
}
export function audienceWindowOpen(
  popup: Window | null | undefined,
): popup is Window {
  return Boolean(popup && !popup.closed);
}
export function screenLabel(screen: PresentationScreen, index: number): string {
  const label =
    screen.label?.trim() ||
    (screen.isPrimary ? "Hauptbildschirm" : "Präsentationsbildschirm");
  return `Bildschirm ${index + 1} – ${label} (${screen.width} × ${screen.height})`;
}
export async function discoverScreens(
  host: WindowManagementHost,
): Promise<ScreenDiscovery> {
  if (typeof host.getScreenDetails !== "function")
    return { screens: [], reason: "unavailable" };
  try {
    const details = await host.getScreenDetails();
    return {
      details,
      screens: [...details.screens],
      current: details.currentScreen,
    };
  } catch {
    return { screens: [], reason: "denied" };
  }
}
export function reserveAudience(
  host: WindowManagementHost,
  presentationId: string,
): PreparedAudience {
  // Open while the click's transient activation is still available. Permission can resolve later.
  const popup = host.open(
    "about:blank",
    `verlaufsplaner-audience-${presentationId}`,
    "popup=yes,width=1280,height=720",
  );
  prepared = {
    popup,
    presentationId,
    discovery: popup
      ? discoverScreens(host)
      : Promise.resolve({ screens: [], reason: "unavailable" }),
  };
  return prepared;
}
export function takeReservedAudience(
  presentationId: string,
): PreparedAudience | undefined {
  if (prepared?.presentationId !== presentationId) return undefined;
  const result = prepared;
  prepared = undefined;
  return result;
}
export function placeAudience(
  popup: Window,
  screen: PresentationScreen,
): boolean {
  try {
    popup.moveTo(screen.availLeft, screen.availTop);
    popup.resizeTo(screen.availWidth, screen.availHeight);
    return true;
  } catch {
    return false;
  }
}

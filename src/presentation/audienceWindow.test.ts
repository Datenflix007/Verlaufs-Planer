import { describe, expect, it, vi } from "vitest";
import {
  audienceWindowOpen,
  automaticScreen,
  discoverScreens,
  externalScreens,
  placeAudience,
  reserveAudience,
  screenConnected,
  screenLabel,
  takeReservedAudience,
  type PresentationScreen,
  type WindowManagementHost,
} from "./audienceWindow";
import { tryPresentationFullscreen } from "./fullscreen";

const main: PresentationScreen = {
  availLeft: 0,
  availTop: 0,
  availWidth: 1920,
  availHeight: 1040,
  width: 1920,
  height: 1080,
  isPrimary: true,
};
const beamer: PresentationScreen = {
  availLeft: 1920,
  availTop: 0,
  availWidth: 1920,
  availHeight: 1080,
  width: 1920,
  height: 1080,
  label: "Beamer",
};
const third: PresentationScreen = {
  availLeft: -1600,
  availTop: 0,
  availWidth: 1600,
  availHeight: 900,
  width: 1600,
  height: 900,
};

describe("Zweitbildschirm und Vollbild-Fallbacks", () => {
  it("nutzt bei einem Bildschirm keinen externen Zielschirm", () => {
    const discovery = { screens: [main], current: main };
    expect(externalScreens(discovery)).toEqual([]);
    expect(automaticScreen(discovery)).toBeUndefined();
  });
  it("wählt genau einen externen Bildschirm automatisch", () => {
    const discovery = { screens: [main, beamer], current: main };
    expect(automaticScreen(discovery)).toBe(beamer);
    expect(screenLabel(beamer, 1)).toContain("Beamer (1920 × 1080)");
  });
  it("überlässt mehrere externe Bildschirme der Auswahl", () => {
    const discovery = { screens: [main, beamer, third], current: main };
    expect(externalScreens(discovery)).toEqual([beamer, third]);
    expect(automaticScreen(discovery)).toBeUndefined();
  });
  it("funktioniert ohne API und bei abgelehnter Berechtigung weiter", async () => {
    expect(
      await discoverScreens({
        open: vi.fn(),
      } as unknown as WindowManagementHost),
    ).toMatchObject({ screens: [], reason: "unavailable" });
    const denied = {
      open: vi.fn(),
      getScreenDetails: vi
        .fn()
        .mockRejectedValue(new DOMException("Denied", "NotAllowedError")),
    } as unknown as WindowManagementHost;
    expect(await discoverScreens(denied)).toMatchObject({
      screens: [],
      reason: "denied",
    });
  });
  it("reserviert das Popup vor der asynchronen Display-Abfrage und erkennt Popup-Blockade", async () => {
    const popup = { closed: false } as Window;
    const host = {
      open: vi.fn().mockReturnValue(popup),
      getScreenDetails: vi
        .fn()
        .mockResolvedValue({ screens: [main, beamer], currentScreen: main }),
    } as unknown as WindowManagementHost;
    const reservation = reserveAudience(host, "presentation-1");
    expect(host.open).toHaveBeenCalledWith(
      "about:blank",
      "verlaufsplaner-audience-presentation-1",
      expect.stringContaining("popup=yes"),
    );
    expect(takeReservedAudience("presentation-1")).toBe(reservation);
    expect((await reservation.discovery).screens).toHaveLength(2);
    const blocked = reserveAudience(
      {
        open: vi.fn().mockReturnValue(null),
      } as unknown as WindowManagementHost,
      "presentation-2",
    );
    expect(blocked.popup).toBeNull();
    expect(await blocked.discovery).toMatchObject({ reason: "unavailable" });
    takeReservedAudience("presentation-2");
  });
  it("positioniert ein geöffnetes Popup und erkennt Schließen oder Trennung", () => {
    const popup = {
      closed: false,
      moveTo: vi.fn(),
      resizeTo: vi.fn(),
    } as unknown as Window;
    expect(placeAudience(popup, beamer)).toBe(true);
    expect(popup.moveTo).toHaveBeenCalledWith(1920, 0);
    expect(popup.resizeTo).toHaveBeenCalledWith(1920, 1080);
    expect(audienceWindowOpen(popup)).toBe(true);
    expect(
      screenConnected({ screens: [main, beamer], currentScreen: main }, beamer),
    ).toBe(true);
    expect(
      screenConnected({ screens: [main], currentScreen: main }, beamer),
    ).toBe(false);
    Object.assign(popup, { closed: true });
    expect(audienceWindowOpen(popup)).toBe(false);
  });
  it("fällt bei verweigertem oder nicht unterstütztem Fullscreen auf den Button zurück", async () => {
    const denied = {
      fullscreenEnabled: true,
      documentElement: {
        requestFullscreen: vi.fn().mockRejectedValue(new Error("denied")),
      },
    } as unknown as Document;
    const supported = {
      fullscreenEnabled: true,
      documentElement: {
        requestFullscreen: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as Document;
    const unavailable = {
      fullscreenEnabled: false,
      documentElement: {},
    } as unknown as Document;
    expect(await tryPresentationFullscreen(denied)).toBe(false);
    expect(await tryPresentationFullscreen(supported)).toBe(true);
    expect(await tryPresentationFullscreen(unavailable)).toBe(false);
  });
});

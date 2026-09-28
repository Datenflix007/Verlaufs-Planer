export async function tryPresentationFullscreen(
  doc: Pick<Document, "fullscreenEnabled" | "documentElement">,
): Promise<boolean> {
  if (
    !doc.fullscreenEnabled ||
    typeof doc.documentElement.requestFullscreen !== "function"
  )
    return false;
  try {
    await doc.documentElement.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}

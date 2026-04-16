import type { DeviceMode } from "./types";

const DESKTOP_EDITOR_SCENE = { width: 920, height: 520 } as const;
const MOBILE_EDITOR_SCENE = { width: 700, height: 940 } as const;

export const WEB_OF_FATE_MAX_SCALE = 3;
export const WEB_OF_FATE_TABLET_VIEWPORT_HEIGHT = 560;
export const WEB_OF_FATE_DESKTOP_VIEWPORT_HEIGHT = 520;
export const WEB_OF_FATE_MOBILE_VIEWPORT_HEIGHT = 720;

const MOBILE_SCENE_WIDTH_FACTOR = 1.85;
const MOBILE_SCENE_HEIGHT_FACTOR = 1.3;

export function getWebOfFateViewerSceneSize(
  deviceMode: DeviceMode,
  viewportWidth: number,
  viewportHeight: number,
) {
  if (deviceMode === "mobile") {
    return {
      width: Math.max(
        Math.round(viewportWidth * MOBILE_SCENE_WIDTH_FACTOR),
        MOBILE_EDITOR_SCENE.width,
      ),
      height: Math.max(
        Math.round(viewportHeight * MOBILE_SCENE_HEIGHT_FACTOR),
        MOBILE_EDITOR_SCENE.height,
      ),
    };
  }

  return {
    width: viewportWidth,
    height: viewportHeight,
  };
}

export function getWebOfFateEditorSceneSize(mode: "desktop" | "mobile") {
  return mode === "mobile" ? MOBILE_EDITOR_SCENE : DESKTOP_EDITOR_SCENE;
}

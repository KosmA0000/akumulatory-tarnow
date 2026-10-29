export const MAX_SCENE_PIXELS = 1250000;
export const MAX_SCENE_DIMENSION = 2048;

export function scenePixelRatio(width, height, density = 1) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1;
  const displayRatio = Number.isFinite(density) && density > 0 ? density : 1;
  return Math.min(displayRatio, 1, Math.sqrt(MAX_SCENE_PIXELS / (width * height)), MAX_SCENE_DIMENSION / width, MAX_SCENE_DIMENSION / height);
}

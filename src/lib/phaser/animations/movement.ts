import * as Phaser from "phaser";
import movementAnimations from "../data/movementAnimations.json";
import staticPoses from "../data/staticPoses.json";

const posesByKey = new Map(staticPoses.map(pose => [pose.textureKey, pose.path]));
const geometryByKey = new Map(staticPoses.map(pose => [pose.textureKey, pose]));
const restFrames = new Map(movementAnimations.map(motion => [motion.textureKey, motion.restFrame]));

/**
 * Loads a static pose unless a movement sheet already contains it as its rest
 * frame. Those poses are shown from the sheet (see applyRestPose) so the same
 * pixels are not uploaded to the GPU twice.
 */
export function preloadStaticPose(scene: Phaser.Scene, textureKey: string) {
  if (restFrames.has(textureKey)) return;
  const path = posesByKey.get(textureKey);
  if (!path) throw new Error(`Missing static pose: ${textureKey}`);
  scene.load.image(textureKey, path);
}

export function movementRestFrame(textureKey: string): number {
  return restFrames.get(textureKey) ?? 0;
}

export function spriteReferenceGeometry(textureKey: string) {
  return geometryByKey.get(textureKey.replace(/_cycle$/, ""));
}

export function movementAnimationKey(textureKey: string): string {
  return `${textureKey}_cycle`;
}

/** Whether a static pose is available, either as its own texture or as a sheet rest frame. */
export function hasPoseTexture(scene: Phaser.Scene, textureKey: string): boolean {
  return scene.textures.exists(movementAnimationKey(textureKey)) || scene.textures.exists(textureKey);
}

/** Shows a static pose, preferring the movement sheet's rest frame. Returns false if neither exists. */
export function applyRestPose(sprite: Phaser.GameObjects.Sprite, textureKey: string): boolean {
  const sheetKey = movementAnimationKey(textureKey);
  if (sprite.scene.textures.exists(sheetKey)) {
    sprite.setTexture(sheetKey, movementRestFrame(textureKey));
    return true;
  }
  if (sprite.scene.textures.exists(textureKey)) {
    sprite.setTexture(textureKey);
    return true;
  }
  return false;
}

export function preloadMovementAnimations(scene: Phaser.Scene) {
  for (const motion of movementAnimations) {
    const key = movementAnimationKey(motion.textureKey);
    if (scene.textures.exists(key)) continue;
    scene.load.spritesheet(key, motion.path, {
      frameWidth: motion.frameWidth,
      frameHeight: motion.frameHeight,
    });
  }
}

export function registerMovementAnimations(scene: Phaser.Scene) {
  for (const motion of movementAnimations) {
    const key = movementAnimationKey(motion.textureKey);
    if (!scene.textures.exists(key)) continue;
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(key, {
        start: 0,
        end: motion.frames - 1,
      }),
      frameRate: motion.frameRate,
      repeat: -1,
    });
  }
}

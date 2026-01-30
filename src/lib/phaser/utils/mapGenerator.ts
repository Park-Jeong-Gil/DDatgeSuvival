import * as Phaser from "phaser";
import { MAP_WIDTH, MAP_HEIGHT } from "../constants";

export interface MapElements {
  obstacles: Phaser.Physics.Arcade.StaticGroup;
  bushes: Phaser.Physics.Arcade.StaticGroup;
}

export function generateMap(scene: Phaser.Scene): MapElements {
  const obstacles = scene.physics.add.staticGroup();
  const bushes = scene.physics.add.staticGroup();

  const centerX = MAP_WIDTH / 2;
  const centerY = MAP_HEIGHT / 2;
  const safeRadius = 200;

  // Trees
  placeObjects(scene, obstacles, "obstacle_tree", 120, centerX, centerY, safeRadius);

  // Rocks
  placeObjects(scene, obstacles, "obstacle_rock", 80, centerX, centerY, safeRadius);

  // Bushes (player can enter, speed reduction)
  placeObjects(scene, bushes, "obstacle_bush", 60, centerX, centerY, safeRadius);

  return { obstacles, bushes };
}

function placeObjects(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  textureKey: string,
  count: number,
  safeCenterX: number,
  safeCenterY: number,
  safeRadius: number
) {
  const margin = 80;
  const placed: { x: number; y: number }[] = [];
  const minSpacing = 60;

  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    let valid = false;

    for (let attempt = 0; attempt < 30; attempt++) {
      x = margin + Math.random() * (MAP_WIDTH - margin * 2);
      y = margin + Math.random() * (MAP_HEIGHT - margin * 2);

      // Check safe zone
      const distFromCenter = Phaser.Math.Distance.Between(
        x,
        y,
        safeCenterX,
        safeCenterY
      );
      if (distFromCenter < safeRadius) continue;

      // Check spacing
      const tooClose = placed.some(
        (p) => Phaser.Math.Distance.Between(x, y, p.x, p.y) < minSpacing
      );
      if (tooClose) continue;

      valid = true;
      break;
    }

    if (valid!) {
      const obj = group.create(x!, y!, textureKey);
      obj.setDepth(2);
      placed.push({ x: x!, y: y! });
    }
  }
}

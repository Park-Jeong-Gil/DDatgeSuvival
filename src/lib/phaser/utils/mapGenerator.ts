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

  // 모든 장애물의 위치를 추적 (타입 간 겹침 방지)
  const allPlacedObjects: { x: number; y: number; radius: number }[] = [];

  // Trees (더 큰 간격)
  placeObjects(
    scene,
    obstacles,
    "obstacle_tree",
    60,
    centerX,
    centerY,
    safeRadius,
    allPlacedObjects,
    80 // tree 반경
  );

  // Rocks
  placeObjects(
    scene,
    obstacles,
    "obstacle_rock",
    40,
    centerX,
    centerY,
    safeRadius,
    allPlacedObjects,
    60 // rock 반경
  );

  // Bushes (player can enter, speed reduction)
  placeObjects(
    scene,
    bushes,
    "obstacle_bush",
    30,
    centerX,
    centerY,
    safeRadius,
    allPlacedObjects,
    50 // bush 반경
  );

  return { obstacles, bushes };
}

function placeObjects(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  textureKey: string,
  count: number,
  safeCenterX: number,
  safeCenterY: number,
  safeRadius: number,
  allPlacedObjects: { x: number; y: number; radius: number }[],
  objectRadius: number
) {
  const margin = 80;
  const minSpacing = objectRadius * 2; // 반경의 2배 간격 확보

  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    let valid = false;

    // 최대 50번 시도 (더 많은 시도로 배치율 향상)
    for (let attempt = 0; attempt < 50; attempt++) {
      x = margin + Math.random() * (MAP_WIDTH - margin * 2);
      y = margin + Math.random() * (MAP_HEIGHT - margin * 2);

      // Check safe zone (플레이어 시작 지점)
      const distFromCenter = Phaser.Math.Distance.Between(
        x,
        y,
        safeCenterX,
        safeCenterY
      );
      if (distFromCenter < safeRadius) continue;

      // Check overlap with all previously placed objects
      const overlaps = allPlacedObjects.some((obj) => {
        const distance = Phaser.Math.Distance.Between(x, y, obj.x, obj.y);
        const requiredDistance = objectRadius + obj.radius;
        return distance < requiredDistance;
      });

      if (overlaps) continue;

      valid = true;
      break;
    }

    if (valid!) {
      const obj = group.create(x!, y!, textureKey);
      obj.setDepth(2);
      
      // 배치된 객체를 공유 배열에 추가 (다른 타입과의 겹침도 방지)
      allPlacedObjects.push({ x: x!, y: y!, radius: objectRadius });
    }
  }
}

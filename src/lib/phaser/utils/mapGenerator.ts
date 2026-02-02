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

  // Bushes 먼저 배치 (넓은 면적, 최대 4개, 비정형 클러스터 형태)
  placeClusteredBushes(
    scene,
    bushes,
    "obstacle_bush",
    4, // 최대 4개 클러스터
    centerX,
    centerY,
    safeRadius,
  );

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
    160, // tree 반경 (2x)
    2.0,
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
    120, // rock 반경 (2x)
    2.0,
  );

  return { obstacles, bushes };
}

// 비정형 클러스터 풀숲 생성 (구름 모양처럼 여러 크기의 사각형 조합)
function placeClusteredBushes(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  textureKey: string,
  clusterCount: number,
  safeCenterX: number,
  safeCenterY: number,
  safeRadius: number,
) {
  const margin = 200;
  const minClusterSpacing = 1200; // 클러스터 간 최소 거리

  const placedClusters: { x: number; y: number }[] = [];

  for (let i = 0; i < clusterCount; i++) {
    let clusterX: number, clusterY: number;
    let valid = false;

    // 클러스터 중심 위치 찾기
    for (let attempt = 0; attempt < 50; attempt++) {
      clusterX = margin + Math.random() * (MAP_WIDTH - margin * 2);
      clusterY = margin + Math.random() * (MAP_HEIGHT - margin * 2);

      // Safe zone 체크
      const distFromCenter = Phaser.Math.Distance.Between(
        clusterX,
        clusterY,
        safeCenterX,
        safeCenterY,
      );
      if (distFromCenter < safeRadius + 600) continue;

      // 다른 클러스터와의 거리 체크
      const tooClose = placedClusters.some((cluster) => {
        const distance = Phaser.Math.Distance.Between(
          clusterX,
          clusterY,
          cluster.x,
          cluster.y,
        );
        return distance < minClusterSpacing;
      });

      if (tooClose) continue;

      valid = true;
      break;
    }

    if (valid!) {
      placedClusters.push({ x: clusterX!, y: clusterY! });
      createCloudShapedBush(scene, group, textureKey, clusterX!, clusterY!);
    }
  }
}

// 구름 모양의 풀숲 생성 (다양한 크기의 사각형들을 랜덤하게 배치)
function createCloudShapedBush(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  textureKey: string,
  centerX: number,
  centerY: number,
) {
  // 8~15개의 사각형으로 비정형 모양 만들기
  const rectangleCount = 8 + Math.floor(Math.random() * 8);

  for (let i = 0; i < rectangleCount; i++) {
    // 중심에서 방사형으로 배치
    const angle = (Math.PI * 2 * i) / rectangleCount + Math.random() * 0.5;
    const distance = Math.random() * 150; // 중심에서의 거리 (0~150) - 2배 축소

    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;

    // 다양한 크기 (4배 ~ 11배) - 2배 축소
    const scale = 4 + Math.random() * 7;

    const bush = group.create(x, y, textureKey);
    bush.setDepth(2);
    bush.setScale(scale);
    bush.setAlpha(0.7 + Math.random() * 0.3); // 약간의 투명도 변화
  }

  // 중심에 큰 것 하나 더 추가 (밀도감) - 2배 축소
  const centerBush = group.create(centerX, centerY, textureKey);
  centerBush.setDepth(2);
  centerBush.setScale(9 + Math.random() * 3);
  centerBush.setAlpha(0.8);
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
  objectRadius: number,
  scale: number = 1.0,
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
        safeCenterY,
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
      obj.setScale(scale);

      // 배치된 객체를 공유 배열에 추가 (다른 타입과의 겹침도 방지)
      allPlacedObjects.push({ x: x!, y: y!, radius: objectRadius });
    }
  }
}

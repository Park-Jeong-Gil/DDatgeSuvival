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
    "tree_tile",
    30,
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
    "rock_tile",
    15,
    centerX,
    centerY,
    safeRadius,
    allPlacedObjects,
    120, // rock 반경 (2x)
    2.0,
  );

  return { obstacles, bushes };
}

// 맵 확장 시 새 경계 영역에 장애물/풀숲 자연스럽게 추가
// oldWidth/oldHeight: 확장 전 맵 크기, newWidth/newHeight: 확장 후 맵 크기
export function expandMapElements(
  scene: Phaser.Scene,
  mapElements: MapElements,
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
): void {
  // 나무/바위는 맵 확장 시 시각적 이미지와 물리 바디 위치 불일치 문제로 생성하지 않음
  placeBushesInBorder(
    scene, mapElements.bushes, "obstacle_bush", 1,
    oldWidth, oldHeight, newWidth, newHeight,
  );
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

// 타일 기반 비정형 풀숲 생성 (RenderTexture로 최적화)
function createCloudShapedBush(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  textureKey: string,
  centerX: number,
  centerY: number,
) {
  const TILE_SIZE = 200;
  const TILE_SCALE = 0.25;
  const BUSH_ALPHA = 0.85; // 일정한 alpha 값

  // 그리드 중심을 타일 크기에 맞춰 정렬
  const gridCenterX = Math.round(centerX / TILE_SIZE) * TILE_SIZE;
  const gridCenterY = Math.round(centerY / TILE_SIZE) * TILE_SIZE;

  // 배치할 타일 좌표 Set
  const tilesToPlace = new Set<string>();
  tilesToPlace.add("0,0");

  const targetTileCount = 4 + Math.floor(Math.random() * 4);
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ];

  while (tilesToPlace.size < targetTileCount) {
    const existingTiles = Array.from(tilesToPlace);
    const randomTile = existingTiles[Math.floor(Math.random() * existingTiles.length)];
    const [tx, ty] = randomTile.split(",").map(Number);

    const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);
    for (const [ddx, ddy] of shuffledDirs) {
      const newKey = `${tx + ddx},${ty + ddy}`;
      const dist = Math.sqrt((tx + ddx) ** 2 + (ty + ddy) ** 2);
      if (!tilesToPlace.has(newKey) && dist <= 2) {
        tilesToPlace.add(newKey);
        break;
      }
    }
  }

  // 클러스터 바운딩 박스 계산
  let minDx = 0, maxDx = 0, minDy = 0, maxDy = 0;
  for (const key of tilesToPlace) {
    const [dx, dy] = key.split(",").map(Number);
    minDx = Math.min(minDx, dx);
    maxDx = Math.max(maxDx, dx);
    minDy = Math.min(minDy, dy);
    maxDy = Math.max(maxDy, dy);
  }

  // 픽셀 라운드를 위한 여유 공간
  const CORNER_SIZE = 40;
  const rtWidth = (maxDx - minDx + 1) * TILE_SIZE + CORNER_SIZE * 2;
  const rtHeight = (maxDy - minDy + 1) * TILE_SIZE + CORNER_SIZE * 2;
  const rtOffsetX = minDx * TILE_SIZE - CORNER_SIZE;
  const rtOffsetY = minDy * TILE_SIZE - CORNER_SIZE;

  // RenderTexture 생성 (모든 타일을 하나의 텍스처로 베이킹)
  const rt = scene.add.renderTexture(
    gridCenterX + rtOffsetX + rtWidth / 2,
    gridCenterY + rtOffsetY + rtHeight / 2,
    rtWidth,
    rtHeight,
  );
  rt.setDepth(1);

  // 임시 TileSprite로 RenderTexture에 그리기
  for (const key of tilesToPlace) {
    const [dx, dy] = key.split(",").map(Number);
    // RenderTexture 내 상대 좌표
    const localX = (dx - minDx) * TILE_SIZE + CORNER_SIZE;
    const localY = (dy - minDy) * TILE_SIZE + CORNER_SIZE;

    // 메인 타일 그리기 (일정한 alpha)
    const tempTile = scene.add.tileSprite(0, 0, TILE_SIZE, TILE_SIZE, "grass_tile");
    tempTile.setTileScale(TILE_SCALE, TILE_SCALE);
    tempTile.setAlpha(BUSH_ALPHA);
    rt.draw(tempTile, localX, localY);
    tempTile.destroy();

    // 충돌 영역 (메인 타일만)
    const tileX = gridCenterX + dx * TILE_SIZE;
    const tileY = gridCenterY + dy * TILE_SIZE;
    const bush = group.create(tileX, tileY, textureKey);
    bush.setDepth(2);
    bush.setDisplaySize(TILE_SIZE, TILE_SIZE);
    bush.setAlpha(0);

    // 픽셀 라운드 코너 처리 - 대각선 이웃이 없고 양쪽 직선 이웃도 없는 경우
    const corners = [
      { corner: [-1, -1], adj1: [-1, 0], adj2: [0, -1], offsetX: -TILE_SIZE / 2 + CORNER_SIZE / 2, offsetY: -TILE_SIZE / 2 + CORNER_SIZE / 2 },
      { corner: [1, -1], adj1: [1, 0], adj2: [0, -1], offsetX: TILE_SIZE / 2 - CORNER_SIZE / 2, offsetY: -TILE_SIZE / 2 + CORNER_SIZE / 2 },
      { corner: [-1, 1], adj1: [-1, 0], adj2: [0, 1], offsetX: -TILE_SIZE / 2 + CORNER_SIZE / 2, offsetY: TILE_SIZE / 2 - CORNER_SIZE / 2 },
      { corner: [1, 1], adj1: [1, 0], adj2: [0, 1], offsetX: TILE_SIZE / 2 - CORNER_SIZE / 2, offsetY: TILE_SIZE / 2 - CORNER_SIZE / 2 },
    ];

    for (const { corner, adj1, adj2, offsetX, offsetY } of corners) {
      const hasCorner = tilesToPlace.has(`${dx + corner[0]},${dy + corner[1]}`);
      const hasAdj1 = tilesToPlace.has(`${dx + adj1[0]},${dy + adj1[1]}`);
      const hasAdj2 = tilesToPlace.has(`${dx + adj2[0]},${dy + adj2[1]}`);

      // 대각선에 타일이 없고, 양쪽 직선 방향에도 타일이 없으면 코너를 깎음
      if (!hasCorner && !hasAdj1 && !hasAdj2) {
        const cornerLocalX = localX + offsetX;
        const cornerLocalY = localY + offsetY;

        // 코너에 작은 픽셀 타일 추가 (라운드 효과)
        const cornerTile = scene.add.tileSprite(0, 0, CORNER_SIZE, CORNER_SIZE, "grass_tile");
        cornerTile.setTileScale(TILE_SCALE, TILE_SCALE);
        cornerTile.setAlpha(BUSH_ALPHA);
        rt.draw(cornerTile, cornerLocalX, cornerLocalY);
        cornerTile.destroy();
      }
    }
  }
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
      obj.setDepth(20); // 플레이어/NPC보다 위에 표시

      // 이미지를 객체 크기의 1/3로 조정
      const targetSize = (objectRadius * 2) / 3;
      obj.setDisplaySize(targetSize, targetSize);

      // 물리적 body 크기를 이미지의 60%로 줄이고 하단에 배치
      const bodySize = targetSize * 0.6;
      obj.body.setSize(bodySize, bodySize);
      obj.body.setOffset(
        (obj.width - bodySize) / 2,
        obj.height - bodySize - (obj.height - targetSize) / 2,
      );

      // 배치된 객체를 공유 배열에 추가 (실제 body 크기 기준으로)
      allPlacedObjects.push({ x: x!, y: y!, radius: bodySize / 2 });
    }
  }
}

// 새 경계 영역(구 맵 바깥)에만 풀숲 클러스터 배치
function placeBushesInBorder(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  textureKey: string,
  clusterCount: number,
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
) {
  const margin = 200;
  const borderBuffer = 100;

  for (let i = 0; i < clusterCount; i++) {
    let clusterX: number, clusterY: number;
    let valid = false;

    for (let attempt = 0; attempt < 80; attempt++) {
      clusterX = margin + Math.random() * (newWidth - margin * 2);
      clusterY = margin + Math.random() * (newHeight - margin * 2);

      // 구 맵 내부는 제외
      const inOldArea = clusterX < oldWidth - borderBuffer && clusterY < oldHeight - borderBuffer;
      if (inOldArea) continue;

      valid = true;
      break;
    }

    if (valid!) {
      createCloudShapedBush(scene, group, textureKey, clusterX!, clusterY!);
    }
  }
}

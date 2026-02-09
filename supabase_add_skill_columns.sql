-- 로그라이크 스킬 시스템을 위한 데이터베이스 스키마 변경
-- 실행 날짜: 2026-02-09

-- 1. 누적 스코어 컬럼 추가 (모든 게임의 점수 합산)
ALTER TABLE scores
ADD COLUMN IF NOT EXISTS total_accumulated_score BIGINT DEFAULT 0;

-- 2. 게임 화폐 컬럼 추가 (1000 스코어 = 100원)
ALTER TABLE scores
ADD COLUMN IF NOT EXISTS currency INTEGER DEFAULT 0;

-- 3. 언락한 스킬 ID 배열 (누적 스코어 기준)
ALTER TABLE scores
ADD COLUMN IF NOT EXISTS unlocked_skills TEXT[] DEFAULT '{}';

-- 4. 구매한 스킬 ID 배열 (화폐로 구매)
ALTER TABLE scores
ADD COLUMN IF NOT EXISTS purchased_skills TEXT[] DEFAULT '{}';

-- 5. 인덱스 추가 (쿼리 성능 향상)
CREATE INDEX IF NOT EXISTS idx_total_accumulated_score ON scores(total_accumulated_score);
CREATE INDEX IF NOT EXISTS idx_currency ON scores(currency);
CREATE INDEX IF NOT EXISTS idx_unlocked_skills ON scores USING GIN(unlocked_skills);
CREATE INDEX IF NOT EXISTS idx_purchased_skills ON scores USING GIN(purchased_skills);

-- 6. 컬럼 주석 추가
COMMENT ON COLUMN scores.total_accumulated_score IS '전체 게임의 누적 스코어 (게임 종료 시마다 score가 더해짐)';
COMMENT ON COLUMN scores.currency IS '게임 화폐 (1000 누적 스코어 = 100원, 10으로 나눔)';
COMMENT ON COLUMN scores.unlocked_skills IS '누적 스코어에 따라 언락된 스킬 ID 배열';
COMMENT ON COLUMN scores.purchased_skills IS '화폐로 구매한 스킬 ID 배열';

-- 7. 기존 데이터 마이그레이션 (기존 사용자의 누적 스코어를 현재 최고 스코어로 초기화)
UPDATE scores
SET total_accumulated_score = score,
    currency = FLOOR(score / 10)
WHERE total_accumulated_score = 0;

-- 8. 확인 쿼리
SELECT
    user_id,
    nickname,
    score AS current_high_score,
    total_accumulated_score,
    currency,
    unlocked_skills,
    purchased_skills
FROM scores
LIMIT 5;

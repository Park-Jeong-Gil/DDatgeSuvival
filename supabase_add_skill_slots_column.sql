-- 스킬 슬롯 구매 시스템을 위한 데이터베이스 스키마 변경
-- 실행 날짜: 2026-02-10

-- 1. 언락된 스킬 슬롯 수 컬럼 추가 (0~3, 기본값 0 = 모두 잠김)
ALTER TABLE scores
ADD COLUMN IF NOT EXISTS unlocked_slots INTEGER DEFAULT 0;

-- 2. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_unlocked_slots ON scores(unlocked_slots);

-- 3. 컬럼 주석 추가
COMMENT ON COLUMN scores.unlocked_slots IS '언락된 스킬 슬롯 수 (0=없음, 1=슬롯I, 2=슬롯I+II, 3=전체). 순서대로 구매: 200원 → 300원 → 400원';

-- 4. 확인 쿼리
SELECT
    user_id,
    nickname,
    currency,
    unlocked_slots,
    purchased_skills
FROM scores
LIMIT 5;

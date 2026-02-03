-- Update nickname column length from VARCHAR(12) to VARCHAR(10)
-- This will truncate any existing nicknames longer than 10 characters

-- First, truncate any nicknames that are longer than 10 characters (if any)
UPDATE scores 
SET nickname = SUBSTRING(nickname FROM 1 FOR 10)
WHERE LENGTH(nickname) > 10;

-- Then modify the column type
ALTER TABLE scores 
ALTER COLUMN nickname TYPE VARCHAR(10);

-- Add a comment to document the change
COMMENT ON COLUMN scores.nickname IS 'Player nickname (max 10 characters, duplicates allowed)';

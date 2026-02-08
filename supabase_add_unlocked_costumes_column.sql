-- Add unlocked_costumes column to scores table
-- This column stores all costume IDs that the player has unlocked/collected
-- Stored as a PostgreSQL text array to hold multiple costume IDs

ALTER TABLE scores
ADD COLUMN unlocked_costumes TEXT[];

-- Create a GIN index for efficient array queries (e.g., searching for specific costumes)
CREATE INDEX idx_unlocked_costumes ON scores USING GIN (unlocked_costumes);

-- Add a comment to document the column
COMMENT ON COLUMN scores.unlocked_costumes IS 'Array of all costume IDs the player has unlocked (e.g., {''fighter'', ''angel'', ''cosmic''}). NULL or empty array means no costumes unlocked yet.';

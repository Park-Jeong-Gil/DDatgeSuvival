-- Add costume column to scores table
-- This column stores the currently equipped costume name (e.g., 'fighter', 'angel', 'cosmic')
-- NULL means the player was using the default appearance

ALTER TABLE scores 
ADD COLUMN costume VARCHAR(50);

-- Create an index for potential queries filtering by costume
CREATE INDEX idx_costume ON scores(costume);

-- Update the comment
COMMENT ON COLUMN scores.costume IS 'Currently equipped costume name (e.g., fighter, angel, cosmic). NULL = default appearance';

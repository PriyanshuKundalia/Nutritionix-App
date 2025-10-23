-- Add type, weight, and reps columns to workouts table
-- Migration: 003_add_workout_type.sql

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS type TEXT DEFAULT '';
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS reps INTEGER DEFAULT NULL;

-- Update existing workouts with type based on their name (for backwards compatibility)
UPDATE workouts SET type = 'cardio' WHERE LOWER(name) = 'cardio';
UPDATE workouts SET type = 'strength' WHERE LOWER(name) = 'strength';
UPDATE workouts SET type = 'flexibility' WHERE LOWER(name) = 'flexibility';
UPDATE workouts SET type = 'sports' WHERE LOWER(name) = 'sports';

-- For existing workouts with custom names, set a default type based on common patterns
UPDATE workouts SET type = 'cardio' WHERE type = '' AND (
    LOWER(name) LIKE '%run%' OR 
    LOWER(name) LIKE '%jog%' OR 
    LOWER(name) LIKE '%walk%' OR 
    LOWER(name) LIKE '%bike%' OR 
    LOWER(name) LIKE '%cycle%' OR 
    LOWER(name) LIKE '%swim%'
);

UPDATE workouts SET type = 'strength' WHERE type = '' AND (
    LOWER(name) LIKE '%dead%hang%' OR 
    LOWER(name) LIKE '%deadhang%' OR 
    LOWER(name) LIKE '%bench%' OR 
    LOWER(name) LIKE '%squat%' OR 
    LOWER(name) LIKE '%deadlift%' OR 
    LOWER(name) LIKE '%press%' OR 
    LOWER(name) LIKE '%curl%' OR 
    LOWER(name) LIKE '%lift%' OR 
    LOWER(name) LIKE '%weight%'
);

UPDATE workouts SET type = 'flexibility' WHERE type = '' AND (
    LOWER(name) LIKE '%yoga%' OR 
    LOWER(name) LIKE '%stretch%' OR 
    LOWER(name) LIKE '%pilate%'
);

UPDATE workouts SET type = 'sports' WHERE type = '' AND (
    LOWER(name) LIKE '%basketball%' OR 
    LOWER(name) LIKE '%tennis%' OR 
    LOWER(name) LIKE '%soccer%' OR 
    LOWER(name) LIKE '%football%'
);

-- Set default type for any remaining workouts
UPDATE workouts SET type = 'cardio' WHERE type = '' OR type IS NULL;
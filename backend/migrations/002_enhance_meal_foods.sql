-- Migration to enhance meal_foods table with comprehensive nutrition data
-- Add new columns to meal_foods table

-- Add the new columns (some may already exist)
ALTER TABLE meal_foods ADD COLUMN IF NOT EXISTS food_id INTEGER;
ALTER TABLE meal_foods ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'g';
ALTER TABLE meal_foods ADD COLUMN IF NOT EXISTS fiber REAL DEFAULT 0;
ALTER TABLE meal_foods ADD COLUMN IF NOT EXISTS sugar REAL DEFAULT 0;
ALTER TABLE meal_foods ADD COLUMN IF NOT EXISTS sodium REAL DEFAULT 0;
ALTER TABLE meal_foods ADD COLUMN IF NOT EXISTS calcium REAL DEFAULT 0;
ALTER TABLE meal_foods ADD COLUMN IF NOT EXISTS iron REAL DEFAULT 0;
ALTER TABLE meal_foods ADD COLUMN IF NOT EXISTS potassium REAL DEFAULT 0;
ALTER TABLE meal_foods ADD COLUMN IF NOT EXISTS serving_size VARCHAR(50) DEFAULT '100 g';

-- Update existing records to have default values for new columns
UPDATE meal_foods SET unit = 'g' WHERE unit IS NULL;
UPDATE meal_foods SET serving_size = '100 g' WHERE serving_size IS NULL;
UPDATE meal_foods SET fiber = 0 WHERE fiber IS NULL;
UPDATE meal_foods SET sugar = 0 WHERE sugar IS NULL;
UPDATE meal_foods SET sodium = 0 WHERE sodium IS NULL;
UPDATE meal_foods SET calcium = 0 WHERE calcium IS NULL;
UPDATE meal_foods SET iron = 0 WHERE iron IS NULL;
UPDATE meal_foods SET potassium = 0 WHERE potassium IS NULL;

-- Create index on food_id for faster lookups if it references a foods table in the future
CREATE INDEX IF NOT EXISTS idx_meal_foods_food_id ON meal_foods(food_id);
CREATE INDEX IF NOT EXISTS idx_meal_foods_meal_id ON meal_foods(meal_id);
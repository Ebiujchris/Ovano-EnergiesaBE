-- Add subcategory column to products table for multi-level categorization
-- Step 1: Add the subcategory column (nullable)
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(255);

-- Step 2: Create index on subcategory for better query performance
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);

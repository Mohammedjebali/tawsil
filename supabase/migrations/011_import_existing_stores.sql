-- Import existing stores from orders table into the stores marketplace
-- These stores were already being used in the app before the marketplace feature
INSERT INTO stores (name, category, is_approved, is_active)
SELECT DISTINCT store_name,
  CASE
    WHEN store_name ILIKE '%pharm%' THEN 'pharmacy'
    WHEN store_name ILIKE '%pâtiss%' OR store_name ILIKE '%bakery%' THEN 'bakery'
    ELSE 'restaurant'
  END AS category,
  true AS is_approved,
  true AS is_active
FROM orders
WHERE store_name IS NOT NULL
  AND store_name NOT IN (SELECT name FROM stores);

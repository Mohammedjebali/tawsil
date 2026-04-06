-- Backfill user_id on existing orders that were placed before user_id was tracked.
-- Joins on customer_phone to find the matching customer's user_id.
UPDATE orders
SET user_id = c.user_id
FROM customers c
WHERE orders.customer_phone = c.phone
  AND orders.user_id IS NULL
  AND c.user_id IS NOT NULL;

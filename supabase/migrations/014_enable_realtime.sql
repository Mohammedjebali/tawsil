-- Enable Supabase Realtime on tables needed for live subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE store_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE store_items;
ALTER PUBLICATION supabase_realtime ADD TABLE stores;
ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;

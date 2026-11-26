-- Migration 025: Sync default voucher values (CUOITUAN100K, SINHVIEN30K, DATTHANG15) and update 1-star test review to 5 stars
-- Idempotent MySQL 8.0+ migration

UPDATE `vouchers`
SET `discount_type` = 'fixed', `discount_value` = 100000, `min_order` = 900000
WHERE `code` = 'CUOITUAN100K' AND (`discount_type` <> 'fixed' OR `discount_value` <> 100000 OR `min_order` = 0);

UPDATE `vouchers`
SET `discount_type` = 'fixed', `discount_value` = 30000, `min_order` = 200000
WHERE `code` = 'SINHVIEN30K' AND (`discount_type` <> 'fixed' OR `discount_value` <> 30000 OR `min_order` = 0);

UPDATE `vouchers`
SET `discount_type` = 'percent', `discount_value` = 15, `min_order` = 800000
WHERE `code` = 'DATTHANG15' AND (`discount_type` <> 'percent' OR `discount_value` <> 15 OR `min_order` = 0);

UPDATE `reviews`
SET `rating` = 5
WHERE `id` = 1 AND `rating` < 5;

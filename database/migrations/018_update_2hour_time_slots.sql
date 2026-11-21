-- Migration 018: Update time slots to 2 hours per shift, midday lunch break 11:30 - 14:30
-- Description: Sets 7 sequential 2-hour slots (05:30-07:30, 07:30-09:30, 09:30-11:30, 14:30-16:30, 16:30-18:30, 18:30-20:30, 20:30-22:30).

START TRANSACTION;

INSERT INTO `time_slots` (`id`, `slot_time`, `start_time`, `end_time`, `is_peak`, `duration`)
VALUES
  ('S01', '05:30 - 07:30', '05:30', '07:30', 0, 2.0),
  ('S02', '07:30 - 09:30', '07:30', '09:30', 0, 2.0),
  ('S03', '09:30 - 11:30', '09:30', '11:30', 0, 2.0),
  ('S04', '14:30 - 16:30', '14:30', '16:30', 0, 2.0),
  ('S05', '16:30 - 18:30', '16:30', '18:30', 1, 2.0),
  ('S06', '18:30 - 20:30', '18:30', '20:30', 1, 2.0),
  ('S07', '20:30 - 22:30', '20:30', '22:30', 0, 2.0)
ON DUPLICATE KEY UPDATE
  `slot_time` = VALUES(`slot_time`),
  `start_time` = VALUES(`start_time`),
  `end_time` = VALUES(`end_time`),
  `is_peak` = VALUES(`is_peak`),
  `duration` = VALUES(`duration`);

UPDATE `bookings` SET `slot_id` = 'S04' WHERE `slot_id` = 'S06';
UPDATE `bookings` SET `slot_id` = 'S05' WHERE `slot_id` IN ('S08', 'S09', 'S10');
UPDATE `bookings` SET `slot_id` = 'S06' WHERE `slot_id` IN ('S11', 'S12', 'S13', 'S14', 'S15');
UPDATE `bookings` SET `slot_id` = 'S07' WHERE `slot_id` IN ('S16', 'S17', 'S18');

DELETE FROM `time_slots` WHERE `id` NOT IN ('S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07');

COMMIT;

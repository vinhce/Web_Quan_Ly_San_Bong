-- Chay migration nay khi trien khai; khong thay doi marker schema_v12.
-- Moi booking co mot bang chia tien, revision chong ghi de tu nhieu tab.
CREATE TABLE IF NOT EXISTS `team_bill_splits` (
    `booking_id` INT NOT NULL PRIMARY KEY,
    `members_json` TEXT NOT NULL,
    `revision` INT UNSIGNED NOT NULL DEFAULT 1,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_team_split_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
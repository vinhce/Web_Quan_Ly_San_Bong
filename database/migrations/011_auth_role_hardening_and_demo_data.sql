-- Remove the role escalation previously applied to the seeded customer account.
UPDATE `users`
SET `role` = 'user', `phone` = '0000000002'
WHERE `username` = 'user'
  AND `email` = 'khachhang@sanbongpro.vn'
  AND `phone` = '0352313548';

-- Display/test-only accounts use random Argon2id hashes whose source passwords were discarded.
INSERT IGNORE INTO `users` (`username`, `email`, `phone`, `full_name`, `password_hash`, `role`, `status`)
VALUES
('demo_khach01', 'khachmau01@example.test', '0000000003', 'Nguyễn An Bình', '$argon2id$v=19$m=65536,t=4,p=1$bG90TS96TnNZUlN3cmFBdA$1J//G2LAELJoLf7NP+HDYxtuStR3XTC8DM3WgUgeK98', 'user', 'active'),
('demo_khach02', 'khachmau02@example.test', '0000000004', 'Trần Minh Khang', '$argon2id$v=19$m=65536,t=4,p=1$YUE0OXRjelRRN2doZVcuUg$aAzvgGYIdxMrWG3muygBC/mZ7eLST7y9G1acEszJ9o0', 'user', 'active'),
('demo_khach03', 'khachmau03@example.test', '0000000005', 'Lê Gia Huy', '$argon2id$v=19$m=65536,t=4,p=1$aXM2RlFYdk5ZYUlpOVYxQQ$16uTJ4e1Lh/arvK2F2S2H2wfQu6WDBpRCg4NEu9CALw', 'user', 'active');

INSERT IGNORE INTO `pitches` (`id`, `name`, `type`, `type_name`, `size`, `grass`, `base_price`, `peak_price`, `weekend_price`, `status`, `amenities_json`, `variant`, `description`)
VALUES
('P5-G', 'Sân 5 - Sân G (Mẫu)', 5, 'Sân 5 người', '20m x 40m', 'Cỏ nhân tạo tiêu chuẩn, đệm hạt cao su', 260000, 360000, 390000, 'Hoạt động', '["Đèn LED", "Bãi xe máy", "Phòng thay đồ"]', 'standard', 'Sân 5 mẫu bổ sung để kiểm thử danh sách và đặt sân.'),
('P7-H', 'Sân 7 - Sân H (Mẫu)', 7, 'Sân 7 người', '30m x 50m', 'Cỏ nhân tạo sợi ngắn, thoát nước nhanh', 430000, 630000, 720000, 'Hoạt động', '["Đèn LED", "Bãi đỗ xe", "Nước uống"]', 'bright', 'Sân 7 mẫu bổ sung, phù hợp các trận giao hữu buổi tối.'),
('P11-D', 'Sân 11 - Sân D (Mẫu)', 11, 'Sân 11 người', '68m x 105m', 'Cỏ nhân tạo tiêu chuẩn thi đấu', 920000, 1420000, 1550000, 'Hoạt động', '["Đèn thi đấu", "Khán đài", "Phòng thay đồ"]', 'hero', 'Sân 11 mẫu bổ sung để kiểm thử cấu hình và hiển thị.');

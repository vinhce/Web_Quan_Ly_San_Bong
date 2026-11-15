-- Migration 012: Thêm cột must_change_password vào bảng users
-- Phục vụ quy trình bảo mật bắt buộc đổi mật khẩu lần đầu cho tài khoản quản trị
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) NOT NULL DEFAULT 0;

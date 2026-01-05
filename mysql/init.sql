-- MySQL 初始化脚本
-- 创建数据库和表结构

CREATE DATABASE IF NOT EXISTS smartroom CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE smartroom;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id CHAR(32) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    face_image TEXT NOT NULL,
    face_encoding JSON NOT NULL,
    avatar_url TEXT,
    registered_at DATETIME(6) NOT NULL,
    last_login DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 预设表
CREATE TABLE IF NOT EXISTS presets (
    id CHAR(32) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    user_id CHAR(32) NOT NULL,
    face_image TEXT NOT NULL,
    gesture_image TEXT NOT NULL,
    gesture_encoding JSON NOT NULL,
    device_states JSON NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    last_used DATETIME(6),
    CONSTRAINT `presets_user_id_fk` FOREIGN KEY (user_id) REFERENCES `users` (id) ON DELETE CASCADE,
    UNIQUE KEY `presets_user_id_name_uniq` (`user_id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Django迁移表
CREATE TABLE IF NOT EXISTS django_migrations (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    app VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1. 临时强制关闭外键约束检查
SET FOREIGN_KEY_CHECKS = 0;

-- 2. 执行你所有的清空命令
truncate table auth_group_permissions;
truncate table auth_user_groups;
truncate table auth_group;
truncate table auth_user_user_permissions;
truncate table auth_permission;
truncate table django_admin_log;
truncate table auth_user;
truncate table django_content_type;
truncate table django_migrations;
truncate table django_session;
truncate table presets;
truncate table users;

-- 3. 重新开启外键约束检查（保证数据完整性）
SET FOREIGN_KEY_CHECKS = 1;
-- Create the `root` user and grant privileges for the Campus Voice DB.
-- Run this as a MySQL administrative user (root). If your MySQL uses
-- caching_sha2_password by default and your client does not support it,
-- you can force mysql_native_password instead. Adjust as needed for your server.

CREATE DATABASE IF NOT EXISTS `campus_voice_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user 'root'@'localhost' with the provided password and set
-- authentication plugin to mysql_native_password for compatibility.
CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Sakthi2005';

-- Grant privileges on the application database
GRANT ALL PRIVILEGES ON `campus_voice_db`.* TO 'root'@'localhost';

FLUSH PRIVILEGES;

-- Optional: show the plugin used for the new account (requires administrative rights)
-- SELECT user, host, plugin FROM mysql.user WHERE user='root' AND host='localhost';

CREATE SCHEMA `topaz`;

CREATE TABLE `topaz`.`messages` (
  `id` BIGINT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `text` TEXT NOT NULL,
  `lat` FLOAT NOT NULL,
  `long` FLOAT NOT NULL,
  `date` BIGINT NOT NULL,
  `likes` INT UNSIGNED NULL DEFAULT 0,
  `dislikes` INT UNSIGNED NULL DEFAULT 0,
  `picture_url` TEXT
);
CREATE TABLE `topaz`.`test_messages` LIKE `topaz`.`messages`;

CREATE TABLE `topaz`.`comments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `text` TEXT NOT NULL,
  `date` BIGINT NOT NULL,
  `message_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT NOT NULL
);
CREATE TABLE `topaz`.`test_comments` LIKE `topaz`.`comments`;

CREATE TABLE `topaz`.`users` (
  `id` BIGINT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` TEXT NOT NULL,
  `email` TEXT NOT NULL,
  `password`  VARCHAR(40),
  `salt`  VARCHAR(40),
  `picture_url` TEXT,
  `status` TEXT
);
CREATE TABLE `topaz`.`test_users` LIKE `topaz`.`users`;

CREATE TABLE `topaz`.`votes` (
  `user_id` BIGINT NOT NULL,
  `message_id` BIGINT NOT NULL,
  `vote` VARCHAR(8) NOT NULL,
  PRIMARY KEY (`user_id`, `message_id`)
);
CREATE TABLE `topaz`.`test_votes` LIKE `topaz`.`votes`;

CREATE TABLE `topaz`.`tags` (
  `id` BIGINT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `tag` VARCHAR(20)
);
CREATE TABLE `topaz`.`test_tags` LIKE `topaz`.`tags`;

CREATE TABLE `topaz`.`tag_links` (
  `id` BIGINT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `tag_id` BIGINT,
  `message_id` BIGINT,
  FOREIGN KEY (`tag_id`) REFERENCES `topaz`.`tags`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`message_id`) REFERENCES `topaz`.`messages`(`id`) ON DELETE CASCADE
);

CREATE TABLE `topaz`.`test_tag_links` (
  `id` BIGINT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `tag_id` BIGINT,
  `message_id` BIGINT,
  FOREIGN KEY (`tag_id`) REFERENCES `topaz`.`test_tags`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`message_id`) REFERENCES `topaz`.`test_messages`(`id`) ON DELETE CASCADE
);

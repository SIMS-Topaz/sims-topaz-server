CREATE SCHEMA `topaz`;

CREATE TABLE `topaz`.`messages` (
  `id` BIGINT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `username` TEXT NOT NULL,
  `text` TEXT NOT NULL,
  `lat` FLOAT NOT NULL,
  `long` FLOAT NOT NULL,
  `date` BIGINT NOT NULL,
  `likes` INT UNSIGNED NULL DEFAULT 0,
  `dislikes` INT UNSIGNED NULL DEFAULT 0
);

CREATE TABLE `topaz`.`comments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `text` TEXT NOT NULL,
  `date` BIGINT NOT NULL,
  `id_message` BIGINT UNSIGNED NOT NULL,
  `username` TEXT NOT NULL,
  `likes` INT UNSIGNED NULL DEFAULT 0,
  `dislikes` INT UNSIGNED NULL DEFAULT 0
);

CREATE TABLE `topaz`.`users` (
  `id` BIGINT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `username` TEXT NOT NULL,
  `email` TEXT NOT NULL,
  `password`  VARCHAR(40),
  `salt`  VARCHAR(40),
  UNIQUE INDEX `username_UNIQUE` (`username` ASC),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC));
);

CREATE TABLE `topaz`.`votes` (
  `user` VARCHAR(20) NOT NULL,
  `id_comment` BIGINT NOT NULL,
  `vote` VARCHAR(4) NOT NULL,
  PRIMARY KEY (`id_user`, `id_comment`)
);

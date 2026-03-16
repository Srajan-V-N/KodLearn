-- KodLearn Database Schema
-- Reference SQL for Aiven MySQL
-- Run this once in your Aiven Query Editor before starting the server.

CREATE TABLE `kod_user` (
  `id`        VARCHAR(36)    NOT NULL,
  `uid`       VARCHAR(50)    NOT NULL,
  `username`  VARCHAR(50)    NOT NULL,
  `email`     VARCHAR(255)   NOT NULL,
  `password`  VARCHAR(255)   NOT NULL,
  `phone`     VARCHAR(20)    NOT NULL,
  `role`      VARCHAR(20)    NOT NULL DEFAULT 'Customer',
  `balance`   DECIMAL(15,2)  NOT NULL DEFAULT 100000.00,
  `isFirstLogin` TINYINT(1)  NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)    NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kod_users_uid_key` (`uid`),
  UNIQUE KEY `kod_users_username_key` (`username`),
  UNIQUE KEY `kod_users_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_tokens` (
  `id`        VARCHAR(36) NOT NULL,
  `userId`    VARCHAR(36) NOT NULL,
  `token`     TEXT        NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `user_tokens_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `kod_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE kod_users ADD COLUMN isFirstLogin TINYINT(1) NOT NULL DEFAULT 1;

UPDATE kod_users SET isFirstLogin = 0;

CREATE TABLE `ai_conversations` (
  `id`        VARCHAR(36)   NOT NULL,
  `userId`    VARCHAR(36)   NOT NULL,
  `title`     VARCHAR(255)  NOT NULL,
  `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)   NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `ai_conversations_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `kod_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_projects` (
  `id`        VARCHAR(36)  NOT NULL,
  `userId`    VARCHAR(36)  NOT NULL,
  `name`      VARCHAR(100) NOT NULL,
  `icon`      VARCHAR(50)  NOT NULL DEFAULT 'Folder',
  `color`     VARCHAR(20)  NOT NULL DEFAULT '#feba01',
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `ai_projects_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `kod_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `ai_conversations`
  ADD COLUMN `projectId` VARCHAR(36) NULL,
  ADD CONSTRAINT `ai_conversations_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `ai_projects` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `ai_messages` (
  `id`             VARCHAR(36)   NOT NULL,
  `conversationId` VARCHAR(36)   NOT NULL,
  `role`           VARCHAR(20)   NOT NULL,
  `content`        TEXT          NOT NULL,
  `fileUrl`        VARCHAR(512)  NULL,
  `createdAt`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `ai_messages_conversationId_fkey`
    FOREIGN KEY (`conversationId`) REFERENCES `ai_conversations` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INCREMENTAL MIGRATION (run in Aiven if upgrading)
-- Safe to run on both fresh and existing DBs.
-- =====================================================

CREATE TABLE IF NOT EXISTS `ai_projects` (
  `id`        VARCHAR(36)  NOT NULL,
  `userId`    VARCHAR(36)  NOT NULL,
  `name`      VARCHAR(100) NOT NULL,
  `icon`      VARCHAR(50)  NOT NULL DEFAULT 'Folder',
  `color`     VARCHAR(20)  NOT NULL DEFAULT '#feba01',
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `ai_projects_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `kod_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Run only if column doesn't exist yet:
ALTER TABLE `ai_conversations`
  ADD COLUMN IF NOT EXISTS `projectId` VARCHAR(36) NULL;

-- Run only if FK doesn't exist yet (skip if already applied):
ALTER TABLE `ai_conversations`
  ADD CONSTRAINT `ai_conversations_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `ai_projects` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================
-- COURSES & LEARNING TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS `lessons` (
  `id`               VARCHAR(36)  NOT NULL,
  `courseId`         VARCHAR(36)  NOT NULL,
  `title`            VARCHAR(255) NOT NULL,
  `content`          LONGTEXT,
  `video_url`        VARCHAR(500),
  `order_num`        INT          DEFAULT 0,
  `duration_minutes` INT          DEFAULT 0,
  `is_published`     BOOLEAN      DEFAULT true,
  `createdAt`        DATETIME(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `lessons_courseId_fkey`
    FOREIGN KEY (`courseId`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lesson_progress` (
  `id`          VARCHAR(36) NOT NULL,
  `userId`      VARCHAR(36) NOT NULL,
  `lessonId`    VARCHAR(36) NOT NULL,
  `completedAt` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_lesson_progress` (`userId`, `lessonId`),
  CONSTRAINT `lesson_progress_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `kod_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lesson_progress_lessonId_fkey`
    FOREIGN KEY (`lessonId`) REFERENCES `lessons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `course_reviews` (
  `id`        VARCHAR(36) NOT NULL,
  `userId`    VARCHAR(36) NOT NULL,
  `courseId`  VARCHAR(36) NOT NULL,
  `rating`    TINYINT     NOT NULL,
  `comment`   TEXT,
  `createdAt` DATETIME(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_course_review` (`userId`, `courseId`),
  CONSTRAINT `course_reviews_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `kod_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_reviews_courseId_fkey`
    FOREIGN KEY (`courseId`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

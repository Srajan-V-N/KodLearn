import mysql from 'mysql2/promise';
import { env } from './env';

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
});

export async function initDb(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`kod_users\` (
        \`id\`        VARCHAR(36)    NOT NULL,
        \`uid\`       VARCHAR(50)    NOT NULL,
        \`username\`  VARCHAR(50)    NOT NULL,
        \`email\`     VARCHAR(255)   NOT NULL,
        \`password\`  VARCHAR(255)   NOT NULL,
        \`phone\`     VARCHAR(20)    NOT NULL,
        \`role\`      VARCHAR(20)    NOT NULL DEFAULT 'Customer',
        \`balance\`   DECIMAL(15,2)  NOT NULL DEFAULT 100000.00,
        \`createdAt\` DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3)    NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`kod_users_uid_key\` (\`uid\`),
        UNIQUE KEY \`kod_users_username_key\` (\`username\`),
        UNIQUE KEY \`kod_users_email_key\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`user_tokens\` (
        \`id\`        VARCHAR(36) NOT NULL,
        \`userId\`    VARCHAR(36) NOT NULL,
        \`token\`     TEXT        NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`expiresAt\` DATETIME(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`user_tokens_userId_fkey\`
          FOREIGN KEY (\`userId\`) REFERENCES \`kod_users\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`ai_conversations\` (
        \`id\`        VARCHAR(36)  NOT NULL,
        \`userId\`    VARCHAR(36)  NOT NULL,
        \`title\`     VARCHAR(255) NOT NULL DEFAULT 'New Chat',
        \`createdAt\` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        KEY \`ai_conversations_userId_idx\` (\`userId\`),
        CONSTRAINT \`ai_conversations_userId_fkey\`
          FOREIGN KEY (\`userId\`) REFERENCES \`kod_users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`ai_projects\` (
        \`id\`        VARCHAR(36)  NOT NULL,
        \`userId\`    VARCHAR(36)  NOT NULL,
        \`name\`      VARCHAR(100) NOT NULL,
        \`icon\`      VARCHAR(50)  NOT NULL DEFAULT 'Folder',
        \`color\`     VARCHAR(20)  NOT NULL DEFAULT '#feba01',
        \`createdAt\` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`ai_projects_userId_fkey\`
          FOREIGN KEY (\`userId\`) REFERENCES \`kod_users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add projectId column to ai_conversations if it doesn't exist yet
    const [colRows] = await conn.execute<mysql.RowDataPacket[]>(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'ai_conversations'
        AND COLUMN_NAME  = 'projectId'
    `);
    if ((colRows as mysql.RowDataPacket[])[0].cnt === 0) {
      await conn.execute(`
        ALTER TABLE \`ai_conversations\`
          ADD COLUMN \`projectId\` VARCHAR(36) NULL
      `);
    }

    // Add FK for projectId only if it doesn't already exist
    const [fkRows] = await conn.execute<mysql.RowDataPacket[]>(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ai_conversations'
        AND CONSTRAINT_NAME = 'ai_conversations_projectId_fkey'
    `);
    if ((fkRows as mysql.RowDataPacket[])[0].cnt === 0) {
      await conn.execute(`
        ALTER TABLE \`ai_conversations\`
          ADD CONSTRAINT \`ai_conversations_projectId_fkey\`
            FOREIGN KEY (\`projectId\`) REFERENCES \`ai_projects\` (\`id\`)
            ON DELETE SET NULL ON UPDATE CASCADE
      `);
    }

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`ai_messages\` (
        \`id\`             VARCHAR(36)                        NOT NULL,
        \`conversationId\` VARCHAR(36)                        NOT NULL,
        \`role\`           ENUM('user','assistant','system')  NOT NULL,
        \`content\`        LONGTEXT                           NOT NULL,
        \`fileUrl\`        VARCHAR(500)                       NULL,
        \`createdAt\`      DATETIME(3)                        NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        KEY \`ai_messages_conversationId_idx\` (\`conversationId\`),
        CONSTRAINT \`ai_messages_conversationId_fkey\`
          FOREIGN KEY (\`conversationId\`) REFERENCES \`ai_conversations\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Courses table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`courses\` (
        \`id\`             VARCHAR(36)    NOT NULL,
        \`title\`          VARCHAR(255)   NOT NULL,
        \`description\`    TEXT,
        \`instructor\`     VARCHAR(100),
        \`category\`       VARCHAR(50),
        \`duration_hours\` DECIMAL(5,1)   DEFAULT 0,
        \`thumbnail_url\`  VARCHAR(500),
        \`is_published\`   BOOLEAN        DEFAULT true,
        \`createdAt\`      DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\`      DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Enrollments table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`enrollments\` (
        \`id\`          VARCHAR(36)    NOT NULL,
        \`userId\`      VARCHAR(36)    NOT NULL,
        \`courseId\`    VARCHAR(36)    NOT NULL,
        \`progress\`    DECIMAL(5,2)   DEFAULT 0.00,
        \`completed\`   BOOLEAN        DEFAULT false,
        \`enrolledAt\`  DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`completedAt\` DATETIME(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`unique_enrollment\` (\`userId\`, \`courseId\`),
        CONSTRAINT \`enrollments_userId_fkey\`
          FOREIGN KEY (\`userId\`) REFERENCES \`kod_users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`enrollments_courseId_fkey\`
          FOREIGN KEY (\`courseId\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Lessons table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`lessons\` (
        \`id\`               VARCHAR(36)  NOT NULL,
        \`courseId\`         VARCHAR(36)  NOT NULL,
        \`title\`            VARCHAR(255) NOT NULL,
        \`content\`          LONGTEXT,
        \`video_url\`        VARCHAR(500),
        \`order_num\`        INT          DEFAULT 0,
        \`duration_minutes\` INT          DEFAULT 0,
        \`is_published\`     BOOLEAN      DEFAULT true,
        \`createdAt\`        DATETIME(3),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`lessons_courseId_fkey\`
          FOREIGN KEY (\`courseId\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Lesson progress table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`lesson_progress\` (
        \`id\`          VARCHAR(36) NOT NULL,
        \`userId\`      VARCHAR(36) NOT NULL,
        \`lessonId\`    VARCHAR(36) NOT NULL,
        \`completedAt\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`unique_lesson_progress\` (\`userId\`, \`lessonId\`),
        CONSTRAINT \`lesson_progress_userId_fkey\`
          FOREIGN KEY (\`userId\`) REFERENCES \`kod_users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`lesson_progress_lessonId_fkey\`
          FOREIGN KEY (\`lessonId\`) REFERENCES \`lessons\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Course reviews table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`course_reviews\` (
        \`id\`        VARCHAR(36) NOT NULL,
        \`userId\`    VARCHAR(36) NOT NULL,
        \`courseId\`  VARCHAR(36) NOT NULL,
        \`rating\`    TINYINT     NOT NULL,
        \`comment\`   TEXT,
        \`createdAt\` DATETIME(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`unique_course_review\` (\`userId\`, \`courseId\`),
        CONSTRAINT \`course_reviews_userId_fkey\`
          FOREIGN KEY (\`userId\`) REFERENCES \`kod_users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`course_reviews_courseId_fkey\`
          FOREIGN KEY (\`courseId\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Sections table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`sections\` (
        \`id\`          VARCHAR(36)  NOT NULL,
        \`courseId\`    VARCHAR(36)  NOT NULL,
        \`title\`       VARCHAR(255) NOT NULL,
        \`order_index\` INT          DEFAULT 0,
        \`createdAt\`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`sections_courseId_fkey\`
          FOREIGN KEY (\`courseId\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Video progress table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`video_progress\` (
        \`id\`                    VARCHAR(36) NOT NULL,
        \`userId\`                VARCHAR(36) NOT NULL,
        \`lessonId\`              VARCHAR(36) NOT NULL,
        \`last_position_seconds\` INT         DEFAULT 0,
        \`is_completed\`          BOOLEAN     DEFAULT false,
        \`completed_at\`          DATETIME(3),
        \`updatedAt\`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`unique_video_progress\` (\`userId\`, \`lessonId\`),
        CONSTRAINT \`vp_userId_fkey\`
          FOREIGN KEY (\`userId\`) REFERENCES \`kod_users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`vp_lessonId_fkey\`
          FOREIGN KEY (\`lessonId\`) REFERENCES \`lessons\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Certificates table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`certificates\` (
        \`id\`        VARCHAR(36) NOT NULL,
        \`userId\`    VARCHAR(36) NOT NULL,
        \`courseId\`  VARCHAR(36) NOT NULL,
        \`issued_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`unique_certificate\` (\`userId\`, \`courseId\`),
        CONSTRAINT \`cert_userId_fkey\`
          FOREIGN KEY (\`userId\`) REFERENCES \`kod_users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`cert_courseId_fkey\`
          FOREIGN KEY (\`courseId\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ALTER TABLE lessons: add section_id column if missing
    const [colSectionId] = await conn.execute<mysql.RowDataPacket[]>(`
      SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lessons' AND COLUMN_NAME = 'section_id'
    `);
    if ((colSectionId as mysql.RowDataPacket[])[0].cnt === 0) {
      await conn.execute(`ALTER TABLE \`lessons\` ADD COLUMN \`section_id\` VARCHAR(36) NULL`);
    }

    // Add FK for section_id only if not exists
    const [fkSectionId] = await conn.execute<mysql.RowDataPacket[]>(`
      SELECT COUNT(*) AS cnt FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'lessons'
        AND CONSTRAINT_NAME = 'lessons_sectionId_fkey'
    `);
    if ((fkSectionId as mysql.RowDataPacket[])[0].cnt === 0) {
      await conn.execute(`
        ALTER TABLE \`lessons\`
          ADD CONSTRAINT \`lessons_sectionId_fkey\`
            FOREIGN KEY (\`section_id\`) REFERENCES \`sections\` (\`id\`) ON DELETE SET NULL
      `);
    }

    // ALTER TABLE lessons: add youtube_url if missing
    const [colYoutubeUrl] = await conn.execute<mysql.RowDataPacket[]>(`
      SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lessons' AND COLUMN_NAME = 'youtube_url'
    `);
    if ((colYoutubeUrl as mysql.RowDataPacket[])[0].cnt === 0) {
      await conn.execute(`ALTER TABLE \`lessons\` ADD COLUMN \`youtube_url\` VARCHAR(500) NULL`);
    }

    // ALTER TABLE lessons: add duration_seconds if missing
    const [colDurSec] = await conn.execute<mysql.RowDataPacket[]>(`
      SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lessons' AND COLUMN_NAME = 'duration_seconds'
    `);
    if ((colDurSec as mysql.RowDataPacket[])[0].cnt === 0) {
      await conn.execute(`ALTER TABLE \`lessons\` ADD COLUMN \`duration_seconds\` INT DEFAULT 0`);
    }

    // Seed sample courses
    await conn.execute(`
      INSERT IGNORE INTO \`courses\` (\`id\`, \`title\`, \`description\`, \`instructor\`, \`category\`, \`duration_hours\`, \`is_published\`) VALUES
      ('c1000000-0000-0000-0000-000000000001', 'JavaScript Fundamentals', 'Master the core concepts of JavaScript from variables to async programming. Build real-world projects and gain confidence in writing modern JS.', 'Arjun Sharma', 'Programming', 12.5, true),
      ('c1000000-0000-0000-0000-000000000002', 'React & Next.js Mastery', 'Build production-ready full-stack web apps using React 18 and Next.js 14. Covers server components, data fetching, and deployment.', 'Priya Nair', 'Web Development', 18.0, true),
      ('c1000000-0000-0000-0000-000000000003', 'Python for Data Science', 'Learn Python with a focus on data analysis, NumPy, Pandas, and visualization. Perfect for beginners entering the data field.', 'Rahul Mehta', 'Data Science', 15.0, true),
      ('c1000000-0000-0000-0000-000000000004', 'UI/UX Design Essentials', 'Design beautiful, user-friendly interfaces using Figma. Learn design thinking, wireframing, prototyping, and usability testing.', 'Sneha Patel', 'Design', 10.0, true)
    `);

    // Seed sections (3 per course)
    await conn.execute(`
      INSERT IGNORE INTO \`sections\` (\`id\`, \`courseId\`, \`title\`, \`order_index\`) VALUES
      ('s1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','Getting Started with JavaScript',1),
      ('s1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000001','Functions & Arrays',2),
      ('s1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','Advanced JavaScript',3),
      ('s2000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','React Fundamentals',1),
      ('s2000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000002','Hooks & State Management',2),
      ('s2000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000002','Next.js & Full Stack',3),
      ('s3000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','Python Basics',1),
      ('s3000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000003','Data Analysis with Pandas',2),
      ('s3000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000003','Data Visualization',3),
      ('s4000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000004','Design Principles',1),
      ('s4000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000004','Figma Essentials',2),
      ('s4000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000004','Prototyping & Testing',3)
    `);

    // Seed lessons with YouTube video IDs (FreeCodeCamp / Traversy public videos)
    await conn.execute(`
      INSERT IGNORE INTO \`lessons\`
        (\`id\`,\`courseId\`,\`section_id\`,\`title\`,\`order_num\`,\`youtube_url\`,\`duration_seconds\`,\`is_published\`)
      VALUES
      -- JS: Section 1
      ('l1010000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000001','Introduction to JavaScript',1,'hdI2bqOjy3c',600,true),
      ('l1010000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000001','Variables and Data Types',2,'PkZNo7MFNFg',540,true),
      ('l1010000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000001','Operators and Control Flow',3,'hdI2bqOjy3c',480,true),
      -- JS: Section 2
      ('l1020000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000002','Functions in JavaScript',1,'PkZNo7MFNFg',720,true),
      ('l1020000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000002','Arrays and Methods',2,'hdI2bqOjy3c',660,true),
      ('l1020000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000002','Objects in JavaScript',3,'PkZNo7MFNFg',540,true),
      -- JS: Section 3
      ('l1030000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000003','DOM Manipulation',1,'hdI2bqOjy3c',600,true),
      ('l1030000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000003','Promises and Async/Await',2,'PkZNo7MFNFg',780,true),
      ('l1030000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000003','ES6+ Modern Features',3,'hdI2bqOjy3c',540,true),
      -- React: Section 1
      ('l2010000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','s2000000-0000-0000-0000-000000000001','What is React?',1,'bMknfKXIFA8',480,true),
      ('l2010000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000002','s2000000-0000-0000-0000-000000000001','JSX and Components',2,'w7ejDZ8SWv8',600,true),
      ('l2010000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000002','s2000000-0000-0000-0000-000000000001','Props and Data Flow',3,'bMknfKXIFA8',540,true),
      -- React: Section 2
      ('l2020000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','s2000000-0000-0000-0000-000000000002','useState and useEffect',1,'w7ejDZ8SWv8',720,true),
      ('l2020000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000002','s2000000-0000-0000-0000-000000000002','useContext and useRef',2,'bMknfKXIFA8',660,true),
      ('l2020000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000002','s2000000-0000-0000-0000-000000000002','Custom Hooks',3,'w7ejDZ8SWv8',600,true),
      -- React: Section 3
      ('l2030000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','s2000000-0000-0000-0000-000000000003','Next.js App Router',1,'bMknfKXIFA8',780,true),
      ('l2030000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000002','s2000000-0000-0000-0000-000000000003','Server Components & Data Fetching',2,'w7ejDZ8SWv8',840,true),
      ('l2030000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000002','s2000000-0000-0000-0000-000000000003','Deployment with Vercel',3,'bMknfKXIFA8',480,true),
      -- Python: Section 1
      ('l3010000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','s3000000-0000-0000-0000-000000000001','Introduction to Python',1,'rfscVS0vtbw',540,true),
      ('l3010000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000003','s3000000-0000-0000-0000-000000000001','Variables and Data Types',2,'rfscVS0vtbw',480,true),
      ('l3010000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000003','s3000000-0000-0000-0000-000000000001','Control Flow and Functions',3,'rfscVS0vtbw',600,true),
      -- Python: Section 2
      ('l3020000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','s3000000-0000-0000-0000-000000000002','NumPy Fundamentals',1,'rfscVS0vtbw',720,true),
      ('l3020000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000003','s3000000-0000-0000-0000-000000000002','Pandas DataFrames',2,'rfscVS0vtbw',780,true),
      ('l3020000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000003','s3000000-0000-0000-0000-000000000002','Data Cleaning Techniques',3,'rfscVS0vtbw',660,true),
      -- Python: Section 3
      ('l3030000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','s3000000-0000-0000-0000-000000000003','Matplotlib Basics',1,'rfscVS0vtbw',600,true),
      ('l3030000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000003','s3000000-0000-0000-0000-000000000003','Seaborn Visualizations',2,'rfscVS0vtbw',540,true),
      ('l3030000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000003','s3000000-0000-0000-0000-000000000003','Building a Data Dashboard',3,'rfscVS0vtbw',720,true),
      -- Design: Section 1
      ('l4010000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000004','s4000000-0000-0000-0000-000000000001','Design Thinking Process',1,'FTFaQWZBqQ8',480,true),
      ('l4010000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000004','s4000000-0000-0000-0000-000000000001','Color Theory and Typography',2,'FTFaQWZBqQ8',540,true),
      ('l4010000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000004','s4000000-0000-0000-0000-000000000001','Layout and Spacing',3,'FTFaQWZBqQ8',600,true),
      -- Design: Section 2
      ('l4020000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000004','s4000000-0000-0000-0000-000000000002','Figma Interface Tour',1,'FTFaQWZBqQ8',420,true),
      ('l4020000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000004','s4000000-0000-0000-0000-000000000002','Components and Auto Layout',2,'FTFaQWZBqQ8',660,true),
      ('l4020000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000004','s4000000-0000-0000-0000-000000000002','Creating a Design System',3,'FTFaQWZBqQ8',720,true),
      -- Design: Section 3
      ('l4030000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000004','s4000000-0000-0000-0000-000000000003','Interactive Prototypes',1,'FTFaQWZBqQ8',540,true),
      ('l4030000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000004','s4000000-0000-0000-0000-000000000003','Usability Testing Methods',2,'FTFaQWZBqQ8',480,true),
      ('l4030000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000004','s4000000-0000-0000-0000-000000000003','Presenting Your Design',3,'FTFaQWZBqQ8',360,true)
    `);

    console.log('✅ Database tables ready');
  } finally {
    conn.release();
  }
}

import mysql from 'mysql2/promise';
import { env } from './env';
import { hashPassword } from '../utils/password';

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

    // Wishlist table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`wishlist\` (
        \`id\`        VARCHAR(36) NOT NULL,
        \`userId\`    VARCHAR(36) NOT NULL,
        \`courseId\`  VARCHAR(36) NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`unique_wishlist\` (\`userId\`, \`courseId\`),
        CONSTRAINT \`wishlist_userId_fkey\`
          FOREIGN KEY (\`userId\`) REFERENCES \`kod_users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`wishlist_courseId_fkey\`
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

    // Seed / update existing 4 courses with thumbnails
    await conn.execute(`
      INSERT INTO \`courses\` (\`id\`, \`title\`, \`description\`, \`instructor\`, \`category\`, \`duration_hours\`, \`thumbnail_url\`, \`is_published\`) VALUES
      ('c1000000-0000-0000-0000-000000000001', 'JavaScript Fundamentals', 'Master the core concepts of JavaScript from variables to async programming. Build real-world projects and gain confidence in writing modern JS.', 'Arjun Sharma', 'Programming', 12.5, '/course-thumbnails/programming.svg', true),
      ('c1000000-0000-0000-0000-000000000002', 'React & Next.js Mastery', 'Build production-ready full-stack web apps using React 18 and Next.js 14. Covers server components, data fetching, and deployment.', 'Priya Nair', 'Web Development', 18.0, '/course-thumbnails/web-development.svg', true),
      ('c1000000-0000-0000-0000-000000000003', 'Python for Data Science', 'Learn Python with a focus on data analysis, NumPy, Pandas, and visualization. Perfect for beginners entering the data field.', 'Rahul Mehta', 'Data Science', 15.0, '/course-thumbnails/data-science.svg', true),
      ('c1000000-0000-0000-0000-000000000004', 'UI/UX Design Essentials', 'Design beautiful, user-friendly interfaces using Figma. Learn design thinking, wireframing, prototyping, and usability testing.', 'Sneha Patel', 'Design', 10.0, '/course-thumbnails/design.svg', true)
      ON DUPLICATE KEY UPDATE \`thumbnail_url\` = VALUES(\`thumbnail_url\`)
    `);

    // Seed 30 new courses
    await conn.execute(`
      INSERT IGNORE INTO \`courses\` (\`id\`, \`title\`, \`description\`, \`instructor\`, \`category\`, \`duration_hours\`, \`thumbnail_url\`, \`is_published\`) VALUES
      ('c5000000-0000-4000-8000-000000000005', 'Python Fundamentals', 'A comprehensive introduction to Python programming. Learn syntax, data structures, file handling, and OOP concepts through hands-on projects.', 'Vikram Singh', 'Programming', 12.0, '/course-thumbnails/programming.svg', true),
      ('c6000000-0000-4000-8000-000000000006', 'Java for Beginners', 'Start your Java journey from scratch. Covers OOP, collections, exceptions, and builds toward real-world application development.', 'Deepak Rajan', 'Programming', 16.0, '/course-thumbnails/programming.svg', true),
      ('c7000000-0000-4000-8000-000000000007', 'TypeScript Deep Dive', 'Master TypeScript from types and interfaces to generics and decorators. Write safer, more maintainable JavaScript code.', 'Anika Mehta', 'Programming', 10.0, '/course-thumbnails/programming.svg', true),
      ('c8000000-0000-4000-8000-000000000008', 'Go Programming Essentials', 'Learn Go from the ground up — goroutines, channels, interfaces, and building high-performance web services.', 'Suresh Kumar', 'Programming', 14.0, '/course-thumbnails/programming.svg', true),
      ('c9000000-0000-4000-8000-000000000009', 'Vue.js Complete Guide', 'Build reactive web applications with Vue 3. Covers the Composition API, Vuex, Vue Router, and deploying production apps.', 'Meera Iyer', 'Web Development', 13.0, '/course-thumbnails/web-development.svg', true),
      ('ca000000-0000-4000-8000-00000000000a', 'Node.js & Express Backend', 'Build robust REST APIs with Node.js and Express. Covers middleware, authentication, databases, and deployment on cloud platforms.', 'Arjun Sharma', 'Web Development', 15.0, '/course-thumbnails/web-development.svg', true),
      ('cb000000-0000-4000-8000-00000000000b', 'Full Stack with MERN', 'Build complete web apps from scratch using MongoDB, Express, React, and Node.js. Deploy a full-stack portfolio project.', 'Priya Nair', 'Web Development', 20.0, '/course-thumbnails/web-development.svg', true),
      ('cc000000-0000-4000-8000-00000000000c', 'CSS & Tailwind Mastery', 'Go from CSS basics to advanced Tailwind utility classes. Build responsive, beautiful UIs without writing custom CSS.', 'Kavya Reddy', 'Web Development', 8.0, '/course-thumbnails/web-development.svg', true),
      ('cd000000-0000-4000-8000-00000000000d', 'SQL for Data Analysis', 'Learn SQL for querying, aggregating, and analyzing data. Covers JOINs, window functions, and real-world analytics queries.', 'Rahul Mehta', 'Data Science', 9.0, '/course-thumbnails/data-science.svg', true),
      ('ce000000-0000-4000-8000-00000000000e', 'Statistics for Data Science', 'Build a solid statistics foundation for data science. Covers probability, distributions, hypothesis testing, and regression.', 'Sunita Patel', 'Data Science', 11.0, '/course-thumbnails/data-science.svg', true),
      ('cf000000-0000-4000-8000-00000000000f', 'R Programming for Data Science', 'Learn R for statistical analysis and visualization. Covers tidyverse, ggplot2, and building end-to-end data pipelines.', 'Anand Verma', 'Data Science', 13.0, '/course-thumbnails/data-science.svg', true),
      ('d0000000-0000-4000-8000-000000000010', 'Machine Learning Foundations', 'Understand the core algorithms behind ML — linear regression, decision trees, clustering, and model evaluation techniques.', 'Dr. Anjali Kumar', 'Artificial Intelligence', 18.0, '/course-thumbnails/artificial-intelligence.svg', true),
      ('d1000000-0000-4000-8000-000000000011', 'Deep Learning with TensorFlow', 'Build and train neural networks using TensorFlow and Keras. Covers CNNs, RNNs, transfer learning, and deployment.', 'Ravi Shankar', 'Artificial Intelligence', 20.0, '/course-thumbnails/artificial-intelligence.svg', true),
      ('d2000000-0000-4000-8000-000000000012', 'Natural Language Processing', 'Dive into NLP techniques — tokenization, embeddings, transformers, and building text classification and chatbot systems.', 'Priya Krishnan', 'Artificial Intelligence', 16.0, '/course-thumbnails/artificial-intelligence.svg', true),
      ('d3000000-0000-4000-8000-000000000013', 'Computer Vision Fundamentals', 'Learn image processing, feature detection, and deep learning for vision tasks using OpenCV and PyTorch.', 'Arun Prasad', 'Artificial Intelligence', 14.0, '/course-thumbnails/artificial-intelligence.svg', true),
      ('d4000000-0000-4000-8000-000000000014', 'Motion Design with After Effects', 'Create stunning animations and motion graphics. Learn keyframing, expressions, and compositing for professional video work.', 'Maya Singh', 'Design', 12.0, '/course-thumbnails/design.svg', true),
      ('d5000000-0000-4000-8000-000000000015', 'Brand Identity Design', 'Build compelling brand identities from strategy to execution. Covers logo design, brand guidelines, and visual systems.', 'Neha Gupta', 'Design', 10.0, '/course-thumbnails/design.svg', true),
      ('d6000000-0000-4000-8000-000000000016', 'Mobile App Design with Figma', 'Design pixel-perfect mobile apps in Figma. Covers mobile UI patterns, gestures, accessibility, and handoff to developers.', 'Sneha Patel', 'Design', 11.0, '/course-thumbnails/design.svg', true),
      ('d7000000-0000-4000-8000-000000000017', 'AWS Cloud Practitioner', 'Get AWS certified with this complete cloud fundamentals course. Covers compute, storage, networking, security, and pricing.', 'Sanjay Kapoor', 'Cloud Computing', 14.0, '/course-thumbnails/cloud-computing.svg', true),
      ('d8000000-0000-4000-8000-000000000018', 'Azure Fundamentals', 'Master Microsoft Azure core services. Covers virtual machines, Azure storage, App Service, and the AZ-900 certification exam.', 'Pooja Nair', 'Cloud Computing', 13.0, '/course-thumbnails/cloud-computing.svg', true),
      ('d9000000-0000-4000-8000-000000000019', 'Google Cloud Associate', 'Prepare for the Google Cloud Associate Engineer exam. Covers GCE, GKE, Cloud Run, BigQuery, and IAM best practices.', 'Kiran Reddy', 'Cloud Computing', 15.0, '/course-thumbnails/cloud-computing.svg', true),
      ('da000000-0000-4000-8000-00000000001a', 'Cloud Architecture Patterns', 'Learn cloud-native design patterns — microservices, event-driven architecture, serverless, and multi-cloud strategies.', 'Vikram Sharma', 'Cloud Computing', 12.0, '/course-thumbnails/cloud-computing.svg', true),
      ('db000000-0000-4000-8000-00000000001b', 'Ethical Hacking Fundamentals', 'Learn the mindset and tools of ethical hackers. Covers reconnaissance, exploitation, post-exploitation, and reporting.', 'Rajan Kumar', 'Cybersecurity', 16.0, '/course-thumbnails/cybersecurity.svg', true),
      ('dc000000-0000-4000-8000-00000000001c', 'Network Security Essentials', 'Understand firewalls, VPNs, intrusion detection, and network protocols. Build a strong foundation in network defense.', 'Preethi Suresh', 'Cybersecurity', 12.0, '/course-thumbnails/cybersecurity.svg', true),
      ('dd000000-0000-4000-8000-00000000001d', 'OWASP Top 10 & Web Security', 'Defend web applications against the most critical vulnerabilities. Covers injection, XSS, CSRF, broken auth, and secure coding.', 'Deepak Iyer', 'Cybersecurity', 10.0, '/course-thumbnails/cybersecurity.svg', true),
      ('de000000-0000-4000-8000-00000000001e', 'Penetration Testing with Kali', 'Master Kali Linux tools for professional penetration testing. Covers scanning, exploitation, privilege escalation, and reporting.', 'Suresh Menon', 'Cybersecurity', 18.0, '/course-thumbnails/cybersecurity.svg', true),
      ('df000000-0000-4000-8000-00000000001f', 'Docker & Kubernetes Fundamentals', 'Containerize apps with Docker and orchestrate at scale with Kubernetes. Covers pods, deployments, services, and Helm charts.', 'Arjun Ravi', 'DevOps', 15.0, '/course-thumbnails/devops.svg', true),
      ('e0000000-0000-4000-8000-000000000020', 'CI/CD with GitHub Actions', 'Automate your software delivery pipeline with GitHub Actions. Build, test, and deploy apps on every commit with zero infrastructure.', 'Kavita Sharma', 'DevOps', 10.0, '/course-thumbnails/devops.svg', true),
      ('e1000000-0000-4000-8000-000000000021', 'Terraform & Infrastructure as Code', 'Provision cloud infrastructure with Terraform. Covers state management, modules, workspaces, and multi-cloud deployments.', 'Rohit Verma', 'DevOps', 13.0, '/course-thumbnails/devops.svg', true),
      ('e2000000-0000-4000-8000-000000000022', 'Linux for DevOps Engineers', 'Master Linux for DevOps — shell scripting, process management, networking, file systems, and system administration.', 'Neeraj Patel', 'DevOps', 12.0, '/course-thumbnails/devops.svg', true)
    `);

    // Seed sections (3 per course) — original 4 courses
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

    // Sections for new 30 courses
    await conn.execute(`
      INSERT IGNORE INTO \`sections\` (\`id\`, \`courseId\`, \`title\`, \`order_index\`) VALUES
      -- Course 5: Python Fundamentals
      ('s5100000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000005','Python Basics & Setup',1),
      ('s5200000-0000-4000-8000-000000000002','c5000000-0000-4000-8000-000000000005','Data Structures in Python',2),
      ('s5300000-0000-4000-8000-000000000003','c5000000-0000-4000-8000-000000000005','Object-Oriented Python',3),
      -- Course 6: Java for Beginners
      ('s6100000-0000-4000-8000-000000000001','c6000000-0000-4000-8000-000000000006','Java Fundamentals',1),
      ('s6200000-0000-4000-8000-000000000002','c6000000-0000-4000-8000-000000000006','OOP Concepts',2),
      ('s6300000-0000-4000-8000-000000000003','c6000000-0000-4000-8000-000000000006','Collections & Exceptions',3),
      -- Course 7: TypeScript Deep Dive
      ('s7100000-0000-4000-8000-000000000001','c7000000-0000-4000-8000-000000000007','TypeScript Basics',1),
      ('s7200000-0000-4000-8000-000000000002','c7000000-0000-4000-8000-000000000007','Advanced Types',2),
      ('s7300000-0000-4000-8000-000000000003','c7000000-0000-4000-8000-000000000007','TypeScript in Practice',3),
      -- Course 8: Go Programming
      ('s8100000-0000-4000-8000-000000000001','c8000000-0000-4000-8000-000000000008','Go Fundamentals',1),
      ('s8200000-0000-4000-8000-000000000002','c8000000-0000-4000-8000-000000000008','Concurrency in Go',2),
      ('s8300000-0000-4000-8000-000000000003','c8000000-0000-4000-8000-000000000008','Building Web Services',3),
      -- Course 9: Vue.js
      ('s9100000-0000-4000-8000-000000000001','c9000000-0000-4000-8000-000000000009','Vue 3 Essentials',1),
      ('s9200000-0000-4000-8000-000000000002','c9000000-0000-4000-8000-000000000009','Composition API & State',2),
      ('s9300000-0000-4000-8000-000000000003','c9000000-0000-4000-8000-000000000009','Vue Router & Deployment',3),
      -- Course 10: Node.js & Express
      ('sa100000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-00000000000a','Node.js Fundamentals',1),
      ('sa200000-0000-4000-8000-000000000002','ca000000-0000-4000-8000-00000000000a','Building REST APIs',2),
      ('sa300000-0000-4000-8000-000000000003','ca000000-0000-4000-8000-00000000000a','Authentication & Deployment',3),
      -- Course 11: MERN Stack
      ('sb100000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-00000000000b','Backend with Node & Express',1),
      ('sb200000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-00000000000b','Frontend with React',2),
      ('sb300000-0000-4000-8000-000000000003','cb000000-0000-4000-8000-00000000000b','MongoDB & Full Integration',3),
      -- Course 12: CSS & Tailwind
      ('sc100000-0000-4000-8000-000000000001','cc000000-0000-4000-8000-00000000000c','CSS Fundamentals',1),
      ('sc200000-0000-4000-8000-000000000002','cc000000-0000-4000-8000-00000000000c','Tailwind CSS Basics',2),
      ('sc300000-0000-4000-8000-000000000003','cc000000-0000-4000-8000-00000000000c','Responsive Design Projects',3),
      -- Course 13: SQL
      ('sd100000-0000-4000-8000-000000000001','cd000000-0000-4000-8000-00000000000d','SQL Basics',1),
      ('sd200000-0000-4000-8000-000000000002','cd000000-0000-4000-8000-00000000000d','Advanced Queries',2),
      ('sd300000-0000-4000-8000-000000000003','cd000000-0000-4000-8000-00000000000d','Analytics & Reporting',3),
      -- Course 14: Statistics
      ('se100000-0000-4000-8000-000000000001','ce000000-0000-4000-8000-00000000000e','Probability & Distributions',1),
      ('se200000-0000-4000-8000-000000000002','ce000000-0000-4000-8000-00000000000e','Statistical Testing',2),
      ('se300000-0000-4000-8000-000000000003','ce000000-0000-4000-8000-00000000000e','Regression & Prediction',3),
      -- Course 15: R Programming
      ('sf100000-0000-4000-8000-000000000001','cf000000-0000-4000-8000-00000000000f','R Basics & Tidyverse',1),
      ('sf200000-0000-4000-8000-000000000002','cf000000-0000-4000-8000-00000000000f','Data Wrangling with dplyr',2),
      ('sf300000-0000-4000-8000-000000000003','cf000000-0000-4000-8000-00000000000f','Visualization with ggplot2',3)
    `);

    await conn.execute(`
      INSERT IGNORE INTO \`sections\` (\`id\`, \`courseId\`, \`title\`, \`order_index\`) VALUES
      -- Course 16: Machine Learning
      ('sg100000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000010','ML Foundations',1),
      ('sg200000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000010','Supervised Learning',2),
      ('sg300000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000010','Unsupervised & Model Tuning',3),
      -- Course 17: Deep Learning
      ('sh100000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000011','Neural Network Basics',1),
      ('sh200000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000011','CNNs & Image Models',2),
      ('sh300000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000011','RNNs & Transfer Learning',3),
      -- Course 18: NLP
      ('si100000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000012','Text Processing Basics',1),
      ('si200000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000012','Embeddings & Transformers',2),
      ('si300000-0000-4000-8000-000000000003','d2000000-0000-4000-8000-000000000012','NLP Applications',3),
      -- Course 19: Computer Vision
      ('sj100000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000013','Image Processing Fundamentals',1),
      ('sj200000-0000-4000-8000-000000000002','d3000000-0000-4000-8000-000000000013','Deep Learning for Vision',2),
      ('sj300000-0000-4000-8000-000000000003','d3000000-0000-4000-8000-000000000013','Object Detection & Segmentation',3),
      -- Course 20: Motion Design
      ('sk100000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000014','After Effects Interface',1),
      ('sk200000-0000-4000-8000-000000000002','d4000000-0000-4000-8000-000000000014','Keyframing & Animation',2),
      ('sk300000-0000-4000-8000-000000000003','d4000000-0000-4000-8000-000000000014','Expressions & Compositing',3),
      -- Course 21: Brand Identity
      ('sl100000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000015','Brand Strategy',1),
      ('sl200000-0000-4000-8000-000000000002','d5000000-0000-4000-8000-000000000015','Logo & Visual Identity',2),
      ('sl300000-0000-4000-8000-000000000003','d5000000-0000-4000-8000-000000000015','Brand Guidelines',3),
      -- Course 22: Mobile App Design
      ('sm100000-0000-4000-8000-000000000001','d6000000-0000-4000-8000-000000000016','Mobile UI Patterns',1),
      ('sm200000-0000-4000-8000-000000000002','d6000000-0000-4000-8000-000000000016','Designing in Figma',2),
      ('sm300000-0000-4000-8000-000000000003','d6000000-0000-4000-8000-000000000016','Prototyping & Handoff',3),
      -- Course 23: AWS
      ('sn100000-0000-4000-8000-000000000001','d7000000-0000-4000-8000-000000000017','AWS Core Services',1),
      ('sn200000-0000-4000-8000-000000000002','d7000000-0000-4000-8000-000000000017','Security & Networking',2),
      ('sn300000-0000-4000-8000-000000000003','d7000000-0000-4000-8000-000000000017','Billing & Certification Prep',3),
      -- Course 24: Azure
      ('so100000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000018','Azure Core Concepts',1),
      ('so200000-0000-4000-8000-000000000002','d8000000-0000-4000-8000-000000000018','Azure Services Deep Dive',2),
      ('so300000-0000-4000-8000-000000000003','d8000000-0000-4000-8000-000000000018','AZ-900 Exam Preparation',3),
      -- Course 25: Google Cloud
      ('sp100000-0000-4000-8000-000000000001','d9000000-0000-4000-8000-000000000019','GCP Fundamentals',1),
      ('sp200000-0000-4000-8000-000000000002','d9000000-0000-4000-8000-000000000019','GKE & Cloud Run',2),
      ('sp300000-0000-4000-8000-000000000003','d9000000-0000-4000-8000-000000000019','BigQuery & Certification',3),
      -- Course 26: Cloud Architecture
      ('sq100000-0000-4000-8000-000000000001','da000000-0000-4000-8000-00000000001a','Cloud-Native Patterns',1),
      ('sq200000-0000-4000-8000-000000000002','da000000-0000-4000-8000-00000000001a','Microservices & Serverless',2),
      ('sq300000-0000-4000-8000-000000000003','da000000-0000-4000-8000-00000000001a','Multi-Cloud & Resilience',3),
      -- Course 27: Ethical Hacking
      ('sr100000-0000-4000-8000-000000000001','db000000-0000-4000-8000-00000000001b','Recon & Footprinting',1),
      ('sr200000-0000-4000-8000-000000000002','db000000-0000-4000-8000-00000000001b','Exploitation Techniques',2),
      ('sr300000-0000-4000-8000-000000000003','db000000-0000-4000-8000-00000000001b','Post-Exploitation & Reporting',3),
      -- Course 28: Network Security
      ('ss100000-0000-4000-8000-000000000001','dc000000-0000-4000-8000-00000000001c','Network Protocols & Threats',1),
      ('ss200000-0000-4000-8000-000000000002','dc000000-0000-4000-8000-00000000001c','Firewalls & VPNs',2),
      ('ss300000-0000-4000-8000-000000000003','dc000000-0000-4000-8000-00000000001c','IDS/IPS & Monitoring',3),
      -- Course 29: OWASP
      ('st100000-0000-4000-8000-000000000001','dd000000-0000-4000-8000-00000000001d','OWASP Top 10 Overview',1),
      ('st200000-0000-4000-8000-000000000002','dd000000-0000-4000-8000-00000000001d','Injection & Auth Flaws',2),
      ('st300000-0000-4000-8000-000000000003','dd000000-0000-4000-8000-00000000001d','Secure Coding Practices',3),
      -- Course 30: Penetration Testing
      ('su100000-0000-4000-8000-000000000001','de000000-0000-4000-8000-00000000001e','Kali Linux Setup',1),
      ('su200000-0000-4000-8000-000000000002','de000000-0000-4000-8000-00000000001e','Scanning & Enumeration',2),
      ('su300000-0000-4000-8000-000000000003','de000000-0000-4000-8000-00000000001e','Exploitation & Reporting',3),
      -- Course 31: Docker & Kubernetes
      ('sv100000-0000-4000-8000-000000000001','df000000-0000-4000-8000-00000000001f','Docker Fundamentals',1),
      ('sv200000-0000-4000-8000-000000000002','df000000-0000-4000-8000-00000000001f','Kubernetes Basics',2),
      ('sv300000-0000-4000-8000-000000000003','df000000-0000-4000-8000-00000000001f','Helm & Production Deployments',3),
      -- Course 32: CI/CD
      ('sw100000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000020','GitHub Actions Basics',1),
      ('sw200000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000020','Build & Test Automation',2),
      ('sw300000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000020','Deploy Pipelines',3),
      -- Course 33: Terraform
      ('sx100000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000021','Terraform Fundamentals',1),
      ('sx200000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000021','Modules & State Management',2),
      ('sx300000-0000-4000-8000-000000000003','e1000000-0000-4000-8000-000000000021','Multi-Cloud Deployments',3),
      -- Course 34: Linux for DevOps
      ('sy100000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000022','Linux Basics & Shell',1),
      ('sy200000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000022','Scripting & Automation',2),
      ('sy300000-0000-4000-8000-000000000003','e2000000-0000-4000-8000-000000000022','System Administration',3)
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

    // Lessons for new courses 5-10
    await conn.execute(`
      INSERT IGNORE INTO \`lessons\`
        (\`id\`,\`courseId\`,\`section_id\`,\`title\`,\`order_num\`,\`youtube_url\`,\`duration_seconds\`,\`is_published\`)
      VALUES
      -- Course 5: Python Fundamentals
      ('l5110000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000005','s5100000-0000-4000-8000-000000000001','Installing Python & First Program',1,'rfscVS0vtbw',480,true),
      ('l5120000-0000-4000-8000-000000000002','c5000000-0000-4000-8000-000000000005','s5100000-0000-4000-8000-000000000001','Variables, Strings & Numbers',2,'rfscVS0vtbw',540,true),
      ('l5130000-0000-4000-8000-000000000003','c5000000-0000-4000-8000-000000000005','s5100000-0000-4000-8000-000000000001','Control Flow: if/else & loops',3,'rfscVS0vtbw',600,true),
      ('l5210000-0000-4000-8000-000000000004','c5000000-0000-4000-8000-000000000005','s5200000-0000-4000-8000-000000000002','Lists and Tuples',1,'rfscVS0vtbw',480,true),
      ('l5220000-0000-4000-8000-000000000005','c5000000-0000-4000-8000-000000000005','s5200000-0000-4000-8000-000000000002','Dictionaries and Sets',2,'rfscVS0vtbw',540,true),
      ('l5230000-0000-4000-8000-000000000006','c5000000-0000-4000-8000-000000000005','s5200000-0000-4000-8000-000000000002','File I/O and Modules',3,'rfscVS0vtbw',600,true),
      ('l5310000-0000-4000-8000-000000000007','c5000000-0000-4000-8000-000000000005','s5300000-0000-4000-8000-000000000003','Classes and Objects',1,'rfscVS0vtbw',720,true),
      ('l5320000-0000-4000-8000-000000000008','c5000000-0000-4000-8000-000000000005','s5300000-0000-4000-8000-000000000003','Inheritance and Polymorphism',2,'rfscVS0vtbw',660,true),
      ('l5330000-0000-4000-8000-000000000009','c5000000-0000-4000-8000-000000000005','s5300000-0000-4000-8000-000000000003','Decorators and Generators',3,'rfscVS0vtbw',600,true),
      -- Course 6: Java
      ('l6110000-0000-4000-8000-000000000001','c6000000-0000-4000-8000-000000000006','s6100000-0000-4000-8000-000000000001','Java Setup and Hello World',1,'hdI2bqOjy3c',480,true),
      ('l6120000-0000-4000-8000-000000000002','c6000000-0000-4000-8000-000000000006','s6100000-0000-4000-8000-000000000001','Data Types and Variables',2,'hdI2bqOjy3c',540,true),
      ('l6130000-0000-4000-8000-000000000003','c6000000-0000-4000-8000-000000000006','s6100000-0000-4000-8000-000000000001','Control Structures',3,'hdI2bqOjy3c',600,true),
      ('l6210000-0000-4000-8000-000000000004','c6000000-0000-4000-8000-000000000006','s6200000-0000-4000-8000-000000000002','Classes and Objects',1,'hdI2bqOjy3c',720,true),
      ('l6220000-0000-4000-8000-000000000005','c6000000-0000-4000-8000-000000000006','s6200000-0000-4000-8000-000000000002','Interfaces and Abstract Classes',2,'hdI2bqOjy3c',660,true),
      ('l6230000-0000-4000-8000-000000000006','c6000000-0000-4000-8000-000000000006','s6200000-0000-4000-8000-000000000002','Inheritance and Polymorphism',3,'hdI2bqOjy3c',600,true),
      ('l6310000-0000-4000-8000-000000000007','c6000000-0000-4000-8000-000000000006','s6300000-0000-4000-8000-000000000003','ArrayList and HashMap',1,'hdI2bqOjy3c',540,true),
      ('l6320000-0000-4000-8000-000000000008','c6000000-0000-4000-8000-000000000006','s6300000-0000-4000-8000-000000000003','Exception Handling',2,'hdI2bqOjy3c',480,true),
      ('l6330000-0000-4000-8000-000000000009','c6000000-0000-4000-8000-000000000006','s6300000-0000-4000-8000-000000000003','Java Streams and Lambdas',3,'hdI2bqOjy3c',600,true),
      -- Course 7: TypeScript
      ('l7110000-0000-4000-8000-000000000001','c7000000-0000-4000-8000-000000000007','s7100000-0000-4000-8000-000000000001','TypeScript Setup and Basics',1,'PkZNo7MFNFg',480,true),
      ('l7120000-0000-4000-8000-000000000002','c7000000-0000-4000-8000-000000000007','s7100000-0000-4000-8000-000000000001','Types, Interfaces and Enums',2,'PkZNo7MFNFg',540,true),
      ('l7130000-0000-4000-8000-000000000003','c7000000-0000-4000-8000-000000000007','s7100000-0000-4000-8000-000000000001','Functions and Classes in TS',3,'PkZNo7MFNFg',600,true),
      ('l7210000-0000-4000-8000-000000000004','c7000000-0000-4000-8000-000000000007','s7200000-0000-4000-8000-000000000002','Generics',1,'PkZNo7MFNFg',720,true),
      ('l7220000-0000-4000-8000-000000000005','c7000000-0000-4000-8000-000000000007','s7200000-0000-4000-8000-000000000002','Union, Intersection & Mapped Types',2,'PkZNo7MFNFg',660,true),
      ('l7230000-0000-4000-8000-000000000006','c7000000-0000-4000-8000-000000000007','s7200000-0000-4000-8000-000000000002','Conditional and Utility Types',3,'PkZNo7MFNFg',600,true),
      ('l7310000-0000-4000-8000-000000000007','c7000000-0000-4000-8000-000000000007','s7300000-0000-4000-8000-000000000003','TypeScript with React',1,'PkZNo7MFNFg',540,true),
      ('l7320000-0000-4000-8000-000000000008','c7000000-0000-4000-8000-000000000007','s7300000-0000-4000-8000-000000000003','TypeScript with Node.js',2,'PkZNo7MFNFg',600,true),
      ('l7330000-0000-4000-8000-000000000009','c7000000-0000-4000-8000-000000000007','s7300000-0000-4000-8000-000000000003','tsconfig & Build Tools',3,'PkZNo7MFNFg',480,true),
      -- Course 8: Go
      ('l8110000-0000-4000-8000-000000000001','c8000000-0000-4000-8000-000000000008','s8100000-0000-4000-8000-000000000001','Go Setup and Syntax',1,'hdI2bqOjy3c',480,true),
      ('l8120000-0000-4000-8000-000000000002','c8000000-0000-4000-8000-000000000008','s8100000-0000-4000-8000-000000000001','Structs and Interfaces',2,'hdI2bqOjy3c',540,true),
      ('l8130000-0000-4000-8000-000000000003','c8000000-0000-4000-8000-000000000008','s8100000-0000-4000-8000-000000000001','Error Handling in Go',3,'hdI2bqOjy3c',600,true),
      ('l8210000-0000-4000-8000-000000000004','c8000000-0000-4000-8000-000000000008','s8200000-0000-4000-8000-000000000002','Goroutines',1,'hdI2bqOjy3c',720,true),
      ('l8220000-0000-4000-8000-000000000005','c8000000-0000-4000-8000-000000000008','s8200000-0000-4000-8000-000000000002','Channels and Select',2,'hdI2bqOjy3c',660,true),
      ('l8230000-0000-4000-8000-000000000006','c8000000-0000-4000-8000-000000000008','s8200000-0000-4000-8000-000000000002','Sync Package & Mutexes',3,'hdI2bqOjy3c',600,true),
      ('l8310000-0000-4000-8000-000000000007','c8000000-0000-4000-8000-000000000008','s8300000-0000-4000-8000-000000000003','Building HTTP Servers',1,'hdI2bqOjy3c',540,true),
      ('l8320000-0000-4000-8000-000000000008','c8000000-0000-4000-8000-000000000008','s8300000-0000-4000-8000-000000000003','Working with JSON & APIs',2,'hdI2bqOjy3c',600,true),
      ('l8330000-0000-4000-8000-000000000009','c8000000-0000-4000-8000-000000000008','s8300000-0000-4000-8000-000000000003','Testing in Go',3,'hdI2bqOjy3c',480,true),
      -- Course 9: Vue.js
      ('l9110000-0000-4000-8000-000000000001','c9000000-0000-4000-8000-000000000009','s9100000-0000-4000-8000-000000000001','Vue 3 Setup and Template Syntax',1,'bMknfKXIFA8',480,true),
      ('l9120000-0000-4000-8000-000000000002','c9000000-0000-4000-8000-000000000009','s9100000-0000-4000-8000-000000000001','Components and Props',2,'bMknfKXIFA8',540,true),
      ('l9130000-0000-4000-8000-000000000003','c9000000-0000-4000-8000-000000000009','s9100000-0000-4000-8000-000000000001','Event Handling and v-model',3,'bMknfKXIFA8',600,true),
      ('l9210000-0000-4000-8000-000000000004','c9000000-0000-4000-8000-000000000009','s9200000-0000-4000-8000-000000000002','Composition API',1,'bMknfKXIFA8',720,true),
      ('l9220000-0000-4000-8000-000000000005','c9000000-0000-4000-8000-000000000009','s9200000-0000-4000-8000-000000000002','Pinia State Management',2,'bMknfKXIFA8',660,true),
      ('l9230000-0000-4000-8000-000000000006','c9000000-0000-4000-8000-000000000009','s9200000-0000-4000-8000-000000000002','Composables and Reactivity',3,'bMknfKXIFA8',600,true),
      ('l9310000-0000-4000-8000-000000000007','c9000000-0000-4000-8000-000000000009','s9300000-0000-4000-8000-000000000003','Vue Router',1,'bMknfKXIFA8',540,true),
      ('l9320000-0000-4000-8000-000000000008','c9000000-0000-4000-8000-000000000009','s9300000-0000-4000-8000-000000000003','Building a Full Vue App',2,'bMknfKXIFA8',600,true),
      ('l9330000-0000-4000-8000-000000000009','c9000000-0000-4000-8000-000000000009','s9300000-0000-4000-8000-000000000003','Deployment & Optimizations',3,'bMknfKXIFA8',480,true),
      -- Course 10: Node.js & Express
      ('la110000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-00000000000a','sa100000-0000-4000-8000-000000000001','Node.js Fundamentals',1,'PkZNo7MFNFg',480,true),
      ('la120000-0000-4000-8000-000000000002','ca000000-0000-4000-8000-00000000000a','sa100000-0000-4000-8000-000000000001','Modules and npm',2,'PkZNo7MFNFg',540,true),
      ('la130000-0000-4000-8000-000000000003','ca000000-0000-4000-8000-00000000000a','sa100000-0000-4000-8000-000000000001','Async Node.js Patterns',3,'PkZNo7MFNFg',600,true),
      ('la210000-0000-4000-8000-000000000004','ca000000-0000-4000-8000-00000000000a','sa200000-0000-4000-8000-000000000002','Express Setup & Routing',1,'PkZNo7MFNFg',720,true),
      ('la220000-0000-4000-8000-000000000005','ca000000-0000-4000-8000-00000000000a','sa200000-0000-4000-8000-000000000002','Middleware & Error Handling',2,'PkZNo7MFNFg',660,true),
      ('la230000-0000-4000-8000-000000000006','ca000000-0000-4000-8000-00000000000a','sa200000-0000-4000-8000-000000000002','CRUD with a Database',3,'PkZNo7MFNFg',600,true),
      ('la310000-0000-4000-8000-000000000007','ca000000-0000-4000-8000-00000000000a','sa300000-0000-4000-8000-000000000003','JWT Authentication',1,'PkZNo7MFNFg',540,true),
      ('la320000-0000-4000-8000-000000000008','ca000000-0000-4000-8000-00000000000a','sa300000-0000-4000-8000-000000000003','Rate Limiting & Security',2,'PkZNo7MFNFg',600,true),
      ('la330000-0000-4000-8000-000000000009','ca000000-0000-4000-8000-00000000000a','sa300000-0000-4000-8000-000000000003','Deploying to Render',3,'PkZNo7MFNFg',480,true)
    `);

    // Lessons for courses 11-17
    await conn.execute(`
      INSERT IGNORE INTO \`lessons\`
        (\`id\`,\`courseId\`,\`section_id\`,\`title\`,\`order_num\`,\`youtube_url\`,\`duration_seconds\`,\`is_published\`)
      VALUES
      -- Course 11: MERN
      ('lb110000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-00000000000b','sb100000-0000-4000-8000-000000000001','Setting Up the Backend',1,'PkZNo7MFNFg',480,true),
      ('lb120000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-00000000000b','sb100000-0000-4000-8000-000000000001','REST API with Express',2,'PkZNo7MFNFg',540,true),
      ('lb130000-0000-4000-8000-000000000003','cb000000-0000-4000-8000-00000000000b','sb100000-0000-4000-8000-000000000001','Authentication with JWT',3,'PkZNo7MFNFg',600,true),
      ('lb210000-0000-4000-8000-000000000004','cb000000-0000-4000-8000-00000000000b','sb200000-0000-4000-8000-000000000002','React Project Setup',1,'bMknfKXIFA8',720,true),
      ('lb220000-0000-4000-8000-000000000005','cb000000-0000-4000-8000-00000000000b','sb200000-0000-4000-8000-000000000002','Connecting React to API',2,'bMknfKXIFA8',660,true),
      ('lb230000-0000-4000-8000-000000000006','cb000000-0000-4000-8000-00000000000b','sb200000-0000-4000-8000-000000000002','State Management with Redux',3,'bMknfKXIFA8',600,true),
      ('lb310000-0000-4000-8000-000000000007','cb000000-0000-4000-8000-00000000000b','sb300000-0000-4000-8000-000000000003','MongoDB Schema Design',1,'PkZNo7MFNFg',540,true),
      ('lb320000-0000-4000-8000-000000000008','cb000000-0000-4000-8000-00000000000b','sb300000-0000-4000-8000-000000000003','Mongoose Relationships',2,'PkZNo7MFNFg',600,true),
      ('lb330000-0000-4000-8000-000000000009','cb000000-0000-4000-8000-00000000000b','sb300000-0000-4000-8000-000000000003','Deploying MERN App',3,'PkZNo7MFNFg',480,true),
      -- Course 12: CSS & Tailwind
      ('lc110000-0000-4000-8000-000000000001','cc000000-0000-4000-8000-00000000000c','sc100000-0000-4000-8000-000000000001','CSS Box Model & Selectors',1,'w7ejDZ8SWv8',480,true),
      ('lc120000-0000-4000-8000-000000000002','cc000000-0000-4000-8000-00000000000c','sc100000-0000-4000-8000-000000000001','Flexbox Layout',2,'w7ejDZ8SWv8',540,true),
      ('lc130000-0000-4000-8000-000000000003','cc000000-0000-4000-8000-00000000000c','sc100000-0000-4000-8000-000000000001','CSS Grid',3,'w7ejDZ8SWv8',600,true),
      ('lc210000-0000-4000-8000-000000000004','cc000000-0000-4000-8000-00000000000c','sc200000-0000-4000-8000-000000000002','Tailwind Setup & Utility Classes',1,'w7ejDZ8SWv8',720,true),
      ('lc220000-0000-4000-8000-000000000005','cc000000-0000-4000-8000-00000000000c','sc200000-0000-4000-8000-000000000002','Tailwind Components',2,'w7ejDZ8SWv8',660,true),
      ('lc230000-0000-4000-8000-000000000006','cc000000-0000-4000-8000-00000000000c','sc200000-0000-4000-8000-000000000002','Dark Mode & Custom Themes',3,'w7ejDZ8SWv8',600,true),
      ('lc310000-0000-4000-8000-000000000007','cc000000-0000-4000-8000-00000000000c','sc300000-0000-4000-8000-000000000003','Responsive Navbar',1,'w7ejDZ8SWv8',540,true),
      ('lc320000-0000-4000-8000-000000000008','cc000000-0000-4000-8000-00000000000c','sc300000-0000-4000-8000-000000000003','Landing Page Project',2,'w7ejDZ8SWv8',600,true),
      ('lc330000-0000-4000-8000-000000000009','cc000000-0000-4000-8000-00000000000c','sc300000-0000-4000-8000-000000000003','Dashboard UI Project',3,'w7ejDZ8SWv8',480,true),
      -- Course 13: SQL
      ('ld110000-0000-4000-8000-000000000001','cd000000-0000-4000-8000-00000000000d','sd100000-0000-4000-8000-000000000001','SELECT, WHERE & ORDER BY',1,'rfscVS0vtbw',480,true),
      ('ld120000-0000-4000-8000-000000000002','cd000000-0000-4000-8000-00000000000d','sd100000-0000-4000-8000-000000000001','JOINs and Relationships',2,'rfscVS0vtbw',540,true),
      ('ld130000-0000-4000-8000-000000000003','cd000000-0000-4000-8000-00000000000d','sd100000-0000-4000-8000-000000000001','Aggregations & GROUP BY',3,'rfscVS0vtbw',600,true),
      ('ld210000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-00000000000d','sd200000-0000-4000-8000-000000000002','Subqueries and CTEs',1,'rfscVS0vtbw',720,true),
      ('ld220000-0000-4000-8000-000000000005','cd000000-0000-4000-8000-00000000000d','sd200000-0000-4000-8000-000000000002','Window Functions',2,'rfscVS0vtbw',660,true),
      ('ld230000-0000-4000-8000-000000000006','cd000000-0000-4000-8000-00000000000d','sd200000-0000-4000-8000-000000000002','Query Optimization',3,'rfscVS0vtbw',600,true),
      ('ld310000-0000-4000-8000-000000000007','cd000000-0000-4000-8000-00000000000d','sd300000-0000-4000-8000-000000000003','Sales Analysis Project',1,'rfscVS0vtbw',540,true),
      ('ld320000-0000-4000-8000-000000000008','cd000000-0000-4000-8000-00000000000d','sd300000-0000-4000-8000-000000000003','Customer Retention Queries',2,'rfscVS0vtbw',600,true),
      ('ld330000-0000-4000-8000-000000000009','cd000000-0000-4000-8000-00000000000d','sd300000-0000-4000-8000-000000000003','Building a Reporting Dashboard',3,'rfscVS0vtbw',480,true),
      -- Course 14: Statistics
      ('le110000-0000-4000-8000-000000000001','ce000000-0000-4000-8000-00000000000e','se100000-0000-4000-8000-000000000001','Probability Basics',1,'rfscVS0vtbw',480,true),
      ('le120000-0000-4000-8000-000000000002','ce000000-0000-4000-8000-00000000000e','se100000-0000-4000-8000-000000000001','Normal & Other Distributions',2,'rfscVS0vtbw',540,true),
      ('le130000-0000-4000-8000-000000000003','ce000000-0000-4000-8000-00000000000e','se100000-0000-4000-8000-000000000001','Bayes Theorem',3,'rfscVS0vtbw',600,true),
      ('le210000-0000-4000-8000-000000000004','ce000000-0000-4000-8000-00000000000e','se200000-0000-4000-8000-000000000002','Hypothesis Testing',1,'rfscVS0vtbw',720,true),
      ('le220000-0000-4000-8000-000000000005','ce000000-0000-4000-8000-00000000000e','se200000-0000-4000-8000-000000000002','T-Tests and ANOVA',2,'rfscVS0vtbw',660,true),
      ('le230000-0000-4000-8000-000000000006','ce000000-0000-4000-8000-00000000000e','se200000-0000-4000-8000-000000000002','Chi-Square Tests',3,'rfscVS0vtbw',600,true),
      ('le310000-0000-4000-8000-000000000007','ce000000-0000-4000-8000-00000000000e','se300000-0000-4000-8000-000000000003','Linear Regression',1,'rfscVS0vtbw',540,true),
      ('le320000-0000-4000-8000-000000000008','ce000000-0000-4000-8000-00000000000e','se300000-0000-4000-8000-000000000003','Multiple Regression',2,'rfscVS0vtbw',600,true),
      ('le330000-0000-4000-8000-000000000009','ce000000-0000-4000-8000-00000000000e','se300000-0000-4000-8000-000000000003','Logistic Regression',3,'rfscVS0vtbw',480,true),
      -- Course 15: R Programming
      ('lf110000-0000-4000-8000-000000000001','cf000000-0000-4000-8000-00000000000f','sf100000-0000-4000-8000-000000000001','R Setup and Data Types',1,'rfscVS0vtbw',480,true),
      ('lf120000-0000-4000-8000-000000000002','cf000000-0000-4000-8000-00000000000f','sf100000-0000-4000-8000-000000000001','Vectors and Data Frames',2,'rfscVS0vtbw',540,true),
      ('lf130000-0000-4000-8000-000000000003','cf000000-0000-4000-8000-00000000000f','sf100000-0000-4000-8000-000000000001','tidyverse Introduction',3,'rfscVS0vtbw',600,true),
      ('lf210000-0000-4000-8000-000000000004','cf000000-0000-4000-8000-00000000000f','sf200000-0000-4000-8000-000000000002','dplyr for Data Manipulation',1,'rfscVS0vtbw',720,true),
      ('lf220000-0000-4000-8000-000000000005','cf000000-0000-4000-8000-00000000000f','sf200000-0000-4000-8000-000000000002','tidyr for Reshaping Data',2,'rfscVS0vtbw',660,true),
      ('lf230000-0000-4000-8000-000000000006','cf000000-0000-4000-8000-00000000000f','sf200000-0000-4000-8000-000000000002','String Manipulation with stringr',3,'rfscVS0vtbw',600,true),
      ('lf310000-0000-4000-8000-000000000007','cf000000-0000-4000-8000-00000000000f','sf300000-0000-4000-8000-000000000003','ggplot2 Basics',1,'rfscVS0vtbw',540,true),
      ('lf320000-0000-4000-8000-000000000008','cf000000-0000-4000-8000-00000000000f','sf300000-0000-4000-8000-000000000003','Advanced ggplot2 Charts',2,'rfscVS0vtbw',600,true),
      ('lf330000-0000-4000-8000-000000000009','cf000000-0000-4000-8000-00000000000f','sf300000-0000-4000-8000-000000000003','Interactive Plots with Shiny',3,'rfscVS0vtbw',480,true),
      -- Course 16: Machine Learning
      ('lg110000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000010','sg100000-0000-4000-8000-000000000001','What is Machine Learning?',1,'rfscVS0vtbw',480,true),
      ('lg120000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000010','sg100000-0000-4000-8000-000000000001','Data Preprocessing',2,'rfscVS0vtbw',540,true),
      ('lg130000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000010','sg100000-0000-4000-8000-000000000001','Train/Test Split & Cross Validation',3,'rfscVS0vtbw',600,true),
      ('lg210000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000010','sg200000-0000-4000-8000-000000000002','Linear & Logistic Regression',1,'rfscVS0vtbw',720,true),
      ('lg220000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000010','sg200000-0000-4000-8000-000000000002','Decision Trees & Random Forest',2,'rfscVS0vtbw',660,true),
      ('lg230000-0000-4000-8000-000000000006','d0000000-0000-4000-8000-000000000010','sg200000-0000-4000-8000-000000000002','SVM and KNN',3,'rfscVS0vtbw',600,true),
      ('lg310000-0000-4000-8000-000000000007','d0000000-0000-4000-8000-000000000010','sg300000-0000-4000-8000-000000000003','K-Means Clustering',1,'rfscVS0vtbw',540,true),
      ('lg320000-0000-4000-8000-000000000008','d0000000-0000-4000-8000-000000000010','sg300000-0000-4000-8000-000000000003','Hyperparameter Tuning',2,'rfscVS0vtbw',600,true),
      ('lg330000-0000-4000-8000-000000000009','d0000000-0000-4000-8000-000000000010','sg300000-0000-4000-8000-000000000003','Model Evaluation Metrics',3,'rfscVS0vtbw',480,true),
      -- Course 17: Deep Learning
      ('lh110000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000011','sh100000-0000-4000-8000-000000000001','Neurons and Activation Functions',1,'rfscVS0vtbw',480,true),
      ('lh120000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000011','sh100000-0000-4000-8000-000000000001','Building a Neural Network in Keras',2,'rfscVS0vtbw',540,true),
      ('lh130000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000011','sh100000-0000-4000-8000-000000000001','Backpropagation & Optimizers',3,'rfscVS0vtbw',600,true),
      ('lh210000-0000-4000-8000-000000000004','d1000000-0000-4000-8000-000000000011','sh200000-0000-4000-8000-000000000002','CNN Architecture',1,'rfscVS0vtbw',720,true),
      ('lh220000-0000-4000-8000-000000000005','d1000000-0000-4000-8000-000000000011','sh200000-0000-4000-8000-000000000002','Image Classification Project',2,'rfscVS0vtbw',660,true),
      ('lh230000-0000-4000-8000-000000000006','d1000000-0000-4000-8000-000000000011','sh200000-0000-4000-8000-000000000002','Data Augmentation',3,'rfscVS0vtbw',600,true),
      ('lh310000-0000-4000-8000-000000000007','d1000000-0000-4000-8000-000000000011','sh300000-0000-4000-8000-000000000003','LSTM and RNNs',1,'rfscVS0vtbw',540,true),
      ('lh320000-0000-4000-8000-000000000008','d1000000-0000-4000-8000-000000000011','sh300000-0000-4000-8000-000000000003','Transfer Learning with ResNet',2,'rfscVS0vtbw',600,true),
      ('lh330000-0000-4000-8000-000000000009','d1000000-0000-4000-8000-000000000011','sh300000-0000-4000-8000-000000000003','Deploying DL Models',3,'rfscVS0vtbw',480,true)
    `);

    // Lessons for courses 18-26
    await conn.execute(`
      INSERT IGNORE INTO \`lessons\`
        (\`id\`,\`courseId\`,\`section_id\`,\`title\`,\`order_num\`,\`youtube_url\`,\`duration_seconds\`,\`is_published\`)
      VALUES
      -- Course 18: NLP
      ('li110000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000012','si100000-0000-4000-8000-000000000001','Text Preprocessing & Tokenization',1,'rfscVS0vtbw',480,true),
      ('li120000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000012','si100000-0000-4000-8000-000000000001','Bag of Words & TF-IDF',2,'rfscVS0vtbw',540,true),
      ('li130000-0000-4000-8000-000000000003','d2000000-0000-4000-8000-000000000012','si100000-0000-4000-8000-000000000001','Stemming & Lemmatization',3,'rfscVS0vtbw',600,true),
      ('li210000-0000-4000-8000-000000000004','d2000000-0000-4000-8000-000000000012','si200000-0000-4000-8000-000000000002','Word2Vec & GloVe Embeddings',1,'rfscVS0vtbw',720,true),
      ('li220000-0000-4000-8000-000000000005','d2000000-0000-4000-8000-000000000012','si200000-0000-4000-8000-000000000002','Transformer Architecture',2,'rfscVS0vtbw',660,true),
      ('li230000-0000-4000-8000-000000000006','d2000000-0000-4000-8000-000000000012','si200000-0000-4000-8000-000000000002','Fine-Tuning BERT',3,'rfscVS0vtbw',600,true),
      ('li310000-0000-4000-8000-000000000007','d2000000-0000-4000-8000-000000000012','si300000-0000-4000-8000-000000000003','Sentiment Analysis',1,'rfscVS0vtbw',540,true),
      ('li320000-0000-4000-8000-000000000008','d2000000-0000-4000-8000-000000000012','si300000-0000-4000-8000-000000000003','Text Classification',2,'rfscVS0vtbw',600,true),
      ('li330000-0000-4000-8000-000000000009','d2000000-0000-4000-8000-000000000012','si300000-0000-4000-8000-000000000003','Building a Chatbot',3,'rfscVS0vtbw',480,true),
      -- Course 19: Computer Vision
      ('lj110000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000013','sj100000-0000-4000-8000-000000000001','Image Basics with OpenCV',1,'rfscVS0vtbw',480,true),
      ('lj120000-0000-4000-8000-000000000002','d3000000-0000-4000-8000-000000000013','sj100000-0000-4000-8000-000000000001','Edge Detection & Filters',2,'rfscVS0vtbw',540,true),
      ('lj130000-0000-4000-8000-000000000003','d3000000-0000-4000-8000-000000000013','sj100000-0000-4000-8000-000000000001','Image Segmentation',3,'rfscVS0vtbw',600,true),
      ('lj210000-0000-4000-8000-000000000004','d3000000-0000-4000-8000-000000000013','sj200000-0000-4000-8000-000000000002','CNNs for Image Classification',1,'rfscVS0vtbw',720,true),
      ('lj220000-0000-4000-8000-000000000005','d3000000-0000-4000-8000-000000000013','sj200000-0000-4000-8000-000000000002','Transfer Learning for Vision',2,'rfscVS0vtbw',660,true),
      ('lj230000-0000-4000-8000-000000000006','d3000000-0000-4000-8000-000000000013','sj200000-0000-4000-8000-000000000002','Data Augmentation Strategies',3,'rfscVS0vtbw',600,true),
      ('lj310000-0000-4000-8000-000000000007','d3000000-0000-4000-8000-000000000013','sj300000-0000-4000-8000-000000000003','Object Detection with YOLO',1,'rfscVS0vtbw',540,true),
      ('lj320000-0000-4000-8000-000000000008','d3000000-0000-4000-8000-000000000013','sj300000-0000-4000-8000-000000000003','Instance Segmentation',2,'rfscVS0vtbw',600,true),
      ('lj330000-0000-4000-8000-000000000009','d3000000-0000-4000-8000-000000000013','sj300000-0000-4000-8000-000000000003','Deploying a Vision App',3,'rfscVS0vtbw',480,true),
      -- Course 20: Motion Design
      ('lk110000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000014','sk100000-0000-4000-8000-000000000001','AE Interface & Panels',1,'FTFaQWZBqQ8',480,true),
      ('lk120000-0000-4000-8000-000000000002','d4000000-0000-4000-8000-000000000014','sk100000-0000-4000-8000-000000000001','Compositions & Pre-comps',2,'FTFaQWZBqQ8',540,true),
      ('lk130000-0000-4000-8000-000000000003','d4000000-0000-4000-8000-000000000014','sk100000-0000-4000-8000-000000000001','Importing & Organizing Assets',3,'FTFaQWZBqQ8',600,true),
      ('lk210000-0000-4000-8000-000000000004','d4000000-0000-4000-8000-000000000014','sk200000-0000-4000-8000-000000000002','Keyframes & Easing',1,'FTFaQWZBqQ8',720,true),
      ('lk220000-0000-4000-8000-000000000005','d4000000-0000-4000-8000-000000000014','sk200000-0000-4000-8000-000000000002','Shape Layers & Motion Paths',2,'FTFaQWZBqQ8',660,true),
      ('lk230000-0000-4000-8000-000000000006','d4000000-0000-4000-8000-000000000014','sk200000-0000-4000-8000-000000000002','Text Animation',3,'FTFaQWZBqQ8',600,true),
      ('lk310000-0000-4000-8000-000000000007','d4000000-0000-4000-8000-000000000014','sk300000-0000-4000-8000-000000000003','Expressions Basics',1,'FTFaQWZBqQ8',540,true),
      ('lk320000-0000-4000-8000-000000000008','d4000000-0000-4000-8000-000000000014','sk300000-0000-4000-8000-000000000003','Compositing Layers',2,'FTFaQWZBqQ8',600,true),
      ('lk330000-0000-4000-8000-000000000009','d4000000-0000-4000-8000-000000000014','sk300000-0000-4000-8000-000000000003','Rendering & Export',3,'FTFaQWZBqQ8',480,true),
      -- Course 21: Brand Identity
      ('ll110000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000015','sl100000-0000-4000-8000-000000000001','Brand Research & Positioning',1,'FTFaQWZBqQ8',480,true),
      ('ll120000-0000-4000-8000-000000000002','d5000000-0000-4000-8000-000000000015','sl100000-0000-4000-8000-000000000001','Mood Boards & Concepts',2,'FTFaQWZBqQ8',540,true),
      ('ll130000-0000-4000-8000-000000000003','d5000000-0000-4000-8000-000000000015','sl100000-0000-4000-8000-000000000001','Naming & Brand Voice',3,'FTFaQWZBqQ8',600,true),
      ('ll210000-0000-4000-8000-000000000004','d5000000-0000-4000-8000-000000000015','sl200000-0000-4000-8000-000000000002','Logo Design Process',1,'FTFaQWZBqQ8',720,true),
      ('ll220000-0000-4000-8000-000000000005','d5000000-0000-4000-8000-000000000015','sl200000-0000-4000-8000-000000000002','Typography Selection',2,'FTFaQWZBqQ8',660,true),
      ('ll230000-0000-4000-8000-000000000006','d5000000-0000-4000-8000-000000000015','sl200000-0000-4000-8000-000000000002','Colour Palettes',3,'FTFaQWZBqQ8',600,true),
      ('ll310000-0000-4000-8000-000000000007','d5000000-0000-4000-8000-000000000015','sl300000-0000-4000-8000-000000000003','Brand Style Guide',1,'FTFaQWZBqQ8',540,true),
      ('ll320000-0000-4000-8000-000000000008','d5000000-0000-4000-8000-000000000015','sl300000-0000-4000-8000-000000000003','Stationery & Mockups',2,'FTFaQWZBqQ8',600,true),
      ('ll330000-0000-4000-8000-000000000009','d5000000-0000-4000-8000-000000000015','sl300000-0000-4000-8000-000000000003','Presenting to Clients',3,'FTFaQWZBqQ8',480,true),
      -- Course 22: Mobile Design
      ('lm110000-0000-4000-8000-000000000001','d6000000-0000-4000-8000-000000000016','sm100000-0000-4000-8000-000000000001','iOS vs Android Design Systems',1,'FTFaQWZBqQ8',480,true),
      ('lm120000-0000-4000-8000-000000000002','d6000000-0000-4000-8000-000000000016','sm100000-0000-4000-8000-000000000001','Navigation Patterns',2,'FTFaQWZBqQ8',540,true),
      ('lm130000-0000-4000-8000-000000000003','d6000000-0000-4000-8000-000000000016','sm100000-0000-4000-8000-000000000001','Gestures & Touch Targets',3,'FTFaQWZBqQ8',600,true),
      ('lm210000-0000-4000-8000-000000000004','d6000000-0000-4000-8000-000000000016','sm200000-0000-4000-8000-000000000002','Figma Mobile Setup',1,'FTFaQWZBqQ8',720,true),
      ('lm220000-0000-4000-8000-000000000005','d6000000-0000-4000-8000-000000000016','sm200000-0000-4000-8000-000000000002','Auto Layout for Mobile',2,'FTFaQWZBqQ8',660,true),
      ('lm230000-0000-4000-8000-000000000006','d6000000-0000-4000-8000-000000000016','sm200000-0000-4000-8000-000000000002','Designing Onboarding Flows',3,'FTFaQWZBqQ8',600,true),
      ('lm310000-0000-4000-8000-000000000007','d6000000-0000-4000-8000-000000000016','sm300000-0000-4000-8000-000000000003','Interactive Prototype',1,'FTFaQWZBqQ8',540,true),
      ('lm320000-0000-4000-8000-000000000008','d6000000-0000-4000-8000-000000000016','sm300000-0000-4000-8000-000000000003','Dev Handoff with Figma',2,'FTFaQWZBqQ8',600,true),
      ('lm330000-0000-4000-8000-000000000009','d6000000-0000-4000-8000-000000000016','sm300000-0000-4000-8000-000000000003','Accessibility in Mobile Apps',3,'FTFaQWZBqQ8',480,true),
      -- Course 23: AWS
      ('ln110000-0000-4000-8000-000000000001','d7000000-0000-4000-8000-000000000017','sn100000-0000-4000-8000-000000000001','AWS Global Infrastructure',1,'hdI2bqOjy3c',480,true),
      ('ln120000-0000-4000-8000-000000000002','d7000000-0000-4000-8000-000000000017','sn100000-0000-4000-8000-000000000001','EC2 and S3 Basics',2,'hdI2bqOjy3c',540,true),
      ('ln130000-0000-4000-8000-000000000003','d7000000-0000-4000-8000-000000000017','sn100000-0000-4000-8000-000000000001','RDS and DynamoDB',3,'hdI2bqOjy3c',600,true),
      ('ln210000-0000-4000-8000-000000000004','d7000000-0000-4000-8000-000000000017','sn200000-0000-4000-8000-000000000002','IAM Roles & Policies',1,'hdI2bqOjy3c',720,true),
      ('ln220000-0000-4000-8000-000000000005','d7000000-0000-4000-8000-000000000017','sn200000-0000-4000-8000-000000000002','VPC & Security Groups',2,'hdI2bqOjy3c',660,true),
      ('ln230000-0000-4000-8000-000000000006','d7000000-0000-4000-8000-000000000017','sn200000-0000-4000-8000-000000000002','CloudWatch & Monitoring',3,'hdI2bqOjy3c',600,true),
      ('ln310000-0000-4000-8000-000000000007','d7000000-0000-4000-8000-000000000017','sn300000-0000-4000-8000-000000000003','AWS Pricing Calculator',1,'hdI2bqOjy3c',540,true),
      ('ln320000-0000-4000-8000-000000000008','d7000000-0000-4000-8000-000000000017','sn300000-0000-4000-8000-000000000003','CLF-C02 Exam Tips',2,'hdI2bqOjy3c',600,true),
      ('ln330000-0000-4000-8000-000000000009','d7000000-0000-4000-8000-000000000017','sn300000-0000-4000-8000-000000000003','Practice Questions',3,'hdI2bqOjy3c',480,true),
      -- Course 24: Azure
      ('lo110000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000018','so100000-0000-4000-8000-000000000001','Azure Architecture Concepts',1,'hdI2bqOjy3c',480,true),
      ('lo120000-0000-4000-8000-000000000002','d8000000-0000-4000-8000-000000000018','so100000-0000-4000-8000-000000000001','Azure Portal & CLI',2,'hdI2bqOjy3c',540,true),
      ('lo130000-0000-4000-8000-000000000003','d8000000-0000-4000-8000-000000000018','so100000-0000-4000-8000-000000000001','Resource Groups & Subscriptions',3,'hdI2bqOjy3c',600,true),
      ('lo210000-0000-4000-8000-000000000004','d8000000-0000-4000-8000-000000000018','so200000-0000-4000-8000-000000000002','Azure VMs & App Service',1,'hdI2bqOjy3c',720,true),
      ('lo220000-0000-4000-8000-000000000005','d8000000-0000-4000-8000-000000000018','so200000-0000-4000-8000-000000000002','Azure Storage & Databases',2,'hdI2bqOjy3c',660,true),
      ('lo230000-0000-4000-8000-000000000006','d8000000-0000-4000-8000-000000000018','so200000-0000-4000-8000-000000000002','Azure Active Directory',3,'hdI2bqOjy3c',600,true),
      ('lo310000-0000-4000-8000-000000000007','d8000000-0000-4000-8000-000000000018','so300000-0000-4000-8000-000000000003','AZ-900 Domain Breakdown',1,'hdI2bqOjy3c',540,true),
      ('lo320000-0000-4000-8000-000000000008','d8000000-0000-4000-8000-000000000018','so300000-0000-4000-8000-000000000003','Mock Exam Walkthrough',2,'hdI2bqOjy3c',600,true),
      ('lo330000-0000-4000-8000-000000000009','d8000000-0000-4000-8000-000000000018','so300000-0000-4000-8000-000000000003','Exam Day Strategies',3,'hdI2bqOjy3c',480,true),
      -- Course 25: Google Cloud
      ('lp110000-0000-4000-8000-000000000001','d9000000-0000-4000-8000-000000000019','sp100000-0000-4000-8000-000000000001','GCP Console & gcloud CLI',1,'hdI2bqOjy3c',480,true),
      ('lp120000-0000-4000-8000-000000000002','d9000000-0000-4000-8000-000000000019','sp100000-0000-4000-8000-000000000001','Compute Engine & Cloud Storage',2,'hdI2bqOjy3c',540,true),
      ('lp130000-0000-4000-8000-000000000003','d9000000-0000-4000-8000-000000000019','sp100000-0000-4000-8000-000000000001','Cloud Networking & VPC',3,'hdI2bqOjy3c',600,true),
      ('lp210000-0000-4000-8000-000000000004','d9000000-0000-4000-8000-000000000019','sp200000-0000-4000-8000-000000000002','GKE Clusters',1,'hdI2bqOjy3c',720,true),
      ('lp220000-0000-4000-8000-000000000005','d9000000-0000-4000-8000-000000000019','sp200000-0000-4000-8000-000000000002','Cloud Run Serverless',2,'hdI2bqOjy3c',660,true),
      ('lp230000-0000-4000-8000-000000000006','d9000000-0000-4000-8000-000000000019','sp200000-0000-4000-8000-000000000002','Cloud IAM & Security',3,'hdI2bqOjy3c',600,true),
      ('lp310000-0000-4000-8000-000000000007','d9000000-0000-4000-8000-000000000019','sp300000-0000-4000-8000-000000000003','BigQuery for Analytics',1,'hdI2bqOjy3c',540,true),
      ('lp320000-0000-4000-8000-000000000008','d9000000-0000-4000-8000-000000000019','sp300000-0000-4000-8000-000000000003','Associate Engineer Exam Prep',2,'hdI2bqOjy3c',600,true),
      ('lp330000-0000-4000-8000-000000000009','d9000000-0000-4000-8000-000000000019','sp300000-0000-4000-8000-000000000003','Practice Labs',3,'hdI2bqOjy3c',480,true),
      -- Course 26: Cloud Architecture
      ('lq110000-0000-4000-8000-000000000001','da000000-0000-4000-8000-00000000001a','sq100000-0000-4000-8000-000000000001','Well-Architected Framework',1,'hdI2bqOjy3c',480,true),
      ('lq120000-0000-4000-8000-000000000002','da000000-0000-4000-8000-00000000001a','sq100000-0000-4000-8000-000000000001','12-Factor App Principles',2,'hdI2bqOjy3c',540,true),
      ('lq130000-0000-4000-8000-000000000003','da000000-0000-4000-8000-00000000001a','sq100000-0000-4000-8000-000000000001','Service Mesh & API Gateways',3,'hdI2bqOjy3c',600,true),
      ('lq210000-0000-4000-8000-000000000004','da000000-0000-4000-8000-00000000001a','sq200000-0000-4000-8000-000000000002','Microservices Design',1,'hdI2bqOjy3c',720,true),
      ('lq220000-0000-4000-8000-000000000005','da000000-0000-4000-8000-00000000001a','sq200000-0000-4000-8000-000000000002','Serverless Architecture',2,'hdI2bqOjy3c',660,true),
      ('lq230000-0000-4000-8000-000000000006','da000000-0000-4000-8000-00000000001a','sq200000-0000-4000-8000-000000000002','Event-Driven Architecture',3,'hdI2bqOjy3c',600,true),
      ('lq310000-0000-4000-8000-000000000007','da000000-0000-4000-8000-00000000001a','sq300000-0000-4000-8000-000000000003','Multi-Cloud Strategies',1,'hdI2bqOjy3c',540,true),
      ('lq320000-0000-4000-8000-000000000008','da000000-0000-4000-8000-00000000001a','sq300000-0000-4000-8000-000000000003','Disaster Recovery Planning',2,'hdI2bqOjy3c',600,true),
      ('lq330000-0000-4000-8000-000000000009','da000000-0000-4000-8000-00000000001a','sq300000-0000-4000-8000-000000000003','Cost Optimization Patterns',3,'hdI2bqOjy3c',480,true)
    `);

    // Lessons for courses 27-34
    await conn.execute(`
      INSERT IGNORE INTO \`lessons\`
        (\`id\`,\`courseId\`,\`section_id\`,\`title\`,\`order_num\`,\`youtube_url\`,\`duration_seconds\`,\`is_published\`)
      VALUES
      -- Course 27: Ethical Hacking
      ('lr110000-0000-4000-8000-000000000001','db000000-0000-4000-8000-00000000001b','sr100000-0000-4000-8000-000000000001','Hacker Mindset & Ethics',1,'hdI2bqOjy3c',480,true),
      ('lr120000-0000-4000-8000-000000000002','db000000-0000-4000-8000-00000000001b','sr100000-0000-4000-8000-000000000001','Passive Reconnaissance',2,'hdI2bqOjy3c',540,true),
      ('lr130000-0000-4000-8000-000000000003','db000000-0000-4000-8000-00000000001b','sr100000-0000-4000-8000-000000000001','Active Scanning with Nmap',3,'hdI2bqOjy3c',600,true),
      ('lr210000-0000-4000-8000-000000000004','db000000-0000-4000-8000-00000000001b','sr200000-0000-4000-8000-000000000002','Metasploit Basics',1,'hdI2bqOjy3c',720,true),
      ('lr220000-0000-4000-8000-000000000005','db000000-0000-4000-8000-00000000001b','sr200000-0000-4000-8000-000000000002','Exploiting Vulnerabilities',2,'hdI2bqOjy3c',660,true),
      ('lr230000-0000-4000-8000-000000000006','db000000-0000-4000-8000-00000000001b','sr200000-0000-4000-8000-000000000002','Password Attacks',3,'hdI2bqOjy3c',600,true),
      ('lr310000-0000-4000-8000-000000000007','db000000-0000-4000-8000-00000000001b','sr300000-0000-4000-8000-000000000003','Privilege Escalation',1,'hdI2bqOjy3c',540,true),
      ('lr320000-0000-4000-8000-000000000008','db000000-0000-4000-8000-00000000001b','sr300000-0000-4000-8000-000000000003','Covering Tracks',2,'hdI2bqOjy3c',600,true),
      ('lr330000-0000-4000-8000-000000000009','db000000-0000-4000-8000-00000000001b','sr300000-0000-4000-8000-000000000003','Writing Pentest Reports',3,'hdI2bqOjy3c',480,true),
      -- Course 28: Network Security
      ('ls110000-0000-4000-8000-000000000001','dc000000-0000-4000-8000-00000000001c','ss100000-0000-4000-8000-000000000001','TCP/IP & OSI Model',1,'hdI2bqOjy3c',480,true),
      ('ls120000-0000-4000-8000-000000000002','dc000000-0000-4000-8000-00000000001c','ss100000-0000-4000-8000-000000000001','Common Network Attacks',2,'hdI2bqOjy3c',540,true),
      ('ls130000-0000-4000-8000-000000000003','dc000000-0000-4000-8000-00000000001c','ss100000-0000-4000-8000-000000000001','Wireshark Packet Analysis',3,'hdI2bqOjy3c',600,true),
      ('ls210000-0000-4000-8000-000000000004','dc000000-0000-4000-8000-00000000001c','ss200000-0000-4000-8000-000000000002','Firewall Configuration',1,'hdI2bqOjy3c',720,true),
      ('ls220000-0000-4000-8000-000000000005','dc000000-0000-4000-8000-00000000001c','ss200000-0000-4000-8000-000000000002','VPN Setup & Protocols',2,'hdI2bqOjy3c',660,true),
      ('ls230000-0000-4000-8000-000000000006','dc000000-0000-4000-8000-00000000001c','ss200000-0000-4000-8000-000000000002','Zero Trust Network Architecture',3,'hdI2bqOjy3c',600,true),
      ('ls310000-0000-4000-8000-000000000007','dc000000-0000-4000-8000-00000000001c','ss300000-0000-4000-8000-000000000003','Snort IDS/IPS',1,'hdI2bqOjy3c',540,true),
      ('ls320000-0000-4000-8000-000000000008','dc000000-0000-4000-8000-00000000001c','ss300000-0000-4000-8000-000000000003','SIEM & Log Analysis',2,'hdI2bqOjy3c',600,true),
      ('ls330000-0000-4000-8000-000000000009','dc000000-0000-4000-8000-00000000001c','ss300000-0000-4000-8000-000000000003','Incident Response',3,'hdI2bqOjy3c',480,true),
      -- Course 29: OWASP
      ('lt110000-0000-4000-8000-000000000001','dd000000-0000-4000-8000-00000000001d','st100000-0000-4000-8000-000000000001','OWASP Top 10 Overview',1,'hdI2bqOjy3c',480,true),
      ('lt120000-0000-4000-8000-000000000002','dd000000-0000-4000-8000-00000000001d','st100000-0000-4000-8000-000000000001','SQL Injection & Prevention',2,'hdI2bqOjy3c',540,true),
      ('lt130000-0000-4000-8000-000000000003','dd000000-0000-4000-8000-00000000001d','st100000-0000-4000-8000-000000000001','XSS & CSRF',3,'hdI2bqOjy3c',600,true),
      ('lt210000-0000-4000-8000-000000000004','dd000000-0000-4000-8000-00000000001d','st200000-0000-4000-8000-000000000002','Broken Authentication',1,'hdI2bqOjy3c',720,true),
      ('lt220000-0000-4000-8000-000000000005','dd000000-0000-4000-8000-00000000001d','st200000-0000-4000-8000-000000000002','Insecure Direct Object References',2,'hdI2bqOjy3c',660,true),
      ('lt230000-0000-4000-8000-000000000006','dd000000-0000-4000-8000-00000000001d','st200000-0000-4000-8000-000000000002','Security Misconfiguration',3,'hdI2bqOjy3c',600,true),
      ('lt310000-0000-4000-8000-000000000007','dd000000-0000-4000-8000-00000000001d','st300000-0000-4000-8000-000000000003','Input Validation Best Practices',1,'hdI2bqOjy3c',540,true),
      ('lt320000-0000-4000-8000-000000000008','dd000000-0000-4000-8000-00000000001d','st300000-0000-4000-8000-000000000003','Secure Headers & CSP',2,'hdI2bqOjy3c',600,true),
      ('lt330000-0000-4000-8000-000000000009','dd000000-0000-4000-8000-00000000001d','st300000-0000-4000-8000-000000000003','Security Code Review',3,'hdI2bqOjy3c',480,true),
      -- Course 30: Penetration Testing
      ('lu110000-0000-4000-8000-000000000001','de000000-0000-4000-8000-00000000001e','su100000-0000-4000-8000-000000000001','Kali Linux Installation',1,'hdI2bqOjy3c',480,true),
      ('lu120000-0000-4000-8000-000000000002','de000000-0000-4000-8000-00000000001e','su100000-0000-4000-8000-000000000001','Essential Kali Tools',2,'hdI2bqOjy3c',540,true),
      ('lu130000-0000-4000-8000-000000000003','de000000-0000-4000-8000-00000000001e','su100000-0000-4000-8000-000000000001','Setting Up a Lab Environment',3,'hdI2bqOjy3c',600,true),
      ('lu210000-0000-4000-8000-000000000004','de000000-0000-4000-8000-00000000001e','su200000-0000-4000-8000-000000000002','Network Scanning & Enumeration',1,'hdI2bqOjy3c',720,true),
      ('lu220000-0000-4000-8000-000000000005','de000000-0000-4000-8000-00000000001e','su200000-0000-4000-8000-000000000002','Vulnerability Assessment',2,'hdI2bqOjy3c',660,true),
      ('lu230000-0000-4000-8000-000000000006','de000000-0000-4000-8000-00000000001e','su200000-0000-4000-8000-000000000002','Web App Scanning with Burp',3,'hdI2bqOjy3c',600,true),
      ('lu310000-0000-4000-8000-000000000007','de000000-0000-4000-8000-00000000001e','su300000-0000-4000-8000-000000000003','Buffer Overflow Basics',1,'hdI2bqOjy3c',540,true),
      ('lu320000-0000-4000-8000-000000000008','de000000-0000-4000-8000-00000000001e','su300000-0000-4000-8000-000000000003','Post-Exploitation Techniques',2,'hdI2bqOjy3c',600,true),
      ('lu330000-0000-4000-8000-000000000009','de000000-0000-4000-8000-00000000001e','su300000-0000-4000-8000-000000000003','Professional Report Writing',3,'hdI2bqOjy3c',480,true),
      -- Course 31: Docker & Kubernetes
      ('lv110000-0000-4000-8000-000000000001','df000000-0000-4000-8000-00000000001f','sv100000-0000-4000-8000-000000000001','Docker Images & Containers',1,'PkZNo7MFNFg',480,true),
      ('lv120000-0000-4000-8000-000000000002','df000000-0000-4000-8000-00000000001f','sv100000-0000-4000-8000-000000000001','Dockerfile Best Practices',2,'PkZNo7MFNFg',540,true),
      ('lv130000-0000-4000-8000-000000000003','df000000-0000-4000-8000-00000000001f','sv100000-0000-4000-8000-000000000001','Docker Compose',3,'PkZNo7MFNFg',600,true),
      ('lv210000-0000-4000-8000-000000000004','df000000-0000-4000-8000-00000000001f','sv200000-0000-4000-8000-000000000002','Kubernetes Architecture',1,'PkZNo7MFNFg',720,true),
      ('lv220000-0000-4000-8000-000000000005','df000000-0000-4000-8000-00000000001f','sv200000-0000-4000-8000-000000000002','Pods, Deployments & Services',2,'PkZNo7MFNFg',660,true),
      ('lv230000-0000-4000-8000-000000000006','df000000-0000-4000-8000-00000000001f','sv200000-0000-4000-8000-000000000002','ConfigMaps & Secrets',3,'PkZNo7MFNFg',600,true),
      ('lv310000-0000-4000-8000-000000000007','df000000-0000-4000-8000-00000000001f','sv300000-0000-4000-8000-000000000003','Helm Charts',1,'PkZNo7MFNFg',540,true),
      ('lv320000-0000-4000-8000-000000000008','df000000-0000-4000-8000-00000000001f','sv300000-0000-4000-8000-000000000003','Autoscaling & Rolling Updates',2,'PkZNo7MFNFg',600,true),
      ('lv330000-0000-4000-8000-000000000009','df000000-0000-4000-8000-00000000001f','sv300000-0000-4000-8000-000000000003','Production Kubernetes on EKS',3,'PkZNo7MFNFg',480,true),
      -- Course 32: CI/CD
      ('lw110000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000020','sw100000-0000-4000-8000-000000000001','GitHub Actions Syntax',1,'PkZNo7MFNFg',480,true),
      ('lw120000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000020','sw100000-0000-4000-8000-000000000001','Triggers and Events',2,'PkZNo7MFNFg',540,true),
      ('lw130000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000020','sw100000-0000-4000-8000-000000000001','Secrets & Environment Variables',3,'PkZNo7MFNFg',600,true),
      ('lw210000-0000-4000-8000-000000000004','e0000000-0000-4000-8000-000000000020','sw200000-0000-4000-8000-000000000002','Automated Testing in CI',1,'PkZNo7MFNFg',720,true),
      ('lw220000-0000-4000-8000-000000000005','e0000000-0000-4000-8000-000000000020','sw200000-0000-4000-8000-000000000002','Linting & Code Quality Gates',2,'PkZNo7MFNFg',660,true),
      ('lw230000-0000-4000-8000-000000000006','e0000000-0000-4000-8000-000000000020','sw200000-0000-4000-8000-000000000002','Matrix Builds & Caching',3,'PkZNo7MFNFg',600,true),
      ('lw310000-0000-4000-8000-000000000007','e0000000-0000-4000-8000-000000000020','sw300000-0000-4000-8000-000000000003','Deploy to AWS with Actions',1,'PkZNo7MFNFg',540,true),
      ('lw320000-0000-4000-8000-000000000008','e0000000-0000-4000-8000-000000000020','sw300000-0000-4000-8000-000000000003','Deploy Docker to Kubernetes',2,'PkZNo7MFNFg',600,true),
      ('lw330000-0000-4000-8000-000000000009','e0000000-0000-4000-8000-000000000020','sw300000-0000-4000-8000-000000000003','Advanced Pipeline Patterns',3,'PkZNo7MFNFg',480,true),
      -- Course 33: Terraform
      ('lx110000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000021','sx100000-0000-4000-8000-000000000001','HCL Syntax & Providers',1,'PkZNo7MFNFg',480,true),
      ('lx120000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000021','sx100000-0000-4000-8000-000000000001','Resources & Data Sources',2,'PkZNo7MFNFg',540,true),
      ('lx130000-0000-4000-8000-000000000003','e1000000-0000-4000-8000-000000000021','sx100000-0000-4000-8000-000000000001','Variables & Outputs',3,'PkZNo7MFNFg',600,true),
      ('lx210000-0000-4000-8000-000000000004','e1000000-0000-4000-8000-000000000021','sx200000-0000-4000-8000-000000000002','Terraform Modules',1,'PkZNo7MFNFg',720,true),
      ('lx220000-0000-4000-8000-000000000005','e1000000-0000-4000-8000-000000000021','sx200000-0000-4000-8000-000000000002','Remote State & Backends',2,'PkZNo7MFNFg',660,true),
      ('lx230000-0000-4000-8000-000000000006','e1000000-0000-4000-8000-000000000021','sx200000-0000-4000-8000-000000000002','Workspaces & Environments',3,'PkZNo7MFNFg',600,true),
      ('lx310000-0000-4000-8000-000000000007','e1000000-0000-4000-8000-000000000021','sx300000-0000-4000-8000-000000000003','Provisioning AWS with Terraform',1,'PkZNo7MFNFg',540,true),
      ('lx320000-0000-4000-8000-000000000008','e1000000-0000-4000-8000-000000000021','sx300000-0000-4000-8000-000000000003','Provisioning Azure with Terraform',2,'PkZNo7MFNFg',600,true),
      ('lx330000-0000-4000-8000-000000000009','e1000000-0000-4000-8000-000000000021','sx300000-0000-4000-8000-000000000003','Terraform in CI/CD Pipelines',3,'PkZNo7MFNFg',480,true),
      -- Course 34: Linux for DevOps
      ('ly110000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000022','sy100000-0000-4000-8000-000000000001','Linux File System & Navigation',1,'PkZNo7MFNFg',480,true),
      ('ly120000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000022','sy100000-0000-4000-8000-000000000001','Users, Groups & Permissions',2,'PkZNo7MFNFg',540,true),
      ('ly130000-0000-4000-8000-000000000003','e2000000-0000-4000-8000-000000000022','sy100000-0000-4000-8000-000000000001','Package Management',3,'PkZNo7MFNFg',600,true),
      ('ly210000-0000-4000-8000-000000000004','e2000000-0000-4000-8000-000000000022','sy200000-0000-4000-8000-000000000002','Bash Scripting Basics',1,'PkZNo7MFNFg',720,true),
      ('ly220000-0000-4000-8000-000000000005','e2000000-0000-4000-8000-000000000022','sy200000-0000-4000-8000-000000000002','Cron Jobs & Automation',2,'PkZNo7MFNFg',660,true),
      ('ly230000-0000-4000-8000-000000000006','e2000000-0000-4000-8000-000000000022','sy200000-0000-4000-8000-000000000002','sed, awk & Text Processing',3,'PkZNo7MFNFg',600,true),
      ('ly310000-0000-4000-8000-000000000007','e2000000-0000-4000-8000-000000000022','sy300000-0000-4000-8000-000000000001','Process Management & systemd',1,'PkZNo7MFNFg',540,true),
      ('ly320000-0000-4000-8000-000000000008','e2000000-0000-4000-8000-000000000022','sy300000-0000-4000-8000-000000000002','Networking & SSH',2,'PkZNo7MFNFg',600,true),
      ('ly330000-0000-4000-8000-000000000009','e2000000-0000-4000-8000-000000000022','sy300000-0000-4000-8000-000000000003','Linux Security Hardening',3,'PkZNo7MFNFg',480,true)
    `);

    // ── Seed demo users (1 demo + 8 reviewers) ─────────────────────────────
    const demoHash = await hashPassword('Demo@123');
    await conn.execute(`
      INSERT IGNORE INTO \`kod_users\` (\`id\`,\`uid\`,\`username\`,\`email\`,\`password\`,\`phone\`,\`role\`,\`balance\`,\`createdAt\`,\`updatedAt\`) VALUES
      ('demouser0-0000-4000-8000-000000000001','demo_user','DemoUser','demo@kodlearn.com',?,'9876543210','Customer',100000.00,NOW(),NOW()),
      ('reviewer1-0000-4000-8000-000000000001','arjun_dev','ArjunDev','arjun.dev@mail.com',?,'9000000001','Customer',100000.00,NOW(),NOW()),
      ('reviewer2-0000-4000-8000-000000000002','priya_ds','PriyaDS','priya.ds@mail.com',?,'9000000002','Customer',100000.00,NOW(),NOW()),
      ('reviewer3-0000-4000-8000-000000000003','rahul_ml','RahulML','rahul.ml@mail.com',?,'9000000003','Customer',100000.00,NOW(),NOW()),
      ('reviewer4-0000-4000-8000-000000000004','sneha_ui','SnehaUI','sneha.ui@mail.com',?,'9000000004','Customer',100000.00,NOW(),NOW()),
      ('reviewer5-0000-4000-8000-000000000005','kiran_ops','KiranOps','kiran.ops@mail.com',?,'9000000005','Customer',100000.00,NOW(),NOW()),
      ('reviewer6-0000-4000-8000-000000000006','meera_web','MeeraWeb','meera.web@mail.com',?,'9000000006','Customer',100000.00,NOW(),NOW()),
      ('reviewer7-0000-4000-8000-000000000007','deepak_sec','DeepakSec','deepak.sec@mail.com',?,'9000000007','Customer',100000.00,NOW(),NOW()),
      ('reviewer8-0000-4000-8000-000000000008','ananya_ai','AnanyaAI','ananya.ai@mail.com',?,'9000000008','Customer',100000.00,NOW(),NOW())
    `, Array(9).fill(demoHash));

    // ── Seed 136 course reviews (4 per course, avg 4.5) ────────────────────
    // Courses 1-4: reviewers 1,2,3,4
    await conn.execute(`
      INSERT IGNORE INTO \`course_reviews\` (\`id\`,\`userId\`,\`courseId\`,\`rating\`,\`comment\`,\`createdAt\`) VALUES
      ('rv01r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','c1000000-0000-0000-0000-000000000001',5,'Excellent course! The explanations are crystal clear and the projects are super practical.',NOW()),
      ('rv01r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','c1000000-0000-0000-0000-000000000001',4,'Great content and well structured. I finally understand async/await properly.',NOW()),
      ('rv01r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','c1000000-0000-0000-0000-000000000001',5,'Best JavaScript course I have taken. Covers everything from basics to modern ES6+.',NOW()),
      ('rv01r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','c1000000-0000-0000-0000-000000000001',4,'Really solid course. The DOM section was especially helpful for my projects.',NOW()),
      ('rv02r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','c1000000-0000-0000-0000-000000000002',5,'Next.js is covered in depth. Server components finally make sense after this course!',NOW()),
      ('rv02r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','c1000000-0000-0000-0000-000000000002',4,'Great React coverage. Went from confused to confident in hooks.',NOW()),
      ('rv02r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','c1000000-0000-0000-0000-000000000002',5,'Production-ready knowledge. Deployed my first Next.js app thanks to this.',NOW()),
      ('rv02r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','c1000000-0000-0000-0000-000000000002',4,'Thorough and well-paced. The full-stack project at the end is excellent.',NOW()),
      ('rv03r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','c1000000-0000-0000-0000-000000000003',5,'Perfect introduction to Python for data science. Pandas and NumPy explained brilliantly.',NOW()),
      ('rv03r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','c1000000-0000-0000-0000-000000000003',4,'Great hands-on approach. Built real data pipelines by the end.',NOW()),
      ('rv03r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','c1000000-0000-0000-0000-000000000003',5,'Excellent visualizations section. Matplotlib and Seaborn demystified.',NOW()),
      ('rv03r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','c1000000-0000-0000-0000-000000000003',4,'Good pacing and clear explanations. Data cleaning techniques are very practical.',NOW()),
      ('rv04r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','c1000000-0000-0000-0000-000000000004',5,'Transformed how I think about design. The Figma section alone is worth it.',NOW()),
      ('rv04r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','c1000000-0000-0000-0000-000000000004',4,'Great balance between theory and practical design work.',NOW()),
      ('rv04r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','c1000000-0000-0000-0000-000000000004',5,'Learned more in this course than in months of trial and error.',NOW()),
      ('rv04r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','c1000000-0000-0000-0000-000000000004',4,'Prototyping section is outstanding. Great for anyone entering UX design.',NOW())
    `);

    // Courses 5-9: reviewers 5,6,7,8
    await conn.execute(`
      INSERT IGNORE INTO \`course_reviews\` (\`id\`,\`userId\`,\`courseId\`,\`rating\`,\`comment\`,\`createdAt\`) VALUES
      ('rv05r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','c5000000-0000-4000-8000-000000000005',5,'Perfect starting point for Python. Clear and concise lessons.',NOW()),
      ('rv05r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','c5000000-0000-4000-8000-000000000005',4,'Great OOP section. Decorators and generators explained very well.',NOW()),
      ('rv05r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','c5000000-0000-4000-8000-000000000005',5,'Highly recommend for beginners. Built solid Python foundations.',NOW()),
      ('rv05r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','c5000000-0000-4000-8000-000000000005',4,'Good projects and real-world examples throughout.',NOW()),
      ('rv06r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','c6000000-0000-4000-8000-000000000006',5,'Java explained from scratch very effectively. Love the collections coverage.',NOW()),
      ('rv06r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','c6000000-0000-4000-8000-000000000006',4,'OOP concepts finally clicked for me with this course.',NOW()),
      ('rv06r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','c6000000-0000-4000-8000-000000000006',5,'Excellent Java course. Streams and lambdas section is top notch.',NOW()),
      ('rv06r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','c6000000-0000-4000-8000-000000000006',4,'Good depth for beginners. Exception handling covered thoroughly.',NOW()),
      ('rv07r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','c7000000-0000-4000-8000-000000000007',5,'Best TypeScript course available. Generics finally make sense!',NOW()),
      ('rv07r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','c7000000-0000-4000-8000-000000000007',4,'Great advanced types section. Improved my codebase quality significantly.',NOW()),
      ('rv07r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','c7000000-0000-4000-8000-000000000007',5,'TypeScript with React section is exactly what I needed.',NOW()),
      ('rv07r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','c7000000-0000-4000-8000-000000000007',4,'Solid course. tsconfig coverage is very practical.',NOW()),
      ('rv08r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','c8000000-0000-4000-8000-000000000008',5,'Go concurrency explained brilliantly. Goroutines are no longer scary.',NOW()),
      ('rv08r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','c8000000-0000-4000-8000-000000000008',4,'Great web services section. Built a production API by the end.',NOW()),
      ('rv08r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','c8000000-0000-4000-8000-000000000008',5,'Best Go course for beginners. Clear and well-paced.',NOW()),
      ('rv08r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','c8000000-0000-4000-8000-000000000008',4,'Really enjoyed the testing in Go section. Very practical.',NOW()),
      ('rv09r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','c9000000-0000-4000-8000-000000000009',5,'Vue 3 Composition API explained perfectly. Great course overall.',NOW()),
      ('rv09r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','c9000000-0000-4000-8000-000000000009',4,'Pinia state management section was very clear and helpful.',NOW()),
      ('rv09r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','c9000000-0000-4000-8000-000000000009',5,'Best Vue 3 resource I have found. Router and deployment covered well.',NOW()),
      ('rv09r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','c9000000-0000-4000-8000-000000000009',4,'Great composables section. Really helped with code reuse patterns.',NOW())
    `);

    // Courses 10-17: reviewers 1,2,3,4
    await conn.execute(`
      INSERT IGNORE INTO \`course_reviews\` (\`id\`,\`userId\`,\`courseId\`,\`rating\`,\`comment\`,\`createdAt\`) VALUES
      ('rv0ar1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','ca000000-0000-4000-8000-00000000000a',5,'Node.js fundamentals explained in depth. JWT auth section is excellent.',NOW()),
      ('rv0ar2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','ca000000-0000-4000-8000-00000000000a',4,'Great REST API coverage. Middleware patterns very well explained.',NOW()),
      ('rv0ar3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','ca000000-0000-4000-8000-00000000000a',5,'Built a full backend API by end of course. Very practical approach.',NOW()),
      ('rv0ar4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','ca000000-0000-4000-8000-00000000000a',4,'Solid Node.js course. Deployment to Render section saves so much time.',NOW()),
      ('rv0br1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','cb000000-0000-4000-8000-00000000000b',5,'Complete MERN stack from scratch. Best full-stack course on the platform.',NOW()),
      ('rv0br2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','cb000000-0000-4000-8000-00000000000b',4,'MongoDB schema design section is very detailed and practical.',NOW()),
      ('rv0br3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','cb000000-0000-4000-8000-00000000000b',5,'Redux integration with React explained step by step. Great course.',NOW()),
      ('rv0br4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','cb000000-0000-4000-8000-00000000000b',4,'Deployed a real MERN app to production. Excellent learning experience.',NOW()),
      ('rv0cr1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','cc000000-0000-4000-8000-00000000000c',5,'Tailwind mastery achieved! Dark mode and custom themes section is amazing.',NOW()),
      ('rv0cr2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','cc000000-0000-4000-8000-00000000000c',4,'CSS Grid and Flexbox finally demystified. Great practical projects.',NOW()),
      ('rv0cr3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','cc000000-0000-4000-8000-00000000000c',5,'Landing page project is portfolio-worthy. Excellent course.',NOW()),
      ('rv0cr4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','cc000000-0000-4000-8000-00000000000c',4,'Responsive design coverage is thorough. Very useful for frontend work.',NOW()),
      ('rv0dr1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','cd000000-0000-4000-8000-00000000000d',5,'Window functions finally make sense after this course. Excellent SQL!',NOW()),
      ('rv0dr2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','cd000000-0000-4000-8000-00000000000d',4,'Great analytics project. Sales analysis query section is very useful.',NOW()),
      ('rv0dr3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','cd000000-0000-4000-8000-00000000000d',5,'Best SQL course for data analysts. CTEs explained brilliantly.',NOW()),
      ('rv0dr4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','cd000000-0000-4000-8000-00000000000d',4,'Query optimization section alone is worth the course. Very practical.',NOW()),
      ('rv0er1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','ce000000-0000-4000-8000-00000000000e',5,'Statistics foundation I always wanted. Hypothesis testing explained clearly.',NOW()),
      ('rv0er2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','ce000000-0000-4000-8000-00000000000e',4,'Regression section is excellent. Great for aspiring data scientists.',NOW()),
      ('rv0er3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','ce000000-0000-4000-8000-00000000000e',5,'Bayes Theorem finally clicked. Very well explained throughout.',NOW()),
      ('rv0er4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','ce000000-0000-4000-8000-00000000000e',4,'ANOVA and T-tests demystified. Great practical examples used.',NOW()),
      ('rv0fr1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','cf000000-0000-4000-8000-00000000000f',5,'tidyverse is magic and this course teaches it perfectly.',NOW()),
      ('rv0fr2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','cf000000-0000-4000-8000-00000000000f',4,'ggplot2 visualizations section is stunning. Great course.',NOW()),
      ('rv0fr3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','cf000000-0000-4000-8000-00000000000f',5,'Shiny app at the end is a great capstone. Very well structured.',NOW()),
      ('rv0fr4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','cf000000-0000-4000-8000-00000000000f',4,'dplyr and tidyr section is excellent for data wrangling tasks.',NOW()),
      ('rv10r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000010',5,'ML fundamentals explained without overwhelming math. Perfect balance.',NOW()),
      ('rv10r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000010',4,'Random forest and decision tree section is outstanding.',NOW()),
      ('rv10r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000010',5,'Model evaluation metrics covered in depth. Very practical course.',NOW()),
      ('rv10r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000010',4,'Cross-validation and hyperparameter tuning explained very well.',NOW()),
      ('rv11r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000011',5,'Deep learning demystified. CNN and transfer learning sections are brilliant.',NOW()),
      ('rv11r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000011',4,'TensorFlow/Keras explained step by step. Great image classification project.',NOW()),
      ('rv11r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000011',5,'LSTM section is excellent. Deployed a real DL model to production.',NOW()),
      ('rv11r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','d1000000-0000-4000-8000-000000000011',4,'Data augmentation strategies covered comprehensively. Great course.',NOW())
    `);

    // Courses 18-26: reviewers 5,6,7,8
    await conn.execute(`
      INSERT IGNORE INTO \`course_reviews\` (\`id\`,\`userId\`,\`courseId\`,\`rating\`,\`comment\`,\`createdAt\`) VALUES
      ('rv12r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','d2000000-0000-4000-8000-000000000012',5,'Transformers explained from scratch. Best NLP course I have taken.',NOW()),
      ('rv12r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','d2000000-0000-4000-8000-000000000012',4,'BERT fine-tuning section is outstanding. Built a real sentiment analyzer.',NOW()),
      ('rv12r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','d2000000-0000-4000-8000-000000000012',5,'Word embeddings finally make intuitive sense. Excellent teaching.',NOW()),
      ('rv12r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','d2000000-0000-4000-8000-000000000012',4,'Chatbot project at the end is a great practical application.',NOW()),
      ('rv13r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','d3000000-0000-4000-8000-000000000013',5,'OpenCV and PyTorch integration explained perfectly. Great course.',NOW()),
      ('rv13r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','d3000000-0000-4000-8000-000000000013',4,'YOLO object detection section is excellent. Very practical labs.',NOW()),
      ('rv13r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','d3000000-0000-4000-8000-000000000013',5,'Instance segmentation demystified. Deployed a vision app to production.',NOW()),
      ('rv13r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','d3000000-0000-4000-8000-000000000013',4,'Edge detection and filters section is great for building intuition.',NOW()),
      ('rv14r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','d4000000-0000-4000-8000-000000000014',5,'After Effects expressions section changed my workflow completely.',NOW()),
      ('rv14r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','d4000000-0000-4000-8000-000000000014',4,'Keyframing and easing explained with beautiful real examples.',NOW()),
      ('rv14r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','d4000000-0000-4000-8000-000000000014',5,'Great motion design fundamentals. Text animation section is incredible.',NOW()),
      ('rv14r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','d4000000-0000-4000-8000-000000000014',4,'Compositing section is very well structured. Great render output tips.',NOW()),
      ('rv15r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','d5000000-0000-4000-8000-000000000015',5,'Logo design process section is pure gold. Great brand strategy content.',NOW()),
      ('rv15r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','d5000000-0000-4000-8000-000000000015',4,'Brand guidelines section very practical. Great for freelance designers.',NOW()),
      ('rv15r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','d5000000-0000-4000-8000-000000000015',5,'Colour palette and typography selection covered brilliantly.',NOW()),
      ('rv15r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','d5000000-0000-4000-8000-000000000015',4,'Client presentation section is unique and very valuable.',NOW()),
      ('rv16r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','d6000000-0000-4000-8000-000000000016',5,'Mobile UI patterns explained in depth. Auto Layout in Figma is magic.',NOW()),
      ('rv16r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','d6000000-0000-4000-8000-000000000016',4,'Dev handoff section is extremely practical. Saved me hours of work.',NOW()),
      ('rv16r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','d6000000-0000-4000-8000-000000000016',5,'Accessibility in mobile apps section is outstanding and underrated.',NOW()),
      ('rv16r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','d6000000-0000-4000-8000-000000000016',4,'Onboarding flow design is covered in a really unique and useful way.',NOW()),
      ('rv17r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','d7000000-0000-4000-8000-000000000017',5,'Passed my AWS CLF-C02 exam! This course prepared me perfectly.',NOW()),
      ('rv17r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','d7000000-0000-4000-8000-000000000017',4,'IAM and VPC coverage is very thorough. Great for the exam and real work.',NOW()),
      ('rv17r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','d7000000-0000-4000-8000-000000000017',5,'CloudWatch monitoring section is practical and immediately applicable.',NOW()),
      ('rv17r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','d7000000-0000-4000-8000-000000000017',4,'Practice questions are spot on. Great exam prep strategy tips.',NOW()),
      ('rv18r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','d8000000-0000-4000-8000-000000000018',5,'AZ-900 certified! Azure AD and App Service explained beautifully.',NOW()),
      ('rv18r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','d8000000-0000-4000-8000-000000000018',4,'Mock exam walkthrough is incredibly helpful for preparation.',NOW()),
      ('rv18r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','d8000000-0000-4000-8000-000000000018',5,'Azure CLI and portal coverage gives real hands-on confidence.',NOW()),
      ('rv18r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','d8000000-0000-4000-8000-000000000018',4,'Resource groups and subscription management covered very clearly.',NOW()),
      ('rv19r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','d9000000-0000-4000-8000-000000000019',5,'GKE and Cloud Run section is the best I have found anywhere.',NOW()),
      ('rv19r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','d9000000-0000-4000-8000-000000000019',4,'BigQuery analytics section is very practical for data engineers.',NOW()),
      ('rv19r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','d9000000-0000-4000-8000-000000000019',5,'GCP IAM and security covered in depth. Great exam preparation.',NOW()),
      ('rv19r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','d9000000-0000-4000-8000-000000000019',4,'Practice labs are outstanding. Hands-on learning throughout.',NOW()),
      ('rv1ar5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','da000000-0000-4000-8000-00000000001a',5,'Microservices design patterns explained with real architecture examples.',NOW()),
      ('rv1ar6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','da000000-0000-4000-8000-00000000001a',4,'Serverless architecture section is practical and forward-thinking.',NOW()),
      ('rv1ar7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','da000000-0000-4000-8000-00000000001a',5,'Disaster recovery planning is rarely covered this well. Great content.',NOW()),
      ('rv1ar8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','da000000-0000-4000-8000-00000000001a',4,'Well-Architected Framework coverage is comprehensive and practical.',NOW())
    `);

    // Courses 27-34: reviewers 1,2,3,4
    await conn.execute(`
      INSERT IGNORE INTO \`course_reviews\` (\`id\`,\`userId\`,\`courseId\`,\`rating\`,\`comment\`,\`createdAt\`) VALUES
      ('rv1br1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','db000000-0000-4000-8000-00000000001b',5,'Metasploit basics explained ethically and clearly. Great CTF prep.',NOW()),
      ('rv1br2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','db000000-0000-4000-8000-00000000001b',4,'Reconnaissance section is very thorough. Nmap covered in depth.',NOW()),
      ('rv1br3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','db000000-0000-4000-8000-00000000001b',5,'Pentest report writing section is invaluable for professional work.',NOW()),
      ('rv1br4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','db000000-0000-4000-8000-00000000001b',4,'Privilege escalation techniques explained step by step. Great course.',NOW()),
      ('rv1cr1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','dc000000-0000-4000-8000-00000000001c',5,'Zero trust architecture coverage is modern and very well explained.',NOW()),
      ('rv1cr2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','dc000000-0000-4000-8000-00000000001c',4,'Wireshark packet analysis section is excellent for learning protocols.',NOW()),
      ('rv1cr3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','dc000000-0000-4000-8000-00000000001c',5,'SIEM and log analysis section is very practical for SOC analysts.',NOW()),
      ('rv1cr4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','dc000000-0000-4000-8000-00000000001c',4,'Incident response framework covered clearly. Great defensive security content.',NOW()),
      ('rv1dr1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','dd000000-0000-4000-8000-00000000001d',5,'OWASP Top 10 demystified with real code examples. Essential for devs.',NOW()),
      ('rv1dr2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','dd000000-0000-4000-8000-00000000001d',4,'SQL injection prevention techniques are immediately applicable.',NOW()),
      ('rv1dr3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','dd000000-0000-4000-8000-00000000001d',5,'Secure coding practices section is excellent. Great for code reviews.',NOW()),
      ('rv1dr4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','dd000000-0000-4000-8000-00000000001d',4,'CSP and secure headers section saved my app from real vulnerabilities.',NOW()),
      ('rv1er1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','de000000-0000-4000-8000-00000000001e',5,'Kali Linux setup and tools explained better than any other resource.',NOW()),
      ('rv1er2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','de000000-0000-4000-8000-00000000001e',4,'Burp Suite for web scanning is covered very thoroughly.',NOW()),
      ('rv1er3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','de000000-0000-4000-8000-00000000001e',5,'Buffer overflow basics explained clearly without overwhelming detail.',NOW()),
      ('rv1er4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','de000000-0000-4000-8000-00000000001e',4,'Professional report writing section is unique and invaluable.',NOW()),
      ('rv1fr1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','df000000-0000-4000-8000-00000000001f',5,'Kubernetes architecture finally makes sense. Helm charts section is great.',NOW()),
      ('rv1fr2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','df000000-0000-4000-8000-00000000001f',4,'Docker Compose coverage is thorough. EKS deployment section is excellent.',NOW()),
      ('rv1fr3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','df000000-0000-4000-8000-00000000001f',5,'ConfigMaps and Secrets management covered in depth. Very practical.',NOW()),
      ('rv1fr4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','df000000-0000-4000-8000-00000000001f',4,'Autoscaling and rolling updates section is excellent for production use.',NOW()),
      ('rv20r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000020',5,'GitHub Actions syntax explained clearly with real pipeline examples.',NOW()),
      ('rv20r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000020',4,'Automated testing in CI section saved our team many hours per week.',NOW()),
      ('rv20r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000020',5,'Matrix builds and caching strategies are very well explained.',NOW()),
      ('rv20r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','e0000000-0000-4000-8000-000000000020',4,'Docker to Kubernetes pipeline section is exactly what I needed.',NOW()),
      ('rv21r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000021',5,'Terraform modules and remote state explained perfectly. Great IaC course.',NOW()),
      ('rv21r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000021',4,'HCL syntax section is very clear. Provisioning AWS covered in depth.',NOW()),
      ('rv21r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','e1000000-0000-4000-8000-000000000021',5,'Terraform in CI/CD section is unique and extremely practical.',NOW()),
      ('rv21r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','e1000000-0000-4000-8000-000000000021',4,'Workspaces and environments section makes multi-env management easy.',NOW()),
      ('rv22r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000022',5,'Linux for DevOps is the most practical Linux course available.',NOW()),
      ('rv22r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000022',4,'Bash scripting section is excellent. Cron jobs automation is very useful.',NOW()),
      ('rv22r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','e2000000-0000-4000-8000-000000000022',5,'systemd and process management explained step by step. Great course.',NOW()),
      ('rv22r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','e2000000-0000-4000-8000-000000000022',4,'Security hardening section is a great bonus. Highly recommend.',NOW())
    `);

    // ── Seed demo user enrollments ──────────────────────────────────────────
    await conn.execute(`
      INSERT IGNORE INTO \`enrollments\` (\`id\`,\`userId\`,\`courseId\`,\`progress\`,\`completed\`,\`enrolledAt\`,\`completedAt\`) VALUES
      ('enroll01-0000-4000-8000-000000000001','demouser0-0000-4000-8000-000000000001','c1000000-0000-0000-0000-000000000001',77.78,false,NOW(),NULL),
      ('enroll02-0000-4000-8000-000000000002','demouser0-0000-4000-8000-000000000001','c1000000-0000-0000-0000-000000000002',44.44,false,NOW(),NULL),
      ('enroll03-0000-4000-8000-000000000003','demouser0-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000010',22.22,false,NOW(),NULL),
      ('enroll04-0000-4000-8000-000000000004','demouser0-0000-4000-8000-000000000001','df000000-0000-4000-8000-00000000001f',100.00,true,DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_SUB(NOW(),INTERVAL 5 DAY)),
      ('enroll05-0000-4000-8000-000000000005','demouser0-0000-4000-8000-000000000001','d7000000-0000-4000-8000-000000000017',0.00,false,NOW(),NULL)
    `);

    // ── Seed video_progress for demo user ──────────────────────────────────
    // JS: 7/9 lessons done (sections 1+2 all 6, plus first lesson of section 3)
    // React: 4/9 done (all 3 of section 1 + first of section 2), plus in-progress on lesson 2 of section 2
    // ML: 2/9 done (first 2 of section 1)
    // Docker: 9/9 all done
    await conn.execute(`
      INSERT IGNORE INTO \`video_progress\` (\`id\`,\`userId\`,\`lessonId\`,\`last_position_seconds\`,\`is_completed\`,\`completed_at\`,\`updatedAt\`) VALUES
      -- JS section 1 (3 lessons)
      ('vp010100-0000-4000-8000-000000000001','demouser0-0000-4000-8000-000000000001','l1010000-0000-0000-0000-000000000001',600,true,NOW(),NOW()),
      ('vp010200-0000-4000-8000-000000000002','demouser0-0000-4000-8000-000000000001','l1010000-0000-0000-0000-000000000002',540,true,NOW(),NOW()),
      ('vp010300-0000-4000-8000-000000000003','demouser0-0000-4000-8000-000000000001','l1010000-0000-0000-0000-000000000003',480,true,NOW(),NOW()),
      -- JS section 2 (3 lessons)
      ('vp020100-0000-4000-8000-000000000004','demouser0-0000-4000-8000-000000000001','l1020000-0000-0000-0000-000000000001',720,true,NOW(),NOW()),
      ('vp020200-0000-4000-8000-000000000005','demouser0-0000-4000-8000-000000000001','l1020000-0000-0000-0000-000000000002',660,true,NOW(),NOW()),
      ('vp020300-0000-4000-8000-000000000006','demouser0-0000-4000-8000-000000000001','l1020000-0000-0000-0000-000000000003',540,true,NOW(),NOW()),
      -- JS section 3 lesson 1 only
      ('vp030100-0000-4000-8000-000000000007','demouser0-0000-4000-8000-000000000001','l1030000-0000-0000-0000-000000000001',600,true,NOW(),NOW()),
      -- React section 1 (3 lessons)
      ('vp040100-0000-4000-8000-000000000008','demouser0-0000-4000-8000-000000000001','l2010000-0000-0000-0000-000000000001',480,true,NOW(),NOW()),
      ('vp040200-0000-4000-8000-000000000009','demouser0-0000-4000-8000-000000000001','l2010000-0000-0000-0000-000000000002',600,true,NOW(),NOW()),
      ('vp040300-0000-4000-8000-000000000010','demouser0-0000-4000-8000-000000000001','l2010000-0000-0000-0000-000000000003',540,true,NOW(),NOW()),
      -- React section 2 lesson 1 completed
      ('vp050100-0000-4000-8000-000000000011','demouser0-0000-4000-8000-000000000001','l2020000-0000-0000-0000-000000000001',720,true,NOW(),NOW()),
      -- React section 2 lesson 2 in-progress (Continue Learning target)
      ('vp050200-0000-4000-8000-000000000012','demouser0-0000-4000-8000-000000000001','l2020000-0000-0000-0000-000000000002',312,false,NULL,NOW()),
      -- ML section 1 lessons 1-2
      ('vp060100-0000-4000-8000-000000000013','demouser0-0000-4000-8000-000000000001','lg110000-0000-4000-8000-000000000001',480,true,NOW(),NOW()),
      ('vp060200-0000-4000-8000-000000000014','demouser0-0000-4000-8000-000000000001','lg120000-0000-4000-8000-000000000002',540,true,NOW(),NOW()),
      -- Docker all 9 lessons
      ('vp070100-0000-4000-8000-000000000015','demouser0-0000-4000-8000-000000000001','lv110000-0000-4000-8000-000000000001',480,true,DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_SUB(NOW(),INTERVAL 5 DAY)),
      ('vp070200-0000-4000-8000-000000000016','demouser0-0000-4000-8000-000000000001','lv120000-0000-4000-8000-000000000002',540,true,DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_SUB(NOW(),INTERVAL 5 DAY)),
      ('vp070300-0000-4000-8000-000000000017','demouser0-0000-4000-8000-000000000001','lv130000-0000-4000-8000-000000000003',600,true,DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_SUB(NOW(),INTERVAL 5 DAY)),
      ('vp070400-0000-4000-8000-000000000018','demouser0-0000-4000-8000-000000000001','lv210000-0000-4000-8000-000000000004',720,true,DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_SUB(NOW(),INTERVAL 5 DAY)),
      ('vp070500-0000-4000-8000-000000000019','demouser0-0000-4000-8000-000000000001','lv220000-0000-4000-8000-000000000005',660,true,DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_SUB(NOW(),INTERVAL 5 DAY)),
      ('vp070600-0000-4000-8000-000000000020','demouser0-0000-4000-8000-000000000001','lv230000-0000-4000-8000-000000000006',600,true,DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_SUB(NOW(),INTERVAL 5 DAY)),
      ('vp070700-0000-4000-8000-000000000021','demouser0-0000-4000-8000-000000000001','lv310000-0000-4000-8000-000000000007',540,true,DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_SUB(NOW(),INTERVAL 5 DAY)),
      ('vp070800-0000-4000-8000-000000000022','demouser0-0000-4000-8000-000000000001','lv320000-0000-4000-8000-000000000008',600,true,DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_SUB(NOW(),INTERVAL 5 DAY)),
      ('vp070900-0000-4000-8000-000000000023','demouser0-0000-4000-8000-000000000001','lv330000-0000-4000-8000-000000000009',480,true,DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_SUB(NOW(),INTERVAL 5 DAY))
    `);

    // ── Seed wishlist for demo user ─────────────────────────────────────────
    await conn.execute(`
      INSERT IGNORE INTO \`wishlist\` (\`id\`,\`userId\`,\`courseId\`,\`createdAt\`) VALUES
      ('wl000001-0000-4000-8000-000000000001','demouser0-0000-4000-8000-000000000001','c9000000-0000-4000-8000-000000000009',NOW()),
      ('wl000002-0000-4000-8000-000000000002','demouser0-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000005',NOW()),
      ('wl000003-0000-4000-8000-000000000003','demouser0-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000012',NOW()),
      ('wl000004-0000-4000-8000-000000000004','demouser0-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000020',NOW())
    `);

    // ── Seed 16 new courses (35–50) ─────────────────────────────────────────
    await conn.execute(`
      INSERT IGNORE INTO \`courses\` (\`id\`, \`title\`, \`description\`, \`instructor\`, \`category\`, \`duration_hours\`, \`thumbnail_url\`, \`is_published\`) VALUES
      ('e3000000-0000-4000-8000-000000000023', 'C++ for Systems Programming', 'Master C++ for low-level and systems programming. Covers memory management, pointers, smart pointers, multithreading, and building high-performance software.', 'Rohit Kumar', 'Programming', 14.0, '/course-thumbnails/programming.svg', true),
      ('e4000000-0000-4000-8000-000000000024', 'Rust Programming Language', 'Learn Rust from scratch — ownership, borrowing, traits, error handling, and async programming. Build safe, fast, and concurrent systems.', 'Priya Sharma', 'Programming', 16.0, '/course-thumbnails/programming.svg', true),
      ('e5000000-0000-4000-8000-000000000025', 'Django & Python Web Framework', 'Build full-featured web applications with Django. Covers models, views, templates, REST APIs with Django REST Framework, and deployment.', 'Arjun Sharma', 'Web Development', 14.0, '/course-thumbnails/web-development.svg', true),
      ('e6000000-0000-4000-8000-000000000026', 'GraphQL API Development', 'Design and build GraphQL APIs from scratch. Covers schemas, resolvers, queries, mutations, subscriptions, and authentication patterns.', 'Meera Iyer', 'Web Development', 11.0, '/course-thumbnails/web-development.svg', true),
      ('e7000000-0000-4000-8000-000000000027', 'Power BI for Business Analytics', 'Transform raw data into powerful business insights with Power BI. Covers DAX, data modeling, interactive reports, and publishing dashboards.', 'Sunita Patel', 'Data Science', 10.0, '/course-thumbnails/data-science.svg', true),
      ('e8000000-0000-4000-8000-000000000028', 'Apache Spark & Big Data', 'Process massive datasets at scale with Apache Spark. Covers RDDs, DataFrames, Spark SQL, structured streaming, and cloud deployment.', 'Rahul Mehta', 'Data Science', 16.0, '/course-thumbnails/data-science.svg', true),
      ('e9000000-0000-4000-8000-000000000029', 'Generative AI & Prompt Engineering', 'Unlock the power of large language models through expert prompt engineering. Build real AI apps using LangChain, RAG, and vector databases.', 'Dr. Anjali Kumar', 'Artificial Intelligence', 12.0, '/course-thumbnails/artificial-intelligence.svg', true),
      ('ea000000-0000-4000-8000-00000000002a', 'Reinforcement Learning', 'Dive deep into reinforcement learning — MDPs, Q-learning, DQN, and policy gradient methods. Train agents to solve real-world and game environments.', 'Ravi Shankar', 'Artificial Intelligence', 18.0, '/course-thumbnails/artificial-intelligence.svg', true),
      ('eb000000-0000-4000-8000-00000000002b', '3D Design with Blender', 'Create stunning 3D models, materials, and animations using Blender. Covers mesh modeling, lighting, rigging, and rendering with Cycles.', 'Sneha Patel', 'Design', 15.0, '/course-thumbnails/design.svg', true),
      ('ec000000-0000-4000-8000-00000000002c', 'Design Systems & Component Libraries', 'Build scalable, consistent design systems from scratch. Covers design tokens, component libraries, Storybook, and team adoption strategies.', 'Maya Singh', 'Design', 9.0, '/course-thumbnails/design.svg', true),
      ('ed000000-0000-4000-8000-00000000002d', 'Cloud Security & Compliance', 'Secure your cloud infrastructure with best practices in IAM, compliance frameworks, data encryption, and continuous security monitoring.', 'Sanjay Kapoor', 'Cloud Computing', 12.0, '/course-thumbnails/cloud-computing.svg', true),
      ('ee000000-0000-4000-8000-00000000002e', 'Kubernetes Advanced Patterns', 'Go beyond the basics with advanced Kubernetes — networking, storage, StatefulSets, observability, and GitOps-driven deployments.', 'Kiran Reddy', 'Cloud Computing', 14.0, '/course-thumbnails/cloud-computing.svg', true),
      ('ef000000-0000-4000-8000-00000000002f', 'Security Operations Center (SOC)', 'Learn how to operate a SOC — SIEM setup, threat detection rules, MITRE ATT&CK, incident response, and forensic investigation.', 'Rajan Kumar', 'Cybersecurity', 16.0, '/course-thumbnails/cybersecurity.svg', true),
      ('f0000000-0000-4000-8000-000000000030', 'Cryptography & PKI', 'Understand the foundations of modern cryptography — symmetric and asymmetric encryption, PKI, X.509 certificates, TLS, and mTLS.', 'Preethi Suresh', 'Cybersecurity', 12.0, '/course-thumbnails/cybersecurity.svg', true),
      ('f1000000-0000-4000-8000-000000000031', 'GitOps & ArgoCD', 'Implement GitOps workflows using ArgoCD. Covers Git as single source of truth, app-of-apps pattern, sync policies, and Argo Rollouts.', 'Arjun Ravi', 'DevOps', 11.0, '/course-thumbnails/devops.svg', true),
      ('f2000000-0000-4000-8000-000000000032', 'Site Reliability Engineering (SRE)', 'Apply SRE principles to production systems — SLOs, error budgets, toil reduction, on-call best practices, and blameless postmortems.', 'Kavita Sharma', 'DevOps', 14.0, '/course-thumbnails/devops.svg', true)
    `);

    // ── Sections for courses 35–50 ──────────────────────────────────────────
    await conn.execute(`
      INSERT IGNORE INTO \`sections\` (\`id\`, \`courseId\`, \`title\`, \`order_index\`) VALUES
      -- Course 35: C++ for Systems Programming
      ('t3510000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000023','C++ Fundamentals',1),
      ('t3520000-0000-4000-8000-000000000002','e3000000-0000-4000-8000-000000000023','Memory & Pointers',2),
      ('t3530000-0000-4000-8000-000000000003','e3000000-0000-4000-8000-000000000023','Systems Programming',3),
      -- Course 36: Rust Programming Language
      ('t3610000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000024','Rust Basics & Ownership',1),
      ('t3620000-0000-4000-8000-000000000002','e4000000-0000-4000-8000-000000000024','Error Handling & Traits',2),
      ('t3630000-0000-4000-8000-000000000003','e4000000-0000-4000-8000-000000000024','Async Rust & Crates',3),
      -- Course 37: Django & Python Web Framework
      ('t3710000-0000-4000-8000-000000000001','e5000000-0000-4000-8000-000000000025','Django Setup & Models',1),
      ('t3720000-0000-4000-8000-000000000002','e5000000-0000-4000-8000-000000000025','Views, URLs & Templates',2),
      ('t3730000-0000-4000-8000-000000000003','e5000000-0000-4000-8000-000000000025','REST API with DRF',3),
      -- Course 38: GraphQL API Development
      ('t3810000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000026','GraphQL Concepts',1),
      ('t3820000-0000-4000-8000-000000000002','e6000000-0000-4000-8000-000000000026','Queries & Mutations',2),
      ('t3830000-0000-4000-8000-000000000003','e6000000-0000-4000-8000-000000000026','Subscriptions & Auth',3),
      -- Course 39: Power BI for Business Analytics
      ('t3910000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000027','Power BI Interface',1),
      ('t3920000-0000-4000-8000-000000000002','e7000000-0000-4000-8000-000000000027','DAX & Data Modeling',2),
      ('t3930000-0000-4000-8000-000000000003','e7000000-0000-4000-8000-000000000027','Reports & Dashboards',3),
      -- Course 40: Apache Spark & Big Data
      ('t4010000-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000028','Spark Architecture',1),
      ('t4020000-0000-4000-8000-000000000002','e8000000-0000-4000-8000-000000000028','RDDs & DataFrames',2),
      ('t4030000-0000-4000-8000-000000000003','e8000000-0000-4000-8000-000000000028','Spark SQL & Streaming',3),
      -- Course 41: Generative AI & Prompt Engineering
      ('t4110000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000029','LLMs & Prompt Basics',1),
      ('t4120000-0000-4000-8000-000000000002','e9000000-0000-4000-8000-000000000029','Advanced Prompting',2),
      ('t4130000-0000-4000-8000-000000000003','e9000000-0000-4000-8000-000000000029','Building AI Apps',3),
      -- Course 42: Reinforcement Learning
      ('t4210000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-00000000002a','RL Foundations',1),
      ('t4220000-0000-4000-8000-000000000002','ea000000-0000-4000-8000-00000000002a','Q-Learning & DQN',2),
      ('t4230000-0000-4000-8000-000000000003','ea000000-0000-4000-8000-00000000002a','Policy Gradient Methods',3),
      -- Course 43: 3D Design with Blender
      ('t4310000-0000-4000-8000-000000000001','eb000000-0000-4000-8000-00000000002b','Blender Interface & Modeling',1),
      ('t4320000-0000-4000-8000-000000000002','eb000000-0000-4000-8000-00000000002b','Materials & Lighting',2),
      ('t4330000-0000-4000-8000-000000000003','eb000000-0000-4000-8000-00000000002b','Animation & Rendering',3),
      -- Course 44: Design Systems & Component Libraries
      ('t4410000-0000-4000-8000-000000000001','ec000000-0000-4000-8000-00000000002c','Foundations & Tokens',1),
      ('t4420000-0000-4000-8000-000000000002','ec000000-0000-4000-8000-00000000002c','Component Library',2),
      ('t4430000-0000-4000-8000-000000000003','ec000000-0000-4000-8000-00000000002c','Documentation & Adoption',3),
      -- Course 45: Cloud Security & Compliance
      ('t4510000-0000-4000-8000-000000000001','ed000000-0000-4000-8000-00000000002d','IAM & Identity',1),
      ('t4520000-0000-4000-8000-000000000002','ed000000-0000-4000-8000-00000000002d','Compliance Frameworks',2),
      ('t4530000-0000-4000-8000-000000000003','ed000000-0000-4000-8000-00000000002d','Data Protection',3),
      -- Course 46: Kubernetes Advanced Patterns
      ('t4610000-0000-4000-8000-000000000001','ee000000-0000-4000-8000-00000000002e','Networking & Ingress',1),
      ('t4620000-0000-4000-8000-000000000002','ee000000-0000-4000-8000-00000000002e','Storage & StatefulSets',2),
      ('t4630000-0000-4000-8000-000000000003','ee000000-0000-4000-8000-00000000002e','Observability & GitOps',3),
      -- Course 47: Security Operations Center (SOC)
      ('t4710000-0000-4000-8000-000000000001','ef000000-0000-4000-8000-00000000002f','SOC Fundamentals',1),
      ('t4720000-0000-4000-8000-000000000002','ef000000-0000-4000-8000-00000000002f','Threat Detection',2),
      ('t4730000-0000-4000-8000-000000000003','ef000000-0000-4000-8000-00000000002f','Incident Management',3),
      -- Course 48: Cryptography & PKI
      ('t4810000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000030','Cryptography Basics',1),
      ('t4820000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000030','PKI & Certificates',2),
      ('t4830000-0000-4000-8000-000000000003','f0000000-0000-4000-8000-000000000030','TLS & Secure Protocols',3),
      -- Course 49: GitOps & ArgoCD
      ('t4910000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000031','GitOps Principles',1),
      ('t4920000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000031','ArgoCD Setup',2),
      ('t4930000-0000-4000-8000-000000000003','f1000000-0000-4000-8000-000000000031','Advanced Workflows',3),
      -- Course 50: Site Reliability Engineering (SRE)
      ('t5010000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000032','SRE Fundamentals',1),
      ('t5020000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000032','SLOs & Error Budgets',2),
      ('t5030000-0000-4000-8000-000000000003','f2000000-0000-4000-8000-000000000032','Toil Reduction & On-Call',3)
    `);

    // ── Lessons for courses 35–42 ───────────────────────────────────────────
    await conn.execute(`
      INSERT IGNORE INTO \`lessons\`
        (\`id\`,\`courseId\`,\`section_id\`,\`title\`,\`order_num\`,\`youtube_url\`,\`duration_seconds\`,\`is_published\`)
      VALUES
      -- Course 35: C++ for Systems Programming
      ('m3511000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000023','t3510000-0000-4000-8000-000000000001','C++ Setup and Hello World',1,'hdI2bqOjy3c',480,true),
      ('m3512000-0000-4000-8000-000000000002','e3000000-0000-4000-8000-000000000023','t3510000-0000-4000-8000-000000000001','Variables, Types and Operators',2,'hdI2bqOjy3c',540,true),
      ('m3513000-0000-4000-8000-000000000003','e3000000-0000-4000-8000-000000000023','t3510000-0000-4000-8000-000000000001','Control Flow and Functions',3,'hdI2bqOjy3c',600,true),
      ('m3521000-0000-4000-8000-000000000004','e3000000-0000-4000-8000-000000000023','t3520000-0000-4000-8000-000000000002','Pointers and References',4,'hdI2bqOjy3c',720,true),
      ('m3522000-0000-4000-8000-000000000005','e3000000-0000-4000-8000-000000000023','t3520000-0000-4000-8000-000000000002','Dynamic Memory Allocation',5,'hdI2bqOjy3c',660,true),
      ('m3523000-0000-4000-8000-000000000006','e3000000-0000-4000-8000-000000000023','t3520000-0000-4000-8000-000000000002','Smart Pointers',6,'hdI2bqOjy3c',600,true),
      ('m3531000-0000-4000-8000-000000000007','e3000000-0000-4000-8000-000000000023','t3530000-0000-4000-8000-000000000003','File I/O and Streams',7,'hdI2bqOjy3c',540,true),
      ('m3532000-0000-4000-8000-000000000008','e3000000-0000-4000-8000-000000000023','t3530000-0000-4000-8000-000000000003','Multithreading in C++',8,'hdI2bqOjy3c',600,true),
      ('m3533000-0000-4000-8000-000000000009','e3000000-0000-4000-8000-000000000023','t3530000-0000-4000-8000-000000000003','Building a Systems Project',9,'hdI2bqOjy3c',480,true),
      -- Course 36: Rust Programming Language
      ('m3611000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000024','t3610000-0000-4000-8000-000000000001','Rust Setup and Syntax',1,'hdI2bqOjy3c',480,true),
      ('m3612000-0000-4000-8000-000000000002','e4000000-0000-4000-8000-000000000024','t3610000-0000-4000-8000-000000000001','Ownership and Borrowing',2,'hdI2bqOjy3c',540,true),
      ('m3613000-0000-4000-8000-000000000003','e4000000-0000-4000-8000-000000000024','t3610000-0000-4000-8000-000000000001','Structs and Enums',3,'hdI2bqOjy3c',600,true),
      ('m3621000-0000-4000-8000-000000000004','e4000000-0000-4000-8000-000000000024','t3620000-0000-4000-8000-000000000002','Result and Option Types',4,'hdI2bqOjy3c',720,true),
      ('m3622000-0000-4000-8000-000000000005','e4000000-0000-4000-8000-000000000024','t3620000-0000-4000-8000-000000000002','Traits and Generics',5,'hdI2bqOjy3c',660,true),
      ('m3623000-0000-4000-8000-000000000006','e4000000-0000-4000-8000-000000000024','t3620000-0000-4000-8000-000000000002','Closures and Iterators',6,'hdI2bqOjy3c',600,true),
      ('m3631000-0000-4000-8000-000000000007','e4000000-0000-4000-8000-000000000024','t3630000-0000-4000-8000-000000000003','Async/Await in Rust',7,'hdI2bqOjy3c',540,true),
      ('m3632000-0000-4000-8000-000000000008','e4000000-0000-4000-8000-000000000024','t3630000-0000-4000-8000-000000000003','Using Cargo and Crates',8,'hdI2bqOjy3c',600,true),
      ('m3633000-0000-4000-8000-000000000009','e4000000-0000-4000-8000-000000000024','t3630000-0000-4000-8000-000000000003','Building a CLI Tool',9,'hdI2bqOjy3c',480,true),
      -- Course 37: Django & Python Web Framework
      ('m3711000-0000-4000-8000-000000000001','e5000000-0000-4000-8000-000000000025','t3710000-0000-4000-8000-000000000001','Django Project Setup',1,'bMknfKXIFA8',480,true),
      ('m3712000-0000-4000-8000-000000000002','e5000000-0000-4000-8000-000000000025','t3710000-0000-4000-8000-000000000001','Models and Migrations',2,'bMknfKXIFA8',540,true),
      ('m3713000-0000-4000-8000-000000000003','e5000000-0000-4000-8000-000000000025','t3710000-0000-4000-8000-000000000001','Django Admin Interface',3,'bMknfKXIFA8',600,true),
      ('m3721000-0000-4000-8000-000000000004','e5000000-0000-4000-8000-000000000025','t3720000-0000-4000-8000-000000000002','Function-Based Views',4,'bMknfKXIFA8',720,true),
      ('m3722000-0000-4000-8000-000000000005','e5000000-0000-4000-8000-000000000025','t3720000-0000-4000-8000-000000000002','URL Routing',5,'bMknfKXIFA8',660,true),
      ('m3723000-0000-4000-8000-000000000006','e5000000-0000-4000-8000-000000000025','t3720000-0000-4000-8000-000000000002','Django Templates',6,'bMknfKXIFA8',600,true),
      ('m3731000-0000-4000-8000-000000000007','e5000000-0000-4000-8000-000000000025','t3730000-0000-4000-8000-000000000003','DRF Serializers',7,'bMknfKXIFA8',540,true),
      ('m3732000-0000-4000-8000-000000000008','e5000000-0000-4000-8000-000000000025','t3730000-0000-4000-8000-000000000003','API Views and Routers',8,'bMknfKXIFA8',600,true),
      ('m3733000-0000-4000-8000-000000000009','e5000000-0000-4000-8000-000000000025','t3730000-0000-4000-8000-000000000003','Authentication and Permissions',9,'bMknfKXIFA8',480,true),
      -- Course 38: GraphQL API Development
      ('m3811000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000026','t3810000-0000-4000-8000-000000000001','REST vs GraphQL',1,'bMknfKXIFA8',480,true),
      ('m3812000-0000-4000-8000-000000000002','e6000000-0000-4000-8000-000000000026','t3810000-0000-4000-8000-000000000001','Schema and Types',2,'bMknfKXIFA8',540,true),
      ('m3813000-0000-4000-8000-000000000003','e6000000-0000-4000-8000-000000000026','t3810000-0000-4000-8000-000000000001','Resolvers Explained',3,'bMknfKXIFA8',600,true),
      ('m3821000-0000-4000-8000-000000000004','e6000000-0000-4000-8000-000000000026','t3820000-0000-4000-8000-000000000002','Writing Queries',4,'bMknfKXIFA8',720,true),
      ('m3822000-0000-4000-8000-000000000005','e6000000-0000-4000-8000-000000000026','t3820000-0000-4000-8000-000000000002','Mutations and Input Types',5,'bMknfKXIFA8',660,true),
      ('m3823000-0000-4000-8000-000000000006','e6000000-0000-4000-8000-000000000026','t3820000-0000-4000-8000-000000000002','Variables and Fragments',6,'bMknfKXIFA8',600,true),
      ('m3831000-0000-4000-8000-000000000007','e6000000-0000-4000-8000-000000000026','t3830000-0000-4000-8000-000000000003','Real-time with Subscriptions',7,'bMknfKXIFA8',540,true),
      ('m3832000-0000-4000-8000-000000000008','e6000000-0000-4000-8000-000000000026','t3830000-0000-4000-8000-000000000003','Authentication in GraphQL',8,'bMknfKXIFA8',600,true),
      ('m3833000-0000-4000-8000-000000000009','e6000000-0000-4000-8000-000000000026','t3830000-0000-4000-8000-000000000003','Deploying a GraphQL API',9,'bMknfKXIFA8',480,true),
      -- Course 39: Power BI for Business Analytics
      ('m3911000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000027','t3910000-0000-4000-8000-000000000001','Power BI Desktop Setup',1,'rfscVS0vtbw',480,true),
      ('m3912000-0000-4000-8000-000000000002','e7000000-0000-4000-8000-000000000027','t3910000-0000-4000-8000-000000000001','Importing Data Sources',2,'rfscVS0vtbw',540,true),
      ('m3913000-0000-4000-8000-000000000003','e7000000-0000-4000-8000-000000000027','t3910000-0000-4000-8000-000000000001','Data Transformation with Power Query',3,'rfscVS0vtbw',600,true),
      ('m3921000-0000-4000-8000-000000000004','e7000000-0000-4000-8000-000000000027','t3920000-0000-4000-8000-000000000002','DAX Basics',4,'rfscVS0vtbw',720,true),
      ('m3922000-0000-4000-8000-000000000005','e7000000-0000-4000-8000-000000000027','t3920000-0000-4000-8000-000000000002','Calculated Columns and Measures',5,'rfscVS0vtbw',660,true),
      ('m3923000-0000-4000-8000-000000000006','e7000000-0000-4000-8000-000000000027','t3920000-0000-4000-8000-000000000002','Data Modeling Best Practices',6,'rfscVS0vtbw',600,true),
      ('m3931000-0000-4000-8000-000000000007','e7000000-0000-4000-8000-000000000027','t3930000-0000-4000-8000-000000000003','Building Interactive Reports',7,'rfscVS0vtbw',540,true),
      ('m3932000-0000-4000-8000-000000000008','e7000000-0000-4000-8000-000000000027','t3930000-0000-4000-8000-000000000003','Dashboard Design',8,'rfscVS0vtbw',600,true),
      ('m3933000-0000-4000-8000-000000000009','e7000000-0000-4000-8000-000000000027','t3930000-0000-4000-8000-000000000003','Publishing to Power BI Service',9,'rfscVS0vtbw',480,true),
      -- Course 40: Apache Spark & Big Data
      ('m4011000-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000028','t4010000-0000-4000-8000-000000000001','Big Data and Spark Overview',1,'rfscVS0vtbw',480,true),
      ('m4012000-0000-4000-8000-000000000002','e8000000-0000-4000-8000-000000000028','t4010000-0000-4000-8000-000000000001','Spark Architecture Deep Dive',2,'rfscVS0vtbw',540,true),
      ('m4013000-0000-4000-8000-000000000003','e8000000-0000-4000-8000-000000000028','t4010000-0000-4000-8000-000000000001','Setting Up Spark Environment',3,'rfscVS0vtbw',600,true),
      ('m4021000-0000-4000-8000-000000000004','e8000000-0000-4000-8000-000000000028','t4020000-0000-4000-8000-000000000002','Working with RDDs',4,'rfscVS0vtbw',720,true),
      ('m4022000-0000-4000-8000-000000000005','e8000000-0000-4000-8000-000000000028','t4020000-0000-4000-8000-000000000002','DataFrames and Datasets',5,'rfscVS0vtbw',660,true),
      ('m4023000-0000-4000-8000-000000000006','e8000000-0000-4000-8000-000000000028','t4020000-0000-4000-8000-000000000002','Data Transformations',6,'rfscVS0vtbw',600,true),
      ('m4031000-0000-4000-8000-000000000007','e8000000-0000-4000-8000-000000000028','t4030000-0000-4000-8000-000000000003','Spark SQL Queries',7,'rfscVS0vtbw',540,true),
      ('m4032000-0000-4000-8000-000000000008','e8000000-0000-4000-8000-000000000028','t4030000-0000-4000-8000-000000000003','Structured Streaming',8,'rfscVS0vtbw',600,true),
      ('m4033000-0000-4000-8000-000000000009','e8000000-0000-4000-8000-000000000028','t4030000-0000-4000-8000-000000000003','Deploying Spark on Cloud',9,'rfscVS0vtbw',480,true),
      -- Course 41: Generative AI & Prompt Engineering
      ('m4111000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000029','t4110000-0000-4000-8000-000000000001','What are Large Language Models',1,'rfscVS0vtbw',480,true),
      ('m4112000-0000-4000-8000-000000000002','e9000000-0000-4000-8000-000000000029','t4110000-0000-4000-8000-000000000001','Prompt Engineering Fundamentals',2,'rfscVS0vtbw',540,true),
      ('m4113000-0000-4000-8000-000000000003','e9000000-0000-4000-8000-000000000029','t4110000-0000-4000-8000-000000000001','Few-Shot and Zero-Shot Prompting',3,'rfscVS0vtbw',600,true),
      ('m4121000-0000-4000-8000-000000000004','e9000000-0000-4000-8000-000000000029','t4120000-0000-4000-8000-000000000002','Chain-of-Thought Prompting',4,'rfscVS0vtbw',720,true),
      ('m4122000-0000-4000-8000-000000000005','e9000000-0000-4000-8000-000000000029','t4120000-0000-4000-8000-000000000002','ReAct and Agent Prompting',5,'rfscVS0vtbw',660,true),
      ('m4123000-0000-4000-8000-000000000006','e9000000-0000-4000-8000-000000000029','t4120000-0000-4000-8000-000000000002','Prompt Optimization Techniques',6,'rfscVS0vtbw',600,true),
      ('m4131000-0000-4000-8000-000000000007','e9000000-0000-4000-8000-000000000029','t4130000-0000-4000-8000-000000000003','LangChain Basics',7,'rfscVS0vtbw',540,true),
      ('m4132000-0000-4000-8000-000000000008','e9000000-0000-4000-8000-000000000029','t4130000-0000-4000-8000-000000000003','Building an AI Chatbot',8,'rfscVS0vtbw',600,true),
      ('m4133000-0000-4000-8000-000000000009','e9000000-0000-4000-8000-000000000029','t4130000-0000-4000-8000-000000000003','RAG and Vector Databases',9,'rfscVS0vtbw',480,true),
      -- Course 42: Reinforcement Learning
      ('m4211000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-00000000002a','t4210000-0000-4000-8000-000000000001','Markov Decision Processes',1,'rfscVS0vtbw',480,true),
      ('m4212000-0000-4000-8000-000000000002','ea000000-0000-4000-8000-00000000002a','t4210000-0000-4000-8000-000000000001','Rewards and Value Functions',2,'rfscVS0vtbw',540,true),
      ('m4213000-0000-4000-8000-000000000003','ea000000-0000-4000-8000-00000000002a','t4210000-0000-4000-8000-000000000001','Exploration vs Exploitation',3,'rfscVS0vtbw',600,true),
      ('m4221000-0000-4000-8000-000000000004','ea000000-0000-4000-8000-00000000002a','t4220000-0000-4000-8000-000000000002','Q-Learning Algorithm',4,'rfscVS0vtbw',720,true),
      ('m4222000-0000-4000-8000-000000000005','ea000000-0000-4000-8000-00000000002a','t4220000-0000-4000-8000-000000000002','Deep Q-Networks (DQN)',5,'rfscVS0vtbw',660,true),
      ('m4223000-0000-4000-8000-000000000006','ea000000-0000-4000-8000-00000000002a','t4220000-0000-4000-8000-000000000002','Experience Replay and Target Networks',6,'rfscVS0vtbw',600,true),
      ('m4231000-0000-4000-8000-000000000007','ea000000-0000-4000-8000-00000000002a','t4230000-0000-4000-8000-000000000003','Policy Gradient Basics',7,'rfscVS0vtbw',540,true),
      ('m4232000-0000-4000-8000-000000000008','ea000000-0000-4000-8000-00000000002a','t4230000-0000-4000-8000-000000000003','PPO and Actor-Critic',8,'rfscVS0vtbw',600,true),
      ('m4233000-0000-4000-8000-000000000009','ea000000-0000-4000-8000-00000000002a','t4230000-0000-4000-8000-000000000003','Building an RL Game Agent',9,'rfscVS0vtbw',480,true)
    `);

    // ── Lessons for courses 43–50 ───────────────────────────────────────────
    await conn.execute(`
      INSERT IGNORE INTO \`lessons\`
        (\`id\`,\`courseId\`,\`section_id\`,\`title\`,\`order_num\`,\`youtube_url\`,\`duration_seconds\`,\`is_published\`)
      VALUES
      -- Course 43: 3D Design with Blender
      ('m4311000-0000-4000-8000-000000000001','eb000000-0000-4000-8000-00000000002b','t4310000-0000-4000-8000-000000000001','Blender Interface Overview',1,'FTFaQWZBqQ8',480,true),
      ('m4312000-0000-4000-8000-000000000002','eb000000-0000-4000-8000-00000000002b','t4310000-0000-4000-8000-000000000001','Mesh Modeling Basics',2,'FTFaQWZBqQ8',540,true),
      ('m4313000-0000-4000-8000-000000000003','eb000000-0000-4000-8000-00000000002b','t4310000-0000-4000-8000-000000000001','Modifiers and Booleans',3,'FTFaQWZBqQ8',600,true),
      ('m4321000-0000-4000-8000-000000000004','eb000000-0000-4000-8000-00000000002b','t4320000-0000-4000-8000-000000000002','Principled BSDF Materials',4,'FTFaQWZBqQ8',720,true),
      ('m4322000-0000-4000-8000-000000000005','eb000000-0000-4000-8000-00000000002b','t4320000-0000-4000-8000-000000000002','HDRI and Studio Lighting',5,'FTFaQWZBqQ8',660,true),
      ('m4323000-0000-4000-8000-000000000006','eb000000-0000-4000-8000-00000000002b','t4320000-0000-4000-8000-000000000002','Texture Painting',6,'FTFaQWZBqQ8',600,true),
      ('m4331000-0000-4000-8000-000000000007','eb000000-0000-4000-8000-00000000002b','t4330000-0000-4000-8000-000000000003','Keyframe Animation',7,'FTFaQWZBqQ8',540,true),
      ('m4332000-0000-4000-8000-000000000008','eb000000-0000-4000-8000-00000000002b','t4330000-0000-4000-8000-000000000003','Rigging and Armatures',8,'FTFaQWZBqQ8',600,true),
      ('m4333000-0000-4000-8000-000000000009','eb000000-0000-4000-8000-00000000002b','t4330000-0000-4000-8000-000000000003','Rendering with Cycles',9,'FTFaQWZBqQ8',480,true),
      -- Course 44: Design Systems & Component Libraries
      ('m4411000-0000-4000-8000-000000000001','ec000000-0000-4000-8000-00000000002c','t4410000-0000-4000-8000-000000000001','Design System Fundamentals',1,'FTFaQWZBqQ8',480,true),
      ('m4412000-0000-4000-8000-000000000002','ec000000-0000-4000-8000-00000000002c','t4410000-0000-4000-8000-000000000001','Design Tokens and Variables',2,'FTFaQWZBqQ8',540,true),
      ('m4413000-0000-4000-8000-000000000003','ec000000-0000-4000-8000-00000000002c','t4410000-0000-4000-8000-000000000001','Color and Typography Systems',3,'FTFaQWZBqQ8',600,true),
      ('m4421000-0000-4000-8000-000000000004','ec000000-0000-4000-8000-00000000002c','t4420000-0000-4000-8000-000000000002','Building Core Components',4,'FTFaQWZBqQ8',720,true),
      ('m4422000-0000-4000-8000-000000000005','ec000000-0000-4000-8000-00000000002c','t4420000-0000-4000-8000-000000000002','Component Variants and States',5,'FTFaQWZBqQ8',660,true),
      ('m4423000-0000-4000-8000-000000000006','ec000000-0000-4000-8000-00000000002c','t4420000-0000-4000-8000-000000000002','Storybook for Documentation',6,'FTFaQWZBqQ8',600,true),
      ('m4431000-0000-4000-8000-000000000007','ec000000-0000-4000-8000-00000000002c','t4430000-0000-4000-8000-000000000003','Writing Component Guidelines',7,'FTFaQWZBqQ8',540,true),
      ('m4432000-0000-4000-8000-000000000008','ec000000-0000-4000-8000-00000000002c','t4430000-0000-4000-8000-000000000003','Version Control for Design',8,'FTFaQWZBqQ8',600,true),
      ('m4433000-0000-4000-8000-000000000009','ec000000-0000-4000-8000-00000000002c','t4430000-0000-4000-8000-000000000003','Team Adoption Strategies',9,'FTFaQWZBqQ8',480,true),
      -- Course 45: Cloud Security & Compliance
      ('m4511000-0000-4000-8000-000000000001','ed000000-0000-4000-8000-00000000002d','t4510000-0000-4000-8000-000000000001','IAM Fundamentals',1,'PkZNo7MFNFg',480,true),
      ('m4512000-0000-4000-8000-000000000002','ed000000-0000-4000-8000-00000000002d','t4510000-0000-4000-8000-000000000001','Role-Based Access Control',2,'PkZNo7MFNFg',540,true),
      ('m4513000-0000-4000-8000-000000000003','ed000000-0000-4000-8000-00000000002d','t4510000-0000-4000-8000-000000000001','Zero Trust Architecture',3,'PkZNo7MFNFg',600,true),
      ('m4521000-0000-4000-8000-000000000004','ed000000-0000-4000-8000-00000000002d','t4520000-0000-4000-8000-000000000002','SOC 2 and ISO 27001',4,'PkZNo7MFNFg',720,true),
      ('m4522000-0000-4000-8000-000000000005','ed000000-0000-4000-8000-00000000002d','t4520000-0000-4000-8000-000000000002','GDPR and Data Privacy',5,'PkZNo7MFNFg',660,true),
      ('m4523000-0000-4000-8000-000000000006','ed000000-0000-4000-8000-00000000002d','t4520000-0000-4000-8000-000000000002','Cloud Security Benchmarks',6,'PkZNo7MFNFg',600,true),
      ('m4531000-0000-4000-8000-000000000007','ed000000-0000-4000-8000-00000000002d','t4530000-0000-4000-8000-000000000003','Encryption at Rest and in Transit',7,'PkZNo7MFNFg',540,true),
      ('m4532000-0000-4000-8000-000000000008','ed000000-0000-4000-8000-00000000002d','t4530000-0000-4000-8000-000000000003','Key Management Services',8,'PkZNo7MFNFg',600,true),
      ('m4533000-0000-4000-8000-000000000009','ed000000-0000-4000-8000-00000000002d','t4530000-0000-4000-8000-000000000003','Security Monitoring and Audit',9,'PkZNo7MFNFg',480,true),
      -- Course 46: Kubernetes Advanced Patterns
      ('m4611000-0000-4000-8000-000000000001','ee000000-0000-4000-8000-00000000002e','t4610000-0000-4000-8000-000000000001','Kubernetes Networking Model',1,'PkZNo7MFNFg',480,true),
      ('m4612000-0000-4000-8000-000000000002','ee000000-0000-4000-8000-00000000002e','t4610000-0000-4000-8000-000000000001','Ingress Controllers',2,'PkZNo7MFNFg',540,true),
      ('m4613000-0000-4000-8000-000000000003','ee000000-0000-4000-8000-00000000002e','t4610000-0000-4000-8000-000000000001','Network Policies',3,'PkZNo7MFNFg',600,true),
      ('m4621000-0000-4000-8000-000000000004','ee000000-0000-4000-8000-00000000002e','t4620000-0000-4000-8000-000000000002','Persistent Volumes and Claims',4,'PkZNo7MFNFg',720,true),
      ('m4622000-0000-4000-8000-000000000005','ee000000-0000-4000-8000-00000000002e','t4620000-0000-4000-8000-000000000002','StatefulSets Deep Dive',5,'PkZNo7MFNFg',660,true),
      ('m4623000-0000-4000-8000-000000000006','ee000000-0000-4000-8000-00000000002e','t4620000-0000-4000-8000-000000000002','Storage Classes and CSI',6,'PkZNo7MFNFg',600,true),
      ('m4631000-0000-4000-8000-000000000007','ee000000-0000-4000-8000-00000000002e','t4630000-0000-4000-8000-000000000003','Prometheus and Grafana',7,'PkZNo7MFNFg',540,true),
      ('m4632000-0000-4000-8000-000000000008','ee000000-0000-4000-8000-00000000002e','t4630000-0000-4000-8000-000000000003','Centralized Logging',8,'PkZNo7MFNFg',600,true),
      ('m4633000-0000-4000-8000-000000000009','ee000000-0000-4000-8000-00000000002e','t4630000-0000-4000-8000-000000000003','GitOps with Flux or ArgoCD',9,'PkZNo7MFNFg',480,true),
      -- Course 47: Security Operations Center (SOC)
      ('m4711000-0000-4000-8000-000000000001','ef000000-0000-4000-8000-00000000002f','t4710000-0000-4000-8000-000000000001','SOC Roles and Responsibilities',1,'PkZNo7MFNFg',480,true),
      ('m4712000-0000-4000-8000-000000000002','ef000000-0000-4000-8000-00000000002f','t4710000-0000-4000-8000-000000000001','SIEM Architecture',2,'PkZNo7MFNFg',540,true),
      ('m4713000-0000-4000-8000-000000000003','ef000000-0000-4000-8000-00000000002f','t4710000-0000-4000-8000-000000000001','Log Management Basics',3,'PkZNo7MFNFg',600,true),
      ('m4721000-0000-4000-8000-000000000004','ef000000-0000-4000-8000-00000000002f','t4720000-0000-4000-8000-000000000002','Threat Intelligence Feeds',4,'PkZNo7MFNFg',720,true),
      ('m4722000-0000-4000-8000-000000000005','ef000000-0000-4000-8000-00000000002f','t4720000-0000-4000-8000-000000000002','Writing Detection Rules',5,'PkZNo7MFNFg',660,true),
      ('m4723000-0000-4000-8000-000000000006','ef000000-0000-4000-8000-00000000002f','t4720000-0000-4000-8000-000000000002','MITRE ATT&CK Framework',6,'PkZNo7MFNFg',600,true),
      ('m4731000-0000-4000-8000-000000000007','ef000000-0000-4000-8000-00000000002f','t4730000-0000-4000-8000-000000000003','Incident Response Process',7,'PkZNo7MFNFg',540,true),
      ('m4732000-0000-4000-8000-000000000008','ef000000-0000-4000-8000-00000000002f','t4730000-0000-4000-8000-000000000003','Forensics and Investigation',8,'PkZNo7MFNFg',600,true),
      ('m4733000-0000-4000-8000-000000000009','ef000000-0000-4000-8000-00000000002f','t4730000-0000-4000-8000-000000000003','SOC Metrics and Reporting',9,'PkZNo7MFNFg',480,true),
      -- Course 48: Cryptography & PKI
      ('m4811000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000030','t4810000-0000-4000-8000-000000000001','Symmetric Cryptography',1,'PkZNo7MFNFg',480,true),
      ('m4812000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000030','t4810000-0000-4000-8000-000000000001','Asymmetric Cryptography',2,'PkZNo7MFNFg',540,true),
      ('m4813000-0000-4000-8000-000000000003','f0000000-0000-4000-8000-000000000030','t4810000-0000-4000-8000-000000000001','Hash Functions and MACs',3,'PkZNo7MFNFg',600,true),
      ('m4821000-0000-4000-8000-000000000004','f0000000-0000-4000-8000-000000000030','t4820000-0000-4000-8000-000000000002','Certificate Authorities',4,'PkZNo7MFNFg',720,true),
      ('m4822000-0000-4000-8000-000000000005','f0000000-0000-4000-8000-000000000030','t4820000-0000-4000-8000-000000000002','X.509 Certificate Structure',5,'PkZNo7MFNFg',660,true),
      ('m4823000-0000-4000-8000-000000000006','f0000000-0000-4000-8000-000000000030','t4820000-0000-4000-8000-000000000002','Certificate Lifecycle Management',6,'PkZNo7MFNFg',600,true),
      ('m4831000-0000-4000-8000-000000000007','f0000000-0000-4000-8000-000000000030','t4830000-0000-4000-8000-000000000003','TLS Handshake Explained',7,'PkZNo7MFNFg',540,true),
      ('m4832000-0000-4000-8000-000000000008','f0000000-0000-4000-8000-000000000030','t4830000-0000-4000-8000-000000000003','HTTPS and HSTS',8,'PkZNo7MFNFg',600,true),
      ('m4833000-0000-4000-8000-000000000009','f0000000-0000-4000-8000-000000000030','t4830000-0000-4000-8000-000000000003','Mutual TLS (mTLS)',9,'PkZNo7MFNFg',480,true),
      -- Course 49: GitOps & ArgoCD
      ('m4911000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000031','t4910000-0000-4000-8000-000000000001','What is GitOps',1,'hdI2bqOjy3c',480,true),
      ('m4912000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000031','t4910000-0000-4000-8000-000000000001','GitOps vs Traditional Ops',2,'hdI2bqOjy3c',540,true),
      ('m4913000-0000-4000-8000-000000000003','f1000000-0000-4000-8000-000000000031','t4910000-0000-4000-8000-000000000001','Git as Single Source of Truth',3,'hdI2bqOjy3c',600,true),
      ('m4921000-0000-4000-8000-000000000004','f1000000-0000-4000-8000-000000000031','t4920000-0000-4000-8000-000000000002','Installing ArgoCD',4,'hdI2bqOjy3c',720,true),
      ('m4922000-0000-4000-8000-000000000005','f1000000-0000-4000-8000-000000000031','t4920000-0000-4000-8000-000000000002','App of Apps Pattern',5,'hdI2bqOjy3c',660,true),
      ('m4923000-0000-4000-8000-000000000006','f1000000-0000-4000-8000-000000000031','t4920000-0000-4000-8000-000000000002','Sync Policies and Hooks',6,'hdI2bqOjy3c',600,true),
      ('m4931000-0000-4000-8000-000000000007','f1000000-0000-4000-8000-000000000031','t4930000-0000-4000-8000-000000000003','Multi-Cluster Management',7,'hdI2bqOjy3c',540,true),
      ('m4932000-0000-4000-8000-000000000008','f1000000-0000-4000-8000-000000000031','t4930000-0000-4000-8000-000000000003','Secrets Management in GitOps',8,'hdI2bqOjy3c',600,true),
      ('m4933000-0000-4000-8000-000000000009','f1000000-0000-4000-8000-000000000031','t4930000-0000-4000-8000-000000000003','Progressive Delivery with Argo Rollouts',9,'hdI2bqOjy3c',480,true),
      -- Course 50: Site Reliability Engineering (SRE)
      ('m5011000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000032','t5010000-0000-4000-8000-000000000001','SRE vs DevOps',1,'hdI2bqOjy3c',480,true),
      ('m5012000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000032','t5010000-0000-4000-8000-000000000001','Service Level Objectives (SLOs)',2,'hdI2bqOjy3c',540,true),
      ('m5013000-0000-4000-8000-000000000003','f2000000-0000-4000-8000-000000000032','t5010000-0000-4000-8000-000000000001','Error Budget Policy',3,'hdI2bqOjy3c',600,true),
      ('m5021000-0000-4000-8000-000000000004','f2000000-0000-4000-8000-000000000032','t5020000-0000-4000-8000-000000000002','Defining SLIs and SLOs',4,'hdI2bqOjy3c',720,true),
      ('m5022000-0000-4000-8000-000000000005','f2000000-0000-4000-8000-000000000032','t5020000-0000-4000-8000-000000000002','Error Budget Calculations',5,'hdI2bqOjy3c',660,true),
      ('m5023000-0000-4000-8000-000000000006','f2000000-0000-4000-8000-000000000032','t5020000-0000-4000-8000-000000000002','Alerting on SLO Burn Rate',6,'hdI2bqOjy3c',600,true),
      ('m5031000-0000-4000-8000-000000000007','f2000000-0000-4000-8000-000000000032','t5030000-0000-4000-8000-000000000003','Identifying and Eliminating Toil',7,'hdI2bqOjy3c',540,true),
      ('m5032000-0000-4000-8000-000000000008','f2000000-0000-4000-8000-000000000032','t5030000-0000-4000-8000-000000000003','On-Call Best Practices',8,'hdI2bqOjy3c',600,true),
      ('m5033000-0000-4000-8000-000000000009','f2000000-0000-4000-8000-000000000032','t5030000-0000-4000-8000-000000000003','Postmortems and Blameless Culture',9,'hdI2bqOjy3c',480,true)
    `);

    // ── Reviews for courses 35–42 (reviewers 1,2,3,4) ───────────────────────
    await conn.execute(`
      INSERT IGNORE INTO \`course_reviews\` (\`id\`,\`userId\`,\`courseId\`,\`rating\`,\`comment\`,\`createdAt\`) VALUES
      ('rv23r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000023',5,'C++ memory management finally clicked. Smart pointers section is excellent.',NOW()),
      ('rv23r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','e3000000-0000-4000-8000-000000000023',4,'Multithreading in C++ explained very clearly. Great systems project.',NOW()),
      ('rv23r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','e3000000-0000-4000-8000-000000000023',5,'Best C++ course for developers coming from higher-level languages.',NOW()),
      ('rv23r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','e3000000-0000-4000-8000-000000000023',4,'Pointers and references demystified. Very practical and well-paced.',NOW()),
      ('rv24r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000024',5,'Ownership model explained brilliantly. Rust finally makes sense to me.',NOW()),
      ('rv24r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','e4000000-0000-4000-8000-000000000024',4,'Traits and generics section is very well structured. Great CLI project.',NOW()),
      ('rv24r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','e4000000-0000-4000-8000-000000000024',5,'Async Rust section is the clearest explanation I have found anywhere.',NOW()),
      ('rv24r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','e4000000-0000-4000-8000-000000000024',4,'Error handling with Result and Option is covered very thoroughly.',NOW()),
      ('rv25r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','e5000000-0000-4000-8000-000000000025',5,'Django admin and DRF covered in depth. Built a full API in days.',NOW()),
      ('rv25r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','e5000000-0000-4000-8000-000000000025',4,'Models and migrations section is very clear. Great for Python devs.',NOW()),
      ('rv25r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','e5000000-0000-4000-8000-000000000025',5,'Authentication and permissions section alone is worth taking this course.',NOW()),
      ('rv25r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','e5000000-0000-4000-8000-000000000025',4,'Template rendering and URL routing explained very intuitively.',NOW()),
      ('rv26r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000026',5,'GraphQL subscriptions and auth coverage is the best I have seen.',NOW()),
      ('rv26r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','e6000000-0000-4000-8000-000000000026',4,'Resolver pattern finally makes sense. Great schema design section.',NOW()),
      ('rv26r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','e6000000-0000-4000-8000-000000000026',5,'Switched from REST to GraphQL at work after this course. Amazing.',NOW()),
      ('rv26r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','e6000000-0000-4000-8000-000000000026',4,'Variables and fragments section is very practical for real projects.',NOW()),
      ('rv27r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000027',5,'DAX measures finally demystified. Dashboard design section is superb.',NOW()),
      ('rv27r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','e7000000-0000-4000-8000-000000000027',4,'Power Query transformation section is incredibly practical.',NOW()),
      ('rv27r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','e7000000-0000-4000-8000-000000000027',5,'Published my first Power BI dashboard to colleagues after this course.',NOW()),
      ('rv27r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','e7000000-0000-4000-8000-000000000027',4,'Data modeling best practices section changed how I structure reports.',NOW()),
      ('rv28r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000028',5,'Spark streaming section is outstanding. Architecture explained clearly.',NOW()),
      ('rv28r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','e8000000-0000-4000-8000-000000000028',4,'RDD to DataFrame transition explained brilliantly. Great cloud deploy section.',NOW()),
      ('rv28r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','e8000000-0000-4000-8000-000000000028',5,'Best Spark course available. Spark SQL section is very well structured.',NOW()),
      ('rv28r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','e8000000-0000-4000-8000-000000000028',4,'Data transformations with DataFrames covered very thoroughly.',NOW()),
      ('rv29r1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000029',5,'RAG and vector database section is absolutely cutting edge. Brilliant.',NOW()),
      ('rv29r2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','e9000000-0000-4000-8000-000000000029',4,'Chain-of-thought prompting section transformed my AI app development.',NOW()),
      ('rv29r3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','e9000000-0000-4000-8000-000000000029',5,'LangChain basics to production chatbot in one course. Incredible value.',NOW()),
      ('rv29r4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','e9000000-0000-4000-8000-000000000029',4,'Prompt optimization techniques section is very practical and actionable.',NOW()),
      ('rv2ar1-0000-4000-8000-000000000001','reviewer1-0000-4000-8000-000000000001','ea000000-0000-4000-8000-00000000002a',5,'PPO and Actor-Critic explained from first principles. Outstanding course.',NOW()),
      ('rv2ar2-0000-4000-8000-000000000002','reviewer2-0000-4000-8000-000000000002','ea000000-0000-4000-8000-00000000002a',4,'DQN section is excellent. Built a working game agent by the end.',NOW()),
      ('rv2ar3-0000-4000-8000-000000000003','reviewer3-0000-4000-8000-000000000003','ea000000-0000-4000-8000-00000000002a',5,'MDP foundations section sets up everything perfectly. Great course.',NOW()),
      ('rv2ar4-0000-4000-8000-000000000004','reviewer4-0000-4000-8000-000000000004','ea000000-0000-4000-8000-00000000002a',4,'Experience replay and target networks finally make intuitive sense.',NOW())
    `);

    // ── Reviews for courses 43–50 (reviewers 5,6,7,8) ───────────────────────
    await conn.execute(`
      INSERT IGNORE INTO \`course_reviews\` (\`id\`,\`userId\`,\`courseId\`,\`rating\`,\`comment\`,\`createdAt\`) VALUES
      ('rv2br5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','eb000000-0000-4000-8000-00000000002b',5,'Blender modeling and rendering sections are absolutely incredible.',NOW()),
      ('rv2br6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','eb000000-0000-4000-8000-00000000002b',4,'HDRI lighting section changed my render quality overnight. Great course.',NOW()),
      ('rv2br7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','eb000000-0000-4000-8000-00000000002b',5,'Rigging and armatures section is the clearest Blender tutorial I have found.',NOW()),
      ('rv2br8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','eb000000-0000-4000-8000-00000000002b',4,'Principled BSDF materials section is extremely practical. Great results.',NOW()),
      ('rv2cr5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','ec000000-0000-4000-8000-00000000002c',5,'Design tokens section is a game changer. Built our company system with this.',NOW()),
      ('rv2cr6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','ec000000-0000-4000-8000-00000000002c',4,'Storybook documentation section is very practical. Great component coverage.',NOW()),
      ('rv2cr7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','ec000000-0000-4000-8000-00000000002c',5,'Team adoption strategies section is unique and incredibly valuable.',NOW()),
      ('rv2cr8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','ec000000-0000-4000-8000-00000000002c',4,'Component variants and states covered very thoroughly. Great course.',NOW()),
      ('rv2dr5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','ed000000-0000-4000-8000-00000000002d',5,'Zero Trust architecture section is excellent. Very relevant for enterprise.',NOW()),
      ('rv2dr6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','ed000000-0000-4000-8000-00000000002d',4,'SOC 2 and GDPR compliance sections are very thorough and practical.',NOW()),
      ('rv2dr7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','ed000000-0000-4000-8000-00000000002d',5,'Key Management Services section helped us fix a real security gap at work.',NOW()),
      ('rv2dr8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','ed000000-0000-4000-8000-00000000002d',4,'IAM fundamentals explained from scratch. RBAC section is excellent.',NOW()),
      ('rv2er5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','ee000000-0000-4000-8000-00000000002e',5,'StatefulSets and storage section finally demystified. Best K8s advanced course.',NOW()),
      ('rv2er6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','ee000000-0000-4000-8000-00000000002e',4,'Prometheus and Grafana observability section is outstanding and practical.',NOW()),
      ('rv2er7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','ee000000-0000-4000-8000-00000000002e',5,'Network policies and ingress controllers explained with real examples.',NOW()),
      ('rv2er8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','ee000000-0000-4000-8000-00000000002e',4,'GitOps with ArgoCD section is an excellent bonus. Very well integrated.',NOW()),
      ('rv2fr5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','ef000000-0000-4000-8000-00000000002f',5,'MITRE ATT&CK section is superb. Detection rules coverage is outstanding.',NOW()),
      ('rv2fr6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','ef000000-0000-4000-8000-00000000002f',4,'Incident response process section helped me pass my SOC analyst interview.',NOW()),
      ('rv2fr7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','ef000000-0000-4000-8000-00000000002f',5,'SIEM architecture explained very clearly. Log management section is great.',NOW()),
      ('rv2fr8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','ef000000-0000-4000-8000-00000000002f',4,'Forensics and investigation section is unique and very well structured.',NOW()),
      ('rv30r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','f0000000-0000-4000-8000-000000000030',5,'TLS handshake finally makes complete sense. mTLS section is excellent.',NOW()),
      ('rv30r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','f0000000-0000-4000-8000-000000000030',4,'PKI and certificate lifecycle sections are very thorough and practical.',NOW()),
      ('rv30r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','f0000000-0000-4000-8000-000000000030',5,'Asymmetric cryptography explained from first principles. Great course.',NOW()),
      ('rv30r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','f0000000-0000-4000-8000-000000000030',4,'X.509 certificate structure section demystified years of confusion.',NOW()),
      ('rv31r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','f1000000-0000-4000-8000-000000000031',5,'App of Apps pattern section is a game changer for multi-env deployments.',NOW()),
      ('rv31r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','f1000000-0000-4000-8000-000000000031',4,'Argo Rollouts section is excellent. Progressive delivery covered in depth.',NOW()),
      ('rv31r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','f1000000-0000-4000-8000-000000000031',5,'Secrets management in GitOps section solved a real problem I had at work.',NOW()),
      ('rv31r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','f1000000-0000-4000-8000-000000000031',4,'GitOps principles explained from scratch. Sync policies covered very well.',NOW()),
      ('rv32r5-0000-4000-8000-000000000001','reviewer5-0000-4000-8000-000000000005','f2000000-0000-4000-8000-000000000032',5,'Error budget calculations and SLO burn rate alerting explained perfectly.',NOW()),
      ('rv32r6-0000-4000-8000-000000000002','reviewer6-0000-4000-8000-000000000006','f2000000-0000-4000-8000-000000000032',4,'Toil elimination section alone is worth this course. Very practical.',NOW()),
      ('rv32r7-0000-4000-8000-000000000003','reviewer7-0000-4000-8000-000000000007','f2000000-0000-4000-8000-000000000032',5,'Blameless postmortem culture section transformed our on-call practices.',NOW()),
      ('rv32r8-0000-4000-8000-000000000004','reviewer8-0000-4000-8000-000000000008','f2000000-0000-4000-8000-000000000032',4,'SRE vs DevOps distinction explained very clearly. Highly recommend.',NOW())
    `);

    console.log('✅ Database tables ready');
  } finally {
    conn.release();
  }
}

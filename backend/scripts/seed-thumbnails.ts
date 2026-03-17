/**
 * Seed course thumbnail URLs in the database.
 * Run with: cd backend && npx ts-node --skip-project scripts/seed-thumbnails.ts
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const categoryMap: Record<string, string> = {
  'Programming': '/course-thumbnails/programming.svg',
  'Web Development': '/course-thumbnails/web-development.svg',
  'Data Science': '/course-thumbnails/data-science.svg',
  'Design': '/course-thumbnails/design.svg',
  'Artificial Intelligence': '/course-thumbnails/artificial-intelligence.svg',
  'Cloud Computing': '/course-thumbnails/cloud-computing.svg',
  'Cybersecurity': '/course-thumbnails/cybersecurity.svg',
  'DevOps': '/course-thumbnails/devops.svg',
};

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  const conn = await pool.getConnection();

  try {
    for (const [category, thumbnailUrl] of Object.entries(categoryMap)) {
      const [result] = await conn.execute(
        'UPDATE `courses` SET `thumbnail_url` = ? WHERE `category` = ?',
        [thumbnailUrl, category],
      );
      const r = result as { affectedRows: number };
      console.log(`✅  ${category}: updated ${r.affectedRows} course(s) → ${thumbnailUrl}`);
    }
    console.log('\n🎉  Thumbnail seed complete.');
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

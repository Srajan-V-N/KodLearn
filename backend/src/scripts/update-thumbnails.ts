import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { pool } from '../config/database';

const OUTPUT_DIR = path.resolve(__dirname, '../../../frontend/public/course-thumbnails');

const THUMBNAILS: { category: string; url: string; file: string }[] = [
  {
    category: 'Programming',
    url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1280&q=80',
    file: 'programming.jpg',
  },
  {
    category: 'Web Development',
    url: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=1280&q=80',
    file: 'web-development.jpg',
  },
  {
    category: 'Data Science',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1280&q=80',
    file: 'data-science.jpg',
  },
  {
    category: 'Design',
    url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1280&q=80',
    file: 'design.jpg',
  },
  {
    category: 'Artificial Intelligence',
    url: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1280&q=80',
    file: 'artificial-intelligence.jpg',
  },
  {
    category: 'Cloud Computing',
    url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1280&q=80',
    file: 'cloud-computing.jpg',
  },
  {
    category: 'Cybersecurity',
    url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1280&q=80',
    file: 'cybersecurity.jpg',
  },
  {
    category: 'DevOps',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280&q=80',
    file: 'devops.jpg',
  },
];

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        download(res.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}`);
  }

  for (const { category, url, file } of THUMBNAILS) {
    const dest = path.join(OUTPUT_DIR, file);
    const publicPath = `/course-thumbnails/${file}`;

    process.stdout.write(`Downloading ${file}...`);
    try {
      await download(url, dest);
      console.log(' done');
    } catch (err) {
      console.error(` FAILED: ${(err as Error).message}`);
      continue;
    }

    try {
      const [result] = await pool.execute(
        'UPDATE courses SET thumbnail_url = ? WHERE category = ?',
        [publicPath, category],
      );
      const affected = (result as { affectedRows: number }).affectedRows;
      console.log(`  DB updated: ${affected} rows for category "${category}"`);
    } catch (err) {
      console.error(`  DB update FAILED for "${category}": ${(err as Error).message}`);
    }
  }

  await pool.end();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

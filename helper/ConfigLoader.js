import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ConfigLoader {
  static loadConfig(fileName) {
    const candidates = [
      path.resolve(process.cwd(), fileName),
      path.resolve(process.cwd(), 'playwright-tests', fileName),
      path.resolve(__dirname, '..', fileName),
      path.resolve(__dirname, fileName)
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      }
    }
    throw new Error(`Config file not found: ${fileName}`);
  }
}

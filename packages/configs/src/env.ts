import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 获取项目根目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../");

// 加载根目录的 .env 文件
config({ path: path.resolve(rootDir, ".env") });

// 导出环境变量配置
export const env = {
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
  TMDB_ACCESS_TOKEN: process.env.TMDB_ACCESS_TOKEN!,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY!,
} as const;

import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

// Node keeps existing deployment variables. This file is private and gitignored.
const path = fileURLToPath(new URL('../.env.local', import.meta.url));
if (existsSync(path)) loadEnvFile(path);

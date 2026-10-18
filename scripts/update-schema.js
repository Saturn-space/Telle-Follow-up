// Schema changes are managed through Prisma migrations. This legacy helper
// intentionally validates only and never rewrites either schema file.
const { execFileSync } = require('node:child_process');

console.log('Validating the canonical Prisma schema. Use prisma migrate dev to create migrations.');
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'validate', '--schema', 'prisma/schema.prisma'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

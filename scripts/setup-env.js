const fs = require('node:fs');

const source = '.env.example';
const target = '.env';

if (!fs.existsSync(source)) {
  throw new Error(`${source} is missing. Run this script from the repository root.`);
}

try {
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  console.log(`Created ${target} from placeholders. Add local credentials before starting the app.`);
} catch (error) {
  if (error && error.code === 'EEXIST') {
    console.log(`${target} already exists; it was left untouched.`);
  } else {
    throw error;
  }
}

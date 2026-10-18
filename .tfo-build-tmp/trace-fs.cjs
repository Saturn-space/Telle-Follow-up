const fs = require("node:fs");
function wrap(target, method) {
  const original = target[method];
  target[method] = function (...args) {
    try { return original.apply(this, args); }
    catch (error) {
      if (error && error.code === "EPERM") process.stderr.write(`FS TRACE ${method} ${String(args[0])}\n${new Error().stack}\n`);
      throw error;
    }
  };
}
wrap(fs, "readdirSync");
wrap(fs, "readdir");
wrap(fs.promises, "readdir");

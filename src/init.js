const fs = require("fs");
const path = require("path");

/**
 * @returns {void}
 */
function init() {
  const initFilesPath = path.resolve(__dirname, "init-files");
  const outputPath = path.resolve();

  fs.cpSync(initFilesPath, outputPath, { recursive: true });
}

module.exports = { init };

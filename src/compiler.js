const fs = require("fs");
const path = require("path");

/**
 * @param {string} dir
 * @param {string} appendDir
 * @param {string[]} paths
 * @returns {string[]}
 */
function getFiles(dir, appendDir = "", paths = []) {
  for (const name of fs.readdirSync(path.resolve(dir))) {
    const element = `${dir}/${name}`;
    const stat = fs.lstatSync(path.resolve(element));
    if (stat.isDirectory()) {
      getFiles(element, appendDir ? `${appendDir}/${name}` : name, paths);
    } else if (stat.isFile()) {
      paths.push(appendDir ? `${appendDir}/${name}` : name);
    }
  }

  return paths;
}

/**
 * @param {string} inputDir
 * @param {string} outputDir
 * @param {string[]} files
 * @returns {void}
 */
function copyFiles(inputDir, outputDir, files) {
  for (const file of files) {
    const filePath = path.resolve(`${inputDir}/${file}`);
    const newFilePath = path.resolve(`${outputDir}/${file}`);
    const newDirPath = path.dirname(newFilePath);

    fs.mkdirSync(newDirPath, { recursive: true });
    fs.copyFileSync(filePath, newFilePath);
  }
}

/**
 *
 * @param {string} dir
 * @returns {void}
 */
function removeFiles(dir) {
  if (fs.existsSync(path.resolve(dir))) {
    for (const name of fs.readdirSync(path.resolve(dir))) {
      fs.rmSync(path.resolve(dir, name), { recursive: true });
    }
  }
}

/**
 * @param {string} input
 * @param {string} output
 * @returns {void}
 */
function compile(input, output) {
  const inputFiles = getFiles(input);
  removeFiles(output);
  copyFiles(input, output, inputFiles);

  return;
}

module.exports = { compile };

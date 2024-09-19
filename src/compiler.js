const fs = require("fs");
const path = require("path");
const HTMLParser = require("node-html-parser");
const CSS = require("css");
const CSSWhat = require("css-what");
const assert = require("./assert");

let unicId = 0;
function getUnicId() {
  return `_htmc-${unicId++}`;
}

/**
 *
 * @param {string} filePath
 * @returns {string}
 */
function getFileContent(filePath) {
  return fs.readFileSync(path.resolve(filePath), "utf-8");
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
 * @param {string} file
 * @param {string} content
 * @returns {void}
 */
function createFile(file, content) {
  const filePath = path.resolve(file);
  const dirPath = path.dirname(filePath);

  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * @typedef {Object} Node
 * @property {string} id
 * @property {string} name
 * @property {string} style
 * @property {HTMLParser.HTMLElement} element
 * @property {Record<string, Node>} imports
 */

/**
 * @param {string} name
 * @param {string} filePath
 * @param {HTMLParser.HTMLElement} element
 * @returns {Node}
 */
function getNode(name, filePath, element) {
  const id = getUnicId();
  const dirPath = filePath.split("/").slice(0, -1).join("/");

  const style = (() => {
    const styleTags = element.getElementsByTagName("styles");

    let styles = "";
    for (const styleTag of styleTags) {
      const from = styleTag.attributes.from;
      assert(from, `${filePath} styles from must be specified`);
      styleTag.remove();

      const file = from.replace("./", "");
      styles += getFileContent(`${dirPath}/${file}`);
    }
    return styles;
  })();

  const imports = (() => {
    const importTags = element.getElementsByTagName("import");

    /** @type {Record<string, Node>} */
    const importRecord = {};

    for (const importTag of importTags) {
      const from = importTag.attributes.from;
      const as = importTag.attributes.as;
      assert(from, `${filePath} import from must be specified`);
      assert(as, `${filePath} import as must be specified`);
      importTag.remove();

      const file = from.replace("./", "");
      const content = getFileContent(`${dirPath}/${file}`);
      importRecord[as] = getNode(as, `${dirPath}/${file}`, HTMLParser.parse(content));
    }

    return importRecord;
  })();

  return { id, name, style, imports, element };
}

/**
 * @param {CSS.StyleRules} styleRules
 * @param {Node} node
 * @returns {void}
 */
function getStyle(styleRules, node) {
  const elementStylesheet = CSS.parse(node.style);
  for (const rule of elementStylesheet.stylesheet?.rules || []) {
    if (rule.type === "rule" && "selectors" in rule && rule.selectors) {
      for (let i = 0; i < rule.selectors.length; i++) {
        const selectors = CSSWhat.parse(rule.selectors[i]);
        for (const nestedSelectors of selectors) {
          for (let i = 0; i < nestedSelectors.length; i++) {
            const nestedSelector = nestedSelectors[i];
            if (nestedSelector.type === CSSWhat.SelectorType.Pseudo && nestedSelector.name === "host" && node.name) {
              nestedSelectors[i] = {
                type: CSSWhat.SelectorType.Pseudo,
                name: "is",
                data: [
                  [
                    {
                      type: CSSWhat.SelectorType.Attribute,
                      name: node.name,
                      action: CSSWhat.AttributeAction.Exists,
                      value: "",
                      namespace: null,
                      ignoreCase: null,
                    },
                  ],
                  [
                    {
                      type: CSSWhat.SelectorType.Tag,
                      name: node.name,
                      namespace: null,
                    },
                  ],
                ],
              };
            }
          }

          let index = 0;
          for (; index < nestedSelectors.length; index++) {
            const nestedSelector = nestedSelectors[i];
            if (
              nestedSelector.type === CSSWhat.SelectorType.Attribute ||
              nestedSelector.type === CSSWhat.SelectorType.Tag
            ) {
              break;
            }
          }

          nestedSelectors.splice(i + 1, 0, {
            type: CSSWhat.SelectorType.Attribute,
            name: node.id,
            action: CSSWhat.AttributeAction.Exists,
            value: "",
            namespace: null,
            ignoreCase: null,
          });
        }
        rule.selectors[i] = CSSWhat.stringify(selectors);
      }
    }
    styleRules.rules.push(rule);
  }
  for (const n of Object.values(node.imports)) {
    getStyle(styleRules, n);
  }
}

/**
 * @param {Node} root
 * @returns {string}
 */
function getStyleRoot(root) {
  const stylesheet = CSS.parse(root.style);
  if (!stylesheet.stylesheet) {
    throw Error("stylesheet for root node is not found");
  }
  for (const node of Object.values(root.imports)) {
    getStyle(stylesheet.stylesheet, node);
  }

  return CSS.stringify(stylesheet);
}

/**
 *
 * @param {HTMLParser.HTMLElement | null} element
 * @param {Node} node
 */
function getHtml(element, node) {
  if (element && node.name !== "root" && !element.rawAttrs.includes(node.id)) {
    element.rawAttrs += ` ${node.id}`;
  }

  for (const elem of node.element.childNodes) {
    if (elem instanceof HTMLParser.HTMLElement) {
      const tagName = (() => {
        if (elem.rawTagName in node.imports) {
          return elem.rawTagName;
        }
        for (const attr of Object.keys(elem.attributes)) {
          if (attr in node.imports) {
            return attr;
          }
        }
        return null;
      })();

      if (tagName) {
        if (node && node.name !== "root" && !elem.rawAttrs.includes(node.id)) {
          elem.rawAttrs += ` ${node.id}`;
        }
        getHtml(elem, node.imports[tagName]);
      } else {
        const elemCloned = elem.clone();
        elem.childNodes = [];
        if (elemCloned instanceof HTMLParser.HTMLElement) {
          getHtml(elem, { ...node, element: elemCloned });
        }
      }
    }
    element?.childNodes.push(elem);
  }
}

/**
 * @param {Node} root
 * @returns {string}
 */
function getHtmlRoot(root) {
  const body = root.element.getElementsByTagName("body")[0];
  assert(body);

  getHtml(null, { ...root, element: body });

  return root.element.toString();
}

/**
 * @param {string} input
 * @param {string} output
 * @returns {void}
 */
function copyAssets(input, output) {
  const inputDir = input.split("/").slice(0, -1).join("/");
  const publicDirPath = path.resolve(inputDir, "public");
  const outputDirPatn = path.resolve(output);

  if (fs.existsSync(publicDirPath)) {
    fs.cpSync(publicDirPath, outputDirPatn, { recursive: true });
  }
}

/**
 * @param {string} input
 * @param {string} output
 * @returns {void}
 */
function compile(input, output) {
  const content = getFileContent(input);
  const root = getNode("root", input, HTMLParser.parse(content));

  const headElement = root.element.getElementsByTagName("head")[0];
  assert(headElement);
  const style = new HTMLParser.HTMLElement("style", {});
  style.textContent = getStyleRoot(root);
  headElement.appendChild(style);

  removeFiles(output);
  let html = getHtmlRoot(root);
  try {
    const prettier = require("@prettier/sync");
    html = prettier.format(html, { parser: "html", printWidth: 10000 });
  } catch (e) {}
  createFile(`${output}/index.html`, html);
  copyAssets(input, output);
}

module.exports = { compile };

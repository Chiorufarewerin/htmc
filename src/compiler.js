const fs = require("fs");
const path = require("path");
const HTMLParser = require("node-html-parser");
const CSS = require("css");
const CSSWhat = require("css-what");
const assert = require("./assert");

let unicId = 1;
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
 * @param {string} filePath
 * @param {HTMLParser.HTMLElement} element
 * @returns {Node}
 */
function getNode(filePath, element) {
  const dirPath = filePath.split("/").slice(0, -1).join("/");

  let name = "";
  let style = "";
  /** @type {Record<string, Node>} */
  let imports = {};

  if (element.firstChild && element.firstChild instanceof HTMLParser.TextNode) {
    /** @type {string[]} */
    const content = [];
    for (const row of element.firstChild.text.split("\n")) {
      if (!row) {
        continue;
      }

      if (row.startsWith("@")) {
        if (row.startsWith("@name")) {
          name = row.split("'")[1];
        } else if (row.startsWith("@style")) {
          const file = row.split("'")[1].replace("./", "");
          style = getFileContent(`${dirPath}/${file}`);
        } else if (row.startsWith("@import")) {
          const file = row.split("'")[1].replace("./", "");
          const content = getFileContent(`${dirPath}/${file}`);
          const node = getNode(`${dirPath}/${file}`, HTMLParser.parse(content));
          imports[node.name] = node;
        } else {
          throw Error(`Unexpected property: ${row}`);
        }
        continue;
      }
      if (row) {
        content.push(row);
      }
    }
    if (content.length) {
      element.firstChild.rawText = content.join("\n");
    } else {
      element.firstChild.remove();
    }
  }

  return { id: getUnicId(), name, style, imports, element };
}

/**
 * @param {CSS.StyleRules} styleRules
 * @param {Node} node
 * @returns {void}
 */
function getStyle(styleRules, node) {
  const elementStylesheet = CSS.parse(node.style);
  if (!elementStylesheet.stylesheet) {
    return;
  }
  for (const rule of elementStylesheet.stylesheet.rules) {
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
          nestedSelectors.push({
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
      if (elem.rawTagName in node.imports) {
        getHtml(elem, node.imports[elem.rawTagName]);
      } else if (Object.keys(elem.attributes).some((attr) => attr in node.imports)) {
        for (const attr of Object.keys(elem.attributes)) {
          if (attr in node.imports) {
            getHtml(elem, node.imports[attr]);
          }
        }
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
function compile(input, output) {
  const content = getFileContent(input);
  const root = getNode(input, HTMLParser.parse(content));

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
}

module.exports = { compile };

#!/usr/bin/env node

const { compile } = require("./compiler");

function getHelpMessage() {
  return `usage: htmc compile -i src -o dist

options:

  -h, --help      Prints CLI usage,

compile options:

  -i, --input     Input directory.
                  Defaults to "src"
  -o, --output    Output directory.
                  Defaults to "dist"
`;
}

function main() {
  const params = process.argv.slice(2);

  if (params.length === 0 || params.includes("-h") || params.includes("--help")) {
    console.log(getHelpMessage());
    return;
  }

  const [command, ...options] = params;
  if (command !== "compile") {
    console.error(`htmc error: unexpected command: ${command}`);
    return;
  }

  let input = "src";
  let output = "dist";

  /** @type {string[]} */
  const unexpectedOptions = [];
  while (options.length) {
    const option = options.shift();
    switch (option) {
      case "-i":
      case "--input": {
        const arg = options.shift();
        if (!arg) {
          console.error(`htmc error: compile: input is not defined`);
          return;
        }
        input = arg;
        break;
      }
      case "-o":
      case "--output": {
        const arg = options.shift();
        if (!arg) {
          console.error(`htmc error: compile: input is not defined`);
          return;
        }
        output = arg;
        break;
      }
      default: {
        if (option) {
          unexpectedOptions.push(option);
        }
      }
    }
  }

  if (unexpectedOptions.length) {
    console.error(`htmc error: compile: unexpected option: ${unexpectedOptions}`);
    return;
  }

  compile(input, output);
}

main();

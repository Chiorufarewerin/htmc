#!/usr/bin/env node

const { compile } = require("./compiler");
const { init } = require("./init");

function getHelpMessage() {
  return `usage:

htmc init
htmc compile -i src/index.html -o dist

options:

  -h, --help      Prints CLI usage,

compile options:

  -i, --input     Input file.
                  Defaults to "src/index.html"
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

  switch (command) {
    case "init": {
      if (options.length) {
        console.error(`htmc error: input: unexpected option ${options}`);
        return;
      }
      init();
      break;
    }
    case "compile": {
      let input = "src/index.html";
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
      break;
    }
    default: {
      console.error(`htmc error: unexpected command: ${command}`);
    }
  }
}

main();

# HTMC - html compiler

The tool that allows you to generate a static HTML site from different structured parts.

## Installation

`npm install -g htmc-cli@latest`

## Quick setup

`npx htmc init`

In the current folder will be generated the initial file structure below:

```
- src/index.html
- src/style.css
- src/favicon.ico
- src/assets/.gitkeep
- src/app/content/content.html
- src/app/content/content.css
```

Then you can run: `npx htmc compile`. It will compile this app into **dist** folder.

You can use **http-server** to run this app:

```
npm install -g http-server
npx http-server dist
```

## Usage

```
htmc init
htmc compile

options:

  -h, --help      Prints CLI usage,

compile options:

  -i, --input     Input file.
                  Defaults to "src/index.html"
  -o, --output    Output directory.
                  Defaults to "dist"
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://github.com/Chiorufarewerin/htmc/blob/main/LICENSE)

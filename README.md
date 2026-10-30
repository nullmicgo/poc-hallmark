# poc-hallmark

A local web page that runs the **real** [`hallmark` sloplint](https://github.com/Nutlope/hallmark)
on HTML, and shows its own findings.

Upstream: **https://github.com/Nutlope/hallmark** (MIT).

`sloplint.mjs` here is the upstream linter as distributed with the npm package. The wrapper
adds no opinions: it runs the tool and prints what it returns.

## Run locally

```
node server.js
```

Then open <http://127.0.0.1:4173>.

## What it is and is not

- **It is** a thin front end over a real linter, so every finding on screen is the tool's own.
- **It is not** the tool itself, and it is not a deploy. There is no hosted instance.
- `out-slop.txt` and `out-clean.txt` are the tool's output for one failing page and one clean
  page, kept as evidence of what it reports.

## Licence

Wrapper MIT. `hallmark` is MIT; its `sloplint` is included unmodified.

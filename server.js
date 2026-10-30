const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
                ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };

function lint(target) {
  const r = spawnSync(process.execPath, [path.join(ROOT, "sloplint.mjs"), target, "--json"], { cwd: ROOT });
  const text = r.stdout.toString("utf8");
  let pua = 0, fffd = 0;
  for (const ch of text) {
    const n = ch.codePointAt(0);
    if (n >= 0xE000 && n <= 0xF8FF) pua++;
    else if (n === 0xFFFD) fffd++;
  }
  const report = JSON.parse(text);
  return { report, pua, fffd, exit: r.status };
}

const page = () => {
  const slop = lint("slop");
  const clean = lint("clean");
  const rows = [["slop", slop], ["clean", clean]].map(([name, x]) => {
    const s = x.report.summary;
    const fails = (x.report.findings || x.report.results || [])
      .filter(f => f.grade === "FAIL" || f.tier === "floor")
      .map(f => `<li><code>${f.gate}</code> ${escapeHtml(String(f.evidence || ""))}</li>`).join("");
    return `<tr>
      <td><a href="/${name}/index.html">${name}</a></td>
      <td class="num bad">${s.fails}</td>
      <td class="num">${s.reflex}</td>
      <td class="num">${s.warns}</td>
      <td class="num ${x.pua || x.fffd ? "bad" : "ok"}">${x.pua} / ${x.fffd}</td>
      <td><ul class="fails">${fails || "<li class=\"ok\">no floor failures</li>"}</ul></td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>hallmark sloplint, local POC</title>
<style>
 html,body{overflow-x:clip}
 :root{--ink:#1a1a1a;--soft:#4a4a4a;--paper:#f7f5f0;--line:#c9c4ba;--accent:#8a3b12;--bad:#8a1c1c;--ok:#1c5b2e;--focus:#0b5fff}
 body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 Georgia,serif}
 .wrap{max-width:56rem;margin:0 auto;padding:3rem 1.5rem 5rem}
 h1{font-size:2.1rem;line-height:1.15;margin:0 0 .5rem}
 h2{font-size:1.2rem;margin:2.5rem 0 .5rem}
 p{margin:0 0 1rem}.lede{color:var(--soft);max-width:40rem}
 table{width:100%;border-collapse:collapse;margin-top:1rem;font-size:.95rem}
 th,td{text-align:left;padding:.6rem .5rem;border-bottom:1px solid var(--line);vertical-align:top}
 th{font-weight:600}.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
 .bad{color:var(--bad);font-weight:600}.ok{color:var(--ok)}
 ul.fails{margin:0;padding-left:1.1rem}li{margin:.15rem 0}
 code{font-family:ui-monospace,Consolas,monospace;font-size:.85rem;background:#eceae4;padding:.05rem .3rem}
 a:focus-visible,button:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
 button{font:inherit;padding:.6rem 1rem;border:0;background:var(--accent);color:#fdfcfa;cursor:pointer;border-radius:2px}
 .note{color:var(--soft);font-size:.9rem;margin-top:2rem}
</style></head>
<body><main class="wrap">
<h1>hallmark's sloplint, run on two pages</h1>
<p class="lede">The real <code>sloplint.mjs</code> from <code>github.com/Nutlope/hallmark</code>, run twice on this machine. Same tool, same run, two pages: one written to look AI generated, one written to the rules. The numbers below are the tool's own JSON, not typed in.</p>

<table>
<thead><tr><th>page</th><th class="num">floor fails</th><th class="num">reflex</th><th class="num">warn</th><th class="num">PUA / FFFD</th><th>what it flagged</th></tr></thead>
<tbody>${rows}</tbody></table>

<p class="note">Reload to re-lint both pages live. Floor gates never ship; reflex gates can be overruled on the record. The PUA and U+FFFD columns count the tool's own JSON output, because a report that arrives mangled is a report you cannot trust.</p>
</main></body></html>`;
};

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const body = Buffer.from(page(), "utf8");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": body.length });
    return res.end(body);
  }
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "").replace(/\//g, path.sep);
  const file = path.resolve(ROOT, rel);
  if (!file.startsWith(path.resolve(ROOT))) { res.writeHead(403); return res.end("no"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); return res.end("not found"); }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "content-length": data.length });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`hallmark POC running at http://localhost:${PORT}/`);
  console.log(`  http://localhost:${PORT}/slop/index.html`);
  console.log(`  http://localhost:${PORT}/clean/index.html`);
});

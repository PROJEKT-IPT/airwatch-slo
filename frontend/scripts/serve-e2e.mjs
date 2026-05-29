import { build } from 'esbuild'
import { createServer } from 'node:http'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outDir = join(rootDir, 'dist-e2e')
const assetsDir = join(outDir, 'assets')
const host = '127.0.0.1'
const port = 4173

await rm(outDir, { recursive: true, force: true })
await mkdir(assetsDir, { recursive: true })

await build({
  absWorkingDir: rootDir,
  entryPoints: ['././src/main.jsx'],
  bundle: true,
  format: 'esm',
  outfile: './dist-e2e/assets/main.js',
  jsx: 'automatic',
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx',
    '.css': 'css',
    // Leaflet's CSS references image assets via url(...); inline them as data
    // URLs so the esbuild e2e bundle resolves them (Vite handles this natively).
    '.png': 'dataurl',
    '.svg': 'dataurl',
    '.gif': 'dataurl',
  },
  define: {
    // Mirror production: base URL = deployed backend, endpoint path = /api/v1/...
    // (single prefix). Playwright intercepts these requests with page.route.
    'import.meta.env.VITE_API_URL': '"https://airwatch-slo-production.up.railway.app"',
  },
})

const htmlTemplate = await readFile(join(rootDir, 'index.html'), 'utf8')
const indexHtml = htmlTemplate
  .replace('/src/main.jsx', '/assets/main.js')
  .replace('</head>', '    <link rel="stylesheet" href="/assets/main.css" />\n  </head>')

await writeFile(join(outDir, 'index.html'), indexHtml, 'utf8')

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

const server = createServer(async (request, response) => {
  try {
    const requestPath = request.url === '/' ? '/index.html' : request.url ?? '/index.html'
    const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, '')
    const filePath = join(outDir, safePath)

    const fileInfo = await stat(filePath)
    if (!fileInfo.isFile()) {
      response.writeHead(404)
      response.end('Not found')
      return
    }

    const body = await readFile(filePath)
    response.writeHead(200, {
      'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
    })
    response.end(body)
  } catch (error) {
    response.writeHead(404)
    response.end('Not found')
  }
})

server.listen(port, host, () => {
  process.stdout.write(`E2E server ready at http://${host}:${port}\n`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0)
    })
  })
}

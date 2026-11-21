import { build } from 'esbuild'
import { cp, lstat, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'lib')
if (path.dirname(out) !== root || path.basename(out) !== 'lib') throw new Error('Unexpected output directory')
try { if ((await lstat(out)).isSymbolicLink()) throw new Error('Output directory must not be a symlink') }
catch (error) { if (error.code !== 'ENOENT') throw error }
await rm(out, { recursive: true, force: true })
await mkdir(path.join(out, 'client'), { recursive: true })
await cp(path.join(root, 'src/index.js'), path.join(out, 'index.js'))
const result = await build({
  absWorkingDir: root, entryPoints: ['src/client/index.js'], outfile: path.join(out, 'client/index.js'),
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, metafile: true,
  loader: { '.css': 'text' }, external: ['react', 'react-dom', '@luckylillia-dev/plugin-sdk/webui'],
})
const imports = Object.values(result.metafile.outputs).flatMap(output => output.imports)
if (imports.some(item => !item.external)) throw new Error('The client must be a single self-contained ES module')
await writeFile(path.join(root, 'lib/build.json'), JSON.stringify({ client: 'client/index.js', imports: imports.map(item => item.path) }, null, 2) + '\n')
console.log('Built Liuguang theme: browser module, managed styles and backend entry')

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const configPath = path.resolve(__dirname, '..', '..', 'config.json')

const config = JSON.parse(await readFile(configPath, 'utf-8'))

export default config

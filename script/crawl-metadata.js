/**
 * 爬取 quran.com 元数据（章节、翻译、经注）
 * 使用公开 API，无需 OAuth 认证
 *
 * 用法: node script/craw-metadata.js
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

const BASE_URL = 'https://api.quran.com/api/v4'
const OUTPUT_DIR = 'data/metadata'

async function fetchJSON(path, params = {}) {
    const url = new URL(`${BASE_URL}${path}`)
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v)
    }
    const res = await fetch(url)
    if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText} — ${url}`)
    }
    return res.json()
}

// Ensure output dir
if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
}

console.log('正在拉取元数据...\n')

// 1. 章节列表
process.stdout.write('[1/3] 章节列表 (chapters)...')
const { chapters } = await fetchJSON('/chapters', { language: 'zh' })
await writeFile(
    `${OUTPUT_DIR}/chapters.json`,
    JSON.stringify(chapters, null, 2)
)
console.log(` ✓ (${chapters.length} 章)`)

// 2. 翻译列表
process.stdout.write('[2/3] 翻译列表 (translations)...')
const { translations } = await fetchJSON('/resources/translations', { language: 'zh' })
await writeFile(
    `${OUTPUT_DIR}/translations.json`,
    JSON.stringify(translations, null, 2)
)
console.log(` ✓ (${translations.length} 个翻译)`)

// 3. 经注列表
process.stdout.write('[3/3] 经注列表 (tafsirs)...')
const { tafsirs } = await fetchJSON('/resources/tafsirs', { language: 'zh' })
await writeFile(
    `${OUTPUT_DIR}/tafsirs.json`,
    JSON.stringify(tafsirs, null, 2)
)
console.log(` ✓ (${tafsirs.length} 个经注)`)

console.log(`\n完成！文件已保存到 ${OUTPUT_DIR}/`)

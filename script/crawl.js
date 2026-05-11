import { QuranClient, Language } from '@quranjs/api'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const CLIENT_ID = process.env.QURAN_API_ID
const CLIENT_SECRET = process.env.QURAN_API_SECRET

const PER_PAGE = 50
const OUTPUT_DIR = "output"
const TRANSLATIONS = [20, 56] // Sahih International, Chinese (Ma Jian)

const VERSE_FIELDS = {
    chapterId: false,
    textUthmani: true,
    textUthmaniSimple: false,
    textImlaei: false,
    textImlaeiSimple: false,
}

const TRANSLATION_FIELDS = {
    resourceName: false,
    verseId: false,
    languageId: true,
    languageName: true,
    verseKey: false,
    chapterId: false,
    verseNumber: false,
    juzNumber: false,
    hizbNumber: false,
    rubNumber: false,
    pageNumber: false,
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchChapterVerses(client, chapterId, versesCount) {
    const totalPages = Math.ceil(versesCount / PER_PAGE)
    const allVerses = []

    for (let page = 1; page <= totalPages; page++) {
        const verses = await client.verses.findByChapter(String(chapterId), {
            translations: TRANSLATIONS,
            words: false,
            perPage: PER_PAGE,
            page,
            fields: VERSE_FIELDS,
            translationFields: TRANSLATION_FIELDS,
        })
        allVerses.push(...verses)
        if (totalPages > 1) {
            process.stdout.write(` p${page}/${totalPages}`)
        }
        await sleep(3000) // Be a good muslim, don't CC/DoS the API :P
    }

    return allVerses
}

const args = process.argv.slice(2)

// Parse arguments
let startChapter = 1
let endChapter = 114
let resumeFrom = null

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--start': case '-s':
            startChapter = parseInt(args[++i], 10); break
        case '--end': case '-e':
            endChapter = parseInt(args[++i], 10); break
        case '--resume': case '-r':
            resumeFrom = parseInt(args[++i], 10); break
        case '--help': case '-h':
            console.log(`用法: node crawl.js [选项]

选项:
  -s, --start <n>   起始章节 (默认: 1)
  -e, --end <n>     结束章节 (默认: 114)
  -r, --resume <n>  从第 n 章恢复 (跳过已有文件)
  -h, --help        显示帮助`)
            process.exit(0)
    }
}

if (resumeFrom !== null) {
    startChapter = resumeFrom
}

// Read chapters.json
// this is fetched ahead of time, using `client.client.chapters.findAll()`
const chapters = JSON.parse(await readFile('chapters.json', 'utf-8'))

// Ensure output dir
if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
}

const client = new QuranClient({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    defaults: { language: Language.CHINESE },
})

const selected = chapters.filter(c => c.id >= startChapter && c.id <= endChapter)
console.log(`准备爬取第 ${startChapter}–${endChapter} 章，共 ${selected.length} 章\n`)

for (const chapter of selected) {
    const outFile = join(OUTPUT_DIR, `${String(chapter.id).padStart(3, '0')}-${chapter.nameSimple.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`)

    // Skip if resume mode and file exists
    if (resumeFrom !== null && existsSync(outFile)) {
        console.log(`[${chapter.id}/114] ${chapter.nameSimple} — 已存在，跳过`)
        continue
    }

    process.stdout.write(`[${chapter.id}/114] ${chapter.nameSimple} (${chapter.versesCount} 节)`)

    try {
        const verses = await fetchChapterVerses(client, chapter.id, chapter.versesCount)

        const result = {
            id: chapter.id,
            nameSimple: chapter.nameSimple,
            nameArabic: chapter.nameArabic,
            versesCount: chapter.versesCount,
            revelationPlace: chapter.revelationPlace,
            verses,
        }

        await writeFile(outFile, JSON.stringify(result, null, 2))
        console.log(` ✓`)
    } catch (err) {
        console.error(` ✗ ${err.message}`)
        console.error(`  可以用 --resume ${chapter.id} 从这里恢复`)
        process.exit(1)
    }
}

console.log('\n完成！')

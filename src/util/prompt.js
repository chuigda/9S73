import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const promptDir = path.resolve(__dirname, '..', '..', 'prompt')

export const loadPrompt = async (name) => {
    return await readFile(path.join(promptDir, name), 'utf-8')
}

const rangeSelectSystem = await loadPrompt('range-select-system.xml')
const rangeSelectUser = await loadPrompt('range-select-user.xml')

export const buildRangeSelectPrompt = (surah, targetVerse, surroundingVerses) => {
    const versesText = surroundingVerses
        .map(v => `[${v.verseNumber}] ${v.textUthmani}\n    ${v.translations.find(t => t.languageName === 'chinese')?.text || v.translations[0]?.text || ''}`)
        .join('\n\n')

    const user = rangeSelectUser
        .replace('{{chapterName}}', surah.nameSimple)
        .replace('{{chapterNameArabic}}', surah.nameArabic)
        .replace('{{chapterNumber}}', String(surah.id))
        .replace('{{targetVerseNumber}}', String(targetVerse.verseNumber))
        .replace('{{verses}}', versesText)

    return { system: rangeSelectSystem, user }
}

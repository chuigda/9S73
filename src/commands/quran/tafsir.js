import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SlashCommandBuilder } from 'discord.js'

import { executeGetTafsirRange } from '../../tool/get-tafsir-range.js'
import { chatLLM } from '../../util/llm.js'
import { tafsirTranslateSystem } from '../../util/prompt.js'
import { parseVerseNumber } from '../../util/verse-num.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '..', '..', '..', 'data')

export const data = new SlashCommandBuilder()
    .setName('tafsir')
    .setDescription('查询指定经文范围的经注')
    .addStringOption(option => option
        .setName('verse')
        .setDescription('经文编号，如 2:32，13:11，96:6-7 等')
        .setRequired(true))
    .addStringOption(option => option
        .setName('src')
        .setDescription('经注来源（留空默认 LLM 合成）')
        .addChoices(
            { name: 'LLM-Hybrid - Let LLM synthesize them', value: 'llm' },
            { name: 'Tafsir Ibn Kathir (Abridged) - Hafiz ibn Kathir', value: 'tafsir_ibn_kathir' },
            { name: 'Tazkirul Quran - Maulana Wakhiddudin Khan', value: 'tazkirul_quran' },
            { name: "Ma'ariful Quran - Mufti Shafi Muhammad Usmani", value: 'maarif_al_quran' }
        )
    )

const loadSurah = async chapter => {
    const surahDir = path.join(dataDir, 'surah')
    const files = (await readdir(surahDir)).filter(f => f.endsWith('.json'))
    const targetFile = files.find(f => parseInt(f.split('-')[0], 10) === chapter)
    if (!targetFile) return null
    return JSON.parse(await readFile(path.join(surahDir, targetFile), 'utf-8'))
}

/**
 * 按行拆分文本为不超过 maxLen 的消息块
 * 尽量在换行处断开，不会把一行拆到两条消息里
 */
const splitMessages = (text, maxLen = 1900) => {
    const lines = text.split('\n')
    const chunks = []
    let current = ''

    for (const line of lines) {
        // 单行超长时强制截断
        if (line.length > maxLen) {
            if (current) {
                chunks.push(current)
                current = ''
            }
            for (let i = 0; i < line.length; i += maxLen) {
                chunks.push(line.slice(i, i + maxLen))
            }
            continue
        }

        if (current.length + line.length + 1 > maxLen) {
            chunks.push(current)
            current = line
        } else {
            current = current ? current + '\n' + line : line
        }
    }

    if (current) chunks.push(current)
    return chunks
}

export const execute = async interaction => {
    const verseInput = interaction.options.getString('verse')
    const source = interaction.options.getString('src')

    await interaction.deferReply()

    // 解析经文编号
    const parsed = parseVerseNumber(verseInput)
    if (typeof parsed === 'string') {
        await interaction.editReply(`输入格式错误: ${parsed}`)
        return
    }

    const [chapter, start, end] = parsed

    // 加载章节数据
    const surah = await loadSurah(chapter)
    if (!surah) {
        await interaction.editReply(`未找到第 ${chapter} 章`)
        return
    }

    // 默认采用 LLM 合成模式
    const effectiveSource = source ?? 'llm'

    if (effectiveSource === 'llm') {
        await interaction.editReply('LLM 合成模式尚未实现，请选择具体经注来源。')
        return
    }

    // 执行经注查询
    const verseRange = start === end ? `${chapter}:${start}` : `${chapter}:${start}-${end}`
    const result = executeGetTafsirRange(surah, { start, end, sources: [effectiveSource] })

    // 构建经文参考文本
    const selectedVerses = surah.verses.filter(
        v => v.verseNumber >= start && v.verseNumber <= end
    )
    const verseLines = selectedVerses.map(v => {
        const cn = v.translations.find(t => t.languageName === 'chinese')?.text || ''
        return `[${v.verseNumber}] ${v.textUthmani}\n${cn}`
    }).join('\n\n')

    const userPrompt = `<verse range="${verseRange}">\n${verseLines}\n</verse>\n${result}`

    // LLM 翻译
    const translated = await chatLLM({
        system: tafsirTranslateSystem,
        user: userPrompt,
    })

    if (!translated) {
        await interaction.editReply(`翻译失败，请稍后再试。`)
        return
    }

    // 格式化输出
    const SOURCE_TITLE = {
        tafsir_ibn_kathir: 'Tafsir Ibn Kathir',
        maarif_al_quran: "Ma'arif al-Qur'an",
        tazkirul_quran: 'Tazkirul Quran',
    }
    const sourceTitle = SOURCE_TITLE[effectiveSource] || effectiveSource
    const header = `**${sourceTitle} · ${verseRange}**`

    const verseBlock = selectedVerses.map(v => {
        const cn = v.translations.find(t => t.languageName === 'chinese')?.text || ''
        return `> ${v.textUthmani}\n> ${cn}`
    }).join('\n\n')

    const fullText = `${header}\n\n${verseBlock}\n\n${translated}`
    const chunks = splitMessages(fullText)

    // 第一条用 editReply，后续用 followUp
    await interaction.editReply(chunks[0])
    for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp(chunks[i])
    }
}

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SlashCommandBuilder } from 'discord.js'

import { queryLLM } from '../../util/llm.js'
import { buildRangeSelectPrompt } from '../../util/prompt.js'
import { getVerses, executeGetVerses } from '../../tool/select-verse-range.js'
import { parseVerseNumber } from '../../util/verse-num.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '..', '..', '..', 'data')

const pickRandomSurah = async () => {
    const surahDir = path.join(dataDir, 'surah')
    const files = (await readdir(surahDir)).filter(f => f.endsWith('.json'))
    const file = files[Math.floor(Math.random() * files.length)]
    const content = JSON.parse(await readFile(path.join(surahDir, file), 'utf-8'))
    return content
}

const formatVerseOutput = (surah, verses) => {
    const header = verses.length === 1
        ? `**${surah.id}:${verses[0].verseNumber}**`
        : `**${surah.id}:${verses[0].verseNumber}-${verses.at(-1).verseNumber}**`
    const lines = verses.map(v => {
        const cn = v.translations.find(t => t.languageName === 'chinese')?.text || ''
        return `> ${v.textUthmani}\n> ${cn}`
    })
    return `${header}\n\n${lines.join('\n\n')}`
}

const randomVerse = async interaction => {
    await interaction.deferReply()

    try {
        // 1. 随机选取一章
        const surah = await pickRandomSurah()
        const verses = surah.verses

        // 2. 随机选取一条经文
        const targetIndex = Math.floor(Math.random() * verses.length)
        const targetVerse = verses[targetIndex]

        // 3. 获取周围 ±5 条经文
        const startIdx = Math.max(0, targetIndex - 5)
        const endIdx = Math.min(verses.length, targetIndex + 6)
        const surroundingVerses = verses.slice(startIdx, endIdx)

        // 4. 构建提示词并调用 LLM
        const prompt = buildRangeSelectPrompt(surah, targetVerse, surroundingVerses)
        const llmResult = await queryLLM(prompt, [getVerses], (name, args) => executeGetVerses(verses, args))

        let selectedVerses
        if (llmResult && llmResult.start && llmResult.end) {
            // 根据 LLM 返回的范围筛选经文
            selectedVerses = verses.filter(
                v => v.verseNumber >= llmResult.start && v.verseNumber <= llmResult.end
            )
        }

        // 如果 LLM 未返回有效结果，回退到仅输出目标经文
        if (!selectedVerses || selectedVerses.length === 0) {
            selectedVerses = [targetVerse]
        }

        // 5. 格式化并输出
        const output = formatVerseOutput(surah, selectedVerses)
        await interaction.editReply(output)
    } catch (error) {
        console.error('randomVerse error:', error)
        await interaction.editReply('获取随机经文时出错，请稍后再试。')
    }
}

export const data = new SlashCommandBuilder()
    .setName('quran')
    .setDescription('查询随机或指定的古兰经文')
    .addStringOption(option => option.setName('verse').setDescription('经文编号，如 2:32，13:11，96:6-7 等；留空则输出随机经文'))

const specificVerse = async (interaction, verseInput) => {
    await interaction.deferReply()

    try {
        const parsed = parseVerseNumber(verseInput)
        if (typeof parsed === 'string') {
            await interaction.editReply(`输入格式错误: ${parsed}`)
            return
        }

        const [chapter, start, end] = parsed

        // 根据章节号找到对应文件
        const surahDir = path.join(dataDir, 'surah')
        const files = (await readdir(surahDir)).filter(f => f.endsWith('.json'))
        const targetFile = files.find(f => {
            const num = parseInt(f.split('-')[0], 10)
            return num === chapter
        })

        if (!targetFile) {
            await interaction.editReply(`未找到第 ${chapter} 章`)
            return
        }

        const surah = JSON.parse(await readFile(path.join(surahDir, targetFile), 'utf-8'))

        // 筛选经文 (inclusive end)
        const selectedVerses = surah.verses.filter(
            v => v.verseNumber >= start && v.verseNumber <= end
        )

        if (selectedVerses.length === 0) {
            await interaction.editReply(`第 ${chapter} 章中未找到经文 ${start}-${end}`)
            return
        }

        const output = formatVerseOutput(surah, selectedVerses)
        await interaction.editReply(output)
    } catch (error) {
        console.error('specificVerse error:', error)
        await interaction.editReply('获取指定经文时出错，请稍后再试。')
    }
}

export const execute = async interaction => {
    const verse = interaction.options.getString('verse')
    if (!verse) {
        await randomVerse(interaction)
    } else {
        await specificVerse(interaction, verse)
    }
}

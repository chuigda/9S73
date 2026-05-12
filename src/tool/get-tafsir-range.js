/**
 * OpenAI function tool 定义：获取指定范围经文的经注
 * LLM 可调用此工具来获取与指定经文范围交错的经注内容
 */
export const getTafsirRange = {
    type: 'function',
    function: {
        name: 'get_tafsir_range',
        description: 'Fetch tafsir (commentary) entries that overlap with the specified verse range in the current chapter. Returns matching commentary from Ibn Kathir, Maarif al-Quran, and Tazkirul Quran.',
        parameters: {
            type: 'object',
            properties: {
                start: {
                    type: 'integer',
                    description: 'The starting verse number (inclusive)',
                },
                end: {
                    type: 'integer',
                    description: 'The ending verse number (inclusive)',
                },
                sources: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: ['tafsir_ibn_kathir', 'maarif_al_quran', 'tazkirul_quran'],
                    },
                    description: 'Which tafsir sources to include. If omitted, all sources are returned.',
                },
            },
            required: ['start', 'end'],
        },
    },
}

/**
 * 判断两个范围是否交错（overlap）
 * 范围 [a1, a2] 与 [b1, b2] 交错的条件：a1 <= b2 && b1 <= a2
 */
const rangesOverlap = (aStart, aEnd, bStart, bEnd) =>
    aStart <= bEnd && bStart <= aEnd

/**
 * 从 HTML 文本中去除标签，保留纯文本
 */
const stripHtml = html =>
    html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

/**
 * tafsir 源名称到 surah JSON 中字段名的映射
 */
const SOURCE_FIELD_MAP = {
    tafsir_ibn_kathir: 'tafsirIbnKathir',
    maarif_al_quran: 'maarifAlQuran',
    tazkirul_quran: 'tazkirulQuran',
}

const SOURCE_DISPLAY_NAME = {
    tafsir_ibn_kathir: 'Tafsir Ibn Kathir',
    maarif_al_quran: "Ma'ariful Quran",
    tazkirul_quran: 'Tazkirul Quran',
}

/**
 * 执行 get_tafsir_range 工具调用：从章节数据中提取与指定范围交错的经注
 *
 * @param {object} surahData - 完整的 surah JSON 数据
 * @param {object} params - { start, end, sources? }
 * @returns {string} 格式化的经注文本
 */
export const executeGetTafsirRange = (surahData, { start, end, sources }) => {
    const activeSources = sources && sources.length > 0
        ? sources
        : Object.keys(SOURCE_FIELD_MAP)

    const tafsirElements = []

    for (const source of activeSources) {
        const fieldName = SOURCE_FIELD_MAP[source]
        if (!fieldName) continue

        const entries = surahData[fieldName]
        if (!entries || !Array.isArray(entries)) continue

        const matched = entries.filter(entry =>
            rangesOverlap(start, end, entry.startVerse, entry.endVerse)
        )

        if (matched.length === 0) continue

        const sourceId = source.replace(/_/g, '-')
        const verseElements = matched.map(entry => {
            const text = stripHtml(entry.text)
            if (entry.startVerse === entry.endVerse) {
                return `    <verse verse="${entry.startVerse}">\n      ${text}\n    </verse>`
            }
            return `    <verse start="${entry.startVerse}" end="${entry.endVerse}">\n      ${text}\n    </verse>`
        })

        tafsirElements.push(`  <tafsir id="${sourceId}">\n${verseElements.join('\n')}\n  </tafsir>`)
    }

    const verseAttr = start === end
        ? `${surahData.id}:${start}`
        : `${surahData.id}:${start}-${end}`

    if (tafsirElements.length === 0) {
        return `<tafsirs range="${verseAttr}" />`
    }

    return `<tafsirs range="${verseAttr}">\n${tafsirElements.join('\n')}\n</tafsirs>`
}

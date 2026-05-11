/**
 * OpenAI function tool 定义：获取额外经文
 * LLM 可调用此工具来获取当前上下文范围之外的经文内容
 */
export const getVerses = {
    type: 'function',
    function: {
        name: 'get_verses',
        description: 'Fetch additional verses from the current chapter beyond the initially provided context. Use this when you need more surrounding context to determine a coherent passage.',
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
            },
            required: ['start', 'end'],
        },
    },
}

/**
 * 执行 get_verses 工具调用：从章节数据中提取指定范围的经文
 */
export const executeGetVerses = (surahVerses, { start, end }) => {
    const selected = surahVerses.slice(Math.max(0, start - 1), end)
    return selected.map(v => {
        const cn = v.translations.find(t => t.languageName === 'chinese')?.text || v.translations[0]?.text || ''
        return `[${v.verseNumber}] ${v.textUthmani}\n    ${cn}`
    }).join('\n\n')
}

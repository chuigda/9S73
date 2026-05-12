import OpenAI from 'openai'

import config from './config.js'

const openai = new OpenAI({
    baseURL: config.openai.baseURL,
    apiKey: config.openai.apiKey,
})

/**
 * 简单 LLM 调用（无 tool calling），用于翻译等纯文本任务
 *
 * @param {{ system: string, user: string }} prompt - 系统和用户提示词
 * @param {object} [options] - 可选参数
 * @param {number} [options.temperature] - 温度，默认 0.3
 * @returns {string|null} LLM 返回的文本，或 null
 */
export const chatLLM = async ({ system, user }, { temperature = 0.3 } = {}) => {
    const model = config.openai.translationModel || config.openai.model
    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
        temperature,
    })
    return response.choices[0]?.message?.content?.trim() || null
}

/**
 * 通用 LLM 查询，支持 tool call 循环
 *
 * @param {{ system: string, user: string }} prompt - 系统和用户提示词
 * @param {Array} tools - OpenAI function tool 定义数组
 * @param {(name: string, args: object) => string} executeTool - 工具执行回调
 * @returns {object|null} 解析后的 JSON 结果，或 null
 */
export const queryLLM = async ({ system, user }, tools, executeTool) => {
    const messages = [
        { role: 'system', content: system },
        { role: 'user', content: user },
    ]

    // tool call 循环：LLM 可多次请求工具
    for (let i = 0; i < 5; i++) {
        const response = await openai.chat.completions.create({
            model: config.openai.model,
            messages,
            tools,
            temperature: 0.3,
        })

        const choice = response.choices[0]

        // LLM 决定调用工具
        if (choice.finish_reason === 'tool_calls' || choice.message.tool_calls?.length) {
            messages.push(choice.message)

            for (const toolCall of choice.message.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments)
                const result = executeTool(toolCall.function.name, args)
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: result,
                })
            }
            continue
        }

        // LLM 返回最终文本结果
        const text = choice.message.content.trim()
        const jsonMatch = text.match(/\{[\s\S]*?\}/)
        if (!jsonMatch) return null
        try {
            return JSON.parse(jsonMatch[0])
        } catch {
            return null
        }
    }

    return null
}

import { SlashCommandBuilder } from 'discord.js'


export const data = new SlashCommandBuilder()
    .setName('tafsir')
    .setDescription('查询随机或指定的古兰经经文的经注')
    .addStringOption(option => option
        .setName('verse')
        .setDescription('经文编号，如 2:32，13:11，96:6-7 等')
        .setRequired(true))
    .addStringOption(option => option
        .setName('src')
        .setDescription('经注来源')
        .addChoices(
            { name: 'Tafsir Ibn Kathir (Abridged) - Hafiz ibn Kathir', value: 'tafsir_ibn_kathir' },
            { name: 'Tazkirul Quran - Maulana Wakhiddudin Khan', value: 'tazkirul_quran' },
            { name: 'Maarif al-Quran - Mufti Shafi Muhammad Usami', value: 'maarif_al_quran' },
            { name: 'LLM-Hybrid - Let LLM synthese them', value: 'llm' }
        )
    )
    .addBooleanOption(option => option
        .setName('translate')
        .setDescription('将经注翻译成中文'))

export const execute = async interaction => {
    const verse = interaction.options.getString('verse')
    if (!verse) {
        interaction.reply('将输出随机经文')
    } else {
        interaction.reply(`将输出指定经文: ${verse}`)
    }
}

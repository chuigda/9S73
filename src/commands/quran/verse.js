import { SlashCommandBuilder } from 'discord.js'


export const data = new SlashCommandBuilder()
    .setName('quran')
    .setDescription('查询随机或指定的古兰经文')
    .addStringOption(option => option.setName('verse').setDescription('经文编号，如 2:32，13:11，96:6-7 等；留空则输出随机经文'))

export const execute = async interaction => {
    const verse = interaction.options.getString('verse')
    if (!verse) {
        interaction.reply('将输出随机经文')
    } else {
        interaction.reply(`将输出指定经文: ${verse}`)
    }
}
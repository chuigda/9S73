import { SlashCommandBuilder } from 'discord.js'


export const data = new SlashCommandBuilder().setName('ping').setDescription('Replies with PONG')

export const execute = async interaction => {
    console.info(`sending PONG`)
    await interaction.reply(`pong`)
}

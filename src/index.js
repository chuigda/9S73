import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js'

import config from './util/config.js'

const indexDirectory = path.dirname(fileURLToPath(import.meta.url))
const foldersPath = path.join(indexDirectory, 'commands')

console.info('Starting application')

const { token } = config

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
client.commands = new Collection()

const commandFolders = await readdir(foldersPath)

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder)
    const commandFiles = (await readdir(commandsPath)).filter(file => file.endsWith('.js'))
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file)
        const command = await import(pathToFileURL(filePath).href)

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command)
        } else {
            console.warn(`The command at ${filePath} is missing a required 'data' or 'execute' field`)
        }
    }
}

client.once(
    Events.ClientReady,
    readyClient => console.info(`Discord Bot operational, logged in as '${readyClient.user.tag}'`)
)

client.on(
    Events.InteractionCreate,
    async interaction => {
        if (!interaction.isChatInputCommand()) return
        const command = interaction.client.commands.get(interaction.commandName)
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found`)
            return
        }

        try {
            await command.execute(interaction)
        } catch (error) {
            console.error(`error when executing command ${interaction.commandName}: ${error}`)
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: `There was an error while executing command ${interaction.commandName}`,
                    flags: MessageFlags.Ephemeral
                })
            } else {
                await interaction.reply({
                    content: `There was an error while executing command ${interaction.commandName}`,
                    flags: MessageFlags.Ephemeral
                })
            }
        }
    }
)

console.info('Discord Bot Login')
await client.login(token)

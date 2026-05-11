import { REST, Routes } from 'discord.js'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const commands = []

const indexDirectory = path.dirname(fileURLToPath(import.meta.url))

const configPath = path.resolve(indexDirectory, '..', 'config.json')
const { token, clientId, guildId } = JSON.parse(await readFile(configPath))

const foldersPath = path.join(indexDirectory, 'commands')
const commandFolders = await readdir(foldersPath)

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder)
    const commandFiles = (await readdir(commandsPath)).filter(file => file.endsWith(".js"))

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file)
        const command = await import(pathToFileURL(filePath).href)
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON())
        } else {
            console.warn(`The command at ${filePath} is missing a required 'data' or 'execute' field`)
        }
    }
}

const rest = new REST().setToken(token)

try {
    console.info(`Started refreshing ${commands.length} application (/) commands`)
    const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    console.info(`Successfully reloaded ${data.length} application (/) commands`)
} catch (error) {
    console.error(error)
}

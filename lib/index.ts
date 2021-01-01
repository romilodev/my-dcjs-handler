import {
  Client,
  Message,
  MessageAttachment,
  MessageEmbed,
  MessageOptions
} from 'discord.js'
import Collection from '@discordjs/collection'
import * as path from 'path'
import { existsSync, lstatSync, readdirSync } from 'fs'

type MessageInput =
  | string
  | number
  | bigint
  | boolean
  | symbol
  | MessageEmbed
  | readonly any[]
  | (MessageOptions & {
      split?: false | undefined
    })
  | MessageAttachment
  | (MessageEmbed | MessageAttachment)[]

export interface HandlerOptions {
  prefix: string
  errorMessage?: MessageInput
  invalidCommandMessage?: MessageInput

  commandsPath: string
}

interface RunOptions {
  prefix?: string
}

export interface Command {
  name: string
  aliases?: string[]
  description?: string
  args?: (
    | string
    | {
        name: string
        required?: boolean
      }
  )[]
  run(
    client: Client,
    message: Message,
    args: string[],
    options: RunOptions
  ): void
}

interface Handler {
  commands: Collection<string, Command>
}

interface RunHandler extends Handler {
  prefix: string
}

export interface CommandFileRun {
  (client: Client, message: Message, args: string[], handler: RunHandler): any
}

export interface CommandFile {
  aliases?: string[]
  description?: string
  args?: (
    | string
    | {
        name: string
        required?: boolean
      }
  )[]
  run: CommandFileRun
}

class Handler {
  private options: HandlerOptions
  private aliases: Map<string, string>

  constructor(options: HandlerOptions) {
    this.options = options

    this.commands = new Collection()
    this.aliases = new Map()

    this.init()
  }

  public get defaultPrefix() {
    return this.options.prefix
  }

  public getCommand(name: string) {
    let command = this.commands.get(name)
    const alias = this.aliases.get(name)

    if (!command && alias) {
      command = this.commands.get(alias)
    }

    return command
  }

  public runCommand(client: Client, message: Message, options?: RunOptions) {
    const msg = message.content.toLowerCase()
    const prefix = options?.prefix || this.options.prefix

    if (msg.indexOf(prefix) !== 0) return

    const args = message.content.slice(prefix.length).trim().split(/ +/g)
    const command = args.shift()?.toLowerCase()

    if (!command) return

    const commandInfo = this.getCommand(command)

    if (!commandInfo) {
      if (this.options.invalidCommandMessage) {
        message.channel.send(this.options.invalidCommandMessage)
      }

      return
    }

    commandInfo.run(client, message, args, options || {})
  }

  private init() {
    const { errorMessage, commandsPath: dir } = this.options

    if (!existsSync(dir)) return

    const files = readdirSync(path.resolve(dir)).filter(
      file =>
        (!lstatSync(path.resolve(dir, file)).isDirectory() &&
          path.extname(file) === '.js') ||
        path.extname(file) === '.ts'
    )

    files.forEach(file => {
      const commandFile: CommandFile = require(path.resolve(dir, file))

      const cmd: Command = {
        name: file.replace(/\.js|\.ts/, ''),
        description: commandFile.description,
        aliases: commandFile.aliases,
        args: commandFile.args,
        run: (client, message, args, options) => {
          try {
            const handler: RunHandler = {
              ...this,
              prefix: options.prefix || this.defaultPrefix
            }

            commandFile.run(client, message, args, handler)
          } catch (e) {
            console.warn(e)

            if (errorMessage) message.channel.send(errorMessage)
          }
        }
      }

      cmd.aliases?.forEach(alias => {
        this.aliases.set(alias, cmd.name)
      })

      this.commands.set(cmd.name, cmd)
    })
  }
}

export default Handler

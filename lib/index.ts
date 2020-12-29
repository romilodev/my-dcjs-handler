import {
  Client,
  Message,
  MessageAttachment,
  MessageEmbed,
  MessageOptions
} from 'discord.js'
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

export interface Command {
  name: string
  aliases?: string[]
  description?: string
  args?:
    | string[]
    | {
        name: string
        required?: boolean
      }[]
  run(client: Client, message: Message, args: string[]): void
}

interface Handler {
  commands: Map<string, Command>
}

export interface CommandFileRun {
  (client: Client, message: Message, args: string[], handler: Handler): any
}

export interface CommandFile {
  aliases?: string[]
  description?: string
  args?:
    | string[]
    | {
        name: string
        required?: boolean
      }[]
  run: CommandFileRun
}

class Handler {
  private options: HandlerOptions
  private aliases: Map<string, string>

  constructor(options: HandlerOptions) {
    this.options = options

    this.commands = new Map()
    this.aliases = new Map()

    this.init()
  }

  public get prefix(): string {
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

  public runCommand(client: Client, message: Message) {
    const msg = message.content.toLowerCase()

    if (msg.indexOf(this.options.prefix) !== 0) return

    const args = message.content
      .slice(this.options.prefix.length)
      .trim()
      .split(/ +/g)
    const command = args.shift()?.toLowerCase()

    if (!command) return

    const commandInfo = this.getCommand(command)

    if (!commandInfo) {
      if (this.options.invalidCommandMessage) {
        message.channel.send(this.options.invalidCommandMessage)
      }

      return
    }

    commandInfo.run(client, message, args)
  }

  private init() {
    const { errorMessage, commandsPath: dir } = this.options

    if (!existsSync(dir)) return new Map()

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
        run: (client, message, args) => {
          try {
            commandFile.run(client, message, args, this)
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

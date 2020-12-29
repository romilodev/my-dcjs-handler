# My Discord.js Handler

## Installing
```sh
npm install my-dcjs-handler --save
```
or
```sh
yarn add my-dcjs-handler
```
## Use

### Main file
```js
const Handler = require('my-dcjs-handler')

const handler = new Handler({
  prefix: '!', // The bot prefix
  commandsPath: 'commands', // The path where the command files are located

  errorMessage: 'Error', // The message to be sent when an error occurred (Opcional)
  invalidCommandMessage: 'Invalid Command' // The message to be sent when the executed command doesn't exist (Opcional)
})

// ...

client.on('message', message => {
  handler.runCommand(client, message)
})
```

### Command File
> Filename: `commands/botinfo.js`
```js
module.exports = {
  descriptions: 'Shows bot information', // Not used (Opcional)
  aliases: ['bot'], // Not used (Opcional)

  run: (client, message, args) => {
    // ...
  }
}
```

## Methods
```ts
handler.getCommand(name: string)
{
  name: "The name of the command (defined by the file name)",
  description?: "The description of the command (defined in the command module.exports)",
  aliases?: ["Other ways to execute the command", "(defined in the command module.exports)"] // (defined in the command module.exports)
  run: Function(client, message, args)
}


handler.runCommand(client, message): void


handler.prefix // The bot prefix

handler.commands // An array with bot commands
[
  {
    name: "The name of the command (defined by the file name)",
    description?: "The description of the command (defined in the command module.exports)",
    aliases?: ["Other ways to execute the command", "(defined in the command module.exports)"]
    run: Function(client, message, args)
  }
  // ...
]
```


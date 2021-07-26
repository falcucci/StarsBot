import fs from 'fs';
import { Message } from 'discord.js';
import { Command, CommandContext } from '../../commands/command';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);

export default class CommandService {
    public readonly commands = new Map<string, Command>();

    constructor() {}

    public async init() {
        const files = await readdir('./src/commands');

        for (const fileName of files) {
            const cleanName = fileName.replace(/(\..*)/, '');

            const { default: Command } = await import(`../../commands/${cleanName}`);
            if (!Command) continue;

            const command = new Command();
            this.commands.set(command.name, command);
        }
        console.log(`Loaded: ${this.commands.size} commands`, `cmds`);
    }

    public async handle(msg: Message): Promise<Command> {
        try {
            const prefix : string = '!';
            const slicedContent = msg.content.slice(prefix.length);

            const command = this.findCommand(slicedContent);
            const ctx = new CommandContext(msg, command);
            ctx.channel.startTyping(10)
            try {
                await command.execute(ctx, ...CommandService.getCommandArgs(slicedContent));
            }finally {
                ctx.channel.stopTyping(true)
            }
            return command;
        } catch (error) {
            console.log("Command.service : \n" + error)
            if (error instanceof TypeError && error.message === 'Cannot read property \'execute\' of undefined'){
                await msg.channel.send(`> :warning: la commande demandée n'existe pas !`);
                return Promise.reject()
            }
            const content = error?.message ?? 'Une erreur inconnue s\'est produite.';
            await msg.channel.send(`> :warning: ${content}`);
            return Promise.reject()
        }
    }

    private findCommand(slicedContent: string) : Command{
        const name = CommandService.getCommandName(slicedContent);
        return <Command>this.commands.get(name)
    }

    private static getCommandName(slicedContent: string) {
        return slicedContent
            ?.toLowerCase()
            .split(' ')[0];
    }

    private static getCommandArgs(slicedContent: string) {
        return (slicedContent)
            .split(' ')
            .slice(1);
    }
}

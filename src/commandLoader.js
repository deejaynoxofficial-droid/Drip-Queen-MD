const fs = require("fs");
const path = require("path");

const config = require("../config");


/* ==========================================
   COMMAND STORAGE
========================================== */

const commands = new Map();

const commandList = [];


/* ==========================================
   NORMALIZE COMMAND NAME
========================================== */

function normalizeName(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(value)
        .trim()
        .toLowerCase();

}


/* ==========================================
   LOAD ALL COMMANDS
========================================== */

async function loadCommands() {

    try {

        console.log(
            "[COMMAND LOADER] Loading commands..."
        );


        /*
           Clear old commands before reload.
        */

        commands.clear();

        commandList.length = 0;


        /*
           Ensure commands directory exists.
        */

        if (
            !fs.existsSync(
                config.COMMANDS_PATH
            )
        ) {

            fs.mkdirSync(
                config.COMMANDS_PATH,
                {
                    recursive: true
                }
            );


            console.log(
                `[COMMAND LOADER] Commands folder created: ${config.COMMANDS_PATH}`
            );


            return [];

        }


        /*
           Get JavaScript command files.
        */

        const files =
            fs.readdirSync(
                config.COMMANDS_PATH,
                {
                    withFileTypes: true
                }
            )

                .filter(
                    entry =>
                        entry.isFile() &&
                        entry.name.endsWith(".js")
                )

                .map(
                    entry =>
                        entry.name
                );


        console.log(
            `[COMMAND LOADER] Found ${files.length} command files`
        );


        /*
           Load each command.
        */

        for (
            const file
            of files
        ) {

            const commandPath =
                path.join(
                    config.COMMANDS_PATH,
                    file
                );


            try {

                /*
                   Clear Node.js require cache.
                */

                const resolvedPath =
                    require.resolve(
                        commandPath
                    );


                delete require.cache[
                    resolvedPath
                ];


                const command =
                    require(
                        commandPath
                    );


                /*
                   Validate export.
                */

                if (
                    !command ||
                    typeof command !== "object" ||
                    Array.isArray(command)
                ) {

                    console.log(
                        `[COMMAND SKIPPED] ${file} must export an object`
                    );

                    continue;

                }


                /*
                   Determine command name.
                */

                const commandName =
                    normalizeName(

                        command.name ||

                        command.command ||

                        path.basename(
                            file,
                            ".js"
                        )

                    );


                if (!commandName) {

                    console.log(
                        `[COMMAND SKIPPED] ${file} has no valid name`
                    );

                    continue;

                }


                /*
                   Check duplicate command names.
                */

                if (
                    commands.has(
                        commandName
                    )
                ) {

                    console.log(
                        `[DUPLICATE COMMAND] ${commandName} (${file}) skipped`
                    );

                    continue;

                }


                /*
                   Normalize aliases.
                */

                let aliases = [];


                if (
                    Array.isArray(
                        command.aliases
                    )
                ) {

                    aliases =
                        command.aliases

                            .map(
                                alias =>
                                    normalizeName(
                                        alias
                                    )
                            )

                            .filter(
                                alias =>
                                    alias &&
                                    alias !== commandName
                            );

                }


                /*
                   Remove duplicate aliases.
                */

                aliases = [

                    ...new Set(
                        aliases
                    )

                ];


                /*
                   Normalize command object.
                */

                const normalizedCommand = {

                    ...command,

                    name:
                        commandName,

                    aliases,

                    category:
                        String(
                            command.category ||
                            "General"
                        ),

                    description:
                        String(
                            command.description ||
                            "No description available."
                        ),

                    file,

                    path:
                        commandPath

                };


                /*
                   Register main command.
                */

                commands.set(
                    commandName,
                    normalizedCommand
                );


                /*
                   Register aliases.
                */

                for (
                    const alias
                    of aliases
                ) {

                    /*
                       Prevent alias collision.
                    */

                    if (
                        commands.has(alias)
                    ) {

                        console.log(
                            `[ALIAS SKIPPED] "${alias}" for ${commandName} is already used`
                        );

                        continue;

                    }


                    commands.set(
                        alias,
                        normalizedCommand
                    );

                }


                /*
                   Add only main command to list.
                */

                commandList.push(
                    normalizedCommand
                );


                console.log(
                    `[COMMAND LOADED] ${commandName}`
                );


            } catch (error) {

                console.error(
                    `[COMMAND LOAD ERROR] ${file}: ${error.message}`
                );

            }

        }


        console.log(
            `[COMMAND LOADER] Successfully loaded ${commandList.length} commands`
        );


        return commandList;


    } catch (error) {

        console.error(
            "[COMMAND LOADER ERROR]",
            error.message
        );


        return [];

    }

}


/* ==========================================
   GET SINGLE COMMAND
========================================== */

function getCommand(name) {

    const commandName =
        normalizeName(name);


    if (!commandName) {

        return null;

    }


    return (
        commands.get(commandName) ||
        null
    );

}


/* ==========================================
   GET ALL COMMANDS
========================================== */

function getCommands() {

    return [
        ...commandList
    ];

}


/* ==========================================
   GET COMMAND COUNT
========================================== */

function getCommandCount() {

    return commandList.length;

}


/* ==========================================
   GET COMMANDS BY CATEGORY
========================================== */

function getCommandsByCategory(
    category
) {

    if (!category) {

        return getCommands();

    }


    const targetCategory =
        normalizeName(category);


    return commandList.filter(

        command =>

            normalizeName(
                command.category
            ) === targetCategory

    );

}


/* ==========================================
   GET ALL CATEGORIES
========================================== */

function getCategories() {

    const categories =
        new Set();


    for (
        const command
        of commandList
    ) {

        categories.add(
            command.category ||
            "General"
        );

    }


    return [
        ...categories
    ];

}


/* ==========================================
   RELOAD COMMANDS
========================================== */

async function reloadCommands() {

    console.log(
        "[COMMAND LOADER] Reloading commands..."
    );


    return await loadCommands();

}


/* ==========================================
   EXECUTE COMMAND
========================================== */

async function executeCommand(
    name,
    context
) {

    const command =
        getCommand(name);


    if (!command) {

        return {

            success: false,

            error:
                "Command not found"

        };

    }


    try {

        if (
            typeof command.execute ===
            "function"
        ) {

            await command.execute(
                context
            );

        }

        else if (
            typeof command.run ===
            "function"
        ) {

            await command.run(
                context
            );

        }

        else if (
            typeof command.handler ===
            "function"
        ) {

            await command.handler(
                context
            );

        }

        else {

            return {

                success: false,

                error:
                    `Command "${command.name}" has no execute, run, or handler function`

            };

        }


        return {

            success: true,

            command:
                command.name

        };


    } catch (error) {

        console.error(
            `[COMMAND EXECUTION ERROR] ${name}:`,
            error.message
        );


        return {

            success: false,

            error:
                error.message

        };

    }

}


/* ==========================================
   CHECK IF COMMANDS LOADED
========================================== */

function isLoaded() {

    return (
        commandList.length > 0
    );

}


/* ==========================================
   AUTO LOAD ON STARTUP
========================================== */

if (
    config.AUTO_LOAD_COMMANDS
) {

    loadCommands()

        .catch(
            error => {

                console.error(
                    "[COMMAND AUTO LOAD ERROR]",
                    error.message
                );

            }
        );

}


/* ==========================================
   EXPORT
========================================== */

module.exports = {

    loadCommands,

    loadAllCommands:
        loadCommands,

    reloadCommands,


    getCommand,

    getCommands,

    getAllCommands:
        getCommands,

    getCommandCount,

    getCommandsByCategory,

    getCategories,

    isLoaded,


    executeCommand

};
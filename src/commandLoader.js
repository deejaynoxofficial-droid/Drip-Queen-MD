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
   GET COMMAND FILES RECURSIVELY
========================================== */

function getCommandFiles(directory) {

    const files = [];


    if (
        !directory ||
        !fs.existsSync(directory)
    ) {

        return files;

    }


    let items = [];


    try {

        items =
            fs.readdirSync(
                directory,
                {
                    withFileTypes: true
                }
            );

    } catch (error) {

        console.error(
            `[COMMAND LOADER] Cannot read directory ${directory}:`,
            error.message
        );

        return files;

    }


    for (
        const item
        of items
    ) {

        const fullPath =
            path.join(
                directory,
                item.name
            );


        /*
           Enter subfolders.
        */

        if (
            item.isDirectory()
        ) {

            files.push(
                ...getCommandFiles(
                    fullPath
                )
            );

            continue;

        }


        /*
           Only JavaScript files.
        */

        if (
            item.isFile() &&
            item.name.endsWith(".js")
        ) {

            files.push(
                fullPath
            );

        }

    }


    return files;

}


/* ==========================================
   GET COMMAND EXPORT
========================================== */

function normalizeCommandExport(
    command,
    file
) {

    /*
       Support ES module default exports.
    */

    if (
        command &&
        command.default &&
        typeof command.default === "object"
    ) {

        command =
            command.default;

    }


    if (
        !command ||
        typeof command !== "object" ||
        Array.isArray(command)
    ) {

        return null;

    }


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

        return null;

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

    aliases =
        [
            ...new Set(
                aliases
            )
        ];


    return {

        ...command,

        name:
            commandName,

        aliases,

        category:
            String(
                command.category ||
                command.type ||
                "General"
            ),

        description:
            String(
                command.description ||
                command.desc ||
                "No description available."
            ),

        file,

        path:
            command.path || null

    };

}


/* ==========================================
   REGISTER COMMAND
========================================== */

function registerCommand(
    command
) {

    if (!command) {

        return false;

    }


    const commandName =
        command.name;


    /*
       Prevent duplicate command names.
    */

    if (
        commands.has(
            commandName
        )
    ) {

        console.log(
            `[DUPLICATE COMMAND] ${commandName} skipped`
        );

        return false;

    }


    /*
       Register main command.
    */

    commands.set(
        commandName,
        command
    );


    /*
       Register aliases.
    */

    const validAliases = [];


    for (
        const alias
        of command.aliases
    ) {

        /*
           Prevent collision with
           another command.
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
            command
        );


        validAliases.push(
            alias
        );

    }


    /*
       Keep only successfully
       registered aliases.
    */

    command.aliases =
        validAliases;


    /*
       Add only main command
       to command list.
    */

    commandList.push(
        command
    );


    return true;

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
           Clear previous commands.
        */

        commands.clear();

        commandList.length = 0;


        /*
           Ensure commands directory exists.
        */

        if (
            !config.COMMANDS_PATH
        ) {

            throw new Error(
                "COMMANDS_PATH is missing in config.js"
            );

        }


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
           Find command files.
        */

        const files =
            getCommandFiles(
                config.COMMANDS_PATH
            );


        console.log(
            `[COMMAND LOADER] Found ${files.length} command file(s)`
        );


        /*
           Load each command.
        */

        for (
            const commandPath
            of files
        ) {

            const file =
                path.basename(
                    commandPath
                );


            try {

                /*
                   Clear require cache
                   for command reloading.
                */

                const resolvedPath =
                    require.resolve(
                        commandPath
                    );


                delete require.cache[
                    resolvedPath
                ];


                let command =
                    require(
                        commandPath
                    );


                /*
                   Normalize command export.
                */

                command =
                    normalizeCommandExport(
                        command,
                        file
                    );


                if (!command) {

                    console.log(
                        `[COMMAND SKIPPED] ${file} has an invalid export`
                    );

                    continue;

                }


                /*
                   Save real file path.
                */

                command.path =
                    commandPath;


                /*
                   Check execution function.
                */

                const hasExecutionFunction =

                    typeof command.execute === "function" ||

                    typeof command.run === "function" ||

                    typeof command.handler === "function";


                if (
                    !hasExecutionFunction
                ) {

                    console.log(
                        `[COMMAND WARNING] ${command.name} has no execute(), run(), or handler() function`
                    );

                }


                /*
                   Register command.
                */

                const registered =
                    registerCommand(
                        command
                    );


                if (
                    registered
                ) {

                    console.log(
                        `[COMMAND LOADED] ${command.name}`
                    );

                }


            } catch (error) {

                console.error(
                    `[COMMAND LOAD ERROR] ${file}:`,
                    error.message
                );

            }

        }


        console.log(
            `[COMMAND LOADER] Successfully loaded ${commandList.length} command(s)`
        );


        return getCommands();


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
        commands.get(
            commandName
        ) || null
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
        normalizeName(
            category
        );


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
        getCommand(
            name
        );


    if (!command) {

        return {

            success: false,

            error:
                "Command not found"

        };

    }


    try {

        /*
           execute()
        */

        if (
            typeof command.execute ===
            "function"
        ) {

            await command.execute(
                context
            );

        }


        /*
           run()
        */

        else if (
            typeof command.run ===
            "function"
        ) {

            await command.run(
                context
            );

        }


        /*
           handler()
        */

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
                    `Command "${command.name}" has no execute(), run(), or handler() function`

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
   CHECK IF COMMANDS ARE LOADED
========================================== */

function isLoaded() {

    return (
        commandList.length > 0
    );

}


/* ==========================================
   CLEAR COMMANDS
========================================== */

function clearCommands() {

    commands.clear();

    commandList.length = 0;


    console.log(
        "[COMMAND LOADER] Commands cleared"
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


    executeCommand,


    clearCommands

};
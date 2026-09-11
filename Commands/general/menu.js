const fs = require("fs");
const path = require("path");

const config = require("../../config");


/* ==========================================
   BOT IMAGE
========================================== */

const botImagePath =
    path.join(
        __dirname,
        "..",
        "..",
        "assets",
        "bot.png"
    );


/* ==========================================
   CATEGORY DISPLAY NAMES
========================================== */

const categoryNames = {

    general:
        "GENERAL MENU",

    download:
        "DOWNLOAD MENU",

    group:
        "GROUP MENU",

    owner:
        "OWNER MENU",

    channel:
        "CHANNEL MENU",

    ai:
        "AI MENU",

    fun:
        "FUN MENU",

    tools:
        "TOOLS MENU",

    search:
        "SEARCH MENU",

    upload:
        "UPLOAD MENU"

};


/* ==========================================
   CATEGORY EMOJIS
========================================== */

const categoryEmojis = {

    general:
        "📋",

    download:
        "📥",

    group:
        "👥",

    owner:
        "👑",

    channel:
        "📢",

    ai:
        "🤖",

    fun:
        "🎮",

    tools:
        "🛠️",

    search:
        "🔎",

    upload:
        "📤"

};


/* ==========================================
   GET COMMAND LOADER
========================================== */

function getCommandLoader() {

    try {

        return require("../../src/commandLoader");

    } catch (error) {

        console.error(
            "[MENU ERROR] Failed to load commandLoader:",
            error.message
        );

        return null;

    }

}


/* ==========================================
   FORMAT CATEGORY COMMANDS
========================================== */

function formatCategoryCommands(
    category,
    prefix
) {

    try {

        const commandLoader =
            getCommandLoader();


        if (!commandLoader) {

            return [];

        }


        const commands =
            commandLoader.getCommandsByCategory(
                category
            );


        if (
            !Array.isArray(commands) ||
            commands.length === 0
        ) {

            return [];

        }


        /*
           Sort commands alphabetically.
        */

        commands.sort(

            (a, b) =>
                a.name.localeCompare(
                    b.name
                )

        );


        return commands;


    } catch (error) {

        console.error(
            "[MENU CATEGORY ERROR]",
            error.message
        );

        return [];

    }

}


/* ==========================================
   BUILD MAIN MENU
========================================== */

function buildMainMenu(
    userName,
    prefix
) {

    return `╔══════════════════════╗
║   🤖 DRIP QUEEN MD   ║
╚══════════════════════╝

Hello ${userName} 👋

╭─〔 MAIN MENU 〕
│
│ 1️⃣ General Menu
│ 2️⃣ Download Menu
│ 3️⃣ Group Menu
│ 4️⃣ Owner Menu
│ 5️⃣ Channel Menu
│ 6️⃣ AI Menu
│ 7️⃣ Fun Menu
│ 8️⃣ Tools Menu
│ 9️⃣ Search Menu
│ 🔟 Upload Menu
│
╰───────────────

Reply with a number to open a menu.

Example:
Reply with 1 for general Menu
Reply with 2 for download Menu
Reply with 3 for group Menu

Prefix: ${prefix}

Powered by ${config.BOT_NAME}
`;

}


/* ==========================================
   BUILD CATEGORY MENU
========================================== */

function buildCategoryMenu(
    category,
    userName,
    prefix
) {

    const categoryTitle =
        categoryNames[category] ||
        `${category.toUpperCase()} MENU`;


    const emoji =
        categoryEmojis[category] ||
        "📂";


    const commands =
        formatCategoryCommands(
            category,
            prefix
        );


    let commandText = "";


    if (
        commands.length === 0
    ) {

        commandText =
            "│ No commands available yet.\n";

    }

    else {

        commands.forEach(

            (command, index) => {

                const number =
                    index + 1;


                const description =
                    command.description ||
                    "No description available";


                commandText +=
                    `│ ${number}. ${prefix}${command.name}\n`;


                commandText +=
                    `│    ${description}\n`;

            }

        );

    }


    return `╔══════════════════════╗
║   ${emoji} DRIP QUEEN MD   ║
╚══════════════════════╝

Hello ${userName} 👋

╭─〔 ${categoryTitle} 〕
│
${commandText}│
╰───────────────

Total Commands: ${commands.length}

Use commands with:
${prefix}command

Example:
${prefix}${commands[0]?.name || "menu"}

Type ${prefix}menu to return to the main menu.

Powered by ${config.BOT_NAME}
`;

}


/* ==========================================
   SEND MENU MESSAGE
========================================== */

async function sendMenu(
    sock,
    msg,
    menuText,
    useImage = true
) {

    const chatId =
        msg.key.remoteJid;


    /*
       Send image only for main menu.
    */

    if (
        useImage &&
        fs.existsSync(
            botImagePath
        )
    ) {

        return await sock.sendMessage(

            chatId,

            {

                image:
                    fs.readFileSync(
                        botImagePath
                    ),

                caption:
                    menuText

            },

            {

                quoted:
                    msg

            }

        );

    }


    /*
       Text fallback.
    */

    return await sock.sendMessage(

        chatId,

        {

            text:
                menuText

        },

        {

            quoted:
                msg

        }

    );

}


/* ==========================================
   MENU COMMAND
========================================== */

module.exports = {

    name:
        "menu",


    aliases: [

        "help",

        "commands"

    ],


    category:
        "General",


    description:
        "Display the bot command menu",


    async execute(context) {

        const {

            sock,

            msg,

            prefix,

            selectedCategory

        } = context;


        const userName =
            msg.pushName ||
            "User";


        /*
           CATEGORY MENU
        */

        if (
            selectedCategory
        ) {

            const categoryMenu =
                buildCategoryMenu(

                    selectedCategory,

                    userName,

                    prefix

                );


            return await sendMenu(

                sock,

                msg,

                categoryMenu,

                false

            );

        }


        /*
           MAIN MENU
        */

        const mainMenu =
            buildMainMenu(

                userName,

                prefix

            );


        return await sendMenu(

            sock,

            msg,

            mainMenu,

            true

        );

    }

};
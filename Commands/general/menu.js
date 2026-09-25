const fs = require("fs");
const path = require("path");

const config = require("../../config");
const { createMenuSession, removeMenuSession } = require("../../src/menuSession");


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

    moderation:
        "MODERATION MENU",

    protection:
        "PROTECTION MENU",

    "auto features":
        "AUTO FEATURES MENU",

    information:
        "INFORMATION MENU",

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

    moderation:
        "🛡️",

    protection:
        "🔐",

    "auto features":
        "⚡",

    information:
        "ℹ️",

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
   COMMAND EMOJIS
========================================== */

const commandEmojis = {
    alive: "🟢",
    botinfo: "🤖",
    menu: "📋",
    pair: "🔗",
    channel: "📢",
    channelfollows: "📢",
    autostatus: "📡",
    autotyping: "⌨️",
    autorecording: "🎙️",
    autoreply: "💬",
    autoreact: "❤️",
    autofeatures: "⚙️",
    autoview: "👁️",
    antilink: "🔒",
    antidelete: "🗑️",
    ytmp3: "🎵",
    ytmp4: "🎬",
    song: "🎵",
    play: "▶️",
    video: "🎥",
    instagram: "📸",
    apk: "📱",
    group: "⚙️",
    groupinfo: "ℹ️",
    add: "➕",
    kick: "🚫",
    promote: "⬆️",
    demote: "⬇️",
    tagall: "📣",
    hidetag: "🫥",
    goodbye: "👋",
    admins: "👮",
    members: "👥",
    whois: "🔎",
    mute: "🔇",
    unmute: "🔊",
    lock: "🔒",
    unlock: "🔓",
    setname: "✏️",
    setdesc: "📝",
    setpp: "🖼️",
    delpp: "🗑️",
    invite: "🔗",
    revoke: "♻️",
    online: "🟢",
    warn: "⚠️",
    warnings: "📋",
    resetwarn: "🧹",
    delete: "🗑️",
    antispam: "🚫",
    antiflood: "🌊",
    antibot: "🤖",
    antimention: "🔕",
    antitag: "🏷️",
    antinsfw: "🔞",
    protection: "🛡️",
    vv: "👁️",
    gpt: "🧠",
    ai: "🤖",
    gemini: "♊",
    explain: "💡",
    imagine: "🎨",
    choose: "🎯",
    flip: "🪙",
    "8ball": "🔮",
    search: "🔎",
    image: "🖼️",
    google: "🌐",
    upload: "📤",
    tourl: "🔗",
    getfile: "📁",
    settings: "⚙️"
};

function getCommandEmoji(commandName) {
    return commandEmojis[String(commandName || "").toLowerCase()] || "🔹";
}


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

function getMainMenuCategories() {
    return [
        "general",
        "download",
        "group",
        "moderation",
        "protection",
        "auto features",
        "owner",
        "channel",
        "ai",
        "fun",
        "tools",
        "search",
        "upload",
        "information"
    ];
}

function buildMainMenu(
    userName,
    prefix
) {
    const categories = getMainMenuCategories();
    const lines = categories.map((category, index) => {
        const emoji = categoryEmojis[category] || "📂";
        const name = categoryNames[category] || `${category.toUpperCase()} MENU`;
        return `│ ${index + 1}️⃣ ${emoji} ${name}`;
    }).join("\n");

    return `╔══════════════════════╗
║   🤖 DRIP QUEEN MD   ║
╚══════════════════════╝

Hello ${userName} 👋

╭─〔 MAIN MENU 〕
│
${lines}
│
╰───────────────

Reply with a number to open a menu.

Prefix: ${prefix}

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
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

            (command) => {

                const emoji =
                    getCommandEmoji(command.name);

                commandText +=
                    `│ ${emoji} ${prefix}${command.name}\n`;

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

Type ${prefix}menu to return to the main menu.

> ${config.BOT_NAME}
> Powered by ${config.CREATOR}
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

        // Store the category order shown in the main menu so a plain
        // numeric reply (1-10) can be resolved on the next message.
        const chatId = msg?.key?.remoteJid;
        if (chatId) {
            createMenuSession(chatId, {
                type: "main-menu",
                categories: getMainMenuCategories(),
                selectedCategory: null
            });
        }

        return await sendMenu(

            sock,

            msg,

            mainMenu,

            true

        );

    }

};
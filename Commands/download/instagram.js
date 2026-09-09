const config = require("../../config");


/* ==========================================
   INSTAGRAM COMMAND
========================================== */

module.exports = {

    name:
        "instagram",


    aliases: [

        "ig",
        "insta",
        "igdl"

    ],


    category:
        "Download",


    description:
        "Search and download Instagram media",


    usage:
        ".instagram <username or search query>",


    async execute(context) {

        const {

            sock,
            msg,
            args,
            prefix

        } = context;


        const chatId =
            msg.key.remoteJid;


        /* ==========================================
           GET SEARCH QUERY
        ========================================== */

        const query =
            args.join(" ").trim();


        /* ==========================================
           VALIDATE QUERY
        ========================================== */

        if (!query) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 📸 INSTAGRAM DOWNLOADER 〕
│
│ Please enter an Instagram username
│ or search query.
│
│ Example:
│ ${prefix}instagram cristiano
│
│ More examples:
│ ${prefix}ig football highlights
│ ${prefix}insta music videos
│
╰───────────────`

                },

                {

                    quoted:
                        msg

                }

            );

        }


        try {

            /* ==========================================
               SEARCHING UI
            ========================================== */

            await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 📸 INSTAGRAM SEARCH 〕
│
│ 🔎 Searching Instagram...
│
│ 👤 ${query}
│
│ ⏳ Please wait...
│
╰───────────────`

                },

                {

                    quoted:
                        msg

                }

            );


            /*
               ==========================================

               INSTAGRAM DOWNLOAD FLOW

               User Query
                    ↓
               Search Instagram
                    ↓
               Find Matching Media
                    ↓
               Get Media Information
                    ↓
               Download Image / Video
                    ↓
               Send to WhatsApp

               ==========================================

               API integration will be added later.
            */


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 📸 INSTAGRAM RESULT 〕
│
│ 🔎 Search:
│ ${query}
│
│ ⚙️ Instagram engine initialized.
│
│ ⏳ Preparing media service...
│
╰───────────────

🤖 ${config.BOT_NAME}`

                },

                {

                    quoted:
                        msg

                }

            );


        } catch (error) {

            console.error(

                "[INSTAGRAM COMMAND ERROR]",

                error.message

            );


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ INSTAGRAM ERROR 〕
│
│ Failed to process your request.
│
│ ${error.message}
│
│ Please try again later.
│
╰───────────────`

                },

                {

                    quoted:
                        msg

                }

            );

        }

    }

};
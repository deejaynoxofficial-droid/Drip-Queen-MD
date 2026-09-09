const config = require("../../config");

const {
    hasApiKey,
    formatFileSize
} = require("../../lib/downloadApi");


/* ==========================================
   SONG COMMAND
========================================== */

module.exports = {

    name:
        "song",


    aliases: [

        "music",
        "audio",
        "mp3"

    ],


    category:
        "Download",


    description:
        "Search and download a song using a query",


    usage:
        ".song <song name>",


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
           GET USER QUERY
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

`╭─〔 🎵 SONG DOWNLOADER 〕
│
│ Please enter a song name.
│
│ Example:
│ ${prefix}song Burna Boy City Boys
│
│ You can also search:
│ ${prefix}song Wizkid Essence
│ ${prefix}song Drake God's Plan
│
╰───────────────`

                },

                {

                    quoted:
                        msg

                }

            );

        }


        /* ==========================================
           API KEY CHECK
        ========================================== */

        if (!hasApiKey()) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ⚠️ DOWNLOAD SERVICE 〕
│
│ The download API key has not
│ been configured yet.
│
│ Please configure:
│ DOWNLOAD_API_KEY
│
╰───────────────`

                },

                {

                    quoted:
                        msg

                }

            );

        }


        /* ==========================================
           SEARCHING MESSAGE
        ========================================== */

        await sock.sendMessage(

            chatId,

            {

                text:

`╭─〔 🎵 SONG SEARCH 〕
│
│ 🔎 Searching:
│ ${query}
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


        try {

            /*
               ======================================

               DOWNLOAD FLOW

               Query
                 ↓
               Search API
                 ↓
               Get first result
                 ↓
               Request audio download
                 ↓
               Download file
                 ↓
               Send to WhatsApp

               ======================================


               API CONNECTION WILL GO HERE.

               The exact code depends on the API
               provider you are using.
            */


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🎵 SONG RESULT 〕
│
│ 🔎 Query:
│ ${query}
│
│ ⚙️ Download engine is ready.
│
│ Maximum file size:
│ ${formatFileSize(
    config.DOWNLOAD.MAX_FILE_SIZE
)}
│
│ ⏳ Connecting to the music
│ service...
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

                "[SONG COMMAND ERROR]",

                error.message

            );


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ SONG ERROR 〕
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
const config = require("../../config");


/* ==========================================
   YTMP3 COMMAND
========================================== */

module.exports = {

    name:
        "ytmp3",


    aliases: [

        "ytaudio",
        "youtubeaudio",
        "ytmusic"

    ],


    category:
        "Download",


    description:
        "Search and download YouTube audio using a query",


    usage:
        ".ytmp3 <song or video name>",


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

`╭─〔 🎵 YOUTUBE MP3 〕
│
│ Please enter a song or video name.
│
│ Example:
│ ${prefix}ytmp3 Burna Boy City Boys
│
│ You can search by:
│ • Song name
│ • Artist name
│ • Video title
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
               SEARCHING MESSAGE
            ========================================== */

            await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🎵 YOUTUBE MP3 〕
│
│ 🔎 Searching YouTube...
│
│ 🎧 ${query}
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

               DOWNLOAD FLOW

               User Query
                    ↓
               YouTube Search
                    ↓
               Find Best Result
                    ↓
               Convert to MP3
                    ↓
               Download Audio
                    ↓
               Send to WhatsApp

               ==========================================

               API integration will be connected
               when we configure the download
               provider.
            */


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🎵 MP3 RESULT 〕
│
│ 🔎 Search:
│ ${query}
│
│ ⚙️ Audio engine initialized.
│
│ ⏳ Preparing MP3 download...
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

                "[YTMP3 COMMAND ERROR]",

                error.message

            );


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ MP3 ERROR 〕
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
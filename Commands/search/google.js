const axios = require("axios");

const config = require("../../config");


/* ==========================================
   GOOGLE SEARCH COMMAND
========================================== */

module.exports = {

    name:
        "google",


    aliases: [

        "gsearch",
        "googlesearch"

    ],


    category:
        "Search",


    description:
        "Search Google for information",


    usage:
        ".google <query>",


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
           GET QUERY
        ========================================== */

        const query =
            args.join(" ").trim();


        if (!query) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🌐 GOOGLE SEARCH 〕
│
│ Please provide something
│ to search for.
│
│ Usage:
│ ${prefix}google <query>
│
│ Example:
│ ${prefix}google WhatsApp Baileys tutorial
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
               CHECK API KEY
            ========================================== */

            const apiKey =
                config.API_KEYS?.GOOGLE ||
                "";


            if (!apiKey) {

                throw new Error(
                    "GOOGLE_API_KEY is not configured in .env"
                );

            }


            /* ==========================================
               SEARCH PROCESSING REACTION
            ========================================== */

            try {

                await sock.sendMessage(

                    chatId,

                    {

                        react: {

                            text:
                                "🌐",

                            key:
                                msg.key

                        }

                    }

                );

            } catch (error) {}


            /*
               NOTE:

               Google Custom Search API requires
               both an API key and Search Engine ID.

               Add this to .env:

               GOOGLE_SEARCH_ENGINE_ID=
            */

            const searchEngineId =
                process.env.GOOGLE_SEARCH_ENGINE_ID ||
                "";


            if (!searchEngineId) {

                throw new Error(
                    "GOOGLE_SEARCH_ENGINE_ID is not configured in .env"
                );

            }


            /* ==========================================
               GOOGLE CUSTOM SEARCH REQUEST
            ========================================== */

            const response =
                await axios.get(

                    "https://www.googleapis.com/customsearch/v1",

                    {

                        params: {

                            key:
                                apiKey,


                            cx:
                                searchEngineId,


                            q:
                                query,


                            num:

                                Math.min(

                                    config.SEARCH
                                        ?.MAX_RESULTS || 10,

                                    10

                                ),


                            safe:

                                config.SEARCH
                                    ?.SAFE_SEARCH

                                    ? "active"

                                    : "off"

                        },


                        timeout:
                            30000

                    }

                );


            const results =
                response.data?.items ||
                [];


            /* ==========================================
               NO RESULTS
            ========================================== */

            if (

                !Array.isArray(results) ||

                results.length === 0

            ) {

                return await sock.sendMessage(

                    chatId,

                    {

                        text:

`╭─〔 🌐 GOOGLE SEARCH 〕
│
│ Query:
│ ${query}
│
│ No results found.
│
│ Try another search.
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
               BUILD RESULT MESSAGE
            ========================================== */

            let resultText =

`╭─〔 🌐 GOOGLE SEARCH 〕
│
│ 🔎 Query:
│ ${query}
│
├────────────────
`;


            results
                .slice(0, 10)
                .forEach(

                    (item, index) => {

                        const title =
                            item.title ||
                            "Untitled";


                        const link =
                            item.link ||
                            "";


                        const snippet =
                            item.snippet ||
                            "No description available";


                        resultText +=

`│
│ ${index + 1}️⃣ ${title}
│
│ ${snippet}
│
│ 🔗 ${link}
│
├────────────────
`;

                    }

                );


            resultText +=

`│
╰────────────────
🤖 ${config.BOT_NAME}`;


            /* ==========================================
               SEND RESULTS
            ========================================== */

            await sock.sendMessage(

                chatId,

                {

                    text:
                        resultText

                },

                {

                    quoted:
                        msg

                }

            );


            /* ==========================================
               SUCCESS REACTION
            ========================================== */

            try {

                await sock.sendMessage(

                    chatId,

                    {

                        react: {

                            text:
                                "✅",

                            key:
                                msg.key

                        }

                    }

                );

            } catch (error) {}


        } catch (error) {

            console.error(

                "[GOOGLE COMMAND ERROR]",

                error.response
                    ?.data ||
                error.message

            );


            const errorMessage =

                error.response
                    ?.data
                    ?.error
                    ?.message ||

                error.message ||

                "Google search failed";


            /* Error reaction */

            try {

                await sock.sendMessage(

                    chatId,

                    {

                        react: {

                            text:
                                "❌",

                            key:
                                msg.key

                        }

                    }

                );

            } catch (error) {}


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ GOOGLE SEARCH FAILED 〕
│
│ ${errorMessage}
│
│ Please check your API settings
│ and try again.
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
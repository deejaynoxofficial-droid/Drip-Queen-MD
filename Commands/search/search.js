const axios = require("axios");

const config = require("../../config");


/* ==========================================
   GENERAL SEARCH COMMAND
========================================== */

module.exports = {

    name:
        "search",


    aliases: [

        "websearch",
        "find"

    ],


    category:
        "Search",


    description:
        "Search for information on the web",


    usage:
        ".search <query>",


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


        if (!query) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🔎 SEARCH 〕
│
│ Please provide something
│ to search for.
│
│ Usage:
│ ${prefix}search <query>
│
│ Example:
│ ${prefix}search WhatsApp bot tutorial
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
               PROCESSING REACTION
            ========================================== */

            try {

                await sock.sendMessage(

                    chatId,

                    {

                        react: {

                            text:
                                "🔎",

                            key:
                                msg.key

                        }

                    }

                );

            } catch (error) {}


            /*
               Search API key.

               Uses GOOGLE_API_KEY first,
               then GENERAL API_KEY.
            */

            const apiKey =
                config.API_KEYS?.GOOGLE ||
                config.API_KEYS?.GENERAL ||
                "";


            if (!apiKey) {

                throw new Error(
                    "SEARCH API KEY is not configured in .env"
                );

            }


            /*
               IMPORTANT:

               Replace this with your search API
               when configuring your project.

               The command is structured so that
               the API key comes from .env.
            */

            const response =
                await axios.get(

                    "https://www.googleapis.com/customsearch/v1",

                    {

                        params: {

                            key:
                                apiKey,


                            q:
                                query,


                            num:
                                config.SEARCH?.MAX_RESULTS || 5

                        },


                        timeout:
                            30000

                    }

                );


            const results =
                response.data?.items ||
                [];


            if (

                !Array.isArray(results) ||

                results.length === 0

            ) {

                return await sock.sendMessage(

                    chatId,

                    {

                        text:

`╭─〔 🔎 SEARCH RESULTS 〕
│
│ Query:
│ ${query}
│
│ No results found.
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
               FORMAT RESULTS
            ========================================== */

            let resultText =

`╭─〔 🔎 SEARCH RESULTS 〕
│
│ Query:
│ ${query}
│
├────────────────
`;


            results
                .slice(0, 5)
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
│ ${index + 1}. ${title}
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
╰───────────────
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

                "[SEARCH COMMAND ERROR]",

                error.response?.data ||
                error.message

            );


            const errorMessage =

                error.response
                    ?.data
                    ?.error
                    ?.message ||

                error.message ||

                "Search failed";


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

`╭─〔 ❌ SEARCH FAILED 〕
│
│ ${errorMessage}
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
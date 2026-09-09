const axios = require("axios");

const config = require("../../config");


/* ==========================================
   GPT / OPENAI COMMAND
========================================== */

module.exports = {

    name:
        "gpt",


    aliases: [

        "openai",
        "chatgpt"

    ],


    category:
        "AI",


    description:
        "Ask OpenAI GPT anything",


    usage:
        ".gpt <question>",


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
           GET QUESTION
        ========================================== */

        const question =
            args.join(" ").trim();


        if (!question) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🤖 GPT AI 〕
│
│ Ask GPT anything.
│
│ Usage:
│ ${prefix}gpt <question>
│
│ Examples:
│ ${prefix}gpt Explain JavaScript
│ ${prefix}gpt Write a love song
│ ${prefix}gpt Create a Node.js bot
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
           CHECK OPENAI API KEY
        ========================================== */

        const apiKey =
            config.API_KEYS?.OPENAI;


        if (!apiKey) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ GPT ERROR 〕
│
│ OPENAI_API_KEY is missing.
│
│ Add your OpenAI API key
│ inside the .env file.
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
           REACTION
        ========================================== */

        try {

            await sock.sendMessage(

                chatId,

                {

                    react: {

                        text:
                            "🤖",

                        key:
                            msg.key

                    }

                }

            );

        } catch (error) {}


        try {

            /* ==========================================
               GET MODEL
            ========================================== */

            const model =

                config.AI?.MODEL &&

                config.AI.PROVIDER?.toLowerCase() === "openai"

                    ?

                    config.AI.MODEL

                    :

                    "gpt-4.1-mini";


            /* ==========================================
               OPENAI API REQUEST
            ========================================== */

            const response =
                await axios.post(

                    "https://api.openai.com/v1/chat/completions",

                    {

                        model,


                        messages: [

                            {

                                role:
                                    "system",

                                content:
                                    `You are ${config.BOT_NAME}, a helpful AI assistant.`

                            },


                            {

                                role:
                                    "user",

                                content:
                                    question

                            }

                        ],


                        max_tokens:

                            config.AI?.MAX_TOKENS ||
                            1000,


                        temperature:
                            0.7

                    },

                    {

                        headers: {

                            Authorization:
                                `Bearer ${apiKey}`,

                            "Content-Type":
                                "application/json"

                        },


                        timeout:
                            60000

                    }

                );


            /* ==========================================
               EXTRACT AI RESPONSE
            ========================================== */

            const answer =

                response.data
                    ?.choices?.[0]
                    ?.message
                    ?.content
                    ?.trim();


            if (!answer) {

                throw new Error(

                    "GPT did not return a response"

                );

            }


            /* ==========================================
               SEND RESPONSE
            ========================================== */

            const responseText =

`╭─〔 🤖 GPT AI 〕
│
${answer}
│
╰───────────────
Powered by ${config.BOT_NAME}`;


            await sock.sendMessage(

                chatId,

                {

                    text:
                        responseText

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

                "[GPT COMMAND ERROR]",

                error.response?.data ||
                error.message

            );


            const errorMessage =

                error.response
                    ?.data
                    ?.error
                    ?.message ||

                error.message ||

                "Unknown error occurred";


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

            } catch (reactionError) {}


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ GPT ERROR 〕
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
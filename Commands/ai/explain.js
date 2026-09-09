const axios = require("axios");

const config = require("../../config");


/* ==========================================
   EXPLAIN AI COMMAND
========================================== */

module.exports = {

    name:
        "explain",


    aliases: [

        "ex",
        "simplify"

    ],


    category:
        "AI",


    description:
        "Explain anything in simple words",


    usage:
        ".explain <topic>",


    async execute(context) {

        const {

            sock,
            msg,
            args,
            prefix

        } = context;


        const chatId =
            msg.key.remoteJid;


        const topic =
            args.join(" ").trim();


        /* ==========================================
           CHECK TOPIC
        ========================================== */

        if (!topic) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🧠 EXPLAIN AI 〕
│
│ Explain any topic simply.
│
│ Usage:
│ ${prefix}explain <topic>
│
│ Examples:
│ ${prefix}explain JavaScript
│ ${prefix}explain Black holes
│ ${prefix}explain How APIs work
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
           CHECK GEMINI API KEY
        ========================================== */

        const apiKey =
            config.API_KEYS?.GEMINI;


        if (!apiKey) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ AI ERROR 〕
│
│ GEMINI_API_KEY is missing.
│
│ Please add your Gemini API key
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


        try {

            /* ==========================================
               REACTION
            ========================================== */

            try {

                await sock.sendMessage(

                    chatId,

                    {

                        react: {

                            text:
                                "🧠",

                            key:
                                msg.key

                        }

                    }

                );

            } catch (error) {}


            /* ==========================================
               AI MODEL
            ========================================== */

            const model =
                config.AI?.MODEL ||
                "gemini-2.0-flash";


            /* ==========================================
               CREATE PROMPT
            ========================================== */

            const prompt =

`Explain the following topic in a very simple,
clear and easy-to-understand way.

Topic: ${topic}

Use simple language.

If necessary:
- Give examples
- Break difficult concepts into sections
- Avoid unnecessary technical words

Make the explanation helpful and educational.`;


            /* ==========================================
               GEMINI REQUEST
            ========================================== */

            const response =
                await axios.post(

                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,

                    {

                        contents: [

                            {

                                parts: [

                                    {

                                        text:
                                            prompt

                                    }

                                ]

                            }

                        ],


                        generationConfig: {

                            maxOutputTokens:

                                config.AI?.MAX_TOKENS ||
                                1000,

                            temperature:
                                0.5

                        }

                    },

                    {

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        timeout:
                            60000

                    }

                );


            /* ==========================================
               GET RESPONSE
            ========================================== */

            const answer =

                response.data
                    ?.candidates?.[0]
                    ?.content
                    ?.parts
                    ?.map(

                        part =>
                            part.text

                    )
                    .filter(Boolean)
                    .join("\n");


            if (!answer) {

                throw new Error(

                    "AI did not return an explanation"

                );

            }


            /* ==========================================
               SEND RESPONSE
            ========================================== */

            await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🧠 EXPLAIN AI 〕
│
│ 📌 Topic:
│ ${topic}
│
├───────────────
│
${answer}
│
╰───────────────
🤖 ${config.BOT_NAME}`

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

                "[EXPLAIN COMMAND ERROR]",

                error.response?.data ||
                error.message

            );


            const errorMessage =

                error.response
                    ?.data
                    ?.error
                    ?.message ||

                error.message ||

                "Something went wrong";


            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ EXPLAIN ERROR 〕
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
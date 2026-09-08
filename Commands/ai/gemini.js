const axios = require("axios");

const config = require("../../config");


/* ==========================================
   GEMINI AI COMMAND
========================================== */

module.exports = {

    name:
        "gemini",


    aliases: [

        "gem",
        "gptgemini"

    ],


    category:
        "AI",


    description:
        "Ask Gemini AI anything",


    usage:
        ".gemini <question>",


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

`╭─〔 ✨ GEMINI AI 〕
│
│ Ask Gemini anything.
│
│ Usage:
│ ${prefix}gemini <question>
│
│ Examples:
│ ${prefix}gemini Who invented JavaScript?
│ ${prefix}gemini Write a song
│ ${prefix}gemini Explain Node.js
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
           CHECK API KEY
        ========================================== */

        const apiKey =
            config.API_KEYS?.GEMINI;


        if (!apiKey) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 ❌ GEMINI ERROR 〕
│
│ GEMINI_API_KEY is missing.
│
│ Add your Gemini API key
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
                            "🧠",

                        key:
                            msg.key

                    }

                }

            );

        } catch (error) {}


        try {

            /* ==========================================
               GEMINI MODEL
            ========================================== */

            const model =
                config.AI?.MODEL ||
                "gemini-2.0-flash";


            /* ==========================================
               API REQUEST
            ========================================== */

            const response =
                await axios.post(

                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,

                    {

                        contents: [

                            {

                                role:
                                    "user",


                                parts: [

                                    {

                                        text:
                                            question

                                    }

                                ]

                            }

                        ],


                        generationConfig: {

                            maxOutputTokens:

                                config.AI?.MAX_TOKENS ||
                                1000,

                            temperature:
                                0.7

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
               EXTRACT RESPONSE
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

                    "Gemini did not return a response"

                );

            }


            /* ==========================================
               SEND RESPONSE
            ========================================== */

            const responseText =

`╭─〔 ✨ GEMINI AI 〕
│
${answer}
│
╰───────────────
🤖 ${config.BOT_NAME}`;


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

                "[GEMINI COMMAND ERROR]",

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

`╭─〔 ❌ GEMINI ERROR 〕
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
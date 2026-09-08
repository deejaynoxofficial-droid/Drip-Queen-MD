const axios = require("axios");

const config = require("../../config");


/* ==========================================
   AI COMMAND
========================================== */

module.exports = {

    name:
        "ai",


    aliases: [

        "ask",
        "chatbot"

    ],


    category:
        "AI",


    description:
        "Ask the AI anything",


    usage:
        ".ai <question>",


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
           GET USER QUESTION
        ========================================== */

        const question =
            args.join(" ").trim();


        if (!question) {

            return await sock.sendMessage(

                chatId,

                {

                    text:

`╭─〔 🤖 AI ASSISTANT 〕
│
│ Ask me anything.
│
│ Example:
│ ${prefix}ai Who is Albert Einstein?
│
│ ${prefix}ai Explain JavaScript
│
│ ${prefix}ai Write a song
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


        /* ==========================================
           PROCESSING MESSAGE
        ========================================== */

        await sock.sendMessage(

            chatId,

            {

                text:

`╭─〔 🧠 AI THINKING 〕
│
│ Question:
│ ${question}
│
│ Please wait...
│
╰───────────────`

            },

            {

                quoted:
                    msg

            }

        );


        try {

            const provider =
                (
                    config.AI?.PROVIDER ||
                    "gemini"
                )
                    .toLowerCase();


            let answer;


            /* ==========================================
               GEMINI PROVIDER
            ========================================== */

            if (
                provider === "gemini"
            ) {

                const apiKey =
                    config.API_KEYS?.GEMINI;


                if (!apiKey) {

                    throw new Error(

                        "GEMINI_API_KEY is not configured in .env"

                    );

                }


                const model =
                    config.AI?.MODEL ||
                    "gemini-2.0-flash";


                const response =
                    await axios.post(

                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,

                        {

                            contents: [

                                {

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
                                    1000

                            }

                        },

                        {

                            timeout:
                                60000

                        }

                    );


                answer =

                    response.data
                        ?.candidates
                        ?.map(

                            candidate =>

                                candidate
                                    ?.content
                                    ?.parts
                                    ?.map(
                                        part =>
                                            part.text
                                    )
                                    .join("")

                        )
                        .filter(Boolean)
                        .join("\n\n");


            }


            /* ==========================================
               OPENAI PROVIDER
            ========================================== */

            else if (
                provider === "openai"
            ) {

                const apiKey =
                    config.API_KEYS?.OPENAI;


                if (!apiKey) {

                    throw new Error(

                        "OPENAI_API_KEY is not configured in .env"

                    );

                }


                const model =
                    config.AI?.MODEL ||
                    "gpt-4.1-mini";


                const response =
                    await axios.post(

                        "https://api.openai.com/v1/chat/completions",

                        {

                            model,


                            messages: [

                                {

                                    role:
                                        "user",


                                    content:
                                        question

                                }

                            ],


                            max_tokens:

                                config.AI?.MAX_TOKENS ||
                                1000

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


                answer =

                    response.data
                        ?.choices?.[0]
                        ?.message
                        ?.content;

            }


            /* ==========================================
               UNKNOWN PROVIDER
            ========================================== */

            else {

                throw new Error(

                    `Unsupported AI provider: ${provider}`

                );

            }


            /* ==========================================
               VALIDATE ANSWER
            ========================================== */

            if (!answer) {

                throw new Error(

                    "AI did not return a response"

                );

            }


            /* ==========================================
               SEND RESPONSE
            ========================================== */

            const responseText =

`╭─〔 🤖 DRIP AI 〕
│
│ ${answer}
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

                "[AI COMMAND ERROR]",

                error.message

            );


            let errorMessage =
                error.message;


            if (
                error.response?.data
            ) {

                errorMessage =

                    error.response.data
                        ?.error
                        ?.message ||

                    error.message;

            }


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

`╭─〔 ❌ AI ERROR 〕
│
│ ${errorMessage}
│
│ Check your AI configuration.
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
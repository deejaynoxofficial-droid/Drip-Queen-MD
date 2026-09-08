const axios = require("axios");

const config = require("../config");


/* ==========================================
   DOWNLOAD API CONFIGURATION
========================================== */

const DOWNLOAD_API_KEY =
    config.API_KEYS?.DOWNLOAD ||
    config.API_KEYS?.GENERAL ||
    "";


/* ==========================================
   GET DOWNLOAD API KEY
========================================== */

function getApiKey() {

    return DOWNLOAD_API_KEY;

}


/* ==========================================
   CHECK API KEY
========================================== */

function hasApiKey() {

    return Boolean(
        DOWNLOAD_API_KEY
    );

}


/* ==========================================
   VALIDATE API KEY
========================================== */

function validateApiKey() {

    if (!hasApiKey()) {

        throw new Error(
            "Download API key is not configured. Add DOWNLOAD_API_KEY to your .env file."
        );

    }

}


/* ==========================================
   CREATE API HEADERS
========================================== */

function getApiHeaders(
    extraHeaders = {}
) {

    const headers = {

        "Content-Type":
            "application/json",


        "User-Agent":
            `${config.BOT_NAME}/${config.BOT_VERSION}`

    };


    /*
       Only add API authentication
       when an API key exists.
    */

    if (DOWNLOAD_API_KEY) {

        headers["Authorization"] =
            `Bearer ${DOWNLOAD_API_KEY}`;


        headers["x-api-key"] =
            DOWNLOAD_API_KEY;

    }


    return {

        ...headers,

        ...extraHeaders

    };

}


/* ==========================================
   VALIDATE URL
========================================== */

function isValidUrl(value) {

    try {

        const url =
            new URL(value);

        return (

            url.protocol === "http:" ||

            url.protocol === "https:"

        );

    } catch (error) {

        return false;

    }

}


/* ==========================================
   CHECK FILE SIZE
========================================== */

function isFileSizeAllowed(size) {

    if (

        size === undefined ||

        size === null ||

        size === 0

    ) {

        return true;

    }


    const fileSize =
        Number(size);


    if (
        Number.isNaN(fileSize)
    ) {

        return true;

    }


    return (

        fileSize <=
        config.DOWNLOAD.MAX_FILE_SIZE

    );

}


/* ==========================================
   FORMAT FILE SIZE
========================================== */

function formatFileSize(bytes) {

    const value =
        Number(bytes);


    if (
        !value ||
        value <= 0
    ) {

        return "Unknown";

    }


    const units = [

        "Bytes",
        "KB",
        "MB",
        "GB"

    ];


    const index =
        Math.min(

            Math.floor(
                Math.log(value) /
                Math.log(1024)
            ),

            units.length - 1

        );


    const size =
        value /
        Math.pow(
            1024,
            index
        );


    return (
        `${size.toFixed(2)} ${units[index]}`
    );

}


/* ==========================================
   CREATE AXIOS CLIENT
========================================== */

function createClient(
    options = {}
) {

    return axios.create({

        baseURL:
            options.baseURL || "",


        timeout:
            options.timeout || 60000,


        headers:

            getApiHeaders(
                options.headers || {}
            ),


        maxContentLength:
            config.DOWNLOAD.MAX_FILE_SIZE,


        maxBodyLength:
            config.DOWNLOAD.MAX_FILE_SIZE

    });

}


/* ==========================================
   MAKE API REQUEST
========================================== */

async function request({

    url,

    method = "GET",

    data,

    params,

    headers = {},

    requireApiKey = true

}) {

    if (!url) {

        throw new Error(
            "API request URL is required"
        );

    }


    if (requireApiKey) {

        validateApiKey();

    }


    try {

        const response =
            await axios({

                url,

                method,

                data,

                params,


                headers:

                    getApiHeaders(
                        headers
                    ),


                timeout:
                    60000,


                maxContentLength:
                    config.DOWNLOAD.MAX_FILE_SIZE,


                maxBodyLength:
                    config.DOWNLOAD.MAX_FILE_SIZE

            });


        return response.data;


    } catch (error) {

        const apiMessage =

            error.response
                ?.data
                ?.message ||

            error.response
                ?.data
                ?.error ||

            error.response
                ?.data
                ?.detail ||

            error.message;


        throw new Error(

            `Download service error: ${apiMessage}`

        );

    }

}


/* ==========================================
   SEARCH MEDIA

   Generic helper for query-based searching.
========================================== */

async function searchMedia({

    url,

    query,

    params = {},

    headers = {},

    requireApiKey = true

}) {

    if (!query) {

        throw new Error(
            "Search query is required"
        );

    }


    return await request({

        url,

        method:
            "GET",


        params: {

            query,

            ...params

        },


        headers,


        requireApiKey

    });

}


/* ==========================================
   DOWNLOAD FILE BUFFER
========================================== */

async function downloadFile(url) {

    if (
        !isValidUrl(url)
    ) {

        throw new Error(
            "Invalid download URL"
        );

    }


    try {

        /*
           Check remote file first.
        */

        const fileInfo =
            await getRemoteFileInfo(
                url
            );


        if (
            !fileInfo.allowed
        ) {

            throw new Error(

                `File is too large. Maximum allowed size is ${formatFileSize(
                    config.DOWNLOAD.MAX_FILE_SIZE
                )}`

            );

        }


        const response =
            await axios.get(

                url,

                {

                    responseType:
                        "arraybuffer",


                    timeout:
                        120000,


                    maxContentLength:
                        config.DOWNLOAD.MAX_FILE_SIZE,


                    maxBodyLength:
                        config.DOWNLOAD.MAX_FILE_SIZE,


                    headers: {

                        "User-Agent":
                            `${config.BOT_NAME}/${config.BOT_VERSION}`

                    }

                }

            );


        const buffer =
            Buffer.from(
                response.data
            );


        if (
            !isFileSizeAllowed(
                buffer.length
            )
        ) {

            throw new Error(

                `File is too large. Maximum allowed size is ${formatFileSize(
                    config.DOWNLOAD.MAX_FILE_SIZE
                )}`

            );

        }


        return {

            buffer,


            size:
                buffer.length,


            contentType:

                response.headers[
                    "content-type"
                ] || "",


            fileName:

                getFileNameFromUrl(
                    url
                )

        };


    } catch (error) {

        if (
            error.message?.includes(
                "File is too large"
            )
        ) {

            throw error;

        }


        throw new Error(

            `Failed to download file: ${error.message}`

        );

    }

}


/* ==========================================
   GET REMOTE FILE INFORMATION
========================================== */

async function getRemoteFileInfo(url) {

    if (
        !isValidUrl(url)
    ) {

        throw new Error(
            "Invalid file URL"
        );

    }


    try {

        const response =
            await axios.head(

                url,

                {

                    timeout:
                        30000,


                    maxRedirects:
                        5

                }

            );


        const size =
            Number(

                response.headers[
                    "content-length"
                ]

            ) || 0;


        return {

            size,


            contentType:

                response.headers[
                    "content-type"
                ] || "",


            allowed:

                isFileSizeAllowed(
                    size
                )

        };


    } catch (error) {

        /*
           Some servers block HEAD requests.
           Allow download to continue.
        */

        return {

            size:
                0,


            contentType:
                "",


            allowed:
                true

        };

    }

}


/* ==========================================
   GET FILE NAME FROM URL
========================================== */

function getFileNameFromUrl(url) {

    try {

        const parsedUrl =
            new URL(url);


        const fileName =
            path.basename(
                parsedUrl.pathname
            );


        return (
            fileName ||
            "download"
        );

    } catch (error) {

        return "download";

    }

}


/* ==========================================
   GET MAXIMUM FILE SIZE
========================================== */

function getMaxFileSize() {

    return (
        config.DOWNLOAD.MAX_FILE_SIZE
    );

}


/* ==========================================
   EXPORT
========================================== */

module.exports = {

    getApiKey,

    hasApiKey,

    validateApiKey,

    getApiHeaders,

    createClient,

    request,

    searchMedia,

    downloadFile,

    getRemoteFileInfo,

    getFileNameFromUrl,

    isValidUrl,

    isFileSizeAllowed,

    formatFileSize,

    getMaxFileSize

};
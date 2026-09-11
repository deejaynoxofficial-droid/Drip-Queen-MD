"use strict";

require("dotenv").config();

const express = require("express");
const createDashboard = require("../src/dashboard");

const app = express();

app.disable("x-powered-by");

try {
    createDashboard(app);
} catch (error) {
    console.error("[VERCEL API] Failed to initialize dashboard:", error);
    app.use((req, res) => {
        res.status(500).json({
            success: false,
            error: "Dashboard failed to initialize",
            details: process.env.NODE_ENV === "development"
                ? error.message
                : undefined
        });
    });
}

module.exports = app;

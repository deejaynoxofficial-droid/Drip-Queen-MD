"use strict";

require("dotenv").config();

const express = require("express");
const createDashboard = require("../src/dashboard");

const app = express();

// Vercel owns the HTTP lifecycle here. Do not call app.listen().
createDashboard(app);

module.exports = app;

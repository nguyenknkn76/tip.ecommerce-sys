require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');

const app = express();

// console.log('Process:::', process.env)

// init middlewares
app.use(morgan("dev"));
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}))
// init databases
require('./dbs/init.mongodb');

// handle errors

// init routers
app.use('/',require('./routes/'))

module.exports = app;
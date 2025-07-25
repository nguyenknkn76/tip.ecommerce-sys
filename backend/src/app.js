const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');

const app = express();

// init middlewares
app.use(morgan("dev"));
app.use(helmet());
app.use(compression());

// init databases
require('./dbs/init.mongodb');

// handle errors

// init routers
app.get('/', (req, res, next) => {
  return res.status(200).json({
    message: 'Welcome to my world',
    // metadata: "itrycompressionstring".repeat(200000),
  });
})

module.exports = app;
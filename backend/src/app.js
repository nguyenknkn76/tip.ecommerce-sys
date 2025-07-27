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

// init routers
app.use('/',require('./routes/'))

// handle errors
app.use((req, res, next)=> {
  const error = new Error('Not Found');
  error.status = 404;
  return next(error);
})
app.use((error, req, res, next) => {
  const statusCode = error.status || 500;
  return res.status(statusCode).json({
    status: 'error',
    code: statusCode,
    message: error.message || 'Internal Server Error',
  });
})

module.exports = app;
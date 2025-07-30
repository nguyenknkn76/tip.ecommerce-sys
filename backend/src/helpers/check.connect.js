'use strict'

const mongoose = require('mongoose');
const os =  require('os');
const process = require('process');
const _SECOND = 5000;

/**
 * Logs the current number of active Mongoose connections.
 * Useful for quick diagnostics of connection pool status.
 *
 * @function countConnect
 * @returns {void}
 */

const countConnect = () => {
  const numberConnection = mongoose.connections.length
  console.log(`Number of connection:::${numberConnection}`);
}

/**
 * Periodically checks for MongoDB connection overload based on CPU core count.
 * Logs memory usage and total active connections every 5 seconds.
 * Triggers a warning if active connections exceed the calculated threshold.
 *
 * @function checkOverload
 * @returns {void}
 */

const checkOverload = () => {
  setInterval(() => {
    const numberConnection = mongoose.connections.length;
    const numCores = os.cpus().length;
    const memoryUsage = process.memoryUsage().rss;
    // eg: max no of connections based on no of cores (eg: 5 connections/core, OR 5 connections/server)
    const maxConnection = numCores * 5; 
    console.log(`Active connections::: ${numberConnection}`);
    console.log(`Memory usage::: ${memoryUsage / 1024 / 1024} MB`);
    if(numberConnection > maxConnection){
      console.log(`Connection overload detected!`)
      // notify.send(...)
    }
  }, _SECOND);

}

module.exports = {
  countConnect,
  checkOverload
}
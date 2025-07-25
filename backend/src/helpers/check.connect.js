'use strict'

const mongoose = require('mongoose');
const os =  require('os');
const process = require('process');
const _SECOND = 5000;
/**
 * Count connect
 */
const countConnect = () => {
  const numberConnection = mongoose.connections.length
  console.log(`Number of connection:::${numberConnection}`);
}

/**
 * Check overload
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
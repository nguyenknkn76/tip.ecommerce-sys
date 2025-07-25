`use strict`

const mongoose = require('mongoose');
const { countConnect, checkOverload } = require('../helpers/check.connect');
const connectString = `mongodb://localhost:27017/shopDEV`

class Database {
  constructor(){
    this.connect();
  }

  connect(type = 'mongodb'){
    if(1 === 1){
      mongoose.set('debug', true);
      mongoose.set('debug', { color: true});
    }
    mongoose
      .connect(connectString, {
        maxPoolSize: 50
      })
      .then(_ => {
        console.log(`Connect Mongodb success`);
        // console.log(countConnect());
        // checkOverload();
      })
      .catch(err => console.log(`Error connect Mongodb ::: ${err}`))
  }

  static getInstance(){
    if(!Database.instance) Database.instance = new Database();
    return Database.instance;
  }
}

const instanceMongodb = Database.getInstance();

module.exports = instanceMongodb;




'use strict'

// level 1
const dev = {
  app: {
    port: process.env.DEV_APP_PORT || 3000,
  },
  db: {
    host: process.env.DEV_DB_HOST || 'localhost',
    port: process.env.DEV_DB_PORT || 27017,
    name: process.env.DEV_DB_NAME || 'shopDEV',
  }
};
const pro = {
  app: {
    port: process.env.PRO_APP_PORT || 3001,
  },
  db: {
    host: process.env.PRO_DB_HOST || 'localhost',
    port: process.env.PRO_DB_PORT || 27017,
    name: process.env.PRO_DB_NAME || 'shopPRO',
  }
};
const config = {dev, pro};
const env = process.env.NODE_ENV || 'dev';
console.log(config[env])

module.exports = config[env];

// // level 0
// const config = {
//   app: {
//     port: 3000,
//   },
//   db: {
//     host: 'localhost',
//     port: 27017,
//     name: 'db',
//   }
// };
// module.exports = config

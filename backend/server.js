const app = require("./src/app");
const {app: {port}} = require('./src/configs/config.mongodb');
const PORT = port;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
})

// console.log(process.env);
process.on('SIGINT', () => {
  server.close(() => console.log(`x-x Exit server express`));
  // notify.send(ping...)
})
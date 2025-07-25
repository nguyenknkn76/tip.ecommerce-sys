const app = require("./src/app");

const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
})

process.on('SIGINT', () => {
  server.close(() => console.log(`x-x Exit server express`));
  // notify.send(ping...)
})
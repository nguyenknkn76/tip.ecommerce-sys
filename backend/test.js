const { removeUndefinedObject, updateNestedObjectParser, logValue } = require("./src/utils");

const value1 = 12345;

logValue(`value1`, value1);
// const obj = {
//   name: "iphone",
//   brand: "apple",
//   price: 123456,
//   advanced: {
//     code_bar: 123456,
//     color: "RED"
//   }
// }
// console.log(obj);
// // const newObject = removeUndefinedObject(obj);
// const newObject = updateNestedObjectParser(obj);
// console.log(newObject);


const { removeUndefinedObject, updateNestedObjectParser } = require("./src/utils");

const obj = {
  name: "iphone",
  brand: "apple",
  price: 123456,
  advanced: {
    code_bar: 123456,
    color: "RED"
  }
}
console.log(obj);
// const newObject = removeUndefinedObject(obj);
const newObject = updateNestedObjectParser(obj);
console.log(newObject);


'use strict'

const _ = require('lodash');
const { Types } = require('mongoose');
const path = require('path');

/**
 * !
 * @function convertToObjectIdMongodb
 * @param {String} id 
 * @returns 
 */
const convertToObjectIdMongodb = id => new Types.ObjectId(id);

/**
 * ! Extracts specific fields from an object.
 * 
 * @function getInfoData
 * @param {Object} params
 * @param {string[]} params.fields - An array of keys to extract from the object.
 * @param {Object} params.object 
 * @returns {Object} - A new object containing only the specified fields.
 * 
 * @example
 * const user = { name: 'Nguyen', age: 25, email: 'nguyen@example.com' };
 * const result = getInfoData({ fields: ['name', 'email'], object: user });
 * result => { name: 'Nguyen', email: 'nguyen@example.com' }
 */

const getInfoData = ({fields = [], object = {}}) => {
  return _.pick(object, fields);
}

/**
 * ! Generates a MongoDB projection obj that includes specific fields.

 * @example getSelectData(["name", "email"]) → returns: {name: 1, email: 1}  
 *
 * @function getSelectData
 * @param {String[]} select - arr of field names to include (e.g. ["name", "email"])
 * @returns {Object} Object - mongodb projection obj with fields set to 1
 */

const getSelectData = (select = []) => {
  return Object.fromEntries(select.map(el => [el, 1]));
}

/**
 * ! Generates a MongoDB projection obj that excludes specific fields
 * @example getSelectData(["name", "email"]) → returns: {name: 0, email: 0} 
 *
 * @function unGetSelectData
 * @param {String[]} select 
 * @returns {Object}
 */

const unGetSelectData = (select = []) => {
  return Object.fromEntries(select.map(el => [el, 0]));
}

/**
 * ! Removes all keys from an obj whose values are `null`
 * * This func NOT remove `undefined` value
 *
 * @function removeUndefinedObject
 * @param {Object} object - input to clean
 * @returns {Object} 
 * 
 * @example
 * const obj = {a: 1, b: null}
 * const cleaned = removeUndefinedObject(obj)
 * return cleaned {a: 1}
 */

const removeUndefinedObject = object => {
  Object.keys(object).forEach(key => {
    if(object[key] == null) delete object[key];
  });
  return object;
}

const updateNestedObjectParser = object => {
  // console.log(`cmt.utils.index.[1]:::`, object);
  const final = {};
  Object.keys(object).forEach(key => {
    if(typeof object[key] === 'object' && !Array.isArray(object[key])){
      const res = updateNestedObjectParser(object[key]);
      Object.keys(res).forEach(a => {
        final[`${key}.${a}`] = res[a];
      });
    } else final[key] = object[key];
  });
  // console.log(`cmt.utils.index.[2]:::`, final);
  return final;
}

/**
 * ! log value to debug
 * @function logValue
 * @param {String} key 
 * @param {*} value
 * 
 * @example
 * const myName = `Nguyen`
 * logValue(`myName`, myName);
 * @output [LOG].cmt.file-location.file-name.MYNAME:::Nguyen
 */
const logValue = (key, value) => {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = (_, stack) => stack;
    const err = new Error();
    const caller = err.stack[1];
    const location = caller.getFileName();
    const upperKey = key.toUpperCase();
    console.log(`[LOG].cmt.${location}.${upperKey}:::${value}`)
  } catch (error) {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
}

const printObjectKeyValue = (obj) => {
  for (const [key, value] of Object.entries(obj)) {
    console.log(`${key}:`, value);
  }
}
module.exports = {
  getInfoData,
  getSelectData,
  unGetSelectData,
  removeUndefinedObject,
  updateNestedObjectParser,
  convertToObjectIdMongodb,
  logValue,
  printObjectKeyValue
}
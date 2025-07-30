'use strict'

const _ = require('lodash');

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

const getSelectData = (select = []) => {
  return Object.fromEntries(select.map(el => [el, 1]));
}

const unGetSelectData = (select = []) => {
  return Object.fromEntries(select.map(el => [el, 0]));
}

module.exports = {
  getInfoData,
  getSelectData,
  unGetSelectData,
}
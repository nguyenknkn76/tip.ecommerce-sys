'use strict'

const apikeyModel = require("../models/apikey.model")
const crypto = require('crypto');

const findById = async (key) => {
  // console.log(`api.key.service:::IM-HERE-GUYS`)
  // const newKey = await apikeyModel.create({
  //   key: crypto.randomBytes(64).toString('hex'),
  //   permissions: ['0000']
  // });
  // console.log('cmt.apikey.service:::NEWKEY:::', newKey);
  const objKey = await apikeyModel.findOne({key, status: true}).lean();
  return objKey;
}

module.exports = {
  findById,
}
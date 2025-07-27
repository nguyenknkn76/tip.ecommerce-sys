'use strict'

const { Types } = require("mongoose");
const keytokenModel = require("../models/keytoken.model");

class KeyTokenService {
  
  static createKeyToken = async ({userId, publicKey, privateKey, refreshToken}) => {

    try {
      // // lv0
      // const tokens = await keytokenModel.create({
      //   user: userId,
      //   publicKey,
      //   privateKey
      // });
      // return tokens ? tokens.publicKey : null  

      // level xxx
      const filter = {user: userId};
      const update = {
        publicKey, privateKey, refreshTokensUsed: [], refreshToken 
      }
      const options = {upsert: true, new: true};
      const tokens = await keytokenModel.findOneAndUpdate(filter, update, options);
      
      return tokens ? tokens.publicKey : null;
    } catch (error) {
      return error;
    }
  }

  static findByUserId = async (userId) => {
    // console.log(':::find by user id:::');
    // const objUserId = new Types.ObjectId(userId);
    // console.log(objUserId);
    return await keytokenModel.findOne({user: userId}).lean();
  }

  static removeKeyById = async (id) => {
    // console.log(`[Error]: key.token.service.ID:::`,id);
    return await keytokenModel.deleteOne(id);
  }
}

module.exports = KeyTokenService;
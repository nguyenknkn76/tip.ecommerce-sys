'use strict'

const shopModel = require("../models/shop.model");
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const KeyTokenService = require("./keyToken.service");
const { createTokenPair } = require("../auth/authUtils");
const { getInfoData } = require("../utils");

const RoleShop = {
  SHOP: 'SHOP',
  WRITER: 'WRITER',
  EDITOR: 'EDITOR',
  ADMIN: 'ADMIN'
}

class AccessService {
  
  static signUp = async ({name, email, password}) => {
    try {
      // step1:
      const hodelShop = await shopModel.findOne({email}).lean();
      if(hodelShop){
        return {
          code: 'xxxx',
          message: 'Shop already registered',
        }
      }
      // console.log(`cmt.access.services`,{name, password, email});
      const passwordHash = await bcrypt.hash(password, 10)
      const newShop = await shopModel.create({
        name, email, password: passwordHash, roles: [RoleShop.SHOP]
      });

      if(newShop){
        // create privateKey, publicKey by using crypto
        const privateKey = crypto.randomBytes(64).toString('hex');
        const publicKey = crypto.randomBytes(64).toString('hex');
        
        const keyStore = await KeyTokenService.createKeyToken({
          userId: newShop._id,
          publicKey,
          privateKey
        });

        if(!keyStore){
          return {
            code: 'xxxx',
            message: 'keyStore error',
          }
        }
        // create token pair
        const tokens = await createTokenPair({userId: newShop._id, email}, publicKey, privateKey);
        console.log(`cmt.access.service.Created token success::`, tokens);

        return {
          code: 201,
          metadata: {
            shop: getInfoData({fields: ['_id', 'name', 'email'], object: newShop}),
            tokens,
          }
        };
      }
      return {
        code: 200,
        metadata: null
      }
    } catch (error) {
      console.log(`[ERROR].err.access.service.signup:::`,error);
      return {
        code: 'xxx.err.access.service.signup',
        message: error.message,
        status: 'error'
      }
    }
  }
}

module.exports = AccessService;
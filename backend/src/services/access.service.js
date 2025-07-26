'use strict'

const shopModel = require("../models/shop.model");
const bcrypt = require('bcrypt');
const crypto = require('crypto');
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
        const {privateKey, publicKey} = crypto.generateKeyPairSync('rsa', {
          modulusLength: 4096,
          publicKeyEncoding: {
            type:'pkcs1', // pkcs8
            format: 'pem'
          },
          privateKeyEncoding: {
            type:'pkcs1',
            format: 'pem'
          }
        });
        // Public key crypto graphy standards!
        
        console.log({privateKey, publicKey})  // save collection KeyStore
        
        const publicKeyString  = await KeyTokenService.createKeyToken({
          userId: newShop._id,
          publicKey
        });

        if(!publicKeyString){
          return {
            code: 'xxxx',
            message: 'publicKeyString error',
          }
        }

        const publicKeyObject = crypto.createPublicKey(publicKeyString);
        // create token pair
        const tokens = await createTokenPair({userId: newShop._id, email}, publicKeyObject, privateKey);
        console.log(`Created token success::`, tokens);

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
      return {
        code: 'xxx',
        message: error.message,
        status: 'error'
      }
    }
  }
}

module.exports = AccessService;
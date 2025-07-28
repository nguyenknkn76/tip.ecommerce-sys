'use strict'

const shopModel = require("../models/shop.model");
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const KeyTokenService = require("./keyToken.service");
const { createTokenPair, verifyJWT } = require("../auth/authUtils");
const { getInfoData } = require("../utils");
const { BadRequestError, AuthFailureError, ForbiddenError } = require("../core/error.response");
const { findByEmail } = require("./shop.service");

const RoleShop = {
  SHOP: 'SHOP',
  WRITER: 'WRITER',
  EDITOR: 'EDITOR',
  ADMIN: 'ADMIN'
}

class AccessService {
  /*
    1. check token be used
  */
  static handleRefreshToken = async (refreshToken) => {
    const foundToken = await KeyTokenService.findByRefreshTokenUsed(refreshToken);
    if(foundToken){
      // decode: who are you?
      const {userId, email} = await verifyJWT(refreshToken, foundToken.privateKey);
      console.log(`cmt.v1.access.service::userid, email`, {userId, email});
      // delete all keys in keyStore
      await KeyTokenService.deleteKeyById(userId);
      throw new ForbiddenError('Something went wrong! Pls relogin');
    }

    const holderToken = await KeyTokenService.findByRefreshToken(refreshToken);
    console.log(`cmt.v1.access.service::holderToken`, holderToken);
    if(!holderToken) throw new AuthFailureError('Shop not registered');


    // verify token
    const {userId, email} = await verifyJWT(refreshToken, holderToken.privateKey);
    console.log(`cmt.v2.access.service::userid, email`, {userId, email});

    // check userId
    const foundShop = await findByEmail({email});
    if(!foundShop) throw new AuthFailureError('Shop not registered');

    // create 1 new token pair
    const tokens = await createTokenPair({userId, email}, holderToken.publicKey, holderToken.privateKey);

    // update token
    await holderToken.updateOne({
      $set: {
        refreshToken: tokens.refreshToken,
      },
      $addToSet: {
        refreshTokensUsed: refreshToken, // be used to get new token
      },
    });
    return{
      user: {userId, email},
      tokens,
    }
  }

  static logout = async ( keyStore ) => {
    const delKey = await KeyTokenService.removeKeyById(keyStore._id);
    return delKey;
  }

    /*
      1. check email in dbs
      2. match password
      3. create AT vs RT and save 
      4. generate tokens
      5. get data return login
    */
  static login = async ({email, password, refreshToken = null}) => {
    const foundShop = await findByEmail({email});
    if(!foundShop) throw  new BadRequestError('[Error] Shop not registered');

    const match = bcrypt.compare(password, foundShop.password);
    if (!match) throw new AuthFailureError('[Error] Authentication error');
    
    const privateKey = crypto.randomBytes(64).toString('hex');
    const publicKey = crypto.randomBytes(64).toString('hex');

    const {_id: userId} = foundShop;
    const tokens = await createTokenPair({userId, email}, publicKey, privateKey);

    await KeyTokenService.createKeyToken({
      refreshToken: tokens.refreshToken,
      privateKey, publicKey, userId
    });
    return {
      shop: getInfoData({fields: ['_id', 'name', 'email'], object: foundShop}),
      tokens
    }
  }


  static signUp = async ({name, email, password}) => {
    // try {
      // step1:
      const hodelShop = await shopModel.findOne({email}).lean();
      if(hodelShop) throw new BadRequestError('[Error]: Shop already registered!');

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
        // throw new BadRequestError('[Error]: Shop already registered!');          
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
    // } catch (error) {
    //   console.log(`[ERROR].err.access.service.signup:::`,error);
    //   return {
    //     code: 'xxx.err.access.service.signup',
    //     message: error.message,
    //     status: 'error'
    //   }
    // }
  }
}

module.exports = AccessService;
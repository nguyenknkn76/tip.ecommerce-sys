`use strict`

const JWT = require('jsonwebtoken');
const {asyncHandler} = require('../helpers/asyncHandler');
const { AuthFailureError, NotFoundError } = require('../core/error.response');
const { findByUserId } = require('../services/keyToken.service');

const HEADER = {
  API_KEY: 'x-api-key',
  CLIENT_ID: 'x-client-id',
  AUTHORIZATION: 'authorization',
  REFRESHTOKEN: 'x-rtoken-id',
};

const createTokenPair = async (payload, publicKey, privateKey) => {
  try {
    // access token
    const accessToken = await JWT.sign(payload, publicKey, {
      expiresIn: '2 days',
    });
    const refreshToken = await JWT.sign(payload, privateKey, {
      expiresIn: '7 days',
    });

    JWT.verify( accessToken, publicKey, (err, decode) => {
      if(err) console.log(`error verify::`, err);
      else console.log(`decode verify::`, decode);
    })
    return {accessToken, refreshToken};
  } catch (error) {
    console.log(`[ERROR] auth.authUtils::: error create token pair::`, error);
  }
}

/*
  1. check userId missing???
  2. get accessToken
  3. verifyToken
  4. check user in db
  5. check keyStore with this userId
  6. All Good → return next()
*/
const authentication = asyncHandler( async (req, res, next) => {
  const userId = req.headers[HEADER.CLIENT_ID];
  if(!userId) throw new AuthFailureError('Invalid request');

  const keyStore = await findByUserId( userId );
  if(!keyStore) throw new NotFoundError('Not found keyStore');

  const accessToken = req.headers[HEADER.AUTHORIZATION];
  if(!accessToken) throw new AuthFailureError('Invalid request');

  try {
    const decodeUser = JWT.verify(accessToken, keyStore.publicKey);
    if(userId !== decodeUser.userId) throw new AuthFailureError('Invalid userId');
    req.keyStore = keyStore;
    req.user = decodeUser;
    return next();
  } catch (error) {
    console.log(`[Error]auth.utils.authentication:::`, error)
    throw error;
  }
});

/*
  ! FIX: authentication V2
  1. check userId missing???
  2. get accessToken
  3. verifyToken
  4. check user in db
  5. check keyStore with this userId
  6. All Good → return next()
*/
const authenticationV2 = asyncHandler( async (req, res, next) => {
  const userId = req.headers[HEADER.CLIENT_ID];
  if(!userId) throw new AuthFailureError('Invalid request');

  const keyStore = await findByUserId( userId );
  if(!keyStore) throw new NotFoundError('Not found keyStore');

  if(req.headers[HEADER.REFRESHTOKEN]){
    try {
      const refreshToken = req.headers[HEADER.REFRESHTOKEN];
      const decodeUser = JWT.verify(refreshToken, keyStore.privateKey);
      if(userId !== decodeUser.userId) throw new AuthFailureError('Invalid userId');
      req.keyStore = keyStore;
      req.user = decodeUser;
      req.refreshToken = refreshToken;
      return next();
    } catch (error) {
      console.log(`[Error]auth.utils.authentication:::`, error)
      throw error;
    }
  }

  // access token in authentication V2
  const accessToken = req.headers[HEADER.AUTHORIZATION];
  if(!accessToken) throw new AuthFailureError('Invalid request');

  try {
    const decodeUser = JWT.verify(accessToken, keyStore.publicKey);
    if(userId !== decodeUser.userId) throw new AuthFailureError('Invalid userId');
    req.keyStore = keyStore;
    req.user = decodeUser;
    return next();
  } catch (error) {
    console.log(`[Error]auth.utils.authentication:::`, error)
    throw error;
  }
});

const verifyJWT = async (token, keySecret) => {
  return await JWT.verify(token, keySecret);
}

module.exports = {
  createTokenPair,
  authentication,
  authenticationV2,
  verifyJWT
}
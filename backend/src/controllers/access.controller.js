'use strict'

const { CREATED, SuccessResponse } = require("../core/success.response");
const AccessService = require("../services/access.service");

class AccessController {

  // handleRefreshToken = async (req, res, next) => {
  //   new SuccessResponse({
  //     message: 'Get newToken success!',
  //     metadata: await AccessService.handleRefreshToken(req.body.refreshToken),
  //   }).send(res);
  // }

  //! fix: handle refreshToken V2, no need accessToken
  handleRefreshToken = async (req, res, next) => {
    new SuccessResponse({
      message: 'Get newToken success!',
      metadata: await AccessService.handleRefreshTokenV2({
        refreshToken: req.refreshToken,
        user: req.user,
        keyStore: req.keyStore,
      }),
    }).send(res);
  }

  logout = async (req, res, next) => {
    // console.log("cmt.accesss.controller.keyStore",req.keyStore)
    new SuccessResponse({
      message: 'Logout success!',
      metadata: await AccessService.logout(req.keyStore),
    }).send(res);
  }

  login = async (req, res, next) => {
    new SuccessResponse({
      metadata: await AccessService.login(req.body),
    }).send(res);
  }
  signUp = async (req, res, next) => {
      // console.log(`cmt.access.controller::signUp::`, req.body);
      new CREATED ({
        message: "Register OK",
        metadata: await AccessService.signUp(req.body),
        options: {
          limit: 10,
        }
      }).send(res);
      // return res.status(201).json(await AccessService.signUp(req.body));
  }
}

module.exports = new AccessController();
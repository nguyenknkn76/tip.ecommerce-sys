'use strict'

const { CREATED } = require("../core/success.response");
const AccessService = require("../services/access.service");

class AccessController {
  
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
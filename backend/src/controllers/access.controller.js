'use strict'

const AccessService = require("../services/access.service");

class AccessController {
  
  signUp = async (req, res, next) => {
      console.log(`cmt.access.controller::signUp::`, req.body);
      return res.status(201).json(await AccessService.signUp(req.body));
  }
}

module.exports = new AccessController();
'use strict'

const AccessService = require("../services/access.service");

class AccessController {
  
  signUp = async (req, res, next) => {
    try {
      console.log(`[P]::signUp::`, req.body);
      return res.status(201).json(await AccessService.signUp(req.body));
      // return res.status(201).json({
      //   code: '20001',
      //   metadata: {userid: 1}
      // })
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AccessController();
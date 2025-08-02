const { SuccessResponse } = require("../core/success.response");
const CheckoutService = require("../services/checkout.service");

`use strict`

class CheckoutController {
  
  checkoutReview = async (req, res, next) => {
    new SuccessResponse({
      message: "checkoutReview success",
      metadata: await CheckoutService.checkoutReview(req.body),
    }).send(res);
  }
}

module.exports = new CheckoutController();
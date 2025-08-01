'use strict'

const { SuccessResponse } = require("../core/success.response")
const DiscountService = require("../services/discount.service")

class DiscountController {
  createDiscountCode = async (req, res, next) => {
    new SuccessResponse({
      message: 'createDiscountCode success',
      metadata: await DiscountService.createDiscountCode({
        ...req.body,
        shopId: req.user.userId
      }),
    }).send(res);
  }

  getAllDiscountCodes = async (req, res, next) => {
    new SuccessResponse({
      message: 'getAllDiscountCodes success',
      metadata: await DiscountService.getAllDiscountCodesByShop({
        ...req.query,
        shopId: req.user.userId
      }),
    }).send(res);
  }

  getDiscountAmount = async (req, res, next) => {
    new SuccessResponse({
      message: 'getDiscountAmount success',
      metadata: await DiscountService.getDiscountAmount({
        ...req.body,
      }),
    }).send(res);
  }

  getAllDiscountCodesWithProduct = async (req, res, next) => {
    new SuccessResponse({
      message: 'getAllDiscountCodesWithProduct success',
      metadata: await DiscountService.getAllDiscountCodesWithProduct({
        ...req.query,
      }),
    }).send(res);
  }

  //todo delete and cancel func for discount.controller
  // getAllDiscountCodes = async (req, res, next) => {
  //   new SuccessResponse({
  //     message: 'getAllDiscountCodes success',
  //     metadata: await DiscountService.getAllDiscountCodesByShop({
  //       ...req.query,
  //       shopId: req.user.userId
  //     }),
  //   });
  // }

  // getAllDiscountCodes = async (req, res, next) => {
  //   new SuccessResponse({
  //     message: 'getAllDiscountCodes success',
  //     metadata: await DiscountService.getAllDiscountCodesByShop({
  //       ...req.query,
  //       shopId: req.user.userId
  //     }),
  //   });
  // }
}

module.exports = new DiscountController();
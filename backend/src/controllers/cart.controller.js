'use strict'

const { SuccessResponse } = require("../core/success.response");
const CartService = require("../services/cart.service");

class CartController {
  
  /**
   * ! @description: add to cart for user 
   * @param {int} userId 
   * @param {*} res 
   * @param {*} next 
   * @method POST
   * @url /v1/api/cart/user
   * @returns ...
   */
  addToCart = async (req, res, next) => {
    new SuccessResponse({
      message: 'addToCart success',
      metadata: await CartService.addToCart(req.body),
    }).send(res);
  }

  update = async (req, res, next) => {
    new SuccessResponse({
      message: 'update cart success',
      metadata: await CartService.addToCartV2(req.body),
    }).send(res);
  }

  delete = async (req, res, next) => {
    new SuccessResponse({
      message: 'delete cart success',
      metadata: await CartService.deleteUserCart(req.body),
    }).send(res);
  }

  listToCart = async (req, res, next) => {
    new SuccessResponse({
      message: 'listToCart success',
      metadata: await CartService.getListUserCart(req.query),
    }).send(res);
  }
}

module.exports = new CartController();
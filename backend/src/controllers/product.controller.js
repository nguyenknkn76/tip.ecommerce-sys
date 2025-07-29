'use strict'

const { SuccessResponse } = require("../core/success.response");
const { product } = require("../models/product.model");
const ProductService = require("../services/product.service");

class ProductController {
  createProduct = async (req, res, next) => {
    console.log(`cmt.product.controller.v2.userId::::`, req.user);
    new SuccessResponse({
      message: 'Create new product success',
      metadata: await ProductService.createProduct(
        req.body.product_type, 
        {
          ...req.body,
          product_shop: req.user.userId
        },
      ),
    }).send(res);
  }
}
module.exports = new ProductController();
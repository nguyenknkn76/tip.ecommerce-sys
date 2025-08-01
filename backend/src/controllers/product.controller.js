'use strict'

const { SuccessResponse } = require("../core/success.response");
const { product } = require("../models/product.model");
const ProductService = require("../services/product.service");
const ProductServiceV2 = require("../services/xxx.advanced.product.service");

class ProductController {
  createProduct = async (req, res, next) => {
    new SuccessResponse({
      message: 'createProduct success',
      metadata: await ProductServiceV2.createProduct(
        req.body.product_type, 
        {
          ...req.body,
          product_shop: req.user.userId
        },
      ),
    }).send(res);
  }

  // update Product
  updateProduct = async (req, res, next) => {
    new SuccessResponse({
      message: 'updateProduct success',
      metadata: await ProductServiceV2.updateProduct(
        req.body.product_type,
        req.params.productId,
        {
          ...req.body,
          product_shop: req.user.userId
        }
      ),
    }).send(res);
  }

  publishProductByShop = async (req, res, next) => {
    new SuccessResponse({
      message: 'publishProductByShop success',
      metadata: await ProductServiceV2.publishProductByShop(
        {
          product_id: req.params.id,
          product_shop: req.user.userId
        },
      ),
    }).send(res);
  }

  unPublishProductByShop = async (req, res, next) => {
    new SuccessResponse({
      message: 'unPublishProductByShop success',
      metadata: await ProductServiceV2.unPublishProductByShop(
        {
          product_id: req.params.id,
          product_shop: req.user.userId
        },
      ),
    }).send(res);
  }

  //! QUERY

  /**
   * @description Get all Draft for shop
   * @param {Number} limit 
   * @param {Number} skip
   * @returns {JSON}
   */
  getAllDrafsForShop = async (req, res, next) => {
    new SuccessResponse({
      message: 'Get list Draft success',
      metadata: await ProductServiceV2.findAllDrafsForShop({
        product_shop: req.user.userId
      }),
    }).send(res);
  }

  getAllPublishForShop = async (req, res, next) => {
    new SuccessResponse({
      message: 'Get list Publish success',
      metadata: await ProductServiceV2.findAllPublishForShop({
        product_shop: req.user.userId
      }),
    }).send(res);
  }

  getListSearchProducts = async (req, res, next) => {
    new SuccessResponse({
      message: 'getListSearchProducts success',
      metadata: await ProductServiceV2.searchProducts(req.params),
    }).send(res);
  }

  findAllProducts = async (req, res, next) => {
    new SuccessResponse({
      message: 'findAllProducts success',
      metadata: await ProductServiceV2.findAllProducts(req.query),
    }).send(res);
  }
  findProduct = async (req, res, next) => {
    new SuccessResponse({
      message: 'findProduct success',
      metadata: await ProductServiceV2.findProduct({
        product_id: req.params.product_id 
      }),
    }).send(res);
  }

  //! END QUERY
}
module.exports = new ProductController();
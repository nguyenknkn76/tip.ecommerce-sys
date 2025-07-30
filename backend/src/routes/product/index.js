'use strict'

const express = require('express');
const { authentication, authenticationV2 } = require('../../auth/authUtils');
const { asyncHandler } = require('../../helpers/asyncHandler');
const ProductController = require('../../controllers/product.controller');
const productController = require('../../controllers/product.controller');
const router = express.Router();

router.get('/search/:keySearch', asyncHandler(productController.getListSearchProducts));
router.get('/', asyncHandler(productController.findAllProducts));
router.get('/:product_id', asyncHandler(productController.findProduct));

// authentication
router.use(authenticationV2);
// product
router.post('', asyncHandler(ProductController.createProduct));
router.post('/publish/:id', asyncHandler(ProductController.publishProductByShop));
router.post('/unpublish/:id', asyncHandler(ProductController.unPublishProductByShop));
// QUERY
router.get('/drafts/all', asyncHandler(ProductController.getAllDrafsForShop));
router.get('/published/all', asyncHandler(ProductController.getAllPublishForShop));

module.exports = router;
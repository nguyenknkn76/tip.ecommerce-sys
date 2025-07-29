'use strict'

const express = require('express');
const { authentication } = require('../../auth/authUtils');
const { asyncHandler } = require('../../helpers/asyncHandler');
const ProductController = require('../../controllers/product.controller');
const router = express.Router();

// authentication
router.use(authentication);
// 
router.post('', asyncHandler(ProductController.createProduct));

module.exports = router;
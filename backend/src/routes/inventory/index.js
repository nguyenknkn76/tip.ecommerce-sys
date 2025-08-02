const express = require('express');
const { asyncHandler } = require('../../helpers/asyncHandler');
const { authentication, authenticationV2 } = require('../../auth/authUtils');
const inventoryController = require('../../controllers/inventory.controller');
const router = express.Router();

router.use(authenticationV2);
router.post('', asyncHandler(inventoryController.addStockToInventory));

module.exports = router;
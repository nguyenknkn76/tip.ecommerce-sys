'use strict'

const mongoose = require('mongoose'); // Erase if already required
const DOCUMENT_NAME = "Inventory";
const COLLECTION_NAME = "inventories";

// Declare the Schema of the Mongo model
const inventorySchema = new mongoose.Schema({
  inven_productId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Product',
  },
  inven_location: {
    type: String, 
    default: 'unKnow',
  },
  inven_stock: {
    type: Number, 
    require: true
  },
  inven_shopId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Shop',
  },
  // cartId, stock, createdOn
  inven_reservations: {
    type: Array,
    default: []
  }
},{
  timestamps: true,
  collection: COLLECTION_NAME,
});

//Export the model
module.exports = {
  inventory: mongoose.model(DOCUMENT_NAME, inventorySchema),

}
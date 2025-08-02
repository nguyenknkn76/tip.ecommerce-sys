'use strict'

'use strict'

const mongoose = require('mongoose'); // Erase if already required
const DOCUMENT_NAME = "Order";
const COLLECTION_NAME = "Orders";

// Declare the Schema of the Mongo model
const orderSchema = new mongoose.Schema({
  order_userId: {
    type: Number,
    require: true,
  },
  order_checkout: {
    type: Object,
    default: {} //e.g: {totalPrice, totalApllyDiscount, feeShip}
  },
  order_shipping: {
    type: Object,
    default: {}, //e.g. street, city, state, country
  },
  order_payment: {
    type: Object, 
    default: {}
  },
  order_products: {
    type: Array,
    require: true
  },
  order_trackingNumber: {
    type: String, 
    default:'#00001102082025'
  },
  order_status: {
    type: String, 
    enum: ['pending', 'confirmed', 'shipped', 'cancelled', 'delivered '],
    default: 'pending'
  },

},{
  timestamps: {
    createdAt: 'createdOn',
    updatedAt: 'modifiedOn'
  },
  collection: COLLECTION_NAME,
});

module.exports = {
  order: mongoose.model(DOCUMENT_NAME, orderSchema),
}
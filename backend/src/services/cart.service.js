const { NotFoundError } = require("../core/error.response");
const { cart } = require("../models/cart.model");
const { getProductById } = require("../models/repositories/product.repo");

`use strict`

class CartService {
  // CART REPO
  static async createUserCart({userId, product}){
    const query = {cart_userId: userId, cart_state: 'active'},
    updateOrInsert = {
      $addToSet: {cart_products: product}
    },
    options = { upsert: true, new: true}
    return await cart.findOneAndUpdate(query, updateOrInsert,options);
  }

  static async updateUserCartQuantity({userId, product}){
    const {productId, quantity} = product;
    const query = {
      cart_userId: userId,
      'cart_products.productId': productId,
      cart_state: 'active'
    },
    updateSet = {
      $inc: {'cart_products.$.quantity': quantity}
    },
    options = { upsert: true, new: true}
    return await cart.findOneAndUpdate(query, updateSet, options);
  }

  // END REPO
  

/*
  1. check cart exists
  2. if userCart exist but cart is empty
  3. if userCart exist and have this product → update quantity

*/
  static async addToCart({userId, product = {}}){
    const userCart = await cart.findOne({cart_userId: userId});
    
    if(!userCart) return await CartService.createUserCart({userId, product});

    if(!userCart.cart_products.length){
      userCart.cart_products = [product];
      return await userCart.save();
    }

    return await CartService.updateUserCartQuantity({userId, product});
  }

  /*
    shop_order_ids: [{
      shopId, 
      item_product: [{
        quantity, price, shopId, old_quantity, productId
      }]
    }]
    * version
  */
  static async addToCartV2({userId, shop_order_ids = {}}){
    const {productId, quantity, old_quantity} = shop_order_ids[0]?.item_products[0];
    const foundProduct = await getProductById(productId);
    
    if(!foundProduct) throw new NotFoundError('Product NOT exist');
    // compare
    if(foundProduct.product_shop.toString() !== shop_order_ids[0]?.shopId)
      throw new NotFoundError(`Product do not belong the shop`);
    
    if(quantity === 0) {
      // delete product
    }

    return await CartService.updateUserCartQuantity({
      userId,
      product: {
        productId,
        quantity: quantity - old_quantity,
      }
    });
  }

  static async deleteUserCart({userId, productId}) {
    const query = { cart_userId: userId, cart_state: 'active'},
    updateSet = {
      $pull:{
        cart_products: {productId}
      }
    }
    const deleteCart = await cart.updateOne(query, updateSet);
    return deleteCart;
  }

  static async getListUserCart ({userId}){
    return await cart.findOne({
      cart_userId: +userId
    }).lean();
  }
}

module.exports = CartService;
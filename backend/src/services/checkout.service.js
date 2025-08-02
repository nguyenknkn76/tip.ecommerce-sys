'use strict'

const { BadRequestError } = require("../core/error.response");
const { order } = require("../models/order.model");
const { findCartById } = require("../models/repositories/cart.repo");
const { checkProductByServer } = require("../models/repositories/product.repo");
const { logValue, printObjectKeyValue } = require("../utils");
const { getDiscountAmount } = require("./discount.service");
const { acquireLock, releaseLock } = require("./redis.service");

class CheckoutService {
  // ! order
  // login or without login
  /*
    {
      cartId, userId,
      shop_order_ids: [
        {
          shopId, shop_discounts, item_products[{price, quantity, productId}]
        },
        {
          shopId, shop_discounts:[{shopId, discountId, code}], item_products[...]
        }
      ],
      
    }
  */
  static async checkoutReview({
    cartId, userId, shop_order_ids = [], 
  }){
    // check cartId exists?
    const foundCart = await findCartById(cartId);
    if(!foundCart) throw new BadRequestError('Cart NOT exist');

    const checkout_order = {
      totalPrice: 0, // total price of all products without fee ship, discount voucher
      feeShip: 0, // fee ship
      totalDiscount: 0, // discount value
      totalCheckout: 0,  // price that user have to pay for the products
    },
    shop_order_ids_new = [];

    //  total bill value
    for (let i = 0; i < shop_order_ids.length; i++) {
      const {shopId, shop_discounts = [], item_products = []} = shop_order_ids[i];
      // check product available
      const checkProductServer = await checkProductByServer(item_products);
      
      if(checkProductServer.some(p => !p)) 
        throw new BadRequestError('Order wrong!!');
      
      // total of order
      const checkoutPrice = checkProductServer.reduce((acc, product) => {
        return acc + (product.quantity * product.price);
      },0);

      // total price before process
      checkout_order.totalPrice += checkoutPrice;
      
      const itemCheckout = {
        shopId,
        shop_discounts,
        priceRaw: checkoutPrice,
        priceApplyDiscount: checkoutPrice,
        item_products: checkProductServer,
      }

      // if shop_discounts exist (>0), check valid discount
      if(shop_discounts.length > 0){
        // get amount discount
        const {totalPrice = 0, discount = 0} = await getDiscountAmount({
          codeId: shop_discounts[0].codeId,
          userId,
          shopId,
          products: checkProductServer,
        });

        // total discount value
        checkout_order.totalDiscount += discount;
        
        if(discount > 0){
          itemCheckout.priceApplyDiscount = checkoutPrice - discount;
        }
      }

      shop_order_ids_new.push(itemCheckout);
    }
    
    // total payment value
    checkout_order.totalCheckout = checkout_order.totalPrice - checkout_order.totalDiscount;

    return{
      shop_order_ids,
      shop_order_ids_new,
      checkout_order
    };
  }

  // ! checkout review v2
  static async checkoutReviewV2({
    cartId, userId, shop_order_ids = [], 
  }){
    const foundCart = await findCartById(cartId);
    if(!foundCart) throw new BadRequestError('Cart NOT exist');

    const checkout_order = {
      totalPrice: 0,
      feeShip: 0,
      totalDiscount: 0,
      totalCheckout: 0,
    },
    shop_order_ids_new = [];

    for (let i = 0; i < shop_order_ids.length; i++) {
      const {shopId, shop_discounts = [], item_products = []} = shop_order_ids[i];

      const checkProductServer = await checkProductByServer(item_products);

      if (checkProductServer.some(p => !p)) {
          throw new BadRequestError(`Order wrong!! One or more products not found.`);
      }

      const checkoutPrice = checkProductServer.reduce((acc, product) => {
          return acc + (product.quantity * product.price);
      }, 0);

      checkout_order.totalPrice += checkoutPrice;

      const itemCheckout = {
        shopId,
        shop_discounts,
        priceRaw: checkoutPrice,
        priceApplyDiscount: checkoutPrice,
        item_products: checkProductServer,
      }

      if (shop_discounts.length > 0) {
        const { discount = 0 } = await getDiscountAmount({
          codeId: shop_discounts[0].codeId,
          userId,
          shopId,
          products: checkProductServer,
        });

        checkout_order.totalDiscount += discount;

        if (discount > 0) {
          itemCheckout.priceApplyDiscount = checkoutPrice - discount;
        }
      }

      shop_order_ids_new.push(itemCheckout);
    }

    checkout_order.totalCheckout = checkout_order.totalPrice - checkout_order.totalDiscount;

    return {
      shop_order_ids,
      shop_order_ids_new,
      checkout_order
    };
  }
  // ! payment
  static async orderByUser({
    shop_order_ids,
    cartId,
    userId,
    user_address = {},
    user_payment = {},
  }){
    const {shop_order_ids_new, checkout_order} = await CheckoutService.checkoutReview({
      cartId,
      userId,
      shop_order_ids,
    });

    // check stock quantity of products
    const products = shop_order_ids_new.flatMap(order => order.item_products);
    const acquireProduct = [];
    for (let i = 0; i < products.length; i++) {
      const {productId, quantity} = products[i];
      const keyLock = await acquireLock(productId, quantity, cartId);
      acquireLock.push(keyLock ? true : false); 

      if(keyLock) await releaseLock(keyLock);
    }

    // check if product is out of stock
    if(acquireProduct.includes(false)) throw new BadRequestError('Some products are updated, pls back to Your Cart');

    const newOrder = await order.create({
      order_userId: userId,
      order_checkout: checkout_order,
      order_shipping: user_address,
      order_payment: user_payment,
      order_products: shop_order_ids_new,
    });
    if(newOrder){
      // remove product in my cart
    }
    
    return newOrder;
  }

  /*
    1. query orders | users
    2. query order using id | users
    3. cancel order | users
    4. update order status | shop or admin
  */
  static async getOrdersByUser(){
    
  }

  static async getOneOrderByUser(){
    
  }

  static async cancelOrderByUser(){
    
  }

  static async updateOrderStatusByShop(){
    
  }
}

module.exports = CheckoutService;
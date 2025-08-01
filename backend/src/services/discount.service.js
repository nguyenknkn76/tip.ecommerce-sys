'use strict'

const { model } = require("mongoose");
const { BadRequestError, NotFoundError } = require("../core/error.response");
const discount = require("../models/discount.model");
const { findAllDiscountCodesUnSelect, checkDiscountExists } = require("../models/repositories/discount.repo");
const { findAllProducts } = require("../models/repositories/product.repo");
const { convertToObjectIdMongodb, logValue } = require("../utils");
const { filter } = require("lodash");

class DiscountService {
  static async createDiscountCode (payload){
    const {
      code, start_date, end_date, is_active,
      shopId, min_order_value, product_ids, applies_to,
      name, description, type, value, max_value, max_uses,
      uses_count, max_uses_per_user, users_used
    } = payload;
    // check 
    if(new Date() > new Date(start_date) || new Date() > new Date(end_date)){
      throw new BadRequestError('Discount code has expried!');
    }
    if(new Date(start_date) >= new Date(end_date)) 
      throw new BadRequestError('Start-date must be before end-date')
    // create index for discount code
    const foundDiscount = await discount.findOne({
      discount_code: code,
      discount_shopId: convertToObjectIdMongodb(shopId),
    }).lean();

    if(foundDiscount && foundDiscount.discount_is_active) throw new BadRequestError('Discount exists');
    
    const newDiscount = await discount.create({
      discount_name: name,
      discount_description: description,
      discount_type: type,
      discount_code: code,
      discount_value: value,
      discount_min_order_value: min_order_value || 0,
      discount_max_value: max_value,
      discount_start_date: start_date,
      discount_end_date: end_date,
      discount_max_uses: max_uses,
      discount_uses_count: uses_count,
      discount_users_used: users_used, //* wtf is this shit
      discount_shopId: shopId,
      discount_max_uses_per_user: max_uses_per_user,
      discount_is_active: is_active,
      discount_applies_to: applies_to,
      discount_product_ids: applies_to === 'all' ? [] : product_ids
    }); 
    return newDiscount;
  }

  static async updateDiscountCode() {
    // todo: do it like update product
    console.log(`cmt.discount.service.updateDiscount:::: update discount is processed HERE`);
  }

  // Get list products by discount_code
  static async getAllDiscountCodesWithProduct({
    code, shopId, userId, limit, page 
  }){
    // create index for discount_code
    // todo: can write handler or utils for foundDiscount 
    const foundDiscount = await discount.findOne({
      discount_code: code,
      discount_shopId: convertToObjectIdMongodb(shopId),
    }).lean();
    logValue(`found discount`, foundDiscount);
    if(!foundDiscount || !foundDiscount.discount_is_active) 
      throw new NotFoundError('Discount NOT exists');
  
    const {discount_applies_to, discount_product_ids} = foundDiscount;
    let products;
    if (discount_applies_to === 'all'){
      // get all product
      products = await findAllProducts({
        filter: {
          product_shop: convertToObjectIdMongodb(shopId),
          isPublished: true
        },
        limit: +limit,
        page: +page,
        sort: 'ctime',
        select: ['product_name']
      }); 
    }
    if(discount_applies_to === 'specific'){
      // get the products by id
            products = await findAllProducts({
        filter: {
          _id: { $in: discount_product_ids },
          // product_shop: convertToObjectIdMongodb(shopId),
          isPublished: true
        },
        limit: +limit,
        page: +page,
        sort: 'ctime',
        select: ['product_name']
      }); 
    }
    return products;
  }

  // get all discount_code of shop
  static async getAllDiscountCodesByShop({
    limit, page, shopId
  }){
    const discounts = await findAllDiscountCodesUnSelect({
      limit: +limit,
      page: +page,
      filter:{
        discount_shopId: convertToObjectIdMongodb(shopId),
        discount_is_active: true,
      },
      unSelect: ['__v', 'discount_shopId'],
      model: discount
    });
    // logValue('discounts', discounts);
    return discounts;
  }
  
  // apply discount code
  // products: productId, shopId, quantity, name, price
  static async getDiscountAmount({
    codeId, userId, shopId, products
  }){
    const foundDiscount = await checkDiscountExists({
      model: discount,
      filter: {
        discount_code: codeId,
        discount_shopId: convertToObjectIdMongodb(shopId)
      }
    });

    if(!foundDiscount) throw new NotFoundError('Discount NOT exists');

    const {
      discount_is_active,
      discount_max_uses,
      discount_min_order_value,
      discount_users_used,
      discount_start_date,
      discount_end_date,
      discount_type,
      discount_max_uses_per_user,
      discount_value
    } = foundDiscount;

    if(!discount_is_active) throw new NotFoundError('Discount expried!');
    if(!discount_max_uses) throw new NotFoundError('Discount are out!');
    // todo: have to check this condition one more time
    // if(new Date() < new Date(discount_start_date) || new Date() > new Date(discount_end_date))
    //   throw new NotFoundError('discount code has expried');
    
    // check set the min value
    let totalOrder = 0;
    if(discount_min_order_value > 0){
      totalOrder = products.reduce((acc, product) => {
        return acc + (product.quantity * product.price);
      }, 0);
      if(totalOrder < discount_min_order_value) 
        throw new NotFoundError(`discount requires a minimum order value of ${discount_min_order_value}!`);
    }

    if(discount_max_uses_per_user > 0){
      const userUserDiscount = discount_users_used.find(user => user.userId === userId);
      if (userUserDiscount){
        // todo
        console.log(`cmt.discount.service.getDiscountAmount:::check userUserDiscount HERE`);
      }
    }
    // check discount_type is fixed-amount or percentage
    const amount = discount_type === 'fixed_amount' ? discount_value : totalOrder*(discount_value/100);
    return {
      totalOrder,
      discount: amount,
      totalPrice: totalOrder - amount,
    }
  } 

  static async deleteDiscountCode({
    shopId, codeId
  }){
    const deleted = await discount.findOneAndDelete({
      discount_applies_to: codeId,
      discount_shopId: convertToObjectIdMongodb(shopId)
    });

    return deleted;
  }

  static async cancelDiscountCode({
    codeId, shopId, userId
  }){
    const foundDiscount = await checkDiscountExists({
      model: discount,
      filter: {
        discount_code: codeId,
        discount_shopId: convertToObjectIdMongodb(shopId),
      }
    });

    // todo: should use builder pattern to solve Error
    if(!foundDiscount) throw new NotFoundError(`discount doesn't exist`);

    const result = await discount.findByIdAndUpdate(
      foundDiscount._id,
      {
        $pull: {
          discount_users_used: userId
        },
        $inc: {
          discount_max_uses: 1,
          discount_uses_count: -1,
        }
      }
    );
    return result;
  }
}

module.exports = DiscountService;
'use strict'

const { BadRequestError } = require('../core/error.response');
const {clothing, electronic, product} = require('../models/product.model');

// Factory Class
class ProductFactory {
  static async createProduct(type, payload){
    switch (type){
      case 'Electronics':
        return new Electronics(payload).createProduct();
      case 'Clothing':
        return new Clothing(payload).createProduct();
      default: 
        throw new BadRequestError(`Invalid Product Types ${type}`);
    }
  }
}

// base product Class
class Product {
  constructor({
    product_name, product_thumb, product_description, product_price,
    product_quantity, product_type, product_shop, product_attributes
  }){
    this.product_name = product_name;
    this.product_thumb = product_thumb;
    this.product_description = product_description;
    this.product_price = product_price;
    this.product_quantity = product_quantity;
    this.product_type = product_type;
    this.product_shop = product_shop;
    this.product_attributes = product_attributes;
  }
  // create new product
  /*
    type: 'clothing',
    payload
  */
  async createProduct(){
    return await product.create(this); 
  }
}

// Define sub-class for diff product types Clothing
class Clothing extends Product{
  async createProduct(){
    const newClothing = clothing.create(this.product_attributes);
    if(!newClothing) throw new BadRequestError('create new clothing error');
    
    const newProduct = await super.createProduct();
    if(!newProduct) throw new BadRequestError('create new product error');

    return newProduct;
  }
}

// Define sub-class for diff product types Electronics
class Electronics extends Product{
  async createProduct(){
    const newElectronic = electronic.create(this.product_attributes);
    if(!newElectronic) throw new BadRequestError('create new electronic error');
    
    const newProduct = await super.createProduct();
    if(!newProduct) throw new BadRequestError('create new product error');

    return newProduct;
  }
}

module.exports = ProductFactory;

/*
const productSchema = new mongoose.Schema({
    product_name:{
        type:String,
        required:true,
    },
    product_thumb:{
        type:String,
        required:true,
    },
    product_description:{
        type:String,
    },
    product_price:{
        type:Number,
        required:true,
    },
    product_quantity:{
        type:Number,
        required:true,
    },
    product_type:{
        type:String,
        required:true,
        enum: ['Electronics', 'Clothing', 'Furniture']
    },
    product_shop:{
      type: mongoose.Schema.Types.ObjectId, ref: 'Shop',
    },
    product_attributes:{
        type:mongoose.Schema.Types.Mixed,
        required:true,
    },
})
*/
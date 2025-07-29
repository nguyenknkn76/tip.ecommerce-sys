'use strict'

const { Types } = require("mongoose")
const { product } = require("../product.model")

const findAllDrafsForShop = async ({query, limit, skip}) => {
  return await queryProduct({query, limit, skip});
}

const findAllPublishForShop = async ({query, limit, skip}) => {
  return await queryProduct({query, limit, skip});
}

const searchProductsByUser = async ({keySearch}) => {
  const regexSearch = new RegExp(keySearch);
  const results = await product.find({
    isDraf: false,
    $text: {$search: regexSearch},
  },{score: {$meta: 'textScore'}})
  .sort({score: {$meta: 'textScore'}})
  .lean();
  return results;
}

const publishProductByShop = async ({product_shop, product_id}) => {
  const foundShop = await product.findOne({
    product_shop: new Types.ObjectId(product_shop),
    _id: new Types.ObjectId(product_id),
  });
  if(!foundShop) return null;

  foundShop.isDraf = false;
  foundShop.isPublished = true;

  // mongo return 0 OR 1(~ update success)
  const {modifiedCount} = await foundShop.updateOne(foundShop);

  return modifiedCount;
}

const unPublishProductByShop = async({product_shop, product_id}) => {
    const foundShop = await product.findOne({
    product_shop: new Types.ObjectId(product_shop),
    _id: new Types.ObjectId(product_id),
  });
  if(!foundShop) return null;
  foundShop.isDraf = true;
  foundShop.isPublished = false;

  const {modifiedCount} = await foundShop.updateOne(foundShop);
  return modifiedCount;
}

const queryProduct = async ({query, limit, skip}) => {
  return await product.find(query)
  .populate('product_shop', 'name email -_id')
  .sort({updateAt: -1})
  .skip(skip)
  .limit(limit)
  .lean()
  .exec()
}

module.exports = {
  findAllDrafsForShop,
  publishProductByShop,
  findAllPublishForShop,
  unPublishProductByShop,
  searchProductsByUser
}
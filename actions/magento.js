"use strict";
let datafire = require('datafire');

let magento = require('@datafire/magento').actions;
//TODO in the future
module.exports = new datafire.Action({
  handler: async (input, context) => {
      return await magento.customerCustomerMetadataV1GetCustomAttributesMetadataGet({}, context);
  },
});

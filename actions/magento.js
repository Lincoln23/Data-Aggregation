"use strict";
const datafire = require('datafire');
const magento = require('@datafire/magento').actions;
//TODO in the future
module.exports = new datafire.Action({
  handler: async (input, context) => {
      return await magento.customerCustomerMetadataV1GetCustomAttributesMetadataGet({}, context);
  },
});

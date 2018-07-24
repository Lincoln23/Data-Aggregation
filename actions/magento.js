"use strict";
let datafire = require('datafire');

let magento = require('@datafire/magento').actions;
module.exports = new datafire.Action({
  handler: async (input, context) => {
        let result = await magento.customerCustomerMetadataV1GetCustomAttributesMetadataGet({}, context);
        return result;
    return result;
  },
});

function arrayContainsProduct(list, product) {
    for (const i in list) {
        if (list[i].id === product.id) return true;
    }

    return false;
}

function pickReducedPrice(prices) {
    let priceValues = [];
    for (const p in prices) {
        priceValues.push(parseFloat(prices[p].replace('$', '').trim()));
    }
  
    priceValues.sort();
  
    if (priceValues.length == 1) {
        return priceValues[0];
    }
  
    const largest = priceValues[priceValues.length - 1];
    
    // Assume that the items are never going to be more than 50% off
    if (priceValues[priceValues.length - 2] / largest > 0.5) {
        return priceValues[priceValues.length - 2];
    } else {
        return largest;
    }
}

module.exports = {
    arrayContainsProduct: arrayContainsProduct,
    pickReducedPrice: pickReducedPrice
};
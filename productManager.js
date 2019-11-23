const pickReducedPrice = require('./utils.js').pickReducedPrice;

class ProductManager {
    constructor(config, mailManager, pmState) {
        this.products = config.PRODUCTS;
        this.selectedProducts = [];
        this.matchedProductNames = [];
        this.mailManager = mailManager;
    }

    getState() {

    }

    searchTitles(posts) {
        //const regex1 = /(RAM)/gmi;
        const priceRegex = /((\$+\ *[0-9]+(\.[0-9]{2})?(\ *\$+)?)|([0-9]+(\.[0-9]{2})))/gm;

        for (const j in this.products) {
            const product = this.products[j];

            for (const i in posts) {
                const title = posts[i].title;
    
                if (title.match(product.regex)) {
                    console.log(`Title match ${title}`);
                    const prices = title.match(priceRegex);
    
                    let matchedPrice = 0;
                    let priceMatch = false;

                    for (const p in prices) {
                        const price = parseFloat(prices[p].replace('$', '').trim());
                        if (price > product.low && price < product.high) {
                            console.log(`Price match [$${price}] ${title}`);
                            matchedPrice = price;
                            priceMatch = true;
                            break;
                        }
                    }
    
                    if (priceMatch) {
                        this.selectedProducts.push({'price': matchedPrice, data: posts[i]});
                        this.mailManager.mailNow(posts[i]);
                    } else {
                        const price = pickReducedPrice(prices);
                        this.matchedProductNames.push({'price': price, data: posts[i]});
                        this.mailManager.mailEod(posts[i]);
                    }
                }
            }
        }
    }
}

module.exports = ProductManager;
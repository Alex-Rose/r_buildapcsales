const pickReducedPrice = require('./utils.js').pickReducedPrice;
const c_priceRegex = /((\$+\ *[0-9]+(\.[0-9]{2})?(\ *\$+)?)|([0-9]+(\.[0-9]{2})))/gm;

class Product {
    constructor(source, data) {
        this.m_source = source;
        this.m_id = undefined;
        this.m_displayName = undefined;
        this.m_title = undefined;
        this.m_price = undefined;
        this.m_data = data;
    }

    initializeData() {
        if (this.m_source == 'reddit') {
            this.m_id = this.m_data.name;
            this.m_title = this.m_data.title;
            this.m_price = pickReducedPrice(this.m_title.match(c_priceRegex));
        }
    }

    get source() {
        return this.m_source;
    }

    set source(value) {
        this.m_source = value;
    }

    get id() {
        return this.m_id;
    }
    
    set id(value) {
        this.m_id = value;
    }
    
    get displayName() {
        return this.m_displayName;
    }
    
    set displayName(value) {
        this.m_displayName = value;
    }
    
    get title() {
        return this.m_title;
    }
    
    set title(value) {
        this.m_title = value;
    }
    
    get price() {
        return this.m_price;
    }
    
    set price(value) {
        this.m_price = value;
    }
    
    get data() {
        return this.m_data;
    }
    
    set data(value) {
        this.m_data = value;
    }
    
}

module.exports = Product;
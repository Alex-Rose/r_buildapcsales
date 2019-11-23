const arrayContainsProduct = require('./utils.js').arrayContainsProduct;
const nodemailer = require('nodemailer');
const Product = require('./product.js');

class MailManager {
    constructor(config, savedState) {
        this.config = config;
        this.products = config.PRODUCTS;
        this.mailNowProducts = [];
        this.mailEodProducts = [];
        this.productsSent = [];

        if (savedState && savedState.productsSent) {
            for (const p in savedState.productsSent) {
                this.productsSent.push(Product.getFromJson(savedState.productsSent[p]));
            }
        }
    }

    mailNow(product) {
        if (!arrayContainsProduct(this.mailNowProducts, product) &&
            !arrayContainsProduct(this.productsSent, product)) {
            this.mailNowProducts.push(product);
        }
    }

    mailEod(product) {
        if (!arrayContainsProduct(this.mailEodProducts, product)) {
            this.mailEodProducts.push(product);
        }
    }

    sendMailsAndCleanup(lastExecution) {
        if (this.mailNowProducts.length > 0) {
            let body = this.getMailBody(this.mailNowProducts, 'New items');
            let plainText = this.getMailPlainText(this.mailNowProducts);
            this.sendMail(body, plainText);

            for (const p in this.mailNowProducts) {
                this.productsSent.push(this.mailNowProducts[p]);
            }
        }
    }

    getState() {
        return {
            productsSent: this.productsSent,
            mailEodProducts: this.mailEodProducts
        };
    }

    // Private
    getAgoString(it) {
        const now = Math.floor(new Date().getTime()/1000.0);
        let ago = Math.floor((now - it.data.created_utc) / 60);
        let unit = 'm';
        if (ago > 60) {
            ago = Math.floor(ago / 60);
            unit = 'h';
        
            if (ago > 24) {
                ago = Math.floor(ago / 24);
                unit = 'd';
            }
        }
      
        ago = ago.toString() + unit;
        return ago;
    }

    getMailBody(posts, description) {
        let listItems = '';
        for (const i in posts) {
            const it = posts[i];
            const ago = this.getAgoString(it);
            listItems = listItems + `<li><a href="https://reddit.com${it.data.permalink}">[$${it.price}] ${it.data.title}</a> <small>${ago} ago</small></li>`;
        }
        
        const body = 
            `<html>
            <body>
                <div>
                ${description}
                </div>
                <div>
                <ul>
                    ${listItems}
                </ul>
                </div>
            </body>
            </html>`;
        
        return body;
    }

    getMailPlainText(posts) {
        let listItems = '';
        for (const i in posts) {
            const it = posts[i];
            const ago = this.getAgoString(it);
            listItems = listItems + `[$${it.price}] ${it.data.title} ${ago} ago\n`;
        }
    
        return listItems;
    }
    
    async sendMail(body, plainText) {
        let transport = nodemailer.createTransport(this.config.TRANSPORT_OPTIONS);
    
        const message = {
            from: this.config.EMAIL_FROM, 
            to: this.config.EMAIL_TO, 
            subject: `/r/buildapcsales ${this.config.PRODUCTS[0].name}`, 
            html: body,
            alternatives: [{
                contentType: 'text/plain',
                content: plainText
            }]
        };
      
        let info = await transport.sendMail(message);
        console.log(`Message sent: ${info.messageId}`);
    }
    
    async sendDailyDigestIfNeeded() {
        if ((new Date().getTime() - dailyDigest.time) > 23.5 * 60 * 60 * 1000)
        {
            const body = getMailBody(dailyDigest.posts, 'Here are all the items that showed up, but didn\'t fit in your price range');
            const plainText = getMailPlainText(dailyDigest.posts);
    
            let success = true;
            await sendMail(body, plainText).catch((err) => {
                console.log(err);
                success = false;
            });
    
            if (success) {
                dailyDigest.posts = [];
                dailyDigest.time = new Date().getTime();
            }
        }
    }
}

module.exports = MailManager;
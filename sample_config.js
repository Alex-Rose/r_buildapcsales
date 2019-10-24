module.exports = Object.freeze({
    LAST_FILE: 'last.json',
    TRANSPORT_OPTIONS: {
        host: '127.0.0.1',
        port: 25,
        tls: {
          // do not fail on invalid certs
          rejectUnauthorized: false
        }
    },
    EMAIL_FROM: 'buildapcsales <buildapcsales@example.com>',
    EMAIL_TO: '<you_email@gmail.com>',
    PRODUCTS: [{
        name: 'RTX 2060', 
        regex: /(RTX\ *2060|GTX\ *2060|2060 Super)/gmi,
        low: 200,
        high: 325
    }]
});

var request = require("request");
var util = require('util')
// var setIntervalProm = util.promisify(setInterval)
var gdaxPrice
var bittrexPrice

var gdaxOptions = {
    method: 'GET',
    url: 'https://api.gdax.com/products/LTC-BTC/ticker',
    headers:
    {
        'user-agent': "self-program",
        'postman-token': '5d4de71d-e4c2-3af1-30cf-5840b6c39ae2',
        'cache-control': 'no-cache'
    }
};

var bittrexOptions = {
    method: 'GET',
    url: 'https://bittrex.com/api/v1.1/public/getmarkethistory',
    qs: { market: 'BTC-LTC' },
    headers:
    {
        'postman-token': '5fd77a68-0932-e0e5-efcc-099a5867259a',
        'cache-control': 'no-cache'
    }
};


function printArb() {
    request(gdaxOptions, function (error, response, body1) {
        var res1 = JSON.parse(body1)
        gdaxPrice = Number(res1.price)
        if (error) throw new Error(error);
        request(bittrexOptions, function (error, response, body2) {
            var res2 = JSON.parse(body2)
            if (error) throw new Error(error);
            bittrexPrice = Number(res2.result[0].Price)
            var rate = (gdaxPrice - bittrexPrice) / bittrexPrice
            console.log("gdaxPrice %d, bittrexPrice %d. [arb %d%]", gdaxPrice, bittrexPrice, (rate*100).toFixed(3));
            if (rate >= 0.05) {
                console.log("Do the trade now!")
            }
        });
    });
}

setInterval(printArb, 3000)
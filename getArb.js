var request = require("request");
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

request(gdaxOptions, function (error, response, body1) {
    // console.log(body1)
    var res1 = JSON.parse(body1)
    gdaxPrice = Number(res1.price)
    if (error) throw new Error(error);
    request(bittrexOptions, function (error, response, body2) {
        var res2 = JSON.parse(body2)
        if (error) throw new Error(error);
        bittrexPrice = Number(res2.result[0].Price)
        console.log("gdaxPrice", gdaxPrice);
        console.log("bittrexPrice", bittrexPrice);
        console.log("arb %d", (gdaxPrice-bittrexPrice)/bittrexPrice)
    });
});

var request = require("request");
var util = require('util')
var Promise = require('bluebird')
// var setIntervalProm = util.promisify(setInterval)
var gdaxPrice
var bittrexPrice
var targetProduct = "LTC"

if (process.argv) {
    targetProduct = process.argv[2]
    // console.log("targetProduct %s", targetProduct)
}

var gdaxOptions = {
    method: 'GET',
    url: `https://api.gdax.com/products/${targetProduct}-BTC/ticker`,
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
    qs: { market: `BTC-${targetProduct}` },
    headers:
        {
            'postman-token': '5fd77a68-0932-e0e5-efcc-099a5867259a',
            'cache-control': 'no-cache'
        }
};


var gdaxBTCUSDOptions = {
    method: 'GET',
    url: `https://api.gdax.com/products/BTC-USD/ticker`,
    headers:
        {
            'user-agent': "self-program",
            'postman-token': '5d4de71d-e4c2-3af1-30cf-5840b6c39ae2',
            'cache-control': 'no-cache'
        }
};

function getUSDPrice(cryptoName) {
    gdaxBTCUSDOptions.url = `https://api.gdax.com/products/${cryptoName}-USD/ticker`;
    return new Promise(function (resolve, reject) {
        request(gdaxBTCUSDOptions, function (error, response, body) {
            var res1
            try {
                res1 = JSON.parse(body)
            } catch (e) {
                console.log(e.stack)
                reject(e)
            }
            var gdaxPrice = res1 ? Number(res1.price) : null
            resolve(gdaxPrice);
        });
    });
}

function getBTCTargetPrice(exchangeName, targetName) {
    if (exchangeName === 'GDAX') {
        gdaxOptions.url = `https://api.gdax.com/products/${targetName}-BTC/ticker`;
        return new Promise(function (resolve, reject) {
            request(gdaxOptions, function (error, response, body) {
                var res
                try {
                    res = JSON.parse(body)
                } catch (e) {
                    console.log(e.stack)
                    reject(e)
                }
                var gdaxPrice = res ? Number(res.price) : null
                resolve(gdaxPrice);
            });
        });
    } else if (exchangeName === 'bittrex') {
        bittrexOptions.qs.market = `BTC-${targetName}`;
        return new Promise(function (resolve, reject) {
            request(bittrexOptions, function (error, response, body) {
                var res
                try {
                    res = JSON.parse(body)
                } catch (e) {
                    console.log(e.stack)
                    reject(e)
                }
                var bittrexPrice = res && res.result ? Number(res.result[0].Price) : null
                resolve(bittrexPrice);
            });
        });
    }
}

function getPriceComparison(exchange1, exchange2, cryptoName) {
    var promises = []
    promises.push(getUSDPrice('BCH'))
    promises.push(getUSDPrice('BTC'))
    promises.push(getUSDPrice('ETH'))
    promises.push(getUSDPrice('LTC'))
    promises.push(getBTCTargetPrice(exchange1, cryptoName))
    promises.push(getBTCTargetPrice(exchange2, cryptoName))
    return Promise.all(promises)
        .then(function (prices) {
            var bchPrice = prices[0]
            var btcPrice = prices[1]
            var ethPrice = prices[2]
            var ltcPrice = prices[3]
            var exchangePrice1 = prices[4]
            var exchangePrice2 = prices[5]
            var rate = (exchangePrice1 - exchangePrice2) / exchangePrice2
            return `${cryptoName}: ${exchange1} ${exchangePrice1}, ${exchange2} ${exchangePrice2}. [arb ${(rate * 100).toFixed(3)}%] [USD(@GDAX): $${btcPrice}/BTC, $${bchPrice}/BCH, $${ethPrice}/ETH, $${ltcPrice}/LTC]`;
        })
}

function listPrices() {
    var promises = []
    promises.push(getUSDPrice('BCH'))
    promises.push(getUSDPrice('BTC'))
    promises.push(getUSDPrice('ETH'))
    promises.push(getUSDPrice('LTC'))
    promises.push(getBTCTargetPrice("bittrex", "BCC"))
    return Promise.all(promises)
    .then(function (prices) {
        var bchPrice = prices[0]
        var btcPrice = prices[1]
        var ethPrice = prices[2]
        var ltcPrice = prices[3]
        var bccBtcPrice = prices[4]
        return {
            bchPrice,
            btcPrice,
            ethPrice,
            ltcPrice,
            bccBtcPrice
        }
        
    })
}

function printArb() {
    var promises = [getPriceComparison("GDAX", "bittrex", "ETH"), getPriceComparison("GDAX", "bittrex", "LTC")]
    Promise.all(promises)
        .then(function (comparisons) {
            console.log("----------------------------------------------------------------------")
            console.log(comparisons[0])
            console.log(comparisons[1])
        });
}

var prevPrices = {}

function printPrices(){
    listPrices()
    .then(function (prices) {
        prevPrices = prices
        var bccBtcPriceRate = (prices.bccBtcPrice - prevPrices.bccBtcPrice) / prevPrices.bccBtcPrice * 100
        var msg = `$${prices.btcPrice}/BTC, $${prices.bchPrice}/BCH, $${prices.ethPrice}/ETH, $${prices.ltcPrice}/LTC, BTC/BCH $${prices.bccBtcPrice} (${bccBtcPriceRate.toFixed(4)}%)`
        console.log(msg)
    });
}

// setInterval(printArb, 3000)
setInterval(printPrices, 3000)
import request from 'request'
import Promise from 'bluebird'
import _ from 'lodash'
// var setIntervalProm = util.promisify(setInterval)
let gdaxPrice
let bittrexPrice
let targetProduct = 'LTC'

if (process.argv) {
  targetProduct = process.argv[2]
  // console.log("targetProduct %s", targetProduct)
}

const gdaxOptions = {
  method: 'GET',
  url: `https://api.gdax.com/products/${targetProduct}-BTC/ticker`,
  headers:
  {
    'user-agent': 'self-program',
    'postman-token': '5d4de71d-e4c2-3af1-30cf-5840b6c39ae2',
    'cache-control': 'no-cache',
  },
}


const bittrexOptions = {
  method: 'GET',
  url: 'https://bittrex.com/api/v1.1/public/getticker',
  qs: { market: `BTC-${targetProduct}` },
  headers:
  {
    'postman-token': '5fd77a68-0932-e0e5-efcc-099a5867259a',
    'cache-control': 'no-cache',
  },
}


const gdaxBTCUSDOptions = {
  method: 'GET',
  url: 'https://api.gdax.com/products/BTC-USD/ticker',
  headers:
  {
    'user-agent': 'self-program',
    'postman-token': '5d4de71d-e4c2-3af1-30cf-5840b6c39ae2',
    'cache-control': 'no-cache',
  },
}

function getUSDPrice(cryptoName) {
  gdaxBTCUSDOptions.url = `https://api.gdax.com/products/${cryptoName}-USD/ticker`
  return new Promise(((resolve, reject) => {
    request(gdaxBTCUSDOptions, (error, response, body) => {
      let res1
      try {
        res1 = JSON.parse(body)
      } catch (e) {
        console.log(e.stack)
        reject(e)
      }
      const gdaxPrice = res1 ? Number(res1.price) : null
      resolve(gdaxPrice)
    })
  }))
}

function getUSDPrices(symbols) {
  return Promise.map(symbols, symbol => getUSDPrice(symbol)
    .then(price => ({
      symbol,
      price,
    })))
}

function getBTCTargetPrice(exchangeName, targetName) {
  if (exchangeName === 'GDAX') {
    gdaxOptions.url = `https://api.gdax.com/products/${targetName}-BTC/ticker`
    return new Promise(((resolve, reject) => {
      request(gdaxOptions, (error, response, body) => {
        let res
        try {
          res = JSON.parse(body)
        } catch (e) {
          console.log(e.stack)
          reject(e)
        }
        const gdaxPrice = res ? Number(res.price) : null
        resolve(gdaxPrice)
      })
    }))
  } else if (exchangeName === 'bittrex') {
    bittrexOptions.qs.market = `BTC-${targetName}`
    return new Promise(((resolve, reject) => {
      request(bittrexOptions, (error, response, body) => {
        let res
        try {
          res = JSON.parse(body)
        } catch (e) {
          console.log(e.stack)
          reject(e)
        }
        const bittrexPrice = res && res.result ? Number(res.result.Last) : null
        resolve(bittrexPrice)
      })
    }))
  }
}

function getBTCTargetPrices(exchangeName, symbols) {
  return Promise.map(symbols, symbol => getBTCTargetPrice(exchangeName, symbol)
    .then(price => price)
    .then(price => ({
      symbol,
      price,
    })), {
    concurrency: 1,
  })
    .then(results => results)
}

function getPriceComparison(exchange1, exchange2, cryptoName) {
  const promises = []
  promises.push(getUSDPrice('BCH'))
  promises.push(getUSDPrice('BTC'))
  promises.push(getUSDPrice('ETH'))
  promises.push(getUSDPrice('LTC'))
  promises.push(getBTCTargetPrice(exchange1, cryptoName))
  promises.push(getBTCTargetPrice(exchange2, cryptoName))
  return Promise.all(promises)
    .then((prices) => {
      const bchPrice = prices[0]
      const btcPrice = prices[1]
      const ethPrice = prices[2]
      const ltcPrice = prices[3]
      const exchangePrice1 = prices[4]
      const exchangePrice2 = prices[5]
      const rate = (exchangePrice1 - exchangePrice2) / exchangePrice2
      return `${cryptoName}: ${exchange1} ${exchangePrice1}, ${exchange2} ${exchangePrice2}. [arb ${(rate * 100).toFixed(3)}%] [USD(@GDAX): $${btcPrice}/BTC, $${bchPrice}/BCH, $${ethPrice}/ETH, $${ltcPrice}/LTC]`
    })
}

function comparePrices(prevPrice, curPrice) {
  // curPrice.isIncreased = curPrice.price > prevPrice.price
  curPrice.change = (curPrice.price - prevPrice.price) / prevPrice.price
  if (curPrice.change > 0) {
    curPrice.indicator = '\u2191'
  } else if (curPrice.change === 0) {
    curPrice.indicator = '-'
  } else {
    curPrice.indicator = '\u2193'
  }
  return curPrice
}

let prevUSDPrices
let prevBTCPrices

function listPrices() {
  const usdPricesSymbols = ['BTC', 'BCH', 'ETH', 'LTC']
  const btcPricesSymbols = ['BCC', 'XRP']
  Promise.resolve()
    .then(() => {
      console.log('---------------------------------')
    })
    .then(() => getUSDPrices(usdPricesSymbols))
    .then((usdPrices) => {
      const msg =
        _.join(_.map(usdPrices, (usdPrice) => {
          let msgChunk = `${usdPrice.symbol}:$${usdPrice.price}`
          if (prevUSDPrices) {
            const prevPrice = prevUSDPrices[usdPrice.symbol]
            comparePrices(prevPrice, usdPrice)
            const changePercent = (usdPrice.change * 100).toFixed(4)
            msgChunk += ` ${usdPrice.indicator} (${changePercent}%)`
          }
          return msgChunk
        }), ' | ')
      console.log(msg)
      prevUSDPrices = _.keyBy(usdPrices, 'symbol')
    })
    .then(() => getBTCTargetPrices('bittrex', btcPricesSymbols))
    .then((btcPrices) => {
      const msg =
        _.join(_.map(btcPrices, (curPrice) => {
          let msgChunk = `BTC-${curPrice.symbol}:${curPrice.price}`
          if (prevBTCPrices) {
            const prevPrice = prevBTCPrices[curPrice.symbol]
            comparePrices(prevPrice, curPrice)
            const changePercent = (curPrice.change * 100).toFixed(4)
            msgChunk += ` ${curPrice.indicator} (${changePercent}%)`
          }
          return msgChunk
        }), ' | ')
      console.log(msg)
      prevBTCPrices = _.keyBy(btcPrices, 'symbol')
    })
}

function printArb() {
  const promises = [getPriceComparison('GDAX', 'bittrex', 'ETH'), getPriceComparison('GDAX', 'bittrex', 'LTC')]
  Promise.all(promises)
    .then((comparisons) => {
      console.log('----------------------------------------------------------------------')
      console.log(comparisons[0])
      console.log(comparisons[1])
    })
}

let prevPrices = {}

function printPrices() {
  listPrices()
    .then((prices) => {
      const bccBtcPriceChangeRate = (prices.bccBtcPrice - prevPrices.bccBtcPrice) / prevPrices.bccBtcPrice * 100
      const xrpBtcPriceChangeRate = (prices.xrpBtcPrice - prevPrices.xrpBtcPrice) / prevPrices.xrpBtcPrice * 100
      const msg = `$${prices.btcPrice}/BTC, $${prices.bchPrice}/BCH, $${prices.ethPrice}/ETH, $${prices.ltcPrice}/LTC`
      console.log('--------------------------------')
      console.log(msg)
      const msg2 = `BTC/BCH $${prices.bccBtcPrice} (${bccBtcPriceChangeRate.toFixed(4)}%), BTC/XRP $${prices.xrpBtcPrice} (${xrpBtcPriceChangeRate.toFixed(4)}%)`
      console.log(msg2)
      prevPrices = prices
    })
}

// setInterval(printPrices, 3000)
setInterval(listPrices, 5000)

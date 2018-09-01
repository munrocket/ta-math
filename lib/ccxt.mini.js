(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*  A entry point for the browser bundle version. This gets compiled by:
        
        browserify --debug ./ccxt.browser.js > ./build/ccxt.browser.js
 */

window.ccxt = require ('./ccxt')
},{"./ccxt":2}],2:[function(require,module,exports){
"use strict";

/*

MIT License

Copyright (c) 2017 Igor Kroitor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

"use strict";

//-----------------------------------------------------------------------------

const Exchange  = require ('./js/base/Exchange')
    , functions = require ('./js/base/functions')
    , errors    = require ('./js/base/errors')

//-----------------------------------------------------------------------------
// this is updated by vss.js when building

const version = '1.16.32'

Exchange.ccxtVersion = version

//-----------------------------------------------------------------------------

const exchanges = {
    'binance':                 require ('./js/binance.js'),
    'bitmex':                  require ('./js/bitmex.js'),
    'bittrex':                 require ('./js/bittrex.js'),
    'ccex':                    require ('./js/ccex.js'),
    'cryptopia':               require ('./js/cryptopia.js'),
    'hitbtc':                  require ('./js/hitbtc.js'),
    'huobi':                   require ('./js/huobi.js'),
    'kraken':                  require ('./js/kraken.js'),
    'kucoin':                  require ('./js/kucoin.js'),
    'poloniex':                require ('./js/poloniex.js'),
    'tidex':                   require ('./js/tidex.js'),    
}

//-----------------------------------------------------------------------------

module.exports = Object.assign ({ version, Exchange, exchanges: Object.keys (exchanges) }, exchanges, functions, errors)

//-----------------------------------------------------------------------------

},{"./js/base/Exchange":3,"./js/base/errors":5,"./js/base/functions":6,"./js/binance.js":17,"./js/bitmex.js":18,"./js/bittrex.js":19,"./js/ccex.js":20,"./js/cryptopia.js":21,"./js/hitbtc.js":22,"./js/huobi.js":23,"./js/kraken.js":24,"./js/kucoin.js":25,"./js/poloniex.js":27,"./js/tidex.js":28}],3:[function(require,module,exports){
"use strict";

/*  ------------------------------------------------------------------------ */

const functions = require ('./functions')
    , Market    = require ('./Market')

const {
    isNode
    , keys
    , values
    , deepExtend
    , extend
    , flatten
    , unique
    , indexBy
    , sortBy
    , groupBy
    , aggregate
    , uuid
    , unCamelCase
    , precisionFromString
    , throttle
    , capitalize
    , now
    , sleep
    , timeout
    , TimedOut
    , buildOHLCVC } = functions

const {
    ExchangeError
    , InvalidAddress
    , NotSupported
    , AuthenticationError
    , DDoSProtection
    , RequestTimeout
    , ExchangeNotAvailable } = require ('./errors')

const { DECIMAL_PLACES } = functions.precisionConstants

const defaultFetch = typeof (fetch) === "undefined" ? require ('fetch-ponyfill') ().fetch : fetch

const journal = undefined // isNode && require ('./journal') // stub until we get a better solution for Webpack and React

/*  ------------------------------------------------------------------------ */

module.exports = class Exchange {

    getMarket (symbol) {

        if (!this.marketClasses)
            this.marketClasses = {}

        let marketClass = this.marketClasses[symbol]

        if (marketClass)
            return marketClass

        marketClass = new Market (this, symbol)
        this.marketClasses[symbol] = marketClass // only one Market instance per market
        return marketClass
    }

    describe () {
        return {
            'id': undefined,
            'name': undefined,
            'countries': undefined,
            'enableRateLimit': false,
            'rateLimit': 2000, // milliseconds = seconds * 1000
            'has': {
                'CORS': false,
                'publicAPI': true,
                'privateAPI': true,
                'cancelOrder': true,
                'cancelOrders': false,
                'createDepositAddress': false,
                'createOrder': true,
                'createMarketOrder': true,
                'createLimitOrder': true,
                'deposit': false,
                'editOrder': 'emulated',
                'fetchBalance': true,
                'fetchBidsAsks': false,
                'fetchClosedOrders': false,
                'fetchCurrencies': false,
                'fetchDepositAddress': false,
                'fetchFundingFees': false,
                'fetchL2OrderBook': true,
                'fetchMarkets': true,
                'fetchMyTrades': false,
                'fetchOHLCV': 'emulated',
                'fetchOpenOrders': false,
                'fetchOrder': false,
                'fetchOrderBook': true,
                'fetchOrderBooks': false,
                'fetchOrders': false,
                'fetchTicker': true,
                'fetchTickers': false,
                'fetchTrades': true,
                'fetchTradingFees': false,
                'fetchTradingLimits': false,
                'withdraw': false,
            },
            'urls': {
                'logo': undefined,
                'api': undefined,
                'www': undefined,
                'doc': undefined,
                'fees': undefined,
            },
            'api': undefined,
            'requiredCredentials': {
                'apiKey':   true,
                'secret':   true,
                'uid':      false,
                'login':    false,
                'password': false,
                'twofa':    false, // 2-factor authentication (one-time password key)
            },
            'markets': undefined, // to be filled manually or by fetchMarkets
            'currencies': {}, // to be filled manually or by fetchMarkets
            'timeframes': undefined, // redefine if the exchange has.fetchOHLCV
            'fees': {
                'trading': {
                    'tierBased': undefined,
                    'percentage': undefined,
                    'taker': undefined,
                    'maker': undefined,
                },
                'funding': {
                    'tierBased': undefined,
                    'percentage': undefined,
                    'withdraw': {},
                    'deposit': {},
                },
            },
            'parseJsonResponse': true, // whether a reply is required to be in JSON or not
            'skipJsonOnStatusCodes': [], // array of http status codes which override requirement for JSON response
            'exceptions': undefined,
            // some exchanges report only 'free' on `fetchBlance` call (i.e. report no 'used' funds)
            // in this case ccxt will try to infer 'used' funds from open order cache, which might be stale
            // still, some exchanges report number of open orders together with balance
            // if you set the following flag to 'true' ccxt will leave 'used' funds undefined in case of discrepancy
            'dontGetUsedBalanceFromStaleCache': false,
            'commonCurrencies': { // gets extended/overwritten in subclasses
                'XBT': 'BTC',
                'BCC': 'BCH',
                'DRK': 'DASH',
            },
            'precisionMode': DECIMAL_PLACES,
        } // return
    } // describe ()

    constructor (userConfig = {}) {

        Object.assign (this, functions, { encode: string => string, decode: string => string })

        // if (isNode) {
        //     this.nodeVersion = process.version.match (/\d+\.\d+\.\d+/)[0]
        //     this.userAgent = {
        //         'User-Agent': 'ccxt/' + Exchange.ccxtVersion +
        //             ' (+https://github.com/ccxt/ccxt)' +
        //             ' Node.js/' + this.nodeVersion + ' (JavaScript)'
        //     }
        // }

        this.options = {} // exchange-specific options, if any
        this.fetchOptions = {} // fetch implementation options (JS only)

        this.userAgents = {
            'chrome': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
            'chrome39': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36',
        }

        this.headers = {}

        // prepended to URL, like https://proxy.com/https://exchange.com/api...
        this.proxy = ''
        this.origin = '*' // CORS origin

        this.iso8601 = (timestamp) => {
            const _timestampNumber = parseInt (timestamp, 10);

            // undefined, null and lots of nasty non-numeric values yield NaN
            if (isNaN (_timestampNumber) || _timestampNumber < 0) {
                return undefined;
            }

            if (_timestampNumber < 0) {
                return undefined;
            }

            // last line of defence
            try {
                return new Date (_timestampNumber).toISOString ();
            } catch (e) {
                return undefined;
            }
        }

        this.parse8601 = (x) => {
            if (typeof x !== 'string' || !x) {
                return undefined;
            }

            if (x.match (/^[0-9]+$/)) {
                // a valid number in a string, not a date.
                return undefined;
            }

            if (x.indexOf ('-') < 0 || x.indexOf (':') < 0) { // no date can be without a dash and a colon
                return undefined;
            }

            // last line of defence
            try {
                const candidate = Date.parse (((x.indexOf ('+') >= 0) || (x.slice (-1) === 'Z')) ? x : (x + 'Z').replace (/\s(\d\d):/, 'T$1:'));
                if (isNaN (candidate)) {
                    return undefined;
                }
                return candidate;
            } catch (e) {
                return undefined;
            }
        }

        this.parseDate = (x) => {
            if (typeof x !== 'string' || !x) {
                return undefined;
            }

            if (x.indexOf ('GMT') >= 0) {
                try {
                    return Date.parse (x);
                } catch (e) {
                    return undefined;
                }
            }

            return this.parse8601 (x);
        }

        this.microseconds     = () => now () * 1000 // TODO: utilize performance.now for that purpose
        this.seconds          = () => Math.floor (now () / 1000)

        this.minFundingAddressLength = 1 // used in checkAddress
        this.substituteCommonCurrencyCodes = true  // reserved

        // do not delete this line, it is needed for users to be able to define their own fetchImplementation
        this.fetchImplementation = defaultFetch

        this.timeout          = 10000 // milliseconds
        this.verbose          = false
        this.debug            = false
        this.journal          = 'debug.json'
        this.userAgent        = undefined
        this.twofa            = false // two-factor authentication (2FA)

        this.apiKey   = undefined
        this.secret   = undefined
        this.uid      = undefined
        this.login    = undefined
        this.password = undefined

        this.balance    = {}
        this.orderbooks = {}
        this.tickers    = {}
        this.orders     = {}
        this.trades     = {}

        this.last_http_response = undefined
        this.last_json_response = undefined
        this.last_response_headers = undefined

        this.arrayConcat = (a, b) => a.concat (b)

        const unCamelCaseProperties = (obj = this) => {
            if (obj !== null) {
                for (const k of Object.getOwnPropertyNames (obj)) {
                    this[unCamelCase (k)] = this[k]
                }
                unCamelCaseProperties (Object.getPrototypeOf (obj))
            }
        }
        unCamelCaseProperties ()

        // merge configs
        const config = deepExtend (this.describe (), userConfig)

        // merge to this
        for (const [property, value] of Object.entries (config))
            this[property] = deepExtend (this[property], value)

        // generate old metainfo interface
        for (const k in this.has) {
            this['has' + capitalize (k)] = !!this.has[k] // converts 'emulated' to true
        }

        if (this.api)
            this.defineRestApi (this.api, 'request')

        this.initRestRateLimiter ()

        if (this.markets)
            this.setMarkets (this.markets)

        if (this.debug && journal) {
            journal (() => this.journal, this, Object.keys (this.has))
        }
    }

    defaults () {
        return { /* override me */ }
    }

    nonce () {
        return this.seconds ()
    }

    milliseconds () {
        return now ()
    }

    encodeURIComponent (...args) {
        return encodeURIComponent (...args)
    }

    checkRequiredCredentials () {
        Object.keys (this.requiredCredentials).forEach ((key) => {
            if (this.requiredCredentials[key] && !this[key])
                throw new AuthenticationError (this.id + ' requires `' + key + '`')
        })
    }

    checkAddress (address) {

        if (typeof address === 'undefined')
            throw new InvalidAddress (this.id + ' address is undefined')

        // check the address is not the same letter like 'aaaaa' nor too short nor has a space
        if ((unique (address).length === 1) || address.length < this.minFundingAddressLength || address.includes (' '))
            throw new InvalidAddress (this.id + ' address is invalid or has less than ' + this.minFundingAddressLength.toString () + ' characters: "' + this.json (address) + '"')

        return address
    }

    initRestRateLimiter () {

        const fetchImplementation = this.fetchImplementation

        if (this.rateLimit === undefined)
            throw new Error (this.id + '.rateLimit property is not configured')

        this.tokenBucket = this.extend ({
            refillRate:  1 / this.rateLimit,
            delay:       1,
            capacity:    1,
            defaultCost: 1,
            maxCapacity: 1000,
        }, this.tokenBucket)

        this.throttle = throttle (this.tokenBucket)

        this.executeRestRequest = function (url, method = 'GET', headers = undefined, body = undefined) {

            let promise =
                fetchImplementation (url, this.extend ({ method, headers, body, 'agent': this.agent || null, timeout: this.timeout }, this.fetchOptions))
                    .catch (e => {
                        if (isNode)
                            throw new ExchangeNotAvailable ([ this.id, method, url, e.type, e.message ].join (' '))
                        throw e // rethrow all unknown errors
                    })
                    .then (response => this.handleRestResponse (response, url, method, headers, body))

            return timeout (this.timeout, promise).catch (e => {
                if (e instanceof TimedOut)
                    throw new RequestTimeout (this.id + ' ' + method + ' ' + url + ' request timed out (' + this.timeout + ' ms)')
                throw e
            })
        }
    }

    defineRestApi (api, methodName, options = {}) {

        for (const type of Object.keys (api)) {
            for (const httpMethod of Object.keys (api[type])) {

                let paths = api[type][httpMethod]
                for (let i = 0; i < paths.length; i++) {
                    let path = paths[i].trim ()
                    let splitPath = path.split (/[^a-zA-Z0-9]/)

                    let uppercaseMethod  = httpMethod.toUpperCase ()
                    let lowercaseMethod  = httpMethod.toLowerCase ()
                    let camelcaseMethod  = this.capitalize (lowercaseMethod)
                    let camelcaseSuffix  = splitPath.map (this.capitalize).join ('')
                    let underscoreSuffix = splitPath.map (x => x.trim ().toLowerCase ()).filter (x => x.length > 0).join ('_')

                    let camelcase  = type + camelcaseMethod + this.capitalize (camelcaseSuffix)
                    let underscore = type + '_' + lowercaseMethod + '_' + underscoreSuffix

                    if ('suffixes' in options) {
                        if ('camelcase' in options['suffixes'])
                            camelcase += options['suffixes']['camelcase']
                        if ('underscore' in options.suffixes)
                            underscore += options['suffixes']['underscore']
                    }

                    if ('underscore_suffix' in options)
                        underscore += options.underscoreSuffix;
                    if ('camelcase_suffix' in options)
                        camelcase += options.camelcaseSuffix;

                    let partial = async params => this[methodName] (path, type, uppercaseMethod, params || {})

                    this[camelcase]  = partial
                    this[underscore] = partial
                }
            }
        }
    }

    fetch (url, method = 'GET', headers = undefined, body = undefined) {

        if (isNode && this.userAgent) {
            if (typeof this.userAgent === 'string')
                headers = extend ({ 'User-Agent': this.userAgent }, headers)
            else if ((typeof this.userAgent === 'object') && ('User-Agent' in this.userAgent))
                headers = extend (this.userAgent, headers)
        }

        if (typeof this.proxy === 'function') {

            url = this.proxy (url)
            if (isNode)
                headers = extend ({ 'Origin': this.origin }, headers)

        } else if (typeof this.proxy === 'string') {

            if (this.proxy.length)
                if (isNode)
                    headers = extend ({ 'Origin': this.origin }, headers)

            url = this.proxy + url
        }

        headers = extend (this.headers, headers)

        if (this.verbose)
            console.log ("fetch:\n", this.id, method, url, "\nRequest:\n", headers, "\n", body, "\n")

        return this.executeRestRequest (url, method, headers, body)
    }

    async fetch2 (path, type = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {

        if (this.enableRateLimit)
            await this.throttle ()

        let request = this.sign (path, type, method, params, headers, body)
        return this.fetch (request.url, request.method, request.headers, request.body)
    }

    request (path, type = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        return this.fetch2 (path, type, method, params, headers, body)
    }

    parseJson (response, responseBody, url, method) {
        try {

            return (responseBody.length > 0) ? JSON.parse (responseBody) : {} // empty object for empty body

        } catch (e) {

            if (this.verbose)
                console.log ('parseJson:\n', this.id, method, url, response.status, 'error', e, "response body:\n'" + responseBody + "'\n")

            let title = undefined
            let match = responseBody.match (/<title>([^<]+)/i)
            if (match)
                title = match[1].trim ();

            let maintenance = responseBody.match (/offline|busy|retry|wait|unavailable|maintain|maintenance|maintenancing/i)
            let ddosProtection = responseBody.match (/cloudflare|incapsula|overload|ddos/i)

            if (e instanceof SyntaxError) {

                let ExceptionClass = ExchangeNotAvailable
                let details = 'not accessible from this location at the moment'
                if (maintenance)
                    details = 'offline, on maintenance or unreachable from this location at the moment'
                if (ddosProtection)
                    ExceptionClass = DDoSProtection
                throw new ExceptionClass ([ this.id, method, url, response.status, title, details ].join (' '))
            }

            throw e
        }
    }

    handleErrors (statusCode, statusText, url, method, responseHeaders, responseBody, json) {
        // override me
    }

    defaultErrorHandler (response, responseBody, url, method) {
        const { status: code, statusText: reason } = response
        if ((code >= 200) && (code <= 299))
            return
        let error = undefined
        let details = responseBody
        let match = responseBody.match (/<title>([^<]+)/i)
        if (match)
            details = match[1].trim ();
        if ([ 418, 429 ].includes (code)) {
            error = DDoSProtection
        } else if ([ 404, 409, 500, 501, 502, 520, 521, 522, 525 ].includes (code)) {
            error = ExchangeNotAvailable
        } else if ([ 400, 403, 405, 503, 530 ].includes (code)) {
            let ddosProtection = responseBody.match (/cloudflare|incapsula/i)
            if (ddosProtection) {
                error = DDoSProtection
            } else {
                error = ExchangeNotAvailable
                details += ' (possible reasons: ' + [
                    'invalid API keys',
                    'bad or old nonce',
                    'exchange is down or offline',
                    'on maintenance',
                    'DDoS protection',
                    'rate-limiting',
                ].join (', ') + ')'
            }
        } else if ([ 408, 504 ].includes (code)) {
            error = RequestTimeout
        } else if ([ 401, 511 ].includes (code)) {
            error = AuthenticationError
        } else {
            error = ExchangeError
        }
        throw new error ([ this.id, method, url, code, reason, details ].join (' '))
    }

    handleRestResponse (response, url, method = 'GET', requestHeaders = undefined, requestBody = undefined) {

        return response.text ().then ((responseBody) => {

            let jsonRequired = this.parseJsonResponse && !this.skipJsonOnStatusCodes.includes (response.status)
            let json = jsonRequired ? this.parseJson (response, responseBody, url, method) : undefined

            let responseHeaders = {}
            response.headers.forEach ((value, key) => {
                key = key.split ('-').map (word => capitalize (word)).join ('-')
                responseHeaders[key] = value;
            })

            this.last_response_headers = responseHeaders
            this.last_http_response = responseBody // FIXME: for those classes that haven't switched to handleErrors yet
            this.last_json_response = json         // FIXME: for those classes that haven't switched to handleErrors yet

            if (this.verbose)
                console.log ("handleRestResponse:\n", this.id, method, url, response.status, response.statusText, "\nResponse:\n", responseHeaders, "\n", responseBody, "\n")

            const args = [ response.status, response.statusText, url, method, responseHeaders, responseBody, json ]
            this.handleErrors (...args)
            this.defaultErrorHandler (response, responseBody, url, method)

            return jsonRequired ? json : responseBody
        })
    }

    setMarkets (markets, currencies = undefined) {
        let values = Object.values (markets).map (market => deepExtend ({
            'limits': this.limits,
            'precision': this.precision,
        }, this.fees['trading'], market))
        this.markets = deepExtend (this.markets, indexBy (values, 'symbol'))
        this.marketsById = indexBy (markets, 'id')
        this.markets_by_id = this.marketsById
        this.symbols = Object.keys (this.markets).sort ()
        this.ids = Object.keys (this.markets_by_id).sort ()
        if (currencies) {
            this.currencies = deepExtend (currencies, this.currencies)
        } else {
            const baseCurrencies =
                values.filter (market => 'base' in market)
                    .map (market => ({
                        id: market.baseId || market.base,
                        numericId: (typeof market.baseNumericId !== 'undefined') ? market.baseNumericId : undefined,
                        code: market.base,
                        precision: market.precision ? (market.precision.base || market.precision.amount) : 8,
                    }))
            const quoteCurrencies =
                values.filter (market => 'quote' in market)
                    .map (market => ({
                        id: market.quoteId || market.quote,
                        numericId: (typeof market.quoteNumericId !== 'undefined') ? market.quoteNumericId : undefined,
                        code: market.quote,
                        precision: market.precision ? (market.precision.quote || market.precision.price) : 8,
                    }))
            const allCurrencies = baseCurrencies.concat (quoteCurrencies)
            const groupedCurrencies = groupBy (allCurrencies, 'code')
            const currencies = Object.keys (groupedCurrencies).map (code =>
                groupedCurrencies[code].reduce ((previous, current) =>
                    ((previous.precision > current.precision) ? previous : current), groupedCurrencies[code][0]))
            const sortedCurrencies = sortBy (flatten (currencies), 'code')
            this.currencies = deepExtend (indexBy (sortedCurrencies, 'code'), this.currencies)
        }
        this.currencies_by_id = indexBy (this.currencies, 'id')
        return this.markets
    }

    async loadMarkets (reload = false) {
        if (!reload && this.markets) {
            if (!this.markets_by_id) {
                return this.setMarkets (this.markets)
            }
            return this.markets
        }
        const markets = await this.fetchMarkets ()
        let currencies = undefined
        if (this.has.fetchCurrencies) {
            currencies = await this.fetchCurrencies ()
        }
        return this.setMarkets (markets, currencies)
    }

    fetchBidsAsks (symbols = undefined, params = {}) {
        throw new NotSupported (this.id + ' fetchBidsAsks not supported yet')
    }

    async fetchOHLCVC (symbol, timeframe = '1m', since = undefined, limits = undefined, params = {}) {
        if (!this.has['fetchTrades'])
            throw new NotSupported (this.id + ' fetchOHLCV() not supported yet')
        await this.loadMarkets ()
        let trades = await this.fetchTrades (symbol, since, limits, params)
        let ohlcvc = buildOHLCVC (trades, timeframe, since, limits)
        return ohlcvc
    }

    async fetchOHLCV (symbol, timeframe = '1m', since = undefined, limits = undefined, params = {}) {
        if (!this.has['fetchTrades'])
            throw new NotSupported (this.id + ' fetchOHLCV() not supported yet')
        await this.loadMarkets ()
        let trades = await this.fetchTrades (symbol, since, limits, params)
        let ohlcvc = buildOHLCVC (trades, timeframe, since, limits)
        return ohlcvc.map (c => c.slice (0, -1))
    }

    convertTradingViewToOHLCV (ohlcvs) {
        let result = [];
        for (let i = 0; i < ohlcvs['t'].length; i++) {
            result.push ([
                ohlcvs['t'][i] * 1000,
                ohlcvs['o'][i],
                ohlcvs['h'][i],
                ohlcvs['l'][i],
                ohlcvs['c'][i],
                ohlcvs['v'][i],
            ]);
        }
        return result;
    }

    convertOHLCVToTradingView (ohlcvs) {
        let result = {
            't': [],
            'o': [],
            'h': [],
            'l': [],
            'c': [],
            'v': [],
        };
        for (let i = 0; i < ohlcvs.length; i++) {
            result['t'].push (parseInt (ohlcvs[i][0] / 1000));
            result['o'].push (ohlcvs[i][1]);
            result['h'].push (ohlcvs[i][2]);
            result['l'].push (ohlcvs[i][3]);
            result['c'].push (ohlcvs[i][4]);
            result['v'].push (ohlcvs[i][5]);
        }
        return result;
    }

    fetchTickers (symbols = undefined, params = {}) {
        throw new NotSupported (this.id + ' fetchTickers not supported yet')
    }

    purgeCachedOrders (before) {
        const orders = Object
            .values (this.orders)
            .filter (order =>
                (order.status === 'open') ||
                (order.timestamp >= before))
        this.orders = indexBy (orders, 'id')
        return this.orders
    }

    fetchOrder (id, symbol = undefined, params = {}) {
        throw new NotSupported (this.id + ' fetchOrder not supported yet');
    }

    fetchOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        throw new NotSupported (this.id + ' fetchOrders not supported yet');
    }

    fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        throw new NotSupported (this.id + ' fetchOpenOrders not supported yet');
    }

    fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        throw new NotSupported (this.id + ' fetchClosedOrders not supported yet');
    }

    fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        throw new NotSupported (this.id + ' fetchMyTrades not supported yet');
    }

    fetchCurrencies () {
        throw new NotSupported (this.id + ' fetchCurrencies not supported yet');
    }

    fetchMarkets () {
        return new Promise ((resolve, reject) => resolve (Object.values (this.markets)))
    }

    async fetchOrderStatus (id, market = undefined) {
        let order = await this.fetchOrder (id, market);
        return order['status'];
    }

    account () {
        return {
            'free': 0.0,
            'used': 0.0,
            'total': 0.0,
        }
    }

    commonCurrencyCode (currency) {
        if (!this.substituteCommonCurrencyCodes)
            return currency
        return this.safeString (this.commonCurrencies, currency, currency)
    }

    currencyId (commonCode) {
        let currencyIds = {}
        let distinct = Object.keys (this.commonCurrencies)
        for (let i = 0; i < distinct.length; i++) {
            let k = distinct[i]
            currencyIds[this.commonCurrencies[k]] = k
        }
        return this.safeString (currencyIds, commonCode, commonCode)
    }

    currency (code) {

        if (typeof this.currencies === 'undefined')
            throw new ExchangeError (this.id + ' currencies not loaded')

        if ((typeof code === 'string') && (code in this.currencies))
            return this.currencies[code]

        throw new ExchangeError (this.id + ' does not have currency code ' + code)
    }

    findMarket (string) {

        if (typeof this.markets === 'undefined')
            throw new ExchangeError (this.id + ' markets not loaded')

        if (typeof string === 'string') {

            if (string in this.markets_by_id)
                return this.markets_by_id[string]

            if (string in this.markets)
                return this.markets[string]
        }

        return string
    }

    findSymbol (string, market = undefined) {

        if (typeof market === 'undefined')
            market = this.findMarket (string)

        if (typeof market === 'object')
            return market['symbol']

        return string
    }

    market (symbol) {

        if (typeof this.markets === 'undefined')
            throw new ExchangeError (this.id + ' markets not loaded')

        if ((typeof symbol === 'string') && (symbol in this.markets))
            return this.markets[symbol]

        throw new ExchangeError (this.id + ' does not have market symbol ' + symbol)
    }

    marketId (symbol) {
        let market = this.market (symbol)
        return (typeof market !== 'undefined' ? market['id'] : symbol)
    }

    marketIds (symbols) {
        return symbols.map (symbol => this.marketId (symbol));
    }

    symbol (symbol) {
        return this.market (symbol).symbol || symbol
    }

    extractParams (string) {
        let re = /{([\w-]+)}/g
        let matches = []
        let match = re.exec (string)
        while (match) {
            matches.push (match[1])
            match = re.exec (string)
        }
        return matches
    }

    implodeParams (string, params) {
        for (let property in params)
            string = string.replace ('{' + property + '}', params[property])
        return string
    }

    url (path, params = {}) {
        let result = this.implodeParams (path, params);
        let query = this.omit (params, this.extractParams (path))
        if (Object.keys (query).length)
            result += '?' + this.urlencode (query)
        return result
    }

    parseBidAsk (bidask, priceKey = 0, amountKey = 1) {
        let price = parseFloat (bidask[priceKey])
        let amount = parseFloat (bidask[amountKey])
        return [ price, amount ]
    }

    parseBidsAsks (bidasks, priceKey = 0, amountKey = 1) {
        return Object.values (bidasks || []).map (bidask => this.parseBidAsk (bidask, priceKey, amountKey))
    }

    async fetchL2OrderBook (symbol, limit = undefined, params = {}) {
        let orderbook = await this.fetchOrderBook (symbol, limit, params)
        return extend (orderbook, {
            'bids': sortBy (aggregate (orderbook.bids), 0, true),
            'asks': sortBy (aggregate (orderbook.asks), 0),
        })
    }

    parseOrderBook (orderbook, timestamp = undefined, bidsKey = 'bids', asksKey = 'asks', priceKey = 0, amountKey = 1) {
        return {
            'bids': sortBy ((bidsKey in orderbook) ? this.parseBidsAsks (orderbook[bidsKey], priceKey, amountKey) : [], 0, true),
            'asks': sortBy ((asksKey in orderbook) ? this.parseBidsAsks (orderbook[asksKey], priceKey, amountKey) : [], 0),
            'timestamp': timestamp,
            'datetime': (typeof timestamp !== 'undefined') ? this.iso8601 (timestamp) : undefined,
            'nonce': undefined,
        }
    }

    getCurrencyUsedOnOpenOrders (currency) {
        return Object.values (this.orders).filter (order => (order['status'] === 'open')).reduce ((total, order) => {
            let symbol = order['symbol'];
            let market = this.markets[symbol];
            let remaining = order['remaining']
            if (currency === market['base'] && order['side'] === 'sell') {
                return total + remaining
            } else if (currency === market['quote'] && order['side'] === 'buy') {
                return total + (order['price'] * remaining)
            } else {
                return total
            }
        }, 0)
    }

    parseBalance (balance) {

        const currencies = Object.keys (this.omit (balance, 'info'));

        currencies.forEach ((currency) => {

            if (typeof balance[currency].used === 'undefined') {
                // exchange reports only 'free' balance -> try to derive 'used' funds from open orders cache

                if (this.dontGetUsedBalanceFromStaleCache && ('open_orders' in balance['info'])) {
                    // liqui exchange reports number of open orders with balance response
                    // use it to validate the cache
                    const exchangeOrdersCount = balance['info']['open_orders'];
                    const cachedOrdersCount = Object.values (this.orders).filter (order => (order['status'] === 'open')).length;
                    if (cachedOrdersCount === exchangeOrdersCount) {
                        balance[currency].used = this.getCurrencyUsedOnOpenOrders (currency)
                        balance[currency].total = balance[currency].used + balance[currency].free
                    }
                } else {
                    balance[currency].used = this.getCurrencyUsedOnOpenOrders (currency)
                    balance[currency].total = balance[currency].used + balance[currency].free
                }
            }

            [ 'free', 'used', 'total' ].forEach ((account) => {
                balance[account] = balance[account] || {}
                balance[account][currency] = balance[currency][account]
            })
        })

        return balance
    }

    async fetchPartialBalance (part, params = {}) {
        let balance = await this.fetchBalance (params)
        return balance[part]
    }

    fetchFreeBalance (params = {}) {
        return this.fetchPartialBalance ('free', params)
    }

    fetchUsedBalance (params = {}) {
        return this.fetchPartialBalance ('used', params)
    }

    fetchTotalBalance (params = {}) {
        return this.fetchPartialBalance ('total', params)
    }

    async loadTradingLimits (symbols = undefined, reload = false, params = {}) {
        if (this.has['fetchTradingLimits']) {
            if (reload || !('limitsLoaded' in this.options)) {
                let response = await this.fetchTradingLimits (symbols);
                let limits = response['limits'];
                let keys = Object.keys (limits);
                for (let i = 0; i < keys.length; i++) {
                    let symbol = keys[i];
                    this.markets[symbol] = this.deepExtend (this.markets[symbol], {
                        'limits': limits[symbol],
                    });
                }
                this.options['limitsLoaded'] = this.milliseconds ();
            }
        }
        return this.markets;
    }

    filterBySinceLimit (array, since = undefined, limit = undefined) {
        if (typeof since !== 'undefined' && since !== null)
            array = array.filter (entry => entry.timestamp >= since)
        if (typeof limit !== 'undefined' && limit !== null)
            array = array.slice (0, limit)
        return array
    }

    filterBySymbolSinceLimit (array, symbol = undefined, since = undefined, limit = undefined) {

        const symbolIsDefined = typeof symbol !== 'undefined' && symbol !== null
        const sinceIsDefined = typeof since !== 'undefined' && since !== null

        // single-pass filter for both symbol and since
        if (symbolIsDefined || sinceIsDefined)
            array = Object.values (array).filter (entry =>
                ((symbolIsDefined ? (entry.symbol === symbol)  : true) &&
                 (sinceIsDefined  ? (entry.timestamp >= since) : true)))

        if (typeof limit !== 'undefined' && limit !== null)
            array = Object.values (array).slice (0, limit)

        return array
    }

    filterByArray (objects, key, values = undefined, indexed = true) {

        objects = Object.values (objects)

        // return all of them if no values were passed
        if (typeof values === 'undefined' || values === null)
            return indexed ? indexBy (objects, key) : objects

        let result = []
        for (let i = 0; i < objects.length; i++) {
            if (values.includes (objects[i][key]))
                result.push (objects[i])
        }

        return indexed ? indexBy (result, key) : result
    }

    parseTrades (trades, market = undefined, since = undefined, limit = undefined) {
        let result = Object.values (trades || []).map (trade => this.parseTrade (trade, market))
        result = sortBy (result, 'timestamp')
        let symbol = (typeof market !== 'undefined') ? market['symbol'] : undefined
        return this.filterBySymbolSinceLimit (result, symbol, since, limit)
    }

    parseOrders (orders, market = undefined, since = undefined, limit = undefined) {
        let result = Object.values (orders).map (order => this.parseOrder (order, market))
        result = sortBy (result, 'timestamp')
        let symbol = (typeof market !== 'undefined') ? market['symbol'] : undefined
        return this.filterBySymbolSinceLimit (result, symbol, since, limit)
    }

    filterBySymbol (array, symbol = undefined) {
        return ((typeof symbol !== 'undefined') ? array.filter (entry => entry.symbol === symbol) : array)
    }

    parseOHLCV (ohlcv, market = undefined, timeframe = '1m', since = undefined, limit = undefined) {
        return Array.isArray (ohlcv) ? ohlcv.slice (0, 6) : ohlcv
    }

    parseOHLCVs (ohlcvs, market = undefined, timeframe = '1m', since = undefined, limit = undefined) {
        ohlcvs = Object.values (ohlcvs)
        let result = []
        for (let i = 0; i < ohlcvs.length; i++) {
            if (limit && (result.length >= limit))
                break;
            let ohlcv = this.parseOHLCV (ohlcvs[i], market, timeframe, since, limit)
            if (since && (ohlcv[0] < since))
                continue
            result.push (ohlcv)
        }
        return result
    }

    editLimitBuyOrder (id, symbol, ...args) {
        return this.editLimitOrder (id, symbol, 'buy', ...args)
    }

    editLimitSellOrder (id, symbol, ...args) {
        return this.editLimitOrder (id, symbol, 'sell', ...args)
    }

    editLimitOrder (id, symbol, ...args) {
        return this.editOrder (id, symbol, 'limit', ...args)
    }

    async editOrder (id, symbol, ...args) {
        if (!this.enableRateLimit)
            throw new ExchangeError (this.id + ' editOrder() requires enableRateLimit = true')
        await this.cancelOrder (id, symbol);
        return this.createOrder (symbol, ...args)
    }

    createLimitOrder (symbol, ...args) {
        return this.createOrder (symbol, 'limit', ...args)
    }

    createMarketOrder (symbol, ...args) {
        return this.createOrder (symbol, 'market', ...args)
    }

    createLimitBuyOrder (symbol, ...args) {
        return this.createOrder  (symbol, 'limit', 'buy', ...args)
    }

    createLimitSellOrder (symbol, ...args) {
        return this.createOrder (symbol, 'limit', 'sell', ...args)
    }

    createMarketBuyOrder (symbol, amount, params = {}) {
        return this.createOrder (symbol, 'market', 'buy', amount, undefined, params)
    }

    createMarketSellOrder (symbol, amount, params = {}) {
        return this.createOrder (symbol, 'market', 'sell', amount, undefined, params)
    }

    costToPrecision (symbol, cost) {
        return parseFloat (cost).toFixed (this.markets[symbol].precision.price)
    }

    priceToPrecision (symbol, price) {
        return parseFloat (price).toFixed (this.markets[symbol].precision.price)
    }

    amountToPrecision (symbol, amount) {
        return this.truncate (amount, this.markets[symbol].precision.amount)
    }

    amountToString (symbol, amount) {
        return this.truncate_to_string (amount, this.markets[symbol].precision.amount)
    }

    amountToLots (symbol, amount) {
        const lot = this.markets[symbol].lot
        return this.amountToPrecision (symbol, Math.floor (amount / lot) * lot)
    }

    feeToPrecision (symbol, fee) {
        return parseFloat (fee).toFixed (this.markets[symbol].precision.price)
    }

    calculateFee (symbol, type, side, amount, price, takerOrMaker = 'taker', params = {}) {
        let market = this.markets[symbol]
        let rate = market[takerOrMaker]
        let cost = parseFloat (this.costToPrecision (symbol, amount * price))
        return {
            'type': takerOrMaker,
            'currency': market['quote'],
            'rate': rate,
            'cost': parseFloat (this.feeToPrecision (symbol, rate * cost)),
        }
    }

    mdy (timestamp, infix = '-') {
        infix = infix || ''
        let date = new Date (timestamp)
        let Y = date.getUTCFullYear ().toString ()
        let m = date.getUTCMonth () + 1
        let d = date.getUTCDate ()
        m = m < 10 ? ('0' + m) : m.toString ()
        d = d < 10 ? ('0' + d) : d.toString ()
        return m + infix + d + infix + y
    }

    ymd (timestamp, infix = '-') {
        infix = infix || ''
        let date = new Date (timestamp)
        let Y = date.getUTCFullYear ().toString ()
        let m = date.getUTCMonth () + 1
        let d = date.getUTCDate ()
        m = m < 10 ? ('0' + m) : m.toString ()
        d = d < 10 ? ('0' + d) : d.toString ()
        return Y + infix + m + infix + d
    }

    ymdhms (timestamp, infix = ' ') {
        let date = new Date (timestamp)
        let Y = date.getUTCFullYear ()
        let m = date.getUTCMonth () + 1
        let d = date.getUTCDate ()
        let H = date.getUTCHours ()
        let M = date.getUTCMinutes ()
        let S = date.getUTCSeconds ()
        m = m < 10 ? ('0' + m) : m
        d = d < 10 ? ('0' + d) : d
        H = H < 10 ? ('0' + H) : H
        M = M < 10 ? ('0' + M) : M
        S = S < 10 ? ('0' + S) : S
        return Y + '-' + m + '-' + d + infix + H + ':' + M + ':' + S
    }
}

},{"./Market":4,"./errors":5,"./functions":6,"fetch-ponyfill":63}],4:[function(require,module,exports){
"use strict";

module.exports = class Market {

    constructor (exchange, symbol) {
        this.exchange = exchange;
        this.symbol = symbol;
        this.market = exchange.markets[symbol];
    }

    amountToPrecision (amount) {
        return this.exchange.amountToPrecision (this.symbol, amount)
    }

    createLimitBuyOrder(amount, price) {
        return this.exchange.createLimitBuyOrder (this.symbol, amount, price)
    }

    createLimitSellOrder(amount, price) {
        return this.exchange.createLimitSellOrder (this.symbol, amount, price)
    }
}

},{}],5:[function(require,module,exports){
'use strict';

/*  ------------------------------------------------------------------------ */

module.exports = subclass (

/*  Root class                  */

    Error,

/*  Derived class hierarchy     */

    {
        'BaseError':{
            'ExchangeError': {
                'AuthenticationError': {
                    'PermissionDenied': {},
                    'AccountSuspended': {},
                },
                'BadResponse': {
                    'NullResponse': {},
                },
                'InsufficientFunds': {},
                'InvalidAddress': {
                    'AddressPending': {},
                },
                'InvalidOrder': {
                    'OrderNotFound': {},
                    'OrderNotCached': {},
                    'CancelPending': {},
                },
                'NotSupported': {},
            },
            'NetworkError': {
                'DDoSProtection': {},
                'ExchangeNotAvailable': {},
                'InvalidNonce': {},
                'RequestTimeout': {},
            },
        },
    }
)

/*  ------------------------------------------------------------------------ */

function subclass (BaseClass, classes, namespace = {}) {

    for (const [$class, subclasses] of Object.entries (classes)) {

        const Class = Object.assign (namespace, {

        /*  By creating a named property, we trick compiler to assign our class constructor function a name.
            Otherwise, all our error constructors would be shown as [Function: Error] in the debugger! And
            the super-useful `e.constructor.name` magic wouldn't work — we then would have no chance to
            obtain a error type string from an error instance programmatically!                               */

            [$class]: class extends BaseClass {

                constructor (message) {

                    super (message)

                /*  A workaround to make `instanceof` work on custom Error classes in transpiled ES5.
                    See my blog post for the explanation of this hack:

                    https://medium.com/@xpl/javascript-deriving-from-error-properly-8d2f8f315801        */

                    this.constructor = Class
                    this.__proto__   = Class.prototype
                    this.message     = message
                }
            }

        })[$class]

        subclass (Class, subclasses, namespace)
    }

    return namespace
}

/*  ------------------------------------------------------------------------ */

},{}],6:[function(require,module,exports){
'use strict';

/*  ------------------------------------------------------------------------ */

const { unCamelCase } = require ('./functions/string')

const unCamelCasePropertyNames = x => {
    for (const k in x) x[unCamelCase (k)] = x[k] // camel_case_method = camelCaseMethod
    return x
}

/*  ------------------------------------------------------------------------ */

module.exports = unCamelCasePropertyNames (Object.assign ({}

    , require ('./functions/platform')
    , require ('./functions/generic')
    , require ('./functions/string')
    , require ('./functions/type')
    , require ('./functions/number')
    , require ('./functions/encode')
    , require ('./functions/crypto')
    , require ('./functions/time')
    , require ('./functions/throttle')
    , require ('./functions/misc')
))

/*  ------------------------------------------------------------------------ */

},{"./functions/crypto":7,"./functions/encode":8,"./functions/generic":9,"./functions/misc":10,"./functions/number":11,"./functions/platform":12,"./functions/string":13,"./functions/throttle":14,"./functions/time":15,"./functions/type":16}],7:[function(require,module,exports){
"use strict";

/*  ------------------------------------------------------------------------ */

const CryptoJS = require ('crypto-js')
const { capitalize } = require ('./string')
const { stringToBase64, utf16ToBase64, urlencodeBase64 } = require ('./encode')

/*  ------------------------------------------------------------------------ */

const hash = (request, hash = 'md5', digest = 'hex') => {
    const result = CryptoJS[hash.toUpperCase ()] (request)
    return (digest === 'binary') ? result : result.toString (CryptoJS.enc[capitalize (digest)])
}

/*  .............................................   */

const hmac = (request, secret, hash = 'sha256', digest = 'hex') => {
    const result = CryptoJS['Hmac' + hash.toUpperCase ()] (request, secret)
    if (digest) {
        const encoding = (digest === 'binary') ? 'Latin1' : capitalize (digest)
        return result.toString (CryptoJS.enc[capitalize (encoding)])
    }
    return result
}

/*  .............................................   */

const jwt = function JSON_web_token (request, secret, alg = 'HS256', hash = 'sha256') {
    const encodedHeader = urlencodeBase64 (stringToBase64 (JSON.stringify ({ 'alg': alg, 'typ': 'JWT' })))
        , encodedData = urlencodeBase64 (stringToBase64 (JSON.stringify (request)))
        , token = [ encodedHeader, encodedData ].join ('.')
        , signature = urlencodeBase64 (utf16ToBase64 (hmac (token, secret, hash, 'utf16')))
    return [ token, signature ].join ('.')
}

/*  ------------------------------------------------------------------------ */

module.exports = {

    hash,
    hmac,
    jwt
}

/*  ------------------------------------------------------------------------ */

},{"./encode":8,"./string":13,"crypto-js":37}],8:[function(require,module,exports){
"use strict";

/*  ------------------------------------------------------------------------ */

const CryptoJS = require ('crypto-js')
const qs       = require ('qs') // querystring (TODO: get rid of that dependency)

/*  ------------------------------------------------------------------------ */

module.exports =

    { json:   (data, params = undefined) => JSON.stringify (data)
    , unjson: JSON.parse

    , stringToBinary (str) {
        const arr = new Uint8Array (str.length)
        for (let i = 0; i < str.length; i++) { arr[i] = str.charCodeAt (i); }
        return CryptoJS.lib.WordArray.create (arr)
    }

    , stringToBase64: string => CryptoJS.enc.Latin1.parse (string).toString (CryptoJS.enc.Base64)
    , utf16ToBase64:  string => CryptoJS.enc.Utf16 .parse (string).toString (CryptoJS.enc.Base64)
    , base64ToBinary: string => CryptoJS.enc.Base64.parse (string)
    , base64ToString: string => CryptoJS.enc.Base64.parse (string).toString (CryptoJS.enc.Utf8)
    , binaryToString: string => string

    , binaryConcat: (...args) => args.reduce ((a, b) => a.concat (b))

    , urlencode: object => qs.stringify (object)
    , rawencode: object => qs.stringify (object, { encode: false })

    // Url-safe-base64 without equals signs, with + replaced by - and slashes replaced by underscores

    , urlencodeBase64: base64string => base64string.replace (/[=]+$/, '')
                                                   .replace (/\+/g, '-')
                                                   .replace (/\//g, '_')
}

/*  ------------------------------------------------------------------------ */

},{"crypto-js":37,"qs":66}],9:[function(require,module,exports){
"use strict";

/*  ------------------------------------------------------------------------ */

const { isObject, isNumber, isDictionary, isArray } = require ('./type')

/*  ------------------------------------------------------------------------ */

const keys = Object.keys

    , values = x => !isArray (x)  // don't copy arrays if they're already arrays!
                        ? Object.values (x)
                        : x

    , index = x => new Set (values (x))

    , extend = (...args) => Object.assign ({}, ...args) // NB: side-effect free

    , clone = x => isArray (x)
                        ? Array.from (x) // clones arrays
                        : extend (x)     // clones objects

/*  ------------------------------------------------------------------------ */

module.exports =

    { keys
    , values
    , extend
    , clone
    , index
    , ordered: x => x // a stub to keep assoc keys in order (in JS it does nothing, it's mostly for Python)
    , unique:  x => Array.from (index (x))

    /*  .............................................   */

    , inArray (needle, haystack) {

        return haystack.includes (needle)
    }

    , toArray (object) {

        return Object.values (object)
    }

    , isEmpty (object) {
        if (!object)
            return true;
        return (Array.isArray (object) ? object : Object.keys (object)).length < 1;
    }

/*  .............................................   */

    , keysort (x, out = {}) {

        for (const k of keys (x).sort ())
            out[k] = x[k]

        return out
    }

/*  .............................................   */

    /*
       Accepts a map/array of objects and a key name to be used as an index:
       array = [
          { someKey: 'value1', anotherKey: 'anotherValue1' },
          { someKey: 'value2', anotherKey: 'anotherValue2' },
          { someKey: 'value3', anotherKey: 'anotherValue3' },
       ]
       key = 'someKey'

       Returns a map:
      {
          value1: { someKey: 'value1', anotherKey: 'anotherValue1' },
          value2: { someKey: 'value2', anotherKey: 'anotherValue2' },
          value3: { someKey: 'value3', anotherKey: 'anotherValue3' },
      }
    */

    , indexBy (x, k, out = {}) {

        for (const v of values (x))
            if (k in v)
                out[v[k]] = v

        return out
    }

/*  .............................................   */

    /*
       Accepts a map/array of objects and a key name to be used as a grouping parameter:
       array = [
          { someKey: 'value1', anotherKey: 'anotherValue1' },
          { someKey: 'value1', anotherKey: 'anotherValue2' },
          { someKey: 'value3', anotherKey: 'anotherValue3' },
       ]
       key = 'someKey'

       Returns a map:
      {
          value1: [
            { someKey: 'value1', anotherKey: 'anotherValue1' },
            { someKey: 'value1', anotherKey: 'anotherValue2' },
          ]
          value3: [
            { someKey: 'value3', anotherKey: 'anotherValue3' }
          ],
      }
    */

    , groupBy (x, k, out = {}) {

        for (const v of values (x)) {
            if (k in v) {
                const p = v[k]
                out[p] = out[p] || []
                out[p].push (v)
            }
        }
        return out
    }

/*  .............................................   */

    /*
       Accepts a map/array of objects, a key name and a key value to be used as a filter:
       array = [
          { someKey: 'value1', anotherKey: 'anotherValue1' },
          { someKey: 'value2', anotherKey: 'anotherValue2' },
          { someKey: 'value3', anotherKey: 'anotherValue3' },
       ]
       key = 'someKey'
       value = 'value1'

       Returns an array:
      [
          value1: { someKey: 'value1', anotherKey: 'anotherValue1' },
      ]
    */

    , filterBy (x, k, value = undefined, out = []) {

        for (const v of values (x))
            if (v[k] === value)
                out.push (v)

        return out
    }

/*  .............................................   */

    , sortBy: (array, // NB: MUTATES ARRAY!
               key,
               descending = false,
               direction  = descending ? -1 : 1) => array.sort ((a, b) =>
                                                                ((a[key] < b[key]) ? -direction :
                                                                ((a[key] > b[key]) ?  direction : 0)))

/*  .............................................   */

    , flatten: function flatten (x, out = []) {

        for (const v of x) {
            if (isArray (v)) flatten (v, out)
            else out.push (v)
        }

        return out
    }

/*  .............................................   */

    , pluck: (x, k) => values (x)
                        .filter (v => k in v)
                        .map (v => v[k])

/*  .............................................   */

    , omit (x, ...args) {

        const out = clone (x)

        for (const k of args) {

            if (isArray (k)) // omit (x, ['a', 'b'])
                for (const kk of k)
                    delete out[kk]

            else delete out[k] // omit (x, 'a', 'b')
        }

        return out
    }

/*  .............................................   */

    , sum (...xs) {

        const ns = xs.filter (isNumber) // leave only numbers

        return (ns.length > 0)
                    ? ns.reduce ((a, b) => a + b, 0)
                    : undefined
    }

/*  .............................................   */

    , deepExtend: function deepExtend (...xs) {

        let out = undefined

        for (const x of xs) {

            if (isDictionary (x)) {

                if (!isObject (out))
                    out = {}

                for (const k in x)
                    out[k] = deepExtend (out[k], x[k])

            } else out = x
        }

        return out
    }

/*  ------------------------------------------------------------------------ */

}

},{"./type":16}],10:[function(require,module,exports){
'use strict';

//-------------------------------------------------------------------------
// converts timeframe to seconds
const parseTimeframe = (timeframe) => {

    let amount = timeframe.slice (0, -1)
    let unit = timeframe.slice (-1)
    let scale = 60 // 1m by default

    if (unit === 'y') {
        scale = 60 * 60 * 24 * 365
    } else if (unit === 'M') {
        scale = 60 * 60 * 24 * 30
    } else if (unit === 'w') {
        scale = 60 * 60 * 24 * 7
    } else if (unit === 'd') {
        scale = 60 * 60 * 24
    } else if (unit === 'h') {
        scale = 60 * 60
    }

    return amount * scale
}

// given a sorted arrays of trades (recent last) and a timeframe builds an array of OHLCV candles
const buildOHLCVC = (trades, timeframe = '1m', since = -Infinity, limit = Infinity) => {
    let ms = parseTimeframe (timeframe) * 1000;
    let ohlcvs = [];
    const [ timestamp, /* open */, high, low, close, volume, count ] = [ 0, 1, 2, 3, 4, 5, 6 ];
    let oldest = Math.min (trades.length - 1, limit);

    for (let i = 0; i <= oldest; i++) {
        let trade = trades[i];
        if (trade.timestamp < since)
            continue;
        let openingTime = Math.floor (trade.timestamp / ms) * ms; // shift to the edge of m/h/d (but not M)
        let candle = ohlcvs.length - 1;

        if (candle === -1 || openingTime >= ohlcvs[candle][timestamp] + ms) {
            // moved to a new timeframe -> create a new candle from opening trade
            ohlcvs.push ([
                openingTime,  // timestamp
                trade.price,  // O
                trade.price,  // H
                trade.price,  // L
                trade.price,  // C
                trade.amount, // V
                1,            // count
            ]);
        } else {
            // still processing the same timeframe -> update opening trade
            ohlcvs[candle][high] = Math.max (ohlcvs[candle][high], trade.price);
            ohlcvs[candle][low] = Math.min (ohlcvs[candle][low], trade.price);
            ohlcvs[candle][close] = trade.price;
            ohlcvs[candle][volume] += trade.amount;
            ohlcvs[candle][count]++;
        } // if
    } // for
    return ohlcvs;
}

/*  ------------------------------------------------------------------------ */

module.exports = {

    aggregate (bidasks) {

        let result = {}

        for (const [price, volume] of bidasks) {
            if (volume > 0)
                result[price] = (result[price] || 0) + volume
        }

        return Object.keys (result).map (price => [parseFloat (price), parseFloat (result[price])])
    },

    parseTimeframe,
    buildOHLCVC,
}

/*  ------------------------------------------------------------------------ */

},{}],11:[function(require,module,exports){
'use strict'

const { isString, isNumber } = require ('./type')
const { max } = Math

/*  ------------------------------------------------------------------------

    NB: initially, I used objects for options passing:

            decimalToPrecision ('123.456', { digits: 2, round: true, afterPoint: true })

    ...but it turns out it's hard to port that across different languages and it is also
       probably has a performance penalty -- while it's a performance critical code! So
       I switched to using named constants instead, as it is actually more readable and
       succinct, and surely doesn't come with any inherent performance downside:

            decimalToPrecision ('123.456', ROUND, 2, DECIMAL_PLACES)                     */

const ROUND    = 0                  // rounding mode
    , TRUNCATE = 1

const DECIMAL_PLACES     = 0        // digits counting mode
    , SIGNIFICANT_DIGITS = 1

const NO_PADDING    = 0             // zero-padding mode
    , PAD_WITH_ZERO = 1

const precisionConstants = {
    ROUND,
    TRUNCATE,
    DECIMAL_PLACES,
    SIGNIFICANT_DIGITS,
    NO_PADDING,
    PAD_WITH_ZERO,
}

/*  ------------------------------------------------------------------------ */

// See https://stackoverflow.com/questions/1685680/how-to-avoid-scientific-notation-for-large-numbers-in-javascript for discussion

function numberToString (x) { // avoids scientific notation for too large and too small numbers

    if (isString (x)) return x

    if (Math.abs (x) < 1.0) {
        const s = x.toString ()
        const e = parseInt (s.split ('e-')[1])
        const neg = (s[0] === '-')
        if (e) {
            x *= Math.pow (10, e-1)
            x = (neg ? '-' : '') + '0.' + (new Array (e)).join ('0') + x.toString ().substring (neg ? 3 : 2)
        }
    } else {
        let e = parseInt (x.toString ().split ('+')[1])
        if (e > 20) {
            e -= 20
            x /= Math.pow (10, e)
            x += (new Array (e+1)).join ('0')
        }
    }
    return x.toString ()
}

//-----------------------------------------------------------------------------
// expects non-scientific notation

const truncate_regExpCache = []
    , truncate_to_string = (num, precision = 0) => {
        num = numberToString (num)
        if (precision > 0) {
            const re = truncate_regExpCache[precision] || (truncate_regExpCache[precision] = new RegExp("([-]*\\d+\\.\\d{" + precision + "})(\\d)"))
            const [,result] = num.toString ().match (re) || [null, num]
            return result.toString ()
        }
        return parseInt (num).toString ()
    }
    , truncate = (num, precision = 0) => parseFloat (truncate_to_string (num, precision))

function precisionFromString (string) {
    const split = string.replace (/0+$/g, '').split ('.')
    return (split.length > 1) ? (split[1].length) : 0
}

/*  ------------------------------------------------------------------------ */

const decimalToPrecision = (x, roundingMode
                             , numPrecisionDigits
                             , countingMode       = DECIMAL_PLACES
                             , paddingMode        = NO_PADDING) => {

    if (numPrecisionDigits < 0) throw new Error ('negative precision is not yet supported')

/*  Convert to a string (if needed), skip leading minus sign (if any)   */

    const str          = numberToString (x)
        , isNegative   = str[0] === '-'
        , strStart     = isNegative ? 1 : 0
        , strEnd       = str.length

/*  Find the dot position in the source buffer   */

    for (var strDot = 0; strDot < strEnd; strDot++)
        if (str[strDot] === '.')
            break

    const hasDot = strDot < str.length

/*  Char code constants         */

    const MINUS =  45
        , DOT   =  46
        , ZERO  =  48
        , ONE   = (ZERO + 1)
        , FIVE  = (ZERO + 5)
        , NINE  = (ZERO + 9)

/*  For -123.4567 the `chars` array will hold 01234567 (leading zero is reserved for rounding cases when 099 → 100)    */

    const chars    = new Uint8Array ((strEnd - strStart) + (hasDot ? 0 : 1))
          chars[0] = ZERO

/*  Validate & copy digits, determine certain locations in the resulting buffer  */

    let afterDot    = chars.length
      , digitsStart = -1                // significant digits
      , digitsEnd   = -1

    for (var i = 1, j = strStart; j < strEnd; j++, i++) {

        const c = str.charCodeAt (j)

        if (c === DOT) {
            afterDot = i--

        } else if ((c < ZERO) || (c > NINE)) {
            throw new Error (`${str}: invalid number (contains an illegal character '${str[i - 1]}')`)

        } else {
            chars[i] = c
            if ((c !== ZERO) && (digitsStart < 0)) digitsStart = i
        }
    }

    if (digitsStart < 0) digitsStart = 1

/*  Determine the range to cut  */

    let precisionStart = (countingMode === DECIMAL_PLACES) ? afterDot      // 0.(0)001234567
                                                           : digitsStart   // 0.00(1)234567
      , precisionEnd = precisionStart +
                       numPrecisionDigits

/*  Reset the last significant digit index, as it will change during the rounding/truncation.   */

    digitsEnd = -1

/*  Perform rounding/truncation per digit, from digitsEnd to digitsStart, by using the following
    algorithm (rounding 999 → 1000, as an example):

        step  =          i=3      i=2      i=1      i=0

        chars =         0999     0999     0900     1000
        memo  =         ---0     --1-     -1--     0---                     */

    let allZeros = true;
    for (let i = chars.length - 1, memo = 0; i >= 0; i--) {

        let c = chars[i]

        if (i !== 0) {
            c += memo

            if (i >= (precisionStart + numPrecisionDigits)) {

                const ceil = (roundingMode === ROUND) &&
                             (c >= FIVE) &&
                            !((c === FIVE) && memo) // prevents rounding of 1.45 to 2

                c = ceil ? (NINE + 1) : ZERO
            }
            if (c > NINE) { c = ZERO; memo = 1; }
            else memo = 0

        } else if (memo) c = ONE // leading extra digit (0900 → 1000)

        chars[i] = c

        if (c !== ZERO) {
            allZeros    = false
            digitsStart = i
            digitsEnd   = (digitsEnd < 0) ? (i + 1) : digitsEnd
        }
    }

/*  Update the precision range, as `digitsStart` may have changed...     */

    if (countingMode === SIGNIFICANT_DIGITS) {
        precisionStart = digitsStart
        precisionEnd   = precisionStart + numPrecisionDigits
    }

/*  Determine the input character range     */

    const readStart     = ((digitsStart >= afterDot) || allZeros) ? (afterDot - 1) : digitsStart // 0.000(1)234  ----> (0).0001234
        , readEnd       = (digitsEnd    < afterDot) ? (afterDot    ) : digitsEnd   // 12(3)000     ----> 123000( )

/*  Compute various sub-ranges       */

    const nSign         =     (isNegative ? 1 : 0)                // (-)123.456
        , nBeforeDot    =     (nSign + (afterDot - readStart))    // (-123).456
        , nAfterDot     = max (readEnd - afterDot, 0)             // -123.(456)
        , actualLength  =     (readEnd - readStart)               // -(123.456)
        , desiredLength =     (paddingMode === NO_PADDING)
                                    ? (actualLength)              // -(123.456)
                                    : (precisionEnd - readStart)  // -(123.456    )

        , pad           = max (desiredLength - actualLength, 0)   //  -123.456(    )
        , padStart      =     (nBeforeDot + 1 + nAfterDot)        //  -123.456( )
        , padEnd        =     (padStart + pad)                    //  -123.456     ( )
        , isInteger     =     (nAfterDot + pad) === 0             //  -123

/*  Fill the output buffer with characters    */

    const out = new Uint8Array (nBeforeDot + (isInteger ? 0 : 1) + nAfterDot + pad)
                                                                                                  // ---------------------
    if  (isNegative)                                                  out[0]          = MINUS     // -     minus sign
    for (i = nSign, j = readStart;          i < nBeforeDot; i++, j++) out[i]          = chars[j]  // 123   before dot
    if  (!isInteger)                                                  out[nBeforeDot] = DOT       // .     dot
    for (i = nBeforeDot + 1, j = afterDot;  i < padStart;   i++, j++) out[i]          = chars[j]  // 456   after dot
    for (i = padStart;                      i < padEnd;     i++)      out[i]          = ZERO      // 000   padding

/*  Build a string from the output buffer     */

    return String.fromCharCode (...out)
}

/*  ------------------------------------------------------------------------ */

module.exports = {

    numberToString,
    precisionFromString,
    decimalToPrecision,
    truncate_to_string,
    truncate,
    precisionConstants,
    ROUND,
    TRUNCATE,
    DECIMAL_PLACES,
    SIGNIFICANT_DIGITS,
    NO_PADDING,
    PAD_WITH_ZERO,
}

/*  ------------------------------------------------------------------------ */

},{"./type":16}],12:[function(require,module,exports){
(function (process){
"use strict";

// ----------------------------------------------------------------------------
// There's been a lot of messing with this code...
// The problem is to satisfy the following requirements:
// - properly detect isNode == true on server side and isNode == false in the browser (on client side)
// - make sure create-react-app, react-starter-kit and other react frameworks work
// - make sure it does not break the browserified version (when linked into a html from a cdn)
// - make sure it does not break the webpacking and babel-transpiled scripts
// - make sure it works in Electron
// - make sure it works with Angular.js
// - make sure it does not break other possible usage scenarios

const isBrowser = typeof window !== 'undefined'

const isElectron = typeof process !== 'undefined' &&
                   typeof process.versions !== 'undefined' &&
                   typeof process.versions.electron !== 'undefined'

const isWebWorker = typeof WorkerGlobalScope !== 'undefined' && (self instanceof WorkerGlobalScope)

const isWindows = typeof process !== 'undefined' && process.platform === "win32"

const isNode = !(isBrowser || isWebWorker)

// ----------------------------------------------------------------------------

module.exports = {

    isBrowser,
    isElectron,
    isWebWorker,
    isNode,
    isWindows,
}
}).call(this,require('_process'))
},{"_process":64}],13:[function(require,module,exports){
"use strict";

/*  ------------------------------------------------------------------------ */

const uuid = a => a ? (a ^ Math.random () * 16 >> a / 4).toString (16)
                    : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace (/[018]/g, uuid)

module.exports =

    { uuid

      // hasFetchOHLCV → has_fetch_ohlcv; parseHTTPResponse → parse_http_response
    , unCamelCase: s => s.match (/^[A-Z0-9_]+$/) ? s : (s.replace (/[a-z0-9][A-Z]/g, x => x[0] + '_' + x[1]).replace(/[A-Z0-9][A-Z0-9][a-z]/g, x => x[0] + '_' + x[1] + x[2]).toLowerCase ())

    , capitalize: s => s.length
                            ? (s.charAt (0).toUpperCase () + s.slice (1))
                            : s
    }

/*  ------------------------------------------------------------------------ */

},{}],14:[function(require,module,exports){
"use strict";

/*  ------------------------------------------------------------------------ */

const { sleep
      , now } = require ('./time')

/*  ------------------------------------------------------------------------ */

module.exports = {

    throttle: function throttle (cfg) {

        let   lastTimestamp = now ()
            , numTokens     = (typeof cfg.numTokens !== 'undefined') ? cfg.numTokens : cfg.capacity
            , running       = false
            , counter       = 0

        const queue = []

        return Object.assign ((cost) => {

            if (queue.length > cfg.maxCapacity)
                throw new Error ('Backlog is over max capacity of ' + cfg.maxCapacity)

            return new Promise (async (resolve, reject) => {

                try {
                    queue.push ({ cost, resolve, reject })

                    if (!running) {
                        running = true
                        while (queue.length > 0) {
                            const hasEnoughTokens = cfg.capacity ? (numTokens > 0) : (numTokens >= 0)
                            if (hasEnoughTokens) {
                                if (queue.length > 0) {
                                    let { cost, resolve, reject } = queue[0]
                                    cost = (cost || cfg.defaultCost)
                                    if (numTokens >= Math.min (cost, cfg.capacity)) {
                                        numTokens -= cost
                                        queue.shift ()
                                        resolve ()
                                    }
                                }
                            }
                            const t = now ()
                                , elapsed = t - lastTimestamp
                            lastTimestamp = t
                            numTokens = Math.min (cfg.capacity, numTokens + elapsed * cfg.refillRate)
                            await sleep (cfg.delay)
                        }
                        running = false
                    }

                } catch (e) {
                    reject (e)
                }
            })

        }, cfg, { configure: newCfg => throttle (Object.assign ({}, cfg, newCfg)) })
    }
}

/*  ------------------------------------------------------------------------ */

},{"./time":15}],15:[function(require,module,exports){
'use strict';

/*  ------------------------------------------------------------------------ */

const now = Date.now // TODO: figure out how to utilize performance.now () properly – it's not as easy as it does not return a unix timestamp...

/*  ------------------------------------------------------------------------ */

const setTimeout_original = setTimeout
const setTimeout_safe = (done, ms, setTimeout = setTimeout_original /* overrideable for mocking purposes */, targetTime = now () + ms) => {

/*  The built-in setTimeout function can fire its callback earlier than specified, so we
    need to ensure that it does not happen: sleep recursively until `targetTime` is reached...   */

    let clearInnerTimeout = () => {}
    let active = true

    let id = setTimeout (() => {
        active = true
        const rest = targetTime - now ()
        if (rest > 0) {
            clearInnerTimeout = setTimeout_safe (done, rest, setTimeout, targetTime) // try sleep more
        } else {
            done ()
        }
    }, ms)

    return function clear () {
        if (active) {
            active = false // dunno if IDs are unique on various platforms, so it's better to rely on this flag to exclude the possible cancellation of the wrong timer (if called after completion)
            clearTimeout (id)
        }
        clearInnerTimeout ()
    }
}

/*  ------------------------------------------------------------------------ */

class TimedOut extends Error {

    constructor () {
        const message = 'timed out'
        super (message)
        this.constructor = TimedOut
        this.__proto__   = TimedOut.prototype
        this.message     = message
    }
}

/*  ------------------------------------------------------------------------ */

module.exports =

    { now
    , setTimeout_safe
    , sleep: ms => new Promise (resolve => setTimeout_safe (resolve, ms))
    , TimedOut
    , timeout: async (ms, promise) => {

        let clear = () => {}
        const expires = new Promise (resolve => (clear = setTimeout_safe (resolve, ms)))

        try {
            return await Promise.race ([promise, expires.then (() => { throw new TimedOut () })])
        } finally {
            clear () // fixes https://github.com/ccxt/ccxt/issues/749
        }
    }
}

/*  ------------------------------------------------------------------------ */

},{}],16:[function(require,module,exports){
"use strict";

/*  ------------------------------------------------------------------------ */

const isNumber          = Number.isFinite
    , isArray           = Array.isArray
    , isString          = s =>                 (typeof s === 'string')
    , isObject          = o => (o !== null) && (typeof o === 'object')
    , isDictionary      = o => (isObject (o) && !isArray (o))
    , isStringCoercible = x => (hasProps (x) && x.toString) || isNumber (x)

/*  .............................................   */

const hasProps = o => (o !== undefined) &&
                      (o !== null)

    , prop = (o, k) => (isObject (o) ? o[k] : undefined)
    , prop2 = (o, k1, k2) => (!isObject (o) ? undefined : ((k1 in o) ? o[k1] : o[k2]))

/*  .............................................   */

const asFloat   = x => ((isNumber (x) || isString (x)) ? parseFloat (x)     : NaN)
    , asInteger = x => ((isNumber (x) || isString (x)) ? parseInt   (x, 10) : NaN)

/*  .............................................   */

module.exports =

    { isNumber
    , isArray
    , isObject
    , isString
    , isStringCoercible
    , isDictionary

    , hasProps
    , prop

    , asFloat
    , asInteger

    , safeFloat:   (o, k, $default, n =   asFloat (prop (o, k))) => isNumber (n)          ? n          : $default
    , safeInteger: (o, k, $default, n = asInteger (prop (o, k))) => isNumber (n)          ? n          : $default
    , safeValue:   (o, k, $default, x =            prop (o, k) ) => hasProps (x)          ? x          : $default
    , safeString:  (o, k, $default, x =            prop (o, k) ) => isStringCoercible (x) ? String (x) : $default

    // not using safeFloats with an array argument as we're trying to save some cycles here
    // we're not using safeFloat3 either because those cases are too rare to deserve their own optimization

    , safeFloat2:   (o, k1, k2, $default, n =   asFloat (prop2 (o, k1, k2))) => isNumber (n)          ? n          : $default
    , safeInteger2: (o, k1, k2, $default, n = asInteger (prop2 (o, k1, k2))) => isNumber (n)          ? n          : $default
    , safeValue2:   (o, k1, k2, $default, x =            prop2 (o, k1, k2) ) => hasProps (x)          ? x          : $default
    , safeString2:  (o, k1, k2, $default, x =            prop2 (o, k1, k2) ) => isStringCoercible (x) ? String (x) : $default

    }

/*  ------------------------------------------------------------------------ */

},{}],17:[function(require,module,exports){
'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError, ExchangeNotAvailable, InsufficientFunds, OrderNotFound, InvalidOrder, DDoSProtection, InvalidNonce, AuthenticationError } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class binance extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'binance',
            'name': 'Binance',
            'countries': [ 'JP' ], // Japan
            'rateLimit': 500,
            // new metainfo interface
            'has': {
                'fetchDepositAddress': true,
                'CORS': false,
                'fetchBidsAsks': true,
                'fetchTickers': true,
                'fetchOHLCV': true,
                'fetchMyTrades': true,
                'fetchOrder': true,
                'fetchOrders': true,
                'fetchOpenOrders': true,
                'fetchClosedOrders': true,
                'withdraw': true,
                'fetchFundingFees': true,
            },
            'timeframes': {
                '1m': '1m',
                '3m': '3m',
                '5m': '5m',
                '15m': '15m',
                '30m': '30m',
                '1h': '1h',
                '2h': '2h',
                '4h': '4h',
                '6h': '6h',
                '8h': '8h',
                '12h': '12h',
                '1d': '1d',
                '3d': '3d',
                '1w': '1w',
                '1M': '1M',
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/29604020-d5483cdc-87ee-11e7-94c7-d1a8d9169293.jpg',
                'api': {
                    'web': 'https://www.binance.com',
                    'wapi': 'https://api.binance.com/wapi/v3',
                    'public': 'https://api.binance.com/api/v1',
                    'private': 'https://api.binance.com/api/v3',
                    'v3': 'https://api.binance.com/api/v3',
                    'v1': 'https://api.binance.com/api/v1',
                },
                'www': 'https://www.binance.com',
                'referral': 'https://www.binance.com/?ref=10205187',
                'doc': 'https://github.com/binance-exchange/binance-official-api-docs/blob/master/rest-api.md',
                'fees': [
                    'https://binance.zendesk.com/hc/en-us/articles/115000429332',
                    'https://support.binance.com/hc/en-us/articles/115000583311',
                ],
            },
            'api': {
                'web': {
                    'get': [
                        'exchange/public/product',
                        'assetWithdraw/getAllAsset.html',
                    ],
                },
                'wapi': {
                    'post': [
                        'withdraw',
                    ],
                    'get': [
                        'getAllAsset',
                        'depositHistory',
                        'withdrawHistory',
                        'depositAddress',
                        'accountStatus',
                        'systemStatus',
                        'withdrawFee',
                    ],
                },
                'v3': {
                    'get': [
                        'ticker/price',
                        'ticker/bookTicker',
                    ],
                },
                'public': {
                    'get': [
                        'exchangeInfo',
                        'ping',
                        'time',
                        'depth',
                        'aggTrades',
                        'klines',
                        'ticker/24hr',
                        'ticker/allPrices',
                        'ticker/allBookTickers',
                        'ticker/price',
                        'ticker/bookTicker',
                        'exchangeInfo',
                    ],
                    'put': [ 'userDataStream' ],
                    'post': [ 'userDataStream' ],
                    'delete': [ 'userDataStream' ],
                },
                'private': {
                    'get': [
                        'order',
                        'openOrders',
                        'allOrders',
                        'account',
                        'myTrades',
                    ],
                    'post': [
                        'order',
                        'order/test',
                    ],
                    'delete': [
                        'order',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'tierBased': false,
                    'percentage': true,
                    'taker': 0.001,
                    'maker': 0.001,
                },
                // should be deleted, these are outdated and inaccurate
                'funding': {
                    'tierBased': false,
                    'percentage': false,
                    'withdraw': {
                        'ADA': 1.0,
                        'ADX': 4.7,
                        'AION': 1.9,
                        'AMB': 11.4,
                        'APPC': 6.5,
                        'ARK': 0.1,
                        'ARN': 3.1,
                        'AST': 10.0,
                        'BAT': 18.0,
                        'BCD': 1.0,
                        'BCH': 0.001,
                        'BCPT': 10.2,
                        'BCX': 1.0,
                        'BNB': 0.7,
                        'BNT': 1.5,
                        'BQX': 1.6,
                        'BRD': 6.4,
                        'BTC': 0.001,
                        'BTG': 0.001,
                        'BTM': 5.0,
                        'BTS': 1.0,
                        'CDT': 67.0,
                        'CMT': 37.0,
                        'CND': 47.0,
                        'CTR': 5.4,
                        'DASH': 0.002,
                        'DGD': 0.06,
                        'DLT': 11.7,
                        'DNT': 51.0,
                        'EDO': 2.5,
                        'ELF': 6.5,
                        'ENG': 2.1,
                        'ENJ': 42.0,
                        'EOS': 1.0,
                        'ETC': 0.01,
                        'ETF': 1.0,
                        'ETH': 0.01,
                        'EVX': 2.5,
                        'FUEL': 45.0,
                        'FUN': 85.0,
                        'GAS': 0,
                        'GTO': 20.0,
                        'GVT': 0.53,
                        'GXS': 0.3,
                        'HCC': 0.0005,
                        'HSR': 0.0001,
                        'ICN': 3.5,
                        'ICX': 1.3,
                        'INS': 1.5,
                        'IOTA': 0.5,
                        'KMD': 0.002,
                        'KNC': 2.6,
                        'LEND': 54.0,
                        'LINK': 12.8,
                        'LLT': 54.0,
                        'LRC': 9.1,
                        'LSK': 0.1,
                        'LTC': 0.01,
                        'LUN': 0.29,
                        'MANA': 74.0,
                        'MCO': 0.86,
                        'MDA': 4.7,
                        'MOD': 2.0,
                        'MTH': 34.0,
                        'MTL': 1.9,
                        'NAV': 0.2,
                        'NEBL': 0.01,
                        'NEO': 0.0,
                        'NULS': 2.1,
                        'OAX': 8.3,
                        'OMG': 0.57,
                        'OST': 17.0,
                        'POE': 88.0,
                        'POWR': 8.6,
                        'PPT': 0.25,
                        'QSP': 21.0,
                        'QTUM': 0.01,
                        'RCN': 35.0,
                        'RDN': 2.2,
                        'REQ': 18.1,
                        'RLC': 4.1,
                        'SALT': 1.3,
                        'SBTC': 1.0,
                        'SNGLS': 42,
                        'SNM': 29.0,
                        'SNT': 32.0,
                        'STORJ': 5.9,
                        'STRAT': 0.1,
                        'SUB': 7.4,
                        'TNB': 82.0,
                        'TNT': 47.0,
                        'TRIG': 6.7,
                        'TRX': 129.0,
                        'USDT': 23.0,
                        'VEN': 1.8,
                        'VIB': 28.0,
                        'VIBE': 7.2,
                        'WABI': 3.5,
                        'WAVES': 0.002,
                        'WINGS': 9.3,
                        'WTC': 0.5,
                        'XLM': 0.01,
                        'XMR': 0.04,
                        'XRP': 0.25,
                        'XVG': 0.1,
                        'XZC': 0.02,
                        'YOYOW': 39.0,
                        'ZEC': 0.005,
                        'ZRX': 5.7,
                    },
                    'deposit': {},
                },
            },
            'commonCurrencies': {
                'YOYO': 'YOYOW',
                'BCC': 'BCH',
            },
            // exchange-specific options
            'options': {
                'defaultTimeInForce': 'GTC', // 'GTC' = Good To Cancel (default), 'IOC' = Immediate Or Cancel
                'defaultLimitOrderType': 'limit', // or 'limit_maker'
                'hasAlreadyAuthenticatedSuccessfully': false,
                'warnOnFetchOpenOrdersWithoutSymbol': true,
                'recvWindow': 5 * 1000, // 5 sec, binance default
                'timeDifference': 0, // the difference between system clock and Binance clock
                'adjustForTimeDifference': false, // controls the adjustment logic upon instantiation
                'parseOrderToPrecision': false, // force amounts and costs in parseOrder to precision
                'newOrderRespType': 'RESULT', // 'ACK' for order id, 'RESULT' for full order or 'FULL' for order with fills
            },
            'exceptions': {
                '-1000': ExchangeNotAvailable, // {"code":-1000,"msg":"An unknown error occured while processing the request."}
                '-1013': InvalidOrder, // createOrder -> 'invalid quantity'/'invalid price'/MIN_NOTIONAL
                '-1021': InvalidNonce, // 'your time is ahead of server'
                '-1022': AuthenticationError, // {"code":-1022,"msg":"Signature for this request is not valid."}
                '-1100': InvalidOrder, // createOrder(symbol, 1, asdf) -> 'Illegal characters found in parameter 'price'
                '-2010': ExchangeError, // generic error code for createOrder -> 'Account has insufficient balance for requested action.', {"code":-2010,"msg":"Rest API trading is not enabled."}, etc...
                '-2011': OrderNotFound, // cancelOrder(1, 'BTC/USDT') -> 'UNKNOWN_ORDER'
                '-2013': OrderNotFound, // fetchOrder (1, 'BTC/USDT') -> 'Order does not exist'
                '-2014': AuthenticationError, // { "code":-2014, "msg": "API-key format invalid." }
                '-2015': AuthenticationError, // "Invalid API-key, IP, or permissions for action."
            },
        });
    }

    nonce () {
        return this.milliseconds () - this.options['timeDifference'];
    }

    async loadTimeDifference () {
        const response = await this.publicGetTime ();
        const after = this.milliseconds ();
        this.options['timeDifference'] = parseInt (after - response['serverTime']);
        return this.options['timeDifference'];
    }

    async fetchMarkets () {
        let response = await this.publicGetExchangeInfo ();
        if (this.options['adjustForTimeDifference'])
            await this.loadTimeDifference ();
        let markets = response['symbols'];
        let result = [];
        for (let i = 0; i < markets.length; i++) {
            let market = markets[i];
            let id = market['symbol'];
            // "123456" is a "test symbol/market"
            if (id === '123456')
                continue;
            let baseId = market['baseAsset'];
            let quoteId = market['quoteAsset'];
            let base = this.commonCurrencyCode (baseId);
            let quote = this.commonCurrencyCode (quoteId);
            let symbol = base + '/' + quote;
            let filters = this.indexBy (market['filters'], 'filterType');
            let precision = {
                'base': market['baseAssetPrecision'],
                'quote': market['quotePrecision'],
                'amount': market['baseAssetPrecision'],
                'price': market['quotePrecision'],
            };
            let active = (market['status'] === 'TRADING');
            // lot size is deprecated as of 2018.02.06
            let lot = -1 * Math.log10 (precision['amount']);
            let entry = {
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'info': market,
                'lot': lot, // lot size is deprecated as of 2018.02.06
                'active': active,
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': Math.pow (10, -precision['amount']),
                        'max': undefined,
                    },
                    'price': {
                        'min': Math.pow (10, -precision['price']),
                        'max': undefined,
                    },
                    'cost': {
                        'min': lot,
                        'max': undefined,
                    },
                },
            };
            if ('PRICE_FILTER' in filters) {
                let filter = filters['PRICE_FILTER'];
                entry['precision']['price'] = this.precisionFromString (filter['tickSize']);
                entry['limits']['price'] = {
                    'min': this.safeFloat (filter, 'minPrice'),
                    'max': this.safeFloat (filter, 'maxPrice'),
                };
            }
            if ('LOT_SIZE' in filters) {
                let filter = filters['LOT_SIZE'];
                entry['precision']['amount'] = this.precisionFromString (filter['stepSize']);
                entry['lot'] = this.safeFloat (filter, 'stepSize'); // lot size is deprecated as of 2018.02.06
                entry['limits']['amount'] = {
                    'min': this.safeFloat (filter, 'minQty'),
                    'max': this.safeFloat (filter, 'maxQty'),
                };
            }
            if ('MIN_NOTIONAL' in filters) {
                entry['limits']['cost']['min'] = parseFloat (filters['MIN_NOTIONAL']['minNotional']);
            }
            result.push (entry);
        }
        return result;
    }

    calculateFee (symbol, type, side, amount, price, takerOrMaker = 'taker', params = {}) {
        let market = this.markets[symbol];
        let key = 'quote';
        let rate = market[takerOrMaker];
        let cost = parseFloat (this.costToPrecision (symbol, amount * rate));
        if (side === 'sell') {
            cost *= price;
        } else {
            key = 'base';
        }
        return {
            'type': takerOrMaker,
            'currency': market[key],
            'rate': rate,
            'cost': parseFloat (this.feeToPrecision (symbol, cost)),
        };
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let response = await this.privateGetAccount (params);
        let result = { 'info': response };
        let balances = response['balances'];
        for (let i = 0; i < balances.length; i++) {
            let balance = balances[i];
            let currency = balance['asset'];
            if (currency in this.currencies_by_id)
                currency = this.currencies_by_id[currency]['code'];
            let account = {
                'free': parseFloat (balance['free']),
                'used': parseFloat (balance['locked']),
                'total': 0.0,
            };
            account['total'] = this.sum (account['free'], account['used']);
            result[currency] = account;
        }
        return this.parseBalance (result);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        if (typeof limit !== 'undefined')
            request['limit'] = limit; // default = maximum = 100
        let response = await this.publicGetDepth (this.extend (request, params));
        let orderbook = this.parseOrderBook (response);
        orderbook['nonce'] = this.safeInteger (response, 'lastUpdateId');
        return orderbook;
    }

    parseTicker (ticker, market = undefined) {
        let timestamp = this.safeInteger (ticker, 'closeTime');
        let iso8601 = (typeof timestamp === 'undefined') ? undefined : this.iso8601 (timestamp);
        let symbol = this.findSymbol (this.safeString (ticker, 'symbol'), market);
        let last = this.safeFloat (ticker, 'lastPrice');
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': iso8601,
            'high': this.safeFloat (ticker, 'highPrice'),
            'low': this.safeFloat (ticker, 'lowPrice'),
            'bid': this.safeFloat (ticker, 'bidPrice'),
            'bidVolume': this.safeFloat (ticker, 'bidQty'),
            'ask': this.safeFloat (ticker, 'askPrice'),
            'askVolume': this.safeFloat (ticker, 'askQty'),
            'vwap': this.safeFloat (ticker, 'weightedAvgPrice'),
            'open': this.safeFloat (ticker, 'openPrice'),
            'close': last,
            'last': last,
            'previousClose': this.safeFloat (ticker, 'prevClosePrice'), // previous day close
            'change': this.safeFloat (ticker, 'priceChange'),
            'percentage': this.safeFloat (ticker, 'priceChangePercent'),
            'average': undefined,
            'baseVolume': this.safeFloat (ticker, 'volume'),
            'quoteVolume': this.safeFloat (ticker, 'quoteVolume'),
            'info': ticker,
        };
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let response = await this.publicGetTicker24hr (this.extend ({
            'symbol': market['id'],
        }, params));
        return this.parseTicker (response, market);
    }

    parseTickers (rawTickers, symbols = undefined) {
        let tickers = [];
        for (let i = 0; i < rawTickers.length; i++) {
            tickers.push (this.parseTicker (rawTickers[i]));
        }
        return this.filterByArray (tickers, 'symbol', symbols);
    }

    async fetchBidsAsks (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let rawTickers = await this.publicGetTickerBookTicker (params);
        return this.parseTickers (rawTickers, symbols);
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let rawTickers = await this.publicGetTicker24hr (params);
        return this.parseTickers (rawTickers, symbols);
    }

    parseOHLCV (ohlcv, market = undefined, timeframe = '1m', since = undefined, limit = undefined) {
        return [
            ohlcv[0],
            parseFloat (ohlcv[1]),
            parseFloat (ohlcv[2]),
            parseFloat (ohlcv[3]),
            parseFloat (ohlcv[4]),
            parseFloat (ohlcv[5]),
        ];
    }

    async fetchOHLCV (symbol, timeframe = '1m', since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
            'interval': this.timeframes[timeframe],
        };
        if (typeof since !== 'undefined')
            request['startTime'] = since;
        if (typeof limit !== 'undefined')
            request['limit'] = limit; // default == max == 500
        let response = await this.publicGetKlines (this.extend (request, params));
        return this.parseOHLCVs (response, market, timeframe, since, limit);
    }

    parseTrade (trade, market = undefined) {
        let timestampField = ('T' in trade) ? 'T' : 'time';
        let timestamp = this.safeInteger (trade, timestampField);
        let priceField = ('p' in trade) ? 'p' : 'price';
        let price = this.safeFloat (trade, priceField);
        let amountField = ('q' in trade) ? 'q' : 'qty';
        let amount = this.safeFloat (trade, amountField);
        let idField = ('a' in trade) ? 'a' : 'id';
        let id = this.safeString (trade, idField);
        let side = undefined;
        let order = undefined;
        if ('orderId' in trade)
            order = this.safeString (trade, 'orderId');
        if ('m' in trade) {
            side = trade['m'] ? 'sell' : 'buy'; // this is reversed intentionally
        } else {
            if ('isBuyer' in trade)
                side = (trade['isBuyer']) ? 'buy' : 'sell'; // this is a true side
        }
        let fee = undefined;
        if ('commission' in trade) {
            fee = {
                'cost': this.safeFloat (trade, 'commission'),
                'currency': this.commonCurrencyCode (trade['commissionAsset']),
            };
        }
        let takerOrMaker = undefined;
        if ('isMaker' in trade)
            takerOrMaker = trade['isMaker'] ? 'maker' : 'taker';
        return {
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': market['symbol'],
            'id': id,
            'order': order,
            'type': undefined,
            'takerOrMaker': takerOrMaker,
            'side': side,
            'price': price,
            'cost': price * amount,
            'amount': amount,
            'fee': fee,
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        if (typeof since !== 'undefined') {
            request['startTime'] = since;
            request['endTime'] = since + 3600000;
        }
        if (typeof limit !== 'undefined')
            request['limit'] = limit;
        // 'fromId': 123,    // ID to get aggregate trades from INCLUSIVE.
        // 'startTime': 456, // Timestamp in ms to get aggregate trades from INCLUSIVE.
        // 'endTime': 789,   // Timestamp in ms to get aggregate trades until INCLUSIVE.
        // 'limit': 500,     // default = maximum = 500
        let response = await this.publicGetAggTrades (this.extend (request, params));
        return this.parseTrades (response, market, since, limit);
    }

    parseOrderStatus (status) {
        let statuses = {
            'NEW': 'open',
            'PARTIALLY_FILLED': 'open',
            'FILLED': 'closed',
            'CANCELED': 'canceled',
        };
        return (status in statuses) ? statuses[status] : status.toLowerCase ();
    }

    parseOrder (order, market = undefined) {
        let status = this.safeValue (order, 'status');
        if (typeof status !== 'undefined')
            status = this.parseOrderStatus (status);
        let symbol = this.findSymbol (this.safeString (order, 'symbol'), market);
        let timestamp = undefined;
        if ('time' in order)
            timestamp = order['time'];
        else if ('transactTime' in order)
            timestamp = order['transactTime'];
        let iso8601 = undefined;
        if (typeof timestamp !== 'undefined')
            iso8601 = this.iso8601 (timestamp);
        let price = this.safeFloat (order, 'price');
        let amount = this.safeFloat (order, 'origQty');
        let filled = this.safeFloat (order, 'executedQty');
        let remaining = undefined;
        let cost = undefined;
        if (typeof filled !== 'undefined') {
            if (typeof amount !== 'undefined') {
                remaining = amount - filled;
                if (this.options['parseOrderToPrecision']) {
                    remaining = parseFloat (this.amountToPrecision (symbol, remaining));
                }
                remaining = Math.max (remaining, 0.0);
            }
            if (typeof price !== 'undefined') {
                cost = price * filled;
            }
        }
        let id = this.safeString (order, 'orderId');
        let type = this.safeString (order, 'type');
        if (typeof type !== 'undefined')
            type = type.toLowerCase ();
        let side = this.safeString (order, 'side');
        if (typeof side !== 'undefined')
            side = side.toLowerCase ();
        let fee = undefined;
        let trades = undefined;
        const fills = this.safeValue (order, 'fills');
        if (typeof fills !== 'undefined') {
            trades = this.parseTrades (fills, market);
            let numTrades = trades.length;
            if (numTrades > 0) {
                cost = trades[0]['cost'];
                fee = {
                    'cost': trades[0]['fee']['cost'],
                    'currency': trades[0]['fee']['currency'],
                };
                for (let i = 1; i < trades.length; i++) {
                    cost = this.sum (cost, trades[i]['cost']);
                    fee['cost'] = this.sum (fee['cost'], trades[i]['fee']['cost']);
                }
                if (cost && filled)
                    price = cost / filled;
            }
        }
        if (typeof cost !== 'undefined') {
            if (this.options['parseOrderToPrecision']) {
                cost = parseFloat (this.costToPrecision (symbol, cost));
            }
        }
        let result = {
            'info': order,
            'id': id,
            'timestamp': timestamp,
            'datetime': iso8601,
            'lastTradeTimestamp': undefined,
            'symbol': symbol,
            'type': type,
            'side': side,
            'price': price,
            'amount': amount,
            'cost': cost,
            'filled': filled,
            'remaining': remaining,
            'status': status,
            'fee': fee,
            'trades': trades,
        };
        return result;
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        // the next 5 lines are added to support for testing orders
        let method = 'privatePostOrder';
        let test = this.safeValue (params, 'test', false);
        if (test) {
            method += 'Test';
            params = this.omit (params, 'test');
        }
        let uppercaseType = type.toUpperCase ();
        let order = {
            'symbol': market['id'],
            'quantity': this.amountToString (symbol, amount),
            'type': uppercaseType,
            'side': side.toUpperCase (),
            'newOrderRespType': this.options['newOrderRespType'], // 'ACK' for order id, 'RESULT' for full order or 'FULL' for order with fills
        };
        let timeInForceIsRequired = false;
        let priceIsRequired = false;
        let stopPriceIsRequired = false;
        if (uppercaseType === 'LIMIT') {
            priceIsRequired = true;
            timeInForceIsRequired = true;
        } else if ((uppercaseType === 'STOP_LOSS') || (uppercaseType === 'TAKE_PROFIT')) {
            stopPriceIsRequired = true;
        } else if ((uppercaseType === 'STOP_LOSS_LIMIT') || (uppercaseType === 'TAKE_PROFIT_LIMIT')) {
            stopPriceIsRequired = true;
            priceIsRequired = true;
            timeInForceIsRequired = true;
        } else if (uppercaseType === 'LIMIT_MAKER') {
            priceIsRequired = true;
        }
        if (priceIsRequired) {
            if (typeof price === 'undefined')
                throw new InvalidOrder (this.id + ' createOrder method requires a price argument for a ' + type + ' order');
            order['price'] = this.priceToPrecision (symbol, price);
        }
        if (timeInForceIsRequired) {
            order['timeInForce'] = this.options['defaultTimeInForce']; // 'GTC' = Good To Cancel (default), 'IOC' = Immediate Or Cancel
        }
        if (stopPriceIsRequired) {
            let stopPrice = this.safeFloat (params, 'stopPrice');
            if (typeof stopPrice === 'undefined') {
                throw new InvalidOrder (this.id + ' createOrder method requires a stopPrice extra param for a ' + type + ' order');
            } else {
                order['stopPrice'] = this.priceToPrecision (symbol, stopPrice);
            }
        }
        let response = await this[method] (this.extend (order, params));
        return this.parseOrder (response, market);
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        if (typeof symbol === 'undefined')
            throw new ExchangeError (this.id + ' fetchOrder requires a symbol argument');
        await this.loadMarkets ();
        let market = this.market (symbol);
        let origClientOrderId = this.safeValue (params, 'origClientOrderId');
        let request = {
            'symbol': market['id'],
        };
        if (typeof origClientOrderId !== 'undefined')
            request['origClientOrderId'] = origClientOrderId;
        else
            request['orderId'] = parseInt (id);
        let response = await this.privateGetOrder (this.extend (request, params));
        return this.parseOrder (response, market);
    }

    async fetchOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        if (typeof symbol === 'undefined')
            throw new ExchangeError (this.id + ' fetchOrders requires a symbol argument');
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        if (typeof limit !== 'undefined')
            request['limit'] = limit;
        let response = await this.privateGetAllOrders (this.extend (request, params));
        return this.parseOrders (response, market, since, limit);
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        let request = {};
        if (typeof symbol !== 'undefined') {
            market = this.market (symbol);
            request['symbol'] = market['id'];
        } else if (this.options['warnOnFetchOpenOrdersWithoutSymbol']) {
            let symbols = this.symbols;
            let numSymbols = symbols.length;
            let fetchOpenOrdersRateLimit = parseInt (numSymbols / 2);
            throw new ExchangeError (this.id + ' fetchOpenOrders WARNING: fetching open orders without specifying a symbol is rate-limited to one call per ' + fetchOpenOrdersRateLimit.toString () + ' seconds. Do not call this method frequently to avoid ban. Set ' + this.id + '.options["warnOnFetchOpenOrdersWithoutSymbol"] = false to suppress this warning message.');
        }
        let response = await this.privateGetOpenOrders (this.extend (request, params));
        return this.parseOrders (response, market, since, limit);
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let orders = await this.fetchOrders (symbol, since, limit, params);
        return this.filterBy (orders, 'status', 'closed');
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        if (typeof symbol === 'undefined')
            throw new ExchangeError (this.id + ' cancelOrder requires a symbol argument');
        await this.loadMarkets ();
        let market = this.market (symbol);
        let response = await this.privateDeleteOrder (this.extend ({
            'symbol': market['id'],
            'orderId': parseInt (id),
            // 'origClientOrderId': id,
        }, params));
        return this.parseOrder (response);
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        if (typeof symbol === 'undefined')
            throw new ExchangeError (this.id + ' fetchMyTrades requires a symbol argument');
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        if (typeof limit !== 'undefined')
            request['limit'] = limit;
        let response = await this.privateGetMyTrades (this.extend (request, params));
        return this.parseTrades (response, market, since, limit);
    }

    async fetchDepositAddress (code, params = {}) {
        await this.loadMarkets ();
        let currency = this.currency (code);
        let response = await this.wapiGetDepositAddress (this.extend ({
            'asset': currency['id'],
        }, params));
        if ('success' in response) {
            if (response['success']) {
                let address = this.safeString (response, 'address');
                let tag = this.safeString (response, 'addressTag');
                return {
                    'currency': code,
                    'address': this.checkAddress (address),
                    'tag': tag,
                    'info': response,
                };
            }
        }
    }

    async fetchFundingFees (codes = undefined, params = {}) {
        //  by default it will try load withdrawal fees of all currencies (with separate requests)
        //  however if you define codes = [ 'ETH', 'BTC' ] in args it will only load those
        await this.loadMarkets ();
        let withdrawFees = {};
        let info = {};
        if (typeof codes === 'undefined')
            codes = Object.keys (this.currencies);
        for (let i = 0; i < codes.length; i++) {
            let code = codes[i];
            let currency = this.currency (code);
            let response = await this.wapiGetWithdrawFee ({
                'asset': currency['id'],
            });
            withdrawFees[code] = this.safeFloat (response, 'withdrawFee');
            info[code] = response;
        }
        return {
            'withdraw': withdrawFees,
            'deposit': {},
            'info': info,
        };
    }

    async withdraw (code, amount, address, tag = undefined, params = {}) {
        this.checkAddress (address);
        await this.loadMarkets ();
        let currency = this.currency (code);
        let name = address.slice (0, 20);
        let request = {
            'asset': currency['id'],
            'address': address,
            'amount': parseFloat (amount),
            'name': name,
        };
        if (tag)
            request['addressTag'] = tag;
        let response = await this.wapiPostWithdraw (this.extend (request, params));
        return {
            'info': response,
            'id': this.safeString (response, 'id'),
        };
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'][api];
        url += '/' + path;
        if (api === 'wapi')
            url += '.html';
        // v1 special case for userDataStream
        if (path === 'userDataStream') {
            body = this.urlencode (params);
            headers = {
                'X-MBX-APIKEY': this.apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
            };
        } else if ((api === 'private') || (api === 'wapi')) {
            this.checkRequiredCredentials ();
            let query = this.urlencode (this.extend ({
                'timestamp': this.nonce (),
                'recvWindow': this.options['recvWindow'],
            }, params));
            let signature = this.hmac (this.encode (query), this.encode (this.secret));
            query += '&' + 'signature=' + signature;
            headers = {
                'X-MBX-APIKEY': this.apiKey,
            };
            if ((method === 'GET') || (method === 'DELETE') || (api === 'wapi')) {
                url += '?' + query;
            } else {
                body = query;
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
        } else {
            if (Object.keys (params).length)
                url += '?' + this.urlencode (params);
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (code, reason, url, method, headers, body) {
        if ((code === 418) || (code === 429))
            throw new DDoSProtection (this.id + ' ' + code.toString () + ' ' + reason + ' ' + body);
        // error response in a form: { "code": -1013, "msg": "Invalid quantity." }
        // following block cointains legacy checks against message patterns in "msg" property
        // will switch "code" checks eventually, when we know all of them
        if (code >= 400) {
            if (body.indexOf ('Price * QTY is zero or less') >= 0)
                throw new InvalidOrder (this.id + ' order cost = amount * price is zero or less ' + body);
            if (body.indexOf ('LOT_SIZE') >= 0)
                throw new InvalidOrder (this.id + ' order amount should be evenly divisible by lot size, use this.amountToLots (symbol, amount) ' + body);
            if (body.indexOf ('PRICE_FILTER') >= 0)
                throw new InvalidOrder (this.id + ' order price exceeds allowed price precision or invalid, use this.priceToPrecision (symbol, amount) ' + body);
        }
        if (body.length > 0) {
            if (body[0] === '{') {
                let response = JSON.parse (body);
                // check success value for wapi endpoints
                // response in format {'msg': 'The coin does not exist.', 'success': true/false}
                let success = this.safeValue (response, 'success', true);
                if (!success) {
                    if ('msg' in response)
                        try {
                            response = JSON.parse (response['msg']);
                        } catch (e) {
                            response = {};
                        }
                }
                // checks against error codes
                let error = this.safeString (response, 'code');
                if (typeof error !== 'undefined') {
                    const exceptions = this.exceptions;
                    if (error in exceptions) {
                        // a workaround for {"code":-2015,"msg":"Invalid API-key, IP, or permissions for action."}
                        // despite that their message is very confusing, it is raised by Binance
                        // on a temporary ban (the API key is valid, but disabled for a while)
                        if ((error === '-2015') && this.options['hasAlreadyAuthenticatedSuccessfully']) {
                            throw new DDoSProtection (this.id + ' temporary banned: ' + body);
                        }
                        const message = this.safeString (response, 'msg');
                        if (message === 'Order would trigger immediately.') {
                            throw new InvalidOrder (this.id + ' ' + body);
                        } else if (message === 'Account has insufficient balance for requested action.') {
                            throw new InsufficientFunds (this.id + ' ' + body);
                        } else if (message === 'Rest API trading is not enabled.') {
                            throw new ExchangeNotAvailable (this.id + ' ' + body);
                        }
                        throw new exceptions[error] (this.id + ' ' + body);
                    } else {
                        throw new ExchangeError (this.id + ': unknown error code: ' + body + ' ' + error);
                    }
                }
                if (!success) {
                    throw new ExchangeError (this.id + ': success value false: ' + body);
                }
            }
        }
    }

    async request (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let response = await this.fetch2 (path, api, method, params, headers, body);
        // a workaround for {"code":-2015,"msg":"Invalid API-key, IP, or permissions for action."}
        if ((api === 'private') || (api === 'wapi'))
            this.options['hasAlreadyAuthenticatedSuccessfully'] = true;
        return response;
    }
};

},{"./base/Exchange":3,"./base/errors":5}],18:[function(require,module,exports){
'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError, DDoSProtection, OrderNotFound, AuthenticationError, PermissionDenied } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class bitmex extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'bitmex',
            'name': 'BitMEX',
            'countries': [ 'SC' ], // Seychelles
            'version': 'v1',
            'userAgent': undefined,
            'rateLimit': 2000,
            'has': {
                'CORS': false,
                'fetchOHLCV': true,
                'withdraw': true,
                'editOrder': true,
                'fetchOrder': true,
                'fetchOrders': true,
                'fetchOpenOrders': true,
                'fetchClosedOrders': true,
            },
            'timeframes': {
                '1m': '1m',
                '5m': '5m',
                '1h': '1h',
                '1d': '1d',
            },
            'urls': {
                'test': 'https://testnet.bitmex.com',
                'logo': 'https://user-images.githubusercontent.com/1294454/27766319-f653c6e6-5ed4-11e7-933d-f0bc3699ae8f.jpg',
                'api': 'https://www.bitmex.com',
                'www': 'https://www.bitmex.com',
                'doc': [
                    'https://www.bitmex.com/app/apiOverview',
                    'https://github.com/BitMEX/api-connectors/tree/master/official-http',
                ],
                'fees': 'https://www.bitmex.com/app/fees',
                'referral': 'https://www.bitmex.com/register/rm3C16',
            },
            'api': {
                'public': {
                    'get': [
                        'announcement',
                        'announcement/urgent',
                        'funding',
                        'instrument',
                        'instrument/active',
                        'instrument/activeAndIndices',
                        'instrument/activeIntervals',
                        'instrument/compositeIndex',
                        'instrument/indices',
                        'insurance',
                        'leaderboard',
                        'liquidation',
                        'orderBook',
                        'orderBook/L2',
                        'quote',
                        'quote/bucketed',
                        'schema',
                        'schema/websocketHelp',
                        'settlement',
                        'stats',
                        'stats/history',
                        'trade',
                        'trade/bucketed',
                    ],
                },
                'private': {
                    'get': [
                        'apiKey',
                        'chat',
                        'chat/channels',
                        'chat/connected',
                        'execution',
                        'execution/tradeHistory',
                        'notification',
                        'order',
                        'position',
                        'user',
                        'user/affiliateStatus',
                        'user/checkReferralCode',
                        'user/commission',
                        'user/depositAddress',
                        'user/margin',
                        'user/minWithdrawalFee',
                        'user/wallet',
                        'user/walletHistory',
                        'user/walletSummary',
                    ],
                    'post': [
                        'apiKey',
                        'apiKey/disable',
                        'apiKey/enable',
                        'chat',
                        'order',
                        'order/bulk',
                        'order/cancelAllAfter',
                        'order/closePosition',
                        'position/isolate',
                        'position/leverage',
                        'position/riskLimit',
                        'position/transferMargin',
                        'user/cancelWithdrawal',
                        'user/confirmEmail',
                        'user/confirmEnableTFA',
                        'user/confirmWithdrawal',
                        'user/disableTFA',
                        'user/logout',
                        'user/logoutAll',
                        'user/preferences',
                        'user/requestEnableTFA',
                        'user/requestWithdrawal',
                    ],
                    'put': [
                        'order',
                        'order/bulk',
                        'user',
                    ],
                    'delete': [
                        'apiKey',
                        'order',
                        'order/all',
                    ],
                },
            },
            'exceptions': {
                'Invalid API Key.': AuthenticationError,
                'Access Denied': PermissionDenied,
            },
            'options': {
                'fetchTickerQuotes': false,
            },
        });
    }

    async fetchMarkets () {
        let markets = await this.publicGetInstrumentActiveAndIndices ();
        let result = [];
        for (let p = 0; p < markets.length; p++) {
            let market = markets[p];
            let active = (market['state'] !== 'Unlisted');
            let id = market['symbol'];
            let base = market['underlying'];
            let quote = market['quoteCurrency'];
            let type = undefined;
            let future = false;
            let prediction = false;
            let basequote = base + quote;
            base = this.commonCurrencyCode (base);
            quote = this.commonCurrencyCode (quote);
            let swap = (id === basequote);
            let symbol = id;
            if (swap) {
                type = 'swap';
                symbol = base + '/' + quote;
            } else if (id.indexOf ('B_') >= 0) {
                prediction = true;
                type = 'prediction';
            } else {
                future = true;
                type = 'future';
            }
            let precision = {
                'amount': undefined,
                'price': undefined,
            };
            if (market['lotSize'])
                precision['amount'] = this.precisionFromString (this.truncate_to_string (market['lotSize'], 16));
            if (market['tickSize'])
                precision['price'] = this.precisionFromString (this.truncate_to_string (market['tickSize'], 16));
            result.push ({
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'active': active,
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': market['lotSize'],
                        'max': market['maxOrderQty'],
                    },
                    'price': {
                        'min': market['tickSize'],
                        'max': market['maxPrice'],
                    },
                },
                'taker': market['takerFee'],
                'maker': market['makerFee'],
                'type': type,
                'spot': false,
                'swap': swap,
                'future': future,
                'prediction': prediction,
                'info': market,
            });
        }
        return result;
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let response = await this.privateGetUserMargin ({ 'currency': 'all' });
        let result = { 'info': response };
        for (let b = 0; b < response.length; b++) {
            let balance = response[b];
            let currency = balance['currency'].toUpperCase ();
            currency = this.commonCurrencyCode (currency);
            let account = {
                'free': balance['availableMargin'],
                'used': 0.0,
                'total': balance['marginBalance'],
            };
            if (currency === 'BTC') {
                account['free'] = account['free'] * 0.00000001;
                account['total'] = account['total'] * 0.00000001;
            }
            account['used'] = account['total'] - account['free'];
            result[currency] = account;
        }
        return this.parseBalance (result);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        if (typeof limit !== 'undefined')
            request['depth'] = limit;
        let orderbook = await this.publicGetOrderBookL2 (this.extend (request, params));
        let result = {
            'bids': [],
            'asks': [],
            'timestamp': undefined,
            'datetime': undefined,
            'nonce': undefined,
        };
        for (let o = 0; o < orderbook.length; o++) {
            let order = orderbook[o];
            let side = (order['side'] === 'Sell') ? 'asks' : 'bids';
            let amount = order['size'];
            let price = order['price'];
            result[side].push ([ price, amount ]);
        }
        result['bids'] = this.sortBy (result['bids'], 0, true);
        result['asks'] = this.sortBy (result['asks'], 0);
        return result;
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        let filter = { 'filter': { 'orderID': id }};
        let result = await this.fetchOrders (symbol, undefined, undefined, this.deepExtend (filter, params));
        let numResults = result.length;
        if (numResults === 1)
            return result[0];
        throw new OrderNotFound (this.id + ': The order ' + id + ' not found.');
    }

    async fetchOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        let request = {};
        if (typeof symbol !== 'undefined') {
            market = this.market (symbol);
            request['symbol'] = market['id'];
        }
        if (typeof since !== 'undefined')
            request['startTime'] = this.iso8601 (since);
        if (typeof limit !== 'undefined')
            request['count'] = limit;
        request = this.deepExtend (request, params);
        // why the hassle? urlencode in python is kinda broken for nested dicts.
        // E.g. self.urlencode({"filter": {"open": True}}) will return "filter={'open':+True}"
        // Bitmex doesn't like that. Hence resorting to this hack.
        if ('filter' in request)
            request['filter'] = this.json (request['filter']);
        let response = await this.privateGetOrder (request);
        return this.parseOrders (response, market, since, limit);
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let filter_params = { 'filter': { 'open': true }};
        return await this.fetchOrders (symbol, since, limit, this.deepExtend (filter_params, params));
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        // Bitmex barfs if you set 'open': false in the filter...
        let orders = await this.fetchOrders (symbol, since, limit, params);
        return this.filterBy (orders, 'status', 'closed');
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        if (!market['active'])
            throw new ExchangeError (this.id + ': symbol ' + symbol + ' is delisted');
        let request = this.extend ({
            'symbol': market['id'],
            'binSize': '1d',
            'partial': true,
            'count': 1,
            'reverse': true,
        }, params);
        let bid = undefined;
        let ask = undefined;
        if (this.options['fetchTickerQuotes']) {
            let quotes = await this.publicGetQuoteBucketed (request);
            let quotesLength = quotes.length;
            let quote = quotes[quotesLength - 1];
            bid = this.safeFloat (quote, 'bidPrice');
            ask = this.safeFloat (quote, 'askPrice');
        }
        let tickers = await this.publicGetTradeBucketed (request);
        let ticker = tickers[0];
        let timestamp = this.milliseconds ();
        let open = this.safeFloat (ticker, 'open');
        let close = this.safeFloat (ticker, 'close');
        let change = close - open;
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'high'),
            'low': this.safeFloat (ticker, 'low'),
            'bid': bid,
            'bidVolume': undefined,
            'ask': ask,
            'askVolume': undefined,
            'vwap': this.safeFloat (ticker, 'vwap'),
            'open': open,
            'close': close,
            'last': close,
            'previousClose': undefined,
            'change': change,
            'percentage': change / open * 100,
            'average': this.sum (open, close) / 2,
            'baseVolume': this.safeFloat (ticker, 'homeNotional'),
            'quoteVolume': this.safeFloat (ticker, 'foreignNotional'),
            'info': ticker,
        };
    }

    parseOHLCV (ohlcv, market = undefined, timeframe = '1m', since = undefined, limit = undefined) {
        let timestamp = this.parse8601 (ohlcv['timestamp']) - this.parseTimeframe (timeframe) * 1000;
        return [
            timestamp,
            ohlcv['open'],
            ohlcv['high'],
            ohlcv['low'],
            ohlcv['close'],
            ohlcv['volume'],
        ];
    }

    async fetchOHLCV (symbol, timeframe = '1m', since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        // send JSON key/value pairs, such as {"key": "value"}
        // filter by individual fields and do advanced queries on timestamps
        // let filter = { 'key': 'value' };
        // send a bare series (e.g. XBU) to nearest expiring contract in that series
        // you can also send a timeframe, e.g. XBU:monthly
        // timeframes: daily, weekly, monthly, quarterly, and biquarterly
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
            'binSize': this.timeframes[timeframe],
            'partial': true,     // true == include yet-incomplete current bins
            // 'filter': filter, // filter by individual fields and do advanced queries
            // 'columns': [],    // will return all columns if omitted
            // 'start': 0,       // starting point for results (wtf?)
            // 'reverse': false, // true == newest first
            // 'endTime': '',    // ending date filter for results
        };
        if (typeof limit !== 'undefined')
            request['count'] = limit; // default 100, max 500
        // if since is not set, they will return candles starting from 2017-01-01
        if (typeof since !== 'undefined') {
            let ymdhms = this.ymdhms (since);
            let ymdhm = ymdhms.slice (0, 16);
            request['startTime'] = ymdhm; // starting date filter for results
        }
        let response = await this.publicGetTradeBucketed (this.extend (request, params));
        return this.parseOHLCVs (response, market, timeframe, since, limit);
    }

    parseTrade (trade, market = undefined) {
        let timestamp = this.parse8601 (trade['timestamp']);
        let symbol = undefined;
        if (typeof market === 'undefined') {
            if ('symbol' in trade)
                market = this.markets_by_id[trade['symbol']];
        }
        if (market)
            symbol = market['symbol'];
        return {
            'id': trade['trdMatchID'],
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'order': undefined,
            'type': undefined,
            'side': trade['side'].toLowerCase (),
            'price': trade['price'],
            'amount': trade['size'],
        };
    }

    parseOrderStatus (status) {
        let statuses = {
            'new': 'open',
            'partiallyfilled': 'open',
            'filled': 'closed',
            'canceled': 'canceled',
            'rejected': 'rejected',
            'expired': 'expired',
        };
        return this.safeString (statuses, status.toLowerCase ());
    }

    parseOrder (order, market = undefined) {
        let status = this.safeValue (order, 'ordStatus');
        if (typeof status !== 'undefined')
            status = this.parseOrderStatus (status);
        let symbol = undefined;
        if (typeof market !== 'undefined') {
            symbol = market['symbol'];
        } else {
            let id = order['symbol'];
            if (id in this.markets_by_id) {
                market = this.markets_by_id[id];
                symbol = market['symbol'];
            }
        }
        let datetime_value = undefined;
        let timestamp = undefined;
        let iso8601 = undefined;
        if ('timestamp' in order)
            datetime_value = order['timestamp'];
        else if ('transactTime' in order)
            datetime_value = order['transactTime'];
        if (typeof datetime_value !== 'undefined') {
            timestamp = this.parse8601 (datetime_value);
            iso8601 = this.iso8601 (timestamp);
        }
        let price = this.safeFloat (order, 'price');
        let amount = this.safeFloat (order, 'orderQty');
        let filled = this.safeFloat (order, 'cumQty', 0.0);
        let remaining = undefined;
        if (typeof amount !== 'undefined') {
            if (typeof filled !== 'undefined') {
                remaining = Math.max (amount - filled, 0.0);
            }
        }
        let cost = undefined;
        if (typeof price !== 'undefined')
            if (typeof filled !== 'undefined')
                cost = price * filled;
        let result = {
            'info': order,
            'id': order['orderID'].toString (),
            'timestamp': timestamp,
            'datetime': iso8601,
            'lastTradeTimestamp': undefined,
            'symbol': symbol,
            'type': order['ordType'].toLowerCase (),
            'side': order['side'].toLowerCase (),
            'price': price,
            'amount': amount,
            'cost': cost,
            'filled': filled,
            'remaining': remaining,
            'status': status,
            'fee': undefined,
        };
        return result;
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        if (typeof since !== 'undefined')
            request['startTime'] = this.iso8601 (since);
        if (typeof limit !== 'undefined')
            request['count'] = limit;
        let response = await this.publicGetTrade (this.extend (request, params));
        return this.parseTrades (response, market);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {
            'symbol': this.marketId (symbol),
            'side': this.capitalize (side),
            'orderQty': amount,
            'ordType': this.capitalize (type),
        };
        if (typeof price !== 'undefined')
            request['price'] = price;
        let response = await this.privatePostOrder (this.extend (request, params));
        let order = this.parseOrder (response);
        let id = order['id'];
        this.orders[id] = order;
        return this.extend ({ 'info': response }, order);
    }

    async editOrder (id, symbol, type, side, amount = undefined, price = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {
            'orderID': id,
        };
        if (typeof amount !== 'undefined')
            request['orderQty'] = amount;
        if (typeof price !== 'undefined')
            request['price'] = price;
        let response = await this.privatePutOrder (this.extend (request, params));
        let order = this.parseOrder (response);
        this.orders[order['id']] = order;
        return this.extend ({ 'info': response }, order);
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let response = await this.privateDeleteOrder (this.extend ({ 'orderID': id }, params));
        let order = response[0];
        let error = this.safeString (order, 'error');
        if (typeof error !== 'undefined')
            if (error.indexOf ('Unable to cancel order due to existing state') >= 0)
                throw new OrderNotFound (this.id + ' cancelOrder() failed: ' + error);
        order = this.parseOrder (order);
        this.orders[order['id']] = order;
        return this.extend ({ 'info': response }, order);
    }

    isFiat (currency) {
        if (currency === 'EUR')
            return true;
        if (currency === 'PLN')
            return true;
        return false;
    }

    async withdraw (currency, amount, address, tag = undefined, params = {}) {
        this.checkAddress (address);
        await this.loadMarkets ();
        if (currency !== 'BTC')
            throw new ExchangeError (this.id + ' supoprts BTC withdrawals only, other currencies coming soon...');
        let request = {
            'currency': 'XBt', // temporarily
            'amount': amount,
            'address': address,
            // 'otpToken': '123456', // requires if two-factor auth (OTP) is enabled
            // 'fee': 0.001, // bitcoin network fee
        };
        let response = await this.privatePostUserRequestWithdrawal (this.extend (request, params));
        return {
            'info': response,
            'id': response['transactID'],
        };
    }

    handleErrors (code, reason, url, method, headers, body) {
        if (code === 429)
            throw new DDoSProtection (this.id + ' ' + body);
        if (code >= 400) {
            if (body) {
                if (body[0] === '{') {
                    let response = JSON.parse (body);
                    if ('error' in response) {
                        if ('message' in response['error']) {
                            let feedback = this.id + ' ' + this.json (response);
                            let message = this.safeValue (response['error'], 'message');
                            let exceptions = this.exceptions;
                            if (typeof message !== 'undefined') {
                                if (message in exceptions) {
                                    throw new exceptions[message] (feedback);
                                }
                            }
                            throw new ExchangeError (feedback);
                        }
                    }
                }
            }
        }
    }

    nonce () {
        return this.milliseconds ();
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let query = '/api' + '/' + this.version + '/' + path;
        if (method !== 'PUT')
            if (Object.keys (params).length)
                query += '?' + this.urlencode (params);
        let url = this.urls['api'] + query;
        if (api === 'private') {
            this.checkRequiredCredentials ();
            let nonce = this.nonce ().toString ();
            let auth = method + query + nonce;
            if (method === 'POST' || method === 'PUT') {
                if (Object.keys (params).length) {
                    body = this.json (params);
                    auth += body;
                }
            }
            headers = {
                'Content-Type': 'application/json',
                'api-nonce': nonce,
                'api-key': this.apiKey,
                'api-signature': this.hmac (this.encode (auth), this.encode (this.secret)),
            };
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }
};

},{"./base/Exchange":3,"./base/errors":5}],19:[function(require,module,exports){
'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError, ExchangeNotAvailable, AuthenticationError, InvalidOrder, InsufficientFunds, OrderNotFound, DDoSProtection, PermissionDenied, AddressPending } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class bittrex extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'bittrex',
            'name': 'Bittrex',
            'countries': [ 'US' ],
            'version': 'v1.1',
            'rateLimit': 1500,
            // new metainfo interface
            'has': {
                'CORS': true,
                'createMarketOrder': false,
                'fetchDepositAddress': true,
                'fetchClosedOrders': true,
                'fetchCurrencies': true,
                'fetchMyTrades': false,
                'fetchOHLCV': true,
                'fetchOrder': true,
                'fetchOpenOrders': true,
                'fetchTickers': true,
                'withdraw': true,
            },
            'timeframes': {
                '1m': 'oneMin',
                '5m': 'fiveMin',
                '30m': 'thirtyMin',
                '1h': 'hour',
                '1d': 'day',
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/27766352-cf0b3c26-5ed5-11e7-82b7-f3826b7a97d8.jpg',
                'api': {
                    'public': 'https://bittrex.com/api',
                    'account': 'https://bittrex.com/api',
                    'market': 'https://bittrex.com/api',
                    'v2': 'https://bittrex.com/api/v2.0/pub',
                },
                'www': 'https://bittrex.com',
                'doc': [
                    'https://bittrex.com/Home/Api',
                    'https://www.npmjs.org/package/node.bittrex.api',
                ],
                'fees': [
                    'https://bittrex.com/Fees',
                    'https://support.bittrex.com/hc/en-us/articles/115000199651-What-fees-does-Bittrex-charge-',
                ],
            },
            'api': {
                'v2': {
                    'get': [
                        'currencies/GetBTCPrice',
                        'market/GetTicks',
                        'market/GetLatestTick',
                        'Markets/GetMarketSummaries',
                        'market/GetLatestTick',
                    ],
                },
                'public': {
                    'get': [
                        'currencies',
                        'markethistory',
                        'markets',
                        'marketsummaries',
                        'marketsummary',
                        'orderbook',
                        'ticker',
                    ],
                },
                'account': {
                    'get': [
                        'balance',
                        'balances',
                        'depositaddress',
                        'deposithistory',
                        'order',
                        'orders',
                        'orderhistory',
                        'withdrawalhistory',
                        'withdraw',
                    ],
                },
                'market': {
                    'get': [
                        'buylimit',
                        'buymarket',
                        'cancel',
                        'openorders',
                        'selllimit',
                        'sellmarket',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'tierBased': false,
                    'percentage': true,
                    'maker': 0.0025,
                    'taker': 0.0025,
                },
                'funding': {
                    'tierBased': false,
                    'percentage': false,
                    'withdraw': {
                        'BTC': 0.001,
                        'LTC': 0.01,
                        'DOGE': 2,
                        'VTC': 0.02,
                        'PPC': 0.02,
                        'FTC': 0.2,
                        'RDD': 2,
                        'NXT': 2,
                        'DASH': 0.002,
                        'POT': 0.002,
                    },
                    'deposit': {
                        'BTC': 0,
                        'LTC': 0,
                        'DOGE': 0,
                        'VTC': 0,
                        'PPC': 0,
                        'FTC': 0,
                        'RDD': 0,
                        'NXT': 0,
                        'DASH': 0,
                        'POT': 0,
                    },
                },
            },
            'exceptions': {
                // 'Call to Cancel was throttled. Try again in 60 seconds.': DDoSProtection,
                // 'Call to GetBalances was throttled. Try again in 60 seconds.': DDoSProtection,
                'APISIGN_NOT_PROVIDED': AuthenticationError,
                'INVALID_SIGNATURE': AuthenticationError,
                'INVALID_CURRENCY': ExchangeError,
                'INVALID_PERMISSION': AuthenticationError,
                'INSUFFICIENT_FUNDS': InsufficientFunds,
                'QUANTITY_NOT_PROVIDED': InvalidOrder,
                'MIN_TRADE_REQUIREMENT_NOT_MET': InvalidOrder,
                'ORDER_NOT_OPEN': OrderNotFound,
                'INVALID_ORDER': InvalidOrder,
                'UUID_INVALID': OrderNotFound,
                'RATE_NOT_PROVIDED': InvalidOrder, // createLimitBuyOrder ('ETH/BTC', 1, 0)
                'WHITELIST_VIOLATION_IP': PermissionDenied,
            },
            'options': {
                // price precision by quote currency code
                'pricePrecisionByCode': {
                    'USD': 3,
                },
                'parseOrderStatus': false,
                'hasAlreadyAuthenticatedSuccessfully': false, // a workaround for APIKEY_INVALID
            },
            'commonCurrencies': {
                'BITS': 'SWIFT',
                'CPC': 'CapriCoin',
            },
        });
    }

    costToPrecision (symbol, cost) {
        return this.truncate (parseFloat (cost), this.markets[symbol]['precision']['price']);
    }

    feeToPrecision (symbol, fee) {
        return this.truncate (parseFloat (fee), this.markets[symbol]['precision']['price']);
    }

    async fetchMarkets () {
        let response = await this.v2GetMarketsGetMarketSummaries ();
        let result = [];
        for (let i = 0; i < response['result'].length; i++) {
            let market = response['result'][i]['Market'];
            let id = market['MarketName'];
            let baseId = market['MarketCurrency'];
            let quoteId = market['BaseCurrency'];
            let base = this.commonCurrencyCode (baseId);
            let quote = this.commonCurrencyCode (quoteId);
            let symbol = base + '/' + quote;
            let pricePrecision = 8;
            if (quote in this.options['pricePrecisionByCode'])
                pricePrecision = this.options['pricePrecisionByCode'][quote];
            let precision = {
                'amount': 8,
                'price': pricePrecision,
            };
            let active = market['IsActive'] || market['IsActive'] === 'true';
            result.push ({
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'active': active,
                'info': market,
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': market['MinTradeSize'],
                        'max': undefined,
                    },
                    'price': {
                        'min': Math.pow (10, -precision['price']),
                        'max': undefined,
                    },
                },
            });
        }
        return result;
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let response = await this.accountGetBalances (params);
        let balances = response['result'];
        let result = { 'info': balances };
        let indexed = this.indexBy (balances, 'Currency');
        let keys = Object.keys (indexed);
        for (let i = 0; i < keys.length; i++) {
            let id = keys[i];
            let currency = this.commonCurrencyCode (id);
            let account = this.account ();
            let balance = indexed[id];
            let free = parseFloat (balance['Available']);
            let total = parseFloat (balance['Balance']);
            let used = total - free;
            account['free'] = free;
            account['used'] = used;
            account['total'] = total;
            result[currency] = account;
        }
        return this.parseBalance (result);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let response = await this.publicGetOrderbook (this.extend ({
            'market': this.marketId (symbol),
            'type': 'both',
        }, params));
        let orderbook = response['result'];
        if ('type' in params) {
            if (params['type'] === 'buy') {
                orderbook = {
                    'buy': response['result'],
                    'sell': [],
                };
            } else if (params['type'] === 'sell') {
                orderbook = {
                    'buy': [],
                    'sell': response['result'],
                };
            }
        }
        return this.parseOrderBook (orderbook, undefined, 'buy', 'sell', 'Rate', 'Quantity');
    }

    parseTicker (ticker, market = undefined) {
        let timestamp = this.safeString (ticker, 'TimeStamp');
        let iso8601 = undefined;
        if (typeof timestamp === 'string') {
            if (timestamp.length > 0) {
                timestamp = this.parse8601 (timestamp);
                iso8601 = this.iso8601 (timestamp);
            }
        }
        let symbol = undefined;
        if (market)
            symbol = market['symbol'];
        let previous = this.safeFloat (ticker, 'PrevDay');
        let last = this.safeFloat (ticker, 'Last');
        let change = undefined;
        let percentage = undefined;
        if (typeof last !== 'undefined')
            if (typeof previous !== 'undefined') {
                change = last - previous;
                if (previous > 0)
                    percentage = (change / previous) * 100;
            }
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': iso8601,
            'high': this.safeFloat (ticker, 'High'),
            'low': this.safeFloat (ticker, 'Low'),
            'bid': this.safeFloat (ticker, 'Bid'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'Ask'),
            'askVolume': undefined,
            'vwap': undefined,
            'open': previous,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': change,
            'percentage': percentage,
            'average': undefined,
            'baseVolume': this.safeFloat (ticker, 'Volume'),
            'quoteVolume': this.safeFloat (ticker, 'BaseVolume'),
            'info': ticker,
        };
    }

    async fetchCurrencies (params = {}) {
        let response = await this.publicGetCurrencies (params);
        let currencies = response['result'];
        let result = {};
        for (let i = 0; i < currencies.length; i++) {
            let currency = currencies[i];
            let id = currency['Currency'];
            // todo: will need to rethink the fees
            // to add support for multiple withdrawal/deposit methods and
            // differentiated fees for each particular method
            let code = this.commonCurrencyCode (id);
            let precision = 8; // default precision, todo: fix "magic constants"
            let address = this.safeValue (currency, 'BaseAddress');
            result[code] = {
                'id': id,
                'code': code,
                'address': address,
                'info': currency,
                'type': currency['CoinType'],
                'name': currency['CurrencyLong'],
                'active': currency['IsActive'],
                'fee': this.safeFloat (currency, 'TxFee'), // todo: redesign
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': Math.pow (10, -precision),
                        'max': Math.pow (10, precision),
                    },
                    'price': {
                        'min': Math.pow (10, -precision),
                        'max': Math.pow (10, precision),
                    },
                    'cost': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'withdraw': {
                        'min': currency['TxFee'],
                        'max': Math.pow (10, precision),
                    },
                },
            };
        }
        return result;
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let response = await this.publicGetMarketsummaries (params);
        let tickers = response['result'];
        let result = {};
        for (let t = 0; t < tickers.length; t++) {
            let ticker = tickers[t];
            let id = ticker['MarketName'];
            let market = undefined;
            let symbol = id;
            if (id in this.markets_by_id) {
                market = this.markets_by_id[id];
                symbol = market['symbol'];
            } else {
                symbol = this.parseSymbol (id);
            }
            result[symbol] = this.parseTicker (ticker, market);
        }
        return result;
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let response = await this.publicGetMarketsummary (this.extend ({
            'market': market['id'],
        }, params));
        let ticker = response['result'][0];
        return this.parseTicker (ticker, market);
    }

    parseTrade (trade, market = undefined) {
        let timestamp = this.parse8601 (trade['TimeStamp'] + '+00:00');
        let side = undefined;
        if (trade['OrderType'] === 'BUY') {
            side = 'buy';
        } else if (trade['OrderType'] === 'SELL') {
            side = 'sell';
        }
        let id = undefined;
        if ('Id' in trade)
            id = trade['Id'].toString ();
        return {
            'id': id,
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': market['symbol'],
            'type': 'limit',
            'side': side,
            'price': this.safeFloat (trade, 'Price'),
            'amount': this.safeFloat (trade, 'Quantity'),
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let response = await this.publicGetMarkethistory (this.extend ({
            'market': market['id'],
        }, params));
        if ('result' in response) {
            if (typeof response['result'] !== 'undefined')
                return this.parseTrades (response['result'], market, since, limit);
        }
        throw new ExchangeError (this.id + ' fetchTrades() returned undefined response');
    }

    parseOHLCV (ohlcv, market = undefined, timeframe = '1d', since = undefined, limit = undefined) {
        let timestamp = this.parse8601 (ohlcv['T'] + '+00:00');
        return [
            timestamp,
            ohlcv['O'],
            ohlcv['H'],
            ohlcv['L'],
            ohlcv['C'],
            ohlcv['V'],
        ];
    }

    async fetchOHLCV (symbol, timeframe = '1m', since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'tickInterval': this.timeframes[timeframe],
            'marketName': market['id'],
        };
        let response = await this.v2GetMarketGetTicks (this.extend (request, params));
        if ('result' in response) {
            if (response['result'])
                return this.parseOHLCVs (response['result'], market, timeframe, since, limit);
        }
        throw new ExchangeError (this.id + ' returned an empty or unrecognized response: ' + this.json (response));
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {};
        let market = undefined;
        if (typeof symbol !== 'undefined') {
            market = this.market (symbol);
            request['market'] = market['id'];
        }
        let response = await this.marketGetOpenorders (this.extend (request, params));
        let orders = this.parseOrders (response['result'], market, since, limit);
        return this.filterBySymbol (orders, symbol);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        if (type !== 'limit')
            throw new ExchangeError (this.id + ' allows limit orders only');
        await this.loadMarkets ();
        let market = this.market (symbol);
        let method = 'marketGet' + this.capitalize (side) + type;
        let order = {
            'market': market['id'],
            'quantity': this.amountToPrecision (symbol, amount),
            'rate': this.priceToPrecision (symbol, price),
        };
        // if (type == 'limit')
        //     order['rate'] = this.priceToPrecision (symbol, price);
        let response = await this[method] (this.extend (order, params));
        let orderIdField = this.getOrderIdField ();
        let result = {
            'info': response,
            'id': response['result'][orderIdField],
            'symbol': symbol,
            'type': type,
            'side': side,
            'status': 'open',
        };
        return result;
    }

    getOrderIdField () {
        return 'uuid';
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let orderIdField = this.getOrderIdField ();
        let request = {};
        request[orderIdField] = id;
        let response = await this.marketGetCancel (this.extend (request, params));
        return this.parseOrder (response);
    }

    parseSymbol (id) {
        let [ quote, base ] = id.split ('-');
        base = this.commonCurrencyCode (base);
        quote = this.commonCurrencyCode (quote);
        return base + '/' + quote;
    }

    parseOrder (order, market = undefined) {
        let side = this.safeString (order, 'OrderType');
        if (typeof side === 'undefined')
            side = this.safeString (order, 'Type');
        let isBuyOrder = (side === 'LIMIT_BUY') || (side === 'BUY');
        let isSellOrder = (side === 'LIMIT_SELL') || (side === 'SELL');
        if (isBuyOrder) {
            side = 'buy';
        }
        if (isSellOrder) {
            side = 'sell';
        }
        // We parse different fields in a very specific order.
        // Order might well be closed and then canceled.
        let status = undefined;
        if (('Opened' in order) && order['Opened'])
            status = 'open';
        if (('Closed' in order) && order['Closed'])
            status = 'closed';
        if (('CancelInitiated' in order) && order['CancelInitiated'])
            status = 'canceled';
        if (('Status' in order) && this.options['parseOrderStatus'])
            status = this.parseOrderStatus (order['Status']);
        let symbol = undefined;
        if ('Exchange' in order) {
            let marketId = order['Exchange'];
            if (marketId in this.markets_by_id) {
                market = this.markets_by_id[marketId];
                symbol = market['symbol'];
            } else {
                symbol = this.parseSymbol (marketId);
            }
        } else {
            if (typeof market !== 'undefined') {
                symbol = market['symbol'];
            }
        }
        let timestamp = undefined;
        if ('Opened' in order)
            timestamp = this.parse8601 (order['Opened'] + '+00:00');
        if ('Created' in order)
            timestamp = this.parse8601 (order['Created'] + '+00:00');
        let lastTradeTimestamp = undefined;
        if (('TimeStamp' in order) && (typeof order['TimeStamp'] !== 'undefined'))
            lastTradeTimestamp = this.parse8601 (order['TimeStamp'] + '+00:00');
        if (('Closed' in order) && (typeof order['Closed'] !== 'undefined'))
            lastTradeTimestamp = this.parse8601 (order['Closed'] + '+00:00');
        if (typeof timestamp === 'undefined')
            timestamp = lastTradeTimestamp;
        let iso8601 = (typeof timestamp !== 'undefined') ? this.iso8601 (timestamp) : undefined;
        let fee = undefined;
        let commission = undefined;
        if ('Commission' in order) {
            commission = 'Commission';
        } else if ('CommissionPaid' in order) {
            commission = 'CommissionPaid';
        }
        if (commission) {
            fee = {
                'cost': parseFloat (order[commission]),
            };
            if (typeof market !== 'undefined') {
                fee['currency'] = market['quote'];
            } else if (typeof symbol !== 'undefined') {
                let currencyIds = symbol.split ('/');
                let quoteCurrencyId = currencyIds[1];
                if (quoteCurrencyId in this.currencies_by_id)
                    fee['currency'] = this.currencies_by_id[quoteCurrencyId]['code'];
                else
                    fee['currency'] = this.commonCurrencyCode (quoteCurrencyId);
            }
        }
        let price = this.safeFloat (order, 'Limit');
        let cost = this.safeFloat (order, 'Price');
        let amount = this.safeFloat (order, 'Quantity');
        let remaining = this.safeFloat (order, 'QuantityRemaining');
        let filled = undefined;
        if (typeof amount !== 'undefined' && typeof remaining !== 'undefined') {
            filled = amount - remaining;
        }
        if (!cost) {
            if (price && filled)
                cost = price * filled;
        }
        if (!price) {
            if (cost && filled)
                price = cost / filled;
        }
        let average = this.safeFloat (order, 'PricePerUnit');
        let id = this.safeString (order, 'OrderUuid');
        if (typeof id === 'undefined')
            id = this.safeString (order, 'OrderId');
        let result = {
            'info': order,
            'id': id,
            'timestamp': timestamp,
            'datetime': iso8601,
            'lastTradeTimestamp': lastTradeTimestamp,
            'symbol': symbol,
            'type': 'limit',
            'side': side,
            'price': price,
            'cost': cost,
            'average': average,
            'amount': amount,
            'filled': filled,
            'remaining': remaining,
            'status': status,
            'fee': fee,
        };
        return result;
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let response = undefined;
        try {
            let orderIdField = this.getOrderIdField ();
            let request = {};
            request[orderIdField] = id;
            response = await this.accountGetOrder (this.extend (request, params));
        } catch (e) {
            if (this.last_json_response) {
                let message = this.safeString (this.last_json_response, 'message');
                if (message === 'UUID_INVALID')
                    throw new OrderNotFound (this.id + ' fetchOrder() error: ' + this.last_http_response);
            }
            throw e;
        }
        if (!response['result']) {
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        return this.parseOrder (response['result']);
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {};
        let market = undefined;
        if (typeof symbol !== 'undefined') {
            market = this.market (symbol);
            request['market'] = market['id'];
        }
        let response = await this.accountGetOrderhistory (this.extend (request, params));
        let orders = this.parseOrders (response['result'], market, since, limit);
        if (typeof symbol !== 'undefined')
            return this.filterBySymbol (orders, symbol);
        return orders;
    }

    async fetchDepositAddress (code, params = {}) {
        await this.loadMarkets ();
        let currency = this.currency (code);
        let response = await this.accountGetDepositaddress (this.extend ({
            'currency': currency['id'],
        }, params));
        let address = this.safeString (response['result'], 'Address');
        let message = this.safeString (response, 'message');
        if (!address || message === 'ADDRESS_GENERATING')
            throw new AddressPending (this.id + ' the address for ' + code + ' is being generated (pending, not ready yet, retry again later)');
        let tag = undefined;
        if ((code === 'XRP') || (code === 'XLM')) {
            tag = address;
            address = currency['address'];
        }
        this.checkAddress (address);
        return {
            'currency': code,
            'address': address,
            'tag': tag,
            'info': response,
        };
    }

    async withdraw (code, amount, address, tag = undefined, params = {}) {
        this.checkAddress (address);
        await this.loadMarkets ();
        let currency = this.currency (code);
        let request = {
            'currency': currency['id'],
            'quantity': amount,
            'address': address,
        };
        if (tag)
            request['paymentid'] = tag;
        let response = await this.accountGetWithdraw (this.extend (request, params));
        let id = undefined;
        if ('result' in response) {
            if ('uuid' in response['result'])
                id = response['result']['uuid'];
        }
        return {
            'info': response,
            'id': id,
        };
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'][api] + '/';
        if (api !== 'v2')
            url += this.version + '/';
        if (api === 'public') {
            url += api + '/' + method.toLowerCase () + path;
            if (Object.keys (params).length)
                url += '?' + this.urlencode (params);
        } else if (api === 'v2') {
            url += path;
            if (Object.keys (params).length)
                url += '?' + this.urlencode (params);
        } else {
            this.checkRequiredCredentials ();
            let nonce = this.nonce ();
            url += api + '/';
            if (((api === 'account') && (path !== 'withdraw')) || (path === 'openorders'))
                url += method.toLowerCase ();
            url += path + '?' + this.urlencode (this.extend ({
                'nonce': nonce,
                'apikey': this.apiKey,
            }, params));
            let signature = this.hmac (this.encode (url), this.encode (this.secret), 'sha512');
            headers = { 'apisign': signature };
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (code, reason, url, method, headers, body) {
        if (body[0] === '{') {
            let response = JSON.parse (body);
            // { success: false, message: "message" }
            let success = this.safeValue (response, 'success');
            if (typeof success === 'undefined')
                throw new ExchangeError (this.id + ': malformed response: ' + this.json (response));
            if (typeof success === 'string')
                // bleutrade uses string instead of boolean
                success = (success === 'true') ? true : false;
            if (!success) {
                const message = this.safeString (response, 'message');
                const feedback = this.id + ' ' + this.json (response);
                const exceptions = this.exceptions;
                if (message === 'APIKEY_INVALID') {
                    if (this.options['hasAlreadyAuthenticatedSuccessfully']) {
                        throw new DDoSProtection (feedback);
                    } else {
                        throw new AuthenticationError (feedback);
                    }
                }
                if (message === 'DUST_TRADE_DISALLOWED_MIN_VALUE_50K_SAT')
                    throw new InvalidOrder (this.id + ' order cost should be over 50k satoshi ' + this.json (response));
                if (message === 'INVALID_ORDER') {
                    // Bittrex will return an ambiguous INVALID_ORDER message
                    // upon canceling already-canceled and closed orders
                    // therefore this special case for cancelOrder
                    // let url = 'https://bittrex.com/api/v1.1/market/cancel?apikey=API_KEY&uuid=ORDER_UUID'
                    let cancel = 'cancel';
                    let indexOfCancel = url.indexOf (cancel);
                    if (indexOfCancel >= 0) {
                        let parts = url.split ('&');
                        let orderId = undefined;
                        for (let i = 0; i < parts.length; i++) {
                            let part = parts[i];
                            let keyValue = part.split ('=');
                            if (keyValue[0] === 'uuid') {
                                orderId = keyValue[1];
                                break;
                            }
                        }
                        if (typeof orderId !== 'undefined')
                            throw new OrderNotFound (this.id + ' cancelOrder ' + orderId + ' ' + this.json (response));
                        else
                            throw new OrderNotFound (this.id + ' cancelOrder ' + this.json (response));
                    }
                }
                if (message in exceptions)
                    throw new exceptions[message] (feedback);
                if (typeof message !== 'undefined') {
                    if (message.indexOf ('throttled. Try again') >= 0)
                        throw new DDoSProtection (feedback);
                    if (message.indexOf ('problem') >= 0)
                        throw new ExchangeNotAvailable (feedback); // 'There was a problem processing your request.  If this problem persists, please contact...')
                }
                throw new ExchangeError (feedback);
            }
        }
    }

    async request (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let response = await this.fetch2 (path, api, method, params, headers, body);
        // a workaround for APIKEY_INVALID
        if ((api === 'account') || (api === 'market'))
            this.options['hasAlreadyAuthenticatedSuccessfully'] = true;
        return response;
    }
};

},{"./base/Exchange":3,"./base/errors":5}],20:[function(require,module,exports){
'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class ccex extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'ccex',
            'name': 'C-CEX',
            'countries': [ 'DE', 'EU' ],
            'rateLimit': 1500,
            'has': {
                'CORS': false,
                'fetchTickers': true,
                'fetchOrderBooks': true,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/27766433-16881f90-5ed8-11e7-92f8-3d92cc747a6c.jpg',
                'api': {
                    'web': 'https://c-cex.com/t',
                    'public': 'https://c-cex.com/t/api_pub.html',
                    'private': 'https://c-cex.com/t/api.html',
                },
                'www': 'https://c-cex.com',
                'doc': 'https://c-cex.com/?id=api',
            },
            'api': {
                'web': {
                    'get': [
                        'coinnames',
                        '{market}',
                        'pairs',
                        'prices',
                        'volume_{coin}',
                    ],
                },
                'public': {
                    'get': [
                        'balancedistribution',
                        'markethistory',
                        'markets',
                        'marketsummaries',
                        'orderbook',
                        'fullorderbook',
                    ],
                },
                'private': {
                    'get': [
                        'buylimit',
                        'cancel',
                        'getbalance',
                        'getbalances',
                        'getopenorders',
                        'getorder',
                        'getorderhistory',
                        'mytrades',
                        'selllimit',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'taker': 0.2 / 100,
                    'maker': 0.2 / 100,
                },
            },
            'commonCurrencies': {
                'BLC': 'Cryptobullcoin',
                'CRC': 'CoreCoin',
                'IOT': 'IoTcoin',
                'LUX': 'Luxmi',
                'VIT': 'VitalCoin',
                'XID': 'InternationalDiamond',
            },
        });
    }

    async fetchMarkets () {
        let result = {};
        let response = await this.webGetPairs ();
        let markets = response['pairs'];
        for (let i = 0; i < markets.length; i++) {
            let id = markets[i];
            let [ baseId, quoteId ] = id.split ('-');
            let base = baseId.toUpperCase ();
            let quote = quoteId.toUpperCase ();
            base = this.commonCurrencyCode (base);
            quote = this.commonCurrencyCode (quote);
            let symbol = base + '/' + quote;
            result[symbol] = {
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'info': id,
            };
        }
        // an alternative documented parser
        //     let markets = await this.publicGetMarkets ();
        //     for (let p = 0; p < markets['result'].length; p++) {
        //         let market = markets['result'][p];
        //         let id = market['MarketName'];
        //         let base = market['MarketCurrency'];
        //         let quote = market['BaseCurrency'];
        //         base = this.commonCurrencyCode (base);
        //         quote = this.commonCurrencyCode (quote);
        //         let symbol = base + '/' + quote;
        //         result.push ({
        //             'id': id,
        //             'symbol': symbol,
        //             'base': base,
        //             'quote': quote,
        //             'info': market,
        //         });
        //     }
        return result;
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let response = await this.privateGetGetbalances ();
        let balances = response['result'];
        let result = { 'info': balances };
        for (let b = 0; b < balances.length; b++) {
            let balance = balances[b];
            let code = balance['Currency'];
            let currency = this.commonCurrencyCode (code);
            let account = {
                'free': balance['Available'],
                'used': balance['Pending'],
                'total': balance['Balance'],
            };
            result[currency] = account;
        }
        return this.parseBalance (result);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {
            'market': this.marketId (symbol),
            'type': 'both',
        };
        if (typeof limit !== 'undefined')
            request['depth'] = limit; // 100
        let response = await this.publicGetOrderbook (this.extend (request, params));
        let orderbook = response['result'];
        return this.parseOrderBook (orderbook, undefined, 'buy', 'sell', 'Rate', 'Quantity');
    }

    async fetchOrderBooks (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let orderbooks = {};
        let response = await this.publicGetFullorderbook ();
        let types = Object.keys (response['result']);
        for (let i = 0; i < types.length; i++) {
            let type = types[i];
            let bidasks = response['result'][type];
            let bidasksByMarketId = this.groupBy (bidasks, 'Market');
            let marketIds = Object.keys (bidasksByMarketId);
            for (let j = 0; j < marketIds.length; j++) {
                let marketId = marketIds[j];
                let symbol = marketId.toUpperCase ();
                let side = type;
                if (symbol in this.markets_by_id) {
                    let market = this.markets_by_id[symbol];
                    symbol = market['symbol'];
                } else {
                    let [ base, quote ] = symbol.split ('-');
                    let invertedId = quote + '-' + base;
                    if (invertedId in this.markets_by_id) {
                        let market = this.markets_by_id[invertedId];
                        symbol = market['symbol'];
                    }
                }
                if (!(symbol in orderbooks))
                    orderbooks[symbol] = {};
                orderbooks[symbol][side] = bidasksByMarketId[marketId];
            }
        }
        let result = {};
        let keys = Object.keys (orderbooks);
        for (let k = 0; k < keys.length; k++) {
            let key = keys[k];
            result[key] = this.parseOrderBook (orderbooks[key], undefined, 'buy', 'sell', 'Rate', 'Quantity');
        }
        return result;
    }

    parseTicker (ticker, market = undefined) {
        let timestamp = ticker['updated'] * 1000;
        let symbol = undefined;
        if (typeof market !== 'undefined')
            symbol = market['symbol'];
        let last = this.safeFloat (ticker, 'lastprice');
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'high'),
            'low': this.safeFloat (ticker, 'low'),
            'bid': this.safeFloat (ticker, 'buy'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'sell'),
            'askVolume': undefined,
            'vwap': undefined,
            'open': undefined,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': this.safeFloat (ticker, 'avg'),
            'baseVolume': undefined,
            'quoteVolume': this.safeFloat (ticker, 'buysupport'),
            'info': ticker,
        };
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let tickers = await this.webGetPrices (params);
        let result = {};
        let ids = Object.keys (tickers);
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let ticker = tickers[id];
            let market = undefined;
            let symbol = undefined;
            if (id in this.markets_by_id) {
                market = this.markets_by_id[id];
                symbol = market['symbol'];
            } else {
                let uppercase = id.toUpperCase ();
                let [ base, quote ] = uppercase.split ('-');
                base = this.commonCurrencyCode (base);
                quote = this.commonCurrencyCode (quote);
                symbol = base + '/' + quote;
            }
            result[symbol] = this.parseTicker (ticker, market);
        }
        return result;
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let response = await this.webGetMarket (this.extend ({
            'market': market['id'].toLowerCase (),
        }, params));
        let ticker = response['ticker'];
        return this.parseTicker (ticker, market);
    }

    parseTrade (trade, market) {
        let timestamp = this.parse8601 (trade['TimeStamp']);
        return {
            'id': trade['Id'].toString (),
            'info': trade,
            'order': undefined,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': market['symbol'],
            'type': undefined,
            'side': trade['OrderType'].toLowerCase (),
            'price': trade['Price'],
            'amount': trade['Quantity'],
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let response = await this.publicGetMarkethistory (this.extend ({
            'market': market['id'],
            'type': 'both',
            'depth': 100,
        }, params));
        return this.parseTrades (response['result'], market, since, limit);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        await this.loadMarkets ();
        let method = 'privateGet' + this.capitalize (side) + type;
        let response = await this[method] (this.extend ({
            'market': this.marketId (symbol),
            'quantity': amount,
            'rate': price,
        }, params));
        return {
            'info': response,
            'id': response['result']['uuid'],
        };
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        return await this.privateGetCancel ({ 'uuid': id });
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'][api];
        if (api === 'private') {
            this.checkRequiredCredentials ();
            let nonce = this.nonce ().toString ();
            let query = this.keysort (this.extend ({
                'a': path,
                'apikey': this.apiKey,
                'nonce': nonce,
            }, params));
            url += '?' + this.urlencode (query);
            headers = { 'apisign': this.hmac (this.encode (url), this.encode (this.secret), 'sha512') };
        } else if (api === 'public') {
            url += '?' + this.urlencode (this.extend ({
                'a': 'get' + path,
            }, params));
        } else {
            url += '/' + this.implodeParams (path, params) + '.json';
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    async request (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let response = await this.fetch2 (path, api, method, params, headers, body);
        if (api === 'web')
            return response;
        if ('success' in response)
            if (response['success'])
                return response;
        throw new ExchangeError (this.id + ' ' + this.json (response));
    }
};

},{"./base/Exchange":3,"./base/errors":5}],21:[function(require,module,exports){
'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError, InsufficientFunds, InvalidOrder, OrderNotFound, OrderNotCached, InvalidNonce } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class cryptopia extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'cryptopia',
            'name': 'Cryptopia',
            'rateLimit': 1500,
            'countries': [ 'NZ' ], // New Zealand
            'has': {
                'CORS': false,
                'createMarketOrder': false,
                'fetchClosedOrders': 'emulated',
                'fetchCurrencies': true,
                'fetchDepositAddress': true,
                'fetchMyTrades': true,
                'fetchOHLCV': true,
                'fetchOrder': 'emulated',
                'fetchOrderBooks': true,
                'fetchOrders': 'emulated',
                'fetchOpenOrders': true,
                'fetchTickers': true,
                'deposit': true,
                'withdraw': true,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/29484394-7b4ea6e2-84c6-11e7-83e5-1fccf4b2dc81.jpg',
                'api': {
                    'public': 'https://www.cryptopia.co.nz/api',
                    'private': 'https://www.cryptopia.co.nz/api',
                    'web': 'https://www.cryptopia.co.nz',
                },
                'www': 'https://www.cryptopia.co.nz',
                'referral': 'https://www.cryptopia.co.nz/Register?referrer=kroitor',
                'doc': [
                    'https://support.cryptopia.co.nz/csm?id=kb_article&sys_id=a75703dcdbb9130084ed147a3a9619bc',
                    'https://support.cryptopia.co.nz/csm?id=kb_article&sys_id=40e9c310dbf9130084ed147a3a9619eb',
                ],
            },
            'timeframes': {
                '15m': 15,
                '30m': 30,
                '1h': 60,
                '2h': 120,
                '4h': 240,
                '12h': 720,
                '1d': 1440,
                '1w': 10080,
            },
            'api': {
                'web': {
                    'get': [
                        'Exchange/GetTradePairChart',
                    ],
                },
                'public': {
                    'get': [
                        'GetCurrencies',
                        'GetTradePairs',
                        'GetMarkets',
                        'GetMarkets/{id}',
                        'GetMarkets/{hours}',
                        'GetMarkets/{id}/{hours}',
                        'GetMarket/{id}',
                        'GetMarket/{id}/{hours}',
                        'GetMarketHistory/{id}',
                        'GetMarketHistory/{id}/{hours}',
                        'GetMarketOrders/{id}',
                        'GetMarketOrders/{id}/{count}',
                        'GetMarketOrderGroups/{ids}',
                        'GetMarketOrderGroups/{ids}/{count}',
                    ],
                },
                'private': {
                    'post': [
                        'CancelTrade',
                        'GetBalance',
                        'GetDepositAddress',
                        'GetOpenOrders',
                        'GetTradeHistory',
                        'GetTransactions',
                        'SubmitTip',
                        'SubmitTrade',
                        'SubmitTransfer',
                        'SubmitWithdraw',
                    ],
                },
            },
            'commonCurrencies': {
                'ACC': 'AdCoin',
                'BAT': 'BatCoin',
                'BEAN': 'BITB', // rebranding, see issue #3380
                'BLZ': 'BlazeCoin',
                'BTG': 'Bitgem',
                'CAN': 'CanYa',
                'CAT': 'Catcoin',
                'CC': 'CCX',
                'CMT': 'Comet',
                'EPC': 'ExperienceCoin',
                'FCN': 'Facilecoin',
                'FUEL': 'FC2', // FuelCoin != FUEL
                'HAV': 'Havecoin',
                'KARM': 'KARMA',
                'LBTC': 'LiteBitcoin',
                'LDC': 'LADACoin',
                'MARKS': 'Bitmark',
                'NET': 'NetCoin',
                'RED': 'RedCoin',
                'STC': 'StopTrumpCoin',
                'QBT': 'Cubits',
                'WRC': 'WarCoin',
            },
            'options': {
                'fetchTickersErrors': true,
            },
        });
    }

    async fetchMarkets () {
        let response = await this.publicGetGetTradePairs ();
        let result = [];
        let markets = response['Data'];
        for (let i = 0; i < markets.length; i++) {
            let market = markets[i];
            let id = market['Id'];
            let symbol = market['Label'];
            let baseId = market['Symbol'];
            let quoteId = market['BaseSymbol'];
            let base = this.commonCurrencyCode (baseId);
            let quote = this.commonCurrencyCode (quoteId);
            symbol = base + '/' + quote;
            let precision = {
                'amount': 8,
                'price': 8,
            };
            let lot = market['MinimumTrade'];
            let priceLimits = {
                'min': market['MinimumPrice'],
                'max': market['MaximumPrice'],
            };
            let amountLimits = {
                'min': lot,
                'max': market['MaximumTrade'],
            };
            let limits = {
                'amount': amountLimits,
                'price': priceLimits,
                'cost': {
                    'min': market['MinimumBaseTrade'],
                    'max': undefined,
                },
            };
            let active = market['Status'] === 'OK';
            result.push ({
                'id': id,
                'symbol': symbol,
                'label': market['Label'],
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'info': market,
                'maker': market['TradeFee'] / 100,
                'taker': market['TradeFee'] / 100,
                'lot': limits['amount']['min'],
                'active': active,
                'precision': precision,
                'limits': limits,
            });
        }
        this.options['marketsByLabel'] = this.indexBy (result, 'label');
        return result;
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let response = await this.publicGetGetMarketOrdersId (this.extend ({
            'id': this.marketId (symbol),
        }, params));
        let orderbook = response['Data'];
        return this.parseOrderBook (orderbook, undefined, 'Buy', 'Sell', 'Price', 'Volume');
    }

    async fetchOHLCV (symbol, timeframe = '15m', since = undefined, limit = undefined, params = {}) {
        let dataRange = 0;
        if (typeof since !== 'undefined') {
            const dataRanges = [
                86400,
                172800,
                604800,
                1209600,
                2592000,
                7776000,
                15552000,
            ];
            const numDataRanges = dataRanges.length;
            let now = this.seconds ();
            let sinceSeconds = parseInt (since / 1000);
            for (let i = 1; i < numDataRanges; i++) {
                if ((now - sinceSeconds) > dataRanges[i]) {
                    dataRange = i;
                }
            }
        }
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'tradePairId': market['id'],
            'dataRange': dataRange,
            'dataGroup': this.timeframes[timeframe],
        };
        let response = await this.webGetExchangeGetTradePairChart (this.extend (request, params));
        let candles = response['Candle'];
        let volumes = response['Volume'];
        for (let i = 0; i < candles.length; i++) {
            candles[i].push (volumes[i]['basev']);
        }
        return this.parseOHLCVs (candles, market, timeframe, since, limit);
    }

    joinMarketIds (ids, glue = '-') {
        let result = ids[0].toString ();
        for (let i = 1; i < ids.length; i++) {
            result += glue + ids[i].toString ();
        }
        return result;
    }

    async fetchOrderBooks (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        if (typeof symbols === 'undefined') {
            throw new ExchangeError (this.id + ' fetchOrderBooks requires the symbols argument as of May 2018 (up to 5 symbols at max)');
        }
        let numSymbols = symbols.length;
        if (numSymbols > 5) {
            throw new ExchangeError (this.id + ' fetchOrderBooks accepts 5 symbols at max');
        }
        let ids = this.joinMarketIds (this.marketIds (symbols));
        let response = await this.publicGetGetMarketOrderGroupsIds (this.extend ({
            'ids': ids,
        }, params));
        let orderbooks = response['Data'];
        let result = {};
        for (let i = 0; i < orderbooks.length; i++) {
            let orderbook = orderbooks[i];
            let id = this.safeInteger (orderbook, 'TradePairId');
            let symbol = id;
            if (id in this.markets_by_id) {
                let market = this.markets_by_id[id];
                symbol = market['symbol'];
            }
            result[symbol] = this.parseOrderBook (orderbook, undefined, 'Buy', 'Sell', 'Price', 'Volume');
        }
        return result;
    }

    parseTicker (ticker, market = undefined) {
        let timestamp = this.milliseconds ();
        let symbol = undefined;
        if (market)
            symbol = market['symbol'];
        let open = this.safeFloat (ticker, 'Open');
        let last = this.safeFloat (ticker, 'LastPrice');
        let change = last - open;
        let baseVolume = this.safeFloat (ticker, 'Volume');
        let quoteVolume = this.safeFloat (ticker, 'BaseVolume');
        let vwap = undefined;
        if (typeof quoteVolume !== 'undefined')
            if (typeof baseVolume !== 'undefined')
                if (baseVolume > 0)
                    vwap = quoteVolume / baseVolume;
        return {
            'symbol': symbol,
            'info': ticker,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'High'),
            'low': this.safeFloat (ticker, 'Low'),
            'bid': this.safeFloat (ticker, 'BidPrice'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'AskPrice'),
            'askVolume': undefined,
            'vwap': vwap,
            'open': open,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': change,
            'percentage': this.safeFloat (ticker, 'Change'),
            'average': this.sum (last, open) / 2,
            'baseVolume': baseVolume,
            'quoteVolume': quoteVolume,
        };
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let response = await this.publicGetGetMarketId (this.extend ({
            'id': market['id'],
        }, params));
        let ticker = response['Data'];
        return this.parseTicker (ticker, market);
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let response = await this.publicGetGetMarkets (params);
        let result = {};
        let tickers = response['Data'];
        for (let i = 0; i < tickers.length; i++) {
            let ticker = tickers[i];
            let id = ticker['TradePairId'];
            let recognized = (id in this.markets_by_id);
            if (!recognized) {
                if (this.options['fetchTickersErrors'])
                    throw new ExchangeError (this.id + ' fetchTickers() returned unrecognized pair id ' + id.toString ());
            } else {
                let market = this.markets_by_id[id];
                let symbol = market['symbol'];
                result[symbol] = this.parseTicker (ticker, market);
            }
        }
        return this.filterByArray (result, 'symbol', symbols);
    }

    parseTrade (trade, market = undefined) {
        let timestamp = undefined;
        if ('Timestamp' in trade) {
            timestamp = trade['Timestamp'] * 1000;
        } else if ('TimeStamp' in trade) {
            timestamp = this.parse8601 (trade['TimeStamp']);
        }
        let price = this.safeFloat (trade, 'Price');
        if (!price)
            price = this.safeFloat (trade, 'Rate');
        let cost = this.safeFloat (trade, 'Total');
        let id = this.safeString (trade, 'TradeId');
        if (typeof market === 'undefined') {
            if ('TradePairId' in trade)
                if (trade['TradePairId'] in this.markets_by_id)
                    market = this.markets_by_id[trade['TradePairId']];
        }
        let symbol = undefined;
        let fee = undefined;
        if (typeof market !== 'undefined') {
            symbol = market['symbol'];
            if ('Fee' in trade) {
                fee = {
                    'currency': market['quote'],
                    'cost': trade['Fee'],
                };
            }
        }
        return {
            'id': id,
            'info': trade,
            'order': undefined,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'type': 'limit',
            'side': trade['Type'].toLowerCase (),
            'price': price,
            'cost': cost,
            'amount': trade['Amount'],
            'fee': fee,
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let hours = 24; // the default
        if (typeof since !== 'undefined') {
            let elapsed = this.milliseconds () - since;
            let hour = 1000 * 60 * 60;
            hours = parseInt (Math.ceil (elapsed / hour));
        }
        let request = {
            'id': market['id'],
            'hours': hours,
        };
        let response = await this.publicGetGetMarketHistoryIdHours (this.extend (request, params));
        let trades = response['Data'];
        return this.parseTrades (trades, market, since, limit);
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {};
        let market = undefined;
        if (typeof symbol !== 'undefined') {
            market = this.market (symbol);
            request['TradePairId'] = market['id'];
        }
        if (typeof limit !== 'undefined') {
            request['Count'] = limit; // default 100
        }
        let response = await this.privatePostGetTradeHistory (this.extend (request, params));
        return this.parseTrades (response['Data'], market, since, limit);
    }

    async fetchCurrencies (params = {}) {
        let response = await this.publicGetGetCurrencies (params);
        let currencies = response['Data'];
        let result = {};
        for (let i = 0; i < currencies.length; i++) {
            let currency = currencies[i];
            let id = currency['Symbol'];
            // todo: will need to rethink the fees
            // to add support for multiple withdrawal/deposit methods and
            // differentiated fees for each particular method
            let precision = 8; // default precision, todo: fix "magic constants"
            let code = this.commonCurrencyCode (id);
            let active = (currency['ListingStatus'] === 'Active');
            let status = currency['Status'].toLowerCase ();
            if (status !== 'ok')
                active = false;
            result[code] = {
                'id': id,
                'code': code,
                'info': currency,
                'name': currency['Name'],
                'active': active,
                'status': status,
                'fee': currency['WithdrawFee'],
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': Math.pow (10, -precision),
                        'max': Math.pow (10, precision),
                    },
                    'price': {
                        'min': Math.pow (10, -precision),
                        'max': Math.pow (10, precision),
                    },
                    'cost': {
                        'min': currency['MinBaseTrade'],
                        'max': undefined,
                    },
                    'withdraw': {
                        'min': currency['MinWithdraw'],
                        'max': currency['MaxWithdraw'],
                    },
                },
            };
        }
        return result;
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let response = await this.privatePostGetBalance (params);
        let balances = response['Data'];
        let result = { 'info': response };
        for (let i = 0; i < balances.length; i++) {
            let balance = balances[i];
            let code = balance['Symbol'];
            let currency = this.commonCurrencyCode (code);
            let account = {
                'free': balance['Available'],
                'used': 0.0,
                'total': balance['Total'],
            };
            account['used'] = account['total'] - account['free'];
            result[currency] = account;
        }
        return this.parseBalance (result);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        if (type === 'market')
            throw new ExchangeError (this.id + ' allows limit orders only');
        await this.loadMarkets ();
        let market = this.market (symbol);
        // price = parseFloat (price);
        // amount = parseFloat (amount);
        let request = {
            'TradePairId': market['id'],
            'Type': this.capitalize (side),
            // 'Rate': this.priceToPrecision (symbol, price),
            // 'Amount': this.amountToPrecision (symbol, amount),
            'Rate': price,
            'Amount': amount,
        };
        let response = await this.privatePostSubmitTrade (this.extend (request, params));
        if (!response)
            throw new ExchangeError (this.id + ' createOrder returned unknown error: ' + this.json (response));
        let id = undefined;
        let filled = 0.0;
        let status = 'open';
        if ('Data' in response) {
            if ('OrderId' in response['Data']) {
                if (response['Data']['OrderId']) {
                    id = response['Data']['OrderId'].toString ();
                } else {
                    filled = amount;
                    status = 'closed';
                }
            }
        }
        let order = {
            'id': id,
            'timestamp': undefined,
            'datetime': undefined,
            'lastTradeTimestamp': undefined,
            'status': status,
            'symbol': symbol,
            'type': type,
            'side': side,
            'price': price,
            'cost': price * amount,
            'amount': amount,
            'remaining': amount - filled,
            'filled': filled,
            'fee': undefined,
            // 'trades': this.parseTrades (order['trades'], market),
        };
        if (id)
            this.orders[id] = order;
        return this.extend ({ 'info': response }, order);
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let response = undefined;
        try {
            response = await this.privatePostCancelTrade (this.extend ({
                'Type': 'Trade',
                'OrderId': id,
            }, params));
            // We do not know if it is indeed canceled, but cryptopia lacks any
            // reasonable method to get information on executed or canceled order.
            if (id in this.orders)
                this.orders[id]['status'] = 'canceled';
        } catch (e) {
            if (this.last_json_response) {
                let message = this.safeString (this.last_json_response, 'Error');
                if (message) {
                    if (message.indexOf ('does not exist') >= 0)
                        throw new OrderNotFound (this.id + ' cancelOrder() error: ' + this.last_http_response);
                }
            }
            throw e;
        }
        return this.parseOrder (response);
    }

    parseOrder (order, market = undefined) {
        let symbol = undefined;
        if (typeof market !== 'undefined') {
            symbol = market['symbol'];
        } else if ('Market' in order) {
            let id = order['Market'];
            if (id in this.markets_by_id) {
                market = this.markets_by_id[id];
                symbol = market['symbol'];
            } else {
                if (id in this.options['marketsByLabel']) {
                    market = this.options['marketsByLabel'][id];
                    symbol = market['symbol'];
                }
            }
        }
        let timestamp = this.parse8601 (order['TimeStamp']);
        let datetime = undefined;
        if (timestamp) {
            datetime = this.iso8601 (timestamp);
        }
        let amount = this.safeFloat (order, 'Amount');
        let remaining = this.safeFloat (order, 'Remaining');
        let filled = undefined;
        if (typeof amount !== 'undefined' && typeof remaining !== 'undefined') {
            filled = amount - remaining;
        }
        let id = this.safeValue (order, 'OrderId');
        if (typeof id !== 'undefined') {
            id = id.toString ();
        }
        let side = this.safeString (order, 'Type');
        if (typeof side !== 'undefined') {
            side = side.toLowerCase ();
        }
        return {
            'id': id,
            'info': this.omit (order, 'status'),
            'timestamp': timestamp,
            'datetime': datetime,
            'lastTradeTimestamp': undefined,
            'status': this.safeString (order, 'status'),
            'symbol': symbol,
            'type': 'limit',
            'side': side,
            'price': this.safeFloat (order, 'Rate'),
            'cost': this.safeFloat (order, 'Total'),
            'amount': amount,
            'filled': filled,
            'remaining': remaining,
            'fee': undefined,
            // 'trades': this.parseTrades (order['trades'], market),
        };
    }

    async fetchOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        let request = {
            // 'Market': market['id'],
            // 'TradePairId': market['id'], // Cryptopia identifier (not required if 'Market' supplied)
            // 'Count': 100, // default = 100
        };
        if (typeof symbol !== 'undefined') {
            market = this.market (symbol);
            request['TradePairId'] = market['id'];
        }
        let response = await this.privatePostGetOpenOrders (this.extend (request, params));
        let orders = [];
        for (let i = 0; i < response['Data'].length; i++) {
            orders.push (this.extend (response['Data'][i], { 'status': 'open' }));
        }
        let openOrders = this.parseOrders (orders, market);
        for (let j = 0; j < openOrders.length; j++) {
            this.orders[openOrders[j]['id']] = openOrders[j];
        }
        let openOrdersIndexedById = this.indexBy (openOrders, 'id');
        let cachedOrderIds = Object.keys (this.orders);
        let result = [];
        for (let k = 0; k < cachedOrderIds.length; k++) {
            let id = cachedOrderIds[k];
            if (id in openOrdersIndexedById) {
                this.orders[id] = this.extend (this.orders[id], openOrdersIndexedById[id]);
            } else {
                let order = this.orders[id];
                if (order['status'] === 'open') {
                    if ((typeof symbol === 'undefined') || (order['symbol'] === symbol)) {
                        this.orders[id] = this.extend (order, {
                            'status': 'closed',
                            'cost': order['amount'] * order['price'],
                            'filled': order['amount'],
                            'remaining': 0.0,
                        });
                    }
                }
            }
            let order = this.orders[id];
            if ((typeof symbol === 'undefined') || (order['symbol'] === symbol))
                result.push (order);
        }
        return this.filterBySinceLimit (result, since, limit);
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        id = id.toString ();
        let orders = await this.fetchOrders (symbol, undefined, undefined, params);
        for (let i = 0; i < orders.length; i++) {
            if (orders[i]['id'] === id)
                return orders[i];
        }
        throw new OrderNotCached (this.id + ' order ' + id + ' not found in cached .orders, fetchOrder requires .orders (de)serialization implemented for this method to work properly');
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let orders = await this.fetchOrders (symbol, since, limit, params);
        let result = [];
        for (let i = 0; i < orders.length; i++) {
            if (orders[i]['status'] === 'open')
                result.push (orders[i]);
        }
        return result;
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let orders = await this.fetchOrders (symbol, since, limit, params);
        let result = [];
        for (let i = 0; i < orders.length; i++) {
            if (orders[i]['status'] === 'closed')
                result.push (orders[i]);
        }
        return result;
    }

    async fetchDepositAddress (code, params = {}) {
        await this.loadMarkets ();
        let currency = this.currency (code);
        let response = await this.privatePostGetDepositAddress (this.extend ({
            'Currency': currency['id'],
        }, params));
        let address = this.safeString (response['Data'], 'BaseAddress');
        if (!address)
            address = this.safeString (response['Data'], 'Address');
        this.checkAddress (address);
        return {
            'currency': code,
            'address': address,
            'info': response,
        };
    }

    async withdraw (code, amount, address, tag = undefined, params = {}) {
        await this.loadMarkets ();
        let currency = this.currency (code);
        this.checkAddress (address);
        let request = {
            'Currency': currency['id'],
            'Amount': amount,
            'Address': address, // Address must exist in you AddressBook in security settings
        };
        if (tag)
            request['PaymentId'] = tag;
        let response = await this.privatePostSubmitWithdraw (this.extend (request, params));
        return {
            'info': response,
            'id': response['Data'],
        };
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'][api] + '/' + this.implodeParams (path, params);
        let query = this.omit (params, this.extractParams (path));
        if (api === 'private') {
            this.checkRequiredCredentials ();
            let nonce = this.nonce ().toString ();
            body = this.json (query, { 'convertArraysToObjects': true });
            let hash = this.hash (this.encode (body), 'md5', 'base64');
            let secret = this.base64ToBinary (this.secret);
            let uri = this.encodeURIComponent (url);
            let lowercase = uri.toLowerCase ();
            hash = this.binaryToString (hash);
            let payload = this.apiKey + method + lowercase + nonce + hash;
            let signature = this.hmac (this.encode (payload), secret, 'sha256', 'base64');
            let auth = 'amx ' + this.apiKey + ':' + this.binaryToString (signature) + ':' + nonce;
            headers = {
                'Content-Type': 'application/json',
                'Authorization': auth,
            };
        } else {
            if (Object.keys (query).length)
                url += '?' + this.urlencode (query);
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    nonce () {
        return this.milliseconds ();
    }

    handleErrors (code, reason, url, method, headers, body) {
        if (typeof body !== 'string')
            return; // fallback to default error handler
        if (body.length < 2)
            return; // fallback to default error handler
        const fixedJSONString = this.sanitizeBrokenJSONString (body);
        if (fixedJSONString[0] === '{') {
            let response = JSON.parse (fixedJSONString);
            if ('Success' in response) {
                const success = this.safeValue (response, 'Success');
                if (typeof success !== 'undefined') {
                    if (!success) {
                        let error = this.safeString (response, 'Error');
                        let feedback = this.id;
                        if (typeof error === 'string') {
                            feedback = feedback + ' ' + error;
                            if (error.indexOf ('Invalid trade amount') >= 0) {
                                throw new InvalidOrder (feedback);
                            }
                            if (error.indexOf ('does not exist') >= 0) {
                                throw new OrderNotFound (feedback);
                            }
                            if (error.indexOf ('Insufficient Funds') >= 0) {
                                throw new InsufficientFunds (feedback);
                            }
                            if (error.indexOf ('Nonce has already been used') >= 0) {
                                throw new InvalidNonce (feedback);
                            }
                        } else {
                            feedback = feedback + ' ' + fixedJSONString;
                        }
                        throw new ExchangeError (feedback);
                    }
                }
            }
        }
    }

    sanitizeBrokenJSONString (jsonString) {
        // sometimes cryptopia will return a unicode symbol before actual JSON string.
        const indexOfBracket = jsonString.indexOf ('{');
        if (indexOfBracket >= 0) {
            return jsonString.slice (indexOfBracket);
        }
        return jsonString;
    }

    parseJson (response, responseBody, url, method) { // we have to sanitize JSON before trying to parse
        return super.parseJson (response, this.sanitizeBrokenJSONString (responseBody), url, method);
    }
};

},{"./base/Exchange":3,"./base/errors":5}],22:[function(require,module,exports){
'use strict';

// ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError, InsufficientFunds, OrderNotFound, InvalidOrder } = require ('./base/errors');

// ---------------------------------------------------------------------------

module.exports = class hitbtc extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'hitbtc',
            'name': 'HitBTC',
            'countries': [ 'HK' ],
            'rateLimit': 1500,
            'version': '1',
            'has': {
                'CORS': false,
                'fetchTrades': true,
                'fetchTickers': true,
                'fetchOrder': true,
                'fetchOpenOrders': true,
                'fetchClosedOrders': true,
                'withdraw': true,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/27766555-8eaec20e-5edc-11e7-9c5b-6dc69fc42f5e.jpg',
                'api': 'http://api.hitbtc.com',
                'www': 'https://hitbtc.com',
                'referral': 'https://hitbtc.com/?ref_id=5a5d39a65d466',
                'doc': 'https://github.com/hitbtc-com/hitbtc-api/blob/master/APIv1.md',
                'fees': [
                    'https://hitbtc.com/fees-and-limits',
                    'https://support.hitbtc.com/hc/en-us/articles/115005148605-Fees-and-limits',
                ],
            },
            'api': {
                'public': {
                    'get': [
                        '{symbol}/orderbook',
                        '{symbol}/ticker',
                        '{symbol}/trades',
                        '{symbol}/trades/recent',
                        'symbols',
                        'ticker',
                        'time',
                    ],
                },
                'trading': {
                    'get': [
                        'balance',
                        'orders/active',
                        'orders/recent',
                        'order',
                        'trades/by/order',
                        'trades',
                    ],
                    'post': [
                        'new_order',
                        'cancel_order',
                        'cancel_orders',
                    ],
                },
                'payment': {
                    'get': [
                        'balance',
                        'address/{currency}',
                        'transactions',
                        'transactions/{transaction}',
                    ],
                    'post': [
                        'transfer_to_trading',
                        'transfer_to_main',
                        'address/{currency}',
                        'payout',
                    ],
                },
            },
            // hardcoded fees are deprecated and should only be used when there's no other way to get fee info
            'fees': {
                'trading': {
                    'tierBased': false,
                    'percentage': true,
                    'maker': -0.01 / 100,
                    'taker': 0.1 / 100,
                },
                'funding': {
                    'tierBased': false,
                    'percentage': false,
                    'withdraw': {
                        'BTC': 0.001,
                        'BCC': 0.0018,
                        'ETH': 0.00215,
                        'BCH': 0.0018,
                        'USDT': 100,
                        'DASH': 0.03,
                        'BTG': 0.0005,
                        'LTC': 0.003,
                        'ZEC': 0.0001,
                        'XMR': 0.09,
                        '1ST': 0.84,
                        'ADX': 5.7,
                        'AE': 6.7,
                        'AEON': 0.01006,
                        'AIR': 565,
                        'AMP': 9,
                        'ANT': 6.7,
                        'ARDR': 1,
                        'ARN': 18.5,
                        'ART': 26,
                        'ATB': 0.0004,
                        'ATL': 27,
                        'ATM': 504,
                        'ATS': 860,
                        'AVT': 1.9,
                        'BAS': 113,
                        'BCN': 0.1,
                        'DAO.Casino': 124, // id = 'BET'
                        'BKB': 46,
                        'BMC': 32,
                        'BMT': 100,
                        'BNT': 2.57,
                        'BQX': 4.7,
                        'BTM': 40,
                        'BTX': 0.04,
                        'BUS': 0.004,
                        'CCT': 115,
                        'CDT': 100,
                        'CDX': 30,
                        'CFI': 61,
                        'CLD': 0.88,
                        'CND': 574,
                        'CNX': 0.04,
                        'COSS': 65,
                        'CSNO': 16,
                        'CTR': 15,
                        'CTX': 146,
                        'CVC': 8.46,
                        'DBIX': 0.0168,
                        'DCN': 120000,
                        'DCT': 0.02,
                        'DDF': 342,
                        'DENT': 6240,
                        'DGB': 0.4,
                        'DGD': 0.01,
                        'DICE': 0.32,
                        'DLT': 0.26,
                        'DNT': 0.21,
                        'DOGE': 2,
                        'DOV': 34,
                        'DRPU': 24,
                        'DRT': 240,
                        'DSH': 0.017,
                        'EBET': 84,
                        'EBTC': 20,
                        'EBTCOLD': 6.6,
                        'ECAT': 14,
                        'EDG': 2,
                        'EDO': 2.9,
                        'ELE': 0.00172,
                        'ELM': 0.004,
                        'EMC': 0.03,
                        'EMGO': 14,
                        'ENJ': 163,
                        'EOS': 1.5,
                        'ERO': 34,
                        'ETBS': 15,
                        'ETC': 0.002,
                        'ETP': 0.004,
                        'EVX': 5.4,
                        'EXN': 456,
                        'FRD': 65,
                        'FUEL': 123.00105,
                        'FUN': 202.9598309,
                        'FYN': 1.849,
                        'FYP': 66.13,
                        'GNO': 0.0034,
                        'GUP': 4,
                        'GVT': 1.2,
                        'HAC': 144,
                        'HDG': 7,
                        'HGT': 1082,
                        'HPC': 0.4,
                        'HVN': 120,
                        'ICN': 0.55,
                        'ICO': 34,
                        'ICOS': 0.35,
                        'IND': 76,
                        'INDI': 5913,
                        'ITS': 15.0012,
                        'IXT': 11,
                        'KBR': 143,
                        'KICK': 112,
                        'LA': 41,
                        'LAT': 1.44,
                        'LIFE': 13000,
                        'LRC': 27,
                        'LSK': 0.3,
                        'LUN': 0.34,
                        'MAID': 5,
                        'MANA': 143,
                        'MCAP': 5.44,
                        'MIPS': 43,
                        'MNE': 1.33,
                        'MSP': 121,
                        'MTH': 92,
                        'MYB': 3.9,
                        'NDC': 165,
                        'NEBL': 0.04,
                        'NET': 3.96,
                        'NTO': 998,
                        'NXC': 13.39,
                        'NXT': 3,
                        'OAX': 15,
                        'ODN': 0.004,
                        'OMG': 2,
                        'OPT': 335,
                        'ORME': 2.8,
                        'OTN': 0.57,
                        'PAY': 3.1,
                        'PIX': 96,
                        'PLBT': 0.33,
                        'PLR': 114,
                        'PLU': 0.87,
                        'POE': 784,
                        'POLL': 3.5,
                        'PPT': 2,
                        'PRE': 32,
                        'PRG': 39,
                        'PRO': 41,
                        'PRS': 60,
                        'PTOY': 0.5,
                        'QAU': 63,
                        'QCN': 0.03,
                        'QTUM': 0.04,
                        'QVT': 64,
                        'REP': 0.02,
                        'RKC': 15,
                        'RVT': 14,
                        'SAN': 2.24,
                        'SBD': 0.03,
                        'SCL': 2.6,
                        'SISA': 1640,
                        'SKIN': 407,
                        'SMART': 0.4,
                        'SMS': 0.0375,
                        'SNC': 36,
                        'SNGLS': 4,
                        'SNM': 48,
                        'SNT': 233,
                        'STEEM': 0.01,
                        'STRAT': 0.01,
                        'STU': 14,
                        'STX': 11,
                        'SUB': 17,
                        'SUR': 3,
                        'SWT': 0.51,
                        'TAAS': 0.91,
                        'TBT': 2.37,
                        'TFL': 15,
                        'TIME': 0.03,
                        'TIX': 7.1,
                        'TKN': 1,
                        'TKR': 84,
                        'TNT': 90,
                        'TRST': 1.6,
                        'TRX': 1395,
                        'UET': 480,
                        'UGT': 15,
                        'VEN': 14,
                        'VERI': 0.037,
                        'VIB': 50,
                        'VIBE': 145,
                        'VOISE': 618,
                        'WEALTH': 0.0168,
                        'WINGS': 2.4,
                        'WTC': 0.75,
                        'XAUR': 3.23,
                        'XDN': 0.01,
                        'XEM': 15,
                        'XUC': 0.9,
                        'YOYOW': 140,
                        'ZAP': 24,
                        'ZRX': 23,
                        'ZSC': 191,
                    },
                    'deposit': {
                        'BTC': 0.0006,
                        'ETH': 0.003,
                        'BCH': 0,
                        'USDT': 0,
                        'BTG': 0,
                        'LTC': 0,
                        'ZEC': 0,
                        'XMR': 0,
                        '1ST': 0,
                        'ADX': 0,
                        'AE': 0,
                        'AEON': 0,
                        'AIR': 0,
                        'AMP': 0,
                        'ANT': 0,
                        'ARDR': 0,
                        'ARN': 0,
                        'ART': 0,
                        'ATB': 0,
                        'ATL': 0,
                        'ATM': 0,
                        'ATS': 0,
                        'AVT': 0,
                        'BAS': 0,
                        'BCN': 0,
                        'DAO.Casino': 0, // id = 'BET'
                        'BKB': 0,
                        'BMC': 0,
                        'BMT': 0,
                        'BNT': 0,
                        'BQX': 0,
                        'BTM': 0,
                        'BTX': 0,
                        'BUS': 0,
                        'CCT': 0,
                        'CDT': 0,
                        'CDX': 0,
                        'CFI': 0,
                        'CLD': 0,
                        'CND': 0,
                        'CNX': 0,
                        'COSS': 0,
                        'CSNO': 0,
                        'CTR': 0,
                        'CTX': 0,
                        'CVC': 0,
                        'DBIX': 0,
                        'DCN': 0,
                        'DCT': 0,
                        'DDF': 0,
                        'DENT': 0,
                        'DGB': 0,
                        'DGD': 0,
                        'DICE': 0,
                        'DLT': 0,
                        'DNT': 0,
                        'DOGE': 0,
                        'DOV': 0,
                        'DRPU': 0,
                        'DRT': 0,
                        'DSH': 0,
                        'EBET': 0,
                        'EBTC': 0,
                        'EBTCOLD': 0,
                        'ECAT': 0,
                        'EDG': 0,
                        'EDO': 0,
                        'ELE': 0,
                        'ELM': 0,
                        'EMC': 0,
                        'EMGO': 0,
                        'ENJ': 0,
                        'EOS': 0,
                        'ERO': 0,
                        'ETBS': 0,
                        'ETC': 0,
                        'ETP': 0,
                        'EVX': 0,
                        'EXN': 0,
                        'FRD': 0,
                        'FUEL': 0,
                        'FUN': 0,
                        'FYN': 0,
                        'FYP': 0,
                        'GNO': 0,
                        'GUP': 0,
                        'GVT': 0,
                        'HAC': 0,
                        'HDG': 0,
                        'HGT': 0,
                        'HPC': 0,
                        'HVN': 0,
                        'ICN': 0,
                        'ICO': 0,
                        'ICOS': 0,
                        'IND': 0,
                        'INDI': 0,
                        'ITS': 0,
                        'IXT': 0,
                        'KBR': 0,
                        'KICK': 0,
                        'LA': 0,
                        'LAT': 0,
                        'LIFE': 0,
                        'LRC': 0,
                        'LSK': 0,
                        'LUN': 0,
                        'MAID': 0,
                        'MANA': 0,
                        'MCAP': 0,
                        'MIPS': 0,
                        'MNE': 0,
                        'MSP': 0,
                        'MTH': 0,
                        'MYB': 0,
                        'NDC': 0,
                        'NEBL': 0,
                        'NET': 0,
                        'NTO': 0,
                        'NXC': 0,
                        'NXT': 0,
                        'OAX': 0,
                        'ODN': 0,
                        'OMG': 0,
                        'OPT': 0,
                        'ORME': 0,
                        'OTN': 0,
                        'PAY': 0,
                        'PIX': 0,
                        'PLBT': 0,
                        'PLR': 0,
                        'PLU': 0,
                        'POE': 0,
                        'POLL': 0,
                        'PPT': 0,
                        'PRE': 0,
                        'PRG': 0,
                        'PRO': 0,
                        'PRS': 0,
                        'PTOY': 0,
                        'QAU': 0,
                        'QCN': 0,
                        'QTUM': 0,
                        'QVT': 0,
                        'REP': 0,
                        'RKC': 0,
                        'RVT': 0,
                        'SAN': 0,
                        'SBD': 0,
                        'SCL': 0,
                        'SISA': 0,
                        'SKIN': 0,
                        'SMART': 0,
                        'SMS': 0,
                        'SNC': 0,
                        'SNGLS': 0,
                        'SNM': 0,
                        'SNT': 0,
                        'STEEM': 0,
                        'STRAT': 0,
                        'STU': 0,
                        'STX': 0,
                        'SUB': 0,
                        'SUR': 0,
                        'SWT': 0,
                        'TAAS': 0,
                        'TBT': 0,
                        'TFL': 0,
                        'TIME': 0,
                        'TIX': 0,
                        'TKN': 0,
                        'TKR': 0,
                        'TNT': 0,
                        'TRST': 0,
                        'TRX': 0,
                        'UET': 0,
                        'UGT': 0,
                        'VEN': 0,
                        'VERI': 0,
                        'VIB': 0,
                        'VIBE': 0,
                        'VOISE': 0,
                        'WEALTH': 0,
                        'WINGS': 0,
                        'WTC': 0,
                        'XAUR': 0,
                        'XDN': 0,
                        'XEM': 0,
                        'XUC': 0,
                        'YOYOW': 0,
                        'ZAP': 0,
                        'ZRX': 0,
                        'ZSC': 0,
                    },
                },
            },
            'commonCurrencies': {
                'BCC': 'BCC',
                'BET': 'DAO.Casino',
                'CAT': 'BitClave',
                'DRK': 'DASH',
                'EMGO': 'MGO',
                'GET': 'Themis',
                'LNC': 'LinkerCoin',
                'UNC': 'Unigame',
                'USD': 'USDT',
                'XBT': 'BTC',
            },
            'options': {
                'defaultTimeInForce': 'FOK',
            },
        });
    }

    async fetchMarkets () {
        let markets = await this.publicGetSymbols ();
        let result = [];
        for (let p = 0; p < markets['symbols'].length; p++) {
            let market = markets['symbols'][p];
            let id = market['symbol'];
            let baseId = market['commodity'];
            let quoteId = market['currency'];
            let lot = this.safeFloat (market, 'lot');
            let step = this.safeFloat (market, 'step');
            let base = this.commonCurrencyCode (baseId);
            let quote = this.commonCurrencyCode (quoteId);
            let symbol = base + '/' + quote;
            result.push ({
                'info': market,
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'lot': lot,
                'step': step,
                'active': true,
                'maker': this.safeFloat (market, 'provideLiquidityRate'),
                'taker': this.safeFloat (market, 'takeLiquidityRate'),
                'precision': {
                    'amount': this.precisionFromString (market['lot']),
                    'price': this.precisionFromString (market['step']),
                },
                'limits': {
                    'amount': {
                        'min': lot,
                        'max': undefined,
                    },
                    'price': {
                        'min': step,
                        'max': undefined,
                    },
                    'cost': {
                        'min': undefined,
                        'max': undefined,
                    },
                },
            });
        }
        return result;
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let method = this.safeString (params, 'type', 'trading');
        method += 'GetBalance';
        let query = this.omit (params, 'type');
        let response = await this[method] (query);
        let balances = response['balance'];
        let result = { 'info': balances };
        for (let b = 0; b < balances.length; b++) {
            let balance = balances[b];
            let code = balance['currency_code'];
            let currency = this.commonCurrencyCode (code);
            let free = this.safeFloat (balance, 'cash', 0.0);
            free = this.safeFloat (balance, 'balance', free);
            let used = this.safeFloat (balance, 'reserved', 0.0);
            let account = {
                'free': free,
                'used': used,
                'total': this.sum (free, used),
            };
            result[currency] = account;
        }
        return this.parseBalance (result);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let orderbook = await this.publicGetSymbolOrderbook (this.extend ({
            'symbol': this.marketId (symbol),
        }, params));
        return this.parseOrderBook (orderbook);
    }

    parseTicker (ticker, market = undefined) {
        let timestamp = ticker['timestamp'];
        let symbol = undefined;
        if (market)
            symbol = market['symbol'];
        let last = this.safeFloat (ticker, 'last');
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'high'),
            'low': this.safeFloat (ticker, 'low'),
            'bid': this.safeFloat (ticker, 'bid'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'ask'),
            'askVolume': undefined,
            'vwap': undefined,
            'open': this.safeFloat (ticker, 'open'),
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': undefined,
            'baseVolume': this.safeFloat (ticker, 'volume'),
            'quoteVolume': this.safeFloat (ticker, 'volume_quote'),
            'info': ticker,
        };
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let tickers = await this.publicGetTicker (params);
        let ids = Object.keys (tickers);
        let result = {};
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let market = this.markets_by_id[id];
            let symbol = market['symbol'];
            let ticker = tickers[id];
            result[symbol] = this.parseTicker (ticker, market);
        }
        return result;
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let ticker = await this.publicGetSymbolTicker (this.extend ({
            'symbol': market['id'],
        }, params));
        if ('message' in ticker)
            throw new ExchangeError (this.id + ' ' + ticker['message']);
        return this.parseTicker (ticker, market);
    }

    parseTrade (trade, market = undefined) {
        if (Array.isArray (trade))
            return this.parsePublicTrade (trade, market);
        return this.parseOrderTrade (trade, market);
    }

    parsePublicTrade (trade, market = undefined) {
        let symbol = undefined;
        if (market)
            symbol = market['symbol'];
        return {
            'info': trade,
            'id': trade[0].toString (),
            'timestamp': trade[3],
            'datetime': this.iso8601 (trade[3]),
            'symbol': symbol,
            'type': undefined,
            'side': trade[4],
            'price': parseFloat (trade[1]),
            'amount': parseFloat (trade[2]),
        };
    }

    parseOrderTrade (trade, market = undefined) {
        let symbol = undefined;
        if (market)
            symbol = market['symbol'];
        let amount = this.safeFloat (trade, 'execQuantity');
        if (market)
            amount *= market['lot'];
        let price = this.safeFloat (trade, 'execPrice');
        let cost = price * amount;
        let fee = {
            'cost': this.safeFloat (trade, 'fee'),
            'currency': undefined,
            'rate': undefined,
        };
        let timestamp = trade['timestamp'];
        return {
            'info': trade,
            'id': trade['tradeId'],
            'order': trade['clientOrderId'],
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'type': undefined,
            'side': trade['side'],
            'price': price,
            'amount': amount,
            'cost': cost,
            'fee': fee,
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let response = await this.publicGetSymbolTrades (this.extend ({
            'symbol': market['id'],
            // 'from': 0,
            // 'till': 100,
            // 'by': 'ts', // or by trade_id
            // 'sort': 'desc', // or asc
            // 'start_index': 0,
            // 'max_results': 1000,
            // 'format_item': 'object',
            // 'format_price': 'number',
            // 'format_amount': 'number',
            // 'format_tid': 'string',
            // 'format_timestamp': 'millisecond',
            // 'format_wrap': false,
            'side': 'true',
        }, params));
        return this.parseTrades (response['trades'], market, since, limit);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        // check if amount can be evenly divided into lots
        // they want integer quantity in lot units
        let quantity = parseFloat (amount) / market['lot'];
        let wholeLots = Math.round (quantity);
        let difference = quantity - wholeLots;
        if (Math.abs (difference) > market['step'])
            throw new ExchangeError (this.id + ' order amount should be evenly divisible by lot unit size of ' + market['lot'].toString ());
        let clientOrderId = this.milliseconds ();
        let request = {
            'clientOrderId': clientOrderId.toString (),
            'symbol': market['id'],
            'side': side,
            'quantity': wholeLots.toString (), // quantity in integer lot units
            'type': type,
        };
        if (type === 'limit') {
            request['price'] = this.priceToPrecision (symbol, price);
        } else {
            request['timeInForce'] = this.options['defaultTimeInForce'];
        }
        let response = await this.tradingPostNewOrder (this.extend (request, params));
        let order = this.parseOrder (response['ExecutionReport'], market);
        if (order['status'] === 'rejected')
            throw new InvalidOrder (this.id + ' order was rejected by the exchange ' + this.json (order));
        return order;
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        return await this.tradingPostCancelOrder (this.extend ({
            'clientOrderId': id,
        }, params));
    }

    parseOrderStatus (status) {
        let statuses = {
            'new': 'open',
            'partiallyFilled': 'open',
            'filled': 'closed',
            'canceled': 'canceled',
            'rejected': 'rejected',
            'expired': 'expired',
        };
        return this.safeString (statuses, status);
    }

    parseOrder (order, market = undefined) {
        let timestamp = this.safeInteger (order, 'lastTimestamp');
        if (typeof timestamp === 'undefined')
            timestamp = this.safeInteger (order, 'timestamp');
        let symbol = undefined;
        if (!market)
            market = this.markets_by_id[order['symbol']];
        let status = this.safeString (order, 'orderStatus');
        if (status)
            status = this.parseOrderStatus (status);
        let price = this.safeFloat (order, 'orderPrice');
        price = this.safeFloat (order, 'price', price);
        price = this.safeFloat (order, 'avgPrice', price);
        let amount = this.safeFloat (order, 'orderQuantity');
        amount = this.safeFloat (order, 'quantity', amount);
        let remaining = this.safeFloat (order, 'quantityLeaves');
        remaining = this.safeFloat (order, 'leavesQuantity', remaining);
        let filled = undefined;
        let cost = undefined;
        let amountDefined = (typeof amount !== 'undefined');
        let remainingDefined = (typeof remaining !== 'undefined');
        if (typeof market !== 'undefined') {
            symbol = market['symbol'];
            if (amountDefined)
                amount *= market['lot'];
            if (remainingDefined)
                remaining *= market['lot'];
        } else {
            let marketId = this.safeString (order, 'symbol');
            if (marketId in this.markets_by_id)
                market = this.markets_by_id[marketId];
        }
        if (amountDefined) {
            if (remainingDefined) {
                filled = amount - remaining;
                cost = price * filled;
            }
        }
        let feeCost = this.safeFloat (order, 'fee');
        let feeCurrency = undefined;
        if (typeof market !== 'undefined') {
            symbol = market['symbol'];
            feeCurrency = market['quote'];
        }
        let fee = {
            'cost': feeCost,
            'currency': feeCurrency,
            'rate': undefined,
        };
        return {
            'id': order['clientOrderId'].toString (),
            'info': order,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'status': status,
            'symbol': symbol,
            'type': order['type'],
            'side': order['side'],
            'price': price,
            'cost': cost,
            'amount': amount,
            'filled': filled,
            'remaining': remaining,
            'fee': fee,
        };
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let response = await this.tradingGetOrder (this.extend ({
            'clientOrderId': id,
        }, params));
        if (response['orders'][0]) {
            return this.parseOrder (response['orders'][0]);
        }
        throw new OrderNotFound (this.id + ' fetchOrder() error: ' + this.response);
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let statuses = [ 'new', 'partiallyFiiled' ];
        let market = undefined;
        let request = {
            'sort': 'desc',
            'statuses': statuses.join (','),
        };
        if (typeof symbol !== 'undefined') {
            market = this.market (symbol);
            request['symbols'] = market['id'];
        }
        let response = await this.tradingGetOrdersActive (this.extend (request, params));
        return this.parseOrders (response['orders'], market, since, limit);
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        let statuses = [ 'filled', 'canceled', 'rejected', 'expired' ];
        let request = {
            'sort': 'desc',
            'statuses': statuses.join (','),
            'max_results': 1000,
        };
        if (typeof symbol !== 'undefined') {
            market = this.market (symbol);
            request['symbols'] = market['id'];
        }
        let response = await this.tradingGetOrdersRecent (this.extend (request, params));
        return this.parseOrders (response['orders'], market, since, limit);
    }

    async fetchOrderTrades (id, symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        if (typeof symbol !== 'undefined')
            market = this.market (symbol);
        let response = await this.tradingGetTradesByOrder (this.extend ({
            'clientOrderId': id,
        }, params));
        return this.parseTrades (response['trades'], market, since, limit);
    }

    async withdraw (code, amount, address, tag = undefined, params = {}) {
        this.checkAddress (address);
        await this.loadMarkets ();
        let currency = this.currency (code);
        let request = {
            'currency_code': currency['id'],
            'amount': amount,
            'address': address,
        };
        if (tag)
            request['paymentId'] = tag;
        let response = await this.paymentPostPayout (this.extend (request, params));
        return {
            'info': response,
            'id': response['transaction'],
        };
    }

    nonce () {
        return this.milliseconds ();
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = '/' + 'api' + '/' + this.version + '/' + api + '/' + this.implodeParams (path, params);
        let query = this.omit (params, this.extractParams (path));
        if (api === 'public') {
            if (Object.keys (query).length)
                url += '?' + this.urlencode (query);
        } else {
            this.checkRequiredCredentials ();
            let nonce = this.nonce ();
            let payload = { 'nonce': nonce, 'apikey': this.apiKey };
            query = this.extend (payload, query);
            if (method === 'GET')
                url += '?' + this.urlencode (query);
            else
                url += '?' + this.urlencode (payload);
            let auth = url;
            if (method === 'POST') {
                if (Object.keys (query).length) {
                    body = this.urlencode (query);
                    auth += body;
                }
            }
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Signature': this.hmac (this.encode (auth), this.encode (this.secret), 'sha512').toLowerCase (),
            };
        }
        url = this.urls['api'] + url;
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    async request (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let response = await this.fetch2 (path, api, method, params, headers, body);
        if ('code' in response) {
            if ('ExecutionReport' in response) {
                if (response['ExecutionReport']['orderRejectReason'] === 'orderExceedsLimit')
                    throw new InsufficientFunds (this.id + ' ' + this.json (response));
            }
            throw new ExchangeError (this.id + ' ' + this.json (response));
        }
        return response;
    }
};

},{"./base/Exchange":3,"./base/errors":5}],23:[function(require,module,exports){
'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class huobi extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'huobi',
            'name': 'Huobi',
            'countries': [ 'CN' ],
            'rateLimit': 2000,
            'version': 'v3',
            'has': {
                'CORS': false,
                'fetchOHLCV': true,
            },
            'timeframes': {
                '1m': '001',
                '5m': '005',
                '15m': '015',
                '30m': '030',
                '1h': '060',
                '1d': '100',
                '1w': '200',
                '1M': '300',
                '1y': '400',
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/27766569-15aa7b9a-5edd-11e7-9e7f-44791f4ee49c.jpg',
                'api': 'http://api.huobi.com',
                'www': 'https://www.huobi.com',
                'doc': 'https://github.com/huobiapi/API_Docs_en/wiki',
            },
            'api': {
                'staticmarket': {
                    'get': [
                        '{id}_kline_{period}',
                        'ticker_{id}',
                        'depth_{id}',
                        'depth_{id}_{length}',
                        'detail_{id}',
                    ],
                },
                'usdmarket': {
                    'get': [
                        '{id}_kline_{period}',
                        'ticker_{id}',
                        'depth_{id}',
                        'depth_{id}_{length}',
                        'detail_{id}',
                    ],
                },
                'trade': {
                    'post': [
                        'get_account_info',
                        'get_orders',
                        'order_info',
                        'buy',
                        'sell',
                        'buy_market',
                        'sell_market',
                        'cancel_order',
                        'get_new_deal_orders',
                        'get_order_id_by_trade_id',
                        'withdraw_coin',
                        'cancel_withdraw_coin',
                        'get_withdraw_coin_result',
                        'transfer',
                        'loan',
                        'repayment',
                        'get_loan_available',
                        'get_loans',
                    ],
                },
            },
            'markets': {
                'BTC/CNY': { 'id': 'btc', 'symbol': 'BTC/CNY', 'base': 'BTC', 'quote': 'CNY', 'type': 'staticmarket', 'coinType': 1 },
                'LTC/CNY': { 'id': 'ltc', 'symbol': 'LTC/CNY', 'base': 'LTC', 'quote': 'CNY', 'type': 'staticmarket', 'coinType': 2 },
                // 'BTC/USD': { 'id': 'btc', 'symbol': 'BTC/USD', 'base': 'BTC', 'quote': 'USD', 'type': 'usdmarket',    'coinType': 1 },
            },
        });
    }

    async fetchBalance (params = {}) {
        let balances = await this.tradePostGetAccountInfo ();
        let result = { 'info': balances };
        let currencies = Object.keys (this.currencies);
        for (let i = 0; i < currencies.length; i++) {
            let currency = currencies[i];
            let lowercase = currency.toLowerCase ();
            let account = this.account ();
            let available = 'available_' + lowercase + '_display';
            let frozen = 'frozen_' + lowercase + '_display';
            let loan = 'loan_' + lowercase + '_display';
            if (available in balances)
                account['free'] = parseFloat (balances[available]);
            if (frozen in balances)
                account['used'] = parseFloat (balances[frozen]);
            if (loan in balances)
                account['used'] = this.sum (account['used'], parseFloat (balances[loan]));
            account['total'] = this.sum (account['free'], account['used']);
            result[currency] = account;
        }
        return this.parseBalance (result);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        let market = this.market (symbol);
        let method = market['type'] + 'GetDepthId';
        let orderbook = await this[method] (this.extend ({ 'id': market['id'] }, params));
        return this.parseOrderBook (orderbook);
    }

    async fetchTicker (symbol, params = {}) {
        let market = this.market (symbol);
        let method = market['type'] + 'GetTickerId';
        let response = await this[method] (this.extend ({
            'id': market['id'],
        }, params));
        let ticker = response['ticker'];
        let timestamp = parseInt (response['time']) * 1000;
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'high'),
            'low': this.safeFloat (ticker, 'low'),
            'bid': this.safeFloat (ticker, 'buy'),
            'ask': this.safeFloat (ticker, 'sell'),
            'vwap': undefined,
            'open': this.safeFloat (ticker, 'open'),
            'close': undefined,
            'first': undefined,
            'last': this.safeFloat (ticker, 'last'),
            'change': undefined,
            'percentage': undefined,
            'average': undefined,
            'baseVolume': undefined,
            'quoteVolume': this.safeFloat (ticker, 'vol'),
            'info': ticker,
        };
    }

    parseTrade (trade, market) {
        let timestamp = trade['ts'];
        return {
            'info': trade,
            'id': trade['id'].toString (),
            'order': undefined,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': market['symbol'],
            'type': undefined,
            'side': trade['direction'],
            'price': trade['price'],
            'amount': trade['amount'],
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        let market = this.market (symbol);
        let method = market['type'] + 'GetDetailId';
        let response = await this[method] (this.extend ({
            'id': market['id'],
        }, params));
        return this.parseTrades (response['trades'], market, since, limit);
    }

    parseOHLCV (ohlcv, market = undefined, timeframe = '1m', since = undefined, limit = undefined) {
        // not implemented yet
        return [
            ohlcv[0],
            ohlcv[1],
            ohlcv[2],
            ohlcv[3],
            ohlcv[4],
            ohlcv[6],
        ];
    }

    async fetchOHLCV (symbol, timeframe = '1m', since = undefined, limit = undefined, params = {}) {
        let market = this.market (symbol);
        let method = market['type'] + 'GetIdKlinePeriod';
        let ohlcvs = await this[method] (this.extend ({
            'id': market['id'],
            'period': this.timeframes[timeframe],
        }, params));
        return ohlcvs;
        // return this.parseOHLCVs (ohlcvs, market, timeframe, since, limit);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        let market = this.market (symbol);
        let method = 'tradePost' + this.capitalize (side);
        let order = {
            'coin_type': market['coinType'],
            'amount': amount,
            'market': market['quote'].toLowerCase (),
        };
        if (type === 'limit')
            order['price'] = price;
        else
            method += this.capitalize (type);
        let response = this[method] (this.extend (order, params));
        return {
            'info': response,
            'id': response['id'],
        };
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        return await this.tradePostCancelOrder ({ 'id': id });
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'];
        if (api === 'trade') {
            this.checkRequiredCredentials ();
            url += '/api' + this.version;
            let query = this.keysort (this.extend ({
                'method': path,
                'access_key': this.apiKey,
                'created': this.nonce (),
            }, params));
            let queryString = this.urlencode (this.omit (query, 'market'));
            // secret key must be appended to the query before signing
            queryString += '&secret_key=' + this.secret;
            query['sign'] = this.hash (this.encode (queryString));
            body = this.urlencode (query);
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
            };
        } else {
            url += '/' + api + '/' + this.implodeParams (path, params) + '_json.js';
            let query = this.omit (params, this.extractParams (path));
            if (Object.keys (query).length)
                url += '?' + this.urlencode (query);
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    async request (path, api = 'trade', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let response = await this.fetch2 (path, api, method, params, headers, body);
        if ('status' in response)
            if (response['status'] === 'error')
                throw new ExchangeError (this.id + ' ' + this.json (response));
        if ('code' in response)
            throw new ExchangeError (this.id + ' ' + this.json (response));
        return response;
    }
};

},{"./base/Exchange":3,"./base/errors":5}],24:[function(require,module,exports){
'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeNotAvailable, ExchangeError, OrderNotFound, DDoSProtection, InvalidNonce, InsufficientFunds, CancelPending, InvalidOrder, InvalidAddress } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class kraken extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'kraken',
            'name': 'Kraken',
            'countries': [ 'US' ],
            'version': '0',
            'rateLimit': 3000,
            'has': {
                'createDepositAddress': true,
                'fetchDepositAddress': true,
                'fetchTradingFees': true,
                'CORS': false,
                'fetchCurrencies': true,
                'fetchTickers': true,
                'fetchOHLCV': true,
                'fetchOrder': true,
                'fetchOpenOrders': true,
                'fetchClosedOrders': true,
                'fetchMyTrades': true,
                'withdraw': true,
            },
            'marketsByAltname': {},
            'timeframes': {
                '1m': '1',
                '5m': '5',
                '15m': '15',
                '30m': '30',
                '1h': '60',
                '4h': '240',
                '1d': '1440',
                '1w': '10080',
                '2w': '21600',
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/27766599-22709304-5ede-11e7-9de1-9f33732e1509.jpg',
                'api': {
                    'public': 'https://api.kraken.com',
                    'private': 'https://api.kraken.com',
                    'zendesk': 'https://support.kraken.com/hc/en-us/articles',
                },
                'www': 'https://www.kraken.com',
                'doc': [
                    'https://www.kraken.com/en-us/help/api',
                    'https://github.com/nothingisdead/npm-kraken-api',
                ],
                'fees': 'https://www.kraken.com/en-us/help/fees',
            },
            'fees': {
                'trading': {
                    'tierBased': true,
                    'percentage': true,
                    'taker': 0.26 / 100,
                    'maker': 0.16 / 100,
                    'tiers': {
                        'taker': [
                            [0, 0.0026],
                            [50000, 0.0024],
                            [100000, 0.0022],
                            [250000, 0.0020],
                            [500000, 0.0018],
                            [1000000, 0.0016],
                            [2500000, 0.0014],
                            [5000000, 0.0012],
                            [10000000, 0.0001],
                        ],
                        'maker': [
                            [0, 0.0016],
                            [50000, 0.0014],
                            [100000, 0.0012],
                            [250000, 0.0010],
                            [500000, 0.0008],
                            [1000000, 0.0006],
                            [2500000, 0.0004],
                            [5000000, 0.0002],
                            [10000000, 0.0],
                        ],
                    },
                },
                // this is a bad way of hardcoding fees that change on daily basis
                // hardcoding is now considered obsolete, we will remove all of it eventually
                'funding': {
                    'tierBased': false,
                    'percentage': false,
                    'withdraw': {
                        'BTC': 0.001,
                        'ETH': 0.005,
                        'XRP': 0.02,
                        'XLM': 0.00002,
                        'LTC': 0.02,
                        'DOGE': 2,
                        'ZEC': 0.00010,
                        'ICN': 0.02,
                        'REP': 0.01,
                        'ETC': 0.005,
                        'MLN': 0.003,
                        'XMR': 0.05,
                        'DASH': 0.005,
                        'GNO': 0.01,
                        'EOS': 0.5,
                        'BCH': 0.001,
                        'USD': 5, // if domestic wire
                        'EUR': 5, // if domestic wire
                        'CAD': 10, // CAD EFT Withdrawal
                        'JPY': 300, // if domestic wire
                    },
                    'deposit': {
                        'BTC': 0,
                        'ETH': 0,
                        'XRP': 0,
                        'XLM': 0,
                        'LTC': 0,
                        'DOGE': 0,
                        'ZEC': 0,
                        'ICN': 0,
                        'REP': 0,
                        'ETC': 0,
                        'MLN': 0,
                        'XMR': 0,
                        'DASH': 0,
                        'GNO': 0,
                        'EOS': 0,
                        'BCH': 0,
                        'USD': 5, // if domestic wire
                        'EUR': 0, // free deposit if EUR SEPA Deposit
                        'CAD': 5, // if domestic wire
                        'JPY': 0, // Domestic Deposit (Free, ¥5,000 deposit minimum)
                    },
                },
            },
            'api': {
                'zendesk': {
                    'get': [
                        // we should really refrain from putting fixed fee numbers and stop hardcoding
                        // we will be using their web APIs to scrape all numbers from these articles
                        '205893708-What-is-the-minimum-order-size-',
                        '201396777-What-are-the-deposit-fees-',
                        '201893608-What-are-the-withdrawal-fees-',
                    ],
                },
                'public': {
                    'get': [
                        'Assets',
                        'AssetPairs',
                        'Depth',
                        'OHLC',
                        'Spread',
                        'Ticker',
                        'Time',
                        'Trades',
                    ],
                },
                'private': {
                    'post': [
                        'AddOrder',
                        'Balance',
                        'CancelOrder',
                        'ClosedOrders',
                        'DepositAddresses',
                        'DepositMethods',
                        'DepositStatus',
                        'Ledgers',
                        'OpenOrders',
                        'OpenPositions',
                        'QueryLedgers',
                        'QueryOrders',
                        'QueryTrades',
                        'TradeBalance',
                        'TradesHistory',
                        'TradeVolume',
                        'Withdraw',
                        'WithdrawCancel',
                        'WithdrawInfo',
                        'WithdrawStatus',
                    ],
                },
            },
            'options': {
                'cacheDepositMethodsOnFetchDepositAddress': true, // will issue up to two calls in fetchDepositAddress
                'depositMethods': {},
            },
            'exceptions': {
                'EFunding:Unknown withdraw key': ExchangeError,
                'EFunding:Invalid amount': InsufficientFunds,
                'EService:Unavailable': ExchangeNotAvailable,
                'EDatabase:Internal error': ExchangeNotAvailable,
                'EService:Busy': ExchangeNotAvailable,
                'EAPI:Rate limit exceeded': DDoSProtection,
                'EQuery:Unknown asset': ExchangeError,
                'EGeneral:Internal error': ExchangeNotAvailable,
            },
        });
    }

    costToPrecision (symbol, cost) {
        return this.truncate (parseFloat (cost), this.markets[symbol]['precision']['price']);
    }

    feeToPrecision (symbol, fee) {
        return this.truncate (parseFloat (fee), this.markets[symbol]['precision']['amount']);
    }

    async fetchMinOrderSizes () {
        let html = undefined;
        try {
            this.parseJsonResponse = false;
            html = await this.zendeskGet205893708WhatIsTheMinimumOrderSize ();
            this.parseJsonResponse = true;
        } catch (e) {
            // ensure parseJsonResponse is restored no matter what
            this.parseJsonResponse = true;
            throw e;
        }
        let parts = html.split ('ul>');
        let ul = parts[1];
        let listItems = ul.split ('</li');
        let result = {};
        const separator = '):' + ' ';
        for (let l = 0; l < listItems.length; l++) {
            let listItem = listItems[l];
            let chunks = listItem.split (separator);
            let numChunks = chunks.length;
            if (numChunks > 1) {
                let limit = parseFloat (chunks[1]);
                let name = chunks[0];
                chunks = name.split ('(');
                let currency = chunks[1];
                result[currency] = limit;
            }
        }
        return result;
    }

    async fetchMarkets () {
        let markets = await this.publicGetAssetPairs ();
        let limits = await this.fetchMinOrderSizes ();
        let keys = Object.keys (markets['result']);
        let result = [];
        for (let i = 0; i < keys.length; i++) {
            let id = keys[i];
            let market = markets['result'][id];
            let baseId = market['base'];
            let quoteId = market['quote'];
            let base = baseId;
            let quote = quoteId;
            if ((base[0] === 'X') || (base[0] === 'Z'))
                base = base.slice (1);
            if ((quote[0] === 'X') || (quote[0] === 'Z'))
                quote = quote.slice (1);
            base = this.commonCurrencyCode (base);
            quote = this.commonCurrencyCode (quote);
            let darkpool = id.indexOf ('.d') >= 0;
            let symbol = darkpool ? market['altname'] : (base + '/' + quote);
            let maker = undefined;
            if ('fees_maker' in market) {
                maker = parseFloat (market['fees_maker'][0][1]) / 100;
            }
            let precision = {
                'amount': market['lot_decimals'],
                'price': market['pair_decimals'],
            };
            let minAmount = Math.pow (10, -precision['amount']);
            if (base in limits)
                minAmount = limits[base];
            result.push ({
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'darkpool': darkpool,
                'info': market,
                'altname': market['altname'],
                'maker': maker,
                'taker': parseFloat (market['fees'][0][1]) / 100,
                'active': true,
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': minAmount,
                        'max': Math.pow (10, precision['amount']),
                    },
                    'price': {
                        'min': Math.pow (10, -precision['price']),
                        'max': undefined,
                    },
                    'cost': {
                        'min': 0,
                        'max': undefined,
                    },
                },
            });
        }
        result = this.appendInactiveMarkets (result);
        this.marketsByAltname = this.indexBy (result, 'altname');
        return result;
    }

    appendInactiveMarkets (result) {
        // result should be an array to append to
        let precision = { 'amount': 8, 'price': 8 };
        let costLimits = { 'min': 0, 'max': undefined };
        let priceLimits = { 'min': Math.pow (10, -precision['price']), 'max': undefined };
        let amountLimits = { 'min': Math.pow (10, -precision['amount']), 'max': Math.pow (10, precision['amount']) };
        let limits = { 'amount': amountLimits, 'price': priceLimits, 'cost': costLimits };
        let defaults = {
            'darkpool': false,
            'info': undefined,
            'maker': undefined,
            'taker': undefined,
            'active': false,
            'precision': precision,
            'limits': limits,
        };
        let markets = [
            // { 'id': 'XXLMZEUR', 'symbol': 'XLM/EUR', 'base': 'XLM', 'quote': 'EUR', 'altname': 'XLMEUR' },
        ];
        for (let i = 0; i < markets.length; i++) {
            result.push (this.extend (defaults, markets[i]));
        }
        return result;
    }

    async fetchCurrencies (params = {}) {
        let response = await this.publicGetAssets (params);
        let currencies = response['result'];
        let ids = Object.keys (currencies);
        let result = {};
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let currency = currencies[id];
            // todo: will need to rethink the fees
            // to add support for multiple withdrawal/deposit methods and
            // differentiated fees for each particular method
            let code = this.commonCurrencyCode (currency['altname']);
            let precision = currency['decimals'];
            result[code] = {
                'id': id,
                'code': code,
                'info': currency,
                'name': code,
                'active': true,
                'fee': undefined,
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': Math.pow (10, -precision),
                        'max': Math.pow (10, precision),
                    },
                    'price': {
                        'min': Math.pow (10, -precision),
                        'max': Math.pow (10, precision),
                    },
                    'cost': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'withdraw': {
                        'min': undefined,
                        'max': Math.pow (10, precision),
                    },
                },
            };
        }
        return result;
    }

    async fetchTradingFees (params = {}) {
        await this.loadMarkets ();
        this.checkRequiredCredentials ();
        let response = await this.privatePostTradeVolume (params);
        let tradedVolume = this.safeFloat (response['result'], 'volume');
        let tiers = this.fees['trading']['tiers'];
        let taker = tiers['taker'][1];
        let maker = tiers['maker'][1];
        for (let i = 0; i < tiers['taker'].length; i++) {
            if (tradedVolume >= tiers['taker'][i][0])
                taker = tiers['taker'][i][1];
        }
        for (let i = 0; i < tiers['maker'].length; i++) {
            if (tradedVolume >= tiers['maker'][i][0])
                maker = tiers['maker'][i][1];
        }
        return {
            'info': response,
            'maker': maker,
            'taker': taker,
        };
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        if (market['darkpool'])
            throw new ExchangeError (this.id + ' does not provide an order book for darkpool symbol ' + symbol);
        let request = {
            'pair': market['id'],
        };
        if (typeof limit !== 'undefined')
            request['count'] = limit; // 100
        let response = await this.publicGetDepth (this.extend (request, params));
        let orderbook = response['result'][market['id']];
        return this.parseOrderBook (orderbook);
    }

    parseTicker (ticker, market = undefined) {
        let timestamp = this.milliseconds ();
        let symbol = undefined;
        if (market)
            symbol = market['symbol'];
        let baseVolume = parseFloat (ticker['v'][1]);
        let vwap = parseFloat (ticker['p'][1]);
        let quoteVolume = baseVolume * vwap;
        let last = parseFloat (ticker['c'][0]);
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': parseFloat (ticker['h'][1]),
            'low': parseFloat (ticker['l'][1]),
            'bid': parseFloat (ticker['b'][0]),
            'bidVolume': undefined,
            'ask': parseFloat (ticker['a'][0]),
            'askVolume': undefined,
            'vwap': vwap,
            'open': this.safeFloat (ticker, 'o'),
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': undefined,
            'baseVolume': baseVolume,
            'quoteVolume': quoteVolume,
            'info': ticker,
        };
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let pairs = [];
        for (let s = 0; s < this.symbols.length; s++) {
            let symbol = this.symbols[s];
            let market = this.markets[symbol];
            if (market['active'])
                if (!market['darkpool'])
                    pairs.push (market['id']);
        }
        let filter = pairs.join (',');
        let response = await this.publicGetTicker (this.extend ({
            'pair': filter,
        }, params));
        let tickers = response['result'];
        let ids = Object.keys (tickers);
        let result = {};
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let market = this.markets_by_id[id];
            let symbol = market['symbol'];
            let ticker = tickers[id];
            result[symbol] = this.parseTicker (ticker, market);
        }
        return result;
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        let darkpool = symbol.indexOf ('.d') >= 0;
        if (darkpool)
            throw new ExchangeError (this.id + ' does not provide a ticker for darkpool symbol ' + symbol);
        let market = this.market (symbol);
        let response = await this.publicGetTicker (this.extend ({
            'pair': market['id'],
        }, params));
        let ticker = response['result'][market['id']];
        return this.parseTicker (ticker, market);
    }

    parseOHLCV (ohlcv, market = undefined, timeframe = '1m', since = undefined, limit = undefined) {
        return [
            ohlcv[0] * 1000,
            parseFloat (ohlcv[1]),
            parseFloat (ohlcv[2]),
            parseFloat (ohlcv[3]),
            parseFloat (ohlcv[4]),
            parseFloat (ohlcv[6]),
        ];
    }

    async fetchOHLCV (symbol, timeframe = '1m', since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'pair': market['id'],
            'interval': this.timeframes[timeframe],
        };
        if (typeof since !== 'undefined')
            request['since'] = parseInt (since / 1000);
        let response = await this.publicGetOHLC (this.extend (request, params));
        let ohlcvs = response['result'][market['id']];
        return this.parseOHLCVs (ohlcvs, market, timeframe, since, limit);
    }

    parseTrade (trade, market = undefined) {
        let timestamp = undefined;
        let side = undefined;
        let type = undefined;
        let price = undefined;
        let amount = undefined;
        let id = undefined;
        let order = undefined;
        let fee = undefined;
        if (!market)
            market = this.findMarketByAltnameOrId (trade['pair']);
        if ('ordertxid' in trade) {
            order = trade['ordertxid'];
            id = trade['id'];
            timestamp = parseInt (trade['time'] * 1000);
            side = trade['type'];
            type = trade['ordertype'];
            price = this.safeFloat (trade, 'price');
            amount = this.safeFloat (trade, 'vol');
            if ('fee' in trade) {
                let currency = undefined;
                if (market)
                    currency = market['quote'];
                fee = {
                    'cost': this.safeFloat (trade, 'fee'),
                    'currency': currency,
                };
            }
        } else {
            timestamp = parseInt (trade[2] * 1000);
            side = (trade[3] === 's') ? 'sell' : 'buy';
            type = (trade[4] === 'l') ? 'limit' : 'market';
            price = parseFloat (trade[0]);
            amount = parseFloat (trade[1]);
            let tradeLength = trade.length;
            if (tradeLength > 6)
                id = trade[6]; // artificially added as per #1794
        }
        let symbol = (market) ? market['symbol'] : undefined;
        return {
            'id': id,
            'order': order,
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'type': type,
            'side': side,
            'price': price,
            'amount': amount,
            'cost': price * amount,
            'fee': fee,
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let id = market['id'];
        let response = await this.publicGetTrades (this.extend ({
            'pair': id,
        }, params));
        // { result: { marketid: [ ... trades ] }, last: "last_trade_id"}
        let result = response['result'];
        let trades = result[id];
        // trades is a sorted array: last (most recent trade) goes last
        let length = trades.length;
        if (length <= 0)
            return [];
        let lastTrade = trades[length - 1];
        let lastTradeId = this.safeString (result, 'last');
        lastTrade.push (lastTradeId);
        return this.parseTrades (trades, market, since, limit);
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let response = await this.privatePostBalance ();
        let balances = this.safeValue (response, 'result');
        if (typeof balances === 'undefined')
            throw new ExchangeNotAvailable (this.id + ' fetchBalance failed due to a malformed response ' + this.json (response));
        let result = { 'info': balances };
        let currencies = Object.keys (balances);
        for (let c = 0; c < currencies.length; c++) {
            let currency = currencies[c];
            let code = currency;
            if (code in this.currencies_by_id) {
                code = this.currencies_by_id[code]['code'];
            } else {
                // X-ISO4217-A3 standard currency codes
                if (code[0] === 'X') {
                    code = code.slice (1);
                } else if (code[0] === 'Z') {
                    code = code.slice (1);
                }
                code = this.commonCurrencyCode (code);
            }
            let balance = parseFloat (balances[currency]);
            let account = {
                'free': balance,
                'used': 0.0,
                'total': balance,
            };
            result[code] = account;
        }
        return this.parseBalance (result);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let order = {
            'pair': market['id'],
            'type': side,
            'ordertype': type,
            'volume': this.amountToPrecision (symbol, amount),
        };
        let priceIsDefined = (typeof price !== 'undefined');
        let marketOrder = (type === 'market');
        let limitOrder = (type === 'limit');
        let shouldIncludePrice = limitOrder || (!marketOrder && priceIsDefined);
        if (shouldIncludePrice) {
            order['price'] = this.priceToPrecision (symbol, price);
        }
        let response = await this.privatePostAddOrder (this.extend (order, params));
        let id = this.safeValue (response['result'], 'txid');
        if (typeof id !== 'undefined') {
            if (Array.isArray (id)) {
                let length = id.length;
                id = (length > 1) ? id : id[0];
            }
        }
        return {
            'info': response,
            'id': id,
        };
    }

    findMarketByAltnameOrId (id) {
        if (id in this.marketsByAltname) {
            return this.marketsByAltname[id];
        } else if (id in this.markets_by_id) {
            return this.markets_by_id[id];
        }
        return undefined;
    }

    parseOrder (order, market = undefined) {
        let description = order['descr'];
        let side = description['type'];
        let type = description['ordertype'];
        let symbol = undefined;
        if (typeof market === 'undefined')
            market = this.findMarketByAltnameOrId (description['pair']);
        let timestamp = parseInt (order['opentm'] * 1000);
        let amount = this.safeFloat (order, 'vol');
        let filled = this.safeFloat (order, 'vol_exec');
        let remaining = amount - filled;
        let fee = undefined;
        let cost = this.safeFloat (order, 'cost');
        let price = this.safeFloat (description, 'price');
        if ((typeof price === 'undefined') || (price === 0))
            price = this.safeFloat (description, 'price2');
        if ((typeof price === 'undefined') || (price === 0))
            price = this.safeFloat (order, 'price', price);
        if (typeof market !== 'undefined') {
            symbol = market['symbol'];
            if ('fee' in order) {
                let flags = order['oflags'];
                let feeCost = this.safeFloat (order, 'fee');
                fee = {
                    'cost': feeCost,
                    'rate': undefined,
                };
                if (flags.indexOf ('fciq') >= 0) {
                    fee['currency'] = market['quote'];
                } else if (flags.indexOf ('fcib') >= 0) {
                    fee['currency'] = market['base'];
                }
            }
        }
        return {
            'id': order['id'],
            'info': order,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'status': order['status'],
            'symbol': symbol,
            'type': type,
            'side': side,
            'price': price,
            'cost': cost,
            'amount': amount,
            'filled': filled,
            'remaining': remaining,
            'fee': fee,
            // 'trades': this.parseTrades (order['trades'], market),
        };
    }

    parseOrders (orders, market = undefined, since = undefined, limit = undefined) {
        let result = [];
        let ids = Object.keys (orders);
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let order = this.extend ({ 'id': id }, orders[id]);
            result.push (this.parseOrder (order, market));
        }
        return this.filterBySinceLimit (result, since, limit);
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let response = await this.privatePostQueryOrders (this.extend ({
            'trades': true, // whether or not to include trades in output (optional, default false)
            'txid': id, // comma delimited list of transaction ids to query info about (20 maximum)
            // 'userref': 'optional', // restrict results to given user reference id (optional)
        }, params));
        let orders = response['result'];
        let order = this.parseOrder (this.extend ({ 'id': id }, orders[id]));
        return this.extend ({ 'info': response }, order);
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {
            // 'type': 'all', // any position, closed position, closing position, no position
            // 'trades': false, // whether or not to include trades related to position in output
            // 'start': 1234567890, // starting unix timestamp or trade tx id of results (exclusive)
            // 'end': 1234567890, // ending unix timestamp or trade tx id of results (inclusive)
            // 'ofs' = result offset
        };
        if (typeof since !== 'undefined')
            request['start'] = parseInt (since / 1000);
        let response = await this.privatePostTradesHistory (this.extend (request, params));
        let trades = response['result']['trades'];
        let ids = Object.keys (trades);
        for (let i = 0; i < ids.length; i++) {
            trades[ids[i]]['id'] = ids[i];
        }
        let result = this.parseTrades (trades, undefined, since, limit);
        if (typeof symbol === 'undefined')
            return result;
        return this.filterBySymbol (result, symbol);
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let response = undefined;
        try {
            response = await this.privatePostCancelOrder (this.extend ({
                'txid': id,
            }, params));
        } catch (e) {
            if (this.last_http_response)
                if (this.last_http_response.indexOf ('EOrder:Unknown order') >= 0)
                    throw new OrderNotFound (this.id + ' cancelOrder() error ' + this.last_http_response);
            throw e;
        }
        return response;
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {};
        if (typeof since !== 'undefined')
            request['start'] = parseInt (since / 1000);
        let response = await this.privatePostOpenOrders (this.extend (request, params));
        let orders = this.parseOrders (response['result']['open'], undefined, since, limit);
        if (typeof symbol === 'undefined')
            return orders;
        return this.filterBySymbol (orders, symbol);
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {};
        if (typeof since !== 'undefined')
            request['start'] = parseInt (since / 1000);
        let response = await this.privatePostClosedOrders (this.extend (request, params));
        let orders = this.parseOrders (response['result']['closed'], undefined, since, limit);
        if (typeof symbol === 'undefined')
            return orders;
        return this.filterBySymbol (orders, symbol);
    }

    async fetchDepositMethods (code, params = {}) {
        await this.loadMarkets ();
        let currency = this.currency (code);
        let response = await this.privatePostDepositMethods (this.extend ({
            'asset': currency['id'],
        }, params));
        return response['result'];
    }

    async createDepositAddress (code, params = {}) {
        let request = {
            'new': 'true',
        };
        let response = await this.fetchDepositAddress (code, this.extend (request, params));
        let address = this.safeString (response, 'address');
        this.checkAddress (address);
        return {
            'currency': code,
            'address': address,
            'info': response,
        };
    }

    async fetchDepositAddress (code, params = {}) {
        await this.loadMarkets ();
        let currency = this.currency (code);
        // eslint-disable-next-line quotes
        let method = this.safeString (params, 'method');
        if (typeof method === 'undefined') {
            if (this.options['cacheDepositMethodsOnFetchDepositAddress']) {
                // cache depositMethods
                if (!(code in this.options['depositMethods']))
                    this.options['depositMethods'][code] = await this.fetchDepositMethods (code);
                method = this.options['depositMethods'][code][0]['method'];
            } else {
                throw new ExchangeError (this.id + ' fetchDepositAddress() requires an extra `method` parameter. Use fetchDepositMethods ("' + code + '") to get a list of available deposit methods or enable the exchange property .options["cacheDepositMethodsOnFetchDepositAddress"] = true');
            }
        }
        let request = {
            'asset': currency['id'],
            'method': method,
        };
        let response = await this.privatePostDepositAddresses (this.extend (request, params)); // overwrite methods
        let result = response['result'];
        let numResults = result.length;
        if (numResults < 1)
            throw new InvalidAddress (this.id + ' privatePostDepositAddresses() returned no addresses');
        let address = this.safeString (result[0], 'address');
        this.checkAddress (address);
        return {
            'currency': code,
            'address': address,
            'info': response,
        };
    }

    async withdraw (currency, amount, address, tag = undefined, params = {}) {
        this.checkAddress (address);
        if ('key' in params) {
            await this.loadMarkets ();
            let response = await this.privatePostWithdraw (this.extend ({
                'asset': currency,
                'amount': amount,
                // 'address': address, // they don't allow withdrawals to direct addresses
            }, params));
            return {
                'info': response,
                'id': response['result'],
            };
        }
        throw new ExchangeError (this.id + " withdraw requires a 'key' parameter (withdrawal key name, as set up on your account)");
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = '/' + this.version + '/' + api + '/' + path;
        if (api === 'public') {
            if (Object.keys (params).length)
                url += '?' + this.urlencode (params);
        } else if (api === 'private') {
            this.checkRequiredCredentials ();
            let nonce = this.nonce ().toString ();
            body = this.urlencode (this.extend ({ 'nonce': nonce }, params));
            let auth = this.encode (nonce + body);
            let hash = this.hash (auth, 'sha256', 'binary');
            let binary = this.stringToBinary (this.encode (url));
            let binhash = this.binaryConcat (binary, hash);
            let secret = this.base64ToBinary (this.secret);
            let signature = this.hmac (binhash, secret, 'sha512', 'base64');
            headers = {
                'API-Key': this.apiKey,
                'API-Sign': this.decode (signature),
                'Content-Type': 'application/x-www-form-urlencoded',
            };
        } else {
            url = '/' + path;
        }
        url = this.urls['api'][api] + url;
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    nonce () {
        return this.milliseconds ();
    }

    handleErrors (code, reason, url, method, headers, body) {
        if (body.indexOf ('Invalid order') >= 0)
            throw new InvalidOrder (this.id + ' ' + body);
        if (body.indexOf ('Invalid nonce') >= 0)
            throw new InvalidNonce (this.id + ' ' + body);
        if (body.indexOf ('Insufficient funds') >= 0)
            throw new InsufficientFunds (this.id + ' ' + body);
        if (body.indexOf ('Cancel pending') >= 0)
            throw new CancelPending (this.id + ' ' + body);
        if (body.indexOf ('Invalid arguments:volume') >= 0)
            throw new InvalidOrder (this.id + ' ' + body);
        if (body[0] === '{') {
            let response = JSON.parse (body);
            if (typeof response !== 'string') {
                if ('error' in response) {
                    let numErrors = response['error'].length;
                    if (numErrors) {
                        let message = this.id + ' ' + this.json (response);
                        for (let i = 0; i < response['error'].length; i++) {
                            if (response['error'][i] in this.exceptions) {
                                throw new this.exceptions[response['error'][i]] (message);
                            }
                        }
                        throw new ExchangeError (message);
                    }
                }
            }
        }
    }
};

},{"./base/Exchange":3,"./base/errors":5}],25:[function(require,module,exports){
'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError, InvalidNonce, InvalidOrder, AuthenticationError, InsufficientFunds, OrderNotFound } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class kucoin extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'kucoin',
            'name': 'Kucoin',
            'countries': [ 'HK' ], // Hong Kong
            'version': 'v1',
            'rateLimit': 2000,
            'userAgent': this.userAgents['chrome'],
            'has': {
                'CORS': false,
                'cancelOrders': true,
                'createMarketOrder': false,
                'fetchDepositAddress': true,
                'fetchTickers': true,
                'fetchOHLCV': true, // see the method implementation below
                'fetchOrder': true,
                'fetchOrders': false,
                'fetchClosedOrders': true,
                'fetchOpenOrders': true,
                'fetchMyTrades': 'emulated', // this method is to be deleted, see implementation and comments below
                'fetchCurrencies': true,
                'withdraw': true,
            },
            'timeframes': {
                '1m': 1,
                '5m': 5,
                '15m': 15,
                '30m': 30,
                '1h': 60,
                '8h': 480,
                '1d': 'D',
                '1w': 'W',
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/33795655-b3c46e48-dcf6-11e7-8abe-dc4588ba7901.jpg',
                'api': {
                    'public': 'https://api.kucoin.com',
                    'private': 'https://api.kucoin.com',
                    'kitchen': 'https://kitchen.kucoin.com',
                    'kitchen-2': 'https://kitchen-2.kucoin.com',
                },
                'www': 'https://www.kucoin.com',
                'referral': 'https://www.kucoin.com/?r=E5wkqe',
                'doc': 'https://kucoinapidocs.docs.apiary.io',
                'fees': 'https://news.kucoin.com/en/fee',
            },
            'api': {
                'kitchen': {
                    'get': [
                        'open/chart/history',
                    ],
                },
                'public': {
                    'get': [
                        'open/chart/config',
                        'open/chart/history',
                        'open/chart/symbol',
                        'open/currencies',
                        'open/deal-orders',
                        'open/kline',
                        'open/lang-list',
                        'open/orders',
                        'open/orders-buy',
                        'open/orders-sell',
                        'open/tick',
                        'market/open/coin-info',
                        'market/open/coins',
                        'market/open/coins-trending',
                        'market/open/symbols',
                    ],
                },
                'private': {
                    'get': [
                        'account/balance',
                        'account/{coin}/wallet/address',
                        'account/{coin}/wallet/records',
                        'account/{coin}/balance',
                        'account/promotion/info',
                        'account/promotion/sum',
                        'deal-orders',
                        'order/active',
                        'order/active-map',
                        'order/dealt',
                        'order/detail',
                        'referrer/descendant/count',
                        'user/info',
                    ],
                    'post': [
                        'account/{coin}/withdraw/apply',
                        'account/{coin}/withdraw/cancel',
                        'account/promotion/draw',
                        'cancel-order',
                        'order',
                        'order/cancel-all',
                        'user/change-lang',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'maker': 0.001,
                    'taker': 0.001,
                },
                'funding': {
                    'tierBased': false,
                    'percentage': false,
                    'withdraw': {
                        'KCS': 2.0,
                        'BTC': 0.0005,
                        'USDT': 10.0,
                        'ETH': 0.01,
                        'LTC': 0.001,
                        'NEO': 0.0,
                        'GAS': 0.0,
                        'KNC': 0.5,
                        'BTM': 5.0,
                        'QTUM': 0.1,
                        'EOS': 0.5,
                        'CVC': 3.0,
                        'OMG': 0.1,
                        'PAY': 0.5,
                        'SNT': 20.0,
                        'BHC': 1.0,
                        'HSR': 0.01,
                        'WTC': 0.1,
                        'VEN': 2.0,
                        'MTH': 10.0,
                        'RPX': 1.0,
                        'REQ': 20.0,
                        'EVX': 0.5,
                        'MOD': 0.5,
                        'NEBL': 0.1,
                        'DGB': 0.5,
                        'CAG': 2.0,
                        'CFD': 0.5,
                        'RDN': 0.5,
                        'UKG': 5.0,
                        'BCPT': 5.0,
                        'PPT': 0.1,
                        'BCH': 0.0005,
                        'STX': 2.0,
                        'NULS': 1.0,
                        'GVT': 0.1,
                        'HST': 2.0,
                        'PURA': 0.5,
                        'SUB': 2.0,
                        'QSP': 5.0,
                        'POWR': 1.0,
                        'FLIXX': 10.0,
                        'LEND': 20.0,
                        'AMB': 3.0,
                        'RHOC': 2.0,
                        'R': 2.0,
                        'DENT': 50.0,
                        'DRGN': 1.0,
                        'ACT': 0.1,
                    },
                    'deposit': {},
                },
            },
            // exchange-specific options
            'options': {
                'fetchOrderBookWarning': true, // raises a warning on null response in fetchOrderBook
                'timeDifference': 0, // the difference between system clock and Kucoin clock
                'adjustForTimeDifference': false, // controls the adjustment logic upon instantiation
                'limits': {
                    'amount': {
                        'min': {
                            'BTC': 0.00001,
                            'ETH': 0.00001,
                            'BCH': 0.00001,
                            'GAS': 0.1,
                            'NEO': 0.01,
                            'KCS': 1,
                            'TMT': 1,
                            'TFD': 1,
                            'LALA': 1,
                            'CS': 1,
                            'DOCK': 1,
                            'ETN': 1,
                            'IHT': 1,
                            'KICK': 1,
                            'WAN': 1,
                            'ACT': 1,
                            'APH': 1,
                            'BAX': 1,
                            'DATX': 1,
                            'DEB': 1,
                            'ELEC': 1,
                            'GO': 1,
                            'HSR': 1,
                            'IOTX': 1,
                            'LOOM': 1,
                            'LYM': 1,
                            'MOBI': 1,
                            'OMX': 1,
                            'ONT': 1,
                            'OPEN': 1,
                            'QKC': 1,
                            'SHL': 1,
                            'SOUL': 1,
                            'SPHTX': 1,
                            'SRN': 1,
                            'TKY': 1,
                            'TOMO': 1,
                            'TRAC': 1,
                            'COV': 1,
                            'DADI': 1,
                            'ELF': 1,
                            'LTC': 1,
                            'MAN': 1,
                            'PRL': 1,
                            'STK': 1,
                            'ZIL': 1,
                            'ZPT': 1,
                            'BPT': 1,
                            'CAPP': 1,
                            'POLY': 1,
                            'TNC': 1,
                            'XRB': 0.1,
                            'AXP': 1,
                            'COFI': 1,
                            'CXO': 1,
                            'DRGN': 1,
                            'DTA': 1,
                            'ING': 1,
                            'MTN': 1,
                            'OCN': 10,
                            'PARETO': 1,
                            'SNC': 1,
                            'TEL': 10,
                            'WAX': 1,
                            'ADB': 1,
                            'BOS': 1,
                            'HAT': 1,
                            'HKN': 1,
                            'HPB': 1,
                            'IOST': 1,
                            'ARY': 1,
                            'DBC': 1,
                            'KEY': 1,
                            'GAT': 1,
                            'RPX': 1,
                            'ACAT': 1,
                            'CV': 10,
                            'QLC': 1,
                            'R': 1,
                            'TIO': 1,
                            'ITC': 1,
                            'AGI': 10,
                            'EXY': 1,
                            'MWAT': 1,
                            'DENT': 1,
                            'J8T': 1,
                            'LOCI': 1,
                            'CAT': 1,
                            'ARN': 1,
                            'CAN': 1,
                            'EOS': 0.1,
                            'ETC': 0.1,
                            'JNT': 1,
                            'PLAY': 1,
                            'CHP': 1,
                            'DASH': 0.01,
                            'DNA': 1,
                            'EBTC': 1,
                            'FOTA': 1,
                            'PURA': 0.1,
                            'UTK': 1,
                            'CAG': 1,
                            'GLA': 1,
                            'HAV': 1,
                            'SPF': 1,
                            'TIME': 1,
                            'ABT': 1,
                            'BNTY': 1,
                            'ELIX': 1,
                            'ENJ': 1,
                            'AIX': 1,
                            'VEN': 1,
                            'AION': 1,
                            'DAT': 1,
                            'QTUM': 0.1,
                            'WTC': 0.1,
                            'DGB': 1,
                            'SNOV': 1,
                            'BRD': 1,
                            'AMB': 1,
                            'BTM': 1,
                            'MANA': 1,
                            'RHOC': 1,
                            'XLR': 1,
                            'XAS': 0.1,
                            'CHSB': 1,
                            'UKG': 1,
                            'POLL': 1,
                            'FLIXX': 0.1,
                            'INS': 1,
                            'OMG': 0.1,
                            'TFL': 1,
                            'WPR': 1,
                            'LEND': 1,
                            'KNC': 0.001,
                            'BCD': 0.001,
                            'LA': 1,
                            'ONION': 1,
                            'POWR': 0.1,
                            'SNM': 1,
                            'BTG': 0.001,
                            'PBL': 1,
                            'MOD': 0.1,
                            'PPT': 0.1,
                            'BCPT': 1,
                            'GVT': 0.1,
                            'HST': 0.1,
                            'SNT': 0.1,
                            'SUB': 0.1,
                            'NEBL': 0.1,
                            'CVC': 0.1,
                            'MTH': 1,
                            'NULS': 0.1,
                            'PAY': 0.1,
                            'RDN': 1,
                            'REQ': 1,
                            'QSP': 0.1,
                        },
                    },
                },
            },
            'commonCurrencies': {
                'CAN': 'CanYa',
                'XRB': 'NANO',
            },
        });
    }

    nonce () {
        return this.milliseconds () - this.options['timeDifference'];
    }

    async loadTimeDifference () {
        const response = await this.publicGetOpenTick ();
        const after = this.milliseconds ();
        this.options['timeDifference'] = parseInt (after - response['timestamp']);
        return this.options['timeDifference'];
    }

    calculateFee (symbol, type, side, amount, price, takerOrMaker = 'taker', params = {}) {
        let market = this.markets[symbol];
        let key = 'quote';
        let rate = market[takerOrMaker];
        let cost = parseFloat (this.costToPrecision (symbol, amount * rate));
        if (side === 'sell') {
            cost *= price;
        } else {
            key = 'base';
        }
        return {
            'type': takerOrMaker,
            'currency': market[key],
            'rate': rate,
            'cost': parseFloat (this.feeToPrecision (symbol, cost)),
        };
    }

    async fetchMarkets () {
        let response = await this.publicGetMarketOpenSymbols ();
        if (this.options['adjustForTimeDifference'])
            await this.loadTimeDifference ();
        let markets = response['data'];
        let result = [];
        for (let i = 0; i < markets.length; i++) {
            let market = markets[i];
            let id = market['symbol'];
            let baseId = market['coinType'];
            let quoteId = market['coinTypePair'];
            let base = this.commonCurrencyCode (baseId);
            let quote = this.commonCurrencyCode (quoteId);
            let symbol = base + '/' + quote;
            let precision = {
                'amount': 8,
                'price': 8,
            };
            let defaultMinAmount = Math.pow (10, -precision['amount']);
            let minAmount = this.safeFloat (this.options['limits']['amount']['min'], base, defaultMinAmount);
            let active = market['trading'];
            result.push ({
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'active': active,
                'taker': this.safeFloat (market, 'feeRate'),
                'maker': this.safeFloat (market, 'feeRate'),
                'info': market,
                'lot': Math.pow (10, -precision['amount']),
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': minAmount,
                        'max': undefined,
                    },
                    'price': {
                        'min': undefined,
                        'max': undefined,
                    },
                },
            });
        }
        return result;
    }

    async fetchDepositAddress (code, params = {}) {
        await this.loadMarkets ();
        let currency = this.currency (code);
        let response = await this.privateGetAccountCoinWalletAddress (this.extend ({
            'coin': currency['id'],
        }, params));
        let data = response['data'];
        let address = this.safeString (data, 'address');
        this.checkAddress (address);
        let tag = this.safeString (data, 'userOid');
        return {
            'currency': code,
            'address': address,
            'tag': tag,
            'info': response,
        };
    }

    async fetchCurrencies (params = {}) {
        let response = await this.publicGetMarketOpenCoins (params);
        let currencies = response['data'];
        let result = {};
        for (let i = 0; i < currencies.length; i++) {
            let currency = currencies[i];
            let id = currency['coin'];
            // todo: will need to rethink the fees
            // to add support for multiple withdrawal/deposit methods and
            // differentiated fees for each particular method
            let code = this.commonCurrencyCode (id);
            let precision = currency['tradePrecision'];
            let deposit = currency['enableDeposit'];
            let withdraw = currency['enableWithdraw'];
            let active = (deposit && withdraw);
            let defaultMinAmount = Math.pow (10, -precision);
            let minAmount = this.safeFloat (this.options['limits']['amount']['min'], code, defaultMinAmount);
            result[code] = {
                'id': id,
                'code': code,
                'info': currency,
                'name': currency['name'],
                'active': active,
                'fee': currency['withdrawMinFee'], // todo: redesign
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': minAmount,
                        'max': Math.pow (10, precision),
                    },
                    'price': {
                        'min': Math.pow (10, -precision),
                        'max': Math.pow (10, precision),
                    },
                    'cost': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'withdraw': {
                        'min': currency['withdrawMinAmount'],
                        'max': Math.pow (10, precision),
                    },
                },
            };
        }
        return result;
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let response = await this.privateGetAccountBalance (this.extend ({
        }, params));
        let balances = response['data'];
        let result = { 'info': balances };
        let indexed = this.indexBy (balances, 'coinType');
        let keys = Object.keys (indexed);
        for (let i = 0; i < keys.length; i++) {
            let id = keys[i];
            let currency = this.commonCurrencyCode (id);
            let account = this.account ();
            let balance = indexed[id];
            let used = parseFloat (balance['freezeBalance']);
            let free = parseFloat (balance['balance']);
            let total = this.sum (free, used);
            account['free'] = free;
            account['used'] = used;
            account['total'] = total;
            result[currency] = account;
        }
        return this.parseBalance (result);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        if (typeof limit !== 'undefined') {
            request['limit'] = limit;
        }
        let response = await this.publicGetOpenOrders (this.extend (request, params));
        let orderbook = undefined;
        let timestamp = undefined;
        // sometimes kucoin returns this:
        // {"success":true,"code":"OK","msg":"Operation succeeded.","timestamp":xxxxxxxxxxxxx,"data":null}
        if (!('data' in response) || !response['data']) {
            if (this.options['fetchOrderBookWarning'])
                throw new ExchangeError (this.id + " fetchOrderBook returned an null reply. Set exchange.options['fetchOrderBookWarning'] = false to silence this warning");
            orderbook = {
                'BUY': [],
                'SELL': [],
            };
        } else {
            orderbook = response['data'];
            timestamp = this.safeInteger (response, 'timestamp');
            timestamp = this.safeInteger (response['data'], 'timestamp', timestamp);
        }
        return this.parseOrderBook (orderbook, timestamp, 'BUY', 'SELL');
    }

    parseOrder (order, market = undefined) {
        let side = this.safeValue (order, 'direction');
        if (typeof side === 'undefined')
            side = order['type'];
        if (typeof side !== 'undefined')
            side = side.toLowerCase ();
        let orderId = this.safeString (order, 'orderOid');
        if (typeof orderId === 'undefined')
            orderId = this.safeString (order, 'oid');
        // do not confuse trades with orders
        let trades = undefined;
        if ('dealOrders' in order)
            trades = this.safeValue (order['dealOrders'], 'datas');
        if (typeof trades !== 'undefined') {
            trades = this.parseTrades (trades, market);
            for (let i = 0; i < trades.length; i++) {
                trades[i]['side'] = side;
                trades[i]['order'] = orderId;
            }
        }
        let symbol = undefined;
        if (typeof market !== 'undefined') {
            symbol = market['symbol'];
        } else {
            symbol = order['coinType'] + '/' + order['coinTypePair'];
        }
        let timestamp = this.safeValue (order, 'createdAt');
        let remaining = this.safeFloat (order, 'pendingAmount');
        let status = undefined;
        if (this.safeValue (order, 'isActive', true)) {
            status = 'open';
        } else {
            status = 'closed';
        }
        let filled = this.safeFloat (order, 'dealAmount');
        let amount = this.safeFloat (order, 'amount');
        let cost = this.safeFloat (order, 'dealValue');
        if (typeof cost === 'undefined')
            cost = this.safeFloat (order, 'dealValueTotal');
        if (typeof status === 'undefined') {
            if (typeof remaining !== 'undefined')
                if (remaining > 0)
                    status = 'open';
                else
                    status = 'closed';
        }
        if (typeof filled === 'undefined') {
            if (typeof status !== 'undefined')
                if (status === 'closed')
                    filled = this.safeFloat (order, 'amount');
        } else if (filled === 0.0) {
            if (typeof trades !== 'undefined') {
                cost = 0;
                for (let i = 0; i < trades.length; i++) {
                    filled += trades[i]['amount'];
                    cost += trades[i]['cost'];
                }
            }
        }
        // kucoin price and amount fields have varying names
        // thus the convoluted spaghetti code below
        let price = undefined;
        if (typeof filled !== 'undefined') {
            // if the order was filled at least for some part
            if (filled > 0.0) {
                price = this.safeFloat (order, 'price');
                if (typeof price === 'undefined')
                    price = this.safeFloat (order, 'dealPrice');
                if (typeof price === 'undefined')
                    price = this.safeFloat (order, 'dealPriceAverage');
            } else {
                // it's an open order, not filled yet, use the initial price
                price = this.safeFloat (order, 'orderPrice');
                if (typeof price === 'undefined')
                    price = this.safeFloat (order, 'price');
            }
            if (typeof price !== 'undefined') {
                if (typeof cost === 'undefined')
                    cost = price * filled;
            }
            if (typeof amount === 'undefined') {
                if (typeof remaining !== 'undefined')
                    amount = this.sum (filled, remaining);
            } else if (typeof remaining === 'undefined') {
                remaining = amount - filled;
            }
        }
        if (status === 'open') {
            if ((typeof cost === 'undefined') || (cost === 0.0))
                if (typeof price !== 'undefined')
                    if (typeof amount !== 'undefined')
                        cost = amount * price;
        }
        let feeCurrency = undefined;
        if (typeof market !== 'undefined') {
            feeCurrency = (side === 'sell') ? market['quote'] : market['base'];
        } else {
            let feeCurrencyField = (side === 'sell') ? 'coinTypePair' : 'coinType';
            let feeCurrency = this.safeString (order, feeCurrencyField);
            if (typeof feeCurrency !== 'undefined') {
                if (feeCurrency in this.currencies_by_id)
                    feeCurrency = this.currencies_by_id[feeCurrency]['code'];
            }
        }
        let feeCost = this.safeFloat (order, 'fee');
        let fee = {
            'cost': this.safeFloat (order, 'feeTotal', feeCost),
            'rate': this.safeFloat (order, 'feeRate'),
            'currency': feeCurrency,
        };
        let result = {
            'info': order,
            'id': orderId,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'symbol': symbol,
            'type': 'limit',
            'side': side,
            'price': price,
            'amount': amount,
            'cost': cost,
            'filled': filled,
            'remaining': remaining,
            'status': status,
            'fee': fee,
            'trades': trades,
        };
        return result;
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        if (typeof symbol === 'undefined')
            throw new ExchangeError (this.id + ' fetchOrder requires a symbol argument');
        let orderType = this.safeValue (params, 'type');
        if (typeof orderType === 'undefined')
            throw new ExchangeError (this.id + ' fetchOrder requires a type parameter ("BUY" or "SELL")');
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
            'type': orderType,
            'orderOid': id,
        };
        let response = await this.privateGetOrderDetail (this.extend (request, params));
        if (!response['data'])
            throw new OrderNotFound (this.id + ' ' + this.json (response));
        //
        // the caching part to be removed
        //
        //     let order = this.parseOrder (response['data'], market);
        //     let orderId = order['id'];
        //     if (orderId in this.orders)
        //         order['status'] = this.orders[orderId]['status'];
        //     this.orders[orderId] = order;
        //
        return this.parseOrder (response['data'], market);
    }

    parseOrdersByStatus (orders, market, since, limit, status) {
        let result = [];
        for (let i = 0; i < orders.length; i++) {
            let order = this.parseOrder (this.extend (orders[i], {
                'status': status,
            }), market);
            result.push (order);
        }
        let symbol = (typeof market !== 'undefined') ? market['symbol'] : undefined;
        return this.filterBySymbolSinceLimit (result, symbol, since, limit);
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let marketId = undefined;
        let market = undefined;
        if (typeof symbol !== 'undefined') {
            market = this.market (symbol);
            marketId = market['id'];
        } else {
            marketId = '';
        }
        let request = {
            'symbol': marketId,
        };
        let response = await this.privateGetOrderActiveMap (this.extend (request, params));
        let sell = this.safeValue (response['data'], 'SELL');
        if (typeof sell === 'undefined')
            sell = [];
        let buy = this.safeValue (response['data'], 'BUY');
        if (typeof buy === 'undefined')
            buy = [];
        let orders = this.arrayConcat (sell, buy);
        //
        // the caching part to be removed
        //
        //     for (let i = 0; i < orders.length; i++) {
        //         let order = this.parseOrder (this.extend (orders[i], {
        //             'status': 'open',
        //         }), market);
        //         let orderId = order['id'];
        //         if (orderId in this.orders)
        //             if (this.orders[orderId]['status'] !== 'open')
        //                 order['status'] = this.orders[orderId]['status'];
        //         this.orders[order['id']] = order;
        //     }
        //     let openOrders = this.filterBy (this.orders, 'status', 'open');
        //     return this.filterBySymbolSinceLimit (openOrders, symbol, since, limit);
        //
        return this.parseOrdersByStatus (orders, market, since, limit, 'open');
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = 20, params = {}) {
        let request = {};
        await this.loadMarkets ();
        let market = undefined;
        if (typeof symbol !== 'undefined') {
            market = this.market (symbol);
            request['symbol'] = market['id'];
        }
        if (typeof since !== 'undefined')
            request['since'] = since;
        if (typeof limit !== 'undefined')
            request['limit'] = limit;
        let response = await this.privateGetOrderDealt (this.extend (request, params));
        let orders = response['data']['datas'];
        //
        // the caching part to be removed
        //
        //     for (let i = 0; i < orders.length; i++) {
        //         let order = this.parseOrder (this.extend (orders[i], {
        //             'status': 'closed',
        //         }), market);
        //         let orderId = order['id'];
        //         if (orderId in this.orders)
        //             if (this.orders[orderId]['status'] === 'canceled')
        //                 order['status'] = this.orders[orderId]['status'];
        //         this.orders[order['id']] = order;
        //     }
        //     let closedOrders = this.filterBy (this.orders, 'status', 'closed');
        //     return this.filterBySymbolSinceLimit (closedOrders, symbol, since, limit);
        //
        return this.parseOrdersByStatus (orders, market, since, limit, 'closed');
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        if (type !== 'limit')
            throw new ExchangeError (this.id + ' allows limit orders only');
        await this.loadMarkets ();
        let market = this.market (symbol);
        let quote = market['quote'];
        let base = market['base'];
        let request = {
            'symbol': market['id'],
            'type': side.toUpperCase (),
            'price': this.truncate (price, this.currencies[quote]['precision']),
            'amount': this.truncate (amount, this.currencies[base]['precision']),
        };
        price = parseFloat (price);
        amount = parseFloat (amount);
        let cost = price * amount;
        let response = await this.privatePostOrder (this.extend (request, params));
        let orderId = this.safeString (response['data'], 'orderOid');
        let timestamp = this.safeInteger (response, 'timestamp');
        let iso8601 = undefined;
        if (typeof timestamp !== 'undefined')
            iso8601 = this.iso8601 (timestamp);
        let order = {
            'info': response,
            'id': orderId,
            'timestamp': timestamp,
            'datetime': iso8601,
            'lastTradeTimestamp': undefined,
            'symbol': market['symbol'],
            'type': type,
            'side': side,
            'amount': amount,
            'filled': undefined,
            'remaining': undefined,
            'price': price,
            'cost': cost,
            'status': 'open',
            'fee': undefined,
            'trades': undefined,
        };
        this.orders[orderId] = order;
        return order;
    }

    async cancelOrders (symbol = undefined, params = {}) {
        // https://kucoinapidocs.docs.apiary.io/#reference/0/trading/cancel-all-orders
        // docs say symbol is required, but it seems to be optional
        // you can cancel all orders, or filter by symbol or type or both
        let request = {};
        if (typeof symbol !== 'undefined') {
            await this.loadMarkets ();
            let market = this.market (symbol);
            request['symbol'] = market['id'];
        }
        if ('type' in params) {
            request['type'] = params['type'].toUpperCase ();
            params = this.omit (params, 'type');
        }
        //
        // the caching part to be removed
        //
        //     let response = await this.privatePostOrderCancelAll (this.extend (request, params));
        //     let openOrders = this.filterBy (this.orders, 'status', 'open');
        //     for (let i = 0; i < openOrders.length; i++) {
        //         let order = openOrders[i];
        //         let orderId = order['id'];
        //         this.orders[orderId]['status'] = 'canceled';
        //     }
        //     return response;
        //
        return await this.privatePostOrderCancelAll (this.extend (request, params));
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        if (typeof symbol === 'undefined')
            throw new ExchangeError (this.id + ' cancelOrder requires a symbol');
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
            'orderOid': id,
        };
        if ('type' in params) {
            request['type'] = params['type'].toUpperCase ();
            params = this.omit (params, 'type');
        } else {
            throw new ExchangeError (this.id + ' cancelOrder requires parameter type=["BUY"|"SELL"]');
        }
        //
        // the caching part to be removed
        //
        //     let response = await this.privatePostCancelOrder (this.extend (request, params));
        //     if (id in this.orders) {
        //         this.orders[id]['status'] = 'canceled';
        //     } else {
        //         // store it in cache for further references
        //         let timestamp = this.milliseconds ();
        //         let side = request['type'].toLowerCase ();
        //         this.orders[id] = {
        //             'id': id,
        //             'timestamp': timestamp,
        //             'datetime': this.iso8601 (timestamp),
        //             'type': undefined,
        //             'side': side,
        //             'symbol': symbol,
        //             'status': 'canceled',
        //         };
        //     }
        //     return response;
        //
        return await this.privatePostCancelOrder (this.extend (request, params));
    }

    parseTicker (ticker, market = undefined) {
        let timestamp = ticker['datetime'];
        let symbol = undefined;
        if (typeof market === 'undefined') {
            let marketId = ticker['coinType'] + '-' + ticker['coinTypePair'];
            if (marketId in this.markets_by_id) {
                market = this.markets_by_id[marketId];
            }
        }
        // TNC coin doesn't have changerate for some reason
        let change = this.safeFloat (ticker, 'change');
        let last = this.safeFloat (ticker, 'lastDealPrice');
        let open = undefined;
        if (typeof last !== 'undefined')
            if (typeof change !== 'undefined')
                open = last - change;
        let changePercentage = this.safeFloat (ticker, 'changeRate');
        if (typeof market !== 'undefined') {
            symbol = market['symbol'];
        }
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'high'),
            'low': this.safeFloat (ticker, 'low'),
            'bid': this.safeFloat (ticker, 'buy'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'sell'),
            'askVolume': undefined,
            'vwap': undefined,
            'open': open,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': change,
            'percentage': changePercentage,
            'average': undefined,
            'baseVolume': this.safeFloat (ticker, 'vol'),
            'quoteVolume': this.safeFloat (ticker, 'volValue'),
            'info': ticker,
        };
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let response = await this.publicGetMarketOpenSymbols (params);
        let tickers = response['data'];
        let result = {};
        for (let t = 0; t < tickers.length; t++) {
            let ticker = this.parseTicker (tickers[t]);
            let symbol = ticker['symbol'];
            result[symbol] = ticker;
        }
        return result;
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let response = await this.publicGetOpenTick (this.extend ({
            'symbol': market['id'],
        }, params));
        let ticker = response['data'];
        return this.parseTicker (ticker, market);
    }

    parseTrade (trade, market = undefined) {
        let id = undefined;
        let order = undefined;
        let info = trade;
        let timestamp = undefined;
        let type = undefined;
        let side = undefined;
        let price = undefined;
        let cost = undefined;
        let amount = undefined;
        let fee = undefined;
        if (Array.isArray (trade)) {
            timestamp = trade[0];
            type = 'limit';
            if (trade[1] === 'BUY') {
                side = 'buy';
            } else if (trade[1] === 'SELL') {
                side = 'sell';
            }
            price = trade[2];
            amount = trade[3];
        } else {
            timestamp = this.safeValue (trade, 'createdAt');
            order = this.safeString (trade, 'orderOid');
            id = this.safeString (trade, 'oid');
            side = this.safeString (trade, 'direction');
            if (typeof side !== 'undefined')
                side = side.toLowerCase ();
            price = this.safeFloat (trade, 'dealPrice');
            amount = this.safeFloat (trade, 'amount');
            cost = this.safeFloat (trade, 'dealValue');
            let feeCurrency = undefined;
            if (typeof market !== 'undefined') {
                feeCurrency = (side === 'sell') ? market['quote'] : market['base'];
            } else {
                let feeCurrencyField = (side === 'sell') ? 'coinTypePair' : 'coinType';
                let feeCurrency = this.safeString (order, feeCurrencyField);
                if (typeof feeCurrency !== 'undefined') {
                    if (feeCurrency in this.currencies_by_id)
                        feeCurrency = this.currencies_by_id[feeCurrency]['code'];
                }
            }
            fee = {
                'cost': this.safeFloat (trade, 'fee'),
                'currency': feeCurrency,
            };
        }
        let symbol = undefined;
        if (typeof market !== 'undefined')
            symbol = market['symbol'];
        return {
            'id': id,
            'order': order,
            'info': info,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'type': type,
            'side': side,
            'price': price,
            'cost': cost,
            'amount': amount,
            'fee': fee,
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let response = await this.publicGetOpenDealOrders (this.extend ({
            'symbol': market['id'],
            'limit': limit,
        }, params));
        return this.parseTrades (response['data'], market, since, limit);
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        // todo: this method is deprecated and to be deleted shortly
        // it improperly mimics fetchMyTrades with closed orders
        // kucoin does not have any means of fetching personal trades at all
        // this will effectively simplify current convoluted implementations of parseOrder and parseTrade
        if (typeof symbol === 'undefined')
            throw new ExchangeError (this.id + ' fetchMyTrades is deprecated and requires a symbol argument');
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        if (typeof limit !== 'undefined')
            request['limit'] = limit;
        let response = await this.privateGetDealOrders (this.extend (request, params));
        return this.parseTrades (response['data']['datas'], market, since, limit);
    }

    parseTradingViewOHLCV (ohlcvs, market = undefined, timeframe = '1m', since = undefined, limit = undefined) {
        let result = this.convertTradingViewToOHLCV (ohlcvs);
        return this.parseOHLCVs (result, market, timeframe, since, limit);
    }

    async fetchOHLCV (symbol, timeframe = '1m', since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let end = this.seconds ();
        let resolution = this.timeframes[timeframe];
        // convert 'resolution' to minutes in order to calculate 'from' later
        let minutes = resolution;
        if (minutes === 'D') {
            if (typeof limit === 'undefined')
                limit = 30; // 30 days, 1 month
            minutes = 1440;
        } else if (minutes === 'W') {
            if (typeof limit === 'undefined')
                limit = 52; // 52 weeks, 1 year
            minutes = 10080;
        } else if (typeof limit === 'undefined') {
            // last 1440 periods, whatever the duration of the period is
            // for 1m it equals 1 day (24 hours)
            // for 5m it equals 5 days
            // ...
            limit = 1440;
        }
        let start = end - limit * minutes * 60;
        // if 'since' has been supplied by user
        if (typeof since !== 'undefined') {
            start = parseInt (since / 1000); // convert milliseconds to seconds
            end = Math.min (end, this.sum (start, limit * minutes * 60));
        }
        let request = {
            'symbol': market['id'],
            'resolution': resolution,
            'from': start,
            'to': end,
        };
        let response = await this.publicGetOpenChartHistory (this.extend (request, params));
        return this.parseTradingViewOHLCV (response, market, timeframe, since, limit);
    }

    async withdraw (code, amount, address, tag = undefined, params = {}) {
        this.checkAddress (address);
        await this.loadMarkets ();
        let currency = this.currency (code);
        this.checkAddress (address);
        let response = await this.privatePostAccountCoinWithdrawApply (this.extend ({
            'coin': currency['id'],
            'amount': amount,
            'address': address,
        }, params));
        return {
            'info': response,
            'id': undefined,
        };
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let endpoint = '/' + this.version + '/' + this.implodeParams (path, params);
        let url = this.urls['api'][api] + endpoint;
        let query = this.omit (params, this.extractParams (path));
        if (api === 'private') {
            this.checkRequiredCredentials ();
            // their nonce is always a calibrated synched milliseconds-timestamp
            let nonce = this.nonce ();
            let queryString = '';
            nonce = nonce.toString ();
            if (Object.keys (query).length) {
                queryString = this.rawencode (this.keysort (query));
                url += '?' + queryString;
                if (method !== 'GET') {
                    body = queryString;
                }
            }
            let auth = endpoint + '/' + nonce + '/' + queryString;
            let payload = this.stringToBase64 (this.encode (auth));
            // payload should be "encoded" as returned from stringToBase64
            let signature = this.hmac (payload, this.encode (this.secret), 'sha256');
            headers = {
                'KC-API-KEY': this.apiKey,
                'KC-API-NONCE': nonce,
                'KC-API-SIGNATURE': signature,
            };
        } else {
            if (Object.keys (query).length)
                url += '?' + this.urlencode (query);
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    throwExceptionOnError (response) {
        //
        // API endpoints return the following formats
        //     { success: false, code: "ERROR", msg: "Min price:100.0" }
        //     { success: true,  code: "OK",    msg: "Operation succeeded." }
        //
        // Web OHLCV endpoint returns this:
        //     { s: "ok", o: [], h: [], l: [], c: [], v: [] }
        //
        // This particular method handles API responses only
        //
        if (!('success' in response))
            return;
        if (response['success'] === true)
            return; // not an error
        if (!('code' in response) || !('msg' in response))
            throw new ExchangeError (this.id + ': malformed response: ' + this.json (response));
        const code = this.safeString (response, 'code');
        const message = this.safeString (response, 'msg');
        const feedback = this.id + ' ' + this.json (response);
        if (code === 'UNAUTH') {
            if (message === 'Invalid nonce')
                throw new InvalidNonce (feedback);
            throw new AuthenticationError (feedback);
        } else if (code === 'ERROR') {
            if (message.indexOf ('The precision of amount') >= 0)
                throw new InvalidOrder (feedback); // amount violates precision.amount
            if (message.indexOf ('Min amount each order') >= 0)
                throw new InvalidOrder (feedback); // amount < limits.amount.min
            if (message.indexOf ('Min price:') >= 0)
                throw new InvalidOrder (feedback); // price < limits.price.min
            if (message.indexOf ('Max price:') >= 0)
                throw new InvalidOrder (feedback); // price > limits.price.max
            if (message.indexOf ('The precision of price') >= 0)
                throw new InvalidOrder (feedback); // price violates precision.price
        } else if (code === 'NO_BALANCE') {
            if (message.indexOf ('Insufficient balance') >= 0)
                throw new InsufficientFunds (feedback);
        }
        throw new ExchangeError (this.id + ': unknown response: ' + this.json (response));
    }

    handleErrors (code, reason, url, method, headers, body, response = undefined) {
        if (typeof response !== 'undefined') {
            // JS callchain parses body beforehand
            this.throwExceptionOnError (response);
        } else if (body && (body[0] === '{')) {
            // Python/PHP callchains don't have json available at this step
            this.throwExceptionOnError (JSON.parse (body));
        }
    }
};

},{"./base/Exchange":3,"./base/errors":5}],26:[function(require,module,exports){
'use strict';

const Exchange = require ('./base/Exchange');
const { ExchangeError, ExchangeNotAvailable, InsufficientFunds, OrderNotFound, DDoSProtection, InvalidOrder, AuthenticationError } = require ('./base/errors');

module.exports = class liqui extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'liqui',
            'name': 'Liqui',
            'countries': [ 'UA' ],
            'rateLimit': 3000,
            'version': '3',
            'userAgent': this.userAgents['chrome'],
            'has': {
                'CORS': false,
                'createMarketOrder': false,
                'fetchOrderBooks': true,
                'fetchOrder': true,
                'fetchOrders': 'emulated',
                'fetchOpenOrders': true,
                'fetchClosedOrders': 'emulated',
                'fetchTickers': true,
                'fetchMyTrades': true,
                'withdraw': true,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/27982022-75aea828-63a0-11e7-9511-ca584a8edd74.jpg',
                'api': {
                    'public': 'https://api.liqui.io/api',
                    'private': 'https://api.liqui.io/tapi',
                },
                'www': 'https://liqui.io',
                'doc': 'https://liqui.io/api',
                'fees': 'https://liqui.io/fee',
            },
            'api': {
                'public': {
                    'get': [
                        'info',
                        'ticker/{pair}',
                        'depth/{pair}',
                        'trades/{pair}',
                    ],
                },
                'private': {
                    'post': [
                        'getInfo',
                        'Trade',
                        'ActiveOrders',
                        'OrderInfo',
                        'CancelOrder',
                        'TradeHistory',
                        'CoinDepositAddress',
                        'WithdrawCoin',
                        'CreateCoupon',
                        'RedeemCoupon',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'maker': 0.001,
                    'taker': 0.0025,
                },
                'funding': {
                    'tierBased': false,
                    'percentage': false,
                    'withdraw': {},
                    'deposit': {},
                },
            },
            'commonCurrencies': {
                'DSH': 'DASH',
            },
            'exceptions': {
                '803': InvalidOrder, // "Count could not be less than 0.001." (selling below minAmount)
                '804': InvalidOrder, // "Count could not be more than 10000." (buying above maxAmount)
                '805': InvalidOrder, // "price could not be less than X." (minPrice violation on buy & sell)
                '806': InvalidOrder, // "price could not be more than X." (maxPrice violation on buy & sell)
                '807': InvalidOrder, // "cost could not be less than X." (minCost violation on buy & sell)
                '831': InsufficientFunds, // "Not enougth X to create buy order." (buying with balance.quote < order.cost)
                '832': InsufficientFunds, // "Not enougth X to create sell order." (selling with balance.base < order.amount)
                '833': OrderNotFound, // "Order with id X was not found." (cancelling non-existent, closed and cancelled order)
            },
        });
    }

    calculateFee (symbol, type, side, amount, price, takerOrMaker = 'taker', params = {}) {
        let market = this.markets[symbol];
        let key = 'quote';
        let rate = market[takerOrMaker];
        let cost = parseFloat (this.costToPrecision (symbol, amount * rate));
        if (side === 'sell') {
            cost *= price;
        } else {
            key = 'base';
        }
        return {
            'type': takerOrMaker,
            'currency': market[key],
            'rate': rate,
            'cost': cost,
        };
    }

    getBaseQuoteFromMarketId (id) {
        let uppercase = id.toUpperCase ();
        let [ base, quote ] = uppercase.split ('_');
        base = this.commonCurrencyCode (base);
        quote = this.commonCurrencyCode (quote);
        return [ base, quote ];
    }

    async fetchMarkets () {
        let response = await this.publicGetInfo ();
        let markets = response['pairs'];
        let keys = Object.keys (markets);
        let result = [];
        for (let p = 0; p < keys.length; p++) {
            let id = keys[p];
            let market = markets[id];
            let [ base, quote ] = this.getBaseQuoteFromMarketId (id);
            let symbol = base + '/' + quote;
            let precision = {
                'amount': this.safeInteger (market, 'decimal_places'),
                'price': this.safeInteger (market, 'decimal_places'),
            };
            let amountLimits = {
                'min': this.safeFloat (market, 'min_amount'),
                'max': this.safeFloat (market, 'max_amount'),
            };
            let priceLimits = {
                'min': this.safeFloat (market, 'min_price'),
                'max': this.safeFloat (market, 'max_price'),
            };
            let costLimits = {
                'min': this.safeFloat (market, 'min_total'),
            };
            let limits = {
                'amount': amountLimits,
                'price': priceLimits,
                'cost': costLimits,
            };
            let hidden = this.safeInteger (market, 'hidden');
            let active = (hidden === 0);
            result.push ({
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'active': active,
                'taker': market['fee'] / 100,
                'precision': precision,
                'limits': limits,
                'info': market,
            });
        }
        return result;
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let response = await this.privatePostGetInfo ();
        let balances = response['return'];
        let result = { 'info': balances };
        let funds = balances['funds'];
        let currencies = Object.keys (funds);
        for (let c = 0; c < currencies.length; c++) {
            let currency = currencies[c];
            let uppercase = currency.toUpperCase ();
            uppercase = this.commonCurrencyCode (uppercase);
            let total = undefined;
            let used = undefined;
            if (balances['open_orders'] === 0) {
                total = funds[currency];
                used = 0.0;
            }
            let account = {
                'free': funds[currency],
                'used': used,
                'total': total,
            };
            result[uppercase] = account;
        }
        return this.parseBalance (result);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'pair': market['id'],
        };
        if (typeof limit !== 'undefined')
            request['limit'] = limit; // default = 150, max = 2000
        let response = await this.publicGetDepthPair (this.extend (request, params));
        let market_id_in_reponse = (market['id'] in response);
        if (!market_id_in_reponse)
            throw new ExchangeError (this.id + ' ' + market['symbol'] + ' order book is empty or not available');
        let orderbook = response[market['id']];
        return this.parseOrderBook (orderbook);
    }

    async fetchOrderBooks (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let ids = undefined;
        if (typeof symbols === 'undefined') {
            ids = this.ids.join ('-');
            // max URL length is 2083 symbols, including http schema, hostname, tld, etc...
            if (ids.length > 2048) {
                let numIds = this.ids.length;
                throw new ExchangeError (this.id + ' has ' + numIds.toString () + ' symbols exceeding max URL length, you are required to specify a list of symbols in the first argument to fetchOrderBooks');
            }
        } else {
            ids = this.marketIds (symbols);
            ids = ids.join ('-');
        }
        let response = await this.publicGetDepthPair (this.extend ({
            'pair': ids,
        }, params));
        let result = {};
        ids = Object.keys (response);
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let symbol = id;
            if (id in this.markets_by_id) {
                let market = this.markets_by_id[id];
                symbol = market['symbol'];
            }
            result[symbol] = this.parseOrderBook (response[id]);
        }
        return result;
    }

    parseTicker (ticker, market = undefined) {
        let timestamp = ticker['updated'] * 1000;
        let symbol = undefined;
        if (market)
            symbol = market['symbol'];
        let last = this.safeFloat (ticker, 'last');
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'high'),
            'low': this.safeFloat (ticker, 'low'),
            'bid': this.safeFloat (ticker, 'buy'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'sell'),
            'askVolume': undefined,
            'vwap': undefined,
            'open': undefined,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': this.safeFloat (ticker, 'avg'),
            'baseVolume': this.safeFloat (ticker, 'vol_cur'),
            'quoteVolume': this.safeFloat (ticker, 'vol'),
            'info': ticker,
        };
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let ids = undefined;
        if (typeof symbols === 'undefined') {
            ids = this.ids.join ('-');
            // max URL length is 2083 symbols, including http schema, hostname, tld, etc...
            if (ids.length > 2048) {
                let numIds = this.ids.length;
                throw new ExchangeError (this.id + ' has ' + numIds.toString () + ' symbols exceeding max URL length, you are required to specify a list of symbols in the first argument to fetchTickers');
            }
        } else {
            ids = this.marketIds (symbols);
            ids = ids.join ('-');
        }
        let tickers = await this.publicGetTickerPair (this.extend ({
            'pair': ids,
        }, params));
        let result = {};
        let keys = Object.keys (tickers);
        for (let k = 0; k < keys.length; k++) {
            let id = keys[k];
            let ticker = tickers[id];
            let symbol = id;
            let market = undefined;
            if (id in this.markets_by_id) {
                market = this.markets_by_id[id];
                symbol = market['symbol'];
            }
            result[symbol] = this.parseTicker (ticker, market);
        }
        return result;
    }

    async fetchTicker (symbol, params = {}) {
        let tickers = await this.fetchTickers ([ symbol ], params);
        return tickers[symbol];
    }

    parseTrade (trade, market = undefined) {
        let timestamp = parseInt (trade['timestamp']) * 1000;
        let side = trade['type'];
        if (side === 'ask')
            side = 'sell';
        if (side === 'bid')
            side = 'buy';
        let price = this.safeFloat (trade, 'price');
        if ('rate' in trade)
            price = this.safeFloat (trade, 'rate');
        let id = this.safeString (trade, 'tid');
        if ('trade_id' in trade)
            id = this.safeString (trade, 'trade_id');
        let order = this.safeString (trade, this.getOrderIdKey ());
        if ('pair' in trade) {
            let marketId = trade['pair'];
            market = this.markets_by_id[marketId];
        }
        let symbol = undefined;
        if (market)
            symbol = market['symbol'];
        let amount = trade['amount'];
        let type = 'limit'; // all trades are still limit trades
        let isYourOrder = this.safeValue (trade, 'is_your_order');
        let takerOrMaker = 'taker';
        if (typeof isYourOrder !== 'undefined')
            if (isYourOrder)
                takerOrMaker = 'maker';
        let fee = this.calculateFee (symbol, type, side, amount, price, takerOrMaker);
        return {
            'id': id,
            'order': order,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'type': type,
            'side': side,
            'price': price,
            'amount': amount,
            'fee': fee,
            'info': trade,
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'pair': market['id'],
        };
        if (typeof limit !== 'undefined')
            request['limit'] = limit;
        let response = await this.publicGetTradesPair (this.extend (request, params));
        return this.parseTrades (response[market['id']], market, since, limit);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        if (type === 'market')
            throw new ExchangeError (this.id + ' allows limit orders only');
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'pair': market['id'],
            'type': side,
            'amount': this.amountToPrecision (symbol, amount),
            'rate': this.priceToPrecision (symbol, price),
        };
        price = parseFloat (price);
        amount = parseFloat (amount);
        let response = await this.privatePostTrade (this.extend (request, params));
        let id = undefined;
        let status = 'open';
        let filled = 0.0;
        let remaining = amount;
        if ('return' in response) {
            id = this.safeString (response['return'], this.getOrderIdKey ());
            if (id === '0') {
                id = this.safeString (response['return'], 'init_order_id');
                status = 'closed';
            }
            filled = this.safeFloat (response['return'], 'received', 0.0);
            remaining = this.safeFloat (response['return'], 'remains', amount);
        }
        let timestamp = this.milliseconds ();
        let order = {
            'id': id,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'status': status,
            'symbol': symbol,
            'type': type,
            'side': side,
            'price': price,
            'cost': price * filled,
            'amount': amount,
            'remaining': remaining,
            'filled': filled,
            'fee': undefined,
            // 'trades': this.parseTrades (order['trades'], market),
        };
        this.orders[id] = order;
        return this.extend ({ 'info': response }, order);
    }

    getOrderIdKey () {
        return 'order_id';
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let response = undefined;
        let request = {};
        let idKey = this.getOrderIdKey ();
        request[idKey] = id;
        response = await this.privatePostCancelOrder (this.extend (request, params));
        if (id in this.orders)
            this.orders[id]['status'] = 'canceled';
        return response;
    }

    parseOrderStatus (status) {
        let statuses = {
            '0': 'open',
            '1': 'closed',
            '2': 'canceled',
            '3': 'canceled', // or partially-filled and still open? https://github.com/ccxt/ccxt/issues/1594
        };
        if (status in statuses)
            return statuses[status];
        return status;
    }

    parseOrder (order, market = undefined) {
        let id = order['id'].toString ();
        let status = this.safeString (order, 'status');
        if (status !== 'undefined')
            status = this.parseOrderStatus (status);
        let timestamp = parseInt (order['timestamp_created']) * 1000;
        let symbol = undefined;
        if (!market)
            market = this.markets_by_id[order['pair']];
        if (market)
            symbol = market['symbol'];
        let remaining = undefined;
        let amount = undefined;
        let price = this.safeFloat (order, 'rate');
        let filled = undefined;
        let cost = undefined;
        if ('start_amount' in order) {
            amount = this.safeFloat (order, 'start_amount');
            remaining = this.safeFloat (order, 'amount');
        } else {
            remaining = this.safeFloat (order, 'amount');
            if (id in this.orders)
                amount = this.orders[id]['amount'];
        }
        if (typeof amount !== 'undefined') {
            if (typeof remaining !== 'undefined') {
                filled = amount - remaining;
                cost = price * filled;
            }
        }
        let fee = undefined;
        let result = {
            'info': order,
            'id': id,
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'type': 'limit',
            'side': order['type'],
            'price': price,
            'cost': cost,
            'amount': amount,
            'remaining': remaining,
            'filled': filled,
            'status': status,
            'fee': fee,
        };
        return result;
    }

    parseOrders (orders, market = undefined, since = undefined, limit = undefined) {
        let ids = Object.keys (orders);
        let result = [];
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let order = orders[id];
            let extended = this.extend (order, { 'id': id });
            result.push (this.parseOrder (extended, market));
        }
        return this.filterBySinceLimit (result, since, limit);
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let response = await this.privatePostOrderInfo (this.extend ({
            'order_id': parseInt (id),
        }, params));
        id = id.toString ();
        let newOrder = this.parseOrder (this.extend ({ 'id': id }, response['return'][id]));
        let oldOrder = (id in this.orders) ? this.orders[id] : {};
        this.orders[id] = this.extend (oldOrder, newOrder);
        return this.orders[id];
    }

    updateCachedOrders (openOrders, symbol) {
        // update local cache with open orders
        // this will add unseen orders and overwrite existing ones
        for (let j = 0; j < openOrders.length; j++) {
            const id = openOrders[j]['id'];
            this.orders[id] = openOrders[j];
        }
        let openOrdersIndexedById = this.indexBy (openOrders, 'id');
        let cachedOrderIds = Object.keys (this.orders);
        for (let k = 0; k < cachedOrderIds.length; k++) {
            // match each cached order to an order in the open orders array
            // possible reasons why a cached order may be missing in the open orders array:
            // - order was closed or canceled -> update cache
            // - symbol mismatch (e.g. cached BTC/USDT, fetched ETH/USDT) -> skip
            let cachedOrderId = cachedOrderIds[k];
            let cachedOrder = this.orders[cachedOrderId];
            if (!(cachedOrderId in openOrdersIndexedById)) {
                // cached order is not in open orders array
                // if we fetched orders by symbol and it doesn't match the cached order -> won't update the cached order
                if (typeof symbol !== 'undefined' && symbol !== cachedOrder['symbol'])
                    continue;
                // cached order is absent from the list of open orders -> mark the cached order as closed
                if (cachedOrder['status'] === 'open') {
                    cachedOrder = this.extend (cachedOrder, {
                        'status': 'closed', // likewise it might have been canceled externally (unnoticed by "us")
                        'cost': undefined,
                        'filled': cachedOrder['amount'],
                        'remaining': 0.0,
                    });
                    if (typeof cachedOrder['cost'] === 'undefined') {
                        if (typeof cachedOrder['filled'] !== 'undefined')
                            cachedOrder['cost'] = cachedOrder['filled'] * cachedOrder['price'];
                    }
                    this.orders[cachedOrderId] = cachedOrder;
                }
            }
        }
        return this.toArray (this.orders);
    }

    async fetchOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        if ('fetchOrdersRequiresSymbol' in this.options)
            if (this.options['fetchOrdersRequiresSymbol'])
                if (typeof symbol === 'undefined')
                    throw new ExchangeError (this.id + ' fetchOrders requires a symbol argument');
        await this.loadMarkets ();
        let request = {};
        let market = undefined;
        if (typeof symbol !== 'undefined') {
            let market = this.market (symbol);
            request['pair'] = market['id'];
        }
        let response = await this.privatePostActiveOrders (this.extend (request, params));
        // liqui etc can only return 'open' orders (i.e. no way to fetch 'closed' orders)
        let openOrders = [];
        if ('return' in response)
            openOrders = this.parseOrders (response['return'], market);
        let allOrders = this.updateCachedOrders (openOrders, symbol);
        let result = this.filterBySymbol (allOrders, symbol);
        return this.filterBySinceLimit (result, since, limit);
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let orders = await this.fetchOrders (symbol, since, limit, params);
        return this.filterBy (orders, 'status', 'open');
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let orders = await this.fetchOrders (symbol, since, limit, params);
        return this.filterBy (orders, 'status', 'closed');
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        let request = {
            // 'from': 123456789, // trade ID, from which the display starts numerical 0 (test result: liqui ignores this field)
            // 'count': 1000, // the number of trades for display numerical, default = 1000
            // 'from_id': trade ID, from which the display starts numerical 0
            // 'end_id': trade ID on which the display ends numerical ∞
            // 'order': 'ASC', // sorting, default = DESC (test result: liqui ignores this field, most recent trade always goes last)
            // 'since': 1234567890, // UTC start time, default = 0 (test result: liqui ignores this field)
            // 'end': 1234567890, // UTC end time, default = ∞ (test result: liqui ignores this field)
            // 'pair': 'eth_btc', // default = all markets
        };
        if (typeof symbol !== 'undefined') {
            market = this.market (symbol);
            request['pair'] = market['id'];
        }
        if (typeof limit !== 'undefined')
            request['count'] = parseInt (limit);
        if (typeof since !== 'undefined')
            request['since'] = parseInt (since / 1000);
        let response = await this.privatePostTradeHistory (this.extend (request, params));
        let trades = [];
        if ('return' in response)
            trades = response['return'];
        return this.parseTrades (trades, market, since, limit);
    }

    async withdraw (currency, amount, address, tag = undefined, params = {}) {
        this.checkAddress (address);
        await this.loadMarkets ();
        let response = await this.privatePostWithdrawCoin (this.extend ({
            'coinName': currency,
            'amount': parseFloat (amount),
            'address': address,
        }, params));
        return {
            'info': response,
            'id': response['return']['tId'],
        };
    }

    signBodyWithSecret (body) {
        return this.hmac (this.encode (body), this.encode (this.secret), 'sha512');
    }

    getVersionString () {
        return '/' + this.version;
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'][api];
        let query = this.omit (params, this.extractParams (path));
        if (api === 'private') {
            this.checkRequiredCredentials ();
            let nonce = this.nonce ();
            body = this.urlencode (this.extend ({
                'nonce': nonce,
                'method': path,
            }, query));
            let signature = this.signBodyWithSecret (body);
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Key': this.apiKey,
                'Sign': signature,
            };
        } else if (api === 'public') {
            url += this.getVersionString () + '/' + this.implodeParams (path, params);
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
        } else {
            url += '/' + this.implodeParams (path, params);
            if (method === 'GET') {
                if (Object.keys (query).length) {
                    url += '?' + this.urlencode (query);
                }
            } else {
                if (Object.keys (query).length) {
                    body = this.json (query);
                    headers = {
                        'Content-Type': 'application/json',
                    };
                }
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (httpCode, reason, url, method, headers, body) {
        if (typeof body !== 'string')
            return; // fallback to default error handler
        if (body.length < 2)
            return; // fallback to default error handler
        if ((body[0] === '{') || (body[0] === '[')) {
            let response = JSON.parse (body);
            if ('success' in response) {
                //
                // 1 - Liqui only returns the integer 'success' key from their private API
                //
                //     { "success": 1, ... } httpCode === 200
                //     { "success": 0, ... } httpCode === 200
                //
                // 2 - However, exchanges derived from Liqui, can return non-integers
                //
                //     It can be a numeric string
                //     { "sucesss": "1", ... }
                //     { "sucesss": "0", ... }, httpCode >= 200 (can be 403, 502, etc)
                //
                //     Or just a string
                //     { "success": "true", ... }
                //     { "success": "false", ... }, httpCode >= 200
                //
                //     Or a boolean
                //     { "success": true, ... }
                //     { "success": false, ... }, httpCode >= 200
                //
                // 3 - Oversimplified, Python PEP8 forbids comparison operator (===) of different types
                //
                // 4 - We do not want to copy-paste and duplicate the code of this handler to other exchanges derived from Liqui
                //
                // To cover points 1, 2, 3 and 4 combined this handler should work like this:
                //
                let success = this.safeValue (response, 'success', false);
                if (typeof success === 'string') {
                    if ((success === 'true') || (success === '1'))
                        success = true;
                    else
                        success = false;
                }
                if (!success) {
                    const code = this.safeString (response, 'code');
                    const message = this.safeString (response, 'error');
                    const feedback = this.id + ' ' + this.json (response);
                    const exceptions = this.exceptions;
                    if (code in exceptions) {
                        throw new exceptions[code] (feedback);
                    }
                    // need a second error map for these messages, apparently...
                    // in fact, we can use the same .exceptions with string-keys to save some loc here
                    if (message === 'invalid api key') {
                        throw new AuthenticationError (feedback);
                    } else if (message === 'invalid sign') {
                        throw new AuthenticationError (feedback);
                    } else if (message === 'api key dont have trade permission') {
                        throw new AuthenticationError (feedback);
                    } else if (message.indexOf ('invalid parameter') >= 0) { // errorCode 0, returned on buy(symbol, 0, 0)
                        throw new InvalidOrder (feedback);
                    } else if (message === 'invalid order') {
                        throw new InvalidOrder (feedback);
                    } else if (message === 'Requests too often') {
                        throw new DDoSProtection (feedback);
                    } else if (message === 'not available') {
                        throw new ExchangeNotAvailable (feedback);
                    } else if (message === 'data unavailable') {
                        throw new ExchangeNotAvailable (feedback);
                    } else if (message === 'external service unavailable') {
                        throw new ExchangeNotAvailable (feedback);
                    } else {
                        throw new ExchangeError (this.id + ' unknown "error" value: ' + this.json (response));
                    }
                }
            }
        }
    }
};

},{"./base/Exchange":3,"./base/errors":5}],27:[function(require,module,exports){
'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError, ExchangeNotAvailable, RequestTimeout, AuthenticationError, DDoSProtection, InsufficientFunds, OrderNotFound, OrderNotCached, InvalidOrder, AccountSuspended, CancelPending, InvalidNonce } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class poloniex extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'poloniex',
            'name': 'Poloniex',
            'countries': [ 'US' ],
            'rateLimit': 1000, // up to 6 calls per second
            'has': {
                'createDepositAddress': true,
                'fetchDepositAddress': true,
                'CORS': false,
                'editOrder': true,
                'createMarketOrder': false,
                'fetchOHLCV': true,
                'fetchOrderTrades': true,
                'fetchMyTrades': true,
                'fetchOrder': 'emulated',
                'fetchOrders': 'emulated',
                'fetchOpenOrders': true,
                'fetchClosedOrders': 'emulated',
                'fetchTickers': true,
                'fetchTradingFees': true,
                'fetchCurrencies': true,
                'withdraw': true,
            },
            'timeframes': {
                '5m': 300,
                '15m': 900,
                '30m': 1800,
                '2h': 7200,
                '4h': 14400,
                '1d': 86400,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/27766817-e9456312-5ee6-11e7-9b3c-b628ca5626a5.jpg',
                'api': {
                    'public': 'https://poloniex.com/public',
                    'private': 'https://poloniex.com/tradingApi',
                },
                'www': 'https://poloniex.com',
                'doc': [
                    'https://poloniex.com/support/api/',
                    'http://pastebin.com/dMX7mZE0',
                ],
                'fees': 'https://poloniex.com/fees',
            },
            'api': {
                'public': {
                    'get': [
                        'return24hVolume',
                        'returnChartData',
                        'returnCurrencies',
                        'returnLoanOrders',
                        'returnOrderBook',
                        'returnTicker',
                        'returnTradeHistory',
                    ],
                },
                'private': {
                    'post': [
                        'buy',
                        'cancelLoanOffer',
                        'cancelOrder',
                        'closeMarginPosition',
                        'createLoanOffer',
                        'generateNewAddress',
                        'getMarginPosition',
                        'marginBuy',
                        'marginSell',
                        'moveOrder',
                        'returnActiveLoans',
                        'returnAvailableAccountBalances',
                        'returnBalances',
                        'returnCompleteBalances',
                        'returnDepositAddresses',
                        'returnDepositsWithdrawals',
                        'returnFeeInfo',
                        'returnLendingHistory',
                        'returnMarginAccountSummary',
                        'returnOpenLoanOffers',
                        'returnOpenOrders',
                        'returnOrderTrades',
                        'returnTradableBalances',
                        'returnTradeHistory',
                        'sell',
                        'toggleAutoRenew',
                        'transferBalance',
                        'withdraw',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'maker': 0.0015,
                    'taker': 0.0025,
                },
                'funding': {},
            },
            'limits': {
                'amount': {
                    'min': 0.00000001,
                    'max': 1000000000,
                },
                'price': {
                    'min': 0.00000001,
                    'max': 1000000000,
                },
                'cost': {
                    'min': 0.00000000,
                    'max': 1000000000,
                },
            },
            'precision': {
                'amount': 8,
                'price': 8,
            },
            'commonCurrencies': {
                'AIR': 'AirCoin',
                'APH': 'AphroditeCoin',
                'BCC': 'BTCtalkcoin',
                'BDG': 'Badgercoin',
                'BTM': 'Bitmark',
                'CON': 'Coino',
                'GOLD': 'GoldEagles',
                'GPUC': 'GPU',
                'HOT': 'Hotcoin',
                'ITC': 'Information Coin',
                'PLX': 'ParallaxCoin',
                'KEY': 'KEYCoin',
                'STR': 'XLM',
                'SOC': 'SOCC',
                'XAP': 'API Coin',
            },
            'options': {
                'limits': {
                    'cost': {
                        'min': {
                            'BTC': 0.0001,
                            'ETH': 0.0001,
                            'XMR': 0.0001,
                            'USDT': 1.0,
                        },
                    },
                },
            },
        });
    }

    calculateFee (symbol, type, side, amount, price, takerOrMaker = 'taker', params = {}) {
        let market = this.markets[symbol];
        let key = 'quote';
        let rate = market[takerOrMaker];
        let cost = parseFloat (this.costToPrecision (symbol, amount * rate));
        if (side === 'sell') {
            cost *= price;
        } else {
            key = 'base';
        }
        return {
            'type': takerOrMaker,
            'currency': market[key],
            'rate': rate,
            'cost': parseFloat (this.feeToPrecision (symbol, cost)),
        };
    }

    parseOHLCV (ohlcv, market = undefined, timeframe = '5m', since = undefined, limit = undefined) {
        return [
            ohlcv['date'] * 1000,
            ohlcv['open'],
            ohlcv['high'],
            ohlcv['low'],
            ohlcv['close'],
            ohlcv['quoteVolume'],
        ];
    }

    async fetchOHLCV (symbol, timeframe = '5m', since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        if (typeof since === 'undefined')
            since = 0;
        let request = {
            'currencyPair': market['id'],
            'period': this.timeframes[timeframe],
            'start': parseInt (since / 1000),
        };
        if (typeof limit !== 'undefined')
            request['end'] = this.sum (request['start'], limit * this.timeframes[timeframe]);
        let response = await this.publicGetReturnChartData (this.extend (request, params));
        return this.parseOHLCVs (response, market, timeframe, since, limit);
    }

    async fetchMarkets () {
        let markets = await this.publicGetReturnTicker ();
        let keys = Object.keys (markets);
        let result = [];
        for (let p = 0; p < keys.length; p++) {
            let id = keys[p];
            let market = markets[id];
            let [ quote, base ] = id.split ('_');
            base = this.commonCurrencyCode (base);
            quote = this.commonCurrencyCode (quote);
            let symbol = base + '/' + quote;
            let minCost = this.safeFloat (this.options['limits']['cost']['min'], quote, 0.0);
            result.push (this.extend (this.fees['trading'], {
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'active': true,
                'precision': {
                    'amount': 8,
                    'price': 8,
                },
                'limits': {
                    'amount': {
                        'min': 0.00000001,
                        'max': 1000000000,
                    },
                    'price': {
                        'min': 0.00000001,
                        'max': 1000000000,
                    },
                    'cost': {
                        'min': minCost,
                        'max': 1000000000,
                    },
                },
                'info': market,
            }));
        }
        return result;
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let balances = await this.privatePostReturnCompleteBalances (this.extend ({
            'account': 'all',
        }, params));
        let result = { 'info': balances };
        let currencies = Object.keys (balances);
        for (let c = 0; c < currencies.length; c++) {
            let id = currencies[c];
            let balance = balances[id];
            let currency = this.commonCurrencyCode (id);
            let account = {
                'free': parseFloat (balance['available']),
                'used': parseFloat (balance['onOrders']),
                'total': 0.0,
            };
            account['total'] = this.sum (account['free'], account['used']);
            result[currency] = account;
        }
        return this.parseBalance (result);
    }

    async fetchTradingFees (params = {}) {
        await this.loadMarkets ();
        let fees = await this.privatePostReturnFeeInfo ();
        return {
            'info': fees,
            'maker': this.safeFloat (fees, 'makerFee'),
            'taker': this.safeFloat (fees, 'takerFee'),
            'withdraw': {},
            'deposit': {},
        };
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {
            'currencyPair': this.marketId (symbol),
        };
        if (typeof limit !== 'undefined')
            request['depth'] = limit; // 100
        let response = await this.publicGetReturnOrderBook (this.extend (request, params));
        let orderbook = this.parseOrderBook (response);
        orderbook['nonce'] = this.safeInteger (response, 'sec');
        return orderbook;
    }

    parseTicker (ticker, market = undefined) {
        let timestamp = this.milliseconds ();
        let symbol = undefined;
        if (market)
            symbol = market['symbol'];
        let open = undefined;
        let change = undefined;
        let average = undefined;
        let last = this.safeFloat (ticker, 'last');
        let relativeChange = this.safeFloat (ticker, 'percentChange');
        if (relativeChange !== -1) {
            open = last / this.sum (1, relativeChange);
            change = last - open;
            average = this.sum (last, open) / 2;
        }
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'high24hr'),
            'low': this.safeFloat (ticker, 'low24hr'),
            'bid': this.safeFloat (ticker, 'highestBid'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'lowestAsk'),
            'askVolume': undefined,
            'vwap': undefined,
            'open': open,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': change,
            'percentage': relativeChange * 100,
            'average': average,
            'baseVolume': this.safeFloat (ticker, 'quoteVolume'),
            'quoteVolume': this.safeFloat (ticker, 'baseVolume'),
            'info': ticker,
        };
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let tickers = await this.publicGetReturnTicker (params);
        let ids = Object.keys (tickers);
        let result = {};
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let market = this.markets_by_id[id];
            let symbol = market['symbol'];
            let ticker = tickers[id];
            result[symbol] = this.parseTicker (ticker, market);
        }
        return result;
    }

    async fetchCurrencies (params = {}) {
        let currencies = await this.publicGetReturnCurrencies (params);
        let ids = Object.keys (currencies);
        let result = {};
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let currency = currencies[id];
            // todo: will need to rethink the fees
            // to add support for multiple withdrawal/deposit methods and
            // differentiated fees for each particular method
            let precision = 8; // default precision, todo: fix "magic constants"
            let code = this.commonCurrencyCode (id);
            let active = (currency['delisted'] === 0) && !currency['disabled'];
            result[code] = {
                'id': id,
                'code': code,
                'info': currency,
                'name': currency['name'],
                'active': active,
                'fee': this.safeFloat (currency, 'txFee'), // todo: redesign
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': Math.pow (10, -precision),
                        'max': Math.pow (10, precision),
                    },
                    'price': {
                        'min': Math.pow (10, -precision),
                        'max': Math.pow (10, precision),
                    },
                    'cost': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'withdraw': {
                        'min': currency['txFee'],
                        'max': Math.pow (10, precision),
                    },
                },
            };
        }
        return result;
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let tickers = await this.publicGetReturnTicker (params);
        let ticker = tickers[market['id']];
        return this.parseTicker (ticker, market);
    }

    parseTrade (trade, market = undefined) {
        let timestamp = this.parse8601 (trade['date']);
        let symbol = undefined;
        let base = undefined;
        let quote = undefined;
        if ((!market) && ('currencyPair' in trade)) {
            let currencyPair = trade['currencyPair'];
            if (currencyPair in this.markets_by_id) {
                market = this.markets_by_id[currencyPair];
            } else {
                let parts = currencyPair.split ('_');
                quote = parts[0];
                base = parts[1];
                symbol = base + '/' + quote;
            }
        }
        if (typeof market !== 'undefined') {
            symbol = market['symbol'];
            base = market['base'];
            quote = market['quote'];
        }
        let side = trade['type'];
        let fee = undefined;
        let cost = this.safeFloat (trade, 'total');
        let amount = this.safeFloat (trade, 'amount');
        if ('fee' in trade) {
            let rate = this.safeFloat (trade, 'fee');
            let feeCost = undefined;
            let currency = undefined;
            if (side === 'buy') {
                currency = base;
                feeCost = amount * rate;
            } else {
                currency = quote;
                if (typeof cost !== 'undefined')
                    feeCost = cost * rate;
            }
            fee = {
                'type': undefined,
                'rate': rate,
                'cost': feeCost,
                'currency': currency,
            };
        }
        return {
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'id': this.safeString (trade, 'tradeID'),
            'order': this.safeString (trade, 'orderNumber'),
            'type': 'limit',
            'side': side,
            'price': this.safeFloat (trade, 'rate'),
            'amount': amount,
            'cost': cost,
            'fee': fee,
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'currencyPair': market['id'],
        };
        if (typeof since !== 'undefined') {
            request['start'] = parseInt (since / 1000);
            request['end'] = this.seconds (); // last 50000 trades by default
        }
        let trades = await this.publicGetReturnTradeHistory (this.extend (request, params));
        return this.parseTrades (trades, market, since, limit);
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        if (typeof symbol !== 'undefined')
            market = this.market (symbol);
        let pair = market ? market['id'] : 'all';
        let request = { 'currencyPair': pair };
        if (typeof since !== 'undefined') {
            request['start'] = parseInt (since / 1000);
            request['end'] = this.seconds ();
        }
        // limit is disabled (does not really work as expected)
        if (typeof limit !== 'undefined')
            request['limit'] = parseInt (limit);
        let response = await this.privatePostReturnTradeHistory (this.extend (request, params));
        let result = [];
        if (typeof market !== 'undefined') {
            result = this.parseTrades (response, market);
        } else {
            if (response) {
                let ids = Object.keys (response);
                for (let i = 0; i < ids.length; i++) {
                    let id = ids[i];
                    let market = undefined;
                    if (id in this.markets_by_id)
                        market = this.markets_by_id[id];
                    let trades = this.parseTrades (response[id], market);
                    for (let j = 0; j < trades.length; j++) {
                        result.push (trades[j]);
                    }
                }
            }
        }
        return this.filterBySinceLimit (result, since, limit);
    }

    parseOrder (order, market = undefined) {
        let timestamp = this.safeInteger (order, 'timestamp');
        if (!timestamp)
            timestamp = this.parse8601 (order['date']);
        let trades = undefined;
        if ('resultingTrades' in order)
            trades = this.parseTrades (order['resultingTrades'], market);
        let symbol = undefined;
        if (market)
            symbol = market['symbol'];
        let price = this.safeFloat (order, 'price');
        let remaining = this.safeFloat (order, 'amount');
        let amount = this.safeFloat (order, 'startingAmount', remaining);
        let filled = undefined;
        let cost = 0;
        if (typeof amount !== 'undefined') {
            if (typeof remaining !== 'undefined') {
                filled = amount - remaining;
                if (typeof price !== 'undefined')
                    cost = filled * price;
            }
        }
        if (typeof filled === 'undefined') {
            if (typeof trades !== 'undefined') {
                filled = 0;
                cost = 0;
                for (let i = 0; i < trades.length; i++) {
                    let trade = trades[i];
                    let tradeAmount = trade['amount'];
                    let tradePrice = trade['price'];
                    filled = this.sum (filled, tradeAmount);
                    cost += tradePrice * tradeAmount;
                }
            }
        }
        return {
            'info': order,
            'id': order['orderNumber'],
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'status': order['status'],
            'symbol': symbol,
            'type': order['type'],
            'side': order['side'],
            'price': price,
            'cost': cost,
            'amount': amount,
            'filled': filled,
            'remaining': remaining,
            'trades': trades,
            'fee': undefined,
        };
    }

    parseOpenOrders (orders, market, result) {
        for (let i = 0; i < orders.length; i++) {
            let order = orders[i];
            let extended = this.extend (order, {
                'status': 'open',
                'type': 'limit',
                'side': order['type'],
                'price': order['rate'],
            });
            result.push (this.parseOrder (extended, market));
        }
        return result;
    }

    async fetchOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        if (typeof symbol !== 'undefined')
            market = this.market (symbol);
        let pair = market ? market['id'] : 'all';
        let response = await this.privatePostReturnOpenOrders (this.extend ({
            'currencyPair': pair,
        }));
        let openOrders = [];
        if (typeof market !== 'undefined') {
            openOrders = this.parseOpenOrders (response, market, openOrders);
        } else {
            let marketIds = Object.keys (response);
            for (let i = 0; i < marketIds.length; i++) {
                let marketId = marketIds[i];
                let orders = response[marketId];
                let m = this.markets_by_id[marketId];
                openOrders = this.parseOpenOrders (orders, m, openOrders);
            }
        }
        for (let j = 0; j < openOrders.length; j++) {
            this.orders[openOrders[j]['id']] = openOrders[j];
        }
        let openOrdersIndexedById = this.indexBy (openOrders, 'id');
        let cachedOrderIds = Object.keys (this.orders);
        let result = [];
        for (let k = 0; k < cachedOrderIds.length; k++) {
            let id = cachedOrderIds[k];
            if (id in openOrdersIndexedById) {
                this.orders[id] = this.extend (this.orders[id], openOrdersIndexedById[id]);
            } else {
                let order = this.orders[id];
                if (order['status'] === 'open') {
                    order = this.extend (order, {
                        'status': 'closed',
                        'cost': undefined,
                        'filled': order['amount'],
                        'remaining': 0.0,
                    });
                    if (typeof order['cost'] === 'undefined') {
                        if (typeof order['filled'] !== 'undefined')
                            order['cost'] = order['filled'] * order['price'];
                    }
                    this.orders[id] = order;
                }
            }
            let order = this.orders[id];
            if (typeof market !== 'undefined') {
                if (order['symbol'] === symbol)
                    result.push (order);
            } else {
                result.push (order);
            }
        }
        return this.filterBySinceLimit (result, since, limit);
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        let since = this.safeValue (params, 'since');
        let limit = this.safeValue (params, 'limit');
        let request = this.omit (params, [ 'since', 'limit' ]);
        let orders = await this.fetchOrders (symbol, since, limit, request);
        for (let i = 0; i < orders.length; i++) {
            if (orders[i]['id'] === id)
                return orders[i];
        }
        throw new OrderNotCached (this.id + ' order id ' + id.toString () + ' is not in "open" state and not found in cache');
    }

    filterOrdersByStatus (orders, status) {
        let result = [];
        for (let i = 0; i < orders.length; i++) {
            if (orders[i]['status'] === status)
                result.push (orders[i]);
        }
        return result;
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let orders = await this.fetchOrders (symbol, since, limit, params);
        return this.filterOrdersByStatus (orders, 'open');
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let orders = await this.fetchOrders (symbol, since, limit, params);
        return this.filterOrdersByStatus (orders, 'closed');
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        if (type === 'market')
            throw new ExchangeError (this.id + ' allows limit orders only');
        await this.loadMarkets ();
        let method = 'privatePost' + this.capitalize (side);
        let market = this.market (symbol);
        price = parseFloat (price);
        amount = parseFloat (amount);
        let response = await this[method] (this.extend ({
            'currencyPair': market['id'],
            'rate': this.priceToPrecision (symbol, price),
            'amount': this.amountToPrecision (symbol, amount),
        }, params));
        let timestamp = this.milliseconds ();
        let order = this.parseOrder (this.extend ({
            'timestamp': timestamp,
            'status': 'open',
            'type': type,
            'side': side,
            'price': price,
            'amount': amount,
        }, response), market);
        let id = order['id'];
        this.orders[id] = order;
        return this.extend ({ 'info': response }, order);
    }

    async editOrder (id, symbol, type, side, amount, price = undefined, params = {}) {
        await this.loadMarkets ();
        price = parseFloat (price);
        let request = {
            'orderNumber': id,
            'rate': this.priceToPrecision (symbol, price),
        };
        if (typeof amount !== 'undefined') {
            amount = parseFloat (amount);
            request['amount'] = this.amountToPrecision (symbol, amount);
        }
        let response = await this.privatePostMoveOrder (this.extend (request, params));
        let result = undefined;
        if (id in this.orders) {
            this.orders[id]['status'] = 'canceled';
            let newid = response['orderNumber'];
            this.orders[newid] = this.extend (this.orders[id], {
                'id': newid,
                'price': price,
                'status': 'open',
            });
            if (typeof amount !== 'undefined')
                this.orders[newid]['amount'] = amount;
            result = this.extend (this.orders[newid], { 'info': response });
        } else {
            let market = undefined;
            if (typeof symbol !== 'undefined')
                market = this.market (symbol);
            result = this.parseOrder (response, market);
            this.orders[result['id']] = result;
        }
        return result;
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let response = undefined;
        try {
            response = await this.privatePostCancelOrder (this.extend ({
                'orderNumber': id,
            }, params));
        } catch (e) {
            if (e instanceof CancelPending) {
                // A request to cancel the order has been sent already.
                // If we then attempt to cancel the order the second time
                // before the first request is processed the exchange will
                // throw a CancelPending exception. Poloniex won't show the
                // order in the list of active (open) orders and the cached
                // order will be marked as 'closed' (see #1801 for details).
                // To avoid that we proactively mark the order as 'canceled'
                // here. If for some reason the order does not get canceled
                // and still appears in the active list then the order cache
                // will eventually get back in sync on a call to `fetchOrder`.
                if (id in this.orders)
                    this.orders[id]['status'] = 'canceled';
            }
            throw e;
        }
        if (id in this.orders)
            this.orders[id]['status'] = 'canceled';
        return response;
    }

    async fetchOrderStatus (id, symbol = undefined) {
        await this.loadMarkets ();
        let orders = await this.fetchOpenOrders (symbol);
        let indexed = this.indexBy (orders, 'id');
        return (id in indexed) ? 'open' : 'closed';
    }

    async fetchOrderTrades (id, symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let trades = await this.privatePostReturnOrderTrades (this.extend ({
            'orderNumber': id,
        }, params));
        return this.parseTrades (trades);
    }

    async createDepositAddress (code, params = {}) {
        await this.loadMarkets ();
        let currency = this.currency (code);
        let response = await this.privatePostGenerateNewAddress ({
            'currency': currency['id'],
        });
        let address = undefined;
        if (response['success'] === 1)
            address = this.safeString (response, 'response');
        this.checkAddress (address);
        return {
            'currency': code,
            'address': address,
            'tag': undefined,
            'info': response,
        };
    }

    async fetchDepositAddress (code, params = {}) {
        await this.loadMarkets ();
        let currency = this.currency (code);
        let response = await this.privatePostReturnDepositAddresses ();
        let currencyId = currency['id'];
        let address = this.safeString (response, currencyId);
        this.checkAddress (address);
        return {
            'currency': code,
            'address': address,
            'tag': undefined,
            'info': response,
        };
    }

    async withdraw (code, amount, address, tag = undefined, params = {}) {
        this.checkAddress (address);
        await this.loadMarkets ();
        let currency = this.currency (code);
        let request = {
            'currency': currency['id'],
            'amount': amount,
            'address': address,
        };
        if (tag)
            request['paymentId'] = tag;
        let result = await this.privatePostWithdraw (this.extend (request, params));
        return {
            'info': result,
            'id': result['response'],
        };
    }

    nonce () {
        return this.milliseconds ();
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'][api];
        let query = this.extend ({ 'command': path }, params);
        if (api === 'public') {
            url += '?' + this.urlencode (query);
        } else {
            this.checkRequiredCredentials ();
            query['nonce'] = this.nonce ();
            body = this.urlencode (query);
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Key': this.apiKey,
                'Sign': this.hmac (this.encode (body), this.encode (this.secret), 'sha512'),
            };
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (code, reason, url, method, headers, body) {
        let response = undefined;
        try {
            response = JSON.parse (body);
        } catch (e) {
            // syntax error, resort to default error handler
            return;
        }
        if ('error' in response) {
            const message = response['error'];
            const feedback = this.id + ' ' + this.json (response);
            if (message === 'Invalid order number, or you are not the person who placed the order.') {
                throw new OrderNotFound (feedback);
            } else if (message === 'Connection timed out. Please try again.') {
                throw new RequestTimeout (feedback);
            } else if (message === 'Internal error. Please try again.') {
                throw new ExchangeNotAvailable (feedback);
            } else if (message === 'Order not found, or you are not the person who placed it.') {
                throw new OrderNotFound (feedback);
            } else if (message === 'Invalid API key/secret pair.') {
                throw new AuthenticationError (feedback);
            } else if (message === 'Please do not make more than 8 API calls per second.') {
                throw new DDoSProtection (feedback);
            } else if (message.indexOf ('Total must be at least') >= 0) {
                throw new InvalidOrder (feedback);
            } else if (message.indexOf ('This account is frozen.') >= 0) {
                throw new AccountSuspended (feedback);
            } else if (message.indexOf ('Not enough') >= 0) {
                throw new InsufficientFunds (feedback);
            } else if (message.indexOf ('Nonce must be greater') >= 0) {
                throw new InvalidNonce (feedback);
            } else if (message.indexOf ('You have already called cancelOrder or moveOrder on this order.') >= 0) {
                throw new CancelPending (feedback);
            } else {
                throw new ExchangeError (this.id + ' unknown error ' + this.json (response));
            }
        }
    }
};

},{"./base/Exchange":3,"./base/errors":5}],28:[function(require,module,exports){
'use strict';

// ---------------------------------------------------------------------------

const liqui = require ('./liqui.js');

// ---------------------------------------------------------------------------

module.exports = class tidex extends liqui {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'tidex',
            'name': 'Tidex',
            'countries': [ 'UK' ],
            'rateLimit': 2000,
            'version': '3',
            'has': {
                // 'CORS': false,
                // 'fetchTickers': true
                'fetchCurrencies': true,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/30781780-03149dc4-a12e-11e7-82bb-313b269d24d4.jpg',
                'api': {
                    'web': 'https://web.tidex.com/api',
                    'public': 'https://api.tidex.com/api/3',
                    'private': 'https://api.tidex.com/tapi',
                },
                'www': 'https://tidex.com',
                'doc': 'https://tidex.com/exchange/public-api',
                'fees': [
                    'https://tidex.com/exchange/assets-spec',
                    'https://tidex.com/exchange/pairs-spec',
                ],
            },
            'api': {
                'web': {
                    'get': [
                        'currency',
                        'pairs',
                        'tickers',
                        'orders',
                        'ordershistory',
                        'trade-data',
                        'trade-data/{id}',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'tierBased': false,
                    'percentage': true,
                    'taker': 0.1 / 100,
                    'maker': 0.1 / 100,
                },
            },
            'commonCurrencies': {
                'MGO': 'WMGO',
                'EMGO': 'MGO',
            },
        });
    }

    async fetchCurrencies (params = {}) {
        let currencies = await this.webGetCurrency (params);
        let result = {};
        for (let i = 0; i < currencies.length; i++) {
            let currency = currencies[i];
            let id = currency['symbol'];
            let precision = currency['amountPoint'];
            let code = id.toUpperCase ();
            code = this.commonCurrencyCode (code);
            let active = currency['visible'] === true;
            let canWithdraw = currency['withdrawEnable'] === true;
            let canDeposit = currency['depositEnable'] === true;
            if (!canWithdraw || !canDeposit) {
                active = false;
            }
            result[code] = {
                'id': id,
                'code': code,
                'name': currency['name'],
                'active': active,
                'precision': precision,
                'funding': {
                    'withdraw': {
                        'active': canWithdraw,
                        'fee': currency['withdrawFee'],
                    },
                    'deposit': {
                        'active': canDeposit,
                        'fee': 0.0,
                    },
                },
                'limits': {
                    'amount': {
                        'min': undefined,
                        'max': Math.pow (10, precision),
                    },
                    'price': {
                        'min': Math.pow (10, -precision),
                        'max': Math.pow (10, precision),
                    },
                    'cost': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'withdraw': {
                        'min': currency['withdrawMinAmout'],
                        'max': undefined,
                    },
                    'deposit': {
                        'min': currency['depositMinAmount'],
                        'max': undefined,
                    },
                },
                'info': currency,
            };
        }
        return result;
    }

    getVersionString () {
        return '';
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'][api];
        let query = this.omit (params, this.extractParams (path));
        if (api === 'private') {
            this.checkRequiredCredentials ();
            let nonce = this.nonce ();
            body = this.urlencode (this.extend ({
                'nonce': nonce,
                'method': path,
            }, query));
            let signature = this.signBodyWithSecret (body);
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Key': this.apiKey,
                'Sign': signature,
            };
        } else if (api === 'public') {
            url += this.getVersionString () + '/' + this.implodeParams (path, params);
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
        } else {
            url += '/' + this.implodeParams (path, params);
            if (method === 'GET') {
                if (Object.keys (query).length) {
                    url += '?' + this.urlencode (query);
                }
            } else {
                if (Object.keys (query).length) {
                    body = this.urlencode (query);
                    headers = {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    };
                }
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }
};

},{"./liqui.js":26}],29:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./enc-base64"), require("./md5"), require("./evpkdf"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var BlockCipher = C_lib.BlockCipher;
	    var C_algo = C.algo;

	    // Lookup tables
	    var SBOX = [];
	    var INV_SBOX = [];
	    var SUB_MIX_0 = [];
	    var SUB_MIX_1 = [];
	    var SUB_MIX_2 = [];
	    var SUB_MIX_3 = [];
	    var INV_SUB_MIX_0 = [];
	    var INV_SUB_MIX_1 = [];
	    var INV_SUB_MIX_2 = [];
	    var INV_SUB_MIX_3 = [];

	    // Compute lookup tables
	    (function () {
	        // Compute double table
	        var d = [];
	        for (var i = 0; i < 256; i++) {
	            if (i < 128) {
	                d[i] = i << 1;
	            } else {
	                d[i] = (i << 1) ^ 0x11b;
	            }
	        }

	        // Walk GF(2^8)
	        var x = 0;
	        var xi = 0;
	        for (var i = 0; i < 256; i++) {
	            // Compute sbox
	            var sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
	            sx = (sx >>> 8) ^ (sx & 0xff) ^ 0x63;
	            SBOX[x] = sx;
	            INV_SBOX[sx] = x;

	            // Compute multiplication
	            var x2 = d[x];
	            var x4 = d[x2];
	            var x8 = d[x4];

	            // Compute sub bytes, mix columns tables
	            var t = (d[sx] * 0x101) ^ (sx * 0x1010100);
	            SUB_MIX_0[x] = (t << 24) | (t >>> 8);
	            SUB_MIX_1[x] = (t << 16) | (t >>> 16);
	            SUB_MIX_2[x] = (t << 8)  | (t >>> 24);
	            SUB_MIX_3[x] = t;

	            // Compute inv sub bytes, inv mix columns tables
	            var t = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100);
	            INV_SUB_MIX_0[sx] = (t << 24) | (t >>> 8);
	            INV_SUB_MIX_1[sx] = (t << 16) | (t >>> 16);
	            INV_SUB_MIX_2[sx] = (t << 8)  | (t >>> 24);
	            INV_SUB_MIX_3[sx] = t;

	            // Compute next counter
	            if (!x) {
	                x = xi = 1;
	            } else {
	                x = x2 ^ d[d[d[x8 ^ x2]]];
	                xi ^= d[d[xi]];
	            }
	        }
	    }());

	    // Precomputed Rcon lookup
	    var RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

	    /**
	     * AES block cipher algorithm.
	     */
	    var AES = C_algo.AES = BlockCipher.extend({
	        _doReset: function () {
	            // Skip reset of nRounds has been set before and key did not change
	            if (this._nRounds && this._keyPriorReset === this._key) {
	                return;
	            }

	            // Shortcuts
	            var key = this._keyPriorReset = this._key;
	            var keyWords = key.words;
	            var keySize = key.sigBytes / 4;

	            // Compute number of rounds
	            var nRounds = this._nRounds = keySize + 6;

	            // Compute number of key schedule rows
	            var ksRows = (nRounds + 1) * 4;

	            // Compute key schedule
	            var keySchedule = this._keySchedule = [];
	            for (var ksRow = 0; ksRow < ksRows; ksRow++) {
	                if (ksRow < keySize) {
	                    keySchedule[ksRow] = keyWords[ksRow];
	                } else {
	                    var t = keySchedule[ksRow - 1];

	                    if (!(ksRow % keySize)) {
	                        // Rot word
	                        t = (t << 8) | (t >>> 24);

	                        // Sub word
	                        t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff];

	                        // Mix Rcon
	                        t ^= RCON[(ksRow / keySize) | 0] << 24;
	                    } else if (keySize > 6 && ksRow % keySize == 4) {
	                        // Sub word
	                        t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff];
	                    }

	                    keySchedule[ksRow] = keySchedule[ksRow - keySize] ^ t;
	                }
	            }

	            // Compute inv key schedule
	            var invKeySchedule = this._invKeySchedule = [];
	            for (var invKsRow = 0; invKsRow < ksRows; invKsRow++) {
	                var ksRow = ksRows - invKsRow;

	                if (invKsRow % 4) {
	                    var t = keySchedule[ksRow];
	                } else {
	                    var t = keySchedule[ksRow - 4];
	                }

	                if (invKsRow < 4 || ksRow <= 4) {
	                    invKeySchedule[invKsRow] = t;
	                } else {
	                    invKeySchedule[invKsRow] = INV_SUB_MIX_0[SBOX[t >>> 24]] ^ INV_SUB_MIX_1[SBOX[(t >>> 16) & 0xff]] ^
	                                               INV_SUB_MIX_2[SBOX[(t >>> 8) & 0xff]] ^ INV_SUB_MIX_3[SBOX[t & 0xff]];
	                }
	            }
	        },

	        encryptBlock: function (M, offset) {
	            this._doCryptBlock(M, offset, this._keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX);
	        },

	        decryptBlock: function (M, offset) {
	            // Swap 2nd and 4th rows
	            var t = M[offset + 1];
	            M[offset + 1] = M[offset + 3];
	            M[offset + 3] = t;

	            this._doCryptBlock(M, offset, this._invKeySchedule, INV_SUB_MIX_0, INV_SUB_MIX_1, INV_SUB_MIX_2, INV_SUB_MIX_3, INV_SBOX);

	            // Inv swap 2nd and 4th rows
	            var t = M[offset + 1];
	            M[offset + 1] = M[offset + 3];
	            M[offset + 3] = t;
	        },

	        _doCryptBlock: function (M, offset, keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX) {
	            // Shortcut
	            var nRounds = this._nRounds;

	            // Get input, add round key
	            var s0 = M[offset]     ^ keySchedule[0];
	            var s1 = M[offset + 1] ^ keySchedule[1];
	            var s2 = M[offset + 2] ^ keySchedule[2];
	            var s3 = M[offset + 3] ^ keySchedule[3];

	            // Key schedule row counter
	            var ksRow = 4;

	            // Rounds
	            for (var round = 1; round < nRounds; round++) {
	                // Shift rows, sub bytes, mix columns, add round key
	                var t0 = SUB_MIX_0[s0 >>> 24] ^ SUB_MIX_1[(s1 >>> 16) & 0xff] ^ SUB_MIX_2[(s2 >>> 8) & 0xff] ^ SUB_MIX_3[s3 & 0xff] ^ keySchedule[ksRow++];
	                var t1 = SUB_MIX_0[s1 >>> 24] ^ SUB_MIX_1[(s2 >>> 16) & 0xff] ^ SUB_MIX_2[(s3 >>> 8) & 0xff] ^ SUB_MIX_3[s0 & 0xff] ^ keySchedule[ksRow++];
	                var t2 = SUB_MIX_0[s2 >>> 24] ^ SUB_MIX_1[(s3 >>> 16) & 0xff] ^ SUB_MIX_2[(s0 >>> 8) & 0xff] ^ SUB_MIX_3[s1 & 0xff] ^ keySchedule[ksRow++];
	                var t3 = SUB_MIX_0[s3 >>> 24] ^ SUB_MIX_1[(s0 >>> 16) & 0xff] ^ SUB_MIX_2[(s1 >>> 8) & 0xff] ^ SUB_MIX_3[s2 & 0xff] ^ keySchedule[ksRow++];

	                // Update state
	                s0 = t0;
	                s1 = t1;
	                s2 = t2;
	                s3 = t3;
	            }

	            // Shift rows, sub bytes, add round key
	            var t0 = ((SBOX[s0 >>> 24] << 24) | (SBOX[(s1 >>> 16) & 0xff] << 16) | (SBOX[(s2 >>> 8) & 0xff] << 8) | SBOX[s3 & 0xff]) ^ keySchedule[ksRow++];
	            var t1 = ((SBOX[s1 >>> 24] << 24) | (SBOX[(s2 >>> 16) & 0xff] << 16) | (SBOX[(s3 >>> 8) & 0xff] << 8) | SBOX[s0 & 0xff]) ^ keySchedule[ksRow++];
	            var t2 = ((SBOX[s2 >>> 24] << 24) | (SBOX[(s3 >>> 16) & 0xff] << 16) | (SBOX[(s0 >>> 8) & 0xff] << 8) | SBOX[s1 & 0xff]) ^ keySchedule[ksRow++];
	            var t3 = ((SBOX[s3 >>> 24] << 24) | (SBOX[(s0 >>> 16) & 0xff] << 16) | (SBOX[(s1 >>> 8) & 0xff] << 8) | SBOX[s2 & 0xff]) ^ keySchedule[ksRow++];

	            // Set output
	            M[offset]     = t0;
	            M[offset + 1] = t1;
	            M[offset + 2] = t2;
	            M[offset + 3] = t3;
	        },

	        keySize: 256/32
	    });

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.AES.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.AES.decrypt(ciphertext, key, cfg);
	     */
	    C.AES = BlockCipher._createHelper(AES);
	}());


	return CryptoJS.AES;

}));
},{"./cipher-core":30,"./core":31,"./enc-base64":32,"./evpkdf":34,"./md5":39}],30:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./evpkdf"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./evpkdf"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	/**
	 * Cipher core components.
	 */
	CryptoJS.lib.Cipher || (function (undefined) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var WordArray = C_lib.WordArray;
	    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm;
	    var C_enc = C.enc;
	    var Utf8 = C_enc.Utf8;
	    var Base64 = C_enc.Base64;
	    var C_algo = C.algo;
	    var EvpKDF = C_algo.EvpKDF;

	    /**
	     * Abstract base cipher template.
	     *
	     * @property {number} keySize This cipher's key size. Default: 4 (128 bits)
	     * @property {number} ivSize This cipher's IV size. Default: 4 (128 bits)
	     * @property {number} _ENC_XFORM_MODE A constant representing encryption mode.
	     * @property {number} _DEC_XFORM_MODE A constant representing decryption mode.
	     */
	    var Cipher = C_lib.Cipher = BufferedBlockAlgorithm.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {WordArray} iv The IV to use for this operation.
	         */
	        cfg: Base.extend(),

	        /**
	         * Creates this cipher in encryption mode.
	         *
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {Cipher} A cipher instance.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var cipher = CryptoJS.algo.AES.createEncryptor(keyWordArray, { iv: ivWordArray });
	         */
	        createEncryptor: function (key, cfg) {
	            return this.create(this._ENC_XFORM_MODE, key, cfg);
	        },

	        /**
	         * Creates this cipher in decryption mode.
	         *
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {Cipher} A cipher instance.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var cipher = CryptoJS.algo.AES.createDecryptor(keyWordArray, { iv: ivWordArray });
	         */
	        createDecryptor: function (key, cfg) {
	            return this.create(this._DEC_XFORM_MODE, key, cfg);
	        },

	        /**
	         * Initializes a newly created cipher.
	         *
	         * @param {number} xformMode Either the encryption or decryption transormation mode constant.
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @example
	         *
	         *     var cipher = CryptoJS.algo.AES.create(CryptoJS.algo.AES._ENC_XFORM_MODE, keyWordArray, { iv: ivWordArray });
	         */
	        init: function (xformMode, key, cfg) {
	            // Apply config defaults
	            this.cfg = this.cfg.extend(cfg);

	            // Store transform mode and key
	            this._xformMode = xformMode;
	            this._key = key;

	            // Set initial values
	            this.reset();
	        },

	        /**
	         * Resets this cipher to its initial state.
	         *
	         * @example
	         *
	         *     cipher.reset();
	         */
	        reset: function () {
	            // Reset data buffer
	            BufferedBlockAlgorithm.reset.call(this);

	            // Perform concrete-cipher logic
	            this._doReset();
	        },

	        /**
	         * Adds data to be encrypted or decrypted.
	         *
	         * @param {WordArray|string} dataUpdate The data to encrypt or decrypt.
	         *
	         * @return {WordArray} The data after processing.
	         *
	         * @example
	         *
	         *     var encrypted = cipher.process('data');
	         *     var encrypted = cipher.process(wordArray);
	         */
	        process: function (dataUpdate) {
	            // Append
	            this._append(dataUpdate);

	            // Process available blocks
	            return this._process();
	        },

	        /**
	         * Finalizes the encryption or decryption process.
	         * Note that the finalize operation is effectively a destructive, read-once operation.
	         *
	         * @param {WordArray|string} dataUpdate The final data to encrypt or decrypt.
	         *
	         * @return {WordArray} The data after final processing.
	         *
	         * @example
	         *
	         *     var encrypted = cipher.finalize();
	         *     var encrypted = cipher.finalize('data');
	         *     var encrypted = cipher.finalize(wordArray);
	         */
	        finalize: function (dataUpdate) {
	            // Final data update
	            if (dataUpdate) {
	                this._append(dataUpdate);
	            }

	            // Perform concrete-cipher logic
	            var finalProcessedData = this._doFinalize();

	            return finalProcessedData;
	        },

	        keySize: 128/32,

	        ivSize: 128/32,

	        _ENC_XFORM_MODE: 1,

	        _DEC_XFORM_MODE: 2,

	        /**
	         * Creates shortcut functions to a cipher's object interface.
	         *
	         * @param {Cipher} cipher The cipher to create a helper for.
	         *
	         * @return {Object} An object with encrypt and decrypt shortcut functions.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var AES = CryptoJS.lib.Cipher._createHelper(CryptoJS.algo.AES);
	         */
	        _createHelper: (function () {
	            function selectCipherStrategy(key) {
	                if (typeof key == 'string') {
	                    return PasswordBasedCipher;
	                } else {
	                    return SerializableCipher;
	                }
	            }

	            return function (cipher) {
	                return {
	                    encrypt: function (message, key, cfg) {
	                        return selectCipherStrategy(key).encrypt(cipher, message, key, cfg);
	                    },

	                    decrypt: function (ciphertext, key, cfg) {
	                        return selectCipherStrategy(key).decrypt(cipher, ciphertext, key, cfg);
	                    }
	                };
	            };
	        }())
	    });

	    /**
	     * Abstract base stream cipher template.
	     *
	     * @property {number} blockSize The number of 32-bit words this cipher operates on. Default: 1 (32 bits)
	     */
	    var StreamCipher = C_lib.StreamCipher = Cipher.extend({
	        _doFinalize: function () {
	            // Process partial blocks
	            var finalProcessedBlocks = this._process(!!'flush');

	            return finalProcessedBlocks;
	        },

	        blockSize: 1
	    });

	    /**
	     * Mode namespace.
	     */
	    var C_mode = C.mode = {};

	    /**
	     * Abstract base block cipher mode template.
	     */
	    var BlockCipherMode = C_lib.BlockCipherMode = Base.extend({
	        /**
	         * Creates this mode for encryption.
	         *
	         * @param {Cipher} cipher A block cipher instance.
	         * @param {Array} iv The IV words.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var mode = CryptoJS.mode.CBC.createEncryptor(cipher, iv.words);
	         */
	        createEncryptor: function (cipher, iv) {
	            return this.Encryptor.create(cipher, iv);
	        },

	        /**
	         * Creates this mode for decryption.
	         *
	         * @param {Cipher} cipher A block cipher instance.
	         * @param {Array} iv The IV words.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var mode = CryptoJS.mode.CBC.createDecryptor(cipher, iv.words);
	         */
	        createDecryptor: function (cipher, iv) {
	            return this.Decryptor.create(cipher, iv);
	        },

	        /**
	         * Initializes a newly created mode.
	         *
	         * @param {Cipher} cipher A block cipher instance.
	         * @param {Array} iv The IV words.
	         *
	         * @example
	         *
	         *     var mode = CryptoJS.mode.CBC.Encryptor.create(cipher, iv.words);
	         */
	        init: function (cipher, iv) {
	            this._cipher = cipher;
	            this._iv = iv;
	        }
	    });

	    /**
	     * Cipher Block Chaining mode.
	     */
	    var CBC = C_mode.CBC = (function () {
	        /**
	         * Abstract base CBC mode.
	         */
	        var CBC = BlockCipherMode.extend();

	        /**
	         * CBC encryptor.
	         */
	        CBC.Encryptor = CBC.extend({
	            /**
	             * Processes the data block at offset.
	             *
	             * @param {Array} words The data words to operate on.
	             * @param {number} offset The offset where the block starts.
	             *
	             * @example
	             *
	             *     mode.processBlock(data.words, offset);
	             */
	            processBlock: function (words, offset) {
	                // Shortcuts
	                var cipher = this._cipher;
	                var blockSize = cipher.blockSize;

	                // XOR and encrypt
	                xorBlock.call(this, words, offset, blockSize);
	                cipher.encryptBlock(words, offset);

	                // Remember this block to use with next block
	                this._prevBlock = words.slice(offset, offset + blockSize);
	            }
	        });

	        /**
	         * CBC decryptor.
	         */
	        CBC.Decryptor = CBC.extend({
	            /**
	             * Processes the data block at offset.
	             *
	             * @param {Array} words The data words to operate on.
	             * @param {number} offset The offset where the block starts.
	             *
	             * @example
	             *
	             *     mode.processBlock(data.words, offset);
	             */
	            processBlock: function (words, offset) {
	                // Shortcuts
	                var cipher = this._cipher;
	                var blockSize = cipher.blockSize;

	                // Remember this block to use with next block
	                var thisBlock = words.slice(offset, offset + blockSize);

	                // Decrypt and XOR
	                cipher.decryptBlock(words, offset);
	                xorBlock.call(this, words, offset, blockSize);

	                // This block becomes the previous block
	                this._prevBlock = thisBlock;
	            }
	        });

	        function xorBlock(words, offset, blockSize) {
	            // Shortcut
	            var iv = this._iv;

	            // Choose mixing block
	            if (iv) {
	                var block = iv;

	                // Remove IV for subsequent blocks
	                this._iv = undefined;
	            } else {
	                var block = this._prevBlock;
	            }

	            // XOR blocks
	            for (var i = 0; i < blockSize; i++) {
	                words[offset + i] ^= block[i];
	            }
	        }

	        return CBC;
	    }());

	    /**
	     * Padding namespace.
	     */
	    var C_pad = C.pad = {};

	    /**
	     * PKCS #5/7 padding strategy.
	     */
	    var Pkcs7 = C_pad.Pkcs7 = {
	        /**
	         * Pads data using the algorithm defined in PKCS #5/7.
	         *
	         * @param {WordArray} data The data to pad.
	         * @param {number} blockSize The multiple that the data should be padded to.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     CryptoJS.pad.Pkcs7.pad(wordArray, 4);
	         */
	        pad: function (data, blockSize) {
	            // Shortcut
	            var blockSizeBytes = blockSize * 4;

	            // Count padding bytes
	            var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;

	            // Create padding word
	            var paddingWord = (nPaddingBytes << 24) | (nPaddingBytes << 16) | (nPaddingBytes << 8) | nPaddingBytes;

	            // Create padding
	            var paddingWords = [];
	            for (var i = 0; i < nPaddingBytes; i += 4) {
	                paddingWords.push(paddingWord);
	            }
	            var padding = WordArray.create(paddingWords, nPaddingBytes);

	            // Add padding
	            data.concat(padding);
	        },

	        /**
	         * Unpads data that had been padded using the algorithm defined in PKCS #5/7.
	         *
	         * @param {WordArray} data The data to unpad.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     CryptoJS.pad.Pkcs7.unpad(wordArray);
	         */
	        unpad: function (data) {
	            // Get number of padding bytes from last byte
	            var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

	            // Remove padding
	            data.sigBytes -= nPaddingBytes;
	        }
	    };

	    /**
	     * Abstract base block cipher template.
	     *
	     * @property {number} blockSize The number of 32-bit words this cipher operates on. Default: 4 (128 bits)
	     */
	    var BlockCipher = C_lib.BlockCipher = Cipher.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {Mode} mode The block mode to use. Default: CBC
	         * @property {Padding} padding The padding strategy to use. Default: Pkcs7
	         */
	        cfg: Cipher.cfg.extend({
	            mode: CBC,
	            padding: Pkcs7
	        }),

	        reset: function () {
	            // Reset cipher
	            Cipher.reset.call(this);

	            // Shortcuts
	            var cfg = this.cfg;
	            var iv = cfg.iv;
	            var mode = cfg.mode;

	            // Reset block mode
	            if (this._xformMode == this._ENC_XFORM_MODE) {
	                var modeCreator = mode.createEncryptor;
	            } else /* if (this._xformMode == this._DEC_XFORM_MODE) */ {
	                var modeCreator = mode.createDecryptor;
	                // Keep at least one block in the buffer for unpadding
	                this._minBufferSize = 1;
	            }

	            if (this._mode && this._mode.__creator == modeCreator) {
	                this._mode.init(this, iv && iv.words);
	            } else {
	                this._mode = modeCreator.call(mode, this, iv && iv.words);
	                this._mode.__creator = modeCreator;
	            }
	        },

	        _doProcessBlock: function (words, offset) {
	            this._mode.processBlock(words, offset);
	        },

	        _doFinalize: function () {
	            // Shortcut
	            var padding = this.cfg.padding;

	            // Finalize
	            if (this._xformMode == this._ENC_XFORM_MODE) {
	                // Pad data
	                padding.pad(this._data, this.blockSize);

	                // Process final blocks
	                var finalProcessedBlocks = this._process(!!'flush');
	            } else /* if (this._xformMode == this._DEC_XFORM_MODE) */ {
	                // Process final blocks
	                var finalProcessedBlocks = this._process(!!'flush');

	                // Unpad data
	                padding.unpad(finalProcessedBlocks);
	            }

	            return finalProcessedBlocks;
	        },

	        blockSize: 128/32
	    });

	    /**
	     * A collection of cipher parameters.
	     *
	     * @property {WordArray} ciphertext The raw ciphertext.
	     * @property {WordArray} key The key to this ciphertext.
	     * @property {WordArray} iv The IV used in the ciphering operation.
	     * @property {WordArray} salt The salt used with a key derivation function.
	     * @property {Cipher} algorithm The cipher algorithm.
	     * @property {Mode} mode The block mode used in the ciphering operation.
	     * @property {Padding} padding The padding scheme used in the ciphering operation.
	     * @property {number} blockSize The block size of the cipher.
	     * @property {Format} formatter The default formatting strategy to convert this cipher params object to a string.
	     */
	    var CipherParams = C_lib.CipherParams = Base.extend({
	        /**
	         * Initializes a newly created cipher params object.
	         *
	         * @param {Object} cipherParams An object with any of the possible cipher parameters.
	         *
	         * @example
	         *
	         *     var cipherParams = CryptoJS.lib.CipherParams.create({
	         *         ciphertext: ciphertextWordArray,
	         *         key: keyWordArray,
	         *         iv: ivWordArray,
	         *         salt: saltWordArray,
	         *         algorithm: CryptoJS.algo.AES,
	         *         mode: CryptoJS.mode.CBC,
	         *         padding: CryptoJS.pad.PKCS7,
	         *         blockSize: 4,
	         *         formatter: CryptoJS.format.OpenSSL
	         *     });
	         */
	        init: function (cipherParams) {
	            this.mixIn(cipherParams);
	        },

	        /**
	         * Converts this cipher params object to a string.
	         *
	         * @param {Format} formatter (Optional) The formatting strategy to use.
	         *
	         * @return {string} The stringified cipher params.
	         *
	         * @throws Error If neither the formatter nor the default formatter is set.
	         *
	         * @example
	         *
	         *     var string = cipherParams + '';
	         *     var string = cipherParams.toString();
	         *     var string = cipherParams.toString(CryptoJS.format.OpenSSL);
	         */
	        toString: function (formatter) {
	            return (formatter || this.formatter).stringify(this);
	        }
	    });

	    /**
	     * Format namespace.
	     */
	    var C_format = C.format = {};

	    /**
	     * OpenSSL formatting strategy.
	     */
	    var OpenSSLFormatter = C_format.OpenSSL = {
	        /**
	         * Converts a cipher params object to an OpenSSL-compatible string.
	         *
	         * @param {CipherParams} cipherParams The cipher params object.
	         *
	         * @return {string} The OpenSSL-compatible string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var openSSLString = CryptoJS.format.OpenSSL.stringify(cipherParams);
	         */
	        stringify: function (cipherParams) {
	            // Shortcuts
	            var ciphertext = cipherParams.ciphertext;
	            var salt = cipherParams.salt;

	            // Format
	            if (salt) {
	                var wordArray = WordArray.create([0x53616c74, 0x65645f5f]).concat(salt).concat(ciphertext);
	            } else {
	                var wordArray = ciphertext;
	            }

	            return wordArray.toString(Base64);
	        },

	        /**
	         * Converts an OpenSSL-compatible string to a cipher params object.
	         *
	         * @param {string} openSSLStr The OpenSSL-compatible string.
	         *
	         * @return {CipherParams} The cipher params object.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var cipherParams = CryptoJS.format.OpenSSL.parse(openSSLString);
	         */
	        parse: function (openSSLStr) {
	            // Parse base64
	            var ciphertext = Base64.parse(openSSLStr);

	            // Shortcut
	            var ciphertextWords = ciphertext.words;

	            // Test for salt
	            if (ciphertextWords[0] == 0x53616c74 && ciphertextWords[1] == 0x65645f5f) {
	                // Extract salt
	                var salt = WordArray.create(ciphertextWords.slice(2, 4));

	                // Remove salt from ciphertext
	                ciphertextWords.splice(0, 4);
	                ciphertext.sigBytes -= 16;
	            }

	            return CipherParams.create({ ciphertext: ciphertext, salt: salt });
	        }
	    };

	    /**
	     * A cipher wrapper that returns ciphertext as a serializable cipher params object.
	     */
	    var SerializableCipher = C_lib.SerializableCipher = Base.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {Formatter} format The formatting strategy to convert cipher param objects to and from a string. Default: OpenSSL
	         */
	        cfg: Base.extend({
	            format: OpenSSLFormatter
	        }),

	        /**
	         * Encrypts a message.
	         *
	         * @param {Cipher} cipher The cipher algorithm to use.
	         * @param {WordArray|string} message The message to encrypt.
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {CipherParams} A cipher params object.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key);
	         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, { iv: iv });
	         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, { iv: iv, format: CryptoJS.format.OpenSSL });
	         */
	        encrypt: function (cipher, message, key, cfg) {
	            // Apply config defaults
	            cfg = this.cfg.extend(cfg);

	            // Encrypt
	            var encryptor = cipher.createEncryptor(key, cfg);
	            var ciphertext = encryptor.finalize(message);

	            // Shortcut
	            var cipherCfg = encryptor.cfg;

	            // Create and return serializable cipher params
	            return CipherParams.create({
	                ciphertext: ciphertext,
	                key: key,
	                iv: cipherCfg.iv,
	                algorithm: cipher,
	                mode: cipherCfg.mode,
	                padding: cipherCfg.padding,
	                blockSize: cipher.blockSize,
	                formatter: cfg.format
	            });
	        },

	        /**
	         * Decrypts serialized ciphertext.
	         *
	         * @param {Cipher} cipher The cipher algorithm to use.
	         * @param {CipherParams|string} ciphertext The ciphertext to decrypt.
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {WordArray} The plaintext.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var plaintext = CryptoJS.lib.SerializableCipher.decrypt(CryptoJS.algo.AES, formattedCiphertext, key, { iv: iv, format: CryptoJS.format.OpenSSL });
	         *     var plaintext = CryptoJS.lib.SerializableCipher.decrypt(CryptoJS.algo.AES, ciphertextParams, key, { iv: iv, format: CryptoJS.format.OpenSSL });
	         */
	        decrypt: function (cipher, ciphertext, key, cfg) {
	            // Apply config defaults
	            cfg = this.cfg.extend(cfg);

	            // Convert string to CipherParams
	            ciphertext = this._parse(ciphertext, cfg.format);

	            // Decrypt
	            var plaintext = cipher.createDecryptor(key, cfg).finalize(ciphertext.ciphertext);

	            return plaintext;
	        },

	        /**
	         * Converts serialized ciphertext to CipherParams,
	         * else assumed CipherParams already and returns ciphertext unchanged.
	         *
	         * @param {CipherParams|string} ciphertext The ciphertext.
	         * @param {Formatter} format The formatting strategy to use to parse serialized ciphertext.
	         *
	         * @return {CipherParams} The unserialized ciphertext.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var ciphertextParams = CryptoJS.lib.SerializableCipher._parse(ciphertextStringOrParams, format);
	         */
	        _parse: function (ciphertext, format) {
	            if (typeof ciphertext == 'string') {
	                return format.parse(ciphertext, this);
	            } else {
	                return ciphertext;
	            }
	        }
	    });

	    /**
	     * Key derivation function namespace.
	     */
	    var C_kdf = C.kdf = {};

	    /**
	     * OpenSSL key derivation function.
	     */
	    var OpenSSLKdf = C_kdf.OpenSSL = {
	        /**
	         * Derives a key and IV from a password.
	         *
	         * @param {string} password The password to derive from.
	         * @param {number} keySize The size in words of the key to generate.
	         * @param {number} ivSize The size in words of the IV to generate.
	         * @param {WordArray|string} salt (Optional) A 64-bit salt to use. If omitted, a salt will be generated randomly.
	         *
	         * @return {CipherParams} A cipher params object with the key, IV, and salt.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32);
	         *     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32, 'saltsalt');
	         */
	        execute: function (password, keySize, ivSize, salt) {
	            // Generate random salt
	            if (!salt) {
	                salt = WordArray.random(64/8);
	            }

	            // Derive key and IV
	            var key = EvpKDF.create({ keySize: keySize + ivSize }).compute(password, salt);

	            // Separate key and IV
	            var iv = WordArray.create(key.words.slice(keySize), ivSize * 4);
	            key.sigBytes = keySize * 4;

	            // Return params
	            return CipherParams.create({ key: key, iv: iv, salt: salt });
	        }
	    };

	    /**
	     * A serializable cipher wrapper that derives the key from a password,
	     * and returns ciphertext as a serializable cipher params object.
	     */
	    var PasswordBasedCipher = C_lib.PasswordBasedCipher = SerializableCipher.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {KDF} kdf The key derivation function to use to generate a key and IV from a password. Default: OpenSSL
	         */
	        cfg: SerializableCipher.cfg.extend({
	            kdf: OpenSSLKdf
	        }),

	        /**
	         * Encrypts a message using a password.
	         *
	         * @param {Cipher} cipher The cipher algorithm to use.
	         * @param {WordArray|string} message The message to encrypt.
	         * @param {string} password The password.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {CipherParams} A cipher params object.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(CryptoJS.algo.AES, message, 'password');
	         *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(CryptoJS.algo.AES, message, 'password', { format: CryptoJS.format.OpenSSL });
	         */
	        encrypt: function (cipher, message, password, cfg) {
	            // Apply config defaults
	            cfg = this.cfg.extend(cfg);

	            // Derive key and other params
	            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize);

	            // Add IV to config
	            cfg.iv = derivedParams.iv;

	            // Encrypt
	            var ciphertext = SerializableCipher.encrypt.call(this, cipher, message, derivedParams.key, cfg);

	            // Mix in derived params
	            ciphertext.mixIn(derivedParams);

	            return ciphertext;
	        },

	        /**
	         * Decrypts serialized ciphertext using a password.
	         *
	         * @param {Cipher} cipher The cipher algorithm to use.
	         * @param {CipherParams|string} ciphertext The ciphertext to decrypt.
	         * @param {string} password The password.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {WordArray} The plaintext.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var plaintext = CryptoJS.lib.PasswordBasedCipher.decrypt(CryptoJS.algo.AES, formattedCiphertext, 'password', { format: CryptoJS.format.OpenSSL });
	         *     var plaintext = CryptoJS.lib.PasswordBasedCipher.decrypt(CryptoJS.algo.AES, ciphertextParams, 'password', { format: CryptoJS.format.OpenSSL });
	         */
	        decrypt: function (cipher, ciphertext, password, cfg) {
	            // Apply config defaults
	            cfg = this.cfg.extend(cfg);

	            // Convert string to CipherParams
	            ciphertext = this._parse(ciphertext, cfg.format);

	            // Derive key and other params
	            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize, ciphertext.salt);

	            // Add IV to config
	            cfg.iv = derivedParams.iv;

	            // Decrypt
	            var plaintext = SerializableCipher.decrypt.call(this, cipher, ciphertext, derivedParams.key, cfg);

	            return plaintext;
	        }
	    });
	}());


}));
},{"./core":31,"./evpkdf":34}],31:[function(require,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory();
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define([], factory);
	}
	else {
		// Global (browser)
		root.CryptoJS = factory();
	}
}(this, function () {

	/**
	 * CryptoJS core components.
	 */
	var CryptoJS = CryptoJS || (function (Math, undefined) {
	    /*
	     * Local polyfil of Object.create
	     */
	    var create = Object.create || (function () {
	        function F() {};

	        return function (obj) {
	            var subtype;

	            F.prototype = obj;

	            subtype = new F();

	            F.prototype = null;

	            return subtype;
	        };
	    }())

	    /**
	     * CryptoJS namespace.
	     */
	    var C = {};

	    /**
	     * Library namespace.
	     */
	    var C_lib = C.lib = {};

	    /**
	     * Base object for prototypal inheritance.
	     */
	    var Base = C_lib.Base = (function () {


	        return {
	            /**
	             * Creates a new object that inherits from this object.
	             *
	             * @param {Object} overrides Properties to copy into the new object.
	             *
	             * @return {Object} The new object.
	             *
	             * @static
	             *
	             * @example
	             *
	             *     var MyType = CryptoJS.lib.Base.extend({
	             *         field: 'value',
	             *
	             *         method: function () {
	             *         }
	             *     });
	             */
	            extend: function (overrides) {
	                // Spawn
	                var subtype = create(this);

	                // Augment
	                if (overrides) {
	                    subtype.mixIn(overrides);
	                }

	                // Create default initializer
	                if (!subtype.hasOwnProperty('init') || this.init === subtype.init) {
	                    subtype.init = function () {
	                        subtype.$super.init.apply(this, arguments);
	                    };
	                }

	                // Initializer's prototype is the subtype object
	                subtype.init.prototype = subtype;

	                // Reference supertype
	                subtype.$super = this;

	                return subtype;
	            },

	            /**
	             * Extends this object and runs the init method.
	             * Arguments to create() will be passed to init().
	             *
	             * @return {Object} The new object.
	             *
	             * @static
	             *
	             * @example
	             *
	             *     var instance = MyType.create();
	             */
	            create: function () {
	                var instance = this.extend();
	                instance.init.apply(instance, arguments);

	                return instance;
	            },

	            /**
	             * Initializes a newly created object.
	             * Override this method to add some logic when your objects are created.
	             *
	             * @example
	             *
	             *     var MyType = CryptoJS.lib.Base.extend({
	             *         init: function () {
	             *             // ...
	             *         }
	             *     });
	             */
	            init: function () {
	            },

	            /**
	             * Copies properties into this object.
	             *
	             * @param {Object} properties The properties to mix in.
	             *
	             * @example
	             *
	             *     MyType.mixIn({
	             *         field: 'value'
	             *     });
	             */
	            mixIn: function (properties) {
	                for (var propertyName in properties) {
	                    if (properties.hasOwnProperty(propertyName)) {
	                        this[propertyName] = properties[propertyName];
	                    }
	                }

	                // IE won't copy toString using the loop above
	                if (properties.hasOwnProperty('toString')) {
	                    this.toString = properties.toString;
	                }
	            },

	            /**
	             * Creates a copy of this object.
	             *
	             * @return {Object} The clone.
	             *
	             * @example
	             *
	             *     var clone = instance.clone();
	             */
	            clone: function () {
	                return this.init.prototype.extend(this);
	            }
	        };
	    }());

	    /**
	     * An array of 32-bit words.
	     *
	     * @property {Array} words The array of 32-bit words.
	     * @property {number} sigBytes The number of significant bytes in this word array.
	     */
	    var WordArray = C_lib.WordArray = Base.extend({
	        /**
	         * Initializes a newly created word array.
	         *
	         * @param {Array} words (Optional) An array of 32-bit words.
	         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.lib.WordArray.create();
	         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
	         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
	         */
	        init: function (words, sigBytes) {
	            words = this.words = words || [];

	            if (sigBytes != undefined) {
	                this.sigBytes = sigBytes;
	            } else {
	                this.sigBytes = words.length * 4;
	            }
	        },

	        /**
	         * Converts this word array to a string.
	         *
	         * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
	         *
	         * @return {string} The stringified word array.
	         *
	         * @example
	         *
	         *     var string = wordArray + '';
	         *     var string = wordArray.toString();
	         *     var string = wordArray.toString(CryptoJS.enc.Utf8);
	         */
	        toString: function (encoder) {
	            return (encoder || Hex).stringify(this);
	        },

	        /**
	         * Concatenates a word array to this word array.
	         *
	         * @param {WordArray} wordArray The word array to append.
	         *
	         * @return {WordArray} This word array.
	         *
	         * @example
	         *
	         *     wordArray1.concat(wordArray2);
	         */
	        concat: function (wordArray) {
	            // Shortcuts
	            var thisWords = this.words;
	            var thatWords = wordArray.words;
	            var thisSigBytes = this.sigBytes;
	            var thatSigBytes = wordArray.sigBytes;

	            // Clamp excess bits
	            this.clamp();

	            // Concat
	            if (thisSigBytes % 4) {
	                // Copy one byte at a time
	                for (var i = 0; i < thatSigBytes; i++) {
	                    var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                    thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
	                }
	            } else {
	                // Copy one word at a time
	                for (var i = 0; i < thatSigBytes; i += 4) {
	                    thisWords[(thisSigBytes + i) >>> 2] = thatWords[i >>> 2];
	                }
	            }
	            this.sigBytes += thatSigBytes;

	            // Chainable
	            return this;
	        },

	        /**
	         * Removes insignificant bits.
	         *
	         * @example
	         *
	         *     wordArray.clamp();
	         */
	        clamp: function () {
	            // Shortcuts
	            var words = this.words;
	            var sigBytes = this.sigBytes;

	            // Clamp
	            words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
	            words.length = Math.ceil(sigBytes / 4);
	        },

	        /**
	         * Creates a copy of this word array.
	         *
	         * @return {WordArray} The clone.
	         *
	         * @example
	         *
	         *     var clone = wordArray.clone();
	         */
	        clone: function () {
	            var clone = Base.clone.call(this);
	            clone.words = this.words.slice(0);

	            return clone;
	        },

	        /**
	         * Creates a word array filled with random bytes.
	         *
	         * @param {number} nBytes The number of random bytes to generate.
	         *
	         * @return {WordArray} The random word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.lib.WordArray.random(16);
	         */
	        random: function (nBytes) {
	            var words = [];

	            var r = (function (m_w) {
	                var m_w = m_w;
	                var m_z = 0x3ade68b1;
	                var mask = 0xffffffff;

	                return function () {
	                    m_z = (0x9069 * (m_z & 0xFFFF) + (m_z >> 0x10)) & mask;
	                    m_w = (0x4650 * (m_w & 0xFFFF) + (m_w >> 0x10)) & mask;
	                    var result = ((m_z << 0x10) + m_w) & mask;
	                    result /= 0x100000000;
	                    result += 0.5;
	                    return result * (Math.random() > .5 ? 1 : -1);
	                }
	            });

	            for (var i = 0, rcache; i < nBytes; i += 4) {
	                var _r = r((rcache || Math.random()) * 0x100000000);

	                rcache = _r() * 0x3ade67b7;
	                words.push((_r() * 0x100000000) | 0);
	            }

	            return new WordArray.init(words, nBytes);
	        }
	    });

	    /**
	     * Encoder namespace.
	     */
	    var C_enc = C.enc = {};

	    /**
	     * Hex encoding strategy.
	     */
	    var Hex = C_enc.Hex = {
	        /**
	         * Converts a word array to a hex string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The hex string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var hexChars = [];
	            for (var i = 0; i < sigBytes; i++) {
	                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                hexChars.push((bite >>> 4).toString(16));
	                hexChars.push((bite & 0x0f).toString(16));
	            }

	            return hexChars.join('');
	        },

	        /**
	         * Converts a hex string to a word array.
	         *
	         * @param {string} hexStr The hex string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Hex.parse(hexString);
	         */
	        parse: function (hexStr) {
	            // Shortcut
	            var hexStrLength = hexStr.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < hexStrLength; i += 2) {
	                words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
	            }

	            return new WordArray.init(words, hexStrLength / 2);
	        }
	    };

	    /**
	     * Latin1 encoding strategy.
	     */
	    var Latin1 = C_enc.Latin1 = {
	        /**
	         * Converts a word array to a Latin1 string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The Latin1 string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var latin1Chars = [];
	            for (var i = 0; i < sigBytes; i++) {
	                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                latin1Chars.push(String.fromCharCode(bite));
	            }

	            return latin1Chars.join('');
	        },

	        /**
	         * Converts a Latin1 string to a word array.
	         *
	         * @param {string} latin1Str The Latin1 string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
	         */
	        parse: function (latin1Str) {
	            // Shortcut
	            var latin1StrLength = latin1Str.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < latin1StrLength; i++) {
	                words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
	            }

	            return new WordArray.init(words, latin1StrLength);
	        }
	    };

	    /**
	     * UTF-8 encoding strategy.
	     */
	    var Utf8 = C_enc.Utf8 = {
	        /**
	         * Converts a word array to a UTF-8 string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The UTF-8 string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            try {
	                return decodeURIComponent(escape(Latin1.stringify(wordArray)));
	            } catch (e) {
	                throw new Error('Malformed UTF-8 data');
	            }
	        },

	        /**
	         * Converts a UTF-8 string to a word array.
	         *
	         * @param {string} utf8Str The UTF-8 string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
	         */
	        parse: function (utf8Str) {
	            return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
	        }
	    };

	    /**
	     * Abstract buffered block algorithm template.
	     *
	     * The property blockSize must be implemented in a concrete subtype.
	     *
	     * @property {number} _minBufferSize The number of blocks that should be kept unprocessed in the buffer. Default: 0
	     */
	    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
	        /**
	         * Resets this block algorithm's data buffer to its initial state.
	         *
	         * @example
	         *
	         *     bufferedBlockAlgorithm.reset();
	         */
	        reset: function () {
	            // Initial values
	            this._data = new WordArray.init();
	            this._nDataBytes = 0;
	        },

	        /**
	         * Adds new data to this block algorithm's buffer.
	         *
	         * @param {WordArray|string} data The data to append. Strings are converted to a WordArray using UTF-8.
	         *
	         * @example
	         *
	         *     bufferedBlockAlgorithm._append('data');
	         *     bufferedBlockAlgorithm._append(wordArray);
	         */
	        _append: function (data) {
	            // Convert string to WordArray, else assume WordArray already
	            if (typeof data == 'string') {
	                data = Utf8.parse(data);
	            }

	            // Append
	            this._data.concat(data);
	            this._nDataBytes += data.sigBytes;
	        },

	        /**
	         * Processes available data blocks.
	         *
	         * This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
	         *
	         * @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
	         *
	         * @return {WordArray} The processed data.
	         *
	         * @example
	         *
	         *     var processedData = bufferedBlockAlgorithm._process();
	         *     var processedData = bufferedBlockAlgorithm._process(!!'flush');
	         */
	        _process: function (doFlush) {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;
	            var dataSigBytes = data.sigBytes;
	            var blockSize = this.blockSize;
	            var blockSizeBytes = blockSize * 4;

	            // Count blocks ready
	            var nBlocksReady = dataSigBytes / blockSizeBytes;
	            if (doFlush) {
	                // Round up to include partial blocks
	                nBlocksReady = Math.ceil(nBlocksReady);
	            } else {
	                // Round down to include only full blocks,
	                // less the number of blocks that must remain in the buffer
	                nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
	            }

	            // Count words ready
	            var nWordsReady = nBlocksReady * blockSize;

	            // Count bytes ready
	            var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);

	            // Process blocks
	            if (nWordsReady) {
	                for (var offset = 0; offset < nWordsReady; offset += blockSize) {
	                    // Perform concrete-algorithm logic
	                    this._doProcessBlock(dataWords, offset);
	                }

	                // Remove processed words
	                var processedWords = dataWords.splice(0, nWordsReady);
	                data.sigBytes -= nBytesReady;
	            }

	            // Return processed words
	            return new WordArray.init(processedWords, nBytesReady);
	        },

	        /**
	         * Creates a copy of this object.
	         *
	         * @return {Object} The clone.
	         *
	         * @example
	         *
	         *     var clone = bufferedBlockAlgorithm.clone();
	         */
	        clone: function () {
	            var clone = Base.clone.call(this);
	            clone._data = this._data.clone();

	            return clone;
	        },

	        _minBufferSize: 0
	    });

	    /**
	     * Abstract hasher template.
	     *
	     * @property {number} blockSize The number of 32-bit words this hasher operates on. Default: 16 (512 bits)
	     */
	    var Hasher = C_lib.Hasher = BufferedBlockAlgorithm.extend({
	        /**
	         * Configuration options.
	         */
	        cfg: Base.extend(),

	        /**
	         * Initializes a newly created hasher.
	         *
	         * @param {Object} cfg (Optional) The configuration options to use for this hash computation.
	         *
	         * @example
	         *
	         *     var hasher = CryptoJS.algo.SHA256.create();
	         */
	        init: function (cfg) {
	            // Apply config defaults
	            this.cfg = this.cfg.extend(cfg);

	            // Set initial values
	            this.reset();
	        },

	        /**
	         * Resets this hasher to its initial state.
	         *
	         * @example
	         *
	         *     hasher.reset();
	         */
	        reset: function () {
	            // Reset data buffer
	            BufferedBlockAlgorithm.reset.call(this);

	            // Perform concrete-hasher logic
	            this._doReset();
	        },

	        /**
	         * Updates this hasher with a message.
	         *
	         * @param {WordArray|string} messageUpdate The message to append.
	         *
	         * @return {Hasher} This hasher.
	         *
	         * @example
	         *
	         *     hasher.update('message');
	         *     hasher.update(wordArray);
	         */
	        update: function (messageUpdate) {
	            // Append
	            this._append(messageUpdate);

	            // Update the hash
	            this._process();

	            // Chainable
	            return this;
	        },

	        /**
	         * Finalizes the hash computation.
	         * Note that the finalize operation is effectively a destructive, read-once operation.
	         *
	         * @param {WordArray|string} messageUpdate (Optional) A final message update.
	         *
	         * @return {WordArray} The hash.
	         *
	         * @example
	         *
	         *     var hash = hasher.finalize();
	         *     var hash = hasher.finalize('message');
	         *     var hash = hasher.finalize(wordArray);
	         */
	        finalize: function (messageUpdate) {
	            // Final message update
	            if (messageUpdate) {
	                this._append(messageUpdate);
	            }

	            // Perform concrete-hasher logic
	            var hash = this._doFinalize();

	            return hash;
	        },

	        blockSize: 512/32,

	        /**
	         * Creates a shortcut function to a hasher's object interface.
	         *
	         * @param {Hasher} hasher The hasher to create a helper for.
	         *
	         * @return {Function} The shortcut function.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
	         */
	        _createHelper: function (hasher) {
	            return function (message, cfg) {
	                return new hasher.init(cfg).finalize(message);
	            };
	        },

	        /**
	         * Creates a shortcut function to the HMAC's object interface.
	         *
	         * @param {Hasher} hasher The hasher to use in this HMAC helper.
	         *
	         * @return {Function} The shortcut function.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
	         */
	        _createHmacHelper: function (hasher) {
	            return function (message, key) {
	                return new C_algo.HMAC.init(hasher, key).finalize(message);
	            };
	        }
	    });

	    /**
	     * Algorithm namespace.
	     */
	    var C_algo = C.algo = {};

	    return C;
	}(Math));


	return CryptoJS;

}));
},{}],32:[function(require,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var C_enc = C.enc;

	    /**
	     * Base64 encoding strategy.
	     */
	    var Base64 = C_enc.Base64 = {
	        /**
	         * Converts a word array to a Base64 string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The Base64 string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var base64String = CryptoJS.enc.Base64.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;
	            var map = this._map;

	            // Clamp excess bits
	            wordArray.clamp();

	            // Convert
	            var base64Chars = [];
	            for (var i = 0; i < sigBytes; i += 3) {
	                var byte1 = (words[i >>> 2]       >>> (24 - (i % 4) * 8))       & 0xff;
	                var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
	                var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

	                var triplet = (byte1 << 16) | (byte2 << 8) | byte3;

	                for (var j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j++) {
	                    base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
	                }
	            }

	            // Add padding
	            var paddingChar = map.charAt(64);
	            if (paddingChar) {
	                while (base64Chars.length % 4) {
	                    base64Chars.push(paddingChar);
	                }
	            }

	            return base64Chars.join('');
	        },

	        /**
	         * Converts a Base64 string to a word array.
	         *
	         * @param {string} base64Str The Base64 string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Base64.parse(base64String);
	         */
	        parse: function (base64Str) {
	            // Shortcuts
	            var base64StrLength = base64Str.length;
	            var map = this._map;
	            var reverseMap = this._reverseMap;

	            if (!reverseMap) {
	                    reverseMap = this._reverseMap = [];
	                    for (var j = 0; j < map.length; j++) {
	                        reverseMap[map.charCodeAt(j)] = j;
	                    }
	            }

	            // Ignore padding
	            var paddingChar = map.charAt(64);
	            if (paddingChar) {
	                var paddingIndex = base64Str.indexOf(paddingChar);
	                if (paddingIndex !== -1) {
	                    base64StrLength = paddingIndex;
	                }
	            }

	            // Convert
	            return parseLoop(base64Str, base64StrLength, reverseMap);

	        },

	        _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
	    };

	    function parseLoop(base64Str, base64StrLength, reverseMap) {
	      var words = [];
	      var nBytes = 0;
	      for (var i = 0; i < base64StrLength; i++) {
	          if (i % 4) {
	              var bits1 = reverseMap[base64Str.charCodeAt(i - 1)] << ((i % 4) * 2);
	              var bits2 = reverseMap[base64Str.charCodeAt(i)] >>> (6 - (i % 4) * 2);
	              words[nBytes >>> 2] |= (bits1 | bits2) << (24 - (nBytes % 4) * 8);
	              nBytes++;
	          }
	      }
	      return WordArray.create(words, nBytes);
	    }
	}());


	return CryptoJS.enc.Base64;

}));
},{"./core":31}],33:[function(require,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var C_enc = C.enc;

	    /**
	     * UTF-16 BE encoding strategy.
	     */
	    var Utf16BE = C_enc.Utf16 = C_enc.Utf16BE = {
	        /**
	         * Converts a word array to a UTF-16 BE string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The UTF-16 BE string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var utf16String = CryptoJS.enc.Utf16.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var utf16Chars = [];
	            for (var i = 0; i < sigBytes; i += 2) {
	                var codePoint = (words[i >>> 2] >>> (16 - (i % 4) * 8)) & 0xffff;
	                utf16Chars.push(String.fromCharCode(codePoint));
	            }

	            return utf16Chars.join('');
	        },

	        /**
	         * Converts a UTF-16 BE string to a word array.
	         *
	         * @param {string} utf16Str The UTF-16 BE string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Utf16.parse(utf16String);
	         */
	        parse: function (utf16Str) {
	            // Shortcut
	            var utf16StrLength = utf16Str.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < utf16StrLength; i++) {
	                words[i >>> 1] |= utf16Str.charCodeAt(i) << (16 - (i % 2) * 16);
	            }

	            return WordArray.create(words, utf16StrLength * 2);
	        }
	    };

	    /**
	     * UTF-16 LE encoding strategy.
	     */
	    C_enc.Utf16LE = {
	        /**
	         * Converts a word array to a UTF-16 LE string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The UTF-16 LE string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var utf16Str = CryptoJS.enc.Utf16LE.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var utf16Chars = [];
	            for (var i = 0; i < sigBytes; i += 2) {
	                var codePoint = swapEndian((words[i >>> 2] >>> (16 - (i % 4) * 8)) & 0xffff);
	                utf16Chars.push(String.fromCharCode(codePoint));
	            }

	            return utf16Chars.join('');
	        },

	        /**
	         * Converts a UTF-16 LE string to a word array.
	         *
	         * @param {string} utf16Str The UTF-16 LE string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Utf16LE.parse(utf16Str);
	         */
	        parse: function (utf16Str) {
	            // Shortcut
	            var utf16StrLength = utf16Str.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < utf16StrLength; i++) {
	                words[i >>> 1] |= swapEndian(utf16Str.charCodeAt(i) << (16 - (i % 2) * 16));
	            }

	            return WordArray.create(words, utf16StrLength * 2);
	        }
	    };

	    function swapEndian(word) {
	        return ((word << 8) & 0xff00ff00) | ((word >>> 8) & 0x00ff00ff);
	    }
	}());


	return CryptoJS.enc.Utf16;

}));
},{"./core":31}],34:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./sha1"), require("./hmac"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./sha1", "./hmac"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var WordArray = C_lib.WordArray;
	    var C_algo = C.algo;
	    var MD5 = C_algo.MD5;

	    /**
	     * This key derivation function is meant to conform with EVP_BytesToKey.
	     * www.openssl.org/docs/crypto/EVP_BytesToKey.html
	     */
	    var EvpKDF = C_algo.EvpKDF = Base.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {number} keySize The key size in words to generate. Default: 4 (128 bits)
	         * @property {Hasher} hasher The hash algorithm to use. Default: MD5
	         * @property {number} iterations The number of iterations to perform. Default: 1
	         */
	        cfg: Base.extend({
	            keySize: 128/32,
	            hasher: MD5,
	            iterations: 1
	        }),

	        /**
	         * Initializes a newly created key derivation function.
	         *
	         * @param {Object} cfg (Optional) The configuration options to use for the derivation.
	         *
	         * @example
	         *
	         *     var kdf = CryptoJS.algo.EvpKDF.create();
	         *     var kdf = CryptoJS.algo.EvpKDF.create({ keySize: 8 });
	         *     var kdf = CryptoJS.algo.EvpKDF.create({ keySize: 8, iterations: 1000 });
	         */
	        init: function (cfg) {
	            this.cfg = this.cfg.extend(cfg);
	        },

	        /**
	         * Derives a key from a password.
	         *
	         * @param {WordArray|string} password The password.
	         * @param {WordArray|string} salt A salt.
	         *
	         * @return {WordArray} The derived key.
	         *
	         * @example
	         *
	         *     var key = kdf.compute(password, salt);
	         */
	        compute: function (password, salt) {
	            // Shortcut
	            var cfg = this.cfg;

	            // Init hasher
	            var hasher = cfg.hasher.create();

	            // Initial values
	            var derivedKey = WordArray.create();

	            // Shortcuts
	            var derivedKeyWords = derivedKey.words;
	            var keySize = cfg.keySize;
	            var iterations = cfg.iterations;

	            // Generate key
	            while (derivedKeyWords.length < keySize) {
	                if (block) {
	                    hasher.update(block);
	                }
	                var block = hasher.update(password).finalize(salt);
	                hasher.reset();

	                // Iterations
	                for (var i = 1; i < iterations; i++) {
	                    block = hasher.finalize(block);
	                    hasher.reset();
	                }

	                derivedKey.concat(block);
	            }
	            derivedKey.sigBytes = keySize * 4;

	            return derivedKey;
	        }
	    });

	    /**
	     * Derives a key from a password.
	     *
	     * @param {WordArray|string} password The password.
	     * @param {WordArray|string} salt A salt.
	     * @param {Object} cfg (Optional) The configuration options to use for this computation.
	     *
	     * @return {WordArray} The derived key.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var key = CryptoJS.EvpKDF(password, salt);
	     *     var key = CryptoJS.EvpKDF(password, salt, { keySize: 8 });
	     *     var key = CryptoJS.EvpKDF(password, salt, { keySize: 8, iterations: 1000 });
	     */
	    C.EvpKDF = function (password, salt, cfg) {
	        return EvpKDF.create(cfg).compute(password, salt);
	    };
	}());


	return CryptoJS.EvpKDF;

}));
},{"./core":31,"./hmac":36,"./sha1":55}],35:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function (undefined) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var CipherParams = C_lib.CipherParams;
	    var C_enc = C.enc;
	    var Hex = C_enc.Hex;
	    var C_format = C.format;

	    var HexFormatter = C_format.Hex = {
	        /**
	         * Converts the ciphertext of a cipher params object to a hexadecimally encoded string.
	         *
	         * @param {CipherParams} cipherParams The cipher params object.
	         *
	         * @return {string} The hexadecimally encoded string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var hexString = CryptoJS.format.Hex.stringify(cipherParams);
	         */
	        stringify: function (cipherParams) {
	            return cipherParams.ciphertext.toString(Hex);
	        },

	        /**
	         * Converts a hexadecimally encoded ciphertext string to a cipher params object.
	         *
	         * @param {string} input The hexadecimally encoded string.
	         *
	         * @return {CipherParams} The cipher params object.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var cipherParams = CryptoJS.format.Hex.parse(hexString);
	         */
	        parse: function (input) {
	            var ciphertext = Hex.parse(input);
	            return CipherParams.create({ ciphertext: ciphertext });
	        }
	    };
	}());


	return CryptoJS.format.Hex;

}));
},{"./cipher-core":30,"./core":31}],36:[function(require,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var C_enc = C.enc;
	    var Utf8 = C_enc.Utf8;
	    var C_algo = C.algo;

	    /**
	     * HMAC algorithm.
	     */
	    var HMAC = C_algo.HMAC = Base.extend({
	        /**
	         * Initializes a newly created HMAC.
	         *
	         * @param {Hasher} hasher The hash algorithm to use.
	         * @param {WordArray|string} key The secret key.
	         *
	         * @example
	         *
	         *     var hmacHasher = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, key);
	         */
	        init: function (hasher, key) {
	            // Init hasher
	            hasher = this._hasher = new hasher.init();

	            // Convert string to WordArray, else assume WordArray already
	            if (typeof key == 'string') {
	                key = Utf8.parse(key);
	            }

	            // Shortcuts
	            var hasherBlockSize = hasher.blockSize;
	            var hasherBlockSizeBytes = hasherBlockSize * 4;

	            // Allow arbitrary length keys
	            if (key.sigBytes > hasherBlockSizeBytes) {
	                key = hasher.finalize(key);
	            }

	            // Clamp excess bits
	            key.clamp();

	            // Clone key for inner and outer pads
	            var oKey = this._oKey = key.clone();
	            var iKey = this._iKey = key.clone();

	            // Shortcuts
	            var oKeyWords = oKey.words;
	            var iKeyWords = iKey.words;

	            // XOR keys with pad constants
	            for (var i = 0; i < hasherBlockSize; i++) {
	                oKeyWords[i] ^= 0x5c5c5c5c;
	                iKeyWords[i] ^= 0x36363636;
	            }
	            oKey.sigBytes = iKey.sigBytes = hasherBlockSizeBytes;

	            // Set initial values
	            this.reset();
	        },

	        /**
	         * Resets this HMAC to its initial state.
	         *
	         * @example
	         *
	         *     hmacHasher.reset();
	         */
	        reset: function () {
	            // Shortcut
	            var hasher = this._hasher;

	            // Reset
	            hasher.reset();
	            hasher.update(this._iKey);
	        },

	        /**
	         * Updates this HMAC with a message.
	         *
	         * @param {WordArray|string} messageUpdate The message to append.
	         *
	         * @return {HMAC} This HMAC instance.
	         *
	         * @example
	         *
	         *     hmacHasher.update('message');
	         *     hmacHasher.update(wordArray);
	         */
	        update: function (messageUpdate) {
	            this._hasher.update(messageUpdate);

	            // Chainable
	            return this;
	        },

	        /**
	         * Finalizes the HMAC computation.
	         * Note that the finalize operation is effectively a destructive, read-once operation.
	         *
	         * @param {WordArray|string} messageUpdate (Optional) A final message update.
	         *
	         * @return {WordArray} The HMAC.
	         *
	         * @example
	         *
	         *     var hmac = hmacHasher.finalize();
	         *     var hmac = hmacHasher.finalize('message');
	         *     var hmac = hmacHasher.finalize(wordArray);
	         */
	        finalize: function (messageUpdate) {
	            // Shortcut
	            var hasher = this._hasher;

	            // Compute HMAC
	            var innerHash = hasher.finalize(messageUpdate);
	            hasher.reset();
	            var hmac = hasher.finalize(this._oKey.clone().concat(innerHash));

	            return hmac;
	        }
	    });
	}());


}));
},{"./core":31}],37:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./x64-core"), require("./lib-typedarrays"), require("./enc-utf16"), require("./enc-base64"), require("./md5"), require("./sha1"), require("./sha256"), require("./sha224"), require("./sha512"), require("./sha384"), require("./sha3"), require("./ripemd160"), require("./hmac"), require("./pbkdf2"), require("./evpkdf"), require("./cipher-core"), require("./mode-cfb"), require("./mode-ctr"), require("./mode-ctr-gladman"), require("./mode-ofb"), require("./mode-ecb"), require("./pad-ansix923"), require("./pad-iso10126"), require("./pad-iso97971"), require("./pad-zeropadding"), require("./pad-nopadding"), require("./format-hex"), require("./aes"), require("./tripledes"), require("./rc4"), require("./rabbit"), require("./rabbit-legacy"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./x64-core", "./lib-typedarrays", "./enc-utf16", "./enc-base64", "./md5", "./sha1", "./sha256", "./sha224", "./sha512", "./sha384", "./sha3", "./ripemd160", "./hmac", "./pbkdf2", "./evpkdf", "./cipher-core", "./mode-cfb", "./mode-ctr", "./mode-ctr-gladman", "./mode-ofb", "./mode-ecb", "./pad-ansix923", "./pad-iso10126", "./pad-iso97971", "./pad-zeropadding", "./pad-nopadding", "./format-hex", "./aes", "./tripledes", "./rc4", "./rabbit", "./rabbit-legacy"], factory);
	}
	else {
		// Global (browser)
		root.CryptoJS = factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	return CryptoJS;

}));
},{"./aes":29,"./cipher-core":30,"./core":31,"./enc-base64":32,"./enc-utf16":33,"./evpkdf":34,"./format-hex":35,"./hmac":36,"./lib-typedarrays":38,"./md5":39,"./mode-cfb":40,"./mode-ctr":42,"./mode-ctr-gladman":41,"./mode-ecb":43,"./mode-ofb":44,"./pad-ansix923":45,"./pad-iso10126":46,"./pad-iso97971":47,"./pad-nopadding":48,"./pad-zeropadding":49,"./pbkdf2":50,"./rabbit":52,"./rabbit-legacy":51,"./rc4":53,"./ripemd160":54,"./sha1":55,"./sha224":56,"./sha256":57,"./sha3":58,"./sha384":59,"./sha512":60,"./tripledes":61,"./x64-core":62}],38:[function(require,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Check if typed arrays are supported
	    if (typeof ArrayBuffer != 'function') {
	        return;
	    }

	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;

	    // Reference original init
	    var superInit = WordArray.init;

	    // Augment WordArray.init to handle typed arrays
	    var subInit = WordArray.init = function (typedArray) {
	        // Convert buffers to uint8
	        if (typedArray instanceof ArrayBuffer) {
	            typedArray = new Uint8Array(typedArray);
	        }

	        // Convert other array views to uint8
	        if (
	            typedArray instanceof Int8Array ||
	            (typeof Uint8ClampedArray !== "undefined" && typedArray instanceof Uint8ClampedArray) ||
	            typedArray instanceof Int16Array ||
	            typedArray instanceof Uint16Array ||
	            typedArray instanceof Int32Array ||
	            typedArray instanceof Uint32Array ||
	            typedArray instanceof Float32Array ||
	            typedArray instanceof Float64Array
	        ) {
	            typedArray = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
	        }

	        // Handle Uint8Array
	        if (typedArray instanceof Uint8Array) {
	            // Shortcut
	            var typedArrayByteLength = typedArray.byteLength;

	            // Extract bytes
	            var words = [];
	            for (var i = 0; i < typedArrayByteLength; i++) {
	                words[i >>> 2] |= typedArray[i] << (24 - (i % 4) * 8);
	            }

	            // Initialize this word array
	            superInit.call(this, words, typedArrayByteLength);
	        } else {
	            // Else call normal init
	            superInit.apply(this, arguments);
	        }
	    };

	    subInit.prototype = WordArray;
	}());


	return CryptoJS.lib.WordArray;

}));
},{"./core":31}],39:[function(require,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Constants table
	    var T = [];

	    // Compute constants
	    (function () {
	        for (var i = 0; i < 64; i++) {
	            T[i] = (Math.abs(Math.sin(i + 1)) * 0x100000000) | 0;
	        }
	    }());

	    /**
	     * MD5 hash algorithm.
	     */
	    var MD5 = C_algo.MD5 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init([
	                0x67452301, 0xefcdab89,
	                0x98badcfe, 0x10325476
	            ]);
	        },

	        _doProcessBlock: function (M, offset) {
	            // Swap endian
	            for (var i = 0; i < 16; i++) {
	                // Shortcuts
	                var offset_i = offset + i;
	                var M_offset_i = M[offset_i];

	                M[offset_i] = (
	                    (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
	                    (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
	                );
	            }

	            // Shortcuts
	            var H = this._hash.words;

	            var M_offset_0  = M[offset + 0];
	            var M_offset_1  = M[offset + 1];
	            var M_offset_2  = M[offset + 2];
	            var M_offset_3  = M[offset + 3];
	            var M_offset_4  = M[offset + 4];
	            var M_offset_5  = M[offset + 5];
	            var M_offset_6  = M[offset + 6];
	            var M_offset_7  = M[offset + 7];
	            var M_offset_8  = M[offset + 8];
	            var M_offset_9  = M[offset + 9];
	            var M_offset_10 = M[offset + 10];
	            var M_offset_11 = M[offset + 11];
	            var M_offset_12 = M[offset + 12];
	            var M_offset_13 = M[offset + 13];
	            var M_offset_14 = M[offset + 14];
	            var M_offset_15 = M[offset + 15];

	            // Working varialbes
	            var a = H[0];
	            var b = H[1];
	            var c = H[2];
	            var d = H[3];

	            // Computation
	            a = FF(a, b, c, d, M_offset_0,  7,  T[0]);
	            d = FF(d, a, b, c, M_offset_1,  12, T[1]);
	            c = FF(c, d, a, b, M_offset_2,  17, T[2]);
	            b = FF(b, c, d, a, M_offset_3,  22, T[3]);
	            a = FF(a, b, c, d, M_offset_4,  7,  T[4]);
	            d = FF(d, a, b, c, M_offset_5,  12, T[5]);
	            c = FF(c, d, a, b, M_offset_6,  17, T[6]);
	            b = FF(b, c, d, a, M_offset_7,  22, T[7]);
	            a = FF(a, b, c, d, M_offset_8,  7,  T[8]);
	            d = FF(d, a, b, c, M_offset_9,  12, T[9]);
	            c = FF(c, d, a, b, M_offset_10, 17, T[10]);
	            b = FF(b, c, d, a, M_offset_11, 22, T[11]);
	            a = FF(a, b, c, d, M_offset_12, 7,  T[12]);
	            d = FF(d, a, b, c, M_offset_13, 12, T[13]);
	            c = FF(c, d, a, b, M_offset_14, 17, T[14]);
	            b = FF(b, c, d, a, M_offset_15, 22, T[15]);

	            a = GG(a, b, c, d, M_offset_1,  5,  T[16]);
	            d = GG(d, a, b, c, M_offset_6,  9,  T[17]);
	            c = GG(c, d, a, b, M_offset_11, 14, T[18]);
	            b = GG(b, c, d, a, M_offset_0,  20, T[19]);
	            a = GG(a, b, c, d, M_offset_5,  5,  T[20]);
	            d = GG(d, a, b, c, M_offset_10, 9,  T[21]);
	            c = GG(c, d, a, b, M_offset_15, 14, T[22]);
	            b = GG(b, c, d, a, M_offset_4,  20, T[23]);
	            a = GG(a, b, c, d, M_offset_9,  5,  T[24]);
	            d = GG(d, a, b, c, M_offset_14, 9,  T[25]);
	            c = GG(c, d, a, b, M_offset_3,  14, T[26]);
	            b = GG(b, c, d, a, M_offset_8,  20, T[27]);
	            a = GG(a, b, c, d, M_offset_13, 5,  T[28]);
	            d = GG(d, a, b, c, M_offset_2,  9,  T[29]);
	            c = GG(c, d, a, b, M_offset_7,  14, T[30]);
	            b = GG(b, c, d, a, M_offset_12, 20, T[31]);

	            a = HH(a, b, c, d, M_offset_5,  4,  T[32]);
	            d = HH(d, a, b, c, M_offset_8,  11, T[33]);
	            c = HH(c, d, a, b, M_offset_11, 16, T[34]);
	            b = HH(b, c, d, a, M_offset_14, 23, T[35]);
	            a = HH(a, b, c, d, M_offset_1,  4,  T[36]);
	            d = HH(d, a, b, c, M_offset_4,  11, T[37]);
	            c = HH(c, d, a, b, M_offset_7,  16, T[38]);
	            b = HH(b, c, d, a, M_offset_10, 23, T[39]);
	            a = HH(a, b, c, d, M_offset_13, 4,  T[40]);
	            d = HH(d, a, b, c, M_offset_0,  11, T[41]);
	            c = HH(c, d, a, b, M_offset_3,  16, T[42]);
	            b = HH(b, c, d, a, M_offset_6,  23, T[43]);
	            a = HH(a, b, c, d, M_offset_9,  4,  T[44]);
	            d = HH(d, a, b, c, M_offset_12, 11, T[45]);
	            c = HH(c, d, a, b, M_offset_15, 16, T[46]);
	            b = HH(b, c, d, a, M_offset_2,  23, T[47]);

	            a = II(a, b, c, d, M_offset_0,  6,  T[48]);
	            d = II(d, a, b, c, M_offset_7,  10, T[49]);
	            c = II(c, d, a, b, M_offset_14, 15, T[50]);
	            b = II(b, c, d, a, M_offset_5,  21, T[51]);
	            a = II(a, b, c, d, M_offset_12, 6,  T[52]);
	            d = II(d, a, b, c, M_offset_3,  10, T[53]);
	            c = II(c, d, a, b, M_offset_10, 15, T[54]);
	            b = II(b, c, d, a, M_offset_1,  21, T[55]);
	            a = II(a, b, c, d, M_offset_8,  6,  T[56]);
	            d = II(d, a, b, c, M_offset_15, 10, T[57]);
	            c = II(c, d, a, b, M_offset_6,  15, T[58]);
	            b = II(b, c, d, a, M_offset_13, 21, T[59]);
	            a = II(a, b, c, d, M_offset_4,  6,  T[60]);
	            d = II(d, a, b, c, M_offset_11, 10, T[61]);
	            c = II(c, d, a, b, M_offset_2,  15, T[62]);
	            b = II(b, c, d, a, M_offset_9,  21, T[63]);

	            // Intermediate hash value
	            H[0] = (H[0] + a) | 0;
	            H[1] = (H[1] + b) | 0;
	            H[2] = (H[2] + c) | 0;
	            H[3] = (H[3] + d) | 0;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);

	            var nBitsTotalH = Math.floor(nBitsTotal / 0x100000000);
	            var nBitsTotalL = nBitsTotal;
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = (
	                (((nBitsTotalH << 8)  | (nBitsTotalH >>> 24)) & 0x00ff00ff) |
	                (((nBitsTotalH << 24) | (nBitsTotalH >>> 8))  & 0xff00ff00)
	            );
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
	                (((nBitsTotalL << 8)  | (nBitsTotalL >>> 24)) & 0x00ff00ff) |
	                (((nBitsTotalL << 24) | (nBitsTotalL >>> 8))  & 0xff00ff00)
	            );

	            data.sigBytes = (dataWords.length + 1) * 4;

	            // Hash final blocks
	            this._process();

	            // Shortcuts
	            var hash = this._hash;
	            var H = hash.words;

	            // Swap endian
	            for (var i = 0; i < 4; i++) {
	                // Shortcut
	                var H_i = H[i];

	                H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
	                       (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
	            }

	            // Return final computed hash
	            return hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });

	    function FF(a, b, c, d, x, s, t) {
	        var n = a + ((b & c) | (~b & d)) + x + t;
	        return ((n << s) | (n >>> (32 - s))) + b;
	    }

	    function GG(a, b, c, d, x, s, t) {
	        var n = a + ((b & d) | (c & ~d)) + x + t;
	        return ((n << s) | (n >>> (32 - s))) + b;
	    }

	    function HH(a, b, c, d, x, s, t) {
	        var n = a + (b ^ c ^ d) + x + t;
	        return ((n << s) | (n >>> (32 - s))) + b;
	    }

	    function II(a, b, c, d, x, s, t) {
	        var n = a + (c ^ (b | ~d)) + x + t;
	        return ((n << s) | (n >>> (32 - s))) + b;
	    }

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.MD5('message');
	     *     var hash = CryptoJS.MD5(wordArray);
	     */
	    C.MD5 = Hasher._createHelper(MD5);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacMD5(message, key);
	     */
	    C.HmacMD5 = Hasher._createHmacHelper(MD5);
	}(Math));


	return CryptoJS.MD5;

}));
},{"./core":31}],40:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	/**
	 * Cipher Feedback block mode.
	 */
	CryptoJS.mode.CFB = (function () {
	    var CFB = CryptoJS.lib.BlockCipherMode.extend();

	    CFB.Encryptor = CFB.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher;
	            var blockSize = cipher.blockSize;

	            generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);

	            // Remember this block to use with next block
	            this._prevBlock = words.slice(offset, offset + blockSize);
	        }
	    });

	    CFB.Decryptor = CFB.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher;
	            var blockSize = cipher.blockSize;

	            // Remember this block to use with next block
	            var thisBlock = words.slice(offset, offset + blockSize);

	            generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);

	            // This block becomes the previous block
	            this._prevBlock = thisBlock;
	        }
	    });

	    function generateKeystreamAndEncrypt(words, offset, blockSize, cipher) {
	        // Shortcut
	        var iv = this._iv;

	        // Generate keystream
	        if (iv) {
	            var keystream = iv.slice(0);

	            // Remove IV for subsequent blocks
	            this._iv = undefined;
	        } else {
	            var keystream = this._prevBlock;
	        }
	        cipher.encryptBlock(keystream, 0);

	        // Encrypt
	        for (var i = 0; i < blockSize; i++) {
	            words[offset + i] ^= keystream[i];
	        }
	    }

	    return CFB;
	}());


	return CryptoJS.mode.CFB;

}));
},{"./cipher-core":30,"./core":31}],41:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	/** @preserve
	 * Counter block mode compatible with  Dr Brian Gladman fileenc.c
	 * derived from CryptoJS.mode.CTR
	 * Jan Hruby jhruby.web@gmail.com
	 */
	CryptoJS.mode.CTRGladman = (function () {
	    var CTRGladman = CryptoJS.lib.BlockCipherMode.extend();

		function incWord(word)
		{
			if (((word >> 24) & 0xff) === 0xff) { //overflow
			var b1 = (word >> 16)&0xff;
			var b2 = (word >> 8)&0xff;
			var b3 = word & 0xff;

			if (b1 === 0xff) // overflow b1
			{
			b1 = 0;
			if (b2 === 0xff)
			{
				b2 = 0;
				if (b3 === 0xff)
				{
					b3 = 0;
				}
				else
				{
					++b3;
				}
			}
			else
			{
				++b2;
			}
			}
			else
			{
			++b1;
			}

			word = 0;
			word += (b1 << 16);
			word += (b2 << 8);
			word += b3;
			}
			else
			{
			word += (0x01 << 24);
			}
			return word;
		}

		function incCounter(counter)
		{
			if ((counter[0] = incWord(counter[0])) === 0)
			{
				// encr_data in fileenc.c from  Dr Brian Gladman's counts only with DWORD j < 8
				counter[1] = incWord(counter[1]);
			}
			return counter;
		}

	    var Encryptor = CTRGladman.Encryptor = CTRGladman.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher
	            var blockSize = cipher.blockSize;
	            var iv = this._iv;
	            var counter = this._counter;

	            // Generate keystream
	            if (iv) {
	                counter = this._counter = iv.slice(0);

	                // Remove IV for subsequent blocks
	                this._iv = undefined;
	            }

				incCounter(counter);

				var keystream = counter.slice(0);
	            cipher.encryptBlock(keystream, 0);

	            // Encrypt
	            for (var i = 0; i < blockSize; i++) {
	                words[offset + i] ^= keystream[i];
	            }
	        }
	    });

	    CTRGladman.Decryptor = Encryptor;

	    return CTRGladman;
	}());




	return CryptoJS.mode.CTRGladman;

}));
},{"./cipher-core":30,"./core":31}],42:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	/**
	 * Counter block mode.
	 */
	CryptoJS.mode.CTR = (function () {
	    var CTR = CryptoJS.lib.BlockCipherMode.extend();

	    var Encryptor = CTR.Encryptor = CTR.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher
	            var blockSize = cipher.blockSize;
	            var iv = this._iv;
	            var counter = this._counter;

	            // Generate keystream
	            if (iv) {
	                counter = this._counter = iv.slice(0);

	                // Remove IV for subsequent blocks
	                this._iv = undefined;
	            }
	            var keystream = counter.slice(0);
	            cipher.encryptBlock(keystream, 0);

	            // Increment counter
	            counter[blockSize - 1] = (counter[blockSize - 1] + 1) | 0

	            // Encrypt
	            for (var i = 0; i < blockSize; i++) {
	                words[offset + i] ^= keystream[i];
	            }
	        }
	    });

	    CTR.Decryptor = Encryptor;

	    return CTR;
	}());


	return CryptoJS.mode.CTR;

}));
},{"./cipher-core":30,"./core":31}],43:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	/**
	 * Electronic Codebook block mode.
	 */
	CryptoJS.mode.ECB = (function () {
	    var ECB = CryptoJS.lib.BlockCipherMode.extend();

	    ECB.Encryptor = ECB.extend({
	        processBlock: function (words, offset) {
	            this._cipher.encryptBlock(words, offset);
	        }
	    });

	    ECB.Decryptor = ECB.extend({
	        processBlock: function (words, offset) {
	            this._cipher.decryptBlock(words, offset);
	        }
	    });

	    return ECB;
	}());


	return CryptoJS.mode.ECB;

}));
},{"./cipher-core":30,"./core":31}],44:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	/**
	 * Output Feedback block mode.
	 */
	CryptoJS.mode.OFB = (function () {
	    var OFB = CryptoJS.lib.BlockCipherMode.extend();

	    var Encryptor = OFB.Encryptor = OFB.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher
	            var blockSize = cipher.blockSize;
	            var iv = this._iv;
	            var keystream = this._keystream;

	            // Generate keystream
	            if (iv) {
	                keystream = this._keystream = iv.slice(0);

	                // Remove IV for subsequent blocks
	                this._iv = undefined;
	            }
	            cipher.encryptBlock(keystream, 0);

	            // Encrypt
	            for (var i = 0; i < blockSize; i++) {
	                words[offset + i] ^= keystream[i];
	            }
	        }
	    });

	    OFB.Decryptor = Encryptor;

	    return OFB;
	}());


	return CryptoJS.mode.OFB;

}));
},{"./cipher-core":30,"./core":31}],45:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	/**
	 * ANSI X.923 padding strategy.
	 */
	CryptoJS.pad.AnsiX923 = {
	    pad: function (data, blockSize) {
	        // Shortcuts
	        var dataSigBytes = data.sigBytes;
	        var blockSizeBytes = blockSize * 4;

	        // Count padding bytes
	        var nPaddingBytes = blockSizeBytes - dataSigBytes % blockSizeBytes;

	        // Compute last byte position
	        var lastBytePos = dataSigBytes + nPaddingBytes - 1;

	        // Pad
	        data.clamp();
	        data.words[lastBytePos >>> 2] |= nPaddingBytes << (24 - (lastBytePos % 4) * 8);
	        data.sigBytes += nPaddingBytes;
	    },

	    unpad: function (data) {
	        // Get number of padding bytes from last byte
	        var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

	        // Remove padding
	        data.sigBytes -= nPaddingBytes;
	    }
	};


	return CryptoJS.pad.Ansix923;

}));
},{"./cipher-core":30,"./core":31}],46:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	/**
	 * ISO 10126 padding strategy.
	 */
	CryptoJS.pad.Iso10126 = {
	    pad: function (data, blockSize) {
	        // Shortcut
	        var blockSizeBytes = blockSize * 4;

	        // Count padding bytes
	        var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;

	        // Pad
	        data.concat(CryptoJS.lib.WordArray.random(nPaddingBytes - 1)).
	             concat(CryptoJS.lib.WordArray.create([nPaddingBytes << 24], 1));
	    },

	    unpad: function (data) {
	        // Get number of padding bytes from last byte
	        var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

	        // Remove padding
	        data.sigBytes -= nPaddingBytes;
	    }
	};


	return CryptoJS.pad.Iso10126;

}));
},{"./cipher-core":30,"./core":31}],47:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	/**
	 * ISO/IEC 9797-1 Padding Method 2.
	 */
	CryptoJS.pad.Iso97971 = {
	    pad: function (data, blockSize) {
	        // Add 0x80 byte
	        data.concat(CryptoJS.lib.WordArray.create([0x80000000], 1));

	        // Zero pad the rest
	        CryptoJS.pad.ZeroPadding.pad(data, blockSize);
	    },

	    unpad: function (data) {
	        // Remove zero padding
	        CryptoJS.pad.ZeroPadding.unpad(data);

	        // Remove one more byte -- the 0x80 byte
	        data.sigBytes--;
	    }
	};


	return CryptoJS.pad.Iso97971;

}));
},{"./cipher-core":30,"./core":31}],48:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	/**
	 * A noop padding strategy.
	 */
	CryptoJS.pad.NoPadding = {
	    pad: function () {
	    },

	    unpad: function () {
	    }
	};


	return CryptoJS.pad.NoPadding;

}));
},{"./cipher-core":30,"./core":31}],49:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	/**
	 * Zero padding strategy.
	 */
	CryptoJS.pad.ZeroPadding = {
	    pad: function (data, blockSize) {
	        // Shortcut
	        var blockSizeBytes = blockSize * 4;

	        // Pad
	        data.clamp();
	        data.sigBytes += blockSizeBytes - ((data.sigBytes % blockSizeBytes) || blockSizeBytes);
	    },

	    unpad: function (data) {
	        // Shortcut
	        var dataWords = data.words;

	        // Unpad
	        var i = data.sigBytes - 1;
	        while (!((dataWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff)) {
	            i--;
	        }
	        data.sigBytes = i + 1;
	    }
	};


	return CryptoJS.pad.ZeroPadding;

}));
},{"./cipher-core":30,"./core":31}],50:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./sha1"), require("./hmac"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./sha1", "./hmac"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var WordArray = C_lib.WordArray;
	    var C_algo = C.algo;
	    var SHA1 = C_algo.SHA1;
	    var HMAC = C_algo.HMAC;

	    /**
	     * Password-Based Key Derivation Function 2 algorithm.
	     */
	    var PBKDF2 = C_algo.PBKDF2 = Base.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {number} keySize The key size in words to generate. Default: 4 (128 bits)
	         * @property {Hasher} hasher The hasher to use. Default: SHA1
	         * @property {number} iterations The number of iterations to perform. Default: 1
	         */
	        cfg: Base.extend({
	            keySize: 128/32,
	            hasher: SHA1,
	            iterations: 1
	        }),

	        /**
	         * Initializes a newly created key derivation function.
	         *
	         * @param {Object} cfg (Optional) The configuration options to use for the derivation.
	         *
	         * @example
	         *
	         *     var kdf = CryptoJS.algo.PBKDF2.create();
	         *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8 });
	         *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8, iterations: 1000 });
	         */
	        init: function (cfg) {
	            this.cfg = this.cfg.extend(cfg);
	        },

	        /**
	         * Computes the Password-Based Key Derivation Function 2.
	         *
	         * @param {WordArray|string} password The password.
	         * @param {WordArray|string} salt A salt.
	         *
	         * @return {WordArray} The derived key.
	         *
	         * @example
	         *
	         *     var key = kdf.compute(password, salt);
	         */
	        compute: function (password, salt) {
	            // Shortcut
	            var cfg = this.cfg;

	            // Init HMAC
	            var hmac = HMAC.create(cfg.hasher, password);

	            // Initial values
	            var derivedKey = WordArray.create();
	            var blockIndex = WordArray.create([0x00000001]);

	            // Shortcuts
	            var derivedKeyWords = derivedKey.words;
	            var blockIndexWords = blockIndex.words;
	            var keySize = cfg.keySize;
	            var iterations = cfg.iterations;

	            // Generate key
	            while (derivedKeyWords.length < keySize) {
	                var block = hmac.update(salt).finalize(blockIndex);
	                hmac.reset();

	                // Shortcuts
	                var blockWords = block.words;
	                var blockWordsLength = blockWords.length;

	                // Iterations
	                var intermediate = block;
	                for (var i = 1; i < iterations; i++) {
	                    intermediate = hmac.finalize(intermediate);
	                    hmac.reset();

	                    // Shortcut
	                    var intermediateWords = intermediate.words;

	                    // XOR intermediate with block
	                    for (var j = 0; j < blockWordsLength; j++) {
	                        blockWords[j] ^= intermediateWords[j];
	                    }
	                }

	                derivedKey.concat(block);
	                blockIndexWords[0]++;
	            }
	            derivedKey.sigBytes = keySize * 4;

	            return derivedKey;
	        }
	    });

	    /**
	     * Computes the Password-Based Key Derivation Function 2.
	     *
	     * @param {WordArray|string} password The password.
	     * @param {WordArray|string} salt A salt.
	     * @param {Object} cfg (Optional) The configuration options to use for this computation.
	     *
	     * @return {WordArray} The derived key.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var key = CryptoJS.PBKDF2(password, salt);
	     *     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8 });
	     *     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8, iterations: 1000 });
	     */
	    C.PBKDF2 = function (password, salt, cfg) {
	        return PBKDF2.create(cfg).compute(password, salt);
	    };
	}());


	return CryptoJS.PBKDF2;

}));
},{"./core":31,"./hmac":36,"./sha1":55}],51:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./enc-base64"), require("./md5"), require("./evpkdf"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var StreamCipher = C_lib.StreamCipher;
	    var C_algo = C.algo;

	    // Reusable objects
	    var S  = [];
	    var C_ = [];
	    var G  = [];

	    /**
	     * Rabbit stream cipher algorithm.
	     *
	     * This is a legacy version that neglected to convert the key to little-endian.
	     * This error doesn't affect the cipher's security,
	     * but it does affect its compatibility with other implementations.
	     */
	    var RabbitLegacy = C_algo.RabbitLegacy = StreamCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var K = this._key.words;
	            var iv = this.cfg.iv;

	            // Generate initial state values
	            var X = this._X = [
	                K[0], (K[3] << 16) | (K[2] >>> 16),
	                K[1], (K[0] << 16) | (K[3] >>> 16),
	                K[2], (K[1] << 16) | (K[0] >>> 16),
	                K[3], (K[2] << 16) | (K[1] >>> 16)
	            ];

	            // Generate initial counter values
	            var C = this._C = [
	                (K[2] << 16) | (K[2] >>> 16), (K[0] & 0xffff0000) | (K[1] & 0x0000ffff),
	                (K[3] << 16) | (K[3] >>> 16), (K[1] & 0xffff0000) | (K[2] & 0x0000ffff),
	                (K[0] << 16) | (K[0] >>> 16), (K[2] & 0xffff0000) | (K[3] & 0x0000ffff),
	                (K[1] << 16) | (K[1] >>> 16), (K[3] & 0xffff0000) | (K[0] & 0x0000ffff)
	            ];

	            // Carry bit
	            this._b = 0;

	            // Iterate the system four times
	            for (var i = 0; i < 4; i++) {
	                nextState.call(this);
	            }

	            // Modify the counters
	            for (var i = 0; i < 8; i++) {
	                C[i] ^= X[(i + 4) & 7];
	            }

	            // IV setup
	            if (iv) {
	                // Shortcuts
	                var IV = iv.words;
	                var IV_0 = IV[0];
	                var IV_1 = IV[1];

	                // Generate four subvectors
	                var i0 = (((IV_0 << 8) | (IV_0 >>> 24)) & 0x00ff00ff) | (((IV_0 << 24) | (IV_0 >>> 8)) & 0xff00ff00);
	                var i2 = (((IV_1 << 8) | (IV_1 >>> 24)) & 0x00ff00ff) | (((IV_1 << 24) | (IV_1 >>> 8)) & 0xff00ff00);
	                var i1 = (i0 >>> 16) | (i2 & 0xffff0000);
	                var i3 = (i2 << 16)  | (i0 & 0x0000ffff);

	                // Modify counter values
	                C[0] ^= i0;
	                C[1] ^= i1;
	                C[2] ^= i2;
	                C[3] ^= i3;
	                C[4] ^= i0;
	                C[5] ^= i1;
	                C[6] ^= i2;
	                C[7] ^= i3;

	                // Iterate the system four times
	                for (var i = 0; i < 4; i++) {
	                    nextState.call(this);
	                }
	            }
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var X = this._X;

	            // Iterate the system
	            nextState.call(this);

	            // Generate four keystream words
	            S[0] = X[0] ^ (X[5] >>> 16) ^ (X[3] << 16);
	            S[1] = X[2] ^ (X[7] >>> 16) ^ (X[5] << 16);
	            S[2] = X[4] ^ (X[1] >>> 16) ^ (X[7] << 16);
	            S[3] = X[6] ^ (X[3] >>> 16) ^ (X[1] << 16);

	            for (var i = 0; i < 4; i++) {
	                // Swap endian
	                S[i] = (((S[i] << 8)  | (S[i] >>> 24)) & 0x00ff00ff) |
	                       (((S[i] << 24) | (S[i] >>> 8))  & 0xff00ff00);

	                // Encrypt
	                M[offset + i] ^= S[i];
	            }
	        },

	        blockSize: 128/32,

	        ivSize: 64/32
	    });

	    function nextState() {
	        // Shortcuts
	        var X = this._X;
	        var C = this._C;

	        // Save old counter values
	        for (var i = 0; i < 8; i++) {
	            C_[i] = C[i];
	        }

	        // Calculate new counter values
	        C[0] = (C[0] + 0x4d34d34d + this._b) | 0;
	        C[1] = (C[1] + 0xd34d34d3 + ((C[0] >>> 0) < (C_[0] >>> 0) ? 1 : 0)) | 0;
	        C[2] = (C[2] + 0x34d34d34 + ((C[1] >>> 0) < (C_[1] >>> 0) ? 1 : 0)) | 0;
	        C[3] = (C[3] + 0x4d34d34d + ((C[2] >>> 0) < (C_[2] >>> 0) ? 1 : 0)) | 0;
	        C[4] = (C[4] + 0xd34d34d3 + ((C[3] >>> 0) < (C_[3] >>> 0) ? 1 : 0)) | 0;
	        C[5] = (C[5] + 0x34d34d34 + ((C[4] >>> 0) < (C_[4] >>> 0) ? 1 : 0)) | 0;
	        C[6] = (C[6] + 0x4d34d34d + ((C[5] >>> 0) < (C_[5] >>> 0) ? 1 : 0)) | 0;
	        C[7] = (C[7] + 0xd34d34d3 + ((C[6] >>> 0) < (C_[6] >>> 0) ? 1 : 0)) | 0;
	        this._b = (C[7] >>> 0) < (C_[7] >>> 0) ? 1 : 0;

	        // Calculate the g-values
	        for (var i = 0; i < 8; i++) {
	            var gx = X[i] + C[i];

	            // Construct high and low argument for squaring
	            var ga = gx & 0xffff;
	            var gb = gx >>> 16;

	            // Calculate high and low result of squaring
	            var gh = ((((ga * ga) >>> 17) + ga * gb) >>> 15) + gb * gb;
	            var gl = (((gx & 0xffff0000) * gx) | 0) + (((gx & 0x0000ffff) * gx) | 0);

	            // High XOR low
	            G[i] = gh ^ gl;
	        }

	        // Calculate new state values
	        X[0] = (G[0] + ((G[7] << 16) | (G[7] >>> 16)) + ((G[6] << 16) | (G[6] >>> 16))) | 0;
	        X[1] = (G[1] + ((G[0] << 8)  | (G[0] >>> 24)) + G[7]) | 0;
	        X[2] = (G[2] + ((G[1] << 16) | (G[1] >>> 16)) + ((G[0] << 16) | (G[0] >>> 16))) | 0;
	        X[3] = (G[3] + ((G[2] << 8)  | (G[2] >>> 24)) + G[1]) | 0;
	        X[4] = (G[4] + ((G[3] << 16) | (G[3] >>> 16)) + ((G[2] << 16) | (G[2] >>> 16))) | 0;
	        X[5] = (G[5] + ((G[4] << 8)  | (G[4] >>> 24)) + G[3]) | 0;
	        X[6] = (G[6] + ((G[5] << 16) | (G[5] >>> 16)) + ((G[4] << 16) | (G[4] >>> 16))) | 0;
	        X[7] = (G[7] + ((G[6] << 8)  | (G[6] >>> 24)) + G[5]) | 0;
	    }

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.RabbitLegacy.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.RabbitLegacy.decrypt(ciphertext, key, cfg);
	     */
	    C.RabbitLegacy = StreamCipher._createHelper(RabbitLegacy);
	}());


	return CryptoJS.RabbitLegacy;

}));
},{"./cipher-core":30,"./core":31,"./enc-base64":32,"./evpkdf":34,"./md5":39}],52:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./enc-base64"), require("./md5"), require("./evpkdf"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var StreamCipher = C_lib.StreamCipher;
	    var C_algo = C.algo;

	    // Reusable objects
	    var S  = [];
	    var C_ = [];
	    var G  = [];

	    /**
	     * Rabbit stream cipher algorithm
	     */
	    var Rabbit = C_algo.Rabbit = StreamCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var K = this._key.words;
	            var iv = this.cfg.iv;

	            // Swap endian
	            for (var i = 0; i < 4; i++) {
	                K[i] = (((K[i] << 8)  | (K[i] >>> 24)) & 0x00ff00ff) |
	                       (((K[i] << 24) | (K[i] >>> 8))  & 0xff00ff00);
	            }

	            // Generate initial state values
	            var X = this._X = [
	                K[0], (K[3] << 16) | (K[2] >>> 16),
	                K[1], (K[0] << 16) | (K[3] >>> 16),
	                K[2], (K[1] << 16) | (K[0] >>> 16),
	                K[3], (K[2] << 16) | (K[1] >>> 16)
	            ];

	            // Generate initial counter values
	            var C = this._C = [
	                (K[2] << 16) | (K[2] >>> 16), (K[0] & 0xffff0000) | (K[1] & 0x0000ffff),
	                (K[3] << 16) | (K[3] >>> 16), (K[1] & 0xffff0000) | (K[2] & 0x0000ffff),
	                (K[0] << 16) | (K[0] >>> 16), (K[2] & 0xffff0000) | (K[3] & 0x0000ffff),
	                (K[1] << 16) | (K[1] >>> 16), (K[3] & 0xffff0000) | (K[0] & 0x0000ffff)
	            ];

	            // Carry bit
	            this._b = 0;

	            // Iterate the system four times
	            for (var i = 0; i < 4; i++) {
	                nextState.call(this);
	            }

	            // Modify the counters
	            for (var i = 0; i < 8; i++) {
	                C[i] ^= X[(i + 4) & 7];
	            }

	            // IV setup
	            if (iv) {
	                // Shortcuts
	                var IV = iv.words;
	                var IV_0 = IV[0];
	                var IV_1 = IV[1];

	                // Generate four subvectors
	                var i0 = (((IV_0 << 8) | (IV_0 >>> 24)) & 0x00ff00ff) | (((IV_0 << 24) | (IV_0 >>> 8)) & 0xff00ff00);
	                var i2 = (((IV_1 << 8) | (IV_1 >>> 24)) & 0x00ff00ff) | (((IV_1 << 24) | (IV_1 >>> 8)) & 0xff00ff00);
	                var i1 = (i0 >>> 16) | (i2 & 0xffff0000);
	                var i3 = (i2 << 16)  | (i0 & 0x0000ffff);

	                // Modify counter values
	                C[0] ^= i0;
	                C[1] ^= i1;
	                C[2] ^= i2;
	                C[3] ^= i3;
	                C[4] ^= i0;
	                C[5] ^= i1;
	                C[6] ^= i2;
	                C[7] ^= i3;

	                // Iterate the system four times
	                for (var i = 0; i < 4; i++) {
	                    nextState.call(this);
	                }
	            }
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var X = this._X;

	            // Iterate the system
	            nextState.call(this);

	            // Generate four keystream words
	            S[0] = X[0] ^ (X[5] >>> 16) ^ (X[3] << 16);
	            S[1] = X[2] ^ (X[7] >>> 16) ^ (X[5] << 16);
	            S[2] = X[4] ^ (X[1] >>> 16) ^ (X[7] << 16);
	            S[3] = X[6] ^ (X[3] >>> 16) ^ (X[1] << 16);

	            for (var i = 0; i < 4; i++) {
	                // Swap endian
	                S[i] = (((S[i] << 8)  | (S[i] >>> 24)) & 0x00ff00ff) |
	                       (((S[i] << 24) | (S[i] >>> 8))  & 0xff00ff00);

	                // Encrypt
	                M[offset + i] ^= S[i];
	            }
	        },

	        blockSize: 128/32,

	        ivSize: 64/32
	    });

	    function nextState() {
	        // Shortcuts
	        var X = this._X;
	        var C = this._C;

	        // Save old counter values
	        for (var i = 0; i < 8; i++) {
	            C_[i] = C[i];
	        }

	        // Calculate new counter values
	        C[0] = (C[0] + 0x4d34d34d + this._b) | 0;
	        C[1] = (C[1] + 0xd34d34d3 + ((C[0] >>> 0) < (C_[0] >>> 0) ? 1 : 0)) | 0;
	        C[2] = (C[2] + 0x34d34d34 + ((C[1] >>> 0) < (C_[1] >>> 0) ? 1 : 0)) | 0;
	        C[3] = (C[3] + 0x4d34d34d + ((C[2] >>> 0) < (C_[2] >>> 0) ? 1 : 0)) | 0;
	        C[4] = (C[4] + 0xd34d34d3 + ((C[3] >>> 0) < (C_[3] >>> 0) ? 1 : 0)) | 0;
	        C[5] = (C[5] + 0x34d34d34 + ((C[4] >>> 0) < (C_[4] >>> 0) ? 1 : 0)) | 0;
	        C[6] = (C[6] + 0x4d34d34d + ((C[5] >>> 0) < (C_[5] >>> 0) ? 1 : 0)) | 0;
	        C[7] = (C[7] + 0xd34d34d3 + ((C[6] >>> 0) < (C_[6] >>> 0) ? 1 : 0)) | 0;
	        this._b = (C[7] >>> 0) < (C_[7] >>> 0) ? 1 : 0;

	        // Calculate the g-values
	        for (var i = 0; i < 8; i++) {
	            var gx = X[i] + C[i];

	            // Construct high and low argument for squaring
	            var ga = gx & 0xffff;
	            var gb = gx >>> 16;

	            // Calculate high and low result of squaring
	            var gh = ((((ga * ga) >>> 17) + ga * gb) >>> 15) + gb * gb;
	            var gl = (((gx & 0xffff0000) * gx) | 0) + (((gx & 0x0000ffff) * gx) | 0);

	            // High XOR low
	            G[i] = gh ^ gl;
	        }

	        // Calculate new state values
	        X[0] = (G[0] + ((G[7] << 16) | (G[7] >>> 16)) + ((G[6] << 16) | (G[6] >>> 16))) | 0;
	        X[1] = (G[1] + ((G[0] << 8)  | (G[0] >>> 24)) + G[7]) | 0;
	        X[2] = (G[2] + ((G[1] << 16) | (G[1] >>> 16)) + ((G[0] << 16) | (G[0] >>> 16))) | 0;
	        X[3] = (G[3] + ((G[2] << 8)  | (G[2] >>> 24)) + G[1]) | 0;
	        X[4] = (G[4] + ((G[3] << 16) | (G[3] >>> 16)) + ((G[2] << 16) | (G[2] >>> 16))) | 0;
	        X[5] = (G[5] + ((G[4] << 8)  | (G[4] >>> 24)) + G[3]) | 0;
	        X[6] = (G[6] + ((G[5] << 16) | (G[5] >>> 16)) + ((G[4] << 16) | (G[4] >>> 16))) | 0;
	        X[7] = (G[7] + ((G[6] << 8)  | (G[6] >>> 24)) + G[5]) | 0;
	    }

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.Rabbit.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.Rabbit.decrypt(ciphertext, key, cfg);
	     */
	    C.Rabbit = StreamCipher._createHelper(Rabbit);
	}());


	return CryptoJS.Rabbit;

}));
},{"./cipher-core":30,"./core":31,"./enc-base64":32,"./evpkdf":34,"./md5":39}],53:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./enc-base64"), require("./md5"), require("./evpkdf"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var StreamCipher = C_lib.StreamCipher;
	    var C_algo = C.algo;

	    /**
	     * RC4 stream cipher algorithm.
	     */
	    var RC4 = C_algo.RC4 = StreamCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var key = this._key;
	            var keyWords = key.words;
	            var keySigBytes = key.sigBytes;

	            // Init sbox
	            var S = this._S = [];
	            for (var i = 0; i < 256; i++) {
	                S[i] = i;
	            }

	            // Key setup
	            for (var i = 0, j = 0; i < 256; i++) {
	                var keyByteIndex = i % keySigBytes;
	                var keyByte = (keyWords[keyByteIndex >>> 2] >>> (24 - (keyByteIndex % 4) * 8)) & 0xff;

	                j = (j + S[i] + keyByte) % 256;

	                // Swap
	                var t = S[i];
	                S[i] = S[j];
	                S[j] = t;
	            }

	            // Counters
	            this._i = this._j = 0;
	        },

	        _doProcessBlock: function (M, offset) {
	            M[offset] ^= generateKeystreamWord.call(this);
	        },

	        keySize: 256/32,

	        ivSize: 0
	    });

	    function generateKeystreamWord() {
	        // Shortcuts
	        var S = this._S;
	        var i = this._i;
	        var j = this._j;

	        // Generate keystream word
	        var keystreamWord = 0;
	        for (var n = 0; n < 4; n++) {
	            i = (i + 1) % 256;
	            j = (j + S[i]) % 256;

	            // Swap
	            var t = S[i];
	            S[i] = S[j];
	            S[j] = t;

	            keystreamWord |= S[(S[i] + S[j]) % 256] << (24 - n * 8);
	        }

	        // Update counters
	        this._i = i;
	        this._j = j;

	        return keystreamWord;
	    }

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.RC4.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.RC4.decrypt(ciphertext, key, cfg);
	     */
	    C.RC4 = StreamCipher._createHelper(RC4);

	    /**
	     * Modified RC4 stream cipher algorithm.
	     */
	    var RC4Drop = C_algo.RC4Drop = RC4.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {number} drop The number of keystream words to drop. Default 192
	         */
	        cfg: RC4.cfg.extend({
	            drop: 192
	        }),

	        _doReset: function () {
	            RC4._doReset.call(this);

	            // Drop
	            for (var i = this.cfg.drop; i > 0; i--) {
	                generateKeystreamWord.call(this);
	            }
	        }
	    });

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.RC4Drop.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.RC4Drop.decrypt(ciphertext, key, cfg);
	     */
	    C.RC4Drop = StreamCipher._createHelper(RC4Drop);
	}());


	return CryptoJS.RC4;

}));
},{"./cipher-core":30,"./core":31,"./enc-base64":32,"./evpkdf":34,"./md5":39}],54:[function(require,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	/** @preserve
	(c) 2012 by Cédric Mesnil. All rights reserved.

	Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

	    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
	    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	*/

	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Constants table
	    var _zl = WordArray.create([
	        0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
	        7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
	        3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
	        1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
	        4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13]);
	    var _zr = WordArray.create([
	        5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
	        6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
	        15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
	        8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
	        12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11]);
	    var _sl = WordArray.create([
	         11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
	        7, 6,   8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
	        11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
	          11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
	        9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6 ]);
	    var _sr = WordArray.create([
	        8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
	        9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
	        9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
	        15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
	        8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11 ]);

	    var _hl =  WordArray.create([ 0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E]);
	    var _hr =  WordArray.create([ 0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000]);

	    /**
	     * RIPEMD160 hash algorithm.
	     */
	    var RIPEMD160 = C_algo.RIPEMD160 = Hasher.extend({
	        _doReset: function () {
	            this._hash  = WordArray.create([0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0]);
	        },

	        _doProcessBlock: function (M, offset) {

	            // Swap endian
	            for (var i = 0; i < 16; i++) {
	                // Shortcuts
	                var offset_i = offset + i;
	                var M_offset_i = M[offset_i];

	                // Swap
	                M[offset_i] = (
	                    (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
	                    (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
	                );
	            }
	            // Shortcut
	            var H  = this._hash.words;
	            var hl = _hl.words;
	            var hr = _hr.words;
	            var zl = _zl.words;
	            var zr = _zr.words;
	            var sl = _sl.words;
	            var sr = _sr.words;

	            // Working variables
	            var al, bl, cl, dl, el;
	            var ar, br, cr, dr, er;

	            ar = al = H[0];
	            br = bl = H[1];
	            cr = cl = H[2];
	            dr = dl = H[3];
	            er = el = H[4];
	            // Computation
	            var t;
	            for (var i = 0; i < 80; i += 1) {
	                t = (al +  M[offset+zl[i]])|0;
	                if (i<16){
		            t +=  f1(bl,cl,dl) + hl[0];
	                } else if (i<32) {
		            t +=  f2(bl,cl,dl) + hl[1];
	                } else if (i<48) {
		            t +=  f3(bl,cl,dl) + hl[2];
	                } else if (i<64) {
		            t +=  f4(bl,cl,dl) + hl[3];
	                } else {// if (i<80) {
		            t +=  f5(bl,cl,dl) + hl[4];
	                }
	                t = t|0;
	                t =  rotl(t,sl[i]);
	                t = (t+el)|0;
	                al = el;
	                el = dl;
	                dl = rotl(cl, 10);
	                cl = bl;
	                bl = t;

	                t = (ar + M[offset+zr[i]])|0;
	                if (i<16){
		            t +=  f5(br,cr,dr) + hr[0];
	                } else if (i<32) {
		            t +=  f4(br,cr,dr) + hr[1];
	                } else if (i<48) {
		            t +=  f3(br,cr,dr) + hr[2];
	                } else if (i<64) {
		            t +=  f2(br,cr,dr) + hr[3];
	                } else {// if (i<80) {
		            t +=  f1(br,cr,dr) + hr[4];
	                }
	                t = t|0;
	                t =  rotl(t,sr[i]) ;
	                t = (t+er)|0;
	                ar = er;
	                er = dr;
	                dr = rotl(cr, 10);
	                cr = br;
	                br = t;
	            }
	            // Intermediate hash value
	            t    = (H[1] + cl + dr)|0;
	            H[1] = (H[2] + dl + er)|0;
	            H[2] = (H[3] + el + ar)|0;
	            H[3] = (H[4] + al + br)|0;
	            H[4] = (H[0] + bl + cr)|0;
	            H[0] =  t;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
	                (((nBitsTotal << 8)  | (nBitsTotal >>> 24)) & 0x00ff00ff) |
	                (((nBitsTotal << 24) | (nBitsTotal >>> 8))  & 0xff00ff00)
	            );
	            data.sigBytes = (dataWords.length + 1) * 4;

	            // Hash final blocks
	            this._process();

	            // Shortcuts
	            var hash = this._hash;
	            var H = hash.words;

	            // Swap endian
	            for (var i = 0; i < 5; i++) {
	                // Shortcut
	                var H_i = H[i];

	                // Swap
	                H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
	                       (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
	            }

	            // Return final computed hash
	            return hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });


	    function f1(x, y, z) {
	        return ((x) ^ (y) ^ (z));

	    }

	    function f2(x, y, z) {
	        return (((x)&(y)) | ((~x)&(z)));
	    }

	    function f3(x, y, z) {
	        return (((x) | (~(y))) ^ (z));
	    }

	    function f4(x, y, z) {
	        return (((x) & (z)) | ((y)&(~(z))));
	    }

	    function f5(x, y, z) {
	        return ((x) ^ ((y) |(~(z))));

	    }

	    function rotl(x,n) {
	        return (x<<n) | (x>>>(32-n));
	    }


	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.RIPEMD160('message');
	     *     var hash = CryptoJS.RIPEMD160(wordArray);
	     */
	    C.RIPEMD160 = Hasher._createHelper(RIPEMD160);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacRIPEMD160(message, key);
	     */
	    C.HmacRIPEMD160 = Hasher._createHmacHelper(RIPEMD160);
	}(Math));


	return CryptoJS.RIPEMD160;

}));
},{"./core":31}],55:[function(require,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Reusable object
	    var W = [];

	    /**
	     * SHA-1 hash algorithm.
	     */
	    var SHA1 = C_algo.SHA1 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init([
	                0x67452301, 0xefcdab89,
	                0x98badcfe, 0x10325476,
	                0xc3d2e1f0
	            ]);
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var H = this._hash.words;

	            // Working variables
	            var a = H[0];
	            var b = H[1];
	            var c = H[2];
	            var d = H[3];
	            var e = H[4];

	            // Computation
	            for (var i = 0; i < 80; i++) {
	                if (i < 16) {
	                    W[i] = M[offset + i] | 0;
	                } else {
	                    var n = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
	                    W[i] = (n << 1) | (n >>> 31);
	                }

	                var t = ((a << 5) | (a >>> 27)) + e + W[i];
	                if (i < 20) {
	                    t += ((b & c) | (~b & d)) + 0x5a827999;
	                } else if (i < 40) {
	                    t += (b ^ c ^ d) + 0x6ed9eba1;
	                } else if (i < 60) {
	                    t += ((b & c) | (b & d) | (c & d)) - 0x70e44324;
	                } else /* if (i < 80) */ {
	                    t += (b ^ c ^ d) - 0x359d3e2a;
	                }

	                e = d;
	                d = c;
	                c = (b << 30) | (b >>> 2);
	                b = a;
	                a = t;
	            }

	            // Intermediate hash value
	            H[0] = (H[0] + a) | 0;
	            H[1] = (H[1] + b) | 0;
	            H[2] = (H[2] + c) | 0;
	            H[3] = (H[3] + d) | 0;
	            H[4] = (H[4] + e) | 0;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Return final computed hash
	            return this._hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA1('message');
	     *     var hash = CryptoJS.SHA1(wordArray);
	     */
	    C.SHA1 = Hasher._createHelper(SHA1);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA1(message, key);
	     */
	    C.HmacSHA1 = Hasher._createHmacHelper(SHA1);
	}());


	return CryptoJS.SHA1;

}));
},{"./core":31}],56:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./sha256"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./sha256"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var C_algo = C.algo;
	    var SHA256 = C_algo.SHA256;

	    /**
	     * SHA-224 hash algorithm.
	     */
	    var SHA224 = C_algo.SHA224 = SHA256.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init([
	                0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
	                0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4
	            ]);
	        },

	        _doFinalize: function () {
	            var hash = SHA256._doFinalize.call(this);

	            hash.sigBytes -= 4;

	            return hash;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA224('message');
	     *     var hash = CryptoJS.SHA224(wordArray);
	     */
	    C.SHA224 = SHA256._createHelper(SHA224);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA224(message, key);
	     */
	    C.HmacSHA224 = SHA256._createHmacHelper(SHA224);
	}());


	return CryptoJS.SHA224;

}));
},{"./core":31,"./sha256":57}],57:[function(require,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Initialization and round constants tables
	    var H = [];
	    var K = [];

	    // Compute constants
	    (function () {
	        function isPrime(n) {
	            var sqrtN = Math.sqrt(n);
	            for (var factor = 2; factor <= sqrtN; factor++) {
	                if (!(n % factor)) {
	                    return false;
	                }
	            }

	            return true;
	        }

	        function getFractionalBits(n) {
	            return ((n - (n | 0)) * 0x100000000) | 0;
	        }

	        var n = 2;
	        var nPrime = 0;
	        while (nPrime < 64) {
	            if (isPrime(n)) {
	                if (nPrime < 8) {
	                    H[nPrime] = getFractionalBits(Math.pow(n, 1 / 2));
	                }
	                K[nPrime] = getFractionalBits(Math.pow(n, 1 / 3));

	                nPrime++;
	            }

	            n++;
	        }
	    }());

	    // Reusable object
	    var W = [];

	    /**
	     * SHA-256 hash algorithm.
	     */
	    var SHA256 = C_algo.SHA256 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init(H.slice(0));
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var H = this._hash.words;

	            // Working variables
	            var a = H[0];
	            var b = H[1];
	            var c = H[2];
	            var d = H[3];
	            var e = H[4];
	            var f = H[5];
	            var g = H[6];
	            var h = H[7];

	            // Computation
	            for (var i = 0; i < 64; i++) {
	                if (i < 16) {
	                    W[i] = M[offset + i] | 0;
	                } else {
	                    var gamma0x = W[i - 15];
	                    var gamma0  = ((gamma0x << 25) | (gamma0x >>> 7))  ^
	                                  ((gamma0x << 14) | (gamma0x >>> 18)) ^
	                                   (gamma0x >>> 3);

	                    var gamma1x = W[i - 2];
	                    var gamma1  = ((gamma1x << 15) | (gamma1x >>> 17)) ^
	                                  ((gamma1x << 13) | (gamma1x >>> 19)) ^
	                                   (gamma1x >>> 10);

	                    W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
	                }

	                var ch  = (e & f) ^ (~e & g);
	                var maj = (a & b) ^ (a & c) ^ (b & c);

	                var sigma0 = ((a << 30) | (a >>> 2)) ^ ((a << 19) | (a >>> 13)) ^ ((a << 10) | (a >>> 22));
	                var sigma1 = ((e << 26) | (e >>> 6)) ^ ((e << 21) | (e >>> 11)) ^ ((e << 7)  | (e >>> 25));

	                var t1 = h + sigma1 + ch + K[i] + W[i];
	                var t2 = sigma0 + maj;

	                h = g;
	                g = f;
	                f = e;
	                e = (d + t1) | 0;
	                d = c;
	                c = b;
	                b = a;
	                a = (t1 + t2) | 0;
	            }

	            // Intermediate hash value
	            H[0] = (H[0] + a) | 0;
	            H[1] = (H[1] + b) | 0;
	            H[2] = (H[2] + c) | 0;
	            H[3] = (H[3] + d) | 0;
	            H[4] = (H[4] + e) | 0;
	            H[5] = (H[5] + f) | 0;
	            H[6] = (H[6] + g) | 0;
	            H[7] = (H[7] + h) | 0;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Return final computed hash
	            return this._hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA256('message');
	     *     var hash = CryptoJS.SHA256(wordArray);
	     */
	    C.SHA256 = Hasher._createHelper(SHA256);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA256(message, key);
	     */
	    C.HmacSHA256 = Hasher._createHmacHelper(SHA256);
	}(Math));


	return CryptoJS.SHA256;

}));
},{"./core":31}],58:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./x64-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./x64-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_x64 = C.x64;
	    var X64Word = C_x64.Word;
	    var C_algo = C.algo;

	    // Constants tables
	    var RHO_OFFSETS = [];
	    var PI_INDEXES  = [];
	    var ROUND_CONSTANTS = [];

	    // Compute Constants
	    (function () {
	        // Compute rho offset constants
	        var x = 1, y = 0;
	        for (var t = 0; t < 24; t++) {
	            RHO_OFFSETS[x + 5 * y] = ((t + 1) * (t + 2) / 2) % 64;

	            var newX = y % 5;
	            var newY = (2 * x + 3 * y) % 5;
	            x = newX;
	            y = newY;
	        }

	        // Compute pi index constants
	        for (var x = 0; x < 5; x++) {
	            for (var y = 0; y < 5; y++) {
	                PI_INDEXES[x + 5 * y] = y + ((2 * x + 3 * y) % 5) * 5;
	            }
	        }

	        // Compute round constants
	        var LFSR = 0x01;
	        for (var i = 0; i < 24; i++) {
	            var roundConstantMsw = 0;
	            var roundConstantLsw = 0;

	            for (var j = 0; j < 7; j++) {
	                if (LFSR & 0x01) {
	                    var bitPosition = (1 << j) - 1;
	                    if (bitPosition < 32) {
	                        roundConstantLsw ^= 1 << bitPosition;
	                    } else /* if (bitPosition >= 32) */ {
	                        roundConstantMsw ^= 1 << (bitPosition - 32);
	                    }
	                }

	                // Compute next LFSR
	                if (LFSR & 0x80) {
	                    // Primitive polynomial over GF(2): x^8 + x^6 + x^5 + x^4 + 1
	                    LFSR = (LFSR << 1) ^ 0x71;
	                } else {
	                    LFSR <<= 1;
	                }
	            }

	            ROUND_CONSTANTS[i] = X64Word.create(roundConstantMsw, roundConstantLsw);
	        }
	    }());

	    // Reusable objects for temporary values
	    var T = [];
	    (function () {
	        for (var i = 0; i < 25; i++) {
	            T[i] = X64Word.create();
	        }
	    }());

	    /**
	     * SHA-3 hash algorithm.
	     */
	    var SHA3 = C_algo.SHA3 = Hasher.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {number} outputLength
	         *   The desired number of bits in the output hash.
	         *   Only values permitted are: 224, 256, 384, 512.
	         *   Default: 512
	         */
	        cfg: Hasher.cfg.extend({
	            outputLength: 512
	        }),

	        _doReset: function () {
	            var state = this._state = []
	            for (var i = 0; i < 25; i++) {
	                state[i] = new X64Word.init();
	            }

	            this.blockSize = (1600 - 2 * this.cfg.outputLength) / 32;
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcuts
	            var state = this._state;
	            var nBlockSizeLanes = this.blockSize / 2;

	            // Absorb
	            for (var i = 0; i < nBlockSizeLanes; i++) {
	                // Shortcuts
	                var M2i  = M[offset + 2 * i];
	                var M2i1 = M[offset + 2 * i + 1];

	                // Swap endian
	                M2i = (
	                    (((M2i << 8)  | (M2i >>> 24)) & 0x00ff00ff) |
	                    (((M2i << 24) | (M2i >>> 8))  & 0xff00ff00)
	                );
	                M2i1 = (
	                    (((M2i1 << 8)  | (M2i1 >>> 24)) & 0x00ff00ff) |
	                    (((M2i1 << 24) | (M2i1 >>> 8))  & 0xff00ff00)
	                );

	                // Absorb message into state
	                var lane = state[i];
	                lane.high ^= M2i1;
	                lane.low  ^= M2i;
	            }

	            // Rounds
	            for (var round = 0; round < 24; round++) {
	                // Theta
	                for (var x = 0; x < 5; x++) {
	                    // Mix column lanes
	                    var tMsw = 0, tLsw = 0;
	                    for (var y = 0; y < 5; y++) {
	                        var lane = state[x + 5 * y];
	                        tMsw ^= lane.high;
	                        tLsw ^= lane.low;
	                    }

	                    // Temporary values
	                    var Tx = T[x];
	                    Tx.high = tMsw;
	                    Tx.low  = tLsw;
	                }
	                for (var x = 0; x < 5; x++) {
	                    // Shortcuts
	                    var Tx4 = T[(x + 4) % 5];
	                    var Tx1 = T[(x + 1) % 5];
	                    var Tx1Msw = Tx1.high;
	                    var Tx1Lsw = Tx1.low;

	                    // Mix surrounding columns
	                    var tMsw = Tx4.high ^ ((Tx1Msw << 1) | (Tx1Lsw >>> 31));
	                    var tLsw = Tx4.low  ^ ((Tx1Lsw << 1) | (Tx1Msw >>> 31));
	                    for (var y = 0; y < 5; y++) {
	                        var lane = state[x + 5 * y];
	                        lane.high ^= tMsw;
	                        lane.low  ^= tLsw;
	                    }
	                }

	                // Rho Pi
	                for (var laneIndex = 1; laneIndex < 25; laneIndex++) {
	                    // Shortcuts
	                    var lane = state[laneIndex];
	                    var laneMsw = lane.high;
	                    var laneLsw = lane.low;
	                    var rhoOffset = RHO_OFFSETS[laneIndex];

	                    // Rotate lanes
	                    if (rhoOffset < 32) {
	                        var tMsw = (laneMsw << rhoOffset) | (laneLsw >>> (32 - rhoOffset));
	                        var tLsw = (laneLsw << rhoOffset) | (laneMsw >>> (32 - rhoOffset));
	                    } else /* if (rhoOffset >= 32) */ {
	                        var tMsw = (laneLsw << (rhoOffset - 32)) | (laneMsw >>> (64 - rhoOffset));
	                        var tLsw = (laneMsw << (rhoOffset - 32)) | (laneLsw >>> (64 - rhoOffset));
	                    }

	                    // Transpose lanes
	                    var TPiLane = T[PI_INDEXES[laneIndex]];
	                    TPiLane.high = tMsw;
	                    TPiLane.low  = tLsw;
	                }

	                // Rho pi at x = y = 0
	                var T0 = T[0];
	                var state0 = state[0];
	                T0.high = state0.high;
	                T0.low  = state0.low;

	                // Chi
	                for (var x = 0; x < 5; x++) {
	                    for (var y = 0; y < 5; y++) {
	                        // Shortcuts
	                        var laneIndex = x + 5 * y;
	                        var lane = state[laneIndex];
	                        var TLane = T[laneIndex];
	                        var Tx1Lane = T[((x + 1) % 5) + 5 * y];
	                        var Tx2Lane = T[((x + 2) % 5) + 5 * y];

	                        // Mix rows
	                        lane.high = TLane.high ^ (~Tx1Lane.high & Tx2Lane.high);
	                        lane.low  = TLane.low  ^ (~Tx1Lane.low  & Tx2Lane.low);
	                    }
	                }

	                // Iota
	                var lane = state[0];
	                var roundConstant = ROUND_CONSTANTS[round];
	                lane.high ^= roundConstant.high;
	                lane.low  ^= roundConstant.low;;
	            }
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;
	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;
	            var blockSizeBits = this.blockSize * 32;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x1 << (24 - nBitsLeft % 32);
	            dataWords[((Math.ceil((nBitsLeft + 1) / blockSizeBits) * blockSizeBits) >>> 5) - 1] |= 0x80;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Shortcuts
	            var state = this._state;
	            var outputLengthBytes = this.cfg.outputLength / 8;
	            var outputLengthLanes = outputLengthBytes / 8;

	            // Squeeze
	            var hashWords = [];
	            for (var i = 0; i < outputLengthLanes; i++) {
	                // Shortcuts
	                var lane = state[i];
	                var laneMsw = lane.high;
	                var laneLsw = lane.low;

	                // Swap endian
	                laneMsw = (
	                    (((laneMsw << 8)  | (laneMsw >>> 24)) & 0x00ff00ff) |
	                    (((laneMsw << 24) | (laneMsw >>> 8))  & 0xff00ff00)
	                );
	                laneLsw = (
	                    (((laneLsw << 8)  | (laneLsw >>> 24)) & 0x00ff00ff) |
	                    (((laneLsw << 24) | (laneLsw >>> 8))  & 0xff00ff00)
	                );

	                // Squeeze state to retrieve hash
	                hashWords.push(laneLsw);
	                hashWords.push(laneMsw);
	            }

	            // Return final computed hash
	            return new WordArray.init(hashWords, outputLengthBytes);
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);

	            var state = clone._state = this._state.slice(0);
	            for (var i = 0; i < 25; i++) {
	                state[i] = state[i].clone();
	            }

	            return clone;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA3('message');
	     *     var hash = CryptoJS.SHA3(wordArray);
	     */
	    C.SHA3 = Hasher._createHelper(SHA3);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA3(message, key);
	     */
	    C.HmacSHA3 = Hasher._createHmacHelper(SHA3);
	}(Math));


	return CryptoJS.SHA3;

}));
},{"./core":31,"./x64-core":62}],59:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./x64-core"), require("./sha512"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./x64-core", "./sha512"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_x64 = C.x64;
	    var X64Word = C_x64.Word;
	    var X64WordArray = C_x64.WordArray;
	    var C_algo = C.algo;
	    var SHA512 = C_algo.SHA512;

	    /**
	     * SHA-384 hash algorithm.
	     */
	    var SHA384 = C_algo.SHA384 = SHA512.extend({
	        _doReset: function () {
	            this._hash = new X64WordArray.init([
	                new X64Word.init(0xcbbb9d5d, 0xc1059ed8), new X64Word.init(0x629a292a, 0x367cd507),
	                new X64Word.init(0x9159015a, 0x3070dd17), new X64Word.init(0x152fecd8, 0xf70e5939),
	                new X64Word.init(0x67332667, 0xffc00b31), new X64Word.init(0x8eb44a87, 0x68581511),
	                new X64Word.init(0xdb0c2e0d, 0x64f98fa7), new X64Word.init(0x47b5481d, 0xbefa4fa4)
	            ]);
	        },

	        _doFinalize: function () {
	            var hash = SHA512._doFinalize.call(this);

	            hash.sigBytes -= 16;

	            return hash;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA384('message');
	     *     var hash = CryptoJS.SHA384(wordArray);
	     */
	    C.SHA384 = SHA512._createHelper(SHA384);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA384(message, key);
	     */
	    C.HmacSHA384 = SHA512._createHmacHelper(SHA384);
	}());


	return CryptoJS.SHA384;

}));
},{"./core":31,"./sha512":60,"./x64-core":62}],60:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./x64-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./x64-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Hasher = C_lib.Hasher;
	    var C_x64 = C.x64;
	    var X64Word = C_x64.Word;
	    var X64WordArray = C_x64.WordArray;
	    var C_algo = C.algo;

	    function X64Word_create() {
	        return X64Word.create.apply(X64Word, arguments);
	    }

	    // Constants
	    var K = [
	        X64Word_create(0x428a2f98, 0xd728ae22), X64Word_create(0x71374491, 0x23ef65cd),
	        X64Word_create(0xb5c0fbcf, 0xec4d3b2f), X64Word_create(0xe9b5dba5, 0x8189dbbc),
	        X64Word_create(0x3956c25b, 0xf348b538), X64Word_create(0x59f111f1, 0xb605d019),
	        X64Word_create(0x923f82a4, 0xaf194f9b), X64Word_create(0xab1c5ed5, 0xda6d8118),
	        X64Word_create(0xd807aa98, 0xa3030242), X64Word_create(0x12835b01, 0x45706fbe),
	        X64Word_create(0x243185be, 0x4ee4b28c), X64Word_create(0x550c7dc3, 0xd5ffb4e2),
	        X64Word_create(0x72be5d74, 0xf27b896f), X64Word_create(0x80deb1fe, 0x3b1696b1),
	        X64Word_create(0x9bdc06a7, 0x25c71235), X64Word_create(0xc19bf174, 0xcf692694),
	        X64Word_create(0xe49b69c1, 0x9ef14ad2), X64Word_create(0xefbe4786, 0x384f25e3),
	        X64Word_create(0x0fc19dc6, 0x8b8cd5b5), X64Word_create(0x240ca1cc, 0x77ac9c65),
	        X64Word_create(0x2de92c6f, 0x592b0275), X64Word_create(0x4a7484aa, 0x6ea6e483),
	        X64Word_create(0x5cb0a9dc, 0xbd41fbd4), X64Word_create(0x76f988da, 0x831153b5),
	        X64Word_create(0x983e5152, 0xee66dfab), X64Word_create(0xa831c66d, 0x2db43210),
	        X64Word_create(0xb00327c8, 0x98fb213f), X64Word_create(0xbf597fc7, 0xbeef0ee4),
	        X64Word_create(0xc6e00bf3, 0x3da88fc2), X64Word_create(0xd5a79147, 0x930aa725),
	        X64Word_create(0x06ca6351, 0xe003826f), X64Word_create(0x14292967, 0x0a0e6e70),
	        X64Word_create(0x27b70a85, 0x46d22ffc), X64Word_create(0x2e1b2138, 0x5c26c926),
	        X64Word_create(0x4d2c6dfc, 0x5ac42aed), X64Word_create(0x53380d13, 0x9d95b3df),
	        X64Word_create(0x650a7354, 0x8baf63de), X64Word_create(0x766a0abb, 0x3c77b2a8),
	        X64Word_create(0x81c2c92e, 0x47edaee6), X64Word_create(0x92722c85, 0x1482353b),
	        X64Word_create(0xa2bfe8a1, 0x4cf10364), X64Word_create(0xa81a664b, 0xbc423001),
	        X64Word_create(0xc24b8b70, 0xd0f89791), X64Word_create(0xc76c51a3, 0x0654be30),
	        X64Word_create(0xd192e819, 0xd6ef5218), X64Word_create(0xd6990624, 0x5565a910),
	        X64Word_create(0xf40e3585, 0x5771202a), X64Word_create(0x106aa070, 0x32bbd1b8),
	        X64Word_create(0x19a4c116, 0xb8d2d0c8), X64Word_create(0x1e376c08, 0x5141ab53),
	        X64Word_create(0x2748774c, 0xdf8eeb99), X64Word_create(0x34b0bcb5, 0xe19b48a8),
	        X64Word_create(0x391c0cb3, 0xc5c95a63), X64Word_create(0x4ed8aa4a, 0xe3418acb),
	        X64Word_create(0x5b9cca4f, 0x7763e373), X64Word_create(0x682e6ff3, 0xd6b2b8a3),
	        X64Word_create(0x748f82ee, 0x5defb2fc), X64Word_create(0x78a5636f, 0x43172f60),
	        X64Word_create(0x84c87814, 0xa1f0ab72), X64Word_create(0x8cc70208, 0x1a6439ec),
	        X64Word_create(0x90befffa, 0x23631e28), X64Word_create(0xa4506ceb, 0xde82bde9),
	        X64Word_create(0xbef9a3f7, 0xb2c67915), X64Word_create(0xc67178f2, 0xe372532b),
	        X64Word_create(0xca273ece, 0xea26619c), X64Word_create(0xd186b8c7, 0x21c0c207),
	        X64Word_create(0xeada7dd6, 0xcde0eb1e), X64Word_create(0xf57d4f7f, 0xee6ed178),
	        X64Word_create(0x06f067aa, 0x72176fba), X64Word_create(0x0a637dc5, 0xa2c898a6),
	        X64Word_create(0x113f9804, 0xbef90dae), X64Word_create(0x1b710b35, 0x131c471b),
	        X64Word_create(0x28db77f5, 0x23047d84), X64Word_create(0x32caab7b, 0x40c72493),
	        X64Word_create(0x3c9ebe0a, 0x15c9bebc), X64Word_create(0x431d67c4, 0x9c100d4c),
	        X64Word_create(0x4cc5d4be, 0xcb3e42b6), X64Word_create(0x597f299c, 0xfc657e2a),
	        X64Word_create(0x5fcb6fab, 0x3ad6faec), X64Word_create(0x6c44198c, 0x4a475817)
	    ];

	    // Reusable objects
	    var W = [];
	    (function () {
	        for (var i = 0; i < 80; i++) {
	            W[i] = X64Word_create();
	        }
	    }());

	    /**
	     * SHA-512 hash algorithm.
	     */
	    var SHA512 = C_algo.SHA512 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new X64WordArray.init([
	                new X64Word.init(0x6a09e667, 0xf3bcc908), new X64Word.init(0xbb67ae85, 0x84caa73b),
	                new X64Word.init(0x3c6ef372, 0xfe94f82b), new X64Word.init(0xa54ff53a, 0x5f1d36f1),
	                new X64Word.init(0x510e527f, 0xade682d1), new X64Word.init(0x9b05688c, 0x2b3e6c1f),
	                new X64Word.init(0x1f83d9ab, 0xfb41bd6b), new X64Word.init(0x5be0cd19, 0x137e2179)
	            ]);
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcuts
	            var H = this._hash.words;

	            var H0 = H[0];
	            var H1 = H[1];
	            var H2 = H[2];
	            var H3 = H[3];
	            var H4 = H[4];
	            var H5 = H[5];
	            var H6 = H[6];
	            var H7 = H[7];

	            var H0h = H0.high;
	            var H0l = H0.low;
	            var H1h = H1.high;
	            var H1l = H1.low;
	            var H2h = H2.high;
	            var H2l = H2.low;
	            var H3h = H3.high;
	            var H3l = H3.low;
	            var H4h = H4.high;
	            var H4l = H4.low;
	            var H5h = H5.high;
	            var H5l = H5.low;
	            var H6h = H6.high;
	            var H6l = H6.low;
	            var H7h = H7.high;
	            var H7l = H7.low;

	            // Working variables
	            var ah = H0h;
	            var al = H0l;
	            var bh = H1h;
	            var bl = H1l;
	            var ch = H2h;
	            var cl = H2l;
	            var dh = H3h;
	            var dl = H3l;
	            var eh = H4h;
	            var el = H4l;
	            var fh = H5h;
	            var fl = H5l;
	            var gh = H6h;
	            var gl = H6l;
	            var hh = H7h;
	            var hl = H7l;

	            // Rounds
	            for (var i = 0; i < 80; i++) {
	                // Shortcut
	                var Wi = W[i];

	                // Extend message
	                if (i < 16) {
	                    var Wih = Wi.high = M[offset + i * 2]     | 0;
	                    var Wil = Wi.low  = M[offset + i * 2 + 1] | 0;
	                } else {
	                    // Gamma0
	                    var gamma0x  = W[i - 15];
	                    var gamma0xh = gamma0x.high;
	                    var gamma0xl = gamma0x.low;
	                    var gamma0h  = ((gamma0xh >>> 1) | (gamma0xl << 31)) ^ ((gamma0xh >>> 8) | (gamma0xl << 24)) ^ (gamma0xh >>> 7);
	                    var gamma0l  = ((gamma0xl >>> 1) | (gamma0xh << 31)) ^ ((gamma0xl >>> 8) | (gamma0xh << 24)) ^ ((gamma0xl >>> 7) | (gamma0xh << 25));

	                    // Gamma1
	                    var gamma1x  = W[i - 2];
	                    var gamma1xh = gamma1x.high;
	                    var gamma1xl = gamma1x.low;
	                    var gamma1h  = ((gamma1xh >>> 19) | (gamma1xl << 13)) ^ ((gamma1xh << 3) | (gamma1xl >>> 29)) ^ (gamma1xh >>> 6);
	                    var gamma1l  = ((gamma1xl >>> 19) | (gamma1xh << 13)) ^ ((gamma1xl << 3) | (gamma1xh >>> 29)) ^ ((gamma1xl >>> 6) | (gamma1xh << 26));

	                    // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
	                    var Wi7  = W[i - 7];
	                    var Wi7h = Wi7.high;
	                    var Wi7l = Wi7.low;

	                    var Wi16  = W[i - 16];
	                    var Wi16h = Wi16.high;
	                    var Wi16l = Wi16.low;

	                    var Wil = gamma0l + Wi7l;
	                    var Wih = gamma0h + Wi7h + ((Wil >>> 0) < (gamma0l >>> 0) ? 1 : 0);
	                    var Wil = Wil + gamma1l;
	                    var Wih = Wih + gamma1h + ((Wil >>> 0) < (gamma1l >>> 0) ? 1 : 0);
	                    var Wil = Wil + Wi16l;
	                    var Wih = Wih + Wi16h + ((Wil >>> 0) < (Wi16l >>> 0) ? 1 : 0);

	                    Wi.high = Wih;
	                    Wi.low  = Wil;
	                }

	                var chh  = (eh & fh) ^ (~eh & gh);
	                var chl  = (el & fl) ^ (~el & gl);
	                var majh = (ah & bh) ^ (ah & ch) ^ (bh & ch);
	                var majl = (al & bl) ^ (al & cl) ^ (bl & cl);

	                var sigma0h = ((ah >>> 28) | (al << 4))  ^ ((ah << 30)  | (al >>> 2)) ^ ((ah << 25) | (al >>> 7));
	                var sigma0l = ((al >>> 28) | (ah << 4))  ^ ((al << 30)  | (ah >>> 2)) ^ ((al << 25) | (ah >>> 7));
	                var sigma1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9));
	                var sigma1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9));

	                // t1 = h + sigma1 + ch + K[i] + W[i]
	                var Ki  = K[i];
	                var Kih = Ki.high;
	                var Kil = Ki.low;

	                var t1l = hl + sigma1l;
	                var t1h = hh + sigma1h + ((t1l >>> 0) < (hl >>> 0) ? 1 : 0);
	                var t1l = t1l + chl;
	                var t1h = t1h + chh + ((t1l >>> 0) < (chl >>> 0) ? 1 : 0);
	                var t1l = t1l + Kil;
	                var t1h = t1h + Kih + ((t1l >>> 0) < (Kil >>> 0) ? 1 : 0);
	                var t1l = t1l + Wil;
	                var t1h = t1h + Wih + ((t1l >>> 0) < (Wil >>> 0) ? 1 : 0);

	                // t2 = sigma0 + maj
	                var t2l = sigma0l + majl;
	                var t2h = sigma0h + majh + ((t2l >>> 0) < (sigma0l >>> 0) ? 1 : 0);

	                // Update working variables
	                hh = gh;
	                hl = gl;
	                gh = fh;
	                gl = fl;
	                fh = eh;
	                fl = el;
	                el = (dl + t1l) | 0;
	                eh = (dh + t1h + ((el >>> 0) < (dl >>> 0) ? 1 : 0)) | 0;
	                dh = ch;
	                dl = cl;
	                ch = bh;
	                cl = bl;
	                bh = ah;
	                bl = al;
	                al = (t1l + t2l) | 0;
	                ah = (t1h + t2h + ((al >>> 0) < (t1l >>> 0) ? 1 : 0)) | 0;
	            }

	            // Intermediate hash value
	            H0l = H0.low  = (H0l + al);
	            H0.high = (H0h + ah + ((H0l >>> 0) < (al >>> 0) ? 1 : 0));
	            H1l = H1.low  = (H1l + bl);
	            H1.high = (H1h + bh + ((H1l >>> 0) < (bl >>> 0) ? 1 : 0));
	            H2l = H2.low  = (H2l + cl);
	            H2.high = (H2h + ch + ((H2l >>> 0) < (cl >>> 0) ? 1 : 0));
	            H3l = H3.low  = (H3l + dl);
	            H3.high = (H3h + dh + ((H3l >>> 0) < (dl >>> 0) ? 1 : 0));
	            H4l = H4.low  = (H4l + el);
	            H4.high = (H4h + eh + ((H4l >>> 0) < (el >>> 0) ? 1 : 0));
	            H5l = H5.low  = (H5l + fl);
	            H5.high = (H5h + fh + ((H5l >>> 0) < (fl >>> 0) ? 1 : 0));
	            H6l = H6.low  = (H6l + gl);
	            H6.high = (H6h + gh + ((H6l >>> 0) < (gl >>> 0) ? 1 : 0));
	            H7l = H7.low  = (H7l + hl);
	            H7.high = (H7h + hh + ((H7l >>> 0) < (hl >>> 0) ? 1 : 0));
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 128) >>> 10) << 5) + 30] = Math.floor(nBitsTotal / 0x100000000);
	            dataWords[(((nBitsLeft + 128) >>> 10) << 5) + 31] = nBitsTotal;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Convert hash to 32-bit word array before returning
	            var hash = this._hash.toX32();

	            // Return final computed hash
	            return hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        },

	        blockSize: 1024/32
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA512('message');
	     *     var hash = CryptoJS.SHA512(wordArray);
	     */
	    C.SHA512 = Hasher._createHelper(SHA512);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA512(message, key);
	     */
	    C.HmacSHA512 = Hasher._createHmacHelper(SHA512);
	}());


	return CryptoJS.SHA512;

}));
},{"./core":31,"./x64-core":62}],61:[function(require,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"), require("./enc-base64"), require("./md5"), require("./evpkdf"), require("./cipher-core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var BlockCipher = C_lib.BlockCipher;
	    var C_algo = C.algo;

	    // Permuted Choice 1 constants
	    var PC1 = [
	        57, 49, 41, 33, 25, 17, 9,  1,
	        58, 50, 42, 34, 26, 18, 10, 2,
	        59, 51, 43, 35, 27, 19, 11, 3,
	        60, 52, 44, 36, 63, 55, 47, 39,
	        31, 23, 15, 7,  62, 54, 46, 38,
	        30, 22, 14, 6,  61, 53, 45, 37,
	        29, 21, 13, 5,  28, 20, 12, 4
	    ];

	    // Permuted Choice 2 constants
	    var PC2 = [
	        14, 17, 11, 24, 1,  5,
	        3,  28, 15, 6,  21, 10,
	        23, 19, 12, 4,  26, 8,
	        16, 7,  27, 20, 13, 2,
	        41, 52, 31, 37, 47, 55,
	        30, 40, 51, 45, 33, 48,
	        44, 49, 39, 56, 34, 53,
	        46, 42, 50, 36, 29, 32
	    ];

	    // Cumulative bit shift constants
	    var BIT_SHIFTS = [1,  2,  4,  6,  8,  10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28];

	    // SBOXes and round permutation constants
	    var SBOX_P = [
	        {
	            0x0: 0x808200,
	            0x10000000: 0x8000,
	            0x20000000: 0x808002,
	            0x30000000: 0x2,
	            0x40000000: 0x200,
	            0x50000000: 0x808202,
	            0x60000000: 0x800202,
	            0x70000000: 0x800000,
	            0x80000000: 0x202,
	            0x90000000: 0x800200,
	            0xa0000000: 0x8200,
	            0xb0000000: 0x808000,
	            0xc0000000: 0x8002,
	            0xd0000000: 0x800002,
	            0xe0000000: 0x0,
	            0xf0000000: 0x8202,
	            0x8000000: 0x0,
	            0x18000000: 0x808202,
	            0x28000000: 0x8202,
	            0x38000000: 0x8000,
	            0x48000000: 0x808200,
	            0x58000000: 0x200,
	            0x68000000: 0x808002,
	            0x78000000: 0x2,
	            0x88000000: 0x800200,
	            0x98000000: 0x8200,
	            0xa8000000: 0x808000,
	            0xb8000000: 0x800202,
	            0xc8000000: 0x800002,
	            0xd8000000: 0x8002,
	            0xe8000000: 0x202,
	            0xf8000000: 0x800000,
	            0x1: 0x8000,
	            0x10000001: 0x2,
	            0x20000001: 0x808200,
	            0x30000001: 0x800000,
	            0x40000001: 0x808002,
	            0x50000001: 0x8200,
	            0x60000001: 0x200,
	            0x70000001: 0x800202,
	            0x80000001: 0x808202,
	            0x90000001: 0x808000,
	            0xa0000001: 0x800002,
	            0xb0000001: 0x8202,
	            0xc0000001: 0x202,
	            0xd0000001: 0x800200,
	            0xe0000001: 0x8002,
	            0xf0000001: 0x0,
	            0x8000001: 0x808202,
	            0x18000001: 0x808000,
	            0x28000001: 0x800000,
	            0x38000001: 0x200,
	            0x48000001: 0x8000,
	            0x58000001: 0x800002,
	            0x68000001: 0x2,
	            0x78000001: 0x8202,
	            0x88000001: 0x8002,
	            0x98000001: 0x800202,
	            0xa8000001: 0x202,
	            0xb8000001: 0x808200,
	            0xc8000001: 0x800200,
	            0xd8000001: 0x0,
	            0xe8000001: 0x8200,
	            0xf8000001: 0x808002
	        },
	        {
	            0x0: 0x40084010,
	            0x1000000: 0x4000,
	            0x2000000: 0x80000,
	            0x3000000: 0x40080010,
	            0x4000000: 0x40000010,
	            0x5000000: 0x40084000,
	            0x6000000: 0x40004000,
	            0x7000000: 0x10,
	            0x8000000: 0x84000,
	            0x9000000: 0x40004010,
	            0xa000000: 0x40000000,
	            0xb000000: 0x84010,
	            0xc000000: 0x80010,
	            0xd000000: 0x0,
	            0xe000000: 0x4010,
	            0xf000000: 0x40080000,
	            0x800000: 0x40004000,
	            0x1800000: 0x84010,
	            0x2800000: 0x10,
	            0x3800000: 0x40004010,
	            0x4800000: 0x40084010,
	            0x5800000: 0x40000000,
	            0x6800000: 0x80000,
	            0x7800000: 0x40080010,
	            0x8800000: 0x80010,
	            0x9800000: 0x0,
	            0xa800000: 0x4000,
	            0xb800000: 0x40080000,
	            0xc800000: 0x40000010,
	            0xd800000: 0x84000,
	            0xe800000: 0x40084000,
	            0xf800000: 0x4010,
	            0x10000000: 0x0,
	            0x11000000: 0x40080010,
	            0x12000000: 0x40004010,
	            0x13000000: 0x40084000,
	            0x14000000: 0x40080000,
	            0x15000000: 0x10,
	            0x16000000: 0x84010,
	            0x17000000: 0x4000,
	            0x18000000: 0x4010,
	            0x19000000: 0x80000,
	            0x1a000000: 0x80010,
	            0x1b000000: 0x40000010,
	            0x1c000000: 0x84000,
	            0x1d000000: 0x40004000,
	            0x1e000000: 0x40000000,
	            0x1f000000: 0x40084010,
	            0x10800000: 0x84010,
	            0x11800000: 0x80000,
	            0x12800000: 0x40080000,
	            0x13800000: 0x4000,
	            0x14800000: 0x40004000,
	            0x15800000: 0x40084010,
	            0x16800000: 0x10,
	            0x17800000: 0x40000000,
	            0x18800000: 0x40084000,
	            0x19800000: 0x40000010,
	            0x1a800000: 0x40004010,
	            0x1b800000: 0x80010,
	            0x1c800000: 0x0,
	            0x1d800000: 0x4010,
	            0x1e800000: 0x40080010,
	            0x1f800000: 0x84000
	        },
	        {
	            0x0: 0x104,
	            0x100000: 0x0,
	            0x200000: 0x4000100,
	            0x300000: 0x10104,
	            0x400000: 0x10004,
	            0x500000: 0x4000004,
	            0x600000: 0x4010104,
	            0x700000: 0x4010000,
	            0x800000: 0x4000000,
	            0x900000: 0x4010100,
	            0xa00000: 0x10100,
	            0xb00000: 0x4010004,
	            0xc00000: 0x4000104,
	            0xd00000: 0x10000,
	            0xe00000: 0x4,
	            0xf00000: 0x100,
	            0x80000: 0x4010100,
	            0x180000: 0x4010004,
	            0x280000: 0x0,
	            0x380000: 0x4000100,
	            0x480000: 0x4000004,
	            0x580000: 0x10000,
	            0x680000: 0x10004,
	            0x780000: 0x104,
	            0x880000: 0x4,
	            0x980000: 0x100,
	            0xa80000: 0x4010000,
	            0xb80000: 0x10104,
	            0xc80000: 0x10100,
	            0xd80000: 0x4000104,
	            0xe80000: 0x4010104,
	            0xf80000: 0x4000000,
	            0x1000000: 0x4010100,
	            0x1100000: 0x10004,
	            0x1200000: 0x10000,
	            0x1300000: 0x4000100,
	            0x1400000: 0x100,
	            0x1500000: 0x4010104,
	            0x1600000: 0x4000004,
	            0x1700000: 0x0,
	            0x1800000: 0x4000104,
	            0x1900000: 0x4000000,
	            0x1a00000: 0x4,
	            0x1b00000: 0x10100,
	            0x1c00000: 0x4010000,
	            0x1d00000: 0x104,
	            0x1e00000: 0x10104,
	            0x1f00000: 0x4010004,
	            0x1080000: 0x4000000,
	            0x1180000: 0x104,
	            0x1280000: 0x4010100,
	            0x1380000: 0x0,
	            0x1480000: 0x10004,
	            0x1580000: 0x4000100,
	            0x1680000: 0x100,
	            0x1780000: 0x4010004,
	            0x1880000: 0x10000,
	            0x1980000: 0x4010104,
	            0x1a80000: 0x10104,
	            0x1b80000: 0x4000004,
	            0x1c80000: 0x4000104,
	            0x1d80000: 0x4010000,
	            0x1e80000: 0x4,
	            0x1f80000: 0x10100
	        },
	        {
	            0x0: 0x80401000,
	            0x10000: 0x80001040,
	            0x20000: 0x401040,
	            0x30000: 0x80400000,
	            0x40000: 0x0,
	            0x50000: 0x401000,
	            0x60000: 0x80000040,
	            0x70000: 0x400040,
	            0x80000: 0x80000000,
	            0x90000: 0x400000,
	            0xa0000: 0x40,
	            0xb0000: 0x80001000,
	            0xc0000: 0x80400040,
	            0xd0000: 0x1040,
	            0xe0000: 0x1000,
	            0xf0000: 0x80401040,
	            0x8000: 0x80001040,
	            0x18000: 0x40,
	            0x28000: 0x80400040,
	            0x38000: 0x80001000,
	            0x48000: 0x401000,
	            0x58000: 0x80401040,
	            0x68000: 0x0,
	            0x78000: 0x80400000,
	            0x88000: 0x1000,
	            0x98000: 0x80401000,
	            0xa8000: 0x400000,
	            0xb8000: 0x1040,
	            0xc8000: 0x80000000,
	            0xd8000: 0x400040,
	            0xe8000: 0x401040,
	            0xf8000: 0x80000040,
	            0x100000: 0x400040,
	            0x110000: 0x401000,
	            0x120000: 0x80000040,
	            0x130000: 0x0,
	            0x140000: 0x1040,
	            0x150000: 0x80400040,
	            0x160000: 0x80401000,
	            0x170000: 0x80001040,
	            0x180000: 0x80401040,
	            0x190000: 0x80000000,
	            0x1a0000: 0x80400000,
	            0x1b0000: 0x401040,
	            0x1c0000: 0x80001000,
	            0x1d0000: 0x400000,
	            0x1e0000: 0x40,
	            0x1f0000: 0x1000,
	            0x108000: 0x80400000,
	            0x118000: 0x80401040,
	            0x128000: 0x0,
	            0x138000: 0x401000,
	            0x148000: 0x400040,
	            0x158000: 0x80000000,
	            0x168000: 0x80001040,
	            0x178000: 0x40,
	            0x188000: 0x80000040,
	            0x198000: 0x1000,
	            0x1a8000: 0x80001000,
	            0x1b8000: 0x80400040,
	            0x1c8000: 0x1040,
	            0x1d8000: 0x80401000,
	            0x1e8000: 0x400000,
	            0x1f8000: 0x401040
	        },
	        {
	            0x0: 0x80,
	            0x1000: 0x1040000,
	            0x2000: 0x40000,
	            0x3000: 0x20000000,
	            0x4000: 0x20040080,
	            0x5000: 0x1000080,
	            0x6000: 0x21000080,
	            0x7000: 0x40080,
	            0x8000: 0x1000000,
	            0x9000: 0x20040000,
	            0xa000: 0x20000080,
	            0xb000: 0x21040080,
	            0xc000: 0x21040000,
	            0xd000: 0x0,
	            0xe000: 0x1040080,
	            0xf000: 0x21000000,
	            0x800: 0x1040080,
	            0x1800: 0x21000080,
	            0x2800: 0x80,
	            0x3800: 0x1040000,
	            0x4800: 0x40000,
	            0x5800: 0x20040080,
	            0x6800: 0x21040000,
	            0x7800: 0x20000000,
	            0x8800: 0x20040000,
	            0x9800: 0x0,
	            0xa800: 0x21040080,
	            0xb800: 0x1000080,
	            0xc800: 0x20000080,
	            0xd800: 0x21000000,
	            0xe800: 0x1000000,
	            0xf800: 0x40080,
	            0x10000: 0x40000,
	            0x11000: 0x80,
	            0x12000: 0x20000000,
	            0x13000: 0x21000080,
	            0x14000: 0x1000080,
	            0x15000: 0x21040000,
	            0x16000: 0x20040080,
	            0x17000: 0x1000000,
	            0x18000: 0x21040080,
	            0x19000: 0x21000000,
	            0x1a000: 0x1040000,
	            0x1b000: 0x20040000,
	            0x1c000: 0x40080,
	            0x1d000: 0x20000080,
	            0x1e000: 0x0,
	            0x1f000: 0x1040080,
	            0x10800: 0x21000080,
	            0x11800: 0x1000000,
	            0x12800: 0x1040000,
	            0x13800: 0x20040080,
	            0x14800: 0x20000000,
	            0x15800: 0x1040080,
	            0x16800: 0x80,
	            0x17800: 0x21040000,
	            0x18800: 0x40080,
	            0x19800: 0x21040080,
	            0x1a800: 0x0,
	            0x1b800: 0x21000000,
	            0x1c800: 0x1000080,
	            0x1d800: 0x40000,
	            0x1e800: 0x20040000,
	            0x1f800: 0x20000080
	        },
	        {
	            0x0: 0x10000008,
	            0x100: 0x2000,
	            0x200: 0x10200000,
	            0x300: 0x10202008,
	            0x400: 0x10002000,
	            0x500: 0x200000,
	            0x600: 0x200008,
	            0x700: 0x10000000,
	            0x800: 0x0,
	            0x900: 0x10002008,
	            0xa00: 0x202000,
	            0xb00: 0x8,
	            0xc00: 0x10200008,
	            0xd00: 0x202008,
	            0xe00: 0x2008,
	            0xf00: 0x10202000,
	            0x80: 0x10200000,
	            0x180: 0x10202008,
	            0x280: 0x8,
	            0x380: 0x200000,
	            0x480: 0x202008,
	            0x580: 0x10000008,
	            0x680: 0x10002000,
	            0x780: 0x2008,
	            0x880: 0x200008,
	            0x980: 0x2000,
	            0xa80: 0x10002008,
	            0xb80: 0x10200008,
	            0xc80: 0x0,
	            0xd80: 0x10202000,
	            0xe80: 0x202000,
	            0xf80: 0x10000000,
	            0x1000: 0x10002000,
	            0x1100: 0x10200008,
	            0x1200: 0x10202008,
	            0x1300: 0x2008,
	            0x1400: 0x200000,
	            0x1500: 0x10000000,
	            0x1600: 0x10000008,
	            0x1700: 0x202000,
	            0x1800: 0x202008,
	            0x1900: 0x0,
	            0x1a00: 0x8,
	            0x1b00: 0x10200000,
	            0x1c00: 0x2000,
	            0x1d00: 0x10002008,
	            0x1e00: 0x10202000,
	            0x1f00: 0x200008,
	            0x1080: 0x8,
	            0x1180: 0x202000,
	            0x1280: 0x200000,
	            0x1380: 0x10000008,
	            0x1480: 0x10002000,
	            0x1580: 0x2008,
	            0x1680: 0x10202008,
	            0x1780: 0x10200000,
	            0x1880: 0x10202000,
	            0x1980: 0x10200008,
	            0x1a80: 0x2000,
	            0x1b80: 0x202008,
	            0x1c80: 0x200008,
	            0x1d80: 0x0,
	            0x1e80: 0x10000000,
	            0x1f80: 0x10002008
	        },
	        {
	            0x0: 0x100000,
	            0x10: 0x2000401,
	            0x20: 0x400,
	            0x30: 0x100401,
	            0x40: 0x2100401,
	            0x50: 0x0,
	            0x60: 0x1,
	            0x70: 0x2100001,
	            0x80: 0x2000400,
	            0x90: 0x100001,
	            0xa0: 0x2000001,
	            0xb0: 0x2100400,
	            0xc0: 0x2100000,
	            0xd0: 0x401,
	            0xe0: 0x100400,
	            0xf0: 0x2000000,
	            0x8: 0x2100001,
	            0x18: 0x0,
	            0x28: 0x2000401,
	            0x38: 0x2100400,
	            0x48: 0x100000,
	            0x58: 0x2000001,
	            0x68: 0x2000000,
	            0x78: 0x401,
	            0x88: 0x100401,
	            0x98: 0x2000400,
	            0xa8: 0x2100000,
	            0xb8: 0x100001,
	            0xc8: 0x400,
	            0xd8: 0x2100401,
	            0xe8: 0x1,
	            0xf8: 0x100400,
	            0x100: 0x2000000,
	            0x110: 0x100000,
	            0x120: 0x2000401,
	            0x130: 0x2100001,
	            0x140: 0x100001,
	            0x150: 0x2000400,
	            0x160: 0x2100400,
	            0x170: 0x100401,
	            0x180: 0x401,
	            0x190: 0x2100401,
	            0x1a0: 0x100400,
	            0x1b0: 0x1,
	            0x1c0: 0x0,
	            0x1d0: 0x2100000,
	            0x1e0: 0x2000001,
	            0x1f0: 0x400,
	            0x108: 0x100400,
	            0x118: 0x2000401,
	            0x128: 0x2100001,
	            0x138: 0x1,
	            0x148: 0x2000000,
	            0x158: 0x100000,
	            0x168: 0x401,
	            0x178: 0x2100400,
	            0x188: 0x2000001,
	            0x198: 0x2100000,
	            0x1a8: 0x0,
	            0x1b8: 0x2100401,
	            0x1c8: 0x100401,
	            0x1d8: 0x400,
	            0x1e8: 0x2000400,
	            0x1f8: 0x100001
	        },
	        {
	            0x0: 0x8000820,
	            0x1: 0x20000,
	            0x2: 0x8000000,
	            0x3: 0x20,
	            0x4: 0x20020,
	            0x5: 0x8020820,
	            0x6: 0x8020800,
	            0x7: 0x800,
	            0x8: 0x8020000,
	            0x9: 0x8000800,
	            0xa: 0x20800,
	            0xb: 0x8020020,
	            0xc: 0x820,
	            0xd: 0x0,
	            0xe: 0x8000020,
	            0xf: 0x20820,
	            0x80000000: 0x800,
	            0x80000001: 0x8020820,
	            0x80000002: 0x8000820,
	            0x80000003: 0x8000000,
	            0x80000004: 0x8020000,
	            0x80000005: 0x20800,
	            0x80000006: 0x20820,
	            0x80000007: 0x20,
	            0x80000008: 0x8000020,
	            0x80000009: 0x820,
	            0x8000000a: 0x20020,
	            0x8000000b: 0x8020800,
	            0x8000000c: 0x0,
	            0x8000000d: 0x8020020,
	            0x8000000e: 0x8000800,
	            0x8000000f: 0x20000,
	            0x10: 0x20820,
	            0x11: 0x8020800,
	            0x12: 0x20,
	            0x13: 0x800,
	            0x14: 0x8000800,
	            0x15: 0x8000020,
	            0x16: 0x8020020,
	            0x17: 0x20000,
	            0x18: 0x0,
	            0x19: 0x20020,
	            0x1a: 0x8020000,
	            0x1b: 0x8000820,
	            0x1c: 0x8020820,
	            0x1d: 0x20800,
	            0x1e: 0x820,
	            0x1f: 0x8000000,
	            0x80000010: 0x20000,
	            0x80000011: 0x800,
	            0x80000012: 0x8020020,
	            0x80000013: 0x20820,
	            0x80000014: 0x20,
	            0x80000015: 0x8020000,
	            0x80000016: 0x8000000,
	            0x80000017: 0x8000820,
	            0x80000018: 0x8020820,
	            0x80000019: 0x8000020,
	            0x8000001a: 0x8000800,
	            0x8000001b: 0x0,
	            0x8000001c: 0x20800,
	            0x8000001d: 0x820,
	            0x8000001e: 0x20020,
	            0x8000001f: 0x8020800
	        }
	    ];

	    // Masks that select the SBOX input
	    var SBOX_MASK = [
	        0xf8000001, 0x1f800000, 0x01f80000, 0x001f8000,
	        0x0001f800, 0x00001f80, 0x000001f8, 0x8000001f
	    ];

	    /**
	     * DES block cipher algorithm.
	     */
	    var DES = C_algo.DES = BlockCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var key = this._key;
	            var keyWords = key.words;

	            // Select 56 bits according to PC1
	            var keyBits = [];
	            for (var i = 0; i < 56; i++) {
	                var keyBitPos = PC1[i] - 1;
	                keyBits[i] = (keyWords[keyBitPos >>> 5] >>> (31 - keyBitPos % 32)) & 1;
	            }

	            // Assemble 16 subkeys
	            var subKeys = this._subKeys = [];
	            for (var nSubKey = 0; nSubKey < 16; nSubKey++) {
	                // Create subkey
	                var subKey = subKeys[nSubKey] = [];

	                // Shortcut
	                var bitShift = BIT_SHIFTS[nSubKey];

	                // Select 48 bits according to PC2
	                for (var i = 0; i < 24; i++) {
	                    // Select from the left 28 key bits
	                    subKey[(i / 6) | 0] |= keyBits[((PC2[i] - 1) + bitShift) % 28] << (31 - i % 6);

	                    // Select from the right 28 key bits
	                    subKey[4 + ((i / 6) | 0)] |= keyBits[28 + (((PC2[i + 24] - 1) + bitShift) % 28)] << (31 - i % 6);
	                }

	                // Since each subkey is applied to an expanded 32-bit input,
	                // the subkey can be broken into 8 values scaled to 32-bits,
	                // which allows the key to be used without expansion
	                subKey[0] = (subKey[0] << 1) | (subKey[0] >>> 31);
	                for (var i = 1; i < 7; i++) {
	                    subKey[i] = subKey[i] >>> ((i - 1) * 4 + 3);
	                }
	                subKey[7] = (subKey[7] << 5) | (subKey[7] >>> 27);
	            }

	            // Compute inverse subkeys
	            var invSubKeys = this._invSubKeys = [];
	            for (var i = 0; i < 16; i++) {
	                invSubKeys[i] = subKeys[15 - i];
	            }
	        },

	        encryptBlock: function (M, offset) {
	            this._doCryptBlock(M, offset, this._subKeys);
	        },

	        decryptBlock: function (M, offset) {
	            this._doCryptBlock(M, offset, this._invSubKeys);
	        },

	        _doCryptBlock: function (M, offset, subKeys) {
	            // Get input
	            this._lBlock = M[offset];
	            this._rBlock = M[offset + 1];

	            // Initial permutation
	            exchangeLR.call(this, 4,  0x0f0f0f0f);
	            exchangeLR.call(this, 16, 0x0000ffff);
	            exchangeRL.call(this, 2,  0x33333333);
	            exchangeRL.call(this, 8,  0x00ff00ff);
	            exchangeLR.call(this, 1,  0x55555555);

	            // Rounds
	            for (var round = 0; round < 16; round++) {
	                // Shortcuts
	                var subKey = subKeys[round];
	                var lBlock = this._lBlock;
	                var rBlock = this._rBlock;

	                // Feistel function
	                var f = 0;
	                for (var i = 0; i < 8; i++) {
	                    f |= SBOX_P[i][((rBlock ^ subKey[i]) & SBOX_MASK[i]) >>> 0];
	                }
	                this._lBlock = rBlock;
	                this._rBlock = lBlock ^ f;
	            }

	            // Undo swap from last round
	            var t = this._lBlock;
	            this._lBlock = this._rBlock;
	            this._rBlock = t;

	            // Final permutation
	            exchangeLR.call(this, 1,  0x55555555);
	            exchangeRL.call(this, 8,  0x00ff00ff);
	            exchangeRL.call(this, 2,  0x33333333);
	            exchangeLR.call(this, 16, 0x0000ffff);
	            exchangeLR.call(this, 4,  0x0f0f0f0f);

	            // Set output
	            M[offset] = this._lBlock;
	            M[offset + 1] = this._rBlock;
	        },

	        keySize: 64/32,

	        ivSize: 64/32,

	        blockSize: 64/32
	    });

	    // Swap bits across the left and right words
	    function exchangeLR(offset, mask) {
	        var t = ((this._lBlock >>> offset) ^ this._rBlock) & mask;
	        this._rBlock ^= t;
	        this._lBlock ^= t << offset;
	    }

	    function exchangeRL(offset, mask) {
	        var t = ((this._rBlock >>> offset) ^ this._lBlock) & mask;
	        this._lBlock ^= t;
	        this._rBlock ^= t << offset;
	    }

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.DES.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.DES.decrypt(ciphertext, key, cfg);
	     */
	    C.DES = BlockCipher._createHelper(DES);

	    /**
	     * Triple-DES block cipher algorithm.
	     */
	    var TripleDES = C_algo.TripleDES = BlockCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var key = this._key;
	            var keyWords = key.words;

	            // Create DES instances
	            this._des1 = DES.createEncryptor(WordArray.create(keyWords.slice(0, 2)));
	            this._des2 = DES.createEncryptor(WordArray.create(keyWords.slice(2, 4)));
	            this._des3 = DES.createEncryptor(WordArray.create(keyWords.slice(4, 6)));
	        },

	        encryptBlock: function (M, offset) {
	            this._des1.encryptBlock(M, offset);
	            this._des2.decryptBlock(M, offset);
	            this._des3.encryptBlock(M, offset);
	        },

	        decryptBlock: function (M, offset) {
	            this._des3.decryptBlock(M, offset);
	            this._des2.encryptBlock(M, offset);
	            this._des1.decryptBlock(M, offset);
	        },

	        keySize: 192/32,

	        ivSize: 64/32,

	        blockSize: 64/32
	    });

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.TripleDES.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.TripleDES.decrypt(ciphertext, key, cfg);
	     */
	    C.TripleDES = BlockCipher._createHelper(TripleDES);
	}());


	return CryptoJS.TripleDES;

}));
},{"./cipher-core":30,"./core":31,"./enc-base64":32,"./evpkdf":34,"./md5":39}],62:[function(require,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function (undefined) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var X32WordArray = C_lib.WordArray;

	    /**
	     * x64 namespace.
	     */
	    var C_x64 = C.x64 = {};

	    /**
	     * A 64-bit word.
	     */
	    var X64Word = C_x64.Word = Base.extend({
	        /**
	         * Initializes a newly created 64-bit word.
	         *
	         * @param {number} high The high 32 bits.
	         * @param {number} low The low 32 bits.
	         *
	         * @example
	         *
	         *     var x64Word = CryptoJS.x64.Word.create(0x00010203, 0x04050607);
	         */
	        init: function (high, low) {
	            this.high = high;
	            this.low = low;
	        }

	        /**
	         * Bitwise NOTs this word.
	         *
	         * @return {X64Word} A new x64-Word object after negating.
	         *
	         * @example
	         *
	         *     var negated = x64Word.not();
	         */
	        // not: function () {
	            // var high = ~this.high;
	            // var low = ~this.low;

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Bitwise ANDs this word with the passed word.
	         *
	         * @param {X64Word} word The x64-Word to AND with this word.
	         *
	         * @return {X64Word} A new x64-Word object after ANDing.
	         *
	         * @example
	         *
	         *     var anded = x64Word.and(anotherX64Word);
	         */
	        // and: function (word) {
	            // var high = this.high & word.high;
	            // var low = this.low & word.low;

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Bitwise ORs this word with the passed word.
	         *
	         * @param {X64Word} word The x64-Word to OR with this word.
	         *
	         * @return {X64Word} A new x64-Word object after ORing.
	         *
	         * @example
	         *
	         *     var ored = x64Word.or(anotherX64Word);
	         */
	        // or: function (word) {
	            // var high = this.high | word.high;
	            // var low = this.low | word.low;

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Bitwise XORs this word with the passed word.
	         *
	         * @param {X64Word} word The x64-Word to XOR with this word.
	         *
	         * @return {X64Word} A new x64-Word object after XORing.
	         *
	         * @example
	         *
	         *     var xored = x64Word.xor(anotherX64Word);
	         */
	        // xor: function (word) {
	            // var high = this.high ^ word.high;
	            // var low = this.low ^ word.low;

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Shifts this word n bits to the left.
	         *
	         * @param {number} n The number of bits to shift.
	         *
	         * @return {X64Word} A new x64-Word object after shifting.
	         *
	         * @example
	         *
	         *     var shifted = x64Word.shiftL(25);
	         */
	        // shiftL: function (n) {
	            // if (n < 32) {
	                // var high = (this.high << n) | (this.low >>> (32 - n));
	                // var low = this.low << n;
	            // } else {
	                // var high = this.low << (n - 32);
	                // var low = 0;
	            // }

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Shifts this word n bits to the right.
	         *
	         * @param {number} n The number of bits to shift.
	         *
	         * @return {X64Word} A new x64-Word object after shifting.
	         *
	         * @example
	         *
	         *     var shifted = x64Word.shiftR(7);
	         */
	        // shiftR: function (n) {
	            // if (n < 32) {
	                // var low = (this.low >>> n) | (this.high << (32 - n));
	                // var high = this.high >>> n;
	            // } else {
	                // var low = this.high >>> (n - 32);
	                // var high = 0;
	            // }

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Rotates this word n bits to the left.
	         *
	         * @param {number} n The number of bits to rotate.
	         *
	         * @return {X64Word} A new x64-Word object after rotating.
	         *
	         * @example
	         *
	         *     var rotated = x64Word.rotL(25);
	         */
	        // rotL: function (n) {
	            // return this.shiftL(n).or(this.shiftR(64 - n));
	        // },

	        /**
	         * Rotates this word n bits to the right.
	         *
	         * @param {number} n The number of bits to rotate.
	         *
	         * @return {X64Word} A new x64-Word object after rotating.
	         *
	         * @example
	         *
	         *     var rotated = x64Word.rotR(7);
	         */
	        // rotR: function (n) {
	            // return this.shiftR(n).or(this.shiftL(64 - n));
	        // },

	        /**
	         * Adds this word with the passed word.
	         *
	         * @param {X64Word} word The x64-Word to add with this word.
	         *
	         * @return {X64Word} A new x64-Word object after adding.
	         *
	         * @example
	         *
	         *     var added = x64Word.add(anotherX64Word);
	         */
	        // add: function (word) {
	            // var low = (this.low + word.low) | 0;
	            // var carry = (low >>> 0) < (this.low >>> 0) ? 1 : 0;
	            // var high = (this.high + word.high + carry) | 0;

	            // return X64Word.create(high, low);
	        // }
	    });

	    /**
	     * An array of 64-bit words.
	     *
	     * @property {Array} words The array of CryptoJS.x64.Word objects.
	     * @property {number} sigBytes The number of significant bytes in this word array.
	     */
	    var X64WordArray = C_x64.WordArray = Base.extend({
	        /**
	         * Initializes a newly created word array.
	         *
	         * @param {Array} words (Optional) An array of CryptoJS.x64.Word objects.
	         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.x64.WordArray.create();
	         *
	         *     var wordArray = CryptoJS.x64.WordArray.create([
	         *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
	         *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
	         *     ]);
	         *
	         *     var wordArray = CryptoJS.x64.WordArray.create([
	         *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
	         *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
	         *     ], 10);
	         */
	        init: function (words, sigBytes) {
	            words = this.words = words || [];

	            if (sigBytes != undefined) {
	                this.sigBytes = sigBytes;
	            } else {
	                this.sigBytes = words.length * 8;
	            }
	        },

	        /**
	         * Converts this 64-bit word array to a 32-bit word array.
	         *
	         * @return {CryptoJS.lib.WordArray} This word array's data as a 32-bit word array.
	         *
	         * @example
	         *
	         *     var x32WordArray = x64WordArray.toX32();
	         */
	        toX32: function () {
	            // Shortcuts
	            var x64Words = this.words;
	            var x64WordsLength = x64Words.length;

	            // Convert
	            var x32Words = [];
	            for (var i = 0; i < x64WordsLength; i++) {
	                var x64Word = x64Words[i];
	                x32Words.push(x64Word.high);
	                x32Words.push(x64Word.low);
	            }

	            return X32WordArray.create(x32Words, this.sigBytes);
	        },

	        /**
	         * Creates a copy of this word array.
	         *
	         * @return {X64WordArray} The clone.
	         *
	         * @example
	         *
	         *     var clone = x64WordArray.clone();
	         */
	        clone: function () {
	            var clone = Base.clone.call(this);

	            // Clone "words" array
	            var words = clone.words = this.words.slice(0);

	            // Clone each X64Word object
	            var wordsLength = words.length;
	            for (var i = 0; i < wordsLength; i++) {
	                words[i] = words[i].clone();
	            }

	            return clone;
	        }
	    });
	}());


	return CryptoJS;

}));
},{"./core":31}],63:[function(require,module,exports){
(function (self) {
  'use strict';

  function fetchPonyfill(options) {
    var Promise = options && options.Promise || self.Promise;
    var XMLHttpRequest = options && options.XMLHttpRequest || self.XMLHttpRequest;
    var global = self;

    return (function () {
      var self = Object.create(global, {
        fetch: {
          value: undefined,
          writable: true
        }
      });

      (function(self) {
        'use strict';

        if (self.fetch) {
          return
        }

        var support = {
          searchParams: 'URLSearchParams' in self,
          iterable: 'Symbol' in self && 'iterator' in Symbol,
          blob: 'FileReader' in self && 'Blob' in self && (function() {
            try {
              new Blob()
              return true
            } catch(e) {
              return false
            }
          })(),
          formData: 'FormData' in self,
          arrayBuffer: 'ArrayBuffer' in self
        }

        if (support.arrayBuffer) {
          var viewClasses = [
            '[object Int8Array]',
            '[object Uint8Array]',
            '[object Uint8ClampedArray]',
            '[object Int16Array]',
            '[object Uint16Array]',
            '[object Int32Array]',
            '[object Uint32Array]',
            '[object Float32Array]',
            '[object Float64Array]'
          ]

          var isDataView = function(obj) {
            return obj && DataView.prototype.isPrototypeOf(obj)
          }

          var isArrayBufferView = ArrayBuffer.isView || function(obj) {
            return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
          }
        }

        function normalizeName(name) {
          if (typeof name !== 'string') {
            name = String(name)
          }
          if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
            throw new TypeError('Invalid character in header field name')
          }
          return name.toLowerCase()
        }

        function normalizeValue(value) {
          if (typeof value !== 'string') {
            value = String(value)
          }
          return value
        }

        // Build a destructive iterator for the value list
        function iteratorFor(items) {
          var iterator = {
            next: function() {
              var value = items.shift()
              return {done: value === undefined, value: value}
            }
          }

          if (support.iterable) {
            iterator[Symbol.iterator] = function() {
              return iterator
            }
          }

          return iterator
        }

        function Headers(headers) {
          this.map = {}

          if (headers instanceof Headers) {
            headers.forEach(function(value, name) {
              this.append(name, value)
            }, this)
          } else if (Array.isArray(headers)) {
            headers.forEach(function(header) {
              this.append(header[0], header[1])
            }, this)
          } else if (headers) {
            Object.getOwnPropertyNames(headers).forEach(function(name) {
              this.append(name, headers[name])
            }, this)
          }
        }

        Headers.prototype.append = function(name, value) {
          name = normalizeName(name)
          value = normalizeValue(value)
          var oldValue = this.map[name]
          this.map[name] = oldValue ? oldValue+','+value : value
        }

        Headers.prototype['delete'] = function(name) {
          delete this.map[normalizeName(name)]
        }

        Headers.prototype.get = function(name) {
          name = normalizeName(name)
          return this.has(name) ? this.map[name] : null
        }

        Headers.prototype.has = function(name) {
          return this.map.hasOwnProperty(normalizeName(name))
        }

        Headers.prototype.set = function(name, value) {
          this.map[normalizeName(name)] = normalizeValue(value)
        }

        Headers.prototype.forEach = function(callback, thisArg) {
          for (var name in this.map) {
            if (this.map.hasOwnProperty(name)) {
              callback.call(thisArg, this.map[name], name, this)
            }
          }
        }

        Headers.prototype.keys = function() {
          var items = []
          this.forEach(function(value, name) { items.push(name) })
          return iteratorFor(items)
        }

        Headers.prototype.values = function() {
          var items = []
          this.forEach(function(value) { items.push(value) })
          return iteratorFor(items)
        }

        Headers.prototype.entries = function() {
          var items = []
          this.forEach(function(value, name) { items.push([name, value]) })
          return iteratorFor(items)
        }

        if (support.iterable) {
          Headers.prototype[Symbol.iterator] = Headers.prototype.entries
        }

        function consumed(body) {
          if (body.bodyUsed) {
            return Promise.reject(new TypeError('Already read'))
          }
          body.bodyUsed = true
        }

        function fileReaderReady(reader) {
          return new Promise(function(resolve, reject) {
            reader.onload = function() {
              resolve(reader.result)
            }
            reader.onerror = function() {
              reject(reader.error)
            }
          })
        }

        function readBlobAsArrayBuffer(blob) {
          var reader = new FileReader()
          var promise = fileReaderReady(reader)
          reader.readAsArrayBuffer(blob)
          return promise
        }

        function readBlobAsText(blob) {
          var reader = new FileReader()
          var promise = fileReaderReady(reader)
          reader.readAsText(blob)
          return promise
        }

        function readArrayBufferAsText(buf) {
          var view = new Uint8Array(buf)
          var chars = new Array(view.length)

          for (var i = 0; i < view.length; i++) {
            chars[i] = String.fromCharCode(view[i])
          }
          return chars.join('')
        }

        function bufferClone(buf) {
          if (buf.slice) {
            return buf.slice(0)
          } else {
            var view = new Uint8Array(buf.byteLength)
            view.set(new Uint8Array(buf))
            return view.buffer
          }
        }

        function Body() {
          this.bodyUsed = false

          this._initBody = function(body) {
            this._bodyInit = body
            if (!body) {
              this._bodyText = ''
            } else if (typeof body === 'string') {
              this._bodyText = body
            } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
              this._bodyBlob = body
            } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
              this._bodyFormData = body
            } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
              this._bodyText = body.toString()
            } else if (support.arrayBuffer && support.blob && isDataView(body)) {
              this._bodyArrayBuffer = bufferClone(body.buffer)
              // IE 10-11 can't handle a DataView body.
              this._bodyInit = new Blob([this._bodyArrayBuffer])
            } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
              this._bodyArrayBuffer = bufferClone(body)
            } else {
              throw new Error('unsupported BodyInit type')
            }

            if (!this.headers.get('content-type')) {
              if (typeof body === 'string') {
                this.headers.set('content-type', 'text/plain;charset=UTF-8')
              } else if (this._bodyBlob && this._bodyBlob.type) {
                this.headers.set('content-type', this._bodyBlob.type)
              } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
                this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
              }
            }
          }

          if (support.blob) {
            this.blob = function() {
              var rejected = consumed(this)
              if (rejected) {
                return rejected
              }

              if (this._bodyBlob) {
                return Promise.resolve(this._bodyBlob)
              } else if (this._bodyArrayBuffer) {
                return Promise.resolve(new Blob([this._bodyArrayBuffer]))
              } else if (this._bodyFormData) {
                throw new Error('could not read FormData body as blob')
              } else {
                return Promise.resolve(new Blob([this._bodyText]))
              }
            }

            this.arrayBuffer = function() {
              if (this._bodyArrayBuffer) {
                return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
              } else {
                return this.blob().then(readBlobAsArrayBuffer)
              }
            }
          }

          this.text = function() {
            var rejected = consumed(this)
            if (rejected) {
              return rejected
            }

            if (this._bodyBlob) {
              return readBlobAsText(this._bodyBlob)
            } else if (this._bodyArrayBuffer) {
              return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
            } else if (this._bodyFormData) {
              throw new Error('could not read FormData body as text')
            } else {
              return Promise.resolve(this._bodyText)
            }
          }

          if (support.formData) {
            this.formData = function() {
              return this.text().then(decode)
            }
          }

          this.json = function() {
            return this.text().then(JSON.parse)
          }

          return this
        }

        // HTTP methods whose capitalization should be normalized
        var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

        function normalizeMethod(method) {
          var upcased = method.toUpperCase()
          return (methods.indexOf(upcased) > -1) ? upcased : method
        }

        function Request(input, options) {
          options = options || {}
          var body = options.body

          if (input instanceof Request) {
            if (input.bodyUsed) {
              throw new TypeError('Already read')
            }
            this.url = input.url
            this.credentials = input.credentials
            if (!options.headers) {
              this.headers = new Headers(input.headers)
            }
            this.method = input.method
            this.mode = input.mode
            if (!body && input._bodyInit != null) {
              body = input._bodyInit
              input.bodyUsed = true
            }
          } else {
            this.url = String(input)
          }

          this.credentials = options.credentials || this.credentials || 'omit'
          if (options.headers || !this.headers) {
            this.headers = new Headers(options.headers)
          }
          this.method = normalizeMethod(options.method || this.method || 'GET')
          this.mode = options.mode || this.mode || null
          this.referrer = null

          if ((this.method === 'GET' || this.method === 'HEAD') && body) {
            throw new TypeError('Body not allowed for GET or HEAD requests')
          }
          this._initBody(body)
        }

        Request.prototype.clone = function() {
          return new Request(this, { body: this._bodyInit })
        }

        function decode(body) {
          var form = new FormData()
          body.trim().split('&').forEach(function(bytes) {
            if (bytes) {
              var split = bytes.split('=')
              var name = split.shift().replace(/\+/g, ' ')
              var value = split.join('=').replace(/\+/g, ' ')
              form.append(decodeURIComponent(name), decodeURIComponent(value))
            }
          })
          return form
        }

        function parseHeaders(rawHeaders) {
          var headers = new Headers()
          rawHeaders.split(/\r?\n/).forEach(function(line) {
            var parts = line.split(':')
            var key = parts.shift().trim()
            if (key) {
              var value = parts.join(':').trim()
              headers.append(key, value)
            }
          })
          return headers
        }

        Body.call(Request.prototype)

        function Response(bodyInit, options) {
          if (!options) {
            options = {}
          }

          this.type = 'default'
          this.status = 'status' in options ? options.status : 200
          this.ok = this.status >= 200 && this.status < 300
          this.statusText = 'statusText' in options ? options.statusText : 'OK'
          this.headers = new Headers(options.headers)
          this.url = options.url || ''
          this._initBody(bodyInit)
        }

        Body.call(Response.prototype)

        Response.prototype.clone = function() {
          return new Response(this._bodyInit, {
            status: this.status,
            statusText: this.statusText,
            headers: new Headers(this.headers),
            url: this.url
          })
        }

        Response.error = function() {
          var response = new Response(null, {status: 0, statusText: ''})
          response.type = 'error'
          return response
        }

        var redirectStatuses = [301, 302, 303, 307, 308]

        Response.redirect = function(url, status) {
          if (redirectStatuses.indexOf(status) === -1) {
            throw new RangeError('Invalid status code')
          }

          return new Response(null, {status: status, headers: {location: url}})
        }

        self.Headers = Headers
        self.Request = Request
        self.Response = Response

        self.fetch = function(input, init) {
          return new Promise(function(resolve, reject) {
            var request = new Request(input, init)
            var xhr = new XMLHttpRequest()

            xhr.onload = function() {
              var options = {
                status: xhr.status,
                statusText: xhr.statusText,
                headers: parseHeaders(xhr.getAllResponseHeaders() || '')
              }
              options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
              var body = 'response' in xhr ? xhr.response : xhr.responseText
              resolve(new Response(body, options))
            }

            xhr.onerror = function() {
              reject(new TypeError('Network request failed'))
            }

            xhr.ontimeout = function() {
              reject(new TypeError('Network request failed'))
            }

            xhr.open(request.method, request.url, true)

            if (request.credentials === 'include') {
              xhr.withCredentials = true
            }

            if ('responseType' in xhr && support.blob) {
              xhr.responseType = 'blob'
            }

            request.headers.forEach(function(value, name) {
              xhr.setRequestHeader(name, value)
            })

            xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
          })
        }
        self.fetch.polyfill = true
      })(typeof self !== 'undefined' ? self : this);


      return {
        fetch: self.fetch,
        Headers: self.Headers,
        Request: self.Request,
        Response: self.Response
      };
    }());
  }

  if (typeof define === 'function' && define.amd) {
    define(function () {
      return fetchPonyfill;
    });
  } else if (typeof exports === 'object') {
    module.exports = fetchPonyfill;
  } else {
    self.fetchPonyfill = fetchPonyfill;
  }
}(typeof self === 'undefined' ? this : self));


},{}],64:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],65:[function(require,module,exports){
'use strict';

var replace = String.prototype.replace;
var percentTwenties = /%20/g;

module.exports = {
    'default': 'RFC3986',
    formatters: {
        RFC1738: function (value) {
            return replace.call(value, percentTwenties, '+');
        },
        RFC3986: function (value) {
            return value;
        }
    },
    RFC1738: 'RFC1738',
    RFC3986: 'RFC3986'
};

},{}],66:[function(require,module,exports){
'use strict';

var stringify = require('./stringify');
var parse = require('./parse');
var formats = require('./formats');

module.exports = {
    formats: formats,
    parse: parse,
    stringify: stringify
};

},{"./formats":65,"./parse":67,"./stringify":68}],67:[function(require,module,exports){
'use strict';

var utils = require('./utils');

var has = Object.prototype.hasOwnProperty;

var defaults = {
    allowDots: false,
    allowPrototypes: false,
    arrayLimit: 20,
    decoder: utils.decode,
    delimiter: '&',
    depth: 5,
    parameterLimit: 1000,
    plainObjects: false,
    strictNullHandling: false
};

var parseValues = function parseQueryStringValues(str, options) {
    var obj = {};
    var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;
    var limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
    var parts = cleanStr.split(options.delimiter, limit);

    for (var i = 0; i < parts.length; ++i) {
        var part = parts[i];

        var bracketEqualsPos = part.indexOf(']=');
        var pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1;

        var key, val;
        if (pos === -1) {
            key = options.decoder(part, defaults.decoder);
            val = options.strictNullHandling ? null : '';
        } else {
            key = options.decoder(part.slice(0, pos), defaults.decoder);
            val = options.decoder(part.slice(pos + 1), defaults.decoder);
        }
        if (has.call(obj, key)) {
            obj[key] = [].concat(obj[key]).concat(val);
        } else {
            obj[key] = val;
        }
    }

    return obj;
};

var parseObject = function (chain, val, options) {
    var leaf = val;

    for (var i = chain.length - 1; i >= 0; --i) {
        var obj;
        var root = chain[i];

        if (root === '[]') {
            obj = [];
            obj = obj.concat(leaf);
        } else {
            obj = options.plainObjects ? Object.create(null) : {};
            var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
            var index = parseInt(cleanRoot, 10);
            if (
                !isNaN(index)
                && root !== cleanRoot
                && String(index) === cleanRoot
                && index >= 0
                && (options.parseArrays && index <= options.arrayLimit)
            ) {
                obj = [];
                obj[index] = leaf;
            } else {
                obj[cleanRoot] = leaf;
            }
        }

        leaf = obj;
    }

    return leaf;
};

var parseKeys = function parseQueryStringKeys(givenKey, val, options) {
    if (!givenKey) {
        return;
    }

    // Transform dot notation to bracket notation
    var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

    // The regex chunks

    var brackets = /(\[[^[\]]*])/;
    var child = /(\[[^[\]]*])/g;

    // Get the parent

    var segment = brackets.exec(key);
    var parent = segment ? key.slice(0, segment.index) : key;

    // Stash the parent if it exists

    var keys = [];
    if (parent) {
        // If we aren't using plain objects, optionally prefix keys
        // that would overwrite object prototype properties
        if (!options.plainObjects && has.call(Object.prototype, parent)) {
            if (!options.allowPrototypes) {
                return;
            }
        }

        keys.push(parent);
    }

    // Loop through children appending to the array until we hit depth

    var i = 0;
    while ((segment = child.exec(key)) !== null && i < options.depth) {
        i += 1;
        if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
            if (!options.allowPrototypes) {
                return;
            }
        }
        keys.push(segment[1]);
    }

    // If there's a remainder, just add whatever is left

    if (segment) {
        keys.push('[' + key.slice(segment.index) + ']');
    }

    return parseObject(keys, val, options);
};

module.exports = function (str, opts) {
    var options = opts ? utils.assign({}, opts) : {};

    if (options.decoder !== null && options.decoder !== undefined && typeof options.decoder !== 'function') {
        throw new TypeError('Decoder has to be a function.');
    }

    options.ignoreQueryPrefix = options.ignoreQueryPrefix === true;
    options.delimiter = typeof options.delimiter === 'string' || utils.isRegExp(options.delimiter) ? options.delimiter : defaults.delimiter;
    options.depth = typeof options.depth === 'number' ? options.depth : defaults.depth;
    options.arrayLimit = typeof options.arrayLimit === 'number' ? options.arrayLimit : defaults.arrayLimit;
    options.parseArrays = options.parseArrays !== false;
    options.decoder = typeof options.decoder === 'function' ? options.decoder : defaults.decoder;
    options.allowDots = typeof options.allowDots === 'boolean' ? options.allowDots : defaults.allowDots;
    options.plainObjects = typeof options.plainObjects === 'boolean' ? options.plainObjects : defaults.plainObjects;
    options.allowPrototypes = typeof options.allowPrototypes === 'boolean' ? options.allowPrototypes : defaults.allowPrototypes;
    options.parameterLimit = typeof options.parameterLimit === 'number' ? options.parameterLimit : defaults.parameterLimit;
    options.strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;

    if (str === '' || str === null || typeof str === 'undefined') {
        return options.plainObjects ? Object.create(null) : {};
    }

    var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
    var obj = options.plainObjects ? Object.create(null) : {};

    // Iterate over the keys and setup the new object

    var keys = Object.keys(tempObj);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var newObj = parseKeys(key, tempObj[key], options);
        obj = utils.merge(obj, newObj, options);
    }

    return utils.compact(obj);
};

},{"./utils":69}],68:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var formats = require('./formats');

var arrayPrefixGenerators = {
    brackets: function brackets(prefix) { // eslint-disable-line func-name-matching
        return prefix + '[]';
    },
    indices: function indices(prefix, key) { // eslint-disable-line func-name-matching
        return prefix + '[' + key + ']';
    },
    repeat: function repeat(prefix) { // eslint-disable-line func-name-matching
        return prefix;
    }
};

var toISO = Date.prototype.toISOString;

var defaults = {
    delimiter: '&',
    encode: true,
    encoder: utils.encode,
    encodeValuesOnly: false,
    serializeDate: function serializeDate(date) { // eslint-disable-line func-name-matching
        return toISO.call(date);
    },
    skipNulls: false,
    strictNullHandling: false
};

var stringify = function stringify( // eslint-disable-line func-name-matching
    object,
    prefix,
    generateArrayPrefix,
    strictNullHandling,
    skipNulls,
    encoder,
    filter,
    sort,
    allowDots,
    serializeDate,
    formatter,
    encodeValuesOnly
) {
    var obj = object;
    if (typeof filter === 'function') {
        obj = filter(prefix, obj);
    } else if (obj instanceof Date) {
        obj = serializeDate(obj);
    } else if (obj === null) {
        if (strictNullHandling) {
            return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder) : prefix;
        }

        obj = '';
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || utils.isBuffer(obj)) {
        if (encoder) {
            var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder);
            return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder))];
        }
        return [formatter(prefix) + '=' + formatter(String(obj))];
    }

    var values = [];

    if (typeof obj === 'undefined') {
        return values;
    }

    var objKeys;
    if (Array.isArray(filter)) {
        objKeys = filter;
    } else {
        var keys = Object.keys(obj);
        objKeys = sort ? keys.sort(sort) : keys;
    }

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }

        if (Array.isArray(obj)) {
            values = values.concat(stringify(
                obj[key],
                generateArrayPrefix(prefix, key),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly
            ));
        } else {
            values = values.concat(stringify(
                obj[key],
                prefix + (allowDots ? '.' + key : '[' + key + ']'),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly
            ));
        }
    }

    return values;
};

module.exports = function (object, opts) {
    var obj = object;
    var options = opts ? utils.assign({}, opts) : {};

    if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }

    var delimiter = typeof options.delimiter === 'undefined' ? defaults.delimiter : options.delimiter;
    var strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;
    var skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : defaults.skipNulls;
    var encode = typeof options.encode === 'boolean' ? options.encode : defaults.encode;
    var encoder = typeof options.encoder === 'function' ? options.encoder : defaults.encoder;
    var sort = typeof options.sort === 'function' ? options.sort : null;
    var allowDots = typeof options.allowDots === 'undefined' ? false : options.allowDots;
    var serializeDate = typeof options.serializeDate === 'function' ? options.serializeDate : defaults.serializeDate;
    var encodeValuesOnly = typeof options.encodeValuesOnly === 'boolean' ? options.encodeValuesOnly : defaults.encodeValuesOnly;
    if (typeof options.format === 'undefined') {
        options.format = formats['default'];
    } else if (!Object.prototype.hasOwnProperty.call(formats.formatters, options.format)) {
        throw new TypeError('Unknown format option provided.');
    }
    var formatter = formats.formatters[options.format];
    var objKeys;
    var filter;

    if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
    } else if (Array.isArray(options.filter)) {
        filter = options.filter;
        objKeys = filter;
    }

    var keys = [];

    if (typeof obj !== 'object' || obj === null) {
        return '';
    }

    var arrayFormat;
    if (options.arrayFormat in arrayPrefixGenerators) {
        arrayFormat = options.arrayFormat;
    } else if ('indices' in options) {
        arrayFormat = options.indices ? 'indices' : 'repeat';
    } else {
        arrayFormat = 'indices';
    }

    var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

    if (!objKeys) {
        objKeys = Object.keys(obj);
    }

    if (sort) {
        objKeys.sort(sort);
    }

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }

        keys = keys.concat(stringify(
            obj[key],
            key,
            generateArrayPrefix,
            strictNullHandling,
            skipNulls,
            encode ? encoder : null,
            filter,
            sort,
            allowDots,
            serializeDate,
            formatter,
            encodeValuesOnly
        ));
    }

    var joined = keys.join(delimiter);
    var prefix = options.addQueryPrefix === true ? '?' : '';

    return joined.length > 0 ? prefix + joined : '';
};

},{"./formats":65,"./utils":69}],69:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty;

var hexTable = (function () {
    var array = [];
    for (var i = 0; i < 256; ++i) {
        array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
    }

    return array;
}());

var compactQueue = function compactQueue(queue) {
    var obj;

    while (queue.length) {
        var item = queue.pop();
        obj = item.obj[item.prop];

        if (Array.isArray(obj)) {
            var compacted = [];

            for (var j = 0; j < obj.length; ++j) {
                if (typeof obj[j] !== 'undefined') {
                    compacted.push(obj[j]);
                }
            }

            item.obj[item.prop] = compacted;
        }
    }

    return obj;
};

exports.arrayToObject = function arrayToObject(source, options) {
    var obj = options && options.plainObjects ? Object.create(null) : {};
    for (var i = 0; i < source.length; ++i) {
        if (typeof source[i] !== 'undefined') {
            obj[i] = source[i];
        }
    }

    return obj;
};

exports.merge = function merge(target, source, options) {
    if (!source) {
        return target;
    }

    if (typeof source !== 'object') {
        if (Array.isArray(target)) {
            target.push(source);
        } else if (typeof target === 'object') {
            if (options.plainObjects || options.allowPrototypes || !has.call(Object.prototype, source)) {
                target[source] = true;
            }
        } else {
            return [target, source];
        }

        return target;
    }

    if (typeof target !== 'object') {
        return [target].concat(source);
    }

    var mergeTarget = target;
    if (Array.isArray(target) && !Array.isArray(source)) {
        mergeTarget = exports.arrayToObject(target, options);
    }

    if (Array.isArray(target) && Array.isArray(source)) {
        source.forEach(function (item, i) {
            if (has.call(target, i)) {
                if (target[i] && typeof target[i] === 'object') {
                    target[i] = exports.merge(target[i], item, options);
                } else {
                    target.push(item);
                }
            } else {
                target[i] = item;
            }
        });
        return target;
    }

    return Object.keys(source).reduce(function (acc, key) {
        var value = source[key];

        if (has.call(acc, key)) {
            acc[key] = exports.merge(acc[key], value, options);
        } else {
            acc[key] = value;
        }
        return acc;
    }, mergeTarget);
};

exports.assign = function assignSingleSource(target, source) {
    return Object.keys(source).reduce(function (acc, key) {
        acc[key] = source[key];
        return acc;
    }, target);
};

exports.decode = function (str) {
    try {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    } catch (e) {
        return str;
    }
};

exports.encode = function encode(str) {
    // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
    // It has been adapted here for stricter adherence to RFC 3986
    if (str.length === 0) {
        return str;
    }

    var string = typeof str === 'string' ? str : String(str);

    var out = '';
    for (var i = 0; i < string.length; ++i) {
        var c = string.charCodeAt(i);

        if (
            c === 0x2D // -
            || c === 0x2E // .
            || c === 0x5F // _
            || c === 0x7E // ~
            || (c >= 0x30 && c <= 0x39) // 0-9
            || (c >= 0x41 && c <= 0x5A) // a-z
            || (c >= 0x61 && c <= 0x7A) // A-Z
        ) {
            out += string.charAt(i);
            continue;
        }

        if (c < 0x80) {
            out = out + hexTable[c];
            continue;
        }

        if (c < 0x800) {
            out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        if (c < 0xD800 || c >= 0xE000) {
            out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        i += 1;
        c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
        out += hexTable[0xF0 | (c >> 18)]
            + hexTable[0x80 | ((c >> 12) & 0x3F)]
            + hexTable[0x80 | ((c >> 6) & 0x3F)]
            + hexTable[0x80 | (c & 0x3F)];
    }

    return out;
};

exports.compact = function compact(value) {
    var queue = [{ obj: { o: value }, prop: 'o' }];
    var refs = [];

    for (var i = 0; i < queue.length; ++i) {
        var item = queue[i];
        var obj = item.obj[item.prop];

        var keys = Object.keys(obj);
        for (var j = 0; j < keys.length; ++j) {
            var key = keys[j];
            var val = obj[key];
            if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
                queue.push({ obj: obj, prop: key });
                refs.push(val);
            }
        }
    }

    return compactQueue(queue);
};

exports.isRegExp = function isRegExp(obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
};

exports.isBuffer = function isBuffer(obj) {
    if (obj === null || typeof obj === 'undefined') {
        return false;
    }

    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
};

},{}]},{},[1]);

var https = require('https')
var util = require('util')

const McdPlugin = require('@makerdao/dai-plugin-mcd')
const Maker = require('@makerdao/dai')

exports.handler = async function(event, context, callback) {
    try {
        const mcdPluginConfig = { prefetch: false }
        const maker = await Maker.create('http', {
          url: 'https://parity0.kovan.makerfoundation.com:8545',
          plugins: [
            [McdPlugin.default, mcdPluginConfig]
          ]
        })

        const savingsService = maker.service('mcd:savings')
        const yearlyRate = await savingsService.getYearlyRate()

        const systemData = maker.service('mcd:systemData')
        const systemWideDebtCeiling = await systemData.getSystemWideDebtCeiling()
        const annualBasedRate = await systemData.getAnnualBaseRate()

        message = "\n*Yearly rate*: " + yearlyRate +
                    "\n*System Wide Debt Ceiling*: " + systemWideDebtCeiling +
                    "\n*Base component of stability fee in percentage per year*: " + annualBasedRate
        notifyChat(message)

        callback(null, message)

    } catch (e) {
        console.error(e)
        callback(Error(e))
    }
}

function notifyChat(message) {

    var message = {
        "username": "MCD Parameters Watcher",
        "icon_emoji": ":mkr:",
        "text": message
    }

    var POST_OPTIONS = {
        hostname: process.env.SERVER,
        path: process.env.PATH,
        method: 'POST',
    };

    const req = https.request(POST_OPTIONS, (res) => {
        res.setEncoding('utf8')
    });

    req.on('error', (e) => {
        console.error(e.message)
    });

    req.write(util.format("%j", message));
    req.end()
}
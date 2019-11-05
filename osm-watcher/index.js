const dotenv = require('dotenv')
const Web3 = require('web3')
var https = require('https')
var util = require('util')

var web3

dotenv.config()

var POST_OPTIONS = {
    hostname: process.env.SERVER,
    path: process.env.PATH,
    method: 'POST',
};

exports.handler = async function(event, context, callback) {
    try {
        web3 = new Web3(process.env.KOVAN_RPC_URL1)
                await web3.eth.net.isListening()
                    .catch((err) => web3 = new Web3(process.env.KOVAN_RPC_URL))

        let alerts = await checkOsms()

        if (alerts.length > 0) {
            var text = "**OSM price deviation greater than threshold!** "
            alerts.forEach(alert => text = text +
                    "\n\n**OSM**: [" + alert.osm + "](" + process.env.ETHERSCAN_URL + "address/" + alert.osm + ")" +
                    "\n**Current price**: " + alert.current +
                    "\n**Next price**: " + alert.next +
                    "\n**Threshold**: " + alert.threshold + "%")
            notifyChat(text)
        }

        callback(null, alerts)

    } catch (e) {
        console.error(e)
        callback(Error(e))
    }
}

async function checkOsms() {
    let osms = JSON.parse(process.env.OSM_ADDRESSES)
    let alerts = []
    for (osm in osms) {
        var alert = await checkOsm(osms[osm])
        if (alert) {
            if (alert.alert) {
                alerts.push(alert)
            }
        }
    }
    return alerts
}


async function checkOsm(osm) {
    var isOsmStopped = await web3.eth.getStorageAt(osm, 1)
    var current = await web3.eth.getStorageAt(osm, 3)
    var next = await web3.eth.getStorageAt(osm, 4)
    var currentPrice = await web3.utils.fromWei(web3.utils.toBN(current.substring(34)), "ether")
    var nextPrice = await web3.utils.fromWei(web3.utils.toBN(next.substring(34)), "ether")
    var percentage = (currentPrice / nextPrice) * 100
    var start = 100 - parseFloat(process.env.PRICE_DEVIATION)
    var end = 100 + parseFloat(process.env.PRICE_DEVIATION)
    var alert = (percentage >= end || percentage <= start)
    console.log("OSM: " + osm + " Current price: " + currentPrice + " Next Price: " + nextPrice +
                " Percentage: " + percentage + " Alert: " + alert +
                " Start: " + start + " End: " + end)
    return {
        osm: osm,
        current: currentPrice,
        next: nextPrice,
        percentage: percentage,
        threshold: process.env.PRICE_DEVIATION,
        alert: alert
    }
}

function notifyChat(message) {

    var message = {
        "username": "OSM Watcher",
        "icon_emoji": ":warning:",
        "text": message
    }

    const req = https.request(POST_OPTIONS, (res) => {
        res.setEncoding('utf8')
    });

    req.on('error', (e) => {
        console.error(e.message)
    });

    req.write(util.format("%j", message));
    req.end()
}
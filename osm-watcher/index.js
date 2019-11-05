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

        var message = await checkOsm(process.env.OSM_ADDRESS)

        if (message) {
            console.log(message)
            await notifyChat(message)
        }

    } catch (e) {
        console.error(e)
        callback(Error(e))
    }
}


async function checkOsm(osm) {
    console.log(osm)
    var isOsmStopped = await web3.eth.getStorageAt(osm, 1)
    var current = await web3.eth.getStorageAt(osm, 3)
    var next = await web3.eth.getStorageAt(osm, 4)
    var currentPrice = await web3.utils.fromWei(web3.utils.toBN(current.substring(34)), "ether")
    var nextPrice = await web3.utils.fromWei(web3.utils.toBN(next.substring(34)), "ether")
    var percentage = (currentPrice / nextPrice) * 100
    console.log("OSM: " + osm + " Current price: " + currentPrice + " Next Price: " + nextPrice)
    if (percentage >= (100 + process.env.PRICE_DEVIATION) || percentage <= (100 - process.env.PRICE_DEVIATION)) {
        return message = {
            "username": "OSM Watcher",
            "icon_emoji":":warning:",
            "text": "**OSM price deviation greater than threshold!** " +
                    "\n**OSM**: [" + osm + "](" + process.env.ETHERSCAN_URL + "address/" + osm + ")" +
                    "\n**Current price**: " + currentPrice +
                    "\n**Next price**: " + nextPrice +
                    "\n**Threshold**: " + process.env.PRICE_DEVIATION + "%"
                }
    }
}

async function notifyChat(message) {
    return new Promise((resolve, reject) => {

        const req = https.request(POST_OPTIONS, (res) => {
            res.setEncoding('utf8');
        });

        req.on('error', (e) => {
          reject(e.message);
        });

        req.write(util.format("%j", message));
        req.end();
    });
}
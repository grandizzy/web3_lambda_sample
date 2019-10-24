const dotenv = require('dotenv')
dotenv.config()

const fs = require("fs");
var config = JSON.parse(fs.readFileSync("config.json"))
var threshold = config.threshold
var addresses = config.addresses

const Web3 = require('web3')
const web3 = new Web3(process.env.RPC_URL)


addresses.forEach(address => {
    web3.eth.getBalance(address)
        .then(
                function(result) {
                    var balance = web3.utils.fromWei(result, 'ether')
                    if (balance <= threshold) {
                        console.warn('Address ' + address + ' has balance ' + balance + " ETH which is below threshold " + threshold)
                    } else {
                        console.info('Address ' + address + ' has balance ' + balance + " ETH")
                    }
                },
                function(err) {
                    console.error(err)
                }
              )
});



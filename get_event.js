const dotenv = require('dotenv')
dotenv.config()

const Web3 = require('web3')
var web3
var chiefContract

getEvents()

async function getEvents() {

    try {
        web3 = new Web3(process.env.KOVAN_RPC_URL1)
        await web3.eth.net.isListening()
            .catch((err) => web3 = new Web3(process.env.KOVAN_RPC_URL))

        chiefContract = new web3.eth.Contract(JSON.parse(process.env.CHIEF_CONTRACT_ABI), process.env.CHIEF_CONTRACT_ADDRESS)

        var blockNumber = await web3.eth.getBlockNumber()
        var events = await chiefContract.getPastEvents("Etch", "allEvents", {
            fromBlock: blockNumber - 20000,
            toBlock: blockNumber
        })

        events.sort(function(vote1, vote2) {
                return vote1['blockNumber'] - vote2['blockNumber'];
            })
            .forEach(event => getEventDetails(event).then(vote => console.info(vote)))
    } catch (e) {
        console.error(e)
    }

}

async function getEventDetails(event) {
    var transaction = await web3.eth.getTransaction(event['transactionHash'])
    var voter_deposit = await chiefContract.methods.deposits(transaction['from']).call()
    var yay = await chiefContract.methods.slates(event['returnValues']['slate'], 0).call().catch((err) => console.debug("No corresponding yay"));
    if (yay) {
        var approvals = await chiefContract.methods.approvals(yay).call()
        var yay_approvals = web3.utils.fromWei(approvals, 'ether')
    }
    var hat = await chiefContract.methods.hat().call()
    return {
        "hat": hat,
        "voter": transaction['from'],
        "voter_deposit": web3.utils.fromWei(voter_deposit, 'ether'),
        "slate": event['returnValues']['slate'],
        "yay": yay,
        "yay_approvals": yay_approvals,
        "block": transaction['blockNumber'],
        "tx": event['transactionHash']
    }
}
const dotenv = require('dotenv')
const AWS = require('aws-sdk')
const Web3 = require('web3')
var https = require('https')
var util = require('util')

dotenv.config()

AWS.config.update({
    region: "us-west-2",
    endpoint: "http://localhost:8000"
})

const ETHERSCAN_URL = process.env.ETHERSCAN_URL

var docClient = new AWS.DynamoDB.DocumentClient()
var web3
var chiefContract
var table = "VoteBlock"

exports.handler = async function(event, context, callback) {
    try {
        await initDSChiefContract()

        let currentBlock = await web3.eth.getBlockNumber()
        let lastQueriedBlock = await getLastQueriedBlock()
        const fromBlock = lastQueriedBlock || (currentBlock - 100000)

        console.log("Query from block: " + fromBlock + " to block :" + currentBlock)

        let votes = await getEvents(fromBlock, currentBlock).then(events => getVotesFromEvents(events))

        if (votes.length > 0) {
            notifyChat(fromBlock, currentBlock, votes)
        }

        persistCurrentBlock(currentBlock)

        callback(null, votes)

    } catch (e) {
        console.error(e)
        callback(Error(e))
    }
}

async function initDSChiefContract() {
    web3 = new Web3(process.env.KOVAN_RPC_URL1)
    await web3.eth.net.isListening()
        .catch((err) => web3 = new Web3(process.env.KOVAN_RPC_URL))

    chiefContract = new web3.eth.Contract(JSON.parse(process.env.CHIEF_CONTRACT_ABI), process.env.CHIEF_CONTRACT_ADDRESS)
}

async function getEvents(fromBlock, toBlock) {
    return chiefContract.getPastEvents("Etch", "allEvents", {
        fromBlock: fromBlock,
        toBlock: toBlock
    })
}

async function getVotesFromEvents(events) {
    events.sort(function(vote1, vote2) {
        return vote1['blockNumber'] - vote2['blockNumber']
    })

    let votes = []

    for (i in events) {
        let vote = await getEventDetails(events[i])
        votes.push(vote)
    }
    return votes
}

async function getLastQueriedBlock() {
    var getParams = {
        TableName: 'VoteBlock',
        Limit: 1
    }
    let data = await docClient.scan(getParams).promise()
    if (data.Items[0]) {
        return data.Items[0]['Block']
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

function persistCurrentBlock(currentBlock) {
    var updateParams = {
        TableName: 'VoteBlock',
        Key: {
            'Id': 1
        },
        UpdateExpression: "set #Block = :block",
        ExpressionAttributeValues: {
            ":block": currentBlock
        },
        ExpressionAttributeNames: {
            "#Block": "Block"
        },
        ReturnValues: "UPDATED_NEW"
    }

    docClient.update(updateParams, function(err, data) {
        if (err) {
            console.error("Failed to persist current block")
            throw err
        } else {
            console.log("Persisted last queried block", data)
        }
    })
}

function notifyChat(fromBlock, currentBlock, votes) {

    text = "*New Votes between block " + fromBlock + " and block " + currentBlock +"*"

    votes.forEach(vote => text = text + "\n\n*Voter*: [" + vote['voter'] + "](" + ETHERSCAN_URL + "address/" + vote['voter'] + ")" +
                                        "\n *Voter Deposit*: " + vote['voter_deposit'] + " MKR" +
                                        "\n*Slate*: " + vote['slate'] +
                                        "\n*Yay*: [" + vote['yay'] + "](" + ETHERSCAN_URL + "address/" + vote['yay'] + ")" +
                                        "\n*Current yay approvals*: " + vote['yay_approvals'] + " MKR" +
                                        "\n*Current hat*: [" + vote['hat'] + "](" + ETHERSCAN_URL + "address/" + vote['hat'] + ")" +
                                        "\n*Transaction*: [" + vote['tx'] + "](" + ETHERSCAN_URL + "tx/" + vote['tx'] + ")" +
                                        "\n*Block*: [" + vote['block'] + "](" + ETHERSCAN_URL + "block/" + vote['block'] + ")")

    var message = {
        "username": "Vote watcher",
        "icon_emoji": ":warning:",
        "text": text
    }

    console.log(message)

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
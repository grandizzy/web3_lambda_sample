const dotenv = require('dotenv')
dotenv.config()

const Web3 = require('web3')
const web3 = new Web3(process.env.RPC_URL)

const oasisContract = new web3.eth.Contract(JSON.parse(process.env.OASIS_CONTRACT_ABI), process.env.OASIS_CONTRACT_ADDRESS)

oasisContract.methods.getBestOffer(process.env.BASE_TOKEN_ADDRESS, process.env.QUOTE_TOKEN_ADDRESS).call((err, result) => { console.log("Best offer: " + result) })

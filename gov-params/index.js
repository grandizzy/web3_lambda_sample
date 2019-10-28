const McdPlugin = require('@makerdao/dai-plugin-mcd')
const Maker = require('@makerdao/dai')

exports.handler = async function(event, context, callback) {
    const mcdPluginConfig = { prefetch: false }
    const maker = await Maker.create('http', {
      url: 'https://parity0.kovan.makerfoundation.com:8545',
      plugins: [
        [McdPlugin.default, mcdPluginConfig]
      ]
    })

    const savingsService = maker.service('mcd:savings')
    const yearlyRate = await savingsService.getYearlyRate()
    console.log("Yearly rate: " + yearlyRate)

    const systemData = maker.service('mcd:systemData')
    const systemWideDebtCeiling = await systemData.getSystemWideDebtCeiling()
    console.log("System Wide Debt Ceiling: " + systemWideDebtCeiling)
}
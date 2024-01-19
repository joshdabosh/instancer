const { createClient } = require('redis')

const client = createClient()

client.on('error', (err) => {
    console.error('[redis] error', err)
})

const initClient = async (uri) => {
    await client.connect({
        url: uri,
    })
}

module.exports = {
    initClient,
    client,
}

const dbclass = require('../db')
const k8sManager = require('../kubernetes')

const yaml = require('js-yaml')

const Instance = require('../models/instance')
const Challenge = require('../models/challenge')

const { instanceLifetime } = require('../config')

module.exports = async () => {
    const resultObj = await Instance.findStartedBefore(
        new Date(Date.now() - instanceLifetime * 1000)
    )

    for (instance of resultObj) {
        await k8sManager.deleteChallenge(instance)
        await Instance.delete({
            id: instance.id,
        })
    }

    console.log('[cleanup] deleted', resultObj.length, 'instances')
}

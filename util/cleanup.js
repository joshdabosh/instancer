const dbclass = require('../db')
const k8sManager = require('../kubernetes')

const yaml = require('js-yaml')

const Instance = require('../models/instance')
const Challenge = require('../models/challenge')

module.exports = async (instanceLifetime) => {
    const resultObj = await Instance.findStartedBefore(
        new Date() - instanceLifetime
    )

    for (instance of resultObj) {
        const challenge = await Challenge.findOne({
            id: instance.challenge_id,
        })

        const challengeYaml = yaml.load(challenge.yaml)

        await k8sManager.deleteChallenge(challengeYaml, instance.team_id)
        await Instance.delete({
            id: instance.id,
        })
    }

    console.log('[cleanup] deleted', resultObj.length, 'instances')
}

const express = require('express')
const { param } = require('express-validator')
const crypto = require('crypto')

const yaml = require('js-yaml')

const { verifyJwt, validateResults } = require('../middleware')

const Challenge = require('../models/challenge')
const Instance = require('../models/instance')

const k8sManager = require('../kubernetes')

const router = express.Router()

router.get('/', async (req, res) => {
    res.status(200).json(await Instance.find({}))
})

router.get(
    '/:id',
    verifyJwt,
    [param('id').isNumeric()],
    validateResults,
    async (req, res) => {
        const instance = await Instance.findOne({
            id: req.params.id,
        })

        if (!instance) {
            res.status(404).json({
                message: 'instance_not_found',
            })

            return
        }

        if (req.user.team_id !== instance.team_id) {
            res.status(403).json({
                message: 'unauthorized',
            })

            return
        }

        res.status(200).json(instance)
    }
)

router.delete(
    '/:id',
    verifyJwt,
    [param('id').isNumeric()],
    validateResults,
    async (req, res) => {
        const instance = await Instance.findOne({
            id: req.params.id,
        })

        if (!instance) {
            res.status(404).json({
                message: 'instance_not_found',
            })

            return
        }

        if (req.user.team_id !== instance.team_id) {
            res.status(403).json({
                message: 'unauthorized',
            })

            return
        }

        await Instance.delete({
            id: instance.id,
        })

        res.status(204)
    }
)

router.post(
    '/new/:challenge_id',
    verifyJwt,
    [param('challenge_id').isNumeric()],
    validateResults,
    async (req, res) => {
        // check user is on a team
        if (!req.user.team_id) {
            res.status(403).json({
                message: 'user_not_on_team',
            })

            return
        }

        // check if team already has a running instance
        // and give the details back if it exists
        const runningInstance = await Instance.findOne({
            challenge_id: req.params.challenge_id,
            team_id: req.user.team_id,
        })

        if (runningInstance) {
            res.status(409).json({
                message: 'instance_already_running',
                details: runningInstance,
            })

            return
        }

        // check if requested challenge information exists
        const challengeToLaunch = await Challenge.findOne({
            id: req.params.challenge_id,
            competition: req.user.competition_id,
        })

        if (!challengeToLaunch) {
            res.status(404).json({
                message: 'challenge_not_found',
            })

            return
        }

        let challengeYaml

        try {
            challengeYaml = yaml.load(challengeToLaunch.yaml)
        } catch (e) {
            res.status(500).json({
                message: 'invalid_challenge_yaml',
            })

            return
        }

        // assign fields needed by kubernetes manager
        challengeYaml.image_uri = challengeToLaunch.image_uri
        challengeYaml.http.hostname = `${challengeYaml.name}-${
            req.user.team_id
        }-${crypto.randomBytes(8).toString('hex')}.web.actf.co`

        // we are deploying a web challenge
        const newInstance = new Instance({
            challenge_id: challengeToLaunch.id,
            team_id: req.user.team_id,
            host: challengeYaml.http.hostname,
            status: 'starting',
        })

        try {
            await k8sManager.makeChallenge(challengeYaml, newInstance.team_id)

            await newInstance.save()
        } catch (error) {
            res.status(500).json({
                error: error.message,
            })

            return
        }

        res.status(200).json({
            message: 'success',
            details: {
                instance: challengeYaml.http.hostname,
            },
        })
    }
)

module.exports = router

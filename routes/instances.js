const express = require('express')
const { param } = require('express-validator')

const yaml = require('js-yaml')

const { verifyJwt, validateResults } = require('../middleware')

const Challenge = require('../models/challenge')
const Instance = require('../models/instance')

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

        let newInstance

        if (challengeYaml.expose) {
            // TODO: we need to generate a random port
            // to ensure that we don't overlap deployments

            // also, we have to figure out a strategy if
            // we cannot find a port (in the case most are taken, etc)

            // we are deploying a challenge for netcat
            newInstance = new Instance({
                challenge_id: challengeToLaunch.id,
                team_id: req.user.team_id,
                deployment_type: 'nc',
                subdomain: 'instancer',
                internal_port: challengeYaml.expose[0].from,
                exposed_port: 1,
            })
        } else if (challengeYaml.http) {
            // we need to generate a new subdomain

            // we are deploying a web challenge
            newInstance = new Instance({
                challenge_id: challengeToLaunch.id,
                team_id: req.user.team_id,
                deployment_type: 'http',
                subdomain: challengeYaml.http.subdomain,
                internal_port: challengeYaml.http.port,
            })
        } else {
            res.status(500).json({
                message: 'invalid_challenge_deployment',
            })

            return
        }

        await newInstance.save()

        res.status(200).json({
            message: 'launch_new_instance',
        })
    }
)

module.exports = router

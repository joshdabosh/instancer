const express = require('express')
const { param, body } = require('express-validator')
const crypto = require('crypto')

const yaml = require('js-yaml')

const {
    verifyJwt,
    validateResults,
    ratelimitedAuthRequest,
    verifyAdminJwt,
} = require('../middleware')

const Challenge = require('../models/challenge')
const Instance = require('../models/instance')

const k8sManager = require('../kubernetes')

const router = express.Router()

router.get('/', verifyAdminJwt, async (req, res) => {
    res.status(200).json(await Instance.find({}))
})

router.get(
    '/by_id/:id',
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

router.get(
    '/by_challenge/:challenge_id',
    verifyJwt,
    [param('challenge_id').isNumeric()],
    validateResults,
    async (req, res) => {
        if (!req.user.team_id) {
            res.status(403).json({
                message: 'unauthorized',
            })

            return
        }

        const instance = await Instance.findOne({
            challenge_id: req.params.challenge_id,
            team_id: req.user.team_id,
        })

        if (!instance) {
            res.status(404).json({
                message: 'instance_not_found',
            })

            return
        }

        res.status(200).json(instance)
    }
)

router.delete(
    '/by_id/:id',
    verifyJwt,
    [param('id').isNumeric()],
    validateResults,
    ratelimitedAuthRequest,
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

        try {
            await Instance.delete({
                id: instance.id,
            })

            await k8sManager.deleteChallenge(instance)
        } catch (error) {
            console.error(error)

            res.status(500).json({ error })

            return
        }

        res.status(204).send()
    }
)

router.delete(
    '/by_challenge/:challenge_id',
    verifyJwt,
    [param('challenge_id').isNumeric()],
    validateResults,
    ratelimitedAuthRequest,
    async (req, res) => {
        if (!req.user.team_id) {
            res.status(403).json({
                message: 'unauthorized',
            })

            return
        }

        const instance = await Instance.findOne({
            challenge_id: req.params.challenge_id,
            team_id: req.user.team_id,
        })

        if (!instance) {
            res.status(404).json({
                message: 'instance_not_found',
            })

            return
        }

        try {
            await Instance.delete({
                id: instance.id,
            })

            await k8sManager.deleteChallenge(instance)
        } catch (error) {
            console.error(error)

            res.status(500).json({ error })

            return
        }

        res.status(204).send()
    }
)

router.post(
    '/new',
    verifyJwt,
    [body('challenge_id').isNumeric()],
    validateResults,
    ratelimitedAuthRequest,
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
            challenge_id: req.body.challenge_id,
            team_id: req.user.team_id,
        })

        if (runningInstance) {
            res.status(409).json(runningInstance)

            return
        }

        // check if requested challenge information exists
        const challengeToLaunch = await Challenge.findOne({
            id: req.body.challenge_id,
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
        } catch (error) {
            console.error(error)

            res.status(500).json({
                message: 'invalid_challenge_yaml',
            })

            return
        }

        // assign fields needed by kubernetes manager
        const randomBytes = crypto.randomBytes(8).toString('hex')
        const namespaceName = `instancer-${challengeYaml.name}-${req.user.team_id}-${randomBytes}`

        challengeYaml.image_uri = challengeToLaunch.image_uri
        challengeYaml.http.hostname = `${namespaceName}.web.actf.co`

        try {
            // we are deploying a web challenge
            const newInstance = new Instance({
                challenge_id: challengeToLaunch.id,
                team_id: req.user.team_id,
                host: challengeYaml.http.hostname,
                namespace: namespaceName,
            })

            await k8sManager.makeChallenge(challengeYaml, newInstance)

            await newInstance.save()

            res.status(200).json(newInstance)
        } catch (error) {
            console.error(error)

            // something failed, clean up after ourselves in the cluster
            await k8sManager.deleteChallenge(challengeYaml, req.user.team_id)

            res.status(500).json({ error })

            return
        }
    }
)

router.patch(
    '/renew/',
    verifyJwt,
    [body('id').isNumeric()],
    validateResults,
    ratelimitedAuthRequest,
    async (req, res) => {
        if (!req.user.team_id) {
            res.status(403).json({
                message: 'user_not_on_team',
            })

            return
        }

        const runningInstance = await Instance.findOne({
            challenge_id: req.body.id,
            team_id: req.user.team_id,
        })

        runningInstance.updated = new Date()

        try {
            await runningInstance.save()
        } catch (error) {
            console.error(error)

            res.status(500).json({ error })

            return
        }

        res.status(204).send()
    }
)

module.exports = router

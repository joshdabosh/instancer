const express = require('express')

const { verifyAdminJwt, validateResults } = require('../middleware')

const { param, body } = require('express-validator')

const Challenge = require('../models/challenge')

const router = express.Router()

router.get('/', verifyAdminJwt, async (req, res) => {
    if (!req.user.admin) {
        res.status(403).json({
            message: 'unauthorized',
        })
    }

    const result = await Challenge.find({})

    res.status(200).json(result)
})

router.get(
    '/:id',
    verifyAdminJwt,
    [param('id').isNumeric()],
    validateResults,
    async (req, res) => {
        const result = await Challenge.findOne({
            id: req.params.id,
        })

        res.status(200).json(result)
    }
)

router.put(
    '/:id',
    verifyAdminJwt,
    [
        param('id').isNumeric(),
        body('competition').isNumeric(),
        body('image_uri').isString(),
        body('yaml').isString(),
    ],
    validateResults,
    async (req, res) => {
        const result = await Challenge.findOne({
            id: req.params.id,
        })

        if (!result) {
            res.status(404).json({
                message: 'challenge_not_found',
            })

            return
        }

        result.competition = req.body.competition
        result.image_uri = req.body.image_uri
        result.yaml = req.body.yaml

        try {
            await result.save()
            res.status(200).json(result)
        } catch (e) {
            res.status(400).json({
                message: 'invalid_values',
            })
        }
    }
)

router.delete(
    '/:id',
    verifyAdminJwt,
    [param('id').isNumeric()],
    validateResults,
    async (req, res) => {
        await Challenge.delete({
            id: req.params.id,
        })

        res.status(204)
    }
)

router.post(
    '/new',
    verifyAdminJwt,
    [
        body('competition').isNumeric(),
        body('image_uri').isString(),
        body('yaml').isString(),
    ],
    validateResults,
    async (req, res) => {
        const challenge = new Challenge({
            competition: req.body.competition,
            image_uri: req.body.image_uri,
            yaml: req.body.yaml,
        })

        await challenge.save()

        res.status(201).json({
            message: 'success',
        })
    }
)

module.exports = router

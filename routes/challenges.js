const express = require('express')
const passport = require('passport')

const verifyJwt = require('../verify-jwt')

const { param, body, validationResult } = require('express-validator')

const Challenge = require('../models/challenge')

const router = express.Router()

router.get('/', verifyJwt, async (req, res) => {
    if (!req.user.admin) {
        res.status(403).json({
            message: "unauthorized"
        })
    }
    
    const result = await Challenge.find({})

    res.status(200).json(result)
})

router.get('/:id', verifyJwt, [param('id').isNumeric()], async (req, res) => {
    const requestOk = validationResult(req)

    if (!requestOk.isEmpty()) {
        res.status(400).json({
            message: 'invalid_values',
            fields: requestOk.array(),
        })

        return
    }

    const result = await Challenge.findOne({
        id: req.params.id,
    })

    res.status(200).json(result)
})

router.patch(
    '/:id',
    verifyJwt,
    [
        param('id').isNumeric(),
        body('competition').isNumeric(),
        body('image_uri').isString(),
        body('yaml').isString(),
    ],
    async (req, res) => {
        const requestOk = validationResult(req)

        if (!requestOk.isEmpty()) {
            res.status(400).json({
                message: 'invalid_values',
                fields: requestOk.array(),
            })

            return
        }

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

router.delete('/:id', verifyJwt, [param('id').isNumeric()], async (req, res) => {
    const requestOk = validationResult(req)

    if (!requestOk.isEmpty()) {
        res.status(400).json({
            message: 'invalid_values',
            fields: requestOk.array(),
        })

        return
    }

    await Challenge.delete({
        id: req.params.id,
    })

    res.status(200).json({ message: 'success' })
})

router.post(
    '/new',
    verifyJwt,
    [
        body('competition').isNumeric(),
        body('image_uri').isString(),
        body('yaml').isString(),
    ],
    async (req, res) => {
        const requestOk = validationResult(req)

        if (!requestOk.isEmpty()) {
            res.status(400).json({
                message: 'invalid_values',
                fields: requestOk.array(),
            })

            return
        }

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

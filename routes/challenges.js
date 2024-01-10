const express = require("express");

const { param, body, validationResult } = require("express-validator")

const Challenge = require("../models/challenge")

const router = express.Router();

router.get("/", async (req, res) => {
    const result = await Challenge.find({})

    res.status(200).json(result)
})

router.get("/:id", 
    [
        param("id").isNumeric()
    ],
    async (req, res) => {
        const requestOk = validationResult(req)

        if (!requestOk.isEmpty()) {
            res.status(200).json({
                message: "invalid_values",
                fields: requestOk.array()
            })

            return
        }
        
        const result = await Challenge.findOne({
            id: req.params.id
        })

        res.status(200).json(result)
    }
);

router.delete("/:id", 
    [
        param("id").isNumeric()
    ],
    async (req, res) => {
        const requestOk = validationResult(req)

        if (!requestOk.isEmpty()) {
            res.status(200).json({
                message: "invalid_values",
                fields: requestOk.array()
            })

            return
        }

        await Challenge.delete({
            id: req.params.id
        })

        res.status(200).json({ message:"success" })
    }
);

router.post("/new",
    [
        body("competition").isNumeric(),
        body("image_uri").isString(),
        body("yaml").isString()
    ],
    async (req, res) => {
        const requestOk = validationResult(req)

        if (!requestOk.isEmpty()) {
            res.status(200).json({
                message: "invalid_values",
                fields: requestOk.array()
            })

            return
        }

        res.status(200).json({
            message:"add_new_challenge_manifest"
        })
    }
);



module.exports = router;
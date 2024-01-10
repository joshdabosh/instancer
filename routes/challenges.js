const express = require("express");

const Challenge = require("../models/challenge")

const router = express.Router();

router.get("/", async (req, res) => {
    const result = await Challenge.find({})

    res.status(200).json(result)
});

router.get("/:id", async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
        res.status(200).json(null)
        return;
    }

    const result = await Challenge.findOne({
        id: req.params.id
    })

    res.status(200).json(result)
});

router.delete("/:id", async (req, res) => {
    res.status(200).json({
        message:"delete_specific_challenge"
    })
});

router.post("/new", async (req, res) => {
    res.status(200).json({
        message:"add_new_challenge_manifest"
    })
});



module.exports = router;
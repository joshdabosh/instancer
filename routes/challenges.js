const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({
        message:"list_of_all_challenges"
    })
});

router.get("/:id", async (req, res) => {
    res.status(200).json({
        message:"view_specific_challenge"
    })
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
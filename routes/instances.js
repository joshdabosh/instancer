const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({
        message:"list_of_all_instances"
    })
});

router.get("/:id", async (req, res) => {
    res.status(200).json({
        message:"view_specific_instance"
    })
});

router.delete("/:id", async (req, res) => {
    res.status(200).json({
        message:"delete_specific_instance"
    })
});



module.exports = router;
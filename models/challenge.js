const Model = require("./model");

class Challenge extends Model {
    static tableName = "challenges"

    static get properties() {
        return {
            ...super.properties,
            competition: {
                valid: (competition) => typeof competition === "number",
                required: true  
            },
            image_uri: {
                valid: (image_uri) => typeof image_uri === "string",
                required: true
            },
            yaml: {
                valid: (yaml) => typeof yaml === "string",
                required: true
            }
        };
    }
}

module.exports = Challenge
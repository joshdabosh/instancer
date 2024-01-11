const Model = require('./model')

class Instance extends Model {
    static tableName = 'instances'

    static get properties() {
        return {
            ...super.properties,
            challenge_id: {
                valid: (challenge_id) => typeof challenge_id === 'number',
                required: true,
            },
            team_id: {
                valid: (team_id) => typeof team_id === 'number',
                required: true,
            },
            deployment_type: {
                valid: (deployment_type) =>
                    deployment_type === 'http' || deployment_type === 'nc',
                required: true,
            },
            subdomain: {
                valid: (host) => typeof host === 'string',
                required: true,
            },
            internal_port: {
                valid: (port) => typeof port === 'number',
                required: true
            },
            exposed_port: {
                valid: (port) => typeof port === 'number',
            },
        }
    }
}

module.exports = Instance

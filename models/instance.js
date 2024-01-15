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
            host: {
                valid: (host) => typeof host === 'string',
                required: true,
            },
            status: {
                valid: (status) =>
                    typeof status === 'string' &&
                    (status === 'starting' ||
                        status === 'running' ||
                        status === 'stopping' ||
                        status === 'stopped'),
            },
        }
    }
}

module.exports = Instance

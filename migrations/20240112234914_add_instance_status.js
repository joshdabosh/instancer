/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('instances', (t) => {
        t.dropColumn('internal_port')
        t.dropColumn('deployment_type')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.table('instances', (t) => {
        t.dropColumn('status')
    })
};

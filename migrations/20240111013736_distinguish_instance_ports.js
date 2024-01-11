/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('instances', t => {
        t.dropColumn('port')
        t.integer('exposed_port')
        t.integer('internal_port')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.table('instances', t => {
        t.dropColumn('exposed_port')
        t.dropColumn('internal_port')
        t.integer('port')
    })
};

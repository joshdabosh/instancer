/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable("instances", (t) => {
        t.increments("id").unsigned().primary();
        t.timestamp("created").defaultTo(knex.fn.now());
        t.timestamp("updated").defaultTo(knex.fn.now());
        t.integer("challenge_id").unsigned();
        t.integer("team_id").unsigned();
        t.text("deployment_type");
        t.text("subdomain");
        t.integer("port").unsigned();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable("challenges")
};

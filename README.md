# instancer

`Instancer` is a simple API to provision and deploy containerized web-based CTF challenges on a per-team basis.

`Instancer` requires authentication to both launch instances and create challenges for deployments. In [routes/auth.js](routes/auth.js), this is implemented according to the [ctfjs](https://github.com/blairsec/ctfjs) `/self` route, but it can be modified as necessary, as long as the contest route returns the user and team id, and whether the user should have administrative privileges or not.

Token-bucket ratelimiting is also supported using a Redis store, with configurable settings through environment variables.

Additionally, `instancer` automatically terminates launched instances that live past a configurable amount of time, saving resources when unused.

## Background

Certain capture-the-flag challenges require getting privilege escalation. For native applications, solutions such as [redpwn/jail](https://github.com/redpwn/jail/) exist to provide secure and isolated sandboxes for competitors. However, it is not usable for web challenges.

`Instancer` fills this gap, and allows teams to provision web challenges individually.

For example, I wrote a challenge named [filestore](https://hackmd.io/@Solderet/AngstromCTF2023#Filestore---Web) for ångstromCTF 2023. As it was intended to require a bit of bruteforce as well as remote privilege escalation, it would have benefited greatly from running as an instanced challenge.

## Environment variables

The following environment variables are required:

| Name              | Description                                                                      | Required? |
| ----------------- | -------------------------------------------------------------------------------- | --------- |
| DATABASE_URI      | URI to the database to store instance and challenge information                  | ✅        |
| PORT              | Port to run the server on                                                        | ✅        |
| JWT_SECRET        | Secret to sign JWTs with                                                         | ✅        |
| GCP_PROJECT_ID    | Google Cloud project id                                                          | ✅        |
| GCP_LOCATION      | Google Cloud location to deploy challenges on                                    | ✅        |
| GCP_CLUSTER_NAME  | Google Cloud cluster name                                                        | ✅        |
| INSTANCE_LIFETIME | The length of time an instance will stay alive after being provisioned (seconds) | ✅        |
| CLEANUP_INTERVAL  | How often the cleanup utility runs to purge instances (seconds)                  | ✅        |
| ORACLE_URL        | Competition platform route to authenticate a user token                          | ✅        |
| REDIS_URI         | Ratelimit - URI to the Redis database                                            |           |
| RL_TOKEN_CAP      | Ratelimit - capacity of a token bucket                                           |           |
| RL_TOKEN_ADD      | Ratelimit - number of tokens to add to a bucket every minute                     |           |

## Deployment

`Instancer` is meant to be deployed on GCP as a Cloud Run instance.

First, build and push the instance to Artifact Registry. Then, create an IAM role with Cluster Admin permissions. Finally, run `instancer` with the appropriate IAM role.

Additionally, if you want to deploy a Redis instance on the same cloud, you can use [this guide](https://cloud.google.com/memorystore/docs/redis/connect-redis-instance-cloud-run) to set it up.

## Models

### Challenge

A Challenge object contains information about the deployment details of a CTF challenge.

| **field**   | **type** | **description**                                     |
| ----------- | -------- | --------------------------------------------------- |
| competition | number   | id of the competition that the challenge belongs to |
| image_uri   | string   | uri to the Docker image to deploy                   |
| yaml        | string   | additional deployment configurations                |
| id          | id       | id of the challenge information                     |
| created     | Date     | creation time                                       |
| updated     | Date     | last updated time                                   |

### Instance

An Instance object contains information about a specific deployment of a Challenge.

| **field**    | **type** | **description**                                                                       |
| ------------ | -------- | ------------------------------------------------------------------------------------- |
| challenge_id | number   | id of the associated deployed challenge                                               |
| team_id      | number   | id of the team that launched the instance                                             |
| host         | string   | public-facing web endpoint to access the deployed challenge                           |
| status       | string   | the status of the underlying kubernetes deployment                                    |
| created      | Date     | creation time                                                                         |
| updated      | Date     | last updated time. this is used to determine if an instance should be auto-terminated |

## Routes

There are three main services:

-   [auth](#auth)
-   [challenges](#challenges)
-   [instances](#instances)

A single lock (🔒) means that user-level authentication is required to access the route.
A double lock (🔒🔒) means that admin-level authentication is required to access the route.

## auth

### Create instancer auth token

`POST /auth/`

##### Request Body

| **name** | **type** | **required** | **notes**             |
| -------- | -------- | ------------ | --------------------- |
| token    | string   | yes          | must be a CTFjs token |

##### Response Body

| **code** | **description**   | **content**                                                         |
| -------- | ----------------- | ------------------------------------------------------------------- |
| 200      | authenticated     | JWT with fields `{"admin", "user_id", "team_id", "competition_id"}` |
| 403      | not authenticated | none                                                                |

## challenges

### Get list of all challenges 🔒🔒

Requires admin authentication.

`GET /challenges/`

##### Response Body

| **code** | **description**    | **content**                              |
| -------- | ------------------ | ---------------------------------------- |
| 200      | list of challenges | list containing [challenges](#challenge) |

### Get a challenge by ID 🔒🔒

Requires admin authentication.

`GET /challenges/:id`

##### Response Body

| **code** | **description**        | **content**               |
| -------- | ---------------------- | ------------------------- |
| 200      | challenge id found     | a [challenge](#challenge) |
| 404      | challenge id not found | none                      |

### Update a challenge by ID 🔒🔒

Requires admin authentication.

`PUT /challenges/:id`

| **name**    | **type** | **required** | **notes**                              |
| ----------- | -------- | ------------ | -------------------------------------- |
| competition | number   | yes          | competition id                         |
| image_uri   | string   | yes          | uri to where challenge image is stored |
| yaml        | string   | yes          | challenge manifest yaml                |

##### Response Body

| **code** | **description**     | **content**                       |
| -------- | ------------------- | --------------------------------- |
| 200      | challenge updated   | saved [challenge](#challenge)     |
| 400      | invalid values      | {"message":"invalid_values"}      |
| 404      | challenge not found | {"message":"challenge_not_found"} |

### Delete a challenge by ID 🔒🔒

Requires admin authentication.

`DELETE /challenges/:id`

##### Response Body

| **code** | **description**                  | **content** |
| -------- | -------------------------------- | ----------- |
| 204      | challenge deleted, if it existed | none        |

### Create a new challenge 🔒🔒

Requires admin authentication.

`POST /challenges/new`

##### Request Body

| **name**    | **type** | **required** | **notes**                              |
| ----------- | -------- | ------------ | -------------------------------------- |
| competition | number   | yes          | competition id                         |
| image_uri   | string   | yes          | uri to where challenge image is stored |
| yaml        | string   | yes          | challenge manifest yaml                |

##### Response Body

| **code** | **description**      | **content**                     |
| -------- | -------------------- | ------------------------------- |
| 201      | created successfully | the new [challenge](#challenge) |
| 400      | invalid values       | {"message":"invalid_values"}    |

## instances

### Get all running instances 🔒🔒

Requires admin authentication.

`GET /instances`

##### Response Body

| **code** | **description**       | **content**                            |
| -------- | --------------------- | -------------------------------------- |
| 200      | list of all instances | list containing [instances](#instance) |

### Get an instance by id 🔒

Requires user authentication.

`GET /instances/by_id/:id`

##### Response Body

| **code** | **description** | **content**              |
| -------- | --------------- | ------------------------ |
| 200      | an instance     | an [instance](#instance) |

### Get an instance by challenge id 🔒

Requires user authentication. Gets an instance for a challenge belonging to a team.

`GET /instances/by_challenge/:challenge_id`

##### Response Body

| **code** | **description** | **content**              |
| -------- | --------------- | ------------------------ |
| 200      | an instance     | an [instance](#instance) |

### Delete instance by id 🔒

Requires user authentication. The user's `team_id` must be the same as the instance's owner team.

`DELETE /instances/:id`

##### Response Body

| **code** | **description**      | **content**                      |
| -------- | -------------------- | -------------------------------- |
| 204      | successfully deleted | none                             |
| 403      | unauthorized         | {"message":"unauthorized"}       |
| 404      | instance not found   | {"message":"instance_not_found"} |

### Delete instance by challenge id 🔒

Requires user authentication. It will delete a team's instance corresponding to a challenge.

`DELETE /instances/by_challenge/:challenge_id`

##### Response Body

| **code** | **description**      | **content**                      |
| -------- | -------------------- | -------------------------------- |
| 204      | successfully deleted | none                             |
| 403      | unauthorized         | {"message":"unauthorized"}       |
| 404      | instance not found   | {"message":"instance_not_found"} |

### Create new instance 🔒

Requires user authentication.

`POST /instances/new`

##### Request Body

| **name**     | **type** | **required** | **notes**                              |
| ------------ | -------- | ------------ | -------------------------------------- |
| challenge_id | number   | yes          | challenge id to create an instance for |

##### Response Body

| **code** | **description**                                | **content**                                                  |
| -------- | ---------------------------------------------- | ------------------------------------------------------------ |
| 200      | successfully created                           | the running [instance](#instance)                            |
| 403      | unauthorized                                   | {"message":"user_not_on_team"} or {"message":"unauthorized"} |
| 404      | challenge id not found                         | {"message":"challenge_not_found"}                            |
| 409      | challenge instance for team is already running | the running [instance](#instance)                            |

### Renew an instance 🔒

Requires user authentication. The user's `team_id` must be the same as the instance's owner team.

Renewing an instance resets its lifespan.

`PATCH /instances/renew`

##### Request Body

| **name** | **type** | **required** | **notes**                   |
| -------- | -------- | ------------ | --------------------------- |
| id       | number   | yes          | id of the instance to renew |

##### Response Body

| **code** | **description**      | **content**                                                  |
| -------- | -------------------- | ------------------------------------------------------------ |
| 204      | successfully renewed | none                                                         |
| 403      | unauthorized         | {"message":"user_not_on_team"} or {"message":"unauthorized"} |

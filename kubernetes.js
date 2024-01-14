const googleAuth = require('google-auth-library').auth

const k8s = require('@kubernetes/client-node')
const { ClusterManagerClient } = require('@google-cloud/container')


class K8sManager {
    constructor(projectId, location, clusterName) {
        this.gcpProjectId = projectId
        this.gcpLocation = location
        this.clusterName = clusterName
    }

    async initKubeConfig() {
        const clusterManager = new ClusterManagerClient({ authClient: googleAuth })
        const [cluster] = await clusterManager.getCluster({
            name: `projects/${this.gcpProjectId}/locations/${this.gcpLocation}/clusters/${this.clusterName}`,
        })
        const kc = new k8s.KubeConfig()
        kc.addCluster({
            name: 'ctf',
            caData: cluster.masterAuth.clusterCaCertificate,
            server: `https://${cluster.endpoint}`,
        })
        kc.addUser({ name: 'ctf', token: await googleAuth.getAccessToken() })
        kc.addContext({ name: 'ctf', cluster: 'ctf', user: 'ctf' })
        kc.setCurrentContext('ctf')

        this.kc = kc
    }

    static configToContainer(challenge, containerConfig) {
        const kubeProps = containerConfig.kube;

        return {
            name: `${challenge.name}-${containerConfig.name}`,
            image: `${challenge.image_uri}:latest`,
            env: kubeProps.env,
            ports: kubeProps.ports,
            security_context: kubeProps.securityContext,
            resources: kubeProps.resources ?? {
                limits: {
                    cpu: "500m",
                    memory: "512Mi"
                },
                requests: {
                    cpu: "50m",
                    memory: "64Mi"
                }
            }
        }
    }

    async makeChallenge(challenge, teamId) {
        const namespaceName = `instancer-${challenge.name}-${teamId}`

        const coreApi = this.kc.makeApiClient(k8s.CoreV1Api)
        const appsApi = this.kc.makeApiClient(k8s.AppsV1Api)

        // check to make sure namespace does not exist already
        try {
            await coreApi.readNamespace(namespaceName)

            return {
                message: "instance_namespace_already_exists"
            }
        } catch (error) {
            if (error.statusCode != 404) {
                throw error
            }
        }

        const createNamespaceRes = await coreApi.createNamespace({
            metadata: {
                name: namespaceName
            }
        })

        // create deployment for challenge
        const deploymentName = `${namespaceName}-deploy`

        const namespacedDeploymentRes = await appsApi.listNamespacedDeployment(namespaceName)

        for (const deployment of namespacedDeploymentRes.body.items) {
            if (deployment.metadata?.name === deploymentName) {
                return {
                    message: "instance_deployment_already_exists"
                }
            }
        }

        const deploymentObject = {
            metadata: {
                name: deploymentName,
                labels: {
                    'chall-name': challenge.name
                }
            },
            spec: {
                selector: {
                    matchLabels: {
                        'chall-name': challenge.name
                    }
                },
                replicas: challenge.replicas ?? 1,
                template: {
                    metadata: {
                        labels: {
                            'chall-name': challenge.name,
                        }
                    },
                    spec: {
                        enableServiceLinks: false,
                        automount_service_account_token: false,
                        containers: challenge.containers?.map(c => 
                            this.constructor.configToContainer(challenge, c)
                        )
                    }
                }
            }
        }

        await appsApi.createNamespacedDeployment(namespaceName, deploymentObject)
        // console.log(deploymentObject)

        const util = require('util')
        console.log(util.inspect(deploymentObject, false, null, true /* enable colors */))

    }
}

module.exports = K8sManager
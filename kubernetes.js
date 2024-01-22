const googleAuth = require('google-auth-library').auth

const k8s = require('@kubernetes/client-node')
const { ClusterManagerClient } = require('@google-cloud/container')

const INSTANCER_CONFIG = require('./config')

class K8sManager {
    constructor() {
        this.gcpProjectId = INSTANCER_CONFIG.gcpProjectId
        this.gcpLocation = INSTANCER_CONFIG.gcpLocation
        this.clusterName = INSTANCER_CONFIG.gcpClusterName
    }

    async initKubeConfig() {
        const clusterManager = new ClusterManagerClient({
            authClient: googleAuth,
        })

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

        const coreApi = kc.makeApiClient(k8s.CoreV1Api)
        const appsApi = kc.makeApiClient(k8s.AppsV1Api)
        const networkingApi = kc.makeApiClient(k8s.NetworkingV1Api)

        Object.assign(this, {
            kc,
            coreApi,
            appsApi,
            networkingApi,
        })
    }

    static configToContainer(challenge, containerConfig) {
        const kubeProps = containerConfig.kube

        return {
            name: `${challenge.name}-${containerConfig.name}`,
            image: `${challenge.image_uri}:latest`,
            env: kubeProps.env,
            ports: kubeProps.ports,
            securityContext: kubeProps.securityContext ?? false,
            resources: kubeProps.resources ?? {
                limits: {
                    cpu: '500m',
                    memory: '512Mi',
                },
                requests: {
                    cpu: '50m',
                    memory: '64Mi',
                },
            },
        }
    }

    async makeNamespace(namespaceName) {
        try {
            await this.coreApi.readNamespace(namespaceName)

            throw {
                message: 'namespace_already_exists',
            }
        } catch (error) {
            if (error.statusCode != 404) {
                throw error
            }
        }

        await this.coreApi.createNamespace({
            metadata: {
                name: namespaceName,
            },
        })
    }

    async deleteNamespace(namespaceName) {
        try {
            await this.coreApi.deleteNamespace(namespaceName)
        } catch (error) {
            if (error.statusCode != 404) {
                throw error
            }
        }
    }

    async makeDeployment(challenge, names) {
        const namespacedDeploymentRes =
            await this.appsApi.listNamespacedDeployment(names.namespaceName)

        for (const deployment of namespacedDeploymentRes.body.items) {
            if (deployment.metadata?.name === names.deploymentName) {
                throw {
                    message: 'instance_deployment_already_exists',
                }
            }
        }

        const deploymentObject = {
            metadata: {
                name: names.deploymentName,
                labels: {
                    'chall-name': challenge.name,
                },
            },
            spec: {
                selector: {
                    matchLabels: {
                        'chall-name': challenge.name,
                    },
                },
                replicas: challenge.replicas ?? 1,
                template: {
                    metadata: {
                        labels: {
                            'chall-name': challenge.name,
                        },
                    },
                    spec: {
                        enableServiceLinks: false,
                        automountServiceAccountToken: false,
                        containers: challenge.containers?.map((c) =>
                            this.constructor.configToContainer(challenge, c)
                        ),
                    },
                },
            },
        }

        await this.appsApi.createNamespacedDeployment(
            names.namespaceName,
            deploymentObject
        )
    }

    async makeService(challenge, names) {
        const serviceObject = {
            metadata: {
                name: names.serviceName,
                labels: {
                    'chall-name': challenge.name,
                },
            },
            spec: {
                selector: {
                    'chall-name': challenge.name,
                },
                ports: [
                    {
                        port: challenge.http.port,
                        targetPort: challenge.http.port,
                    },
                ],
                type: 'ClusterIP',
            },
        }

        await this.coreApi.createNamespacedService(
            names.namespaceName,
            serviceObject
        )
    }

    async makeIngress(challenge, names) {
        const ingressObject = {
            metadata: {
                name: names.ingressName,
                annotations: {
                    'cert-manager.io/cluster-issuer': 'letsencrypt',
                },
            },
            spec: {
                ingressClassName: 'nginx',
                tls: [
                    {
                        hosts: [challenge.http.hostname],
                    },
                ],
                rules: [
                    {
                        host: challenge.http.hostname,
                        http: {
                            paths: [
                                {
                                    path: '/',
                                    pathType: 'Prefix',
                                    backend: {
                                        service: {
                                            name: names.serviceName,
                                            port: {
                                                number: challenge.http.port,
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        }

        await this.networkingApi.createNamespacedIngress(
            names.namespaceName,
            ingressObject
        )
    }

    getNames(instanceDetails) {
        const namespaceName = instanceDetails.namespace
        const deploymentName = `${namespaceName}-deploy`
        const serviceName = `${namespaceName}-service`
        const ingressName = `${namespaceName}-ingress`

        return {
            namespaceName,
            deploymentName,
            serviceName,
            ingressName,
        }
    }

    async makeChallenge(challenge, instanceDetails) {
        if (!this.kc) {
            await this.initKubeConfig()
        }

        const instanceNames = this.getNames(instanceDetails)

        await this.makeNamespace(instanceNames.namespaceName)

        await this.makeDeployment(challenge, instanceNames)

        await this.makeService(challenge, instanceNames)

        await this.makeIngress(challenge, instanceNames)
    }

    async deleteChallenge(instance) {
        if (!this.kc) {
            await this.initKubeConfig()
        }

        await this.deleteNamespace(instance.namespace)
    }
}

module.exports = new K8sManager()

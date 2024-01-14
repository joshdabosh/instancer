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
            securityContext: kubeProps.securityContext ?? false,
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
        const networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api)

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

        const serviceSpecObject = {
            selector: {
                'chall-name': challenge.name
            }
        }

        if (challenge.expose) {
            // only support 1 port mapping currently
            const fromPort = challenge.expose[0].from
            const toPort = challenge.expose[0].to

            serviceSpecObject.ports = [
                {
                    port: fromPort,
                    nodePort: toPort,
                    targetPort: fromPort
                }
            ]

            serviceSpecObject.type = "NodePort"

        } else if (challenge.http) {
            serviceSpecObject.ports = [
                {
                    port: challenge.http[0].port,
                    targetPort: challenge.http[0].port
                }
            ]

            serviceSpecObject.type = "ClusterIP"
        }

        const serviceName = `instancer-${challenge.name}-${teamId}-service`

        const serviceObject = {
            metadata: {
                name: serviceName,
                labels: {
                    'chall-name': challenge.name
                }
            },
            spec: serviceSpecObject
        }

        await coreApi.createNamespacedService(namespaceName, serviceObject)


        // create ingress for http challenges
        const ingressName = `instancer-${challenge.name}-${teamId}-service`

        const challengeHost = challenge.http[0]

        const ingressObject = {
            metadata: {
                name: ingressName,
                annotations: {
                    'cert-manager.io/cluster-issuer': 'letsencrypt'
                }
            },
            spec: {
                ingressClassName: 'nginx',
                tls: [
                    {
                        hosts: [challengeHost.subdomain]
                    }
                ],
                rules: [
                    {
                        host: challengeHost.subdomain,
                        http: {
                            paths: [
                                {
                                    path: '/',
                                    pathType: 'Prefix',
                                    backend: {
                                        service: {
                                            name: serviceName,
                                            port: {
                                                number: challengeHost.port
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }

        await networkingApi.createNamespacedIngress(namespaceName, ingressObject)
    }
}

module.exports = K8sManager
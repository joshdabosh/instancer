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
}

module.exports = K8sManager
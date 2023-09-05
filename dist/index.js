/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 806:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 492:
/***/ ((module) => {

module.exports = eval("require")("@alicloud/pop-core");


/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 17:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(806);

const path = __nccwpck_require__(17);
const fs = __nccwpck_require__(147);
const ROAClient = (__nccwpck_require__(492).ROAClient);
const popCore = __nccwpck_require__(492);



const APIEndpoint = `https://cs.aliyuncs.com`
const APIEndpointAdcp = 'https://adcp.aliyuncs.com'


async function run() {
    let accessKeyId = core.getInput('access-key-id', { required: true });
    let accessKeySecret = core.getInput('access-key-secret', { required: true });
    let securityToken = core.getInput('security-token', { required: false });
    let clusterId = core.getInput('cluster-id', { required: false });
    let clusterType = core.getInput('cluster-type', { required: false });

    try {
        let kubeconfig = ""
        if (clusterType === "ackone") { // get ACK One Hub Cluster kubeconfig
            kubeconfig = await getAckOneHubKubeconfig(accessKeyId, accessKeySecret, securityToken, APIEndpointAdcp, clusterId)
        } else { // get ACK Cluster kubeconfig
            let client = new ROAClient({
                accessKeyId,
                accessKeySecret,
                securityToken,
                endpoint: APIEndpoint,
                apiVersion: '2015-12-15'
            });
            let result = await requestWithRetry(client, 'GET', `/k8s/${clusterId}/user_config`)
            kubeconfig = result.config
        }

        const runnerTempDirectory = process.env['RUNNER_TEMP']; // Using process.env until the core libs are updated
        const kubeconfigPath = path.join(runnerTempDirectory, `kubeconfig_${Date.now()}`);
        core.debug(`Writing kubeconfig contents to ${kubeconfigPath}`);
        fs.writeFileSync(kubeconfigPath, kubeconfig);
        fs.chmodSync(kubeconfigPath, '600');
        core.exportVariable('KUBECONFIG', kubeconfigPath);
        console.log('KUBECONFIG environment variable is set');
    } catch (err) {
        core.setFailed(`Failed to get kubeconfig file for Kubernetes cluster: ${err}`);
    }
}

async function requestWithRetry(client, method, path, retries = 3, retryDelay = 1000) {
	try {
		return await client.request(method, path);
	} catch (err) {
		if (retries > 0) {
			core.info(`Retrying after ${retryDelay}ms...`);
			await new Promise(resolve => setTimeout(resolve, retryDelay));
			return await requestWithRetry(client, method, path, retries - 1, retryDelay * 2);
		} else {
			throw err;
		}
	}
}

async function getAckOneHubKubeconfig(accessKeyId, accessKeySecret, securityToken, apiEndpoint, clusterId) {
    let client = new popCore({
        accessKeyId: accessKeyId,
        accessKeySecret: accessKeySecret,
        securityToken: securityToken,
        endpoint: apiEndpoint,
        apiVersion: '2022-01-01'
    });

    let params = {
        ClusterId: clusterId,
    }
    let requestOption = {
        method: 'POST',
        formatParams: false,
    };

    let result = await requestActionWithRetry(client, 'DescribeHubClusterKubeconfig', params, requestOption)
    return result.Kubeconfig
}

async function requestActionWithRetry(client, action, params, requestOption, retries = 3, retryDelay = 1000) {
    try {
        return await client.request(action, params, requestOption);
    } catch (err) {
        if (retries > 0) {
            core.info(`Retrying after ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return await requestActionWithRetry(client, action, params, requestOption,retries - 1, retryDelay * 2);
        } else {
            throw err;
        }
    }
}

run();
})();

module.exports = __webpack_exports__;
/******/ })()
;
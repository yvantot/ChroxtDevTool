let storage = chrome.storage.local;

// Purpose: Get new extensions & tabs data, default if new, otherwise copy methods data from original
// Return: Return an object, not merged with old data, but with old data essential properties
// Nutshell: Returns new & updated data
function get_new_data(callback = null) {
	let data_placeholder = {
		extensions: [],
		websites: [],
		enabled: false,
		"show-popup": true,
	};
	return new Promise((resolve, reject) => {
		// Get the current strorage
		storage.get(null, (data) => {
			// Get new extensions and new extension properties
			chrome.management.getAll((extensions) => {
				extensions.sort((a, b) => a.name.localeCompare(b.name));
				extensions.forEach((ext, i) => {
					// Since PWA is included, only allow extensions
					if (ext.type == "extension") {
						// Create an object inside an array of this object for every extension
						data_placeholder.extensions[i] = {
							// Brand new data
							ext_name: ext.name,
							ext_id: ext.id,
							version: ext.version,
							enabled: ext.enabled,
							matches: ext.hostPermissions,
							permissions: ext.permissions,
							icon: ext.icons?.[0].url,

							// Keep settings the same, if not initialized, set to default
							reload: data.extensions?.[i]?.reload ?? false,
							disable: data.extensions?.[i]?.disable ?? false,
							uninstall: data.extensions?.[i]?.uninstall ?? false,
						};
					}
				});
				// After extension operation, get all open tabs
				chrome.tabs.query({}, (tabs) => {
					tabs.forEach((tab, k) => {
						// For each tab, add this object
						data_placeholder.websites[k] = {
							site_name: tab.title,
							site_id: tab.id,
							icon: tab.favIconUrl,
							url: tab.url,

							// Keep settings the same, if not initialized, set to default
							reload: data.websites?.[k]?.reload ?? false,
						};
					});
					// Finally, return the merged data through Promises or callback
					if (typeof callback == "function") {
						callback(data_placeholder);
					} else {
						resolve(data_placeholder);
					}
				});
			});
		});
	});
}

chrome.runtime.onMessage.addListener((receive, _, send) => {
	switch (receive.message) {
		case "get_data":
			get_new_data().then((data) => {
				send(data);
				console.log("Background: ", data);
			});
			break;
		case "set_data":
			storage.set(receive.data);
			break;
		case "execute_methods":
			receive.data.extensions.forEach((extension) => {
				if (extension.reload) {
					chrome.management.setEnabled(extension.ext_id, false);
					chrome.management.setEnabled(extension.ext_id, true);
				}
				if (extension.disable) {
					chrome.management.setEnabled(extension.ext_id, !extension.enabled);
				}
				if (extension.uninstall) {
					chrome.management.uninstall(extension.ext_id);
				}
			});
			receive.data.websites.forEach((website) => {
				if (website.reload) {
					chrome.tabs.reload(website.site_id);
				}
			});
			break;
		default:
			console.warn("UNHANDLED MESSAGE: ONMESSAGE");
			break;
	}
	return true;
});

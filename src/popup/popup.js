// IIFE doesn't work really well without semicolon, thus I'll now use semicolon
// My biggest regret is using index to identify my data, I will use dataset next time.

(() => {
	const s_host = document.createElement("div");
	const s_root = s_host.attachShadow({ mode: "closed" });
	document.body.appendChild(s_host);

	// Button for clear storage
	(() => {
		let storage = chrome.storage.local;
		const clear_button = document.createElement("button");
		clear_button.setAttribute(
			"style",
			`   position: fixed;
                top: 0;
                right: 0;
                height: 20px;
                width: 40px;
                background-color: green;
                border: 1px solid black;            
            `
		);
		clear_button.addEventListener("click", () => {
			storage.get(null, (data) => {
				console.log("Storage before clearing: ");
				console.log(data);
				storage.clear(() => {
					if (chrome.runtime.lastError) {
						console.error("Storage has not been cleared", chrome.runtime.lastError);
					} else {
						storage.get(null, (data) => console.log("Storage successfully cleared: ", data));
					}
				});
			});
		});
		s_root.appendChild(clear_button);
	})();

	// Drag check for checkbox
	(() => {
		let is_dragging = false;
		let working_area = document.querySelector("main");

		working_area.addEventListener("mousedown", () => {
			is_dragging = true;
		});
		working_area.addEventListener("mouseup", () => {
			is_dragging = false;
		});
		working_area.addEventListener("mouseover", (e) => {
			if (e.target.nodeName == "INPUT" && is_dragging) {
				e.target.checked = !e.target.checked;

				// Specific use-case for storage feature
				e.target.dispatchEvent(new Event("change"));
			}
		});
	})();
})();

let data_placeholder = {};
initialize_data();

// Update the storage after the popup is closed
document.addEventListener("visibilitychange", () => {
	chrome.runtime.sendMessage({ message: "set_data", data: data_placeholder });
});

// Update data_placeholder everytime the checkbox is toggled
function update_data(checkbox, type, index, method) {
	if (checkbox.nodeName == "INPUT" && checkbox.type == "checkbox") {
		checkbox.addEventListener("change", () => {
			data_placeholder[type][index][method] = checkbox.checked;
		});
	} else {
		console.warn("This shouldn't be happening: Error(Incompatible type)");
	}
}

// Execute script
document.getElementById("execute-script").addEventListener("click", (e) => {
	chrome.runtime.sendMessage({
		message: "execute_methods",
		data: data_placeholder,
	});
});

function batch_append(container, node_arr) {
	node_arr.forEach((e) => container.appendChild(e));
	return container;
}

function batch_set_attr(node_arr, attr, value) {
	node_arr.forEach((e) => {
		e.setAttribute(attr, value);
	});
}

function initialize_data() {
	chrome.runtime.sendMessage({ message: "get_data" }, (data) => {
		// Update data_placeholder with the latest data
		data_placeholder = structuredClone(data);
		console.log("Popup data: ", data_placeholder);
		if (data.extensions.length > 0) {
			let frag_ext = document.createDocumentFragment();
			data.extensions.sort((a, b) => a.ext_name.localeCompare(b.ext_name));
			data.extensions.forEach((extension, i) => {
				// Don't show self
				if (extension.ext_name == "Chroxt") {
					return;
				}
				// Setting up the elements
				let container = document.createElement("div");
				let name = document.createElement("p");
				let reload = document.createElement("input");
				let uninstall = document.createElement("input");
				let disable = document.createElement("input");
				name.title = `Name: ${extension.ext_name}\nID: ${extension.ext_id}\nVersion: ${extension.version}\nMatches: \n\t${extension.matches.join(",\n\t")}\nPermissions: \n\t${extension.permissions.join(",\n\t")}`;
				name.textContent = extension.ext_name;

				frag_ext.appendChild(batch_append(container, [name, reload, uninstall, disable]));
				batch_set_attr([reload, uninstall, disable], "type", "checkbox");
				container.setAttribute("class", "ext-list-body");

				// Modifying the properties
				reload.checked = extension.reload;
				disable.checked = extension.disable;
				uninstall.checked = extension.uninstall;

				// Adding listeners for checkboxes
				update_data(reload, "extensions", i, "reload");
				update_data(uninstall, "extensions", i, "uninstall");
				update_data(disable, "extensions", i, "disable");

				// Stylization
				if (extension.enabled) {
					name.style.opacity = "100%";
				} else {
					name.style.opacity = "30%";
				}
			});
			document.getElementById("list-ext").appendChild(frag_ext);
		} else {
			// Add such empty
		}

		if (data.websites.length > 0) {
			let frag_site = document.createDocumentFragment();
			data.websites.forEach((website, i) => {
				// Setting up the elements
				let container = document.createElement("div");
				let name = document.createElement("p");
				let reload = document.createElement("input");
				name.title = `Title: ${website.site_name}\nID: ${website.site_id}\nURL: ${website.url}`;
				name.textContent = website.site_name;

				frag_site.appendChild(batch_append(container, [name, reload]));
				reload.type = "checkbox";
				container.setAttribute("class", "site-list-body");

				// Modifying the properties
				reload.checked = website.reload;

				// Adding listeners for checkbox
				update_data(reload, "websites", i, "reload");
			});
			document.getElementById("list-site").appendChild(frag_site);
		} else {
			// Add such empty
		}
	});
}

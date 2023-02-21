import {requestPVE, requestAPI, goToPage, goToURL, instances} from "./utils.js";
import { Dialog } from "./dialog.js";

export class Instance extends HTMLElement {
	constructor () {
		super();
		let shadowRoot = this.attachShadow({mode: "open"});

		shadowRoot.innerHTML = `
		<link rel="stylesheet" href="css/style.css" type="text/css">
		<link rel="stylesheet" href="css/instance.css" type="text/css">
		<article>
			<div>
				<div>
					<img id="instance-type">
					<p id="instance-id"></p>
					<p id="instance-name"></p>
				</div>
				<div>
					<img id="node-status" alt="instance node">
					<p id="node-name"></p>
				</div>
			</div>
			<hr>
			<div class="btn-group">
				<img id="power-btn">
				<img id="console-btn">
				<img id="configure-btn">
				<img id="delete-btn">
			</div>
		</article>
		`;

		this.shadowElement = shadowRoot;
		this.actionLock = false;
	}

	set data (data) {
		if (data.status === "unknown") {
			data.status = "stopped";
		}
		this.type = data.type;
		this.status = data.status;
		this.vmid = data.vmid;
		this.name = data.name;
		this.node = data.node;
		this.update();
	}

	update () {
		let typeImg = this.shadowElement.querySelector("#instance-type");
		typeImg.src = `images/instances/${this.type}/${this.status}.svg`;
		typeImg.alt = `${this.status} instance`;

		let vmidParagraph = this.shadowElement.querySelector("#instance-id");
		vmidParagraph.innerText = this.vmid;

		let nameParagraph = this.shadowElement.querySelector("#instance-name");
		nameParagraph.innerText = this.name ? this.name : "";

		let nodeImg = this.shadowElement.querySelector("#node-status");
		nodeImg.src = `images/nodes/${this.node.status}.svg`;

		let nodeParagraph = this.shadowElement.querySelector("#node-name");
		nodeParagraph.innerText = this.node.name;

		let powerButton = this.shadowElement.querySelector("#power-btn");
		powerButton.src = instances[this.status].powerButtonSrc;
		powerButton.alt = instances[this.status].powerButtonAlt;
		powerButton.title = instances[this.status].powerButtonAlt;
		powerButton.addEventListener("click", this.handlePowerButton.bind(this));

		let configButton = this.shadowElement.querySelector("#configure-btn");
		configButton.src = instances[this.status].configButtonSrc;
		configButton.alt = instances[this.status].configButtonAlt;
		configButton.title = instances[this.status].configButtonAlt;
		configButton.addEventListener("click", this.handleConfigButton.bind(this));

		let consoleButton = this.shadowElement.querySelector("#console-btn");
		consoleButton.src = instances[this.status].consoleButtonSrc;
		consoleButton.alt = instances[this.status].consoleButtonAlt;
		consoleButton.title = instances[this.status].consoleButtonAlt;
		consoleButton.addEventListener("click", this.handleConsoleButton.bind(this));

		let deleteButton = this.shadowElement.querySelector("#delete-btn");
		deleteButton.src = instances[this.status].deleteButtonSrc;
		deleteButton.alt = instances[this.status].deleteButtonAlt;
		deleteButton.title = instances[this.status].deleteButtonAlt;
		deleteButton.addEventListener("click", this.handleDeleteButton.bind(this));

		if (this.node.status !== "online") {
			powerButton.classList.add("hidden");
			configButton.classList.add("hidden");
			consoleButton.classList.add("hidden");
			deleteButton.classList.add("hidden");
		}
	}

	async handlePowerButton () {

		if(!this.actionLock) {

			let dialog = document.createElement("dialog-form");
			document.body.append(dialog);

			dialog.header = `${this.status === "running" ? "Stop" : "Start"} VM ${this.vmid}`;
			dialog.formBody = `<p>Are you sure you want to ${this.status === "running" ? "stop" : "start"} VM</p><p>${this.vmid}</p>`

			dialog.callback = async (result, form) => {
				if (result === "confirm") {
					this.actionLock = true;
					let targetAction = this.status === "running" ? "stop" : "start";
					let targetStatus = this.status === "running" ? "stopped" : "running";
					let prevStatus = this.status;
					this.status = "loading";

					this.update();

					let result = await requestPVE(`/nodes/${this.node.name}/${this.type}/${this.vmid}/status/${targetAction}`, "POST", {node: this.node.name, vmid: this.vmid});

					const waitFor = delay => new Promise(resolve => setTimeout(resolve, delay));

					while (true) {
						let taskStatus = await requestPVE(`/nodes/${this.node.name}/tasks/${result.data}/status`);
						if(taskStatus.data.status === "stopped" && taskStatus.data.exitstatus === "OK") { // task stopped and was successful
							this.status = targetStatus;
							this.update();
							this.actionLock = false;
							break;
						}
						else if (taskStatus.data.status === "stopped") { // task stopped but was not successful
							this.status = prevStatus;
							console.error(`attempted to ${targetAction} ${this.vmid} but process returned stopped:${result.data.exitstatus}`);
							this.update();
							this.actionLock = false;
							break;
						}
						else{ // task has not stopped
							await waitFor(1000);
						}
					}
				}
			}

			dialog.show();
		}
	}

	handleConfigButton () {
		if (!this.actionLock && this.status === "stopped") { // if the action lock is false, and the node is stopped, then navigate to the conig page with the node infor in the search query
			goToPage("config.html", {node: this.node.name, type: this.type, vmid: this.vmid});
		}
	}

	handleConsoleButton () {
		if (!this.actionLock && this.status === "running") {
			let data = {console: `${this.type === "qemu" ? "kvm" : "lxc"}`, vmid: this.vmid, vmname: this.name, node: this.node.name, resize: "off", cmd: ""};
			data[`${this.type === "qemu" ? "novnc" : "xtermjs"}`] = 1;
			goToURL("https://pve.tronnet.net", data, true);
		}
	}

	handleDeleteButton () {
		if (!this.actionLock && this.status === "stopped") {
			let dialog = document.createElement("dialog-form");
			document.body.append(dialog);

			dialog.header = `Delete VM ${this.vmid}`;
			dialog.formBody = `<p>Are you sure you want to <strong>delete</strong> VM </p><p>${this.vmid}</p>`

			dialog.callback = async (result, form) => {
				if (result === "confirm") {
					this.actionLock = true;
					this.status = "loading";
					this.update();

					let action = {};
					action.purge = 1;
					action["destroy-unreferenced-disks"] = 1;

					let body = {
						node: this.node.name,
						type: this.type,
						vmid: this.vmid,
						action: JSON.stringify(action)
					};

					let result = await requestAPI("/instance", "DELETE", body);
					if (result.status === 200) {
						this.parentNode.removeChild(this);
					}
					else {
						console.error(result);
					}
				}
			}

			dialog.show();
		}
	}
}

customElements.define("instance-article", Instance);
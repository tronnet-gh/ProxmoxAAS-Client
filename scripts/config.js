import {request, goToPage, getURIData} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	let cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}
	
	let uriData = getURIData();
	let node = uriData.node;
	let type = uriData.type;
	let vmid = uriData.vmid;
	await populateForm(node, type, vmid);

	let cancelButton = document.querySelector("#cancel");
	cancelButton.addEventListener("click", () => {
		goToPage("index.html");
	});
}

async function populateForm (node, type, vmid) {
	let config = await request(`/nodes/${node}/${type}/${vmid}/config`);
	console.log(config);

	let name = type === "qemu" ? "name" : "hostname";
	addFormLine("name", "Name", {type: "text", value: config.data[name]});
	addFormLine("resources", "Cores", {type: "number", value: config.data.cores, min: 1, max: 8192}, "Threads");
	addFormLine("resources", "Memory", {type: "number", value: config.data.memory / 1024, min: 1}, "GiB");

	if (type === "qemu") {
		let i = 0;
		while(Object.hasOwn(config.data, `sata${i}`)){
			let sata = config.data[`sata${i}`];
			sata = `{"${sata.replaceAll(":", '":"').replaceAll("=", '":"').replaceAll(",", '","')}"}`;
			sata = JSON.parse(sata);
			let sizeNum = +(sata.size.replaceAll("G", "").replaceAll("M", ""));
			let sizeUnit = sata.size.includes("G") ? "GiB" : "MiB";
			addFormLine("resources", `SATA ${i}`, {type: "number", value: sizeUnit === "GiB" ? sizeNum.toFixed(3) : (sizeNum / 1024).toFixed(3), min: 1}, "GiB");
			i++;
		}
	}
	else {
		let rootfs = config.data.rootfs;
		rootfs = `{"${rootfs.replaceAll(":", '":"').replaceAll("=", '":"').replaceAll(",", '","')}"}`;
		rootfs = JSON.parse(rootfs);
		let sizeNum = +(rootfs.size.replaceAll("G", "").replaceAll("M", ""));
		let sizeUnit = rootfs.size.includes("G") ? "GiB" : "MiB";
		addFormLine("resources", "Root FS", {type: "number", value: sizeUnit === "GiB" ? sizeNum.toFixed(3) : (sizeNum / 1024).toFixed(3), min: 1}, "GiB");
	}
}

function addFormLine (fieldset, labelText, inputAttr, unitText=null) {
	let field = document.querySelector(`#${fieldset}`);

	let label = document.createElement("label");
	label.innerHTML = labelText;
	field.append(label);

	let input = document.createElement("input");
	for (let k in inputAttr) {
		input.setAttribute(k, inputAttr[k])
	}
	field.append(input);

	if (unitText) {
		let unit = document.createElement("p");
		unit.innerText = unitText;
		field.append(unit);
	}
}
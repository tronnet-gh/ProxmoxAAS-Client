import {pveAPI, paasAPI} from "/vars.js";

export class ResponseError extends Error {
	constructor(message) {
		super(message);
		this.name = "ResponseError";
	}
}

export class NetworkError extends Error {
	constructor(message) {
		super(message);
		this.name = "NetworkError";
	}
}

export const resources = {
	disk: {
		//actionBarOrder: ["config", "move", "reassign", "resize", "delete_detach_attach"],
		actionBarOrder: ["config", "move", "resize", "delete_detach_attach"], // handle reassign later
		lxc: {
			prefixOrder: ["rootfs", "mp", "unused"],
			rootfs: {name: "ROOTFS", icon: "images/resources/drive.svg", actions: ["move", "resize"]},
			mp: {name: "MP", icon: "images/resources/drive.svg", actions: ["config", "detach", "move", "reassign", "resize"]},
			unused: {name: "UNUSED", icon: "images/resources/drive.svg", actions: ["attach", "delete", "reassign"]}
		},
		qemu: {
			prefixOrder: ["ide", "sata", "unused"],
			ide: {name: "IDE", icon: "images/resources/disk.svg", actions: ["config", "delete"]},
			sata: {name: "SATA", icon: "images/resources/drive.svg", actions: ["detach", "move", "reassign", "resize"]},
			unused: {name: "UNUSED", icon: "images/resources/drive.svg", actions: ["attach", "delete", "reassign"]}
		}
	}
}

function getCookie(cname) {
	let name = cname + "=";
	let decodedCookie = decodeURIComponent(document.cookie);
	let ca = decodedCookie.split(";");
	for(let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === " ") {
			c = c.substring(1);
		}
		if (c.indexOf(name) === 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

export async function requestTicket (username, password) {
	let response = await requestPVE("/access/ticket", "POST", {username: `${username}@pve`, password: password}, false);

	return response;
}

export function setTicket (ticket, csrf) {
	let d = new Date();
	d.setTime(d.getTime() + (2*60*60*1000));
	document.cookie = `PVEAuthCookie=${ticket}; path=/; expires=${d.toUTCString()}; domain=.tronnet.net`;
	document.cookie = `CSRFPreventionToken=${csrf}; path=/; expires=${d.toUTCString()}; domain=.tronnet.net;`
}

export async function requestPVE (path, method, body = null) {
	let prms = new URLSearchParams(body);
	let content = {
		method: method,
		mode: "cors",
		credentials: "include",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		}
	}
	if(method === "POST") {
		content.body = prms.toString();
		content.headers.CSRFPreventionToken = getCookie("CSRFPreventionToken");
	}

	let response = await request(`${pveAPI}${path}`, content);
	return response;
}

export async function requestAPI (path, method, body = null) {
	let prms = new URLSearchParams(body);
	let content = {
		method: method,
		mode: "cors",
		credentials: "include",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		}
	}
	if(method === "POST") {
		content.body = prms.toString();
		content.headers.CSRFPreventionToken = getCookie("CSRFPreventionToken");
	}

	let response = await request(`${paasAPI}${path}`, content);
	return response;
}

async function request (url, content) {
	let response = await fetch(url, content)
	.then((response) => {
		if (!response.ok) {
			throw new ResponseError(`recieved response status code ${response.status}`);
		}
		return response;
	})
	.catch((error) => {
		if (error instanceof ResponseError) {
			throw error;
		}
		throw new NetworkError(error);
	});

	let data = await response.json();
	return data;
}

export function goToPage (page, data={}) {
	let url = new URL(`https://client.tronnet.net/${page}`);
	for(let k in data) {
		url.searchParams.append(k, data[k]);
	}
	window.location.assign(url.toString());
}

export function getURIData () {
	let url = new URL(window.location.href);
	return Object.fromEntries(url.searchParams);
}

export function deleteAllCookies () {
	document.cookie.split(";").forEach(function(c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=.tronnet.net;"); });
}

export function reload () {
	window.location.reload();
}
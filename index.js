/*!
 * Copyright(c) 2021 Pawel Hryniszak
 */

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
import * as rtt from "./modules/rtt.js";
import { Terminal } from "./modules/terminal.js";
rtt.init();

const logger = debug("stlink:index");

///////////////////////////////////////////////////////////////////////////////
// VARIABLES

let rttRunning = false;
const rttWriteArr = [];

// elements
const btnConnect = document.getElementById("open-stlink");
const btnRTT = document.getElementById("rtt");
const elUSBinfo = document.getElementById("info-usb");
const elCPUinfo = document.getElementById("info-cpu");
const elTick = document.getElementById("info-tick").firstElementChild;
const elTerminal = document.querySelector(".terminal");
const terminal = new Terminal(elTerminal);

document.elTick = elTick;
// document.elTick.children[1].setAttributeNS(null,"fill","#f00");


///////////////////////////////////////////////////////////////////////////////
// FUNCTIONS

const resize = () => {
    terminal.resize();
};

const initUI = () => {

    resize();
    updateUI();
    
    // Caution: I am telling you this as a friend. It exists. It is a thing, but it is a hack. Please don't use it
    window.scrollTo(0,1);
};

const updateUI = async () => {
    let isOpened = rtt.isOpened();
    let devices = await navigator.usb.getDevices();

    // buttons
    btnConnect.disabled = isOpened;
    btnRTT.disabled = !isOpened;

    // USB info
    if (devices.length) {
        elUSBinfo.innerText = isOpened ? `${devices[0].productName} opened` : `${devices[0].productName} connected`;
    } else {
        elUSBinfo.innerText = "---";
    }

    // STM32 info
    elCPUinfo.innerText = isOpened ? `${rtt.getMCUstring()} 0x${rtt.status.RAM.address.toString(16)}:0x${rtt.status.RAM.size.toString(16)}` : "---";

    // RTT tick
    document.elTick.children[1].setAttributeNS(null, "fill", "white");

    logger(`isOpened: ${isOpened}  devices: ${devices.length}`);
};

const runRTT = async () => {

    if (rttRunning) {
        rttRunning = false;
        btnRTT.innerText = "Start RTT";
        return;
    }
    
    rttRunning = true;
    btnRTT.innerText = "Stop RTT";

    await rtt.find();
    updateUI();

    if (rtt.status.aUp.length == 0 || rtt.status.aDown.length == 0) {
        logger("RTT not found");
        terminal.writeln("RTT not found.");
        rttRunning = false;
        return;
    }

    terminal.writeln(`Starting to read from rtt[0] channel name ${rtt.status.aUp[0].name}`);
    terminal.write(`Size in ${rtt.status.aUp[0].SizeOfBuffer}`);
    terminal.writeln(` size out ${rtt.status.aDown[0].SizeOfBuffer}`);

    while (rttRunning) {
        let rttbuff = await rtt.read();
        rttTick();
        if (rttbuff.length) {
            logger("rtt: ", rttbuff);
            terminal.write(rttbuff);
        }
        if (rttWriteArr.length) {
            await rtt.write(rttWriteArr);
        }
    }
};

const rttTick = () => {
    document.elTick.children[1].setAttributeNS(null, "fill", "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, "0"));
};


///////////////////////////////////////////////////////////////////////////////
// EVENTS

window.onresize = resize;

navigator.usb.onconnect = updateUI;
navigator.usb.ondisconnect = updateUI;

// https://developer.mozilla.org/en-US/docs/Web/API/Document/readystatechange_event
window.addEventListener("load", initUI);

// click on open STLINK
btnConnect.onclick = async () => {
    await rtt.open();
    updateUI();
};

btnRTT.onclick = runRTT;
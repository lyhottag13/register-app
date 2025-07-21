import getISOWeek from "./utils/getISOWeek.js";

const poInput = document.getElementById('po');
const closeOrderButton = document.getElementById('close-order');
const continueButton = document.getElementById('continue');
const submitButton = document.getElementById('submit');

// First grid's inputs.
const internalSerialInput = document.getElementById('internal-serial');
const externalSerial1Input = document.getElementById('external-serial-1');
const externalSerial2Input = document.getElementById('external-serial-2');
const internalIdInput = document.getElementById('internal-id');

// Second grid's inputs.
const twoCupInput = document.getElementById('qc3-2-cup');
const timeInput = document.getElementById('qc3-time');
const oneCupInput = document.getElementById('qc3-1-cup');
const otherTestsCheckBox = document.getElementById('other-tests');
const reworkCheckBox = document.getElementById('rework');
const notesInput = document.getElementById('notes');

const datecode = document.getElementById('datecode');
const poCountTotalDiv = document.getElementById('po-count');
const poCountTodayDiv = document.getElementById('today-count');

const currentRegistration = {};

async function main() {
    // Checks to see if a successful connection could be made to the database before continuing.
    const { connectionSuccessful } = await (await fetch('/api/testConnection')).json();
    if (connectionSuccessful) {
        window.alert('Successful Connection!');
    } else {
        window.alert('Connection Failed!');
        return;
    }
    // For testing, fills out the first screen with sample values.
    document.addEventListener('keydown', event => {
        // If I press , then fill out the first screen.
        if (event.key === ',') {
            poInput.value = '30341278';
            internalIdInput.value = '123456';
            internalSerialInput.value = 'APBUAESA252900000';
            externalSerial1Input.value = 'APBUAESA252900000';
            externalSerial2Input.value = 'APBUAESA252900000';
        } else if (event.key === '.') {
            // If I press . then fill out the second screen.
            twoCupInput.value = '80';
            oneCupInput.value = '15';
            timeInput.value = '43';
        }
    })
    // Automatically builds the datecode, formatted with the last two year digits and the week number, YYWW.
    datecode.innerText = new Date().toISOString().slice(2, 4) + getISOWeek();

    // Forces every number input to receive numbers only through regex.
    const textInputs = document.getElementsByClassName('number');
    for (let numberInput of textInputs) {
        numberInput.oninput = function () {
            this.value = this.value.replace(/[^0-9]/g, '');
        }
    }

    closeOrderButton.disabled = true;
    submitButton.disabled = true;
    closeOrderButton.addEventListener('click', handleCloseOrder);
    poInput.addEventListener('input', handlePoInputChange);
    continueButton.addEventListener('click', handleContinue);
    submitButton.addEventListener('click', handleSubmit);
}

async function handlePoInputChange() {
    // Only moves forward with the database query if poInput reaches 8 characters.
    closeOrderButton.disabled = true;
    if (poInput.value.length === 8) {
        poInput.disabled = true;
        const poCount = await (await fetch('/api/poCount', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                po: poInput.value
            })
        })).json();
        poCountTotalDiv.innerText = poCount.poCountTotal;
        poCountTodayDiv.innerText = poCount.poCountToday;
        // Allows the user to close the order when poCount is over 1150, since the program needs to know when to begin a new order.
        if (poCount.poCountTotal >= 1150 || window.confirm('Override?')) {
            closeOrderButton.disabled = false;
        }
    }

    poInput.disabled = false;
}

async function handleCloseOrder() {
    // TODO Implement please.
    console.log('Nothing, needs to be implemented.');
    closeOrderButton.disabled = true;
}

async function handleContinue() {
    if (await isValidFirstScreen()) {
        console.log('Successful First Screen!');
        submitButton.disabled = false;
        continueButton.disabled = true;
        currentRegistration.po = poInput.value;
        currentRegistration.internalId = internalIdInput.value;
        currentRegistration.serialNumber = internalSerialInput.value;
        currentRegistration.datecode = datecode.innerText;
    } else {
        console.log('Failure 1!');
    }
}

async function handleSubmit() {
    if (await isValidSecondScreen()) {
        console.log('Successful Second Screen!');
        currentRegistration.twoCup = twoCupInput.value;
        currentRegistration.time = timeInput.value;
        currentRegistration.oneCup = oneCupInput.value;
        currentRegistration.rework = reworkCheckBox.checked;
        currentRegistration.notes = notesInput.value;
        sendRegistration(currentRegistration);
    } else {
        console.log('Failure 2!');
    }
}

/**
 * Checks to see if the user inputs in the first screen are valid for the application.
 * @returns Whether or not the first screen's inputs are valid.
 */
async function isValidFirstScreen() {
    if (internalIdInput.value.length !== 6) {
        console.log('Internal ID Invalid!');
        return false;
    }
    if (internalSerialInput.value !== externalSerial1Input.value || internalSerialInput.value !== externalSerial2Input.value) {
        console.log('Serial Input Equality Invalid!');
        return false;
    }
    // Checks only one input's length since their equality is already established.
    if (internalSerialInput.value.length !== 17) {
        console.log('Serial Input Length Invalid!');
        return false;
    }
    const serialNumberDatecode = internalSerialInput.value.slice(8, 12);
    if (serialNumberDatecode !== datecode.innerText) {
        console.log('Datecode Invalid!');
        return false;
    }
    const data = await sendPotentialFirstScreen();
    if (data.qc2) {
        currentRegistration.qc2 = data.qc2;
    } else if (data.err) {
        console.log(data.err);
    } else {
        console.log('Something went wrong!');
    }
    return data.isValidFirstSend;
}
/**
 * Sends the data from the first screen, after it has been checked by app.js's checks,
 * to the server to see whether the serial number and internal ID already
 * exist in the database.
 * @returns Whether the first screen's information is valid in the database.
 */
async function sendPotentialFirstScreen() {
    const data = await (await fetch('/api/firstSend', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            serialNumber: internalSerialInput.value,
            internalId: internalIdInput.value
        })
    })).json();
    return data;
}

async function isValidSecondScreen() {
    if (twoCupInput.value < 75 || twoCupInput.value > 105) {
        return false;
    }
    if (timeInput.value < 36 || timeInput.value > 56) {
        return false;
    }
    if (oneCupInput.value < 11 || oneCupInput.value > 21) {
        return false;
    }
    if (!otherTestsCheckBox.checked) {
        return false;
    }
    return true;
}

async function sendRegistration() {
    const data = await (await fetch('/api/registration', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            currentRegistration
        })
    })).json();
}

// Runs the main function after everything else in the root of the js file has run.
main();
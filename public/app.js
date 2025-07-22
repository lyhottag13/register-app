import getISOWeek from "./utils/getISOWeek.js";
import { getPoNumber, createModal } from "./utils/poModal.js";
import { Slider } from "./utils/slider.js";

const poDiv = document.getElementById('po');
const actualButton = document.getElementById('actual');
const specialButton = document.getElementById('special');
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
const otherTestCheckBox = new Slider(document.getElementById('other-tests'), false);
const reworkCheckBox = new Slider(document.getElementById('rework'), false);
const notesInput = document.getElementById('notes');

const staticElementsTop = document.getElementById('static-elements-top');
const datecode = document.getElementById('datecode');
const poCountTotalDiv = document.getElementById('po-count');
const poCountTodayDiv = document.getElementById('today-count');
const staticElementsBottom = document.getElementById('static-elements-bottom');
const dateTime = document.getElementById('date-time');

// The current registration represented as an object to hold any number of properties.
const currentRegistration = {};

let currentScreen = 0; // Tracks the current screen, used in the back button.

async function main() {
    createModal(); // Creates the PO number modal for later use.
    // Checks for a successful connection to the database before continuing.
    // const { connectionSuccessful } = await (await fetch('/api/testConnection')).json();
    // if (connectionSuccessful) {
    //     window.alert('Successful Connection!');
    // } else {
    //     window.alert('Connection Failed!');
    //     return;
    // }
    // For testing, fills out the first screen with sample values.
    document.addEventListener('keydown', event => {
        // If I press , then fill out the first screen.
        if (event.key === ',') {
            poDiv.value = '30341278';
            internalIdInput.value = `0000${window.prompt('ID:')}`;
            const serial = window.prompt('SERIAL:');
            internalSerialInput.value = `APBUAESA2530000${serial}`;
            externalSerial1Input.value = `APBUAESA2530000${serial}`;
            externalSerial2Input.value = `APBUAESA2530000${serial}`;
        } else if (event.key === '.') {
            // If I press . then fill out the second screen.
            twoCupInput.value = '80';
            oneCupInput.value = '43';
            timeInput.value = '15';
        }
    })
    // Automatically builds the datecode, formatted with the last two year digits and the week number: YYWW.
    datecode.innerText = `Datecode:\n${new Date().toISOString().slice(2, 4) + getISOWeek()}`;

    /*
    Starts the date-time clock. 
    The first new Date() isn't really necessary since it can't be seen
    initially, but the layout might change later.
    */
    dateTime.innerText = new Date().toLocaleString();
    setInterval(() => {
        dateTime.innerText = new Date().toLocaleString();
    }, 1000);

    // Forces every number input to receive only numbers through regex.
    const textInputs = document.getElementsByClassName('number');
    for (let numberInput of textInputs) {
        numberInput.oninput = function () {
            this.value = this.value.replace(/[^0-9]/g, '');
        }
    }
    setInputValidations();
    closeOrderButton.disabled = true;
    document.querySelectorAll('.back').forEach(element => {
        element.addEventListener('click', handleBack);
    })
    actualButton.addEventListener('click', handleActual);
    closeOrderButton.addEventListener('click', handleCloseOrder);
    continueButton.addEventListener('click', handleContinue);
    submitButton.addEventListener('click', handleSubmit);
    reset();
}

function setInputValidations() {
    internalSerialInput.addEventListener('input', handleSerialNumbers);
    externalSerial1Input.addEventListener('input', handleSerialNumbers);
    externalSerial2Input.addEventListener('input', handleSerialNumbers);
    internalIdInput.addEventListener('input', handleId);
    twoCupInput.addEventListener('input', function () {
        setColorBasedOnRange(this, 75, 105);
    });
    oneCupInput.addEventListener('input', function () {
        setColorBasedOnRange(this, 36, 56);
    });
    timeInput.addEventListener('input', function () {
        setColorBasedOnRange(this, 11, 21);
    });
    function handleSerialNumbers() {
        setColorBasedOnLength(this, 17);
    }
    function handleId() {
        setColorBasedOnLength(this, 6);
    }
    function setColorBasedOnLength(object, length) {
        if (object.value.length !== length) {
            object.style.backgroundColor = 'rgba(255, 77, 77, 1)';
        } else {
            object.style.backgroundColor = 'rgba(63, 255, 104, 1)';
        }
    }
    function setColorBasedOnRange(object, min, max) {
        if (object.value < min || object.value > max) {
            object.style.backgroundColor = 'rgba(255, 77, 77, 1)';
        } else {
            object.style.backgroundColor = 'rgba(63, 255, 104, 1)';
        }
    }
}

/**
 * Handles the PO Actual button on the 0th screen. Asks for a PO number and
 * swaps to the 1st screen.
 */
async function handleActual() {
    const poNumber = `po${await getPoNumber()}`;
    poDiv.innerText = poNumber;
    // Rudimentary poNumber check.
    if (isValidPo(poNumber)) {
        updatePoCount();
        swapScreens(1);
    }
}
/**
 * Checks if the poNumber is valid. The PO requires 10 characters, including
 * the po at the beginning.
 * @param {number} poNumber The PO number as poXXXXXXXX.
 * @returns If the poNumber is valid.
 */
function isValidPo(poNumber) {
    if (poNumber.length !== 10) {
        return false;
    }
    return true;
}

async function updatePoCount() {
    closeOrderButton.disabled = true;
    const poCount = await (await fetch('/api/poCount', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            po: poDiv.innerText
        })
    })).json();
    poCountTotalDiv.innerText = `Total:\n${poCount.poCountTotal}`;
    poCountTodayDiv.innerText = `Today:\n${poCount.poCountToday}`;
    // Allows the user to close the order when poCount is over 1150, since the program needs to know when to begin a new order.
    if (poCount.poCountTotal >= 1150 || window.confirm('Override?')) {
        closeOrderButton.disabled = false;
    }
}

async function handleBack() {
    swapScreens(--currentScreen);
}

async function handleCloseOrder() {
    fetch('/api/closeOrder');
    closeOrderButton.disabled = true;
    swapScreens(0);
}

/**
 * Handles the continue button. This checks to see if the 1st screen's
 * user inputs are valid, then continues to the 2nd screen.
 */
async function handleContinue() {
    if (await isValidFirstScreen() || window.confirm('Are you Diego?')) {
        currentRegistration.po = poDiv.innerText;
        currentRegistration.internalId = internalIdInput.value;
        currentRegistration.serialNumber = internalSerialInput.value;
        currentRegistration.datecode = datecode.innerText;
        console.log('Successful First Screen!');
        swapScreens(2);
    } else {
        console.log('Failure 1!');
    }
}

/**
 * Handles the submit button on the second screen using currentRegistration's 
 * information. It validates all the information on the second screen and
 * captures it into currentRegistration, then sends it to the server.
 */
async function handleSubmit() {
    if (!window.confirm('Submit?')) {
        return;
    }
    if (await isValidSecondScreen()) {
        console.log('Successful Second Screen!');
        currentRegistration.twoCup = twoCupInput.value;
        currentRegistration.time = timeInput.value;
        currentRegistration.oneCup = oneCupInput.value;
        currentRegistration.rework = reworkCheckBox.value;
        currentRegistration.notes = notesInput.value;
        if (await sendRegistration(currentRegistration)) {
            console.log('Successful Submit!');
            swapScreens(1);
            reset();
            setTimeout(updatePoCount, 1000);
        } else {
            console.log('Submit Failure!');
        }
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
    if (serialNumberDatecode !== datecode.innerText.slice(10)) {
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

/**
 * Checks if the second screen's inputs are valid. This doesn't need a POST
 * to the server, so it's relatively simple. It checks the 2 Cup, 1 Cup, and
 * Tiempo inputs for validity in a range of values. This also checks the 
 * selection of the otherTestsCheckBox, which serves only as a reminder for
 * the operator that all the tests are PASSes.
 */
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
    if (!otherTestCheckBox.value) {
        return false;
    }
    return true;
}

/**
 * Sends the completed registration data to the database. There is a .query() and a .execute()
 * used on the server-side code, so those are the only possibilities for errors here. Usually,
 * an error with the database connection is flagged at the very beginning of the program, so
 * errors aren't common here.
 */
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
    if (data.err) {
        return false;
    } else {
        return true;
    }
}

/**
 * Swaps between the main screens. Index 0 is the two-button actual/special screen,
 * 1 is the first user input screen, and 2 is the second user input screen.
 * @param {number} index The index of the desired screen.
 */
async function swapScreens(index) {
    currentScreen = index;
    document.getElementById('moving-screen').style.transform = `translateX(-${index * 100}vw)`;
    // Moves the staticElements at the top/bottom of the screen out of/into view since they're only used on the index 1 and 2 screens.
    if (index > 0) {
        staticElementsTop.style.transform = 'translateY(0)';
        staticElementsBottom.style.transform = 'translateY(100vh) translateY(-100%)';
    } else {
        staticElementsTop.style.transform = 'translateY(-100%)';
        staticElementsBottom.style.transform = 'translateY(100vh)'
    }
}

/**
 * Resets all the inputs: ID, serials, QC3s, and the checkboxes.
 */
function reset() {
    internalSerialInput.value = '';
    internalSerialInput.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    externalSerial1Input.value = '';
    externalSerial1Input.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    externalSerial2Input.value = '';
    externalSerial2Input.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    internalIdInput.value = '';
    internalIdInput.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    twoCupInput.value = '';
    twoCupInput.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    oneCupInput.value = '';
    oneCupInput.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    timeInput.value = '';
    timeInput.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    otherTestCheckBox.setValue(false);
    reworkCheckBox.setValue(false);
    notesInput.value = '';
}

// Runs the main function after everything else in the root of the js file has run.
main();
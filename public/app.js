import getISOWeek from "./utils/getISOWeek.js";
import { getPoNumber, createModal, setActivePo } from "./utils/poModal.js";
import Slider from "./utils/slider.js";
import handleQc2Insert from "./utils/handleQc2Insert.js";

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

// Static elements.
const staticElementsTop = document.getElementById('static-elements-top');
const datecode = document.getElementById('datecode');
const poCountTotalDiv = document.getElementById('po-count');
const poCountTodayDiv = document.getElementById('today-count');
const staticElementsBottom = document.getElementById('static-elements-bottom');
const dateTime = document.getElementById('date-time');

// The current registration represented as an object to hold any number of properties.
const currentRegistration = {};

let currentScreenIndex = 0; // Tracks the current screen, useful for the back button.

async function main() {
    createModal(); // Creates the PO number modal for later use.
    // Checks for a successful connection to the database before continuing.
    const { connectionSuccessful } = await (await fetch('/api/testConnection')).json();
    if (connectionSuccessful) {
        window.alert('Conexion exitosa');
    } else {
        window.alert('Conexion fallada');
        return;
    }
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

/**
 * Sets the input validations for each of the inputs. Each validation causes the
 * background color of the inputs to change. The validations are all based on
 * length.
 */
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
    const poNumberIncomplete = await getPoNumber();
    if (poNumberIncomplete === 'CANCEL') {
        return;
    }
    const poNumber = `po${poNumberIncomplete}`;
    poDiv.innerText = poNumber;
    // Rudimentary poNumber check.
    if (isValidPo(poNumber)) {
        if (await setActivePo(poNumber)) {
            updatePoCount();
            // Delays the focus because the scroll malfunctions otherwise.
            await swapScreens(1);
            internalSerialInput.focus();
            setTabbable('screen-1');
        }
    } else {
        window.alert('Invalid PO!');
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
    poCountTodayDiv.innerText = `Hoy:\n${poCount.poCountToday}`;
    // Allows the user to close the order when poCount is over 1115, since the program needs to know when to begin a new order.
    if (poCount.poCountTotal >= 1115) {
        closeOrderButton.disabled = false;
    }
}

/**
 * Handles the Back button. Returns the user to previous screen. Also refocuses
 * the user input if the screen is now the 1st.
 */
async function handleBack() {
    await swapScreens(currentScreenIndex - 1);
    setTabbable(`screen-${currentScreenIndex}`);
    if (currentScreenIndex === 1) {
        internalSerialInput.focus();
    }
}
/**
 * Handles the closeOrderButton. Sends out an API call to close the order,
 * which the server follows through on.
 */
async function handleCloseOrder() {
    if (window.confirm('Cerrar orden?')) {
        fetch('/api/closeOrder');
        closeOrderButton.disabled = true;
        swapScreens(0);
        document.body.focus();
        setTabbable('screen-0');
    }
}

/**
 * Handles the continue button. This checks to see if the 1st screen's
 * user inputs are valid, then continues to the 2nd screen.
 */
async function handleContinue() {
    if (await isValidFirstScreen()) {
        currentRegistration.po = poDiv.innerText;
        currentRegistration.internalId = internalIdInput.value;
        currentRegistration.serialNumber = internalSerialInput.value;
        currentRegistration.datecode = datecode.innerText;
        console.log('Successful First Screen!');
        await swapScreens(2);
        twoCupInput.focus();
        setTabbable('screen-2');
    } else {
        console.log('Failed First Screen!');
    }
}

/**
 * Handles the submit button on the second screen using currentRegistration's 
 * information. It validates all the information on the second screen and
 * captures it into currentRegistration, then sends it to the server.
 */
async function handleSubmit() {
    if (!window.confirm('Enviar?')) {
        return;
    }
    if (await isValidSecondScreen()) {
        console.log('Successful Second Screen!');
        currentRegistration.twoCup = twoCupInput.value;
        currentRegistration.time = timeInput.value;
        currentRegistration.oneCup = oneCupInput.value;
        currentRegistration.rework = reworkCheckBox.value;
        currentRegistration.notes = notesInput.value;

        const sendData = await sendRegistration(currentRegistration);
        if (sendData) {
            console.log('Successful Submit!');
            reset();
            await swapScreens(1);
            setTabbable('screen-1');
            internalSerialInput.focus();
            // This update can't be instant since the database submit needs time to go through.
            updatePoCount();
        } else {
            console.log('Send Failure!');
        }
    } else {
        console.log('Second Screen Failure!');
    }
}

/**
 * Checks to see if the user inputs in the first screen are valid for the application.
 * @returns Whether or not the first screen's inputs are valid.
 */
async function isValidFirstScreen() {
    let errorMessage = '';
    if (internalIdInput.value.length !== 6) {
        errorMessage += 'ID interna inválida\n';
    }
    if (internalSerialInput.value !== externalSerial1Input.value || internalSerialInput.value !== externalSerial2Input.value) {
        errorMessage += 'Números de serie no coinciden\n';
    }
    // Checks only one input's length since their equality is already established.
    if (internalSerialInput.value.length !== 17) {
        errorMessage += 'Longitud del número de serie inválida\n';
    }
    // Slices the serial number since in APBUAESAXXXXAAAAA, the datecode is XXXX.
    const serialNumberDatecode = internalSerialInput.value.slice(8, 12);
    if (serialNumberDatecode !== datecode.innerText.slice(10)) {
        errorMessage += 'Datecode inválido\n';
    }
    if (errorMessage.length > 0) {
        window.alert(errorMessage);
        return false;
    }
    const { isValidFirstSend, qc2, err, qc2Override } = await sendPotentialFirstScreen();
    if (qc2) {
        currentRegistration.qc2 = qc2;
    } else if (qc2Override) {
        // If there isn't a qc2 but the send was valid, ask to input qc2 manually.
        window.alert(err);
        const revisedQc2 = await handleQc2Insert(internalIdInput.value);
        if (revisedQc2) {
            currentRegistration.qc2 = revisedQc2;
            return true;
        }
    } else if (err) {
        window.alert(err);
    } else {
        // Backup error message if there is no QC2 and no error returned either.
        window.alert('Algo fue mal!');
    }
    return isValidFirstSend;
}
/**
 * Sends the data from the first screen, after it has been checked by app.js's checks,
 * to the server to see whether the serial number and internal ID already
 * exist in the database. After this, it returns the QC2 data if there is any.
 * @returns An object with isValidFirstSend and either an error or the QC2 data.
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
    let errorMessage = '';

    if (twoCupInput.value < 75 || twoCupInput.value > 105) {
        errorMessage += 'Valor de QC3 2 Cup inválido\n';
    }
    if (timeInput.value < 11 || timeInput.value > 21) {
        errorMessage += 'Valor de QC3 Tiempo inválido\n';
    }
    if (oneCupInput.value < 36 || oneCupInput.value > 56) {
        errorMessage += 'Valor de QC3 1 Cup inválido\n';
    }
    if (!otherTestCheckBox.value) {
        errorMessage += 'Otras pruebas inválidas\n';
    }

    if (errorMessage.length > 0) {
        window.alert(errorMessage);
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
        window.alert(data.err);
        return false;
    } else {
        return true;
    }
}

/**
 * Swaps between the main screens. Index 0 is the two-button actual/special screen,
 * 1 is the first user input screen, and 2 is the second user input screen.
 * @param {number} nextScreenIndex The index of the desired screen.
 */
async function swapScreens(nextScreenIndex) {
    const movingScreen = document.getElementById('moving-screen');
    console.log(currentScreenIndex);
    console.log(nextScreenIndex);
    // Removes the Enter key event listeners from the previous screen's buttons.
    if (currentScreenIndex === 1) {
        document.removeEventListener('keypress', handleContinueKeyPress);
    } else if (currentScreenIndex === 2) {
        document.removeEventListener('keypress', handleSubmitKeyPress);
    }

    // Adds the Enter key listeners to the next screen's buttons.
    if (nextScreenIndex === 1) {
        document.addEventListener('keypress', handleContinueKeyPress);
    } else if (nextScreenIndex === 2) {
        document.addEventListener('keypress', handleSubmitKeyPress)
    }

    currentScreenIndex = nextScreenIndex;
    movingScreen.style.transform = `translateX(-${nextScreenIndex * 100}vw)`;
    // Moves the staticElements at the top/bottom of the screen out of/into view since they're only used on the index 1 and 2 screens.
    if (nextScreenIndex > 0) {
        staticElementsTop.style.transform = 'translateY(0)';
        staticElementsBottom.style.transform = 'translateY(100vh) translateY(-100%)';
    } else {
        staticElementsTop.style.transform = 'translateY(-100%)';
        staticElementsBottom.style.transform = 'translateY(100vh)'
    }
    // Returns when the screen has finished transitioning, useful for .focus() updates.
    await new Promise(resolve => {
        movingScreen.addEventListener('transitionend', function handler(e) {
            movingScreen.removeEventListener('transitionend', handler);
            resolve(true);
        });
    });
}
function handleSubmitKeyPress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
    }
}
function handleContinueKeyPress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleContinue();
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
    window.scroll(0, 0); // If the user presses tab too much, the viewport malfunctions.
    otherTestCheckBox.setValue(false);
    reworkCheckBox.setValue(false);
    notesInput.value = '';
    setTabbable('screen-0');
}
/**
 * Sets the HTML elements within a parent element to be tabbable through their
 * tab-index attribute. 
 * First sets everything to be untabbable, then sets only the parent's 
 * children to be tabbable.
 * Prevents a bug where the user can tab out of the viewport's area and
 * into a new screen, where they're not supposed to be.
 * @param {string} parentId The ID of the parent element.
 */
function setTabbable(parentId) {
    // Sets everything to be untabbable.
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
        element.tabIndex = -1;
    });
    // Sets only the desired elements to be tabbable.
    const parent = document.getElementById(parentId);
    const tabbableElements = parent.querySelectorAll('input, button, textarea');
    tabbableElements.forEach(element => {
        element.tabIndex = 0;
    });
}

// Runs the main function after everything else in the top-level of the js file has run.
main();
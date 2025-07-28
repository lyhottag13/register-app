import getISOWeek from "./utils/getISOWeek.js";
import { getPoNumber, createModal, setActivePo } from "./utils/poModal.js";
import Slider from "./utils/slider.js";
import handleQc2Insert, { setQc2Validations, updateQc2FailCount } from "./utils/handleQc2Insert.js";

export const elements = {
    // Top-level buttons and containers
    controls: {
        actualButton: document.getElementById('actual'),
        specialButton: document.getElementById('special'),
        closeOrderButton: document.getElementById('close-order'),
        continueButton: document.getElementById('continue'),
        submitButton: document.getElementById('submit'),
        qc2CancelButton: document.getElementById('back-3'),
        qc2SubmitButton: document.getElementById('submit-qc2'),
    },

    // First grid inputs
    grid1: {
        internalSerialInput: document.getElementById('internal-serial'),
        externalSerial1Input: document.getElementById('external-serial-1'),
        externalSerial2Input: document.getElementById('external-serial-2'),
        internalIdInput: document.getElementById('internal-id'),
    },

    // Second grid inputs
    grid2: {
        twoCupInput: document.getElementById('qc3-2-cup'),
        timeInput: document.getElementById('qc3-time'),
        oneCupInput: document.getElementById('qc3-1-cup'),
        otherTestCheckBox: new Slider(document.getElementById('other-tests'), false),
        reworkCheckBox: new Slider(document.getElementById('rework'), false),
        notesInput: document.getElementById('notes'),
    },

    // Third grid inputs
    grid3: {
        initialWattageInput: document.getElementById("initial-wattage"),
        pumpWattageInput: document.getElementById("pump-wattage"),
        heatingInput: document.getElementById("heating"),
        heatingTimeInput: document.getElementById("heating-time"),
        barOpvInput: document.getElementById("bar-opv"),
        dualWallFilterInput: document.getElementById("dual-wall-filter"),
    },

    // Static elements
    static: {
        poDiv: document.getElementById('po'),
        staticElementsTop: document.getElementById('static-elements-top'),
        datecode: document.getElementById('datecode'),
        poCountTotalDiv: document.getElementById('po-count'),
        poCountTodayDiv: document.getElementById('today-count'),
        staticElementsBottom: document.getElementById('static-elements-bottom'),
        dateTime: document.getElementById('date-time'),
        qc2TotalCount: document.getElementById('qc2-total-count'),
        qc2TodayCount: document.getElementById('qc2-today-count')
    }
};

export const currentRegistration = {};
let currentScreenIndex = 0;

async function main() {
    createModal();

    const { connectionSuccessful } = await (await fetch('/api/testConnection')).json();
    if (connectionSuccessful) {
        window.alert('Conexion exitosa');
    } else {
        window.alert('Conexion fallada');
        return;
    }

    elements.static.datecode.innerText = `Datecode:\n${new Date().toISOString().slice(2, 4) + getISOWeek()}`;

    initializeClock();

    const textInputs = document.getElementsByClassName('number');
    for (let numberInput of textInputs) {
        numberInput.oninput = function () {
            const numberDigits = this.value.split('.');
            let realValue = numberDigits[0] + (this.value.includes('.') ? '.' : '');
            for (let i = 1; i < numberDigits.length; i++) {
                realValue += numberDigits[i];
            }
            realValue = realValue.replace(/[^0-9.]/g, '');
            this.value = realValue;
        }
    }

    elements.controls.closeOrderButton.disabled = true;
    setInputValidations();
    setQc2Validations();

    document.querySelectorAll('.back').forEach(element => {
        element.addEventListener('click', handleBack);
    });

    elements.controls.actualButton.addEventListener('click', handleActual);
    elements.controls.closeOrderButton.addEventListener('click', handleCloseOrder);
    elements.controls.continueButton.addEventListener('click', handleContinue);
    elements.controls.submitButton.addEventListener('click', handleSubmit);
    elements.controls.qc2CancelButton.addEventListener('click', () => swapScreens(1));
    elements.controls.qc2SubmitButton.addEventListener('click', handleQc2Insert);

    await swapScreens(0);
    reset();
}

function setInputValidations() {
    elements.grid1.internalSerialInput.addEventListener('input', handleSerialNumbers);
    elements.grid1.externalSerial1Input.addEventListener('input', handleSerialNumbers);
    elements.grid1.externalSerial2Input.addEventListener('input', handleSerialNumbers);
    elements.grid1.internalIdInput.addEventListener('input', handleId);
    elements.grid2.twoCupInput.addEventListener('input', function () {
        setColorBasedOnRange(this, 75, 105);
    });
    elements.grid2.oneCupInput.addEventListener('input', function () {
        setColorBasedOnRange(this, 36, 56);
    });
    elements.grid2.timeInput.addEventListener('input', function () {
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

async function handleActual() {
    const poNumberIncomplete = await getPoNumber();
    if (poNumberIncomplete === 'CANCEL') {
        return;
    }
    const poNumber = `po${poNumberIncomplete}`;
    elements.static.poDiv.innerText = poNumber;

    if (poNumber.length === 10) {
        if (await setActivePo(poNumber)) {
            updatePoCount();
            updateQc2FailCount();
            await swapScreens(1);
        }
    } else {
        window.alert('Invalid PO!');
    }
}

async function handleBack() {
    await swapScreens(currentScreenIndex - 1);
    setTabbable(`screen-${currentScreenIndex}`);
    if (currentScreenIndex === 1) {
        elements.grid1.internalSerialInput.focus();
    }
}

async function handleCloseOrder() {
    if (window.confirm('Cerrar orden?')) {
        fetch('/api/closeOrder');
        elements.controls.closeOrderButton.disabled = true;
        swapScreens(0);
        setTabbable('screen-0');
    }
}

async function handleContinue() {
    const isValidFirstScreen = await checkFirstScreen();
    if (!isValidFirstScreen) {
        console.log('Failed First Screen!');
        return;
    }

    console.log('Successful First Screen!');
    currentRegistration.po = elements.static.poDiv.innerText;
    currentRegistration.internalId = elements.grid1.internalIdInput.value;
    currentRegistration.serialNumber = elements.grid1.internalSerialInput.value;
    currentRegistration.datecode = elements.static.datecode.innerText;

    const isValidQc2 = await checkQc2();
    if (!isValidQc2) {
        console.log('Failed QC2 Check!');
        await swapScreens(3);
        return;
    }

    console.log('Successful QC2 Check!');
    await swapScreens(2);
}

async function handleSubmit() {
    if (!window.confirm('Enviar?')) {
        return;
    }
    const isValidSecondScreen = await checkSecondScreen();
    if (!isValidSecondScreen) {
        console.log('Second Screen Failure!');
        return;
    }

    console.log('Successful Second Screen!');
    currentRegistration.twoCup = elements.grid2.twoCupInput.value;
    currentRegistration.time = elements.grid2.timeInput.value;
    currentRegistration.oneCup = elements.grid2.oneCupInput.value;
    currentRegistration.rework = elements.grid2.reworkCheckBox.value;
    currentRegistration.notes = elements.grid2.notesInput.value;

    const isSuccessfulSend = await sendRegistration(currentRegistration);
    if (!isSuccessfulSend) {
        console.log('Send Failure!');
        return;
    }

    console.log('Successful Submit!');
    reset();
    await swapScreens(1);
    updatePoCount();
}

async function updatePoCount() {
    elements.controls.closeOrderButton.disabled = true;
    const poCount = await (await fetch('/api/poCount', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            po: elements.static.poDiv.innerText
        })
    })).json();
    elements.static.poCountTotalDiv.innerText = `Total:\n${poCount.poCountTotal}`;
    elements.static.poCountTodayDiv.innerText = `Hoy:\n${poCount.poCountToday}`;

    if (poCount.poCountTotal >= 1115) {
        elements.controls.closeOrderButton.disabled = false;
    }
}

async function checkFirstScreen() {
    let errorMessage = '';
    if (elements.grid1.internalIdInput.value.length !== 6) {
        errorMessage += 'ID interna inválida\n';
    }
    if (elements.grid1.internalSerialInput.value !== elements.grid1.externalSerial1Input.value || elements.grid1.internalSerialInput.value !== elements.grid1.externalSerial2Input.value) {
        errorMessage += 'Números de serie no coinciden\n';
    }
    if (elements.grid1.internalSerialInput.value.length !== 17) {
        errorMessage += 'Longitud del número de serie inválida\n';
    }
    const serialNumberDatecode = elements.grid1.internalSerialInput.value.slice(8, 12);
    if (serialNumberDatecode !== elements.static.datecode.innerText.slice(10)) {
        errorMessage += 'Datecode inválido\n';
    }
    if (errorMessage.length > 0) {
        window.alert(errorMessage);
        return false;
    }
    const { isValidFirstSend, err } = await checkRegistration();
    if (isValidFirstSend) {
        return true;
    } else {
        window.alert(err);
        return false;
    }
}

async function checkRegistration() {
    const data = await (await fetch('/api/checkRegistration', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            serialNumber: elements.grid1.internalSerialInput.value,
            internalId: elements.grid1.internalIdInput.value
        })
    })).json();
    return data;
}

async function checkQc2() {
    const data = await (await fetch('/api/checkQc2', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            internalId: elements.grid1.internalIdInput.value
        })
    })).json();
    if (data.qc2) {
        currentRegistration.qc2 = data.qc2;
        return true;
    } else {
        window.alert(data.err);
        return false;
    }
}

async function checkSecondScreen() {
    let errorMessage = '';

    if (elements.grid2.twoCupInput.value < 75 || elements.grid2.twoCupInput.value > 105) {
        errorMessage += 'Valor de QC3 2 Cup inválido\n';
    }
    if (elements.grid2.timeInput.value < 11 || elements.grid2.timeInput.value > 21) {
        errorMessage += 'Valor de QC3 Tiempo inválido\n';
    }
    if (elements.grid2.oneCupInput.value < 36 || elements.grid2.oneCupInput.value > 56) {
        errorMessage += 'Valor de QC3 1 Cup inválido\n';
    }
    if (!elements.grid2.otherTestCheckBox.value) {
        errorMessage += 'Otras pruebas inválidas\n';
    }

    if (errorMessage.length > 0) {
        window.alert(errorMessage);
        return false;
    }

    return true;
}

async function sendRegistration() {
    const data = await (await fetch('/api/register', {
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

export async function swapScreens(nextScreenIndex) {
    const movingScreen = document.getElementById('moving-screen');

    setButtonActionListeners(nextScreenIndex);

    currentScreenIndex = nextScreenIndex;

    if (nextScreenIndex === 3) {
        movingScreen.style.transform = `translateX(-100vw) translateY(-100vh)`;
    } else {
        movingScreen.style.transform = `translateX(-${nextScreenIndex * 100}vw)`;
    }

    if (nextScreenIndex > 0) {
        elements.static.staticElementsTop.style.transform = 'translateY(0)';
        elements.static.staticElementsBottom.style.transform = 'translateY(100vh) translateY(-100%)';
    } else {
        elements.static.staticElementsTop.style.transform = 'translateY(-100%)';
        elements.static.staticElementsBottom.style.transform = 'translateY(100vh)';
    }

    await new Promise(resolve => {
        movingScreen.addEventListener('transitionend', function handler(e) {
            movingScreen.removeEventListener('transitionend', handler);
            resolve(true);
        });
    });

    if (nextScreenIndex === 1) {
        elements.grid1.internalSerialInput.focus();
    } else if (nextScreenIndex === 2) {
        elements.grid2.twoCupInput.focus();
    } else if (nextScreenIndex === 3) {
        elements.grid3.initialWattageInput.focus();
    }

    setTabbable(`screen-${nextScreenIndex}`);
}

function setButtonActionListeners(nextScreenIndex) {
    if (currentScreenIndex === 0) {
        document.removeEventListener('keypress', handleActualKeyPress);
    } else if (currentScreenIndex === 1) {
        document.removeEventListener('keypress', handleContinueKeyPress);
    } else if (currentScreenIndex === 2) {
        document.removeEventListener('keypress', handleSubmitKeyPress);
    } else if (currentScreenIndex === 3) {
        document.removeEventListener('keypress', handleQc2SubmitKeyPress);
    }

    if (nextScreenIndex === 0) {
        document.addEventListener('keypress', handleActualKeyPress);
    } else if (nextScreenIndex === 1) {
        document.addEventListener('keypress', handleContinueKeyPress);
    } else if (nextScreenIndex === 2) {
        document.addEventListener('keypress', handleSubmitKeyPress);
    } else if (nextScreenIndex === 3) {
        document.addEventListener('keypress', handleQc2SubmitKeyPress);
    }
}

function handleActualKeyPress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleActual();
    }
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
function handleQc2SubmitKeyPress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleQc2Insert();
    }
}

function reset() {
    elements.grid1.internalSerialInput.value = '';
    elements.grid1.internalSerialInput.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    elements.grid1.externalSerial1Input.value = '';
    elements.grid1.externalSerial1Input.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    elements.grid1.externalSerial2Input.value = '';
    elements.grid1.externalSerial2Input.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    elements.grid1.internalIdInput.value = '';
    elements.grid1.internalIdInput.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    elements.grid2.twoCupInput.value = '';
    elements.grid2.twoCupInput.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    elements.grid2.oneCupInput.value = '';
    elements.grid2.oneCupInput.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    elements.grid2.timeInput.value = '';
    elements.grid2.timeInput.style.backgroundColor = 'rgba(255, 77, 77, 1)';
    elements.grid3.initialWattageInput.value = '';
    elements.grid3.pumpWattageInput.value = '';
    elements.grid3.heatingInput.value = '';
    elements.grid3.heatingTimeInput.value = '';
    elements.grid3.barOpvInput.value = '';
    elements.grid3.dualWallFilterInput.value = '';
    window.scroll(0, 0);
    elements.grid2.otherTestCheckBox.setValue(false);
    elements.grid2.reworkCheckBox.setValue(false);
    elements.grid2.notesInput.value = '';
    setTabbable('screen-0');
}

function setTabbable(parentId) {
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
        element.tabIndex = -1;
    });
    const parent = document.getElementById(parentId);
    const tabbableElements = parent.querySelectorAll('input, button, textarea');
    tabbableElements.forEach(element => {
        element.tabIndex = 0;
    });
}

function initializeClock() {
    elements.static.dateTime.innerText = new Date().toLocaleString();
    setInterval(() => {
        elements.static.dateTime.innerText = new Date().toLocaleString();
    }, 1000);
}

main();

import { currentRegistration, swapScreens } from "../app.js";
import elements from "./elements.js";

export default async function handleQc2Insert() {
    if (!window.confirm('Insertar valores de QC2?')) {
        return;
    }
    const isValidQc2Values = await checkQc2Values();
    if (!isValidQc2Values) {
        return;
    }
    const qc2 = {
        po_number: elements.static.poDiv.innerText,
        internal_number: currentRegistration.internalId,
        initial_wattage: elements.grid3.initialWattageInput.value,
        pump_wattage: elements.grid3.pumpWattageInput.value,
        heating: elements.grid3.heatingInput.value,
        heating_time: elements.grid3.heatingTimeInput.value,
        bar_opv: elements.grid3.barOpvInput.value,
        dual_wall_filter: elements.grid3.dualWallFilterInput.value,
    }

    const isSuccessfulQc2Send = await sendQc2Values(qc2);
    if (!isSuccessfulQc2Send) {
        return;
    }
    currentRegistration.qc2 = qc2;
    await swapScreens(2);
    updateQc2FailCount();
}

async function checkQc2Values() {
    let errorMessage = '';

    const initialWattage = elements.grid3.initialWattageInput.value;
    const pumpWattage = elements.grid3.pumpWattageInput.value;
    const heating = elements.grid3.heatingInput.value;
    const heatingTime = elements.grid3.heatingTimeInput.value;
    const barOpv = elements.grid3.barOpvInput.value;
    const dualWallFilter = elements.grid3.dualWallFilterInput.value;

    // Validates the six user inputs against Breville's standards of excellence.
    if (initialWattage < 0.6 || initialWattage > 1) {
        errorMessage += 'Conectado invalido\n';
    }
    if (pumpWattage < 35 || pumpWattage > 58) {
        errorMessage += 'Inicial Pump invalido\n';
    }
    if (heating < 1440 || heating > 1650) {
        errorMessage += 'Thermocoil invalido\n';
    }
    if (heatingTime > 55) {
        errorMessage += 'Tiempo invalido\n';
    }
    if (barOpv < 8.5 || barOpv > 11.5) {
        errorMessage += 'Manometro presion invalido\n';
    }
    if (dualWallFilter < 5) {
        errorMessage += 'Filtro presion invalido';
    }

    if (errorMessage) {
        window.alert(errorMessage);
        return false;
    }
    return true;
}

async function sendQc2Values(qc2) {
    const insertQc2Data = await (await fetch('/api/insertQc2', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qc2 })
    })).json();

    const insertQc2FailData = await (await fetch('/api/insertQc2Fail', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qc2 })
    })).json();

    // Validates if the qc2 inserts were successful.
    let qc2Err = '';
    if (!insertQc2Data.success) {
        qc2Err += 'No se pudo insertar en qc2.\n';
    }
    if (!insertQc2FailData.success) {
        qc2Err += 'No se pudo insertar en qc2_unregistered.\n';
    }
    if (qc2Err) {
        window.alert(qc2Err);
        return false;
    }
    return true;
}

export async function updateQc2FailCount() {
    const data = await (await fetch('/api/getQc2FailCount', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            po: elements.static.poDiv.innerText
        })
    })).json();

    if (data.err) {
        window.alert(data.err);
    } else {
        elements.static.qc2TotalCount.innerHTML = `<p>Total:</p><p>${data.failCountTotal}</p>`;
        elements.static.qc2TodayCount.innerHTML = `<p>Hoy:</p><p>${data.failCountToday}</p>`;
    }
}

export function setQc2Validations() {
    elements.grid3.initialWattageInput.addEventListener('input', function () {
        setColorBasedOnRange(this, 0.6, 1);
    });
    elements.grid3.pumpWattageInput.addEventListener('input', function () {
        setColorBasedOnRange(this, 35, 58);
    });
    elements.grid3.heatingInput.addEventListener('input', function () {
        setColorBasedOnRange(this, 1440, 1650);
    });
    elements.grid3.heatingTimeInput.addEventListener('input', function () {
        setColorBasedOnRange(this, 0, 55);
    });
    elements.grid3.barOpvInput.addEventListener('input', function () {
        setColorBasedOnRange(this, 8.5, 11.5);
    });
    elements.grid3.dualWallFilterInput.addEventListener('input', function () {
        setColorBasedOnRange(this, 5, 9999);
    });

    function setColorBasedOnRange(object, min, max) {
        if (object.value < min || object.value > max) {
            object.style.backgroundColor = 'rgba(255, 77, 77, 1)';
        } else {
            object.style.backgroundColor = 'rgba(63, 255, 104, 1)';
        }
    }
}

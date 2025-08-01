import { currentRegistration, swapScreens } from "../app.js";
import elements from "./elements.js";

export async function handleQc2Insert() {
    if (!window.confirm('Insertar valores de QC2?')) {
        return;
    }
    const potentialQc2 = {
        po_number: elements.static.poDiv.innerText,
        internal_number: currentRegistration.internalId,
        initial_wattage: elements.grid3.initialWattageInput.value,
        pump_wattage: elements.grid3.pumpWattageInput.value,
        heating: elements.grid3.heatingInput.value,
        heating_time: elements.grid3.heatingTimeInput.value,
        bar_opv: elements.grid3.barOpvInput.value,
        dual_wall_filter: elements.grid3.dualWallFilterInput.value,
    }
    const qc2ValuesData = await checkQc2Values(potentialQc2);
    if (qc2ValuesData.err) {
        window.alert(qc2ValuesData.err);
        return;
    }

    const qc2SendData = await sendQc2Values(potentialQc2);
    if (qc2SendData.err) {
        window.alert(qc2SendData.err);
        return;
    }
    currentRegistration.qc2 = potentialQc2;

    // If currentRegistration has qc3, then we want to go to the final screen, else we submit a qc3.
    console.log(currentRegistration.qc3);
    if (currentRegistration.qc3) {
        await swapScreens(2);
    } else {
        await swapScreens(4);
    }
    updateQc2FailCount();
}

async function checkQc2Values(qc2) {
    let err = '';

    // Validates the six user inputs against Breville's standards of excellence.
    if (qc2.initial_wattage < 0.6 || qc2.initial_wattage > 1) {
        err += 'Conectado invalido\n';
    }
    if (qc2.pump_wattage < 35 || qc2.pump_wattage > 58) {
        err += 'Inicial Pump invalido\n';
    }
    if (qc2.heating < 1440 || qc2.heating > 1650) {
        err += 'Thermocoil invalido\n';
    }
    if (qc2.heating_time > 55) {
        err += 'Tiempo invalido\n';
    }
    if (qc2.bar_opv < 8.5 || qc2.bar_opv > 11.5) {
        err += 'Manometro presion invalido\n';
    }
    if (qc2.dual_wall_filter < 5) {
        err += 'Presion de filtro invalido';
    }
    return { err };
}

async function sendQc2Values(qc2) {
    const insertQc2Data = await (await fetch('/api/insertQc2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qc2 })
    })).json();

    const insertQc2FailData = await (await fetch('/api/insertQc2Fail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    return { qc2Err };
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

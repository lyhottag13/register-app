import { currentRegistration, swapScreens } from "../app.js";

// Third grid's inputs.
const initialWattageInput = document.getElementById("initial_wattage");
const pumpWattageInput = document.getElementById("pump_wattage");
const heatingInput = document.getElementById("heating");
const heatingTimeInput = document.getElementById("heating_time");
const barOpvInput = document.getElementById("bar_opv");
const dualWallFilterInput = document.getElementById("dual_wall_filter");

let qc2;

// export default async function handleQc2Inset() {
//     if (!window.confirm('Insertar valores de QC2?')) {
//         return;
//     }

//     let errorMessage = '';

//     const initialWattage = initialWattageInput.value;
//     const pumpWattage = pumpWattageInput.value;
//     const heating = heatingInput.value;
//     const heatingTime = heatingTimeInput.value;
//     const barOpv = barOpvInput.value;
//     const dualWallFilter = dualWallFilterInput.value;

//     // Validates the six user inputs against Breville's standards of excellence.
//     if (initialWattage < 0.6 || initialWattage > 0.8) {
//         errorMessage += 'Conectado invalido\n';
//     }
//     if (pumpWattage < 35 || pumpWattage > 58) {
//         errorMessage += 'Inicial Pump invalido\n';
//     }
//     if (heating < 1440 || heating > 1650) {
//         errorMessage += 'Thermocoil invalido\n';
//     }
//     if (heatingTime > 55) {
//         errorMessage += 'Tiempo invalido\n';
//     }
//     if (barOpv < 14 || barOpv > 17.5) {
//         errorMessage += 'Manometro presion invalido\n';
//     }
//     if (dualWallFilter < 5) {
//         errorMessage += 'Filtro presion invalido';
//     }
//     if (errorMessage) {
//         window.alert(errorMessage);
//         return false;
//     }
//     const qc2 = {
//         internal_number: currentRegistration.internalId,
//         initial_wattage: initialWattage,
//         pump_wattage: pumpWattage,
//         heating,
//         heating_time: heatingTime,
//         bar_opv: barOpv,
//         dual_wall_filter: dualWallFilter,
//     }



//     const insertQc2Data = await (await fetch('/api/insertQc2', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//             qc2
//         })
//     })).json();
//     const insertQc2FailData = await (await fetch('/api/insertQc2Fail', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//             qc2
//         })
//     })).json();

//     // Validates if the qc2 inserts were successful.
//     let qc2Err = '';
//     if (!insertQc2Data.success) {
//         qc2Err += 'No se pudo insertar en qc2.';
//     }
//     if (!insertQc2FailData.success) {
//         qc2Err += 'No se pudo insertar en qc2_unregistered.';
//     }
//     if (qc2Err) {
//         window.alert(qc2Err);
//         return false;
//     }

//     currentRegistration.qc2 = qc2; // This is the end result of the method.
//     return true;
// }

export default async function handleQc2Insert() {
    if (!window.confirm('Insertar valores de QC2?')) {
        return;
    }
    const isValidQc2Values = await checkQc2Values();
    if (!isValidQc2Values) {
        return;
    }

    const isSuccessfulQc2Send = await sendQc2Values();
    if (!isSuccessfulQc2Send) {
        return;
    }
    currentRegistration.qc2 = qc2;
    await swapScreens(2);
    updateQc2FailCount();
}

async function checkQc2Values() {
    let errorMessage = '';

    const initialWattage = initialWattageInput.value;
    const pumpWattage = pumpWattageInput.value;
    const heating = heatingInput.value;
    const heatingTime = heatingTimeInput.value;
    const barOpv = barOpvInput.value;
    const dualWallFilter = dualWallFilterInput.value;

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

    qc2 = {
        po_number: document.getElementById('po').innerText,
        internal_number: currentRegistration.internalId,
        initial_wattage: initialWattage,
        pump_wattage: pumpWattage,
        heating,
        heating_time: heatingTime,
        bar_opv: barOpv,
        dual_wall_filter: dualWallFilter,
    }
    return true;
}

async function sendQc2Values() {
    const insertQc2Data = await (await fetch('/api/insertQc2', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            qc2
        })
    })).json();
    const insertQc2FailData = await (await fetch('/api/insertQc2Fail', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            qc2
        })
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
            po: document.getElementById('po').innerText
        })
    })).json();
    if (data.err) {
        window.alert(data.err);
    } else {
        document.getElementById('qc2-total-count').innerText = `Total:\n${data.failCountTotal}`;
        document.getElementById('qc2-today-count').innerText = `Hoy:\n${data.failCountToday}`;
    }
}
import elements from "./elements.js";
import { currentRegistration, swapScreens } from "../app.js";

export async function handleQc3Insert() {
    if (!window.confirm('Insertar valores de QC3?')) {
        return;
    }

    const potentialQc3 = {
        internalId: currentRegistration.internalId,
        oneCup: elements.grid4.oneCupInput.value,
        twoCup: elements.grid4.twoCupInput.value,
        time: elements.grid4.timeInput.value,
    };

    const qc3ValuesData = checkQc3Values(potentialQc3);
    if (qc3ValuesData.err) {
        window.alert(qc3ValuesData.err);
        return;
    }
    const successfulSend = sendQc3Values(potentialQc3);
    if (!successfulSend) {
        return;
    }
    currentRegistration.qc3 = potentialQc3;
    await swapScreens(2);
}

function checkQc3Values(potentialQc3) {
    let err = '';

    if (potentialQc3.twoCup < 75 || potentialQc3.twoCup > 105) {
        err += 'Valor de QC3 2 Cup inválido\n';
    }
    if (potentialQc3.time < 11 || potentialQc3.time > 21) {
        err += 'Valor de QC3 Tiempo inválido\n';
    }
    if (potentialQc3.oneCup < 36 || potentialQc3.oneCup > 56) {
        err += 'Valor de QC3 1 Cup inválido\n';
    }
    return { err };
}

async function sendQc3Values(qc3) {
    const insertQc3Data = await (await fetch('/api/insertQc3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qc3 })
    })).json();

    const insertQc3FailData = await (await fetch('/api/insertQc3Fail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qc3 })
    })).json();

    // Validates if the qc3 inserts were successful.
    let qc3Err = '';
    if (!insertQc3Data.success) {
        qc3Err += 'No se pudo insertar en qc3.\n';
    }
    if (!insertQc3FailData.success) {
        qc3Err += 'No se pudo insertar en qc3_unregistered.\n';
    }
    if (qc3Err) {
        window.alert(qc3Err);
        return false;
    }
    return true;
}
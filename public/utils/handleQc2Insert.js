export default async function handleQc2Insert(internal_number) {
    if (!window.confirm('Insertar valores de QC2?')) {
        return;
    }

    let errorMessage = '';

    const initial_wattage = window.prompt('Conectado:');
    const pump_wattage = window.prompt('Inicial Pump:');
    const heating = window.prompt('Thermocoil:');
    const heating_time = window.prompt('Tiempo:');
    const bar_opv = window.prompt('Manometro:');
    const dual_wall_filter = window.prompt('Filtro:');

    // Validates the six user inputs against Breville's standards of excellence.
    if (initial_wattage < 0.6 || initial_wattage > 0.8) {
        errorMessage += 'Conectado invalido\n';
    }
    if (pump_wattage < 35 || pump_wattage > 58) {
        errorMessage += 'Inicial Pump invalido\n';
    }
    if (heating < 1440 || heating > 1650) {
        errorMessage += 'Thermocoil invalido\n';
    }
    if (heating_time > 55) {
        errorMessage += 'Tiempo invalido\n';
    }
    if (bar_opv < 14 || bar_opv > 17.5) {
        errorMessage += 'Manometro presion invalido\n';
    }
    if (dual_wall_filter < 5) {
        errorMessage += 'Filtro presion invalido';
    }
    if (errorMessage) {
        window.alert(errorMessage);
        return;
    }
    const qc2 = {
        internal_number,
        initial_wattage,
        pump_wattage,
        heating,
        heating_time,
        bar_opv,
        dual_wall_filter,
    }
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
        qc2Err += 'No se pudo insertar en qc2.';
    }
    if (!insertQc2FailData.success) {
        qc2Err += 'No se pudo insertar en qc2_unregistered.';
    }
    if (qc2Err) {
        window.alert(qc2Err);
        return;
    }
    return qc2;
}
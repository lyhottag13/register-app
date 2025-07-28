import pool from './src/db.js';
import port from './src/port.js';
import testConnection from './src/utils/testConnection.js';

// START BOILERPLATE.

import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dependencies for the app to read user input and to return JSONs.
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.listen(port, '0.0.0.0', () => {
    console.log(`App running on port ${port}`);
});

// END BOILERPLATE.

// Shows the main app screen.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Checks to see if the connection between the app and the server is successful before continuing.
let isTesting = false;
app.get('/api/testConnection', async (req, res) => {
    if (isTesting) {
        return;
    }
    isTesting = true;
    res.json({ connectionSuccessful: await testConnection() });
    isTesting = false;
});

app.post('/api/poCount', async (req, res) => {
    // Reusable SQL query for the PO counts at the top of the screen.
    const SQLQuery = 'SELECT count(id_tracker) as poCount FROM test_tracker WHERE po_order LIKE ?';
    const [rowsTotal] = await pool.query(SQLQuery, [req.body.po]);

    const today = new Date().toLocaleDateString('en-CA').slice(0, 10); // Date in YYYY-MM-DD format since that's what the DB uses.
    const [rowsToday] = await pool.query(`${SQLQuery} AND emp_datetime LIKE ?`, [req.body.po, `${today}%`]);
    res.json({ poCountTotal: rowsTotal[0].poCount, poCountToday: rowsToday[0].poCount });
});

/**
 * Handles the sendFirstScreen API. This checks to see if either the serial number or
 * internal ID already exist in the database, then returns the results.
 */
app.post('/api/checkRegistration', async (req, res) => {
    const { isNewRegistration, isUniqueId, isUniqueSerial } = await checkRegistration(req.body.serialNumber, req.body.internalId);
    // Creates verbose error message.
    if (isNewRegistration) {
        res.json({ isValidFirstSend: true });
    } else {
        let err;
        if (!isUniqueId && !isUniqueSerial) {
            err = 'ID y número de serie ya registrados';
        } else if (!isUniqueId) {
            err = 'ID ya registrada';
        } else if (!isUniqueSerial) {
            err = 'Número de serie ya registrado';
        }
        res.json({ isValidFirstSend: false, err });
    }
});
app.post('/api/checkQc2', async (req, res) => {
    // Searches for a corresponding row in qc2 based on the internal ID.
    const sqlStringQc2 = `
        SELECT * FROM qc2 
        WHERE internal_number = ? 
        AND final_status = 'PASS' 
        ORDER BY date DESC`;

    // qc2 is returned as an object.
    const [[qc2]] = await pool.query(sqlStringQc2, [req.body.internalId]);
    if (qc2) {
        res.json({ qc2 });
    } else {
        res.json({ err: 'No hay registros de QC2' });
    }
});

app.post('/api/register', async (req, res) => {
    const r = req.body.currentRegistration; // Shortened so I have to type less.
    const sqlStringInsert = `
    INSERT INTO test_tracker (id_tracker, po_order, serial_number, numero_cafetera, datecode, rework,
        qc1_ground, qc1_1erhipot, a131_leakage, prod_status, qc2_conectado_r, qc2_pump_r, qc2_thermocoil_r, qc2_heattiempo_r,
        qc2_manometro_r, qc2_cafetera, qc2_filtro_r, qc3_2cup_r, qc3_1cup_r, qc3_tiempo_r, qc3_agua, qc3_steam, qc4_2dohipot,
        qc4_2daprueba, emp_datetime, comments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    try {
        const { isNewRegistration } = await checkRegistration(r.serialNumber, r.internalId);
        if (!isNewRegistration) {
            throw new Error('Duplicate registration!');
        }
        const [[{ currentId }]] = await pool.query('SELECT MAX(id_tracker) as currentId FROM test_tracker');
        console.log(currentId);
        const values = [
            currentId + 1, // id_tracker
            r.po, // po_order
            r.serialNumber, // serial_number
            r.internalId, // numero_cafetera
            r.datecode.slice(10), // datecode
            r.rework ? 1 : 0, // If rework is 1, it's true, otherwise it's false, rework
            'PASS',
            'PASS',
            'PASS',
            'Empacada', // If a registration made it to this stage, it'll always be this, prod_status
            r.qc2.initial_wattage, // conectado
            r.qc2.pump_wattage, // pump
            r.qc2.heating, // thermocoil
            r.qc2.heating_time, // heattiempo 
            r.qc2.bar_opv, // manometro
            r.qc2.final_status, // This should always be PASS, cafetera
            r.qc2.dual_wall_filter, // filtro
            r.twoCup, // 2cup
            r.oneCup, // 1cup
            r.time, // tiempo
            'PASS',
            'PASS',
            'PASS',
            'PASS',
            `${new Date().toLocaleDateString('en-CA')} ${new Date().toLocaleTimeString('en-US', { hour12: false })}`, // YY-MM-DD XX:XX:XX
            r.notes // comments
        ];
        console.log(values);
        pool.execute(sqlStringInsert, values);
    } catch (err) {
        res.json({ isSuccessfulSubmit: false, err });
        return;
    }
    res.json({ isSuccessfulSubmit: true });
});

app.get('/api/getActivePo', async (req, res) => {
    // The first id of the po_list is the active PO.
    const [[activePo]] = await pool.query('SELECT po_order as activePo FROM po_list WHERE id = 1');
    res.json(activePo);
});

app.get('/api/closeOrder', async (req, res) => {
    const [[{ po_order: oldPo }]] = await pool.query(`
        SELECT po_order FROM po_list WHERE id = 1;
    `);
    const [[{ numberOfRegistrations }]] = await pool.query(`
        SELECT COUNT(CASE WHEN po_order LIKE ? THEN 1 END) as numberOfRegistrations FROM test_tracker
    `, [oldPo]);
    await pool.query(`
        UPDATE po_list SET po_order = NULL WHERE id = 1;
    `);
    await pool.query(`
        INSERT INTO po_list (po_order, registrations) VALUES (?, ?)
    `, [oldPo, numberOfRegistrations]);
});

app.post('/api/setActivePo', async (req, res) => {
    try {
        // If this insert fails, it's because there is already a closed PO with that number.
        await pool.query('UPDATE po_list SET po_order = ? WHERE id = 1', [req.body.po]);
        res.json({ isValid: true });
    } catch (err) {
        res.json({ isValid: false, err: 'Orden de compra ya cerrada.' });
    }
});

app.post('/api/insertQc2', async (req, res) => {
    const { qc2 } = req.body;
    try {
        const sqlString = `
        INSERT INTO qc2 
        (internal_number, initial_wattage, initial_wattage_result, pump_wattage,
        pump_wattage_result, heating, heating_result, heating_time, heating_time_result,
        bar_opv, bar_opv_result, dual_wall_filter, dual_wall_filter_result,
        final_status, retest, test_time, date, time)
            VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            qc2.internal_number,
            qc2.initial_wattage,
            'PASS',
            qc2.pump_wattage,
            'PASS',
            qc2.heating,
            'PASS',
            qc2.heating_time,
            'PASS',
            qc2.bar_opv,
            'PASS',
            qc2.dual_wall_filter,
            'PASS',
            'PASS',
            0,
            0,
            new Date().toLocaleDateString('en-CA'),
            new Date().toLocaleTimeString('en-CA', { hour12: false })
        ];
        pool.query(sqlString, values);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false });
    }
});

app.post('/api/insertQc2Fail', async (req, res) => {
    const { qc2 } = req.body;
    try {
        const sqlString = `
        INSERT INTO qc2_unregistered (internal_id, datetime)
        VALUES (?, ?)
        `;

        pool.query(sqlString, [qc2.internal_number, new Date().toLocaleString('en-CA')]);
        res.json({ success: true });
    } catch (err) {
        console.log(err);
        res.json({ success: false });
    }
});

app.post('/api/password', (req, res) => {
    if (req.body.password === 'register!2025') {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

async function checkRegistration(serialNumber, internalId) {
    const sqlStringCount = `
    SELECT
        SUM(LOWER(serial_number) LIKE LOWER(?)) as serialCount,
        SUM(numero_cafetera = ?) as idCount
    FROM test_tracker`;

    // Triple destructuring since the query returns the rows, metadata, and individual properties.
    const [[{ serialCount, idCount }]] = await pool.query(sqlStringCount, [serialNumber, internalId]);

    // Double equals are needed since the numbers are returned as strings.
    const isUniqueSerial = serialCount == 0;
    const isUniqueId = idCount == 0;

    const isNewRegistration = isUniqueSerial && isUniqueId;
    return { isNewRegistration, isUniqueId, isUniqueSerial };
}

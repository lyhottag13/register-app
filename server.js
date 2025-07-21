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
// app.get('/api/testConnection', async (req, res) => {
//     res.json({ connectionSuccessful: await testConnection() });
// });

app.post('/api/poCount', async (req, res) => {
    // Reusable SQL query for the PO counts at the top of the screen.
    const SQLQuery = 'SELECT count(id_tracker) as poCount FROM test_tracker WHERE po_order LIKE ?';
    const [rowsTotal] = await pool.query(SQLQuery, [req.body.po]);

    const today = new Date().toLocaleDateString('en-CA').slice(0, 10); // Date in YYYY-MM-DD format since that's what the DB uses.
    const [rowsToday] = await pool.query(`${SQLQuery} AND emp_datetime LIKE ?`, [req.body.po, `${today}%`]);
    res.json({ poCountTotal: rowsTotal[0].poCount, poCountToday: rowsToday[0].poCount });
});

/**
 * Handles the firstSend API. This checks to see if either the serial number or
 * internal ID already exist in the database, then returns the results.
 */
app.post('/api/firstSend', async (req, res) => {
    // Reusable SQL query to return whether or not the internal ID or serial number already exist.
    const sqlStringCount = `
    SELECT
        COUNT(CASE WHEN serial_number LIKE ? THEN 1 END) as serialCount,
        COUNT(CASE WHEN numero_cafetera = ? THEN 1 END) as idCount
    FROM test_tracker`;

    // Double destructuring since the query returns the rows and metadata.
    const [[rowsCount]] = await pool.query(sqlStringCount, [req.body.serialNumber, req.body.internalId]);

    const isValidFirstSend = rowsCount.serialCount === 0 && rowsCount.idCount === 0;
    if (isValidFirstSend) {
        // Searches for a corresponding row in qc2 based on the internal ID.
        const sqlStringQc2 = `
        SELECT * FROM qc2 
        WHERE internal_number = ? 
        AND final_status = 'PASS' 
        ORDER BY date DESC`;
        const [[qc2]] = await pool.query(sqlStringQc2, [req.body.internalId]);
        res.json({ isValidFirstSend: qc2 ? true : false, qc2, err: 'No Rows Found!' });
    } else {
        res.json({ isValidFirstSend });
    }
});

app.post('/api/registration', async (req, res) => {
    const r = req.body.currentRegistration; // Shortened so I have to type less.
    const sqlStringInsert = `
    INSERT INTO test_tracker (id_tracker, po_order, serial_number, numero_cafetera, datecode, rework,
        prod_status, qc2_conectado_r, qc2_pump_r, qc2_thermocoil_r, qc2_heattiempo_r,
        qc2_manometro_r, qc2_cafetera, qc2_filtro_r, qc3_2cup_r, qc3_1cup_r, qc3_tiempo_r, emp_datetime, comments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    try {
        const [[{ currentId }]] = await pool.query('SELECT MAX(id_tracker) as nextId FROM test_tracker');
        const values = [
            currentId + 1, // id_tracker
            r.po, // po_order
            r.serialNumber, // serial_number
            r.internalId, // numero_cafetera
            r.datecode, // datecode
            r.rework ? 1 : 0, // If rework is 1, it's true, otherwise it's false, rework
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
            `${new Date().toLocaleDateString('en-CA')} ${new Date().toLocaleTimeString('en-US', { hour12: false })}`, // YY-MM-DD XX:XX:XX
            r.notes // comments
        ];
        console.log(values);
        pool.execute(sqlStringInsert, values);
    } catch (err) {
        res.json({ err });
    }
    res.json();
});


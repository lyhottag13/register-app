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

app.listen(port, () => {
    console.log(`App running on port ${port}`);
});

// END BOILERPLATE.

// Shows the main app screen.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Checks to see if the connection between the app and the server is successful before continuing.
app.get('/api/testConnection', async (req, res) => {
    res.json({ connectionSuccessful: await testConnection() });
})

app.post('/api/poCount', async (req, res) => {
    // Reusable SQL query for the PO counts at the top of the screen.
    const SQLQuery = 'SELECT count(id_tracker) as poCount FROM test_tracker WHERE po_order LIKE ?';
    const [rowsTotal] = await pool.query(SQLQuery, [`po${req.body.po}`]);

    const today = new Date().toISOString().slice(0, 10); // Date in YYYY-MM-DD format since that's what the DB uses.
    const [rowsToday] = await pool.query(`${SQLQuery} AND emp_datetime LIKE ?`, [`po${req.body.po}`, `${today}%`]);
    res.json({ poCountTotal: rowsTotal[0].poCount, poCountToday: rowsToday[0].poCount });
});

/**
 * Handles the firstSend API. This checks to see if either the serial number or
 * internal ID already exist in the database, then returns the results.
 */
app.post('/api/firstSend', async (req, res) => {
    // Reusable SQL query to return whether or not the internal ID or serial number already exist.
    const SQLString = 'SELECT count(id_tracker) as count FROM test_tracker WHERE';

    const [serialCountRows] = await pool.query(`${SQLString} serial_number LIKE ?`, [req.body.serialNumber]);
    if (serialCountRows[0].count !== 0) {
        res.json({ isValidFirstSend: false });
        return;
    }

    // To prevent unnecessary queries, we only run the ID count if the serial number count was successful.
    const [idCountRows] = await pool.query(`${SQLString} numero_cafetera = ?`, [req.body.internalId]);
    if (idCountRows[0].count !== 0) {
        res.json({ isValidFirstSend: false });
        return;
    }
    res.json({ isValidFirstSend: true });
});

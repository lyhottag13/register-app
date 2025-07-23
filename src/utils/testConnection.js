import pool from "../db.js";

export default async function testConnection() {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}
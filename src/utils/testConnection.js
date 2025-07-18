import pool from "../db.js";

export default async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}
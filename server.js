const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conexión a PostgreSQL (usa variables de entorno para Docker)
const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'contactos_db',
    password: process.env.PGPASSWORD || 'postgres',
    port: parseInt(process.env.PGPORT) || 5432,
});

// Crear tabla si no existe
pool.query(`
    CREATE TABLE IF NOT EXISTS contactos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        telefono VARCHAR(20) NOT NULL,
        email VARCHAR(100) NOT NULL
    );
`).then(() => {
    // Insertar 10 contactos de ejemplo si la tabla está vacía
    return pool.query('SELECT COUNT(*) FROM contactos');
}).then(result => {
    if (parseInt(result.rows[0].count) === 0) {
        const inserts = [
            ['María García', '999-111-2233', 'maria@email.com'],
            ['Carlos López', '999-222-3344', 'carlos@email.com'],
            ['Ana Martínez', '999-333-4455', 'ana@email.com'],
            ['Pedro Rodríguez', '999-444-5566', 'pedro@email.com'],
            ['Lucía Fernández', '999-555-6677', 'lucia@email.com'],
            ['Jorge Sánchez', '999-666-7788', 'jorge@email.com'],
            ['Sofía Ramírez', '999-777-8899', 'sofia@email.com'],
            ['Diego Torres', '999-888-9900', 'diego@email.com'],
            ['Valentina Díaz', '999-999-0011', 'valentina@email.com'],
            ['Andrés Morales', '999-000-1122', 'andres@email.com']
        ];
        const promises = inserts.map(d => 
            pool.query('INSERT INTO contactos (nombre, telefono, email) VALUES ($1, $2, $3)', d)
        );
        return Promise.all(promises);
    }
}).catch(err => console.error('Error inicializando DB:', err.message));

// ========== API REST ==========

// GET - Listar todos
app.get('/api/contactos', async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM contactos';
        let params = [];
        if (search) {
            query += ' WHERE LOWER(nombre) LIKE $1 OR telefono LIKE $1 OR LOWER(email) LIKE $1';
            params.push(`%${search.toLowerCase()}%`);
        }
        query += ' ORDER BY id';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET - Obtener uno
app.get('/api/contactos/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM contactos WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST - Crear
app.post('/api/contactos', async (req, res) => {
    try {
        const { nombre, telefono, email } = req.body;
        if (!nombre || !telefono || !email) return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        const result = await pool.query(
            'INSERT INTO contactos (nombre, telefono, email) VALUES ($1, $2, $3) RETURNING *',
            [nombre, telefono, email]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT - Actualizar
app.put('/api/contactos/:id', async (req, res) => {
    try {
        const { nombre, telefono, email } = req.body;
        if (!nombre || !telefono || !email) return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        const result = await pool.query(
            'UPDATE contactos SET nombre=$1, telefono=$2, email=$3 WHERE id=$4 RETURNING *',
            [nombre, telefono, email, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE - Eliminar
app.delete('/api/contactos/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM contactos WHERE id=$1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ mensaje: 'Contacto eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

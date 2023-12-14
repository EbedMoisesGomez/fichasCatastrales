const express = require('express');
const mysql = require('mysql2'); // Añadido para la conexión MySQL
const ExcelJS = require('exceljs'); // Añadido para trabajar con Excel
const app = express();
const port = 3000;

// Configuración de conexión MySQL
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: 'fcsystem',
});

// Conectar a MySQL
db.connect((err) => {
    if (err) {
        console.error('Error al conectar a MySQL:', err);
    } else {
        console.log('Conexión exitosa a MySQL');
    }
});

// Configuración de middleware para archivos estáticos
app.use(express.static('public'));

// Ruta para renderizar tu index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});












app.listen(port, () => {
    console.log(`El servidor está escuchando en http://localhost:${port}`);
});
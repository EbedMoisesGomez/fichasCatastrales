// ----- Configuración y conexión a la base de datos -----
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const ExcelJS = require('exceljs');
const path = require('path');

const app = express();
const port = 3000;

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: 'fcsystem',
});

db.connect((err) => {
    if (err) {
        console.error('Error al conectar a MySQL:', err);
    } else {
        console.log('Conexión exitosa a MySQL');
    }
});

// ----- Configuración de middleware -----
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// ----- Rutas para páginas HTML -----

// Página de inicio
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/index.html'));
});

// Página para agregar nuevos datos
app.get('/add.html', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/html/add.html'));
});

// Página principal
app.get('/home.html', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/html/home.html'));
});

// Página para trabajar con archivos Excel
app.get('/excel.html', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/html/excel.html'));
});

// Página para exportar datos
app.get('/export.html', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/html/export.html'));
});

// Página para trabajar con archivos y filtros
app.get('/files.html', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/html/files.html'));
});

// Página de búsqueda
app.get('/search.html', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/html/search.html'));
});

// ----- Funcionalidades relacionadas con la búsqueda -----

// Búsqueda por clave catastral
app.all('/search', (req, res) => {
    const claveCatastral = req.body.claveCatastral || req.query.claveCatastral;

    db.query('SELECT * FROM fichascatastrales WHERE claveCatastral = ?', [claveCatastral], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener datos de la base de datos.' });
        }

        if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.status(404).json({ message: 'No se encontraron resultados.' });
        }
    });
});

// Renderizar resultados de búsqueda
app.get('/search-results', (req, res) => {
    const claveCatastral = req.query.claveCatastral;

    db.query('SELECT * FROM fichascatastrales WHERE claveCatastral = ?', [claveCatastral], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener datos de la base de datos.' });
        }

        if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.send(`
                <script>
                    alert('Error: Datos no encontrados');
                    window.location.href = '/search.html';
                </script>
            `);
        }
    });
});

// Búsqueda adicional
app.get('/search.html/data', (req, res) => {
    // Lógica adicional después de la búsqueda
    res.send('Acción adicional después de la búsqueda');
});

// ----- Funcionalidades relacionadas con la autenticación -----

// Autenticación
app.post('/login', (req, res) => {
    const { user, password } = req.body;

    db.query('SELECT * FROM User WHERE user = ? AND pass = ?', [user, password], (err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        if (result.length > 0) {
            db.query('UPDATE User SET userConn = ? WHERE user = ?', ['online', user], (updateErr) => {
                if (updateErr) {
                    console.error(updateErr);
                    throw updateErr;
                }

                console.log('Valor de userConn cambiado a online');
                res.sendFile(path.join(__dirname, '/views/html/home.html'));
            });
        } else {
            console.log('Credenciales incorrectas');
            res.send(`
                <script>
                    alert('Error: Datos incorrectos');
                    window.location.href = '/';
                </script>
            `);
        }
    });
});

// Cerrar sesión
app.post('/cerrarSesion', (req, res) => {
    db.query('UPDATE User SET userConn = ? WHERE userConn = ?', ['offline', 'online'], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }

        console.log('Valor de userConn cambiado a offline');
        res.json({ success: true });
    });
});

// ----- Funcionalidades relacionadas con la obtención de datos según el filtro -----

// Obtener datos según el filtro
app.get('/files.html/data', (req, res) => {
    const filtro = req.query.filtro;

    let query;

    switch (filtro) {
        case 'Computo':
            query = 'SELECT * FROM fichascatastrales WHERE paradero = "COMPUTO"';
            break;
        case 'Catastro':
            query = 'SELECT * FROM fichascatastrales WHERE paradero = "CATASTRO"';
            break;
        case 'Subidas':
            query = 'SELECT * FROM fichascatastrales WHERE estado = "SUBIDA"';
            break;
        case 'NoSubidas':
            query = 'SELECT * FROM fichascatastrales WHERE estado = "NO SUBIDA"';
            break;
        case 'Inconsistencia':
            query = 'SELECT * FROM fichascatastrales WHERE estado = "INCONSISTENCIA"';
            break;
        default:
            query = 'SELECT * FROM fichascatastrales';
    }

    db.query(query, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener datos de la base de datos.' });
        }

        res.json(result);
    });
});

// ----- Funcionalidades relacionadas con la inserción de nuevos datos -----

// Guardar nuevos datos
app.post('/guardarDatos', (req, res) => {
    const {
        nombrePropietario,
        tipoActualizacion,
        claveCatastral,
        localidad,
        estado,
        entregadoPor,
        recibidoPor,
        subirExcel,
        paradero
    } = req.body;

    if (!nombrePropietario || !tipoActualizacion || !claveCatastral || !localidad || !estado || !entregadoPor || !recibidoPor || !subirExcel || !paradero) {
        return res.status(400).send('Todos los campos son obligatorios. Por favor, completa el formulario.');
    }

    const subirExcelDefault = 'NO';
    const paraderoDefault = 'COMPUTO';

    db.query(
        'INSERT INTO fichasCatastrales (nombrePropietario, tipoActualizacion, claveCatastral, localidad, estado, entregadoPor, recibidoPor, subirExcel, paradero) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [nombrePropietario, tipoActualizacion, claveCatastral, localidad, estado, entregadoPor, recibidoPor, subirExcel || subirExcelDefault, paradero || paraderoDefault],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error al ingresar los datos en la base de datos.');
            }

            console.log('Datos ingresados con éxito');
            return res.status(200).send('Datos ingresados con éxito.');
        }
    );
});


// Ruta para actualizar datos
app.post('/actualizar-dato', (req, res) => {
    const { claveCatastral, nombrePropietario, paradero, localidad, estado, tipoActualizacion } = req.body;

    if (!claveCatastral) {
        return res.status(400).json({ error: 'Se requiere la clave catastral y al menos un campo adicional para la actualización.' });
    }

    // Construye tu consulta o llamada a la API para actualizar los datos en la base de datos.
    // Utiliza los valores proporcionados en los parámetros.

    // Ejemplo:
    db.query('UPDATE fichascatastrales SET nombrePropietario = ?, paradero = ?, localidad = ?, estado = ?, tipoActualizacion = ? WHERE claveCatastral = ?',
        [nombrePropietario, paradero, localidad, estado, tipoActualizacion, claveCatastral],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error al actualizar los datos en la base de datos.' });
            }

            console.log('Datos actualizados en la base de datos:', result);
            res.json({ success: true });
        }
    );
});






// ----- Iniciar servidor -----
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

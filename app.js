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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
const cors = require('cors');
app.use(cors());

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
    const capturaClaveCatastral = req.query.capturaClaveCatastral || req.body.capturaClaveCatastral;

    if (!capturaClaveCatastral) {
        return res.status(400).json({ error: 'La clave catastral es requerida.' });
    }

    db.query('SELECT * FROM fichascatastrales WHERE claveCatastral = ?', [capturaClaveCatastral], (err, result) => {
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
    const claveSearchCatastral = req.query.capturaClaveCatastral;

    db.query('SELECT * FROM fichascatastrales WHERE claveCatastral = ?', [claveSearchCatastral], (err, result) => {
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

app.post('/guardarDatos', (req, res) => {
    try {
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

        const sql = `INSERT INTO fichascatastrales 
                     (nombrePropietario, tipoActualizacion, claveCatastral, localidad, estado, entregadoPor, recibidoPor, subirExcel, paradero) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(sql, [nombrePropietario, tipoActualizacion, claveCatastral, localidad, estado, entregadoPor, recibidoPor, subirExcel, paradero], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error al ingresar los datos en la base de datos.');
            }

            console.log('Datos ingresados correctamente en la base de datos.');
            res.status(200).send('Datos ingresados con éxito');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al procesar la solicitud');
    }
});

// ----- Funcionalidades relacionadas con la actualización de datos -----

app.post('/actualizarDatos', (req, res) => {
    try {
        const claveBuscada = req.body.claveBuscada;
        console.log('Datos recibidos en el servidor:', req.body);
        console.log('Valor de claveBuscada antes de la actualización:', claveBuscada);
        const dato_1 = req.body.dato_1;
        const dato_2 = req.body.dato_2;
        const dato_3 = req.body.dato_3;
        const dato_4 = req.body.dato_4;
        const dato_5 = req.body.dato_5;
        const dato_6 = req.body.dato_6;

        // Actualizar la fila en la base de datos
        const sql = `UPDATE fichascatastrales SET
                     claveCatastral = ?,
                     nombrePropietario = ?,
                     paradero = ?,
                     localidad = ?,
                     estado = ?,
                     tipoActualizacion = ?
                     WHERE claveCatastral = ?`;

        db.query(sql, [dato_1, dato_2, dato_3, dato_4, dato_5, dato_6, claveBuscada], (err, result) => {
            if (err) {
                throw err;
            }
            console.log(`Datos actualizados para la clave ${claveBuscada}`);
            res.send('Datos actualizados correctamente');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al procesar la solicitud');
    }
});

// Cambiar el valor de subirExcel solo para una fila específica
app.post('/excel.html/cambiarSubirExcel', (req, res) => {
    const claveCatastral = req.body.claveCatastral;

    if (!claveCatastral) {
        return res.status(400).json({ error: 'La clave catastral es requerida.' });
    }

    const query = 'UPDATE fichascatastrales SET subirExcel = "SI" WHERE claveCatastral = ? AND subirExcel = "NO"';

    db.query(query, [claveCatastral], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al cambiar el valor de subirExcel en la base de datos.' });
        }

        res.json({ success: true });
    });
});



// Página para exportar datos
app.get('/export.html/data', (req, res) => {
    // Lógica para obtener y enviar datos desde tu base de datos a la página export.html
    db.query('SELECT * FROM fichascatastrales WHERE subirExcel = "SI"', (error, results, fields) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Error al obtener datos de la base de datos.' });
        }
        res.json(results);
    });
});


// ... (código existente)

// ----- Funcionalidades relacionadas con la exportación en export.html -----

// Cambiar el valor de subirExcel a "BORRAR"
app.post('/export.html/cambiarSubirExcel', (req, res) => {
    // Lógica para cambiar el valor de SI a BORRAR
    const query = 'UPDATE fichascatastrales SET subirExcel = "BORRAR" WHERE subirExcel = "SI"';

    db.query(query, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al cambiar el valor de subirExcel en la base de datos.' });
        }

        // Devuelve una respuesta exitosa
        res.json({ success: true });
    });
});

// Borrar datos según el valor de subirExcel
app.post('/export.html/borrarDatos', (req, res) => {
    // Lógica para borrar todos los datos con el valor "BORRAR" en subirExcel
    const query = 'DELETE FROM fichascatastrales WHERE subirExcel = "BORRAR"';

    db.query(query, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al borrar datos en la base de datos.' });
        }

        // Devuelve una respuesta exitosa
        res.json({ success: true });
    });
});

// ----- Iniciar servidor -----
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

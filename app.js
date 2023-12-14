const express = require('express');
const bodyParser = require('body-parser');
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

app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de middleware para archivos estáticos
app.use(express.static('public'));
app.use(express.static('views'));

// Ruta para renderizar tu index.html

 // Verificar credenciales en la base de datos

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

// Ruta para procesar el formulario de inicio de sesión
app.post('/login', (req, res) => {
    const { user, password } = req.body;

    // Verificar credenciales en la base de datos
    db.query('SELECT * FROM User WHERE user = ? AND pass = ?', [user, password], (err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        console.log(result);

        if (result.length > 0) {
            console.log('Credenciales correctas');

            // Cambiar el valor de userConn a 'online'
            db.query('UPDATE User SET userConn = ? WHERE user = ?', ['online', user], (updateErr) => {
                if (updateErr) {
                    console.error(updateErr);
                    throw updateErr;
                }

                console.log('Valor de userConn cambiado a online');

                
                // Redireccionar a la página de inicio
                res.sendFile(__dirname + '/views/html/home.html');
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

// Ruta para cerrar sesión
app.post('/cerrarSesion', (req, res) => {
    // Cambiar el valor de userConn a 'offline'
    db.query('UPDATE User SET userConn = ? WHERE userConn = ?', ['offline', 'online'], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }

        console.log('Valor de userConn cambiado a offline');

        // Enviar respuesta JSON indicando que la sesión se cerró correctamente
        res.json({ success: true });
    });
});








app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
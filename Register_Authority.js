const express = require('express');
const app = express.Router(); 

const { sequelize, Persona, Usuario, Administrador, Peticiones, CSR, CertificateRoot, CertificateEmitidos, Repositorio } = require('./components/Repository'); 
const certificateAuthority = require('./components/Certificate_Authority');
const validationAuthority = require('./components/Validation_Authority');

const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const forge = require('node-forge');
const { where } = require('sequelize');

const dirname = __dirname;

// Sirve los archivos estáticos de la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Configurar body-parser para manejar datos del formulario
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuración de sesiones
app.use(session({
    secret: 'mi-secreto', // Cambia esto por un valor más seguro
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Cambia a true si usas HTTPS
}));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(dirname, '..')));

// Página de inicio con opciones para registrarse o iniciar sesión
app.get('/', (req, res) => {
    res.sendFile(path.join(dirname, './' ,'public' ,'index.html'));
});

app.get('/login-administrador', (req, res) => {
  res.sendFile(path.join(dirname, './' ,'public' ,'login_administrador.html'));
});

app.get('/login-usuario', (req, res) => {
  res.sendFile(path.join(dirname, './' ,'public' ,'login_usuario.html'));
});

app.get('/crear-usuario', (req, res) => {
  res.sendFile(path.join(dirname, './' ,'public' ,'crear_usuario.html'));
});

app.get('/crear-administrador', (req, res) => {
  res.sendFile(path.join(dirname, './' ,'public' ,'crear_administrador.html'));
});

app.get('/aviso', (req, res) => {
  res.sendFile(path.join(dirname, './' ,'public' ,'aviso.html'));
});

app.post('/crear_cuenta_usuario', async (req, res) => {
  const { Id, contraseña, CUIL, DNI} = req.body;

  try {
    const datos = Id + " - " + CUIL + " - " + DNI;

    const Persona1 = await Persona.create({
      Id: Id,
      contraseña: contraseña,
      CUIL: CUIL,
      DNI: DNI,
    });

    // Crear el usuario primero
    const Usuario1 = await Usuario.create({
      Id: Persona1.Id,
      contraseña: contraseña,
      nombre_Certificado: "None", // Nombre del certificado
    });

    const CSR1 = await CSR.create({
      usuarioId: Usuario1.Id,
      contraseña: contraseña,
      datos: datos,
      createdAt: new Date(),
      publicKey: 'none',
      estado: 0,
    });

    return res.redirect('/login-usuario'); // Redirigir aquí    
  } catch (error) {
    console.error('Error creando la cuenta:', error);
    return res.status(500).json({ error: error.message }); // También usar 'return'
  }
});

app.post('/crear_cuenta_administrador', async (req, res) => {
  const { Id, contraseña, CUIL, DNI } = req.body;

  try {
    const Persona1 = await Persona.create({
      Id: Id,
      contraseña: contraseña,
      CUIL: CUIL,
      DNI: DNI,
    });

    const Administrador1 = await Administrador.create({
      Id: Persona1.Id,
      contraseña: contraseña,
      CUIL: CUIL,
    });

    // Redirigir al login después de crear la cuenta con éxito
    return res.redirect('/login-administrador'); // Redirigir aquí    
  } catch (error) {
    console.error('Error generating certificate:', error);
    return res.status(500).json({ error: error.message }); // También usar 'return'
  }
});

// Manejo de inicio de sesión
app.post('/login_usuario', async (req, res) => {
  const { Id, contraseña, CUIL } = req.body;

  try {
    // Verificar si es un usuario
    const Usuario1 = await Usuario.findOne({ where: { Id, contraseña } });
    const certificado = await CertificateRoot.findOne({ where: { Id } });

    if (Usuario1) {
      req.session.userId = Usuario1.Id; // Guardar el ID del usuario en la sesión

      if(certificado){
        return res.sendFile(path.join(dirname, './', 'public', 'usuario.html'));
      }

      else{
        return res.sendFile(path.join(dirname, './', 'public', 'aviso.html'));
      }

    } else {
      return res.status(401).json({ error: 'Credenciales de usuario inválidas' });
    }
  } catch (error) {
      console.error('Error durante el inicio de sesión:', error);
      return res.status(500).json({ error: error.message });
  }
});

app.get('/certificado', async (req, res) => {
  try {
      const certificado = await CertificateRoot.findOne({ where: { Id, contraseña } });
      res.json(certificado);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.post('/login_administrador', async (req, res) => {
  const { Id, contraseña, CUIL } = req.body;
  try {
      // Verificar si es un administrador
      const Administrador1 = await Administrador.findOne({ where: { Id, contraseña, CUIL } });

      if (Administrador1) {
        req.session.adminId = Administrador1.Id; // Guardar el ID del administrador en la sesión
        return res.sendFile(path.join(dirname, './', 'public', 'administrador.html')); // Redirigir a la página de administrador
      } else {
        return res.status(401).json({ error: 'Credenciales de administrador inválidas' });
      }
  } catch (error) {
      console.error('Error durante el inicio de sesión:', error);
      return res.status(500).json({ error: error.message });
  }
});

app.get('/persona-administrador', async (req, res) => {
  try {
    const Id = req.session.adminId;

    if (!Id) {
      return res.status(400).json({ error: 'No se proporcionó adminId en la sesión.' });
    }

    const Administrador1 = await Administrador.findOne({ where: { Id } });

    if (!Administrador1) {
      return res.status(404).json({ error: 'Administrador no encontrado.' });
    }

    const adminId = Administrador1.Id;
    return res.status(200).json({ adminId });
  } catch (error) {
    console.error('Error al obtener el administrador:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

app.get('/administrador', async (req, res) => {
  if (!req.session.adminId) {
      return res.redirect('/login'); // Redirigir si no está autenticado
  }
  res.sendFile(path.join(dirname, './', 'public', 'administrador.html')); // Cargar el HTML
});

// Ruta para obtener repositorios
app.get('/repositorios', async (req, res) => {
  try {
      const repositorios = await Repositorio.findAll();
      res.json(repositorios);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Ruta para obtener certificados
app.get('/certificados', async (req, res) => {
  try {
      const Certificados = await CertificateEmitidos.findAll();
      res.json(Certificados);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Ruta para obtener las peticiones
app.get('/peticiones', async (req, res) => {
  try {
      const Peticion = await Peticiones.findAll();
      res.json(Peticion);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Ruta para obtener las peticiones
app.get('/raiz', async (req, res) => {
  const { query } = req.body; // Obtener parámetros de consulta
  try {
    // Filtrar las peticiones si se proporciona un query
    const Root = await CertificateRoot.findAll({
      where: query ? { name: { [sequelize.like]: `%${query}%` } } : {}, // Asumiendo que 'name' es un campo en tu modelo
    });

    res.json(Root);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/verificar', async (req, res) => {
  const query  = req.session.userId; // Obtener parámetros de consulta
  try {
    // Filtrar las peticiones si se proporciona un query
    const Root = await CertificateRoot.findOne({ where: { Id: query } });

    res.json(Root);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/csr', async (req, res) => {
  try {
      const CSR1 = await CSR.findAll();
      res.json(CSR1);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Manejo de cierre de sesión
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
      if (err) {
          return res.status(500).json({ error: 'Error al cerrar sesión' });
      }
      res.redirect('/'); // Redirige a la página de inicio
  });
});

// Autoridad de Verificación
app.post('/gestion', async (req, res) => {
  const { peticion, Id } = req.body;
  const admin = req.session.adminId;

  // Función para obtener atributos de certificado
  function obtenerAtributos(Id) {
    return [
      { name: 'commonName', value: `${Id}` },
      { name: 'countryName', value: 'AR' },
      { shortName: 'ST', value: 'Buenos Aires' },
      { name: 'localityName', value: 'Mar del Plata' },
      { shortName: 'OU', value: 'Firmado por' }
    ];
  }
            
  // Función para calcular el estado OCSP
  function calcularEstadoOCSP(issuedAt) {
    const oneYearInMilliseconds = 365 * 24 * 60 * 60 * 1000; 
    const expirationDate = new Date(issuedAt.getTime() + oneYearInMilliseconds);
    return expirationDate > new Date() ? 'Válido' : 'No Válido';
  }

  try {
      // Verificar si el usuario existe
      const Usuario1 = await Usuario.findOne({ where: { Id: Id } });

      if(!Usuario1) {
          console.log('Usuario no encontrado:', Id);
          return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      let message = '';

      switch (peticion) {
        case 'crear':
          console.log('Procesando petición para crear certificado:', Id);
          
          // Busca si ya existe el certificado
          const certificadoCrear = await CertificateRoot.findOne({ where: { Id: Id } });

          if (!certificadoCrear) {

            const solicitud = await CSR.findOne({ where: { usuarioId: Id } });
            if (!solicitud) {
              return res.json({ message: "Solicitud no encontrada." });
            }

            const attrs = obtenerAtributos(Id);
            console.log('Generando certificado con atributos:', attrs);

            // Generar el certificado raíz
            const CA = new certificateAuthority(Id, Usuario1.contraseña, attrs);
            const certData = CA.generateRootCertificate();
            const issuedAt = new Date();
            const notAfter = new Date(issuedAt);
            notAfter.setFullYear(issuedAt.getFullYear() + 1);

            console.log(certData);

            solicitud.publicKey = certData.publicKey;
            solicitud.estado = 'Aprobado';
            await solicitud.save();

            await Peticiones.create({
              usuarioId: Id, 
              AutorId: admin,
              nombre_Certificado: 'None',
              publicKey: certData.publicKey,
              peticion: peticion,
              createdAt: new Date(),
            });

            console.log('Certificado generado:', certData);

            // Guardar datos esenciales en la base de datos
            await CertificateRoot.create({
              Id: Id,
              firmante: admin,
              publicKey: certData.publicKey,
              privateKey: certData.privateKey,
              contraseña: Usuario1.contraseña,
              revoked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              IssuedAt: notAfter,
            });

            // Guardar estado OCSP en el repositorio
            await Repositorio.create({
              Id: Id,
              publicKey: certData.publicKey,
              OCSP: 'Valido'
            });

            res.json({ message: "Certificado Creado" });
          } else {
            res.json({ message: 'El certificado ya existe.' });
          }
        break;

        case 'renovar':
          console.log('Procesando petición para renovar certificado:', Id);

          const certificadoRenovar = await CertificateRoot.findOne({ where: { Id: Id } });
          const Estado = await Repositorio.findOne({ where: {Id: Id} });

          if (certificadoRenovar) {
            const privateKey = forge.pki.privateKeyFromPem(certificadoRenovar.privateKey);
            const publicKey = forge.pki.publicKeyFromPem(certificadoRenovar.publicKey);
            const attrs = obtenerAtributos(admin);

            // Renovar el certificado
            const CA = new certificateAuthority(Id, certificadoRenovar.contraseña, attrs);
            const newCertData = CA.updateCertificate(certificadoRenovar, publicKey, privateKey);
            const issuedAt = new Date();
            const notAfter = new Date(issuedAt);
            notAfter.setFullYear(issuedAt.getFullYear() + 1);

            certificadoRenovar.firmante = admin;
            certificadoRenovar.publicKey = newCertData.publicKey;
            certificadoRenovar.updatedAt = new Date();
            certificadoRenovar.issuedAt = issuedAt;
            certificadoRenovar.notAfter = notAfter;
            await certificadoRenovar.save();

            Estado.OCSP = 'Valido';
            await Estado.save();

            res.json({ message: 'Certificado renovado' });
          } else {
            res.json({ message: 'El certificado no existe, no se puede renovar.' });
          }
        break;

        case 'revocar':
          console.log('Procesando petición para revocar certificado:', );
          const certificadoRevocar = await CertificateRoot.findOne({ where: { Id: Id } });
          const OCSP1 = await Repositorio.findOne({ where: { Id: Id } });

          if (certificadoRevocar) {
            // Lógica de revocación aquí
            certificadoRevocar.revoked = true;
            await certificadoRevocar.save();

            OCSP1.OCSP = 'Revocado';
            await OCSP1.save();

            // Actualizar la CRL o sistema de verificación de estado aquí
            // Debes implementar esta función                  await updateCRL(certificadoRevocar);

            message = 'Certificado revocado.';
            res.json({ message });
          } else {
            message = 'Sucedio un error, asegurese de que sus datos sean correctos.';
            res.json({ message });
          }
        break;

        default:
          message = 'Petición no válida.';
          res.json({ message });
        break;
      }
  } catch (error) {
      console.error('Error al procesar la petición:', error);
      res.status(500).json({ message: 'Error interno del servidor.', error: error.message }); // También incluir el mensaje del error
  }
});

app.post('/registro', async (req, res) => {
  const { peticion, contraseña } = req.body;

  const Id = req.session.userId;

  try {
      // Verificar si el usuario existe
      const Usuario1 = await Usuario.findOne({ where: { Id: Id, Contraseña: contraseña } });

      if (!Usuario1) {
          console.log('Usuario no encontrado:', Id);
          return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      let message = '';

      switch (peticion) {
          case 'verificar':
            Peticiones.create({
              usuarioId: Id, 
              AutorId: Id,
              nombre_Certificado: `cert_${Id}.p12`,
              peticion: peticion,
              createdAt: new Date(),
            });

            const certificadoVerificar = await CertificateRoot.findOne({ where: { Id: Id, Contraseña: contraseña } });
            if (certificadoVerificar) {
              message = 'El certificado existe y es válido.';
              res.json({ message });
            } else {
              message = 'Sucedio un error, asegurese de que sus datos sean correctos';
              res.json({ message });
            }
          break;

          case 'descargar-certificado':
            fetch(`http://localhost:3000/descargar-certificado?Id=${Id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            })
            .then(response => response.json())
            .then(data => {
              res.json({data});
            })
            .catch(error => {
              console.error('Error al realizar la petición:', error);
            });
          break;
            
          case 'descargar-clave':
            fetch(`http://localhost:3000/descargar-clave?Id=${Id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            })
            .then(response => response.json())
            .then(data => {
              res.json({data});
            })
            .catch(error => {
              console.error('Error al realizar la petición:', error);
            });
          break;           

          case 'descargar-archivo':
            fetch(`http://localhost:3000/descargar-clave?Id=${Id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            })
            .then(response => response.json())
            .then(data => {
              res.json({data});
            })
            .catch(error => {
              console.error('Error al realizar la petición:', error);
            });
          break;           

          default:
            message = 'Petición no válida.';
            res.json({ message });
          break;  
      }
  } catch (error) {
      console.error('Error al procesar la petición:', error);
      res.status(500).json({ message: 'Error interno del servidor.', error: error.message }); // También incluir el mensaje del error
  }
});

app.get('/descargar-archivo/:Id', (req, res) => {
  const Id = req.query.Id;
  const certificadoRenovar = CertificateRoot.findOne({ where: { Id: Id } });
  const admin = certificadoRenovar.firmante;

  Peticiones.create({
    usuarioId: Id, 
    AutorId: certificadoVerificar.firmante,
    nombre_Certificado: `cert_${Id}.p12`,
    peticion: 'Descargar Certificado .p12',
    createdAt: new Date(),
  });

  try{
    const privateKey = forge.pki.privateKeyFromPem(certificadoRenovar.privateKey);
    const publicKey = forge.pki.publicKeyFromPem(certificadoRenovar.publicKey);
    const contraseña = certificadoRenovar.contraseña;

    const datos = [
        { name: 'commonName', value: `${Id}` },
        { name: 'countryName', value: 'AR' },
        { shortName: 'ST', value: 'Buenos Aires' },
        { name: 'localityName', value: 'Mar del Plata' },
        { shortName: 'OU', value: 'Firmado por' }
    ];

    const attrs = [
        { name: 'commonName', value: 'Escuela de Educacion Secundaria N°2' },
        { name: 'countryName', value: 'AR' },
        { shortName: 'ST', value: 'Buenos Aires' },
        { name: 'localityName', value: 'Mar del Plata' },
        { name: 'organizationName', value: 'EEST N°2' },
        { shortName: 'OU', value: `Habilitado por ${admin}` }
    ];

    const cert = forge.pki.createCertificate();
    cert.publicKey = publicKey;
    cert.privateKey = privateKey;
    cert.validity.notBefore = certificadoRenovar.updatedAt;
    cert.validity.notAfter = certificadoRenovar.issuedAt;

    cert.setSubject(datos);
    cert.setIssuer(attrs);
    cert.setExtensions([{ name: 'basicConstraints', cA: true }]);
    cert.sign(privateKey);

    const pemCert = forge.pki.certificateToPem(cert);
    const pemPrivateKey = forge.pki.privateKeyToPem(privateKey);

    const CA = new certificateAuthority(Id, contraseña, attrs);
    const newCertData = CA.updateCertificate(cert, publicKey, privateKey);

    CertificateEmitidos.create({
        Id_Root: Id,
        Id_Certificado: `cert_${Id}.p12`,
        publicKey: certData.publicKey,
        contraseña: contraseña,
        createdAt: new Date(),
        IssuedAt: certData.issuedAt,
    });

    // Generar y guardar el certificado SSL y su clave
    const certFilePath = path.join(__dirname, `cert_${Id}.crt`);
    const keyFilePath = path.join(__dirname, `key_${Id}.key`);

    fs.writeFileSync(certFilePath, pemCert, 'utf8');
    fs.writeFileSync(keyFilePath, certData.privateKey, 'utf8');

    // Enviar el archivo PKCS#12 como respuesta
    const p12Buffer = Buffer.from(certData.pkcs12, 'base64');
    res.setHeader('Content-Disposition', `attachment; filename=${certData.p12Filename}`);
    res.send(p12Buffer); // Envía el archivo como respuesta

    if (!fs.existsSync(certFilePath)) {
      return res.status(404).json({ message: 'Certificado no encontrado.' });
    }
  }
  catch(error){

  }
});

app.get('/descargar-certificado/:Id', (req, res) => {
  const Id = req.query.Id;
  Peticiones.create({
    usuarioId: Id, 
    AutorId: autor,
    nombre_Certificado: `cert_${Id}.p12`,
    peticion: 'Descargar Certificado .cert',
    createdAt: new Date(),
  });

  try{
    CertificateEmitidos.create({
      Id_Root: Id,
      Id_Certificado: `cert_${Id}.cert`,
      publicKey: certData.publicKey,
      contraseña: contraseña,
      createdAt: new Date(),
      IssuedAt: certData.issuedAt,
    });

    // Generar y guardar el certificado SSL y su clave
    const certFilePath = path.join(__dirname, `cert_${Id}.crt`);
    const keyFilePath = path.join(__dirname, `key_${Id}.key`);

    fs.writeFileSync(certFilePath, pemCert, 'utf8');
    fs.writeFileSync(keyFilePath, certData.privateKey, 'utf8');

    // Enviar el archivo PKCS#12 como respuesta
    const p12Buffer = Buffer.from(certData.pkcs12, 'base64');
    res.setHeader('Content-Disposition', `attachment; filename=${certData.p12Filename}`);
    res.send(p12Buffer); // Envía el archivo como respuesta
  }
  catch(error){

  }
});

app.get('/descargar-clave/:Id', (req, res) => {
  const Id = req.query.Id;

  Peticiones.create({
    usuarioId: Id, 
    AutorId: autor,
    nombre_Certificado: `cert_${Id}.p12`,
    peticion: peticion,
    createdAt: new Date(),
  });

  try{
    CertificateEmitidos.create({
        Id_Root: Id,
        Id_Certificado: `cert_${Id}.p12`,
        publicKey: certData.publicKey,
        contraseña: contraseña,
        createdAt: new Date(),
        IssuedAt: certData.issuedAt,
    });

    CertificateEmitidos.create({
      Id_Root: Id,
      Id_Certificado: `cert_${Id}.cert`,
      publicKey: certData.publicKey,
      contraseña: contraseña,
      createdAt: new Date(),
      IssuedAt: certData.issuedAt,
    });

    CertificateEmitidos.create({
      Id_Root: Id,
      Id_Certificado: `key_${Id}.key`,
      publicKey: certData.publicKey,
      contraseña: contraseña,
      createdAt: new Date(),
      IssuedAt: certData.issuedAt,
    });

    // Generar y guardar el certificado SSL y su clave
    const certFilePath = path.join(__dirname, `cert_${Id}.crt`);
    const keyFilePath = path.join(__dirname, `key_${Id}.key`);

    fs.writeFileSync(certFilePath, pemCert, 'utf8');
    fs.writeFileSync(keyFilePath, certData.privateKey, 'utf8');

    // Enviar el archivo PKCS#12 como respuesta
    const p12Buffer = Buffer.from(certData.pkcs12, 'base64');
    res.setHeader('Content-Disposition', `attachment; filename=${certData.p12Filename}`);
    res.send(p12Buffer); // Envía el archivo como respuesta

    if (!fs.existsSync(certFilePath)) {
      return res.status(404).json({ message: 'Certificado no encontrado.' });
    }
  
    if (!fs.existsSync(keyFilePath)) {
        return res.status(404).json({ message: 'Clave no encontrada.' });
    }
  }
  catch(error){

  }
});

module.exports = app;
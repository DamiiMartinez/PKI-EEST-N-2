//Se usara el npm 'Sequelize' para interactuar con la Base de Datos
const { Sequelize, DataTypes, TEXT } = require('sequelize');
const mysql = require('mysql2/promise');

// Credenciales de la base de datos
const databaseName = 'pki_db';
const username = 'root';
const password = '';
const host = 'localhost';

// Función para crear la base de datos si no existe
const createDatabaseIfNotExists = async (databaseName) => {
  try {
    const connection = await mysql.createConnection({ host, user: username, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\`;`);

    console.log(`Database "${databaseName}" created or already exists.`);
    await connection.end();
  } catch (error) {
    console.error('Error creating database:', error);
    process.exit(1); // Salir si ocurre un error al crear la base de datos
  }
};

// Crear la base de datos antes de inicializar Sequelize
createDatabaseIfNotExists(databaseName);

// Configuración de Sequelize
const sequelize = new Sequelize(databaseName, username, password, {
//Servidor: Localhost
  host: host,
//Dialecto en MySQL
  dialect: 'mysql',
});

// Definición del modelo de ejemplo: Envia los datos del certificado a una tabla MySQL
const Persona = sequelize.define('Persona', {
  Id: {
    type: DataTypes.CHAR,
    allowNull: false,
    primaryKey: true,
  },
  contraseña: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
  CUIL: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
  DNI: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
}, {
  timestamps: false,
});

const Usuario = sequelize.define('Usuario', {
  Id: {
    type: DataTypes.CHAR,
    allowNull: false,
    primaryKey: true,
  },
  contraseña: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
  nombre_Certificado: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
}, {
  timestamps: false,
});

const Administrador = sequelize.define('Administrador', {
  Id: {
    type: DataTypes.CHAR,
    allowNull: false,
    primaryKey: true,
  },
  contraseña: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
  CUIL: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
}, {
  timestamps: false,
});

const Peticiones = sequelize.define('Peticiones', {
  usuarioId: {  // Cambiar 'Usuario' a 'usuarioId' para evitar conflictos
    type: DataTypes.CHAR,
    allowNull: false,
  },
  AutorId: {  // Cambiar 'Usuario' a 'usuarioId' para evitar conflictos
    type: DataTypes.CHAR,
    allowNull: false,
  },
  nombre_Certificado: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
  publicKey: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  peticion: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  
  timestamps: false,
});

const CSR = sequelize.define('CSR', {
  usuarioId: {  // Cambiar 'Usuario' a 'usuarioId' para evitar conflictos
    type: DataTypes.CHAR,
    allowNull: false,
  },
  contraseña: {  // Cambiar 'Usuario' a 'usuarioId' para evitar conflictos
    type: DataTypes.CHAR,
    allowNull: false,
  },
  datos: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  publicKey: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  estado: {
    type: DataTypes.CHAR,
    allowNull: true,
  },
}, {
  timestamps: false,
});

// Definir las asociaciones
Usuario.belongsTo(Persona, {
  foreignKey: 'Id',
  targetKey: 'Id',
});

Administrador.belongsTo(Persona, {
  foreignKey: 'Id',
  targetKey: 'Id',
});

Usuario.hasMany(Peticiones, { foreignKey: 'usuarioId' });
Peticiones.belongsTo(Usuario, { foreignKey: 'usuarioId', targetKey: 'Id', as: 'usuarioAsociado' });

CSR.belongsTo(Usuario, { foreignKey: 'usuarioId', targetKey: 'Id', as: 'usuarioAsociado' });

// Definición del modelo de ejemplo: Envia los datos del certificado a una tabla MySQL
const CertificateRoot = sequelize.define('Certificados_Raiz', {
  Id: {
    type: DataTypes.CHAR,
    allowNull: false,
    primaryKey: true,
  },
  firmante: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
  publicKey: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  privateKey: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  contraseña: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
  revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  IssuedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

CertificateRoot.belongsTo(Peticiones ,{
  foreignKey: 'Id',
  targetKey: 'usuarioId',
});

const CertificateEmitidos = sequelize.define('Certificados_Emitidos', {
  Id_Root: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
  Id_Certificado: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
  publicKey: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  contraseña: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  IssuedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
},{
  timestamps: false,
  primaryKey: false,
});

CertificateRoot.hasMany(CertificateEmitidos ,{foreignKey: 'Id_Root'});
CertificateEmitidos.belongsTo(CertificateRoot, { foreignKey:'Id_Root', targetKey: 'Id', as: 'raizAsociada' });

const Repositorio = sequelize.define('Repositorio', {
  Id: {
    type: DataTypes.CHAR,
    allowNull: false,
    primaryKey: true,
  },
  publicKey: {
    type: DataTypes.TEXT,
    allowNull: false,
  },  
  OCSP: {
    type: DataTypes.TEXT,
    defaultValue: false,
  },
},{
  timestamps: false,
});

Repositorio.belongsTo(CertificateRoot ,{
  foreignKey: 'Id',
  targetKey: 'Id',
});

// Intentar conectar y sincronizar
const connectAndSync = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // Sincronizar modelos
    await sequelize.sync();
    console.log('Models synchronized successfully.');

  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1); // Salir si ocurre otro error
  }
};

connectAndSync();

//Exporta el Certificado hacia app.js como 'Certificate's
module.exports = { sequelize, Persona, Usuario, Administrador, Peticiones, CSR, CertificateRoot, CertificateEmitidos, Repositorio };
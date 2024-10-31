const forge = require('node-forge');
const { promisify } = require('util');
const fs = require('fs');

//Hacer una ruta para chequear estado de certificado: ID

class certificateAuthority {
    constructor(Id, contraseña, datos) {
      this.Id = Id;
      this.contraseña = contraseña;
      this.datos = datos;
    }

    generateRootCertificate() {
      const id = this.Id;
      const datos = this.datos;

      // Genera un par de claves RSA
      const keys = forge.pki.rsa.generateKeyPair(2048);

      // Crea un certificado X.509 (este será el certificado raíz)
      const cert = forge.pki.createCertificate();
      cert.publicKey = keys.publicKey;
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1); // Válido por 1 año

      // Información del emisor (son los mismos para un certificado raíz)
      const attrs = [
        { name: 'commonName', value: 'Escuela de Educacion Secundaria N°2' },
        { name: 'countryName', value: 'AR' },
        { shortName: 'ST', value: 'Buenos Aires' },
        { name: 'localityName', value: 'Mar del Plata' },
        { name: 'organizationName', value: 'EEST N°2' },
        { shortName: 'OU', value: 'Habilitado' }
      ];

      cert.setSubject(datos);
      cert.setIssuer(attrs); // Es autofirmado, por lo tanto el emisor y el sujeto son iguales

      // Añade basicConstraints indicando que es una CA
      cert.setExtensions([{ name: 'basicConstraints', cA: true }]);

      // Firma el certificado con su propia clave privada (autofirma)
      cert.sign(keys.privateKey);

      // Convertir el certificado a PEM para guardarlo o usarlo
      const pemCert = forge.pki.certificateToPem(cert);

      // Retorna los datos del certificado
      return this.generateCertificateEmitidos(cert, keys.publicKey, keys.privateKey);
    }

    // Función para generar el certificado PKCS#12
    generateCertificateEmitidos(Cert, publicKey, privateKey) {
      const Id = this.Id;

      // Extraer claves públicas y privadas en formato PEM
      const publicKeyPem = forge.pki.publicKeyToPem(publicKey);
      const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

      // Crear el archivo PKCS#12
      const password = this.contraseña;
      const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, [Cert], password, {
        algorithm: '3des'
      });

      // Codificar el archivo PKCS#12 en formato DER
      const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
      const p12Base64 = Buffer.from(p12Der, 'binary').toString('base64');

      // Guardar el archivo PKCS#12 en el sistema de archivos
      const p12Filename = `cert_${Id}.p12`;
      require('fs').writeFileSync(p12Filename, Buffer.from(p12Der, 'binary'));

      // Retornar los datos necesarios
      return {
        Id,
        publicKey: publicKeyPem,
        privateKey: privateKeyPem,
        pkcs12: p12Base64,
        issuedAt: Cert.validity.notAfter,
        p12Filename,
      };
    }

    updateCertificate(cert, publicKey, privateKey){
      const Id = this.Id;
      // Extraer claves públicas y privadas en formato PEM
      const publicKeyPem = forge.pki.publicKeyToPem(publicKey);
      const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

      // Crear el archivo PKCS#12
      const password = this.contraseña;
      const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, [cert], password, {
        algorithm: '3des'
      });

      // Codificar el archivo PKCS#12 en formato DER
      const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
      const p12Base64 = Buffer.from(p12Der, 'binary').toString('base64');

      // Guardar el archivo PKCS#12 en el sistema de archivos
      const p12Filename = `cert_${Id}.p12`;
      require('fs').writeFileSync(p12Filename, Buffer.from(p12Der, 'binary'));

      // Retornar los datos necesarios
      return {
        Id,
        publicKey: publicKeyPem,
        privateKey: privateKeyPem,
        pkcs12: p12Base64,
        issuedAt: cert.validity.notAfter,
        p12Filename,
      };
    }
}

module.exports = certificateAuthority;
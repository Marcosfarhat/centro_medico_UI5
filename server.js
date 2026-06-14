const cds = require('@sap/cds')

// En desarrollo (mocked auth), inyectar automáticamente el usuario correcto
// según la ruta que se está accediendo:
//   - rutas de admin  → usuario 'admin'
//   - rutas de paciente → usuario de prueba 'juan.garcia@email.com'
// En producción (auth kind = 'xsuaa') este bloque no se ejecuta.
cds.on('bootstrap', (app) => {
  if (cds.env.requires.auth?.kind === 'mocked') {

    const adminCreds    = Buffer.from('admin:admin').toString('base64')
    const pacienteCreds = Buffer.from('juan.garcia@email.com:pass1').toString('base64')

    app.use((req, _res, next) => {
      // Sobreescribir siempre — ignorar credenciales cacheadas del browser
      if (req.path.startsWith('/odata/v4/admin')) {
        req.headers.authorization = `Basic ${adminCreds}`
      } else if (req.path.startsWith('/odata/v4/paciente')) {
        req.headers.authorization = `Basic ${pacienteCreds}`
      }
      next()
    })
  }
})

module.exports = cds.server

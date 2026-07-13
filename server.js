process.loadEnvFile()  // carga .env (ANTHROPIC_API_KEY, etc.) a process.env — nativo de Node, sin dependencias

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
      if (req.path.startsWith('/odata/v4/admin') || req.path.startsWith('/odata/v4/ai')) {
        req.headers.authorization = `Basic ${adminCreds}`
      } else if (req.path.startsWith('/odata/v4/paciente')) {
        // Si el caller manda el mail del paciente logueado (la app del asistente
        // lo pone en el header 'x-paciente-email'), usamos ESE mail como identidad,
        // asi $user = ese mail y el @restrict del PacienteService filtra sus turnos.
        // Si no viene (ej. las apps mis-turnos/mi-perfil), usamos el paciente de prueba.
        const email = req.headers['x-paciente-email']
        if (email) {
          req.headers.authorization = `Basic ${Buffer.from(`${email}:x`).toString('base64')}`
        } else {
          req.headers.authorization = `Basic ${pacienteCreds}`
        }
      }
      next()
    })
  }
})

module.exports = cds.server

# Lecciones aprendidas: extensiones de Fiori Elements (sap.fe v4)

Cosas que nos costaron tiempo de debugging real al implementar los botones
custom de `admin-turnos` (Confirmar Turno, Crear Turno, Volver al inicio).
Para no repetir los mismos tropiezos en el próximo proyecto.

## 1. Nombre de archivo de un Controller Extension

El archivo **tiene que** llamarse `<NombreDeClase>.controller.js`, con el
sufijo `.controller` — igual que el controlador de cualquier vista normal.

```
// MAL
ext/controller/ObjectPageExt.js

// BIEN
ext/controller/ObjectPageExt.controller.js
```

Síntoma si el nombre está mal: el botón aparece (el manifest está bien) pero
al hacer click no pasa nada, o la consola muestra:
`Attempt to load Extension Controller ... was not successful` /
`Cannot read properties of undefined (reading 'getMetadata')`.

## 2. El `press` de una acción custom necesita el prefijo `.extension.`

En el manifest, para que un botón ejecute un método de un Controller
Extension (no un módulo JS suelto), el valor de `press` va así:

```json
"press": ".extension.<namespace-completo>.<NombreClase>.<metodo>"
```

Sin el `.extension.` al principio, UI5 intenta cargar el string como si
fuera la ruta de un módulo plano y falla — el botón aparece pero clickearlo
no hace nada (no siempre tira un error visible inmediato).

## 3. Una entidad "composition child" de otra con draft NO se puede tocar directo

Si `B` es composition child de `A`, y `A` tiene `@odata.draft.enabled`,
entonces `B` (aunque no tenga draft propio) **no se puede crear ni modificar
directo** vía OData. Ni `@odata.draft.bypass` ni `cds.fiori.direct_crud`
lo permiten — es una restricción de seguridad fija desde CAP v8
(`DRAFT_MODIFICATION_ONLY_VIA_ROOT`).

El único camino es pasar por el draft del padre:
1. `POST /A(ID=..,IsActiveEntity=true)/<Service>.draftEdit` (con `{"PreserveChanges": true}`)
2. Una vez en draft, `B` se vuelve direccionable directo con `IsActiveEntity=false`
   (no hace falta navegar por `A`): `PATCH /B(ID=..,IsActiveEntity=false)` para
   editar, o `POST /A(ID=..,IsActiveEntity=false)/<navProperty>` para crear uno nuevo (deep create).
3. `POST /A(ID=..,IsActiveEntity=false)/<Service>.draftActivate` para guardar todo.

**Tip:** probar esta secuencia a mano con `curl` ANTES de escribirla en JS.
Ahorra muchísimo tiempo de debugging en el navegador.

## 4. No se pueden encadenar dos "deferred operation bindings"

```js
// MAL: usar el contexto que devuelve una accion como base de OTRA accion
var oDraftEdit = oModel.bindContext("Service.draftEdit(...)", oContext);
oDraftEdit.execute().then(function () {
  var oDraftActivate = oModel.bindContext(
    "Service.draftActivate(...)",
    oDraftEdit.getBoundContext()   // <- esto rompe
  );
});
// Error: "Nested deferred operation bindings not supported"
```

El contexto que devuelve `draftEdit` "recuerda" en su path que vino de una
operación. Hay que pedir un contexto **nuevo y limpio** por path absoluto
antes de la siguiente acción:

```js
// BIEN
var oCleanContext = oModel.bindContext(
  "/A(ID='" + sId + "',IsActiveEntity=false)"
).getBoundContext();
var oDraftActivate = oModel.bindContext("Service.draftActivate(...)", oCleanContext);
```

## 5. `@Capabilities.InsertRestrictions.Insertable: false` bloquea TODO insert

Incluye el deep-create legítimo a través de una composition, no solo el
`POST` directo a la entidad. Si lo único que se quiere es **ocultar el botón
"Crear" nativo de Fiori Elements** (sin tocar lo que el backend permite),
la anotación correcta es otra, puramente de UI:

```cds
@UI.CreateHidden: true
entity Turnos as projection on cm.Turnos { ... };
```

## 6. Un draft abierto que falla a mitad de camino queda trabado

Si `draftEdit` tiene éxito pero un paso posterior falla (por el bug del punto 4,
por un error de red, etc.), el padre queda con un draft abierto
("a draft for this entity already exists") y **nadie** puede volver a editarlo
hasta que alguien lo descarte. Conviene envolver los pasos posteriores al
`draftEdit` en un `catch` que descarte el draft antes de propagar el error:

```js
.catch(function (oStepError) {
  return oDraftContext.delete()
    .catch(function () { /* si ni esto funciona, no hay mas que hacer */ })
    .then(function () { throw oStepError; });
});
```

Para limpiar drafts trabados manualmente (a mano, con curl):
```bash
curl -X DELETE ".../EntitySet(ID=...,IsActiveEntity=false)"
```

## 7. Desconfiar de ejemplos viejos / de blogs sueltos

Varias búsquedas iniciales devolvieron sintaxis de versiones viejas de Fiori
Elements (`sap.ui.generic.template`, OData V2) mezclada con la sintaxis
actual de `sap.fe` v4 — llevó a más de un intento fallido. Lo que más sirvió
fue ir directo al código real y corriendo de SAP en GitHub
(`SAP-samples/fiori-elements-feature-showcase`), no a documentación suelta
o foros.

## 8. Push a GitHub desde este entorno (BAS) puede fallar

El `git push` desde la sandbox de ejecución de comandos del asistente se
cuelga sin completar (el helper de credenciales `basctl` de BAS no responde
ahí). Hay que hacer el push siempre desde la terminal real de BAS. Si ahí
también falla con un error de socket, recargar la ventana del editor
(`Developer: Reload Window`) suele resolverlo.

# Documentacion de servicios

## Base URL
`http://localhost:5000/api`

## Autenticacion

### `POST /auth/registrar`
Registra un nuevo usuario.

Entrada:
```json
{
  "nombre": "Sebastian",
  "apellidos": "Reyes",
  "correo": "sebastian@test.com",
  "contrasena": "Clave#2026",
  "rol": "deportista"
}
```

Respuesta esperada:
```json
{
  "mensaje": "Usuario registrado exitosamente",
  "token": "jwt",
  "usuario": {}
}
```

### `POST /auth/iniciar-sesion`
Primer paso del login. Valida credenciales y envía un código temporal al correo registrado.

Entrada:
```json
{
  "correo": "sebastian@test.com",
  "contrasena": "Clave#2026"
}
```

Respuesta esperada:
```json
{
  "mensaje": "Código de verificación enviado al correo registrado",
  "requiereVerificacionDosPasos": true,
  "desafioId": "id_usuario",
  "correo": "sebastian@test.com",
  "expiraEnMinutos": 10
}
```

### `POST /auth/verificar-dos-pasos`
Segundo paso del login. Valida el código temporal.

Entrada:
```json
{
  "desafioId": "id_usuario",
  "codigo": "123456"
}
```

Respuesta esperada:
```json
{
  "mensaje": "Inicio de sesion exitoso",
  "token": "jwt",
  "usuario": {}
}
```

### `GET /auth/reglas-contrasena`
Devuelve las reglas vigentes de seguridad para la contrasena.

## Panel

### `GET /panel`
Obtiene el tablero del usuario autenticado.

Headers:
- `Authorization: Bearer <token>`

### `PUT /panel`
Actualiza el contenido del tablero del usuario autenticado.

Headers:
- `Authorization: Bearer <token>`

### `POST /panel/deportistas/vincular`
Permite a un entrenador vincular un deportista real por correo.

Entrada:
```json
{
  "correo": "deportista@test.com"
}
```

## Metodos HTTP utilizados
- `GET`: consulta de datos
- `POST`: creacion o acciones puntuales
- `PUT`: actualizacion de recursos

## Respuestas generales
- `200`: operacion exitosa
- `201`: recurso creado
- `400`: error de validacion o datos incorrectos
- `401`: token invalido o ausente
- `403`: accion no permitida para el rol
- `404`: recurso no encontrado
- `500`: error interno del servidor

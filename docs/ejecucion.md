# Como ejecutar el sistema

## Requisitos previos
- Node.js 18 o superior
- npm
- Cuenta y cluster de MongoDB Atlas
- Archivo `.env` configurado en `backend`

## Variables de entorno necesarias
Ejemplo para `backend/.env`:
```env
PUERTO=5000
MONGO_URI=mongodb+srv://usuario:clave@cluster.mongodb.net/vyrox
JWT_SECRETO=clave_super_segura
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo@ejemplo.com
SMTP_PASS=app_password_o_clave_smtp
SMTP_FROM=correo@ejemplo.com
```

## Pasos para levantar el backend
```bash
cd backend
npm install
npm start
```

El backend quedara disponible en:
`http://localhost:5000`

## Pasos para levantar el frontend
```bash
cd frontend
npm install
npm run dev
```

El frontend quedara disponible en:
`http://localhost:5173`

## Flujo recomendado de prueba
1. Registrar una cuenta de deportista.
2. Registrar una cuenta de entrenador.
3. Iniciar sesión con verificación de dos pasos.
4. Completar el perfil deportivo.
5. Vincular el deportista desde la cuenta de entrenador.
6. Crear metas, sesiones, competencias y observaciones.
7. Verificar que el deportista vea solo sus asignaciones.

## Nota sobre el correo del segundo factor
La verificación en dos pasos envía el código al correo registrado del usuario.
Para que esto funcione, debe configurar un proveedor SMTP válido en `backend/.env`.
Si utiliza Gmail, se recomienda usar una `App Password`.

## Uso con Docker
Actualmente el proyecto se ejecuta en entorno local.
No se incluye configuracion Docker en esta version.

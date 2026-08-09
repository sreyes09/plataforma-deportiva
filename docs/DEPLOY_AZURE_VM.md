# Despliegue de Vyrox con Docker en Azure VM

## Enfoque recomendado

Este proyecto queda preparado para ejecutarse con:

- `frontend` en Nginx
- `backend` en Node.js/Express
- `MongoDB Atlas` como base de datos externa

La maquina virtual solo hospeda los contenedores. La base de datos permanece en Atlas.

## Ventajas de este enfoque

- Permite seguir haciendo cambios sin rehacer toda la infraestructura.
- Facilita explicar el despliegue durante la defensa.
- Se puede actualizar con `git pull` y `docker compose up --build -d`.

## Archivos creados para despliegue

- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `docker-compose.yml`
- `backend/.env.example`

## 1. Preparar la maquina virtual

Use Ubuntu Server en Azure.

Actualice el sistema:

```bash
sudo apt update && sudo apt upgrade -y
```

Instale Docker:

```bash
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

Cierre sesion y vuelva a entrar para aplicar el grupo Docker.

## 2. Clonar el proyecto

```bash
git clone https://github.com/sreyes09/plataforma-deportiva.git
cd plataforma-deportiva
```

## 3. Configurar variables del backend

Cree el archivo real desde el ejemplo:

```bash
cp backend/.env.example backend/.env
```

Luego edite:

```bash
nano backend/.env
```

Debe completar como minimo:

- `MONGO_URI`
- `JWT_SECRETO`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`
- `SMTP_FROM`

## 4. Levantar el sistema

```bash
docker compose up -d --build
```

## 5. Verificar contenedores

```bash
docker compose ps
docker compose logs -f
```

## 6. Abrir puertos en Azure

En el grupo de seguridad de red de la VM abra:

- Puerto `80` para HTTP
- Puerto `22` para SSH

El puerto `5000` no hace falta abrirlo al publico si solo se usara por el proxy interno, pero puede dejarse cerrado para mayor seguridad.

## 7. Actualizar despues de nuevos cambios

Cada vez que el proyecto cambie:

```bash
git pull
docker compose up -d --build
```

## 8. Detener el sistema

```bash
docker compose down
```

## 9. Observacion importante

Si luego quieren dominio y HTTPS, lo ideal es:

- apuntar un dominio a la IP publica de la VM
- agregar Nginx reverso con certificado SSL

Para la entrega inicial, con la IP publica funcionando suele ser suficiente.

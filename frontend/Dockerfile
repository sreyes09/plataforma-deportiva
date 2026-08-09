# Primera etapa: compila la aplicacion React/Vite.
FROM node:20-alpine AS builder

WORKDIR /app

# Copia manifiestos para reutilizar cache de npm.
COPY package*.json ./

# Instala dependencias para compilar.
RUN npm ci

# Copia el resto del frontend.
COPY . .

# Permite sobreescribir la URL publica del API al momento del build.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

# Genera los archivos estaticos de produccion.
RUN npm run build

# Segunda etapa: sirve los archivos con Nginx.
FROM nginx:1.27-alpine

# Copia la configuracion personalizada de Nginx.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia el frontend compilado hacia la carpeta publica de Nginx.
COPY --from=builder /app/dist /usr/share/nginx/html

# Expone el puerto HTTP del frontend.
EXPOSE 80

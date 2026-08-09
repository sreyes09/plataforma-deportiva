# Imagen ligera de Node para ejecutar la API en produccion.
FROM node:20-alpine

# Carpeta de trabajo interna del contenedor.
WORKDIR /app

# Copia primero los manifiestos para aprovechar cache de dependencias.
COPY package*.json ./

# Instala solo dependencias necesarias de produccion.
RUN npm ci --omit=dev

# Copia el codigo fuente del backend.
COPY src ./src

# Expone el puerto interno del servicio Express.
EXPOSE 5000

# Arranque principal del backend.
CMD ["npm", "start"]

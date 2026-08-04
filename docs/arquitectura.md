# Arquitectura del sistema

## Tipo de arquitectura utilizada
El proyecto utiliza una arquitectura cliente-servidor con organizacion tipo MVC en el backend:
- Cliente: interfaz React que consume la API REST.
- Servidor: Express con controladores, rutas, middleware y modelos.
- Persistencia: MongoDB Atlas mediante Mongoose.

## Componentes principales
- Frontend:
  Interfaz desarrollada con React, Vite y Tailwind. Gestiona autenticacion, tablero y formularios.
- Backend:
  API REST en Node.js y Express. Maneja autenticacion, seguridad, logica del panel y relacion entrenador-deportista.
- Base de datos:
  MongoDB Atlas. Almacena usuarios, paneles y estructuras embebidas como metas, sesiones, competencias y observaciones.

## Comunicacion entre componentes
1. El frontend envia solicitudes HTTP al backend.
2. El backend valida datos, autentica usuarios y consulta MongoDB.
3. MongoDB devuelve la informacion persistida.
4. El backend normaliza la respuesta y la retorna en JSON.
5. El frontend actualiza la interfaz y los graficos.

## Diagrama representativo
```mermaid
flowchart LR
    U["Usuario"] --> F["Frontend React / Vite"]
    F -->|HTTP JSON| A["API Express"]
    A --> C["Controladores"]
    C --> M["Modelos Mongoose"]
    M --> D["MongoDB Atlas"]
    D --> M
    M --> C
    C --> A
    A --> F
```

## Estructura tecnica resumida
```mermaid
flowchart TD
    subgraph Frontend
      P1["inicio.jsx"]
      P2["registro.jsx"]
      P3["tablero.jsx"]
      S1["authServicio.js"]
      S2["panelServicio.js"]
      C1["AuthContexto.jsx"]
    end

    subgraph Backend
      R1["authRutas.js"]
      R2["panelRutas.js"]
      CT1["authControlador.js"]
      CT2["panelControlador.js"]
      MW["verificarToken.js"]
      U1["Usuario.js"]
      U2["Panel.js"]
    end

    P1 --> S1
    P2 --> S1
    P3 --> S2
    S1 --> R1
    S2 --> R2
    R1 --> CT1
    R2 --> MW
    MW --> CT2
    CT1 --> U1
    CT2 --> U1
    CT2 --> U2
```

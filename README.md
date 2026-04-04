# KNOWTO

Plataforma de certificación EC0366 asistida por IA.

## Stack

- **Frontend**: TypeScript + Vite + Tailwind CSS (Vanilla JS)
- **Backend**: Cloudflare Workers + Hono + Workers AI
- **Base de datos**: Supabase (PostgreSQL)
- **Dev local**: Docker Compose + Ollama

## Inicio rápido

```bash
cp .env.example .env
docker-compose up -d
# Frontend: http://localhost:5173
# Backend:  http://localhost:8787
```

## Comandos útiles

| Comando | Descripción |
|---|---|
| `docker-compose up -d` | Iniciar todos los servicios |
| `docker-compose down` | Detener servicios |
| `docker-compose logs -f backend` | Logs del backend |
| `docker-compose logs -f frontend` | Logs del frontend |

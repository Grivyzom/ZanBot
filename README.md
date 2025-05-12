# ZanBot

**Bot de Discord para la comunidad Grivyzom**

## Tabla de contenidos

* [Descripción](#descripción)
* [Características](#características)
* [Instalación](#instalación)
* [Configuración](#configuración)
* [Uso](#uso)

  * [Comandos](#comandos)
* [Contribuciones](#contribuciones)
* [Licencia](#licencia)

## Descripción

ZanBot es un bot de Discord desarrollado en TypeScript con Discord.js para gestionar y dinamizar la comunidad Grivyzom.

## Características

* Respuestas interactivas y personalizadas.
* Gestión de roles y moderación básica.
* Comandos de utilidad y entretenimiento.
* Fácil extensión mediante handlers de comandos y eventos.

## Instalación

1. Clona el repositorio:

   ```bash
   git clone https://github.com/Grivyzom/ZanBot.git
   cd ZanBot
   ```
2. Instala las dependencias:

   ```bash
   npm install
   ```

## Configuración

1. Duplica el archivo de ejemplo de variables de entorno:

   ```bash
   cp .env.example .env
   ```
2. Edita el archivo `.env` y completa las siguientes variables:

   ```dotenv
   DISCORD_TOKEN=tu_token_de_discord
   PREFIX=!
   MONGODB_URI=tu_uri_de_mongodb   # Opcional: URI de base de datos para persistencia
   ```
3. Variables opcionales:

   ```dotenv
   LOG_LEVEL=info              # Nivel de logs (debug, info, warn, error)
   GUILD_ID=tu_id_de_servidor  # ID del servidor para registros específicos
   ```

## Uso

* Iniciar en modo desarrollo:

  ```bash
  npm run dev
  ```
* Generar build y ejecutar en producción:

  ```bash
  npm run build
  npm start
  ```

### Comandos

* `!ping` — Verifica la latencia del bot.
* `!help` — Muestra todos los comandos disponibles.
* `!info` — Proporciona información sobre el servidor.
* `!rol add @usuario @rol` — Asigna un rol a un usuario.

## Contribuciones

¡Las contribuciones son bienvenidas! Sigue estos pasos:

1. Haz un fork del repositorio.
2. Crea una rama para tu feature o fix: `git checkout -b feature/nueva-funcionalidad`.
3. Realiza cambios y haz commits descriptivos.
4. Envía un Pull Request explicando tu aporte.
5. Responde a los comentarios y actualiza según feedback.

## Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

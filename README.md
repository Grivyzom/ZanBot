# ZanBot

ZanBot es un bot de gestión de tickets para Discord, desarrollado con TypeScript, Discord.js v14 y MySQL. Permite a los usuarios abrir tickets de soporte, al personal asignarse y cerrar tickets de forma ordenada, guardando siempre un histórico en base de datos.

## 📦 Características

* **Apertura de tickets**: `/ticket <asunto>` crea un canal privado para el usuario y el staff.
* **Asignación de tickets**: `/tomar-ticket` disponible solo para roles con permiso de gestionar canales (Staff/Admin).
* **Cierre de tickets**: `/cerrar-ticket` cierra el ticket en la BD y elimina el canal.
* **Registro en base de datos**: estados (`OPEN`, `ASSIGNED`, `CLOSED`), fecha de creación y actualización, staff asignado.
* **Permisos granulares**: solo el autor y el staff ven y participan en el canal de ticket.
* **Manejo robusto de errores**: `try/catch` en operaciones de BD y Discord API.
* **Configuración por entornos**: variables en `.env` para credenciales y IDs.

## 📂 Estructura del proyecto

```
src/
├── commands/
│   ├── ticket.ts          # Apertura de tickets
│   ├── takeTicket.ts      # Asignación de tickets
│   └── closeTicket.ts     # Cierre de tickets
├── database.ts            # Conexión y migraciones automáticas
└── utils/
    ├── requireRole.ts     # Middleware de roles (opcional)
    └── getEmbedColor.ts   # Helper para colores de embeds

deploy-commands.ts         # Script para registrar slash commands
test/                     # Pruebas unitarias (por implementar)
.env                       # Variables de entorno (no subir a repo)
```

## ⚙️ Instalación

1. Clona el repositorio:

   ```bash
   git clone https://github.com/Grivyzom/ZanBot.git
   cd ZanBot
   ```
2. Instala dependencias:

   ```bash
   npm install
   ```
3. Crea el archivo `.env` en la raíz y define:

   ```env
   TOKEN=tu_token_de_discord
   CLIENT_ID=id_de_tu_aplicación
   GUILD_ID=id_de_tu_servidor
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASS=
   DB_NAME=zanbot
   STAFF_ROLE_ID=id_rol_staff
   ADMIN_ROLE_ID=id_rol_admin
   CATEGORY_ID=id_categoria_tickets
   ```
4. Arranca MySQL (p. ej. con XAMPP) y crea la base de datos si no existe.

## 🚀 Uso

* **Registrar comandos** (única vez o en cada despliegue):

  ```bash
  npm run deploy-commands
  ```
* **Iniciar el bot**:

  ```bash
  npm start
  ```
* **Comandos disponibles**:

  * `/ticket <asunto>`: abre un nuevo ticket.
  * `/tomar-ticket`: asigna el ticket al staff.
  * `/cerrar-ticket`: cierra y elimina el canal de ticket.

## 🛠️ Mejores prácticas implementadas

* **TypeScript estricto** y casteo seguro de `interaction.member` y `interaction.channel`.
* **Permisos de comandos** con `.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)`.
* **Migraciones automáticas**: creación de BD y tabla `tickets` al iniciar.
* **Manejo de errores** en todas las operaciones críticas.
* **Variables de entorno** para evitar hardcode.

## 🔮 Próximas mejoras

* Extraer la lógica BD y Discord a un servicio `TicketService` para facilitar tests.
* Usar migraciones formales (`knex`, `TypeORM`) en lugar de SQL inline.
* Implementar logger estructurado (p.ej. `winston`).
* Añadir pruebas unitarias y de integración.
* Controlar condiciones de carrera en la creación de tickets.

## 📄 Licencia

MIT © ZanBot by Grivyzom

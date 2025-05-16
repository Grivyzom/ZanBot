// src/utils/createTicketFromSelect.ts
import {
  StringSelectMenuInteraction,
  ChatInputCommandInteraction,
} from 'discord.js';
import { execute as ticketExecute } from '../commands/ticket'; // ajusta ruta si hace falta

export async function createTicketFromSelect(
  interaction: StringSelectMenuInteraction,
  subject: string,
) {
  // 1) Casteamos a ChatInputCommandInteraction
  const cmdInt = interaction as unknown as ChatInputCommandInteraction;

  // 2) Inyectamos `.options.getString()` para devolver el subject
  Object.defineProperty(cmdInt, 'options', {
    value: {
      getString: (_name: string) => subject,
    },
    configurable: true,
  });

  // 3) Marcamos que salte la validación de longitud
  Object.defineProperty(cmdInt, 'skipLengthCheck', {
    value: true,
    configurable: true,
  });

  // 4) Llamamos a tu lógica original de /ticket
  await ticketExecute(cmdInt);
}

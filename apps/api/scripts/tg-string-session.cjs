'use strict';
/**
 * Одноразовая выдача TG_SESSION_STRING для импорта новостей (GramJS / MTProto).
 * Запуск на сервере (нужен интерактивный терминал):
 *   cd /var/www/lg/apps/api && node scripts/tg-string-session.cjs
 * Переменные TG_API_ID и TG_API_HASH берутся из /var/www/lg/.env (или из окружения).
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');
const { stdin, stdout } = require('process');

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, 'utf8');
  for (const line of raw.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

async function main() {
  const envPath = path.join(__dirname, '..', '..', '..', '.env');
  loadDotEnv(envPath);

  const apiId = Number(String(process.env.TG_API_ID || '').trim());
  const apiHash = String(process.env.TG_API_HASH || '').trim();
  if (!Number.isInteger(apiId) || apiId <= 0 || !apiHash) {
    console.error('Задайте TG_API_ID и TG_API_HASH в', envPath, 'или в окружении.');
    process.exit(1);
  }

  const { TelegramClient } = require('telegram');
  const { StringSession } = require('telegram/sessions');

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const q = async (msg) => {
    const s = await rl.question(msg);
    return String(s || '').trim();
  };

  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });

  await client.start({
    phoneNumber: async () => q('Телефон (+7999…): '),
    password: async () => q('Пароль 2FA (Enter если нет): '),
    phoneCode: async () => q('Код из Telegram / приложения: '),
    onError: async (err) => {
      console.error(err);
      return false;
    },
  });

  const saved = session.save();
  console.log('\nДобавьте в', envPath, 'одну строку (или обновите существующую):\n');
  console.log(`TG_SESSION_STRING=${saved}\n`);
  console.log('Затем: chmod 600', envPath, '&& pm2 restart lg-api\n');

  await client.disconnect();
  rl.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

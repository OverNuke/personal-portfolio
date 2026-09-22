const userAgent = process.env.npm_config_user_agent ?? '';

if (!userAgent.includes('pnpm')) {
  console.error(
    'This project requires pnpm. Install it with `npm i -g pnpm`, then run `pnpm install`.',
  );
  process.exit(1);
}

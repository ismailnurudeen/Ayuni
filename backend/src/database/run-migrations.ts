import { DatabaseService } from "./database.service";

async function main() {
  const databaseService = new DatabaseService();
  await databaseService.onModuleInit();
  await databaseService.onModuleDestroy();
  process.stdout.write("Ayuni migrations applied successfully.\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});


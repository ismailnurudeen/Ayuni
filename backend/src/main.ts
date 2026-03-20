import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix("v1");
  const port = Number(process.env.PORT ?? "3000");
  await app.listen(port);
}

bootstrap();

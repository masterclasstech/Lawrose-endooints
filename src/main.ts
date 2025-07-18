/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { config } from './config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    // Create NestJS application
    const app = await NestFactory.create(AppModule);

    // Global prefix for all routes
    app.setGlobalPrefix(config.app.apiPrefix);

    // CORS configuration
    app.enableCors({
      origin: config.app.allowedOrigins,
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Swagger documentation setup
    if (config.swagger.enabled) {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('API Documentation')
        .setDescription('API documentation for the application')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup(config.swagger.path, app, document);
      
      logger.log(`Swagger documentation available at ${config.swagger.path}`);
    }

    // Health check endpoint
    if (config.healthCheck.enabled) {
      app.use('/health', (req, res) => {
        res.status(200).json({
          status: 'OK',
          timestamp: new Date().toISOString(),
          environment: config.app.environment,
        });
      });
    }

    // Start the application
    await app.listen(config.app.port, () => {
      logger.log(`Application running on port ${config.app.port}`);
      logger.log(`Environment: ${config.app.environment}`);
      logger.log(`API prefix: /${config.app.apiPrefix}`);
    });

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
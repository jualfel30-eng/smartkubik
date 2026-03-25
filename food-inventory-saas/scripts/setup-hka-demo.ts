/**
 * Script de Setup para HKA Factory Demo
 *
 * Verifica conectividad, autenticación y permisos con el ambiente demo de HKA Factory.
 *
 * Uso:
 *   npm run setup:hka-demo
 *
 * Requisitos:
 *   - .env.demo configurado con credenciales HKA
 */

import { config } from 'dotenv';
import axios, { AxiosError } from 'axios';
import * as chalk from 'chalk';

// Cargar variables de entorno desde .env.demo
config({ path: '.env.demo' });

interface HkaAuthResponse {
  token: string;
  expiresIn?: number;
}

interface HkaConfig {
  baseUrl: string;
  usuario: string;
  clave: string;
  rifEmisor: string;
  razonSocial: string;
}

class HkaSetup {
  private config: HkaConfig;
  private token: string | null = null;

  constructor() {
    this.config = {
      baseUrl: process.env.HKA_FACTORY_BASE_URL || '',
      usuario: process.env.HKA_FACTORY_USUARIO || '',
      clave: process.env.HKA_FACTORY_CLAVE || '',
      rifEmisor: process.env.HKA_FACTORY_RIF_EMISOR || '',
      razonSocial: process.env.HKA_FACTORY_RAZON_SOCIAL || '',
    };
  }

  /**
   * Valida que todas las variables de entorno estén configuradas
   */
  validateConfig(): boolean {
    console.log(chalk.blue('📋 Validando configuración...'));

    const required = [
      'HKA_FACTORY_BASE_URL',
      'HKA_FACTORY_USUARIO',
      'HKA_FACTORY_CLAVE',
      'HKA_FACTORY_RIF_EMISOR',
      'HKA_FACTORY_RAZON_SOCIAL',
    ];

    let valid = true;

    for (const key of required) {
      if (!process.env[key]) {
        console.log(chalk.red(`  ❌ ${key} no está configurado`));
        valid = false;
      } else {
        const maskedValue =
          key.includes('CLAVE') || key.includes('PASSWORD')
            ? '********'
            : process.env[key];
        console.log(chalk.green(`  ✅ ${key}: ${maskedValue}`));
      }
    }

    return valid;
  }

  /**
   * Verifica conectividad con HKA Factory
   */
  async checkConnectivity(): Promise<boolean> {
    console.log(chalk.blue('\n🌐 Verificando conectividad con HKA Factory...'));

    try {
      const response = await axios.get(`${this.config.baseUrl}/health`, {
        timeout: 10000,
      });

      console.log(chalk.green('  ✅ HKA Factory es accesible'));
      console.log(chalk.gray(`  → URL: ${this.config.baseUrl}`));
      console.log(chalk.gray(`  → Status: ${response.status}`));

      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          console.log(chalk.red('  ❌ No se puede conectar a HKA Factory'));
          console.log(chalk.yellow('  → Verifica que el URL sea correcto'));
        } else if (error.code === 'ETIMEDOUT') {
          console.log(chalk.red('  ❌ Timeout conectando a HKA Factory'));
          console.log(chalk.yellow('  → El servidor puede estar caído'));
        } else if (error.response?.status === 404) {
          console.log(chalk.yellow('  ⚠️  Endpoint /health no existe (esto es normal)'));
          console.log(chalk.green('  ✅ Pero el servidor está accesible'));
          return true;
        } else {
          console.log(chalk.red(`  ❌ Error: ${error.message}`));
        }
      } else {
        console.log(chalk.red(`  ❌ Error desconocido: ${error}`));
      }

      return false;
    }
  }

  /**
   * Autentica con HKA Factory y obtiene JWT token
   */
  async authenticate(): Promise<boolean> {
    console.log(chalk.blue('\n🔐 Autenticando con HKA Factory...'));

    try {
      const response = await axios.post<HkaAuthResponse>(
        `${this.config.baseUrl}/api/Autenticacion`,
        {
          usuario: this.config.usuario,
          clave: this.config.clave,
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.token = response.data.token;

      console.log(chalk.green('  ✅ Autenticación exitosa'));
      console.log(chalk.gray(`  → Token: ${this.token.substring(0, 20)}...`));

      if (response.data.expiresIn) {
        const expiresInHours = Math.floor(response.data.expiresIn / 3600);
        console.log(
          chalk.gray(`  → Expira en: ${expiresInHours} horas`),
        );
      }

      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          console.log(chalk.red('  ❌ Credenciales inválidas'));
          console.log(chalk.yellow('  → Verifica usuario y clave'));
        } else if (error.response?.status === 400) {
          console.log(chalk.red('  ❌ Request inválido'));
          console.log(
            chalk.gray(
              `  → Response: ${JSON.stringify(error.response.data)}`,
            ),
          );
        } else {
          console.log(chalk.red(`  ❌ Error: ${error.message}`));
          if (error.response) {
            console.log(
              chalk.gray(
                `  → Response: ${JSON.stringify(error.response.data)}`,
              ),
            );
          }
        }
      } else {
        console.log(chalk.red(`  ❌ Error desconocido: ${error}`));
      }

      return false;
    }
  }

  /**
   * Verifica permisos haciendo una consulta de prueba
   */
  async checkPermissions(): Promise<boolean> {
    console.log(chalk.blue('\n🔑 Verificando permisos...'));

    if (!this.token) {
      console.log(chalk.red('  ❌ No hay token de autenticación'));
      return false;
    }

    try {
      // Intentar consultar estado de un documento ficticio
      // Esperamos un error 404 o similar, pero que no sea 403 (forbidden)
      const response = await axios.post(
        `${this.config.baseUrl}/api/EstadoDocumento`,
        {
          serie: '',
          tipoDocumento: '05',
          numeroDocumento: '00000000',
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
          validateStatus: () => true, // No lanzar error en cualquier status
        },
      );

      if (response.status === 403) {
        console.log(chalk.red('  ❌ Sin permisos para usar la API'));
        return false;
      }

      // Cualquier otro código (200, 400, 404) significa que tenemos acceso
      console.log(chalk.green('  ✅ Permisos verificados'));
      console.log(chalk.gray(`  → Código respuesta: ${response.status}`));

      return true;
    } catch (error) {
      console.log(
        chalk.yellow(
          '  ⚠️  No se pudo verificar permisos (puede ser normal)',
        ),
      );
      console.log(
        chalk.gray('  → Continuando con el proceso...'),
      );
      return true; // No bloqueamos el setup por esto
    }
  }

  /**
   * Muestra resumen del setup
   */
  showSummary(success: boolean): void {
    console.log(chalk.blue('\n📊 Resumen del Setup:'));
    console.log('═'.repeat(50));

    if (success) {
      console.log(chalk.green.bold('  ✅ SETUP EXITOSO'));
      console.log('\n  El sistema está listo para emitir documentos con HKA Factory');
      console.log('\n  Próximos pasos:');
      console.log(chalk.cyan('  1. Ejecutar tests E2E: npm run test:e2e:hka'));
      console.log(chalk.cyan('  2. Emitir primera retención de prueba'));
      console.log(chalk.cyan('  3. Validar número de control asignado'));
    } else {
      console.log(chalk.red.bold('  ❌ SETUP FALLIDO'));
      console.log('\n  Revisa los errores anteriores y corrígelos');
      console.log('\n  Ayuda:');
      console.log(chalk.cyan('  1. Verifica .env.demo existe y está completo'));
      console.log(chalk.cyan('  2. Confirma credenciales con HKA Factory'));
      console.log(chalk.cyan('  3. Verifica conexión a Internet'));
    }

    console.log('═'.repeat(50));
  }

  /**
   * Ejecuta todo el proceso de setup
   */
  async run(): Promise<void> {
    console.log(chalk.bold.blue('\n🚀 HKA Factory Demo Setup'));
    console.log('═'.repeat(50));

    // 1. Validar config
    if (!this.validateConfig()) {
      console.log(
        chalk.red(
          '\n❌ Configuración incompleta. Crea un archivo .env.demo con las credenciales',
        ),
      );
      console.log(chalk.gray('\nEjemplo de .env.demo:'));
      console.log(
        chalk.gray('HKA_FACTORY_BASE_URL=https://demoemisionv2.thefactoryhka.com.ve'),
      );
      console.log(chalk.gray('HKA_FACTORY_USUARIO=tu_usuario'));
      console.log(chalk.gray('HKA_FACTORY_CLAVE=tu_clave'));
      console.log(chalk.gray('HKA_FACTORY_RIF_EMISOR=J-123456789'));
      console.log(chalk.gray('HKA_FACTORY_RAZON_SOCIAL=TU EMPRESA, C.A.'));
      this.showSummary(false);
      process.exit(1);
    }

    // 2. Verificar conectividad
    if (!(await this.checkConnectivity())) {
      this.showSummary(false);
      process.exit(1);
    }

    // 3. Autenticar
    if (!(await this.authenticate())) {
      this.showSummary(false);
      process.exit(1);
    }

    // 4. Verificar permisos
    await this.checkPermissions();

    // 5. Resumen
    this.showSummary(true);
  }
}

// Ejecutar setup
const setup = new HkaSetup();
setup.run().catch((error) => {
  console.error(chalk.red('\n💥 Error fatal:'), error);
  process.exit(1);
});

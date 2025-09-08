/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("@nestjs/core");

/***/ }),
/* 2 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppModule = void 0;
const common_1 = __webpack_require__(3);
const config_1 = __webpack_require__(4);
const mongoose_1 = __webpack_require__(5);
const app_controller_1 = __webpack_require__(6);
const app_service_1 = __webpack_require__(8);
const auth_module_1 = __webpack_require__(10);
const products_module_1 = __webpack_require__(29);
const inventory_module_1 = __webpack_require__(34);
const orders_module_1 = __webpack_require__(39);
const customers_module_1 = __webpack_require__(44);
const pricing_module_1 = __webpack_require__(49);
const payments_module_1 = __webpack_require__(52);
const dashboard_module_1 = __webpack_require__(55);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    uri: configService.get('MONGODB_URI'),
                }),
                inject: [config_1.ConfigService],
            }),
            auth_module_1.AuthModule,
            products_module_1.ProductsModule,
            inventory_module_1.InventoryModule,
            orders_module_1.OrdersModule,
            customers_module_1.CustomersModule,
            pricing_module_1.PricingModule,
            payments_module_1.PaymentsModule,
            dashboard_module_1.DashboardModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);


/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("@nestjs/common");

/***/ }),
/* 4 */
/***/ ((module) => {

module.exports = require("@nestjs/config");

/***/ }),
/* 5 */
/***/ ((module) => {

module.exports = require("@nestjs/mongoose");

/***/ }),
/* 6 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppController = void 0;
const common_1 = __webpack_require__(3);
const swagger_1 = __webpack_require__(7);
const app_service_1 = __webpack_require__(8);
const public_decorator_1 = __webpack_require__(9);
let AppController = class AppController {
    constructor(appService) {
        this.appService = appService;
    }
    getHello() {
        return this.appService.getHello();
    }
    getHealth() {
        return this.appService.getHealth();
    }
};
exports.AppController = AppController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Health check del API' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'API funcionando correctamente' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getHello", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Estado de salud del sistema' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Estado del sistema' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getHealth", null);
exports.AppController = AppController = __decorate([
    (0, swagger_1.ApiTags)('health'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [typeof (_a = typeof app_service_1.AppService !== "undefined" && app_service_1.AppService) === "function" ? _a : Object])
], AppController);


/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = require("@nestjs/swagger");

/***/ }),
/* 8 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppService = void 0;
const common_1 = __webpack_require__(3);
let AppService = class AppService {
    getHello() {
        return {
            success: true,
            message: 'Food Inventory SaaS API - Sistema de inventario alimentario para Venezuela',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
        };
    }
    getHealth() {
        return {
            success: true,
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage(),
            services: {
                database: 'connected',
                api: 'running',
            },
        };
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)()
], AppService);


/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Public = exports.IS_PUBLIC_KEY = void 0;
const common_1 = __webpack_require__(3);
exports.IS_PUBLIC_KEY = 'isPublic';
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;


/***/ }),
/* 10 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthModule = void 0;
const common_1 = __webpack_require__(3);
const jwt_1 = __webpack_require__(11);
const passport_1 = __webpack_require__(12);
const mongoose_1 = __webpack_require__(5);
const config_1 = __webpack_require__(4);
const auth_controller_1 = __webpack_require__(13);
const auth_service_1 = __webpack_require__(14);
const jwt_strategy_1 = __webpack_require__(27);
const user_schema_1 = __webpack_require__(18);
const tenant_schema_1 = __webpack_require__(19);
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: tenant_schema_1.Tenant.name, schema: tenant_schema_1.TenantSchema },
            ]),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy],
        exports: [
            auth_service_1.AuthService,
            jwt_strategy_1.JwtStrategy,
            passport_1.PassportModule,
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: tenant_schema_1.Tenant.name, schema: tenant_schema_1.TenantSchema },
            ]),
        ],
    })
], AuthModule);


/***/ }),
/* 11 */
/***/ ((module) => {

module.exports = require("@nestjs/jwt");

/***/ }),
/* 12 */
/***/ ((module) => {

module.exports = require("@nestjs/passport");

/***/ }),
/* 13 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g, _h;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthController = void 0;
const common_1 = __webpack_require__(3);
const swagger_1 = __webpack_require__(7);
const auth_service_1 = __webpack_require__(14);
const auth_dto_1 = __webpack_require__(20);
const jwt_auth_guard_1 = __webpack_require__(23);
const tenant_guard_1 = __webpack_require__(24);
const permissions_guard_1 = __webpack_require__(25);
const permissions_decorator_1 = __webpack_require__(26);
const public_decorator_1 = __webpack_require__(9);
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async login(loginDto) {
        try {
            const result = await this.authService.login(loginDto);
            return {
                success: true,
                message: 'Login exitoso',
                data: result,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error en el login', common_1.HttpStatus.UNAUTHORIZED);
        }
    }
    async register(registerDto) {
        try {
            const result = await this.authService.register(registerDto);
            return {
                success: true,
                message: 'Usuario registrado exitosamente',
                data: result,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error en el registro', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async createUser(createUserDto, req) {
        try {
            const result = await this.authService.createUser(createUserDto, req.user);
            return {
                success: true,
                message: 'Usuario creado exitosamente',
                data: result,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al crear usuario', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async refresh(refreshTokenDto) {
        try {
            const result = await this.authService.refreshToken(refreshTokenDto.refreshToken);
            return {
                success: true,
                message: 'Token renovado exitosamente',
                data: result,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al renovar token', common_1.HttpStatus.UNAUTHORIZED);
        }
    }
    async changePassword(changePasswordDto, req) {
        try {
            await this.authService.changePassword(changePasswordDto, req.user);
            return {
                success: true,
                message: 'Contraseña cambiada exitosamente',
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al cambiar contraseña', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async forgotPassword(forgotPasswordDto) {
        try {
            await this.authService.forgotPassword(forgotPasswordDto);
            return {
                success: true,
                message: 'Si el email existe, recibirá instrucciones para resetear su contraseña',
            };
        }
        catch (error) {
            return {
                success: true,
                message: 'Si el email existe, recibirá instrucciones para resetear su contraseña',
            };
        }
    }
    async resetPassword(resetPasswordDto) {
        try {
            await this.authService.resetPassword(resetPasswordDto);
            return {
                success: true,
                message: 'Contraseña reseteada exitosamente',
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al resetear contraseña', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getProfile(req) {
        try {
            const profile = await this.authService.getProfile(req.user.id);
            return {
                success: true,
                message: 'Perfil obtenido exitosamente',
                data: profile,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al obtener perfil', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async logout(req) {
        try {
            await this.authService.logout(req.user.id);
            return {
                success: true,
                message: 'Sesión cerrada exitosamente',
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al cerrar sesión', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async validateToken(req) {
        return {
            success: true,
            message: 'Token válido',
            data: {
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName,
                    role: req.user.role,
                    tenantId: req.user.tenantId,
                },
                tenant: {
                    id: req.tenant._id,
                    code: req.tenant.code,
                    name: req.tenant.name,
                },
            },
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Iniciar sesión' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Login exitoso' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Credenciales inválidas' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof auth_dto_1.LoginDto !== "undefined" && auth_dto_1.LoginDto) === "function" ? _b : Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar nuevo usuario' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Usuario registrado exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Datos inválidos' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof auth_dto_1.RegisterDto !== "undefined" && auth_dto_1.RegisterDto) === "function" ? _c : Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('create-user'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('settings', ['create']),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Crear nuevo usuario (solo administradores)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Usuario creado exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof auth_dto_1.CreateUserDto !== "undefined" && auth_dto_1.CreateUserDto) === "function" ? _d : Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "createUser", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Renovar token de acceso' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Token renovado exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_e = typeof auth_dto_1.RefreshTokenDto !== "undefined" && auth_dto_1.RefreshTokenDto) === "function" ? _e : Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Cambiar contraseña' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Contraseña cambiada exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_f = typeof auth_dto_1.ChangePasswordDto !== "undefined" && auth_dto_1.ChangePasswordDto) === "function" ? _f : Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Solicitar reseteo de contraseña' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Email de reseteo enviado' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_g = typeof auth_dto_1.ForgotPasswordDto !== "undefined" && auth_dto_1.ForgotPasswordDto) === "function" ? _g : Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Resetear contraseña con token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Contraseña reseteada exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_h = typeof auth_dto_1.ResetPasswordDto !== "undefined" && auth_dto_1.ResetPasswordDto) === "function" ? _h : Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener perfil del usuario actual' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Perfil obtenido exitosamente' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Cerrar sesión' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Sesión cerrada exitosamente' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('validate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Validar token actual' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Token válido' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "validateToken", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [typeof (_a = typeof auth_service_1.AuthService !== "undefined" && auth_service_1.AuthService) === "function" ? _a : Object])
], AuthController);


/***/ }),
/* 14 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthService = void 0;
const common_1 = __webpack_require__(3);
const jwt_1 = __webpack_require__(11);
const mongoose_1 = __webpack_require__(5);
const mongoose_2 = __webpack_require__(15);
const bcrypt = __webpack_require__(16);
const uuid_1 = __webpack_require__(17);
const user_schema_1 = __webpack_require__(18);
const tenant_schema_1 = __webpack_require__(19);
let AuthService = AuthService_1 = class AuthService {
    constructor(userModel, tenantModel, jwtService) {
        this.userModel = userModel;
        this.tenantModel = tenantModel;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async login(loginDto) {
        this.logger.log(`Login attempt for email: ${loginDto.email}`);
        let user = null;
        if (loginDto.tenantCode) {
            const tenant = await this.tenantModel.findOne({ code: loginDto.tenantCode });
            if (!tenant) {
                throw new common_1.UnauthorizedException('Tenant no encontrado');
            }
            user = await this.userModel.findOne({
                email: loginDto.email,
                tenantId: tenant._id,
            });
        }
        else {
            user = await this.userModel.findOne({ email: loginDto.email });
        }
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        if (user.lockUntil && user.lockUntil > new Date()) {
            const remainingTime = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
            throw new common_1.UnauthorizedException(`Cuenta bloqueada. Intente en ${remainingTime} minutos.`);
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPasswordValid) {
            await this.handleFailedLogin(user);
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Usuario inactivo');
        }
        const tenant = await this.tenantModel.findById(user.tenantId);
        if (!tenant || tenant.status !== 'active') {
            throw new common_1.UnauthorizedException('Tenant inactivo');
        }
        await this.userModel.updateOne({ _id: user._id }, {
            $unset: { loginAttempts: 1, lockUntil: 1 },
            lastLoginAt: new Date(),
            lastLoginIP: loginDto.ip || 'unknown',
        });
        const tokens = await this.generateTokens(user, tenant);
        this.logger.log(`Successful login for user: ${user.email}`);
        return {
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                permissions: user.permissions,
                tenantId: user.tenantId,
            },
            tenant: {
                id: tenant._id,
                code: tenant.code,
                name: tenant.name,
                businessType: tenant.businessType,
            },
            ...tokens,
        };
    }
    async register(registerDto) {
        this.logger.log(`Registration attempt for email: ${registerDto.email}`);
        const tenant = await this.tenantModel.findOne({ code: registerDto.tenantCode });
        if (!tenant) {
            throw new common_1.BadRequestException('Tenant no encontrado');
        }
        const existingUser = await this.userModel.findOne({
            email: registerDto.email,
            tenantId: tenant._id,
        });
        if (existingUser) {
            throw new common_1.BadRequestException('El email ya está registrado en este tenant');
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, 12);
        const userData = {
            ...registerDto,
            password: hashedPassword,
            tenantId: tenant._id,
            emailVerificationToken: (0, uuid_1.v4)(),
        };
        const user = new this.userModel(userData);
        const savedUser = await user.save();
        const tokens = await this.generateTokens(savedUser, tenant);
        this.logger.log(`User registered successfully: ${savedUser.email}`);
        return {
            user: {
                id: savedUser._id,
                email: savedUser.email,
                firstName: savedUser.firstName,
                lastName: savedUser.lastName,
                role: savedUser.role,
                tenantId: savedUser.tenantId,
            },
            tenant: {
                id: tenant._id,
                code: tenant.code,
                name: tenant.name,
            },
            ...tokens,
        };
    }
    async createUser(createUserDto, currentUser) {
        this.logger.log(`Creating user: ${createUserDto.email} by ${currentUser.email}`);
        const existingUser = await this.userModel.findOne({
            email: createUserDto.email,
            tenantId: currentUser.tenantId,
        });
        if (existingUser) {
            throw new common_1.BadRequestException('El email ya está registrado');
        }
        const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
        const userData = {
            ...createUserDto,
            password: hashedPassword,
            tenantId: currentUser.tenantId,
            createdBy: currentUser.id,
            emailVerificationToken: (0, uuid_1.v4)(),
        };
        const user = new this.userModel(userData);
        const savedUser = await user.save();
        this.logger.log(`User created successfully: ${savedUser.email}`);
        return {
            id: savedUser._id,
            email: savedUser.email,
            firstName: savedUser.firstName,
            lastName: savedUser.lastName,
            role: savedUser.role,
            isActive: savedUser.isActive,
        };
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET,
            });
            const user = await this.userModel.findById(payload.sub);
            if (!user || !user.isActive) {
                throw new common_1.UnauthorizedException('Usuario inválido');
            }
            const tenant = await this.tenantModel.findById(user.tenantId);
            if (!tenant || tenant.status !== 'active') {
                throw new common_1.UnauthorizedException('Tenant inválido');
            }
            return this.generateTokens(user, tenant);
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Refresh token inválido');
        }
    }
    async changePassword(changePasswordDto, user) {
        this.logger.log(`Password change request for user: ${user.email}`);
        const userDoc = await this.userModel.findById(user.id);
        if (!userDoc) {
            throw new common_1.UnauthorizedException('Usuario no encontrado');
        }
        const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, userDoc.password);
        if (!isCurrentPasswordValid) {
            throw new common_1.BadRequestException('Contraseña actual incorrecta');
        }
        const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 12);
        await this.userModel.updateOne({ _id: user.id }, { password: hashedNewPassword });
        this.logger.log(`Password changed successfully for user: ${user.email}`);
    }
    async forgotPassword(forgotPasswordDto) {
        this.logger.log(`Password reset request for email: ${forgotPasswordDto.email}`);
        let user = null;
        if (forgotPasswordDto.tenantCode) {
            const tenant = await this.tenantModel.findOne({ code: forgotPasswordDto.tenantCode });
            if (tenant) {
                user = await this.userModel.findOne({
                    email: forgotPasswordDto.email,
                    tenantId: tenant._id,
                });
            }
        }
        else {
            user = await this.userModel.findOne({ email: forgotPasswordDto.email });
        }
        if (user) {
            const resetToken = (0, uuid_1.v4)();
            const resetExpires = new Date(Date.now() + 3600000);
            await this.userModel.updateOne({ _id: user._id }, {
                passwordResetToken: resetToken,
                passwordResetExpires: resetExpires,
            });
            this.logger.log(`Password reset token generated for user: ${user.email}`);
        }
    }
    async resetPassword(resetPasswordDto) {
        this.logger.log(`Password reset attempt with token: ${resetPasswordDto.token}`);
        const user = await this.userModel.findOne({
            passwordResetToken: resetPasswordDto.token,
            passwordResetExpires: { $gt: new Date() },
        });
        if (!user) {
            throw new common_1.BadRequestException('Token de reseteo inválido o expirado');
        }
        const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 12);
        await this.userModel.updateOne({ _id: user._id }, {
            password: hashedPassword,
            $unset: {
                passwordResetToken: 1,
                passwordResetExpires: 1,
                loginAttempts: 1,
                lockUntil: 1,
            },
        });
        this.logger.log(`Password reset successfully for user: ${user.email}`);
    }
    async getProfile(userId) {
        const user = await this.userModel
            .findById(userId)
            .select('-password -passwordResetToken -emailVerificationToken')
            .populate('tenantId', 'code name businessType')
            .exec();
        if (!user) {
            throw new common_1.UnauthorizedException('Usuario no encontrado');
        }
        return user;
    }
    async logout(userId) {
        this.logger.log(`Logout for user ID: ${userId}`);
    }
    async generateTokens(user, tenant) {
        const payload = {
            sub: user._id,
            email: user.email,
            role: user.role,
            tenantId: tenant._id,
            tenantCode: tenant.code,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                expiresIn: process.env.JWT_EXPIRES_IN || '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
            }),
        ]);
        return {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        };
    }
    async handleFailedLogin(user) {
        const maxAttempts = 5;
        const lockTime = 30 * 60 * 1000;
        const updates = {
            $inc: { loginAttempts: 1 },
        };
        if (user.loginAttempts + 1 >= maxAttempts) {
            updates.lockUntil = new Date(Date.now() + lockTime);
        }
        await this.userModel.updateOne({ _id: user._id }, updates);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(tenant_schema_1.Tenant.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, typeof (_b = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _b : Object, typeof (_c = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _c : Object])
], AuthService);


/***/ }),
/* 15 */
/***/ ((module) => {

module.exports = require("mongoose");

/***/ }),
/* 16 */
/***/ ((module) => {

module.exports = require("bcrypt");

/***/ }),
/* 17 */
/***/ ((module) => {

module.exports = require("uuid");

/***/ }),
/* 18 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserSchema = exports.User = exports.UserPermission = void 0;
const mongoose_1 = __webpack_require__(5);
const mongoose_2 = __webpack_require__(15);
let UserPermission = class UserPermission {
};
exports.UserPermission = UserPermission;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], UserPermission.prototype, "module", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Array)
], UserPermission.prototype, "actions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], UserPermission.prototype, "grantedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", typeof (_b = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _b : Object)
], UserPermission.prototype, "grantedBy", void 0);
exports.UserPermission = UserPermission = __decorate([
    (0, mongoose_1.Schema)()
], UserPermission);
let User = class User {
};
exports.User = User;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "avatar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)([UserPermission]),
    __metadata("design:type", Array)
], User.prototype, "permissions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isEmailVerified", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "emailVerificationToken", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "passwordResetToken", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], User.prototype, "passwordResetExpires", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], User.prototype, "lastLoginAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "lastLoginIP", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "loginAttempts", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_e = typeof Date !== "undefined" && Date) === "function" ? _e : Object)
], User.prototype, "lockUntil", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Tenant', required: true }),
    __metadata("design:type", typeof (_f = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _f : Object)
], User.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", typeof (_g = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _g : Object)
], User.prototype, "createdBy", void 0);
exports.User = User = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], User);
exports.UserSchema = mongoose_1.SchemaFactory.createForClass(User);
exports.UserSchema.index({ email: 1, tenantId: 1 }, { unique: true });
exports.UserSchema.index({ role: 1, tenantId: 1 });
exports.UserSchema.index({ isActive: 1, tenantId: 1 });
exports.UserSchema.index({ emailVerificationToken: 1 });
exports.UserSchema.index({ passwordResetToken: 1 });
exports.UserSchema.index({ lockUntil: 1 });


/***/ }),
/* 19 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TenantSchema = exports.Tenant = exports.TenantSettings = void 0;
const mongoose_1 = __webpack_require__(5);
let TenantSettings = class TenantSettings {
};
exports.TenantSettings = TenantSettings;
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], TenantSettings.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], TenantSettings.prototype, "taxes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], TenantSettings.prototype, "inventory", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], TenantSettings.prototype, "orders", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], TenantSettings.prototype, "notifications", void 0);
exports.TenantSettings = TenantSettings = __decorate([
    (0, mongoose_1.Schema)()
], TenantSettings);
let Tenant = class Tenant {
};
exports.Tenant = Tenant;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], Tenant.prototype, "code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Tenant.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Tenant.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Tenant.prototype, "businessType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Tenant.prototype, "contactInfo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Tenant.prototype, "taxInfo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: TenantSettings }),
    __metadata("design:type", TenantSettings)
], Tenant.prototype, "settings", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'trial' }),
    __metadata("design:type", String)
], Tenant.prototype, "subscriptionPlan", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], Tenant.prototype, "subscriptionExpiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'active' }),
    __metadata("design:type", String)
], Tenant.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Tenant.prototype, "suspendedReason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Tenant.prototype, "limits", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Tenant.prototype, "usage", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Tenant.prototype, "logo", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Tenant.prototype, "website", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'America/Caracas' }),
    __metadata("design:type", String)
], Tenant.prototype, "timezone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'es' }),
    __metadata("design:type", String)
], Tenant.prototype, "language", void 0);
exports.Tenant = Tenant = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Tenant);
exports.TenantSchema = mongoose_1.SchemaFactory.createForClass(Tenant);
exports.TenantSchema.index({ code: 1 }, { unique: true });
exports.TenantSchema.index({ status: 1 });
exports.TenantSchema.index({ subscriptionPlan: 1 });
exports.TenantSchema.index({ subscriptionExpiresAt: 1 });


/***/ }),
/* 20 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.VerifyEmailDto = exports.RefreshTokenDto = exports.ResetPasswordDto = exports.ForgotPasswordDto = exports.ChangePasswordDto = exports.UpdateUserDto = exports.UserPermissionDto = exports.CreateUserDto = exports.RegisterDto = exports.LoginDto = void 0;
const class_validator_1 = __webpack_require__(21);
const class_transformer_1 = __webpack_require__(22);
const swagger_1 = __webpack_require__(7);
class LoginDto {
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email del usuario' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Contraseña del usuario' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(6),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Código del tenant' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "tenantCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'IP del usuario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "ip", void 0);
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email del usuario' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Contraseña del usuario' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre del usuario' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], RegisterDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Apellido del usuario' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], RegisterDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Teléfono del usuario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Rol del usuario', enum: ['admin', 'manager', 'employee', 'viewer'] }),
    (0, class_validator_1.IsEnum)(['admin', 'manager', 'employee', 'viewer']),
    __metadata("design:type", String)
], RegisterDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Código del tenant' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "tenantCode", void 0);
class CreateUserDto {
}
exports.CreateUserDto = CreateUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email del usuario' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Contraseña temporal del usuario' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], CreateUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre del usuario' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Apellido del usuario' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Teléfono del usuario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Rol del usuario', enum: ['admin', 'manager', 'employee', 'viewer'] }),
    (0, class_validator_1.IsEnum)(['admin', 'manager', 'employee', 'viewer']),
    __metadata("design:type", String)
], CreateUserDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Permisos específicos del usuario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => UserPermissionDto),
    __metadata("design:type", Array)
], CreateUserDto.prototype, "permissions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Usuario activo', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateUserDto.prototype, "isActive", void 0);
class UserPermissionDto {
}
exports.UserPermissionDto = UserPermissionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Módulo del sistema', enum: ['products', 'inventory', 'orders', 'customers', 'reports', 'settings'] }),
    (0, class_validator_1.IsEnum)(['products', 'inventory', 'orders', 'customers', 'reports', 'settings']),
    __metadata("design:type", String)
], UserPermissionDto.prototype, "module", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Acciones permitidas', enum: ['create', 'read', 'update', 'delete', 'export', 'import'] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(['create', 'read', 'update', 'delete', 'export', 'import'], { each: true }),
    __metadata("design:type", Array)
], UserPermissionDto.prototype, "actions", void 0);
class UpdateUserDto {
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre del usuario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Apellido del usuario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Teléfono del usuario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Rol del usuario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['admin', 'manager', 'employee', 'viewer']),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Permisos del usuario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => UserPermissionDto),
    __metadata("design:type", Array)
], UpdateUserDto.prototype, "permissions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Usuario activo' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateUserDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Avatar del usuario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "avatar", void 0);
class ChangePasswordDto {
}
exports.ChangePasswordDto = ChangePasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Contraseña actual' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "currentPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nueva contraseña' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "newPassword", void 0);
class ForgotPasswordDto {
}
exports.ForgotPasswordDto = ForgotPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email del usuario' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ForgotPasswordDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Código del tenant' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ForgotPasswordDto.prototype, "tenantCode", void 0);
class ResetPasswordDto {
}
exports.ResetPasswordDto = ResetPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Token de reseteo' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nueva contraseña' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "newPassword", void 0);
class RefreshTokenDto {
}
exports.RefreshTokenDto = RefreshTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Refresh token' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RefreshTokenDto.prototype, "refreshToken", void 0);
class VerifyEmailDto {
}
exports.VerifyEmailDto = VerifyEmailDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Token de verificación' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], VerifyEmailDto.prototype, "token", void 0);


/***/ }),
/* 21 */
/***/ ((module) => {

module.exports = require("class-validator");

/***/ }),
/* 22 */
/***/ ((module) => {

module.exports = require("class-transformer");

/***/ }),
/* 23 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var JwtAuthGuard_1;
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JwtAuthGuard = void 0;
const common_1 = __webpack_require__(3);
const passport_1 = __webpack_require__(12);
const core_1 = __webpack_require__(1);
const public_decorator_1 = __webpack_require__(9);
let JwtAuthGuard = JwtAuthGuard_1 = class JwtAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    constructor(reflector) {
        super();
        this.reflector = reflector;
        this.logger = new common_1.Logger(JwtAuthGuard_1.name);
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        return super.canActivate(context);
    }
    handleRequest(err, user, info, context) {
        const request = context.switchToHttp().getRequest();
        if (err || !user) {
            this.logger.warn(`Authentication failed for ${request.method} ${request.url}: ${info?.message || err?.message}`);
            if (info?.name === 'TokenExpiredError') {
                throw new common_1.UnauthorizedException('Token expirado');
            }
            if (info?.name === 'JsonWebTokenError') {
                throw new common_1.UnauthorizedException('Token inválido');
            }
            throw new common_1.UnauthorizedException('No autorizado');
        }
        user.ip = request.ip;
        user.userAgent = request.get('User-Agent');
        this.logger.log(`User authenticated: ${user.email} (${user.id})`);
        return user;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = JwtAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof core_1.Reflector !== "undefined" && core_1.Reflector) === "function" ? _a : Object])
], JwtAuthGuard);


/***/ }),
/* 24 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TenantGuard_1;
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TenantGuard = void 0;
const common_1 = __webpack_require__(3);
const mongoose_1 = __webpack_require__(5);
const mongoose_2 = __webpack_require__(15);
const tenant_schema_1 = __webpack_require__(19);
let TenantGuard = TenantGuard_1 = class TenantGuard {
    constructor(tenantModel) {
        this.tenantModel = tenantModel;
        this.logger = new common_1.Logger(TenantGuard_1.name);
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || !user.tenantId) {
            this.logger.warn('User without tenant trying to access protected resource');
            throw new common_1.ForbiddenException('Usuario sin tenant válido');
        }
        try {
            const tenant = await this.tenantModel.findById(user.tenantId).exec();
            if (!tenant) {
                this.logger.warn(`Tenant not found: ${user.tenantId}`);
                throw new common_1.ForbiddenException('Tenant no encontrado');
            }
            if (tenant.status !== 'active') {
                this.logger.warn(`Inactive tenant access attempt: ${tenant.code} (${tenant.status})`);
                throw new common_1.ForbiddenException(`Tenant ${tenant.status}. Contacte al administrador.`);
            }
            if (tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt < new Date()) {
                this.logger.warn(`Expired subscription for tenant: ${tenant.code}`);
                throw new common_1.ForbiddenException('Suscripción expirada. Renueve su plan.');
            }
            request.tenant = tenant;
            this.logger.debug(`Tenant validated: ${tenant.code} for user: ${user.email}`);
            return true;
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException) {
                throw error;
            }
            this.logger.error(`Error validating tenant: ${error.message}`);
            throw new common_1.ForbiddenException('Error validando tenant');
        }
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = TenantGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(tenant_schema_1.Tenant.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object])
], TenantGuard);


/***/ }),
/* 25 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PermissionsGuard_1;
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PermissionsGuard = void 0;
const common_1 = __webpack_require__(3);
const core_1 = __webpack_require__(1);
const permissions_decorator_1 = __webpack_require__(26);
let PermissionsGuard = PermissionsGuard_1 = class PermissionsGuard {
    constructor(reflector) {
        this.reflector = reflector;
        this.logger = new common_1.Logger(PermissionsGuard_1.name);
    }
    canActivate(context) {
        const requiredPermissions = this.reflector.getAllAndOverride(permissions_decorator_1.PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredPermissions) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('Usuario no autenticado');
        }
        if (user.role === 'admin') {
            this.logger.debug(`Admin access granted to ${user.email}`);
            return true;
        }
        const hasPermission = this.checkUserPermissions(user, requiredPermissions.module, requiredPermissions.actions);
        if (!hasPermission) {
            this.logger.warn(`Permission denied for user ${user.email}: ${requiredPermissions.module}:${requiredPermissions.actions.join(',')}`);
            throw new common_1.ForbiddenException(`No tiene permisos para ${requiredPermissions.actions.join(', ')} en ${requiredPermissions.module}`);
        }
        this.logger.debug(`Permission granted for user ${user.email}: ${requiredPermissions.module}:${requiredPermissions.actions.join(',')}`);
        return true;
    }
    checkUserPermissions(user, requiredModule, requiredActions) {
        const rolePermissions = this.getRolePermissions(user.role);
        if (rolePermissions[requiredModule]) {
            const hasAllActions = requiredActions.every(action => rolePermissions[requiredModule].includes(action));
            if (hasAllActions) {
                return true;
            }
        }
        if (user.permissions && user.permissions.length > 0) {
            const userModulePermission = user.permissions.find((p) => p.module === requiredModule);
            if (userModulePermission) {
                return requiredActions.every(action => userModulePermission.actions.includes(action));
            }
        }
        return false;
    }
    getRolePermissions(role) {
        const permissions = {
            admin: {
                products: ['create', 'read', 'update', 'delete', 'export', 'import'],
                inventory: ['create', 'read', 'update', 'delete', 'export', 'import'],
                orders: ['create', 'read', 'update', 'delete', 'export', 'import'],
                customers: ['create', 'read', 'update', 'delete', 'export', 'import'],
                reports: ['create', 'read', 'update', 'delete', 'export', 'import'],
                settings: ['create', 'read', 'update', 'delete', 'export', 'import'],
            },
            manager: {
                products: ['create', 'read', 'update', 'export'],
                inventory: ['create', 'read', 'update', 'export'],
                orders: ['create', 'read', 'update', 'export'],
                customers: ['create', 'read', 'update', 'export'],
                reports: ['read', 'export'],
                settings: ['read'],
            },
            employee: {
                products: ['read'],
                inventory: ['read', 'update'],
                orders: ['create', 'read', 'update'],
                customers: ['create', 'read', 'update'],
                reports: ['read'],
                settings: [],
            },
            viewer: {
                products: ['read'],
                inventory: ['read'],
                orders: ['read'],
                customers: ['read'],
                reports: ['read'],
                settings: [],
            },
        };
        return permissions[role] || {};
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = PermissionsGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof core_1.Reflector !== "undefined" && core_1.Reflector) === "function" ? _a : Object])
], PermissionsGuard);


/***/ }),
/* 26 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RequirePermissions = exports.PERMISSIONS_KEY = void 0;
const common_1 = __webpack_require__(3);
exports.PERMISSIONS_KEY = 'permissions';
const RequirePermissions = (module, actions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, { module, actions });
exports.RequirePermissions = RequirePermissions;


/***/ }),
/* 27 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JwtStrategy = void 0;
const common_1 = __webpack_require__(3);
const passport_1 = __webpack_require__(12);
const mongoose_1 = __webpack_require__(5);
const mongoose_2 = __webpack_require__(15);
const passport_jwt_1 = __webpack_require__(28);
const user_schema_1 = __webpack_require__(18);
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor(userModel) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        });
        this.userModel = userModel;
    }
    async validate(payload) {
        const user = await this.userModel
            .findById(payload.sub)
            .select('-password -passwordResetToken -emailVerificationToken')
            .exec();
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Usuario inválido o inactivo');
        }
        return {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            permissions: user.permissions,
            tenantId: user.tenantId,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object])
], JwtStrategy);


/***/ }),
/* 28 */
/***/ ((module) => {

module.exports = require("passport-jwt");

/***/ }),
/* 29 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProductsModule = void 0;
const common_1 = __webpack_require__(3);
const mongoose_1 = __webpack_require__(5);
const products_controller_1 = __webpack_require__(30);
const products_service_1 = __webpack_require__(31);
const auth_module_1 = __webpack_require__(10);
const product_schema_1 = __webpack_require__(32);
let ProductsModule = class ProductsModule {
};
exports.ProductsModule = ProductsModule;
exports.ProductsModule = ProductsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            mongoose_1.MongooseModule.forFeature([
                { name: product_schema_1.Product.name, schema: product_schema_1.ProductSchema },
            ]),
        ],
        controllers: [products_controller_1.ProductsController],
        providers: [products_service_1.ProductsService],
        exports: [products_service_1.ProductsService],
    })
], ProductsModule);


/***/ }),
/* 30 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProductsController = void 0;
const common_1 = __webpack_require__(3);
const swagger_1 = __webpack_require__(7);
const products_service_1 = __webpack_require__(31);
const product_dto_1 = __webpack_require__(33);
const jwt_auth_guard_1 = __webpack_require__(23);
const tenant_guard_1 = __webpack_require__(24);
const permissions_guard_1 = __webpack_require__(25);
const permissions_decorator_1 = __webpack_require__(26);
let ProductsController = class ProductsController {
    constructor(productsService) {
        this.productsService = productsService;
    }
    async create(createProductDto, req) {
        try {
            const product = await this.productsService.create(createProductDto, req.user);
            return {
                success: true,
                message: 'Producto creado exitosamente',
                data: product,
            };
        }
        catch (error) {
            if (error.code === 11000) {
                throw new common_1.HttpException('El SKU ya existe en el sistema', common_1.HttpStatus.CONFLICT);
            }
            throw new common_1.HttpException(error.message || 'Error al crear el producto', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async findAll(query, req) {
        try {
            const result = await this.productsService.findAll(query, req.user.tenantId);
            return {
                success: true,
                message: 'Productos obtenidos exitosamente',
                data: result.products,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al obtener los productos', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findOne(id, req) {
        try {
            const product = await this.productsService.findOne(id, req.user.tenantId);
            if (!product) {
                throw new common_1.HttpException('Producto no encontrado', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                message: 'Producto obtenido exitosamente',
                data: product,
            };
        }
        catch (error) {
            if (error.status === common_1.HttpStatus.NOT_FOUND) {
                throw error;
            }
            throw new common_1.HttpException(error.message || 'Error al obtener el producto', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findBySku(sku, req) {
        try {
            const product = await this.productsService.findBySku(sku, req.user.tenantId);
            if (!product) {
                throw new common_1.HttpException('Producto no encontrado', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                message: 'Producto obtenido exitosamente',
                data: product,
            };
        }
        catch (error) {
            if (error.status === common_1.HttpStatus.NOT_FOUND) {
                throw error;
            }
            throw new common_1.HttpException(error.message || 'Error al obtener el producto', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async update(id, updateProductDto, req) {
        try {
            const product = await this.productsService.update(id, updateProductDto, req.user);
            if (!product) {
                throw new common_1.HttpException('Producto no encontrado', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                message: 'Producto actualizado exitosamente',
                data: product,
            };
        }
        catch (error) {
            if (error.status === common_1.HttpStatus.NOT_FOUND) {
                throw error;
            }
            throw new common_1.HttpException(error.message || 'Error al actualizar el producto', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async remove(id, req) {
        try {
            const result = await this.productsService.remove(id, req.user.tenantId);
            if (!result) {
                throw new common_1.HttpException('Producto no encontrado', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                message: 'Producto eliminado exitosamente',
            };
        }
        catch (error) {
            if (error.status === common_1.HttpStatus.NOT_FOUND) {
                throw error;
            }
            throw new common_1.HttpException(error.message || 'Error al eliminar el producto', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getCategories(req) {
        try {
            const categories = await this.productsService.getCategories(req.user.tenantId);
            return {
                success: true,
                message: 'Categorías obtenidas exitosamente',
                data: categories,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al obtener las categorías', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getBrands(req) {
        try {
            const brands = await this.productsService.getBrands(req.user.tenantId);
            return {
                success: true,
                message: 'Marcas obtenidas exitosamente',
                data: brands,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al obtener las marcas', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async addVariant(id, variantDto, req) {
        try {
            const product = await this.productsService.addVariant(id, variantDto, req.user);
            return {
                success: true,
                message: 'Variante agregada exitosamente',
                data: product,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al agregar la variante', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async addSupplier(id, supplierDto, req) {
        try {
            const product = await this.productsService.addSupplier(id, supplierDto, req.user);
            return {
                success: true,
                message: 'Proveedor agregado exitosamente',
                data: product,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al agregar el proveedor', common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('products', ['create']),
    (0, swagger_1.ApiOperation)({ summary: 'Crear un nuevo producto' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Producto creado exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Datos inválidos' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'SKU ya existe' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof product_dto_1.CreateProductDto !== "undefined" && product_dto_1.CreateProductDto) === "function" ? _b : Object, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('products', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener lista de productos con filtros' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista de productos obtenida exitosamente' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof product_dto_1.ProductQueryDto !== "undefined" && product_dto_1.ProductQueryDto) === "function" ? _c : Object, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('products', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener un producto por ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Producto obtenido exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Producto no encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('sku/:sku'),
    (0, permissions_decorator_1.RequirePermissions)('products', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener un producto por SKU' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Producto obtenido exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Producto no encontrado' }),
    __param(0, (0, common_1.Param)('sku')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findBySku", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('products', ['update']),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar un producto' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Producto actualizado exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Producto no encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_d = typeof product_dto_1.UpdateProductDto !== "undefined" && product_dto_1.UpdateProductDto) === "function" ? _d : Object, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('products', ['delete']),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar un producto (soft delete)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Producto eliminado exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Producto no encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('categories/list'),
    (0, permissions_decorator_1.RequirePermissions)('products', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener lista de categorías disponibles' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Categorías obtenidas exitosamente' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('brands/list'),
    (0, permissions_decorator_1.RequirePermissions)('products', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener lista de marcas disponibles' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Marcas obtenidas exitosamente' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getBrands", null);
__decorate([
    (0, common_1.Post)(':id/variants'),
    (0, permissions_decorator_1.RequirePermissions)('products', ['update']),
    (0, swagger_1.ApiOperation)({ summary: 'Agregar variante a un producto' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Variante agregada exitosamente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "addVariant", null);
__decorate([
    (0, common_1.Post)(':id/suppliers'),
    (0, permissions_decorator_1.RequirePermissions)('products', ['update']),
    (0, swagger_1.ApiOperation)({ summary: 'Agregar proveedor a un producto' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Proveedor agregado exitosamente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "addSupplier", null);
exports.ProductsController = ProductsController = __decorate([
    (0, swagger_1.ApiTags)('products'),
    (0, common_1.Controller)('products'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [typeof (_a = typeof products_service_1.ProductsService !== "undefined" && products_service_1.ProductsService) === "function" ? _a : Object])
], ProductsController);


/***/ }),
/* 31 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ProductsService_1;
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProductsService = void 0;
const common_1 = __webpack_require__(3);
const mongoose_1 = __webpack_require__(5);
const mongoose_2 = __webpack_require__(15);
const product_schema_1 = __webpack_require__(32);
let ProductsService = ProductsService_1 = class ProductsService {
    constructor(productModel) {
        this.productModel = productModel;
        this.logger = new common_1.Logger(ProductsService_1.name);
    }
    async create(createProductDto, user) {
        this.logger.log(`Creating product with SKU: ${createProductDto.sku}`);
        const productNumber = await this.generateProductNumber(user.tenantId);
        const existingProduct = await this.productModel.findOne({
            sku: createProductDto.sku,
            tenantId: user.tenantId,
        });
        if (existingProduct) {
            throw new Error(`El SKU ${createProductDto.sku} ya existe`);
        }
        const variantSkus = createProductDto.variants.map(v => v.sku);
        const duplicateSkus = variantSkus.filter((sku, index) => variantSkus.indexOf(sku) !== index);
        if (duplicateSkus.length > 0) {
            throw new Error(`SKUs de variantes duplicados: ${duplicateSkus.join(', ')}`);
        }
        const barcodes = createProductDto.variants.map(v => v.barcode);
        const duplicateBarcodes = barcodes.filter((barcode, index) => barcodes.indexOf(barcode) !== index);
        if (duplicateBarcodes.length > 0) {
            throw new Error(`Códigos de barras duplicados: ${duplicateBarcodes.join(', ')}`);
        }
        if (createProductDto.isPerishable) {
            if (!createProductDto.shelfLifeDays || createProductDto.shelfLifeDays <= 0) {
                throw new Error('Los productos perecederos deben tener una vida útil válida');
            }
            if (!createProductDto.storageTemperature) {
                throw new Error('Los productos perecederos deben especificar temperatura de almacenamiento');
            }
            createProductDto.inventoryConfig.fefoEnabled = true;
            createProductDto.inventoryConfig.trackExpiration = true;
        }
        if (createProductDto.pricingRules.minimumMargin < 0 || createProductDto.pricingRules.minimumMargin > 1) {
            throw new Error('El margen mínimo debe estar entre 0 y 1 (0% - 100%)');
        }
        const productData = {
            ...createProductDto,
            createdBy: user.id,
            tenantId: user.tenantId,
        };
        const createdProduct = new this.productModel(productData);
        const savedProduct = await createdProduct.save();
        this.logger.log(`Product created successfully with ID: ${savedProduct._id}`);
        return savedProduct;
    }
    async findAll(query, tenantId) {
        this.logger.log(`Finding products for tenant: ${tenantId}`);
        const { page = 1, limit = 20, search, category, brand, isActive = true, isPerishable, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const filter = { tenantId: new mongoose_2.Types.ObjectId(tenantId) };
        if (isActive !== undefined) {
            filter.isActive = isActive;
        }
        if (isPerishable !== undefined) {
            filter.isPerishable = isPerishable;
        }
        if (category) {
            filter.category = { $regex: category, $options: 'i' };
        }
        if (brand) {
            filter.brand = { $regex: brand, $options: 'i' };
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } },
                { 'variants.sku': { $regex: search, $options: 'i' } },
                { 'variants.barcode': { $regex: search, $options: 'i' } },
            ];
        }
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            this.productModel
                .find(filter)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .populate('suppliers.supplierId', 'name')
                .exec(),
            this.productModel.countDocuments(filter),
        ]);
        return {
            products,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(id, tenantId) {
        this.logger.log(`Finding product by ID: ${id}`);
        return this.productModel
            .findOne({ _id: id, tenantId })
            .populate('suppliers.supplierId', 'name contactInfo')
            .populate('createdBy', 'firstName lastName')
            .populate('updatedBy', 'firstName lastName')
            .exec();
    }
    async findBySku(sku, tenantId) {
        this.logger.log(`Finding product by SKU: ${sku}`);
        return this.productModel
            .findOne({ sku, tenantId })
            .populate('suppliers.supplierId', 'name contactInfo')
            .exec();
    }
    async update(id, updateProductDto, user) {
        this.logger.log(`Updating product with ID: ${id}`);
        if (updateProductDto.isPerishable !== undefined) {
            if (updateProductDto.isPerishable && updateProductDto.shelfLifeDays && updateProductDto.shelfLifeDays <= 0) {
                throw new Error('Los productos perecederos deben tener una vida útil válida');
            }
        }
        const updateData = {
            ...updateProductDto,
            updatedBy: user.id,
        };
        return this.productModel
            .findOneAndUpdate({ _id: id, tenantId: user.tenantId }, updateData, { new: true, runValidators: true })
            .populate('suppliers.supplierId', 'name')
            .exec();
    }
    async remove(id, tenantId) {
        this.logger.log(`Soft deleting product with ID: ${id}`);
        const result = await this.productModel.updateOne({ _id: id, tenantId }, { isActive: false });
        return result.modifiedCount > 0;
    }
    async getCategories(tenantId) {
        this.logger.log(`Getting categories for tenant: ${tenantId}`);
        const categories = await this.productModel.distinct('category', {
            tenantId,
            isActive: true,
        });
        return categories.sort();
    }
    async getBrands(tenantId) {
        this.logger.log(`Getting brands for tenant: ${tenantId}`);
        const brands = await this.productModel.distinct('brand', {
            tenantId,
            isActive: true,
        });
        return brands.sort();
    }
    async addVariant(id, variantDto, user) {
        this.logger.log(`Adding variant to product: ${id}`);
        const existingProduct = await this.productModel.findOne({
            $or: [
                { 'variants.sku': variantDto.sku },
                { 'variants.barcode': variantDto.barcode },
            ],
            tenantId: user.tenantId,
        });
        if (existingProduct) {
            throw new Error('El SKU o código de barras de la variante ya existe');
        }
        return this.productModel
            .findOneAndUpdate({ _id: id, tenantId: user.tenantId }, {
            $push: { variants: variantDto },
            updatedBy: user.id,
        }, { new: true, runValidators: true })
            .exec();
    }
    async addSupplier(id, supplierDto, user) {
        this.logger.log(`Adding supplier to product: ${id}`);
        const existingProduct = await this.productModel.findOne({
            _id: id,
            'suppliers.supplierId': supplierDto.supplierId,
            tenantId: user.tenantId,
        });
        if (existingProduct) {
            throw new Error('El proveedor ya está asociado a este producto');
        }
        return this.productModel
            .findOneAndUpdate({ _id: id, tenantId: user.tenantId }, {
            $push: { suppliers: supplierDto },
            updatedBy: user.id,
        }, { new: true, runValidators: true })
            .exec();
    }
    async findByVariantSku(variantSku, tenantId) {
        this.logger.log(`Finding product by variant SKU: ${variantSku}`);
        return this.productModel
            .findOne({
            'variants.sku': variantSku,
            tenantId,
            isActive: true,
        })
            .exec();
    }
    async findByBarcode(barcode, tenantId) {
        this.logger.log(`Finding product by barcode: ${barcode}`);
        return this.productModel
            .findOne({
            'variants.barcode': barcode,
            tenantId,
            isActive: true,
        })
            .exec();
    }
    async getPerishableProducts(tenantId, daysToExpire = 7) {
        this.logger.log(`Getting perishable products expiring in ${daysToExpire} days`);
        return this.productModel
            .find({
            tenantId,
            isActive: true,
            isPerishable: true,
            shelfLifeDays: { $lte: daysToExpire },
        })
            .exec();
    }
    async generateProductNumber(tenantId) {
        const count = await this.productModel.countDocuments({ tenantId });
        return `PROD-${(count + 1).toString().padStart(6, '0')}`;
    }
    async validateProductAvailability(productSku, variantSku, tenantId) {
        const product = await this.productModel
            .findOne({
            sku: productSku,
            tenantId,
            isActive: true,
        })
            .exec();
        if (!product) {
            return { isAvailable: false, product: null };
        }
        if (variantSku) {
            const variant = product.variants.find(v => v.sku === variantSku && v.isActive);
            if (!variant) {
                return { isAvailable: false, product };
            }
        }
        return { isAvailable: true, product };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = ProductsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object])
], ProductsService);


/***/ }),
/* 32 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProductSchema = exports.Product = exports.ProductSupplier = exports.ProductVariant = void 0;
const mongoose_1 = __webpack_require__(5);
const mongoose_2 = __webpack_require__(15);
let ProductVariant = class ProductVariant {
};
exports.ProductVariant = ProductVariant;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProductVariant.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProductVariant.prototype, "sku", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProductVariant.prototype, "barcode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProductVariant.prototype, "unit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], ProductVariant.prototype, "unitSize", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], ProductVariant.prototype, "basePrice", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], ProductVariant.prototype, "costPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ProductVariant.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProductVariant.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)([String]),
    __metadata("design:type", Array)
], ProductVariant.prototype, "images", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProductVariant.prototype, "dimensions", void 0);
exports.ProductVariant = ProductVariant = __decorate([
    (0, mongoose_1.Schema)()
], ProductVariant);
let ProductSupplier = class ProductSupplier {
};
exports.ProductSupplier = ProductSupplier;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Supplier', required: true }),
    __metadata("design:type", typeof (_a = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _a : Object)
], ProductSupplier.prototype, "supplierId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProductSupplier.prototype, "supplierName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProductSupplier.prototype, "supplierSku", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], ProductSupplier.prototype, "costPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], ProductSupplier.prototype, "leadTimeDays", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], ProductSupplier.prototype, "minimumOrderQuantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ProductSupplier.prototype, "isPreferred", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], ProductSupplier.prototype, "lastUpdated", void 0);
exports.ProductSupplier = ProductSupplier = __decorate([
    (0, mongoose_1.Schema)()
], ProductSupplier);
let Product = class Product {
};
exports.Product = Product;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], Product.prototype, "sku", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Product.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Product.prototype, "subcategory", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Product.prototype, "brand", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Product.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)([String]),
    __metadata("design:type", Array)
], Product.prototype, "tags", void 0);
__decorate([
    (0, mongoose_1.Prop)([ProductVariant]),
    __metadata("design:type", Array)
], Product.prototype, "variants", void 0);
__decorate([
    (0, mongoose_1.Prop)([ProductSupplier]),
    __metadata("design:type", Array)
], Product.prototype, "suppliers", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Boolean)
], Product.prototype, "isPerishable", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Product.prototype, "shelfLifeDays", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Product.prototype, "storageTemperature", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Product.prototype, "storageHumidity", void 0);
__decorate([
    (0, mongoose_1.Prop)([String]),
    __metadata("design:type", Array)
], Product.prototype, "allergens", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Product.prototype, "nutritionalInfo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Product.prototype, "pricingRules", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Product.prototype, "inventoryConfig", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: true }),
    __metadata("design:type", Boolean)
], Product.prototype, "ivaApplicable", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: false }),
    __metadata("design:type", Boolean)
], Product.prototype, "igtfExempt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Product.prototype, "taxCategory", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Product.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", typeof (_c = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _c : Object)
], Product.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", typeof (_d = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _d : Object)
], Product.prototype, "updatedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Tenant', required: true }),
    __metadata("design:type", typeof (_e = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _e : Object)
], Product.prototype, "tenantId", void 0);
exports.Product = Product = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Product);
exports.ProductSchema = mongoose_1.SchemaFactory.createForClass(Product);
exports.ProductSchema.index({ sku: 1, tenantId: 1 }, { unique: true });
exports.ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
exports.ProductSchema.index({ category: 1, subcategory: 1, tenantId: 1 });
exports.ProductSchema.index({ brand: 1, tenantId: 1 });
exports.ProductSchema.index({ isActive: 1, tenantId: 1 });
exports.ProductSchema.index({ 'variants.sku': 1, tenantId: 1 });
exports.ProductSchema.index({ 'variants.barcode': 1, tenantId: 1 });
exports.ProductSchema.index({ isPerishable: 1, tenantId: 1 });
exports.ProductSchema.index({ createdAt: -1, tenantId: 1 });


/***/ }),
/* 33 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProductQueryDto = exports.UpdateProductDto = exports.CreateProductDto = exports.CreateProductSupplierDto = exports.CreateProductVariantDto = void 0;
const class_validator_1 = __webpack_require__(21);
const class_transformer_1 = __webpack_require__(22);
const swagger_1 = __webpack_require__(7);
class CreateProductVariantDto {
}
exports.CreateProductVariantDto = CreateProductVariantDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre de la variante' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductVariantDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'SKU único de la variante' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductVariantDto.prototype, "sku", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Código de barras' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductVariantDto.prototype, "barcode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Unidad de medida', example: 'kg' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductVariantDto.prototype, "unit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tamaño de la unidad', example: 500 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreateProductVariantDto.prototype, "unitSize", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Precio base en VES' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProductVariantDto.prototype, "basePrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Precio de costo en VES' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProductVariantDto.prototype, "costPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Descripción de la variante' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProductVariantDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URLs de imágenes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateProductVariantDto.prototype, "images", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Dimensiones del producto' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateProductVariantDto.prototype, "dimensions", void 0);
class CreateProductSupplierDto {
}
exports.CreateProductSupplierDto = CreateProductSupplierDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID del proveedor' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateProductSupplierDto.prototype, "supplierId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre del proveedor' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductSupplierDto.prototype, "supplierName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'SKU del proveedor' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductSupplierDto.prototype, "supplierSku", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Precio de costo' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProductSupplierDto.prototype, "costPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tiempo de entrega en días' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateProductSupplierDto.prototype, "leadTimeDays", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Cantidad mínima de pedido' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateProductSupplierDto.prototype, "minimumOrderQuantity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Es proveedor preferido', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateProductSupplierDto.prototype, "isPreferred", void 0);
class CreateProductDto {
}
exports.CreateProductDto = CreateProductDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'SKU único del producto' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "sku", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre del producto' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Categoría del producto' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Subcategoría del producto' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "subcategory", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Marca del producto' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "brand", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Descripción del producto' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Etiquetas del producto' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Variantes del producto', type: [CreateProductVariantDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateProductVariantDto),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "variants", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Proveedores del producto', type: [CreateProductSupplierDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateProductSupplierDto),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "suppliers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Es producto perecedero' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateProductDto.prototype, "isPerishable", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vida útil en días' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "shelfLifeDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Temperatura de almacenamiento', enum: ['ambiente', 'refrigerado', 'congelado'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['ambiente', 'refrigerado', 'congelado']),
    __metadata("design:type", String)
], CreateProductDto.prototype, "storageTemperature", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Humedad de almacenamiento', enum: ['baja', 'media', 'alta'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['baja', 'media', 'alta']),
    __metadata("design:type", String)
], CreateProductDto.prototype, "storageHumidity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Alérgenos' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "allergens", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Información nutricional' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateProductDto.prototype, "nutritionalInfo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Reglas de precios' }),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateProductDto.prototype, "pricingRules", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Configuración de inventario' }),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateProductDto.prototype, "inventoryConfig", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Aplica IVA 16%', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateProductDto.prototype, "ivaApplicable", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Exento de IGTF 3%', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateProductDto.prototype, "igtfExempt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Categoría fiscal del producto' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "taxCategory", void 0);
class UpdateProductDto {
}
exports.UpdateProductDto = UpdateProductDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre del producto' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Categoría del producto' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Subcategoría del producto' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "subcategory", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Marca del producto' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "brand", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Descripción del producto' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Etiquetas del producto' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateProductDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Es producto perecedero' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateProductDto.prototype, "isPerishable", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vida útil en días' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateProductDto.prototype, "shelfLifeDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Temperatura de almacenamiento' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['ambiente', 'refrigerado', 'congelado']),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "storageTemperature", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Reglas de precios' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateProductDto.prototype, "pricingRules", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuración de inventario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateProductDto.prototype, "inventoryConfig", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Estado activo del producto' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateProductDto.prototype, "isActive", void 0);
class ProductQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
        this.isActive = true;
        this.sortBy = 'createdAt';
        this.sortOrder = 'desc';
    }
}
exports.ProductQueryDto = ProductQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Página', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ProductQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Límite por página', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ProductQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Término de búsqueda' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProductQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Categoría' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProductQueryDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Marca' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProductQueryDto.prototype, "brand", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Solo productos activos', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProductQueryDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Solo productos perecederos' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProductQueryDto.prototype, "isPerishable", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Ordenar por', enum: ['name', 'category', 'createdAt', 'updatedAt'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['name', 'category', 'createdAt', 'updatedAt']),
    __metadata("design:type", String)
], ProductQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Orden', enum: ['asc', 'desc'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['asc', 'desc']),
    __metadata("design:type", String)
], ProductQueryDto.prototype, "sortOrder", void 0);


/***/ }),
/* 34 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InventoryModule = void 0;
const common_1 = __webpack_require__(3);
const mongoose_1 = __webpack_require__(5);
const inventory_controller_1 = __webpack_require__(35);
const inventory_service_1 = __webpack_require__(36);
const auth_module_1 = __webpack_require__(10);
const inventory_schema_1 = __webpack_require__(37);
const inventory_schema_2 = __webpack_require__(37);
let InventoryModule = class InventoryModule {
};
exports.InventoryModule = InventoryModule;
exports.InventoryModule = InventoryModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            mongoose_1.MongooseModule.forFeature([
                { name: inventory_schema_1.Inventory.name, schema: inventory_schema_1.InventorySchema },
                { name: inventory_schema_2.InventoryMovement.name, schema: inventory_schema_2.InventoryMovementSchema },
            ]),
        ],
        controllers: [inventory_controller_1.InventoryController],
        providers: [inventory_service_1.InventoryService],
        exports: [inventory_service_1.InventoryService],
    })
], InventoryModule);


/***/ }),
/* 35 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g, _h;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InventoryController = void 0;
const common_1 = __webpack_require__(3);
const swagger_1 = __webpack_require__(7);
const inventory_service_1 = __webpack_require__(36);
const inventory_dto_1 = __webpack_require__(38);
const jwt_auth_guard_1 = __webpack_require__(23);
const tenant_guard_1 = __webpack_require__(24);
const permissions_guard_1 = __webpack_require__(25);
const permissions_decorator_1 = __webpack_require__(26);
let InventoryController = class InventoryController {
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    async create(createInventoryDto, req) {
        try {
            const inventory = await this.inventoryService.create(createInventoryDto, req.user);
            return {
                success: true,
                message: 'Inventario creado exitosamente',
                data: inventory,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al crear el inventario', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async findAll(query, req) {
        try {
            const result = await this.inventoryService.findAll(query, req.user.tenantId);
            return {
                success: true,
                message: 'Inventario obtenido exitosamente',
                data: result.inventory,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al obtener el inventario', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findOne(id, req) {
        try {
            const inventory = await this.inventoryService.findOne(id, req.user.tenantId);
            if (!inventory) {
                throw new common_1.HttpException('Inventario no encontrado', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                message: 'Inventario obtenido exitosamente',
                data: inventory,
            };
        }
        catch (error) {
            if (error.status === common_1.HttpStatus.NOT_FOUND) {
                throw error;
            }
            throw new common_1.HttpException(error.message || 'Error al obtener el inventario', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findByProductSku(productSku, req) {
        try {
            const inventory = await this.inventoryService.findByProductSku(productSku, req.user.tenantId);
            if (!inventory) {
                throw new common_1.HttpException('Inventario no encontrado', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                message: 'Inventario obtenido exitosamente',
                data: inventory,
            };
        }
        catch (error) {
            if (error.status === common_1.HttpStatus.NOT_FOUND) {
                throw error;
            }
            throw new common_1.HttpException(error.message || 'Error al obtener el inventario', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async createMovement(movementDto, req) {
        try {
            const movement = await this.inventoryService.createMovement(movementDto, req.user);
            return {
                success: true,
                message: 'Movimiento registrado exitosamente',
                data: movement,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al registrar el movimiento', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getMovements(query, req) {
        try {
            const result = await this.inventoryService.getMovements(query, req.user.tenantId);
            return {
                success: true,
                message: 'Historial obtenido exitosamente',
                data: result.movements,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al obtener el historial', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async reserveInventory(reserveDto, req) {
        try {
            const result = await this.inventoryService.reserveInventory(reserveDto, req.user);
            return {
                success: true,
                message: 'Inventario reservado exitosamente',
                data: result,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al reservar el inventario', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async releaseInventory(releaseDto, req) {
        try {
            const result = await this.inventoryService.releaseInventory(releaseDto, req.user);
            return {
                success: true,
                message: 'Reserva liberada exitosamente',
                data: result,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al liberar la reserva', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async adjustInventory(adjustDto, req) {
        try {
            const result = await this.inventoryService.adjustInventory(adjustDto, req.user);
            return {
                success: true,
                message: 'Inventario ajustado exitosamente',
                data: result,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al ajustar el inventario', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getLowStockAlerts(req) {
        try {
            const alerts = await this.inventoryService.getLowStockAlerts(req.user.tenantId);
            return {
                success: true,
                message: 'Alertas obtenidas exitosamente',
                data: alerts,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al obtener las alertas', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getExpirationAlerts(req, days = 7) {
        try {
            const alerts = await this.inventoryService.getExpirationAlerts(req.user.tenantId, days);
            return {
                success: true,
                message: 'Alertas obtenidas exitosamente',
                data: alerts,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al obtener las alertas', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getInventorySummary(req) {
        try {
            const summary = await this.inventoryService.getInventorySummary(req.user.tenantId);
            return {
                success: true,
                message: 'Resumen obtenido exitosamente',
                data: summary,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al obtener el resumen', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('inventory', ['create']),
    (0, swagger_1.ApiOperation)({ summary: 'Crear registro de inventario inicial' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Inventario creado exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof inventory_dto_1.CreateInventoryDto !== "undefined" && inventory_dto_1.CreateInventoryDto) === "function" ? _b : Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('inventory', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener lista de inventario con filtros' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Inventario obtenido exitosamente' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof inventory_dto_1.InventoryQueryDto !== "undefined" && inventory_dto_1.InventoryQueryDto) === "function" ? _c : Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('inventory', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener inventario por ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Inventario obtenido exitosamente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('product/:productSku'),
    (0, permissions_decorator_1.RequirePermissions)('inventory', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener inventario por SKU de producto' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Inventario obtenido exitosamente' }),
    __param(0, (0, common_1.Param)('productSku')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findByProductSku", null);
__decorate([
    (0, common_1.Post)('movements'),
    (0, permissions_decorator_1.RequirePermissions)('inventory', ['create']),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar movimiento de inventario' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Movimiento registrado exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof inventory_dto_1.InventoryMovementDto !== "undefined" && inventory_dto_1.InventoryMovementDto) === "function" ? _d : Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createMovement", null);
__decorate([
    (0, common_1.Get)('movements/history'),
    (0, permissions_decorator_1.RequirePermissions)('inventory', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener historial de movimientos' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Historial obtenido exitosamente' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_e = typeof inventory_dto_1.InventoryMovementQueryDto !== "undefined" && inventory_dto_1.InventoryMovementQueryDto) === "function" ? _e : Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getMovements", null);
__decorate([
    (0, common_1.Post)('reserve'),
    (0, permissions_decorator_1.RequirePermissions)('inventory', ['update']),
    (0, swagger_1.ApiOperation)({ summary: 'Reservar inventario para una orden' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Inventario reservado exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_f = typeof inventory_dto_1.ReserveInventoryDto !== "undefined" && inventory_dto_1.ReserveInventoryDto) === "function" ? _f : Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "reserveInventory", null);
__decorate([
    (0, common_1.Post)('release'),
    (0, permissions_decorator_1.RequirePermissions)('inventory', ['update']),
    (0, swagger_1.ApiOperation)({ summary: 'Liberar reserva de inventario' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reserva liberada exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_g = typeof inventory_dto_1.ReleaseInventoryDto !== "undefined" && inventory_dto_1.ReleaseInventoryDto) === "function" ? _g : Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "releaseInventory", null);
__decorate([
    (0, common_1.Post)('adjust'),
    (0, permissions_decorator_1.RequirePermissions)('inventory', ['update']),
    (0, swagger_1.ApiOperation)({ summary: 'Ajustar inventario manualmente' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Inventario ajustado exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_h = typeof inventory_dto_1.AdjustInventoryDto !== "undefined" && inventory_dto_1.AdjustInventoryDto) === "function" ? _h : Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "adjustInventory", null);
__decorate([
    (0, common_1.Get)('alerts/low-stock'),
    (0, permissions_decorator_1.RequirePermissions)('inventory', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener alertas de stock bajo' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Alertas obtenidas exitosamente' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getLowStockAlerts", null);
__decorate([
    (0, common_1.Get)('alerts/expiration'),
    (0, permissions_decorator_1.RequirePermissions)('inventory', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener alertas de productos próximos a vencer' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Alertas obtenidas exitosamente' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getExpirationAlerts", null);
__decorate([
    (0, common_1.Get)('reports/summary'),
    (0, permissions_decorator_1.RequirePermissions)('inventory', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener resumen de inventario' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Resumen obtenido exitosamente' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getInventorySummary", null);
exports.InventoryController = InventoryController = __decorate([
    (0, swagger_1.ApiTags)('inventory'),
    (0, common_1.Controller)('inventory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [typeof (_a = typeof inventory_service_1.InventoryService !== "undefined" && inventory_service_1.InventoryService) === "function" ? _a : Object])
], InventoryController);


/***/ }),
/* 36 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var InventoryService_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InventoryService = void 0;
const common_1 = __webpack_require__(3);
const mongoose_1 = __webpack_require__(5);
const mongoose_2 = __webpack_require__(15);
const mongoose_3 = __webpack_require__(5);
const mongoose_4 = __webpack_require__(15);
const inventory_schema_1 = __webpack_require__(37);
const inventory_schema_2 = __webpack_require__(37);
let InventoryService = InventoryService_1 = class InventoryService {
    constructor(inventoryModel, movementModel, connection) {
        this.inventoryModel = inventoryModel;
        this.movementModel = movementModel;
        this.connection = connection;
        this.logger = new common_1.Logger(InventoryService_1.name);
    }
    async create(createInventoryDto, user) {
        this.logger.log(`Creating inventory for product: ${createInventoryDto.productSku}`);
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const existingInventory = await this.inventoryModel.findOne({
                productSku: createInventoryDto.productSku,
                variantSku: createInventoryDto.variantSku,
                tenantId: user.tenantId,
            }).session(session);
            if (existingInventory) {
                throw new Error('Ya existe inventario para este producto/variante');
            }
            const inventoryData = {
                ...createInventoryDto,
                availableQuantity: createInventoryDto.totalQuantity,
                reservedQuantity: 0,
                committedQuantity: 0,
                lastCostPrice: createInventoryDto.averageCostPrice,
                alerts: {
                    lowStock: false,
                    nearExpiration: false,
                    expired: false,
                    overstock: false,
                },
                metrics: {
                    turnoverRate: 0,
                    daysOnHand: 0,
                    averageDailySales: 0,
                    seasonalityFactor: 1,
                },
                createdBy: user.id,
                tenantId: user.tenantId,
            };
            const inventory = new this.inventoryModel(inventoryData);
            const savedInventory = await inventory.save({ session });
            if (createInventoryDto.totalQuantity > 0) {
                await this.createMovementRecord({
                    inventoryId: savedInventory._id.toString(),
                    productId: createInventoryDto.productId,
                    productSku: createInventoryDto.productSku,
                    movementType: 'in',
                    quantity: createInventoryDto.totalQuantity,
                    unitCost: createInventoryDto.averageCostPrice,
                    totalCost: createInventoryDto.totalQuantity * createInventoryDto.averageCostPrice,
                    reason: 'Inventario inicial',
                    balanceAfter: {
                        totalQuantity: savedInventory.totalQuantity,
                        availableQuantity: savedInventory.availableQuantity,
                        reservedQuantity: savedInventory.reservedQuantity,
                        averageCostPrice: savedInventory.averageCostPrice,
                    },
                }, user, session);
            }
            await session.commitTransaction();
            this.logger.log(`Inventory created successfully with ID: ${savedInventory._id}`);
            return savedInventory;
        }
        catch (error) {
            await session.abortTransaction();
            this.logger.error(`Error creating inventory: ${error.message}`);
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    async findAll(query, tenantId) {
        this.logger.log(`Finding inventory for tenant: ${tenantId}`);
        const { page = 1, limit = 20, search, warehouse, lowStock, nearExpiration, expired, minAvailable, sortBy = 'lastUpdated', sortOrder = 'desc', } = query;
        const filter = { tenantId: new mongoose_2.Types.ObjectId(tenantId) };
        if (warehouse) {
            filter['location.warehouse'] = warehouse;
        }
        if (lowStock) {
            filter['alerts.lowStock'] = true;
        }
        if (nearExpiration) {
            filter['alerts.nearExpiration'] = true;
        }
        if (expired) {
            filter['alerts.expired'] = true;
        }
        if (minAvailable !== undefined) {
            filter.availableQuantity = { $gte: minAvailable };
        }
        if (search) {
            filter.$or = [
                { productSku: { $regex: search, $options: 'i' } },
                { productName: { $regex: search, $options: 'i' } },
                { variantSku: { $regex: search, $options: 'i' } },
            ];
        }
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * limit;
        const [inventory, total] = await Promise.all([
            this.inventoryModel
                .find(filter)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .populate('productId', 'name category brand')
                .exec(),
            this.inventoryModel.countDocuments(filter),
        ]);
        return {
            inventory,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(id, tenantId) {
        return this.inventoryModel
            .findOne({ _id: id, tenantId })
            .populate('productId', 'name category brand isPerishable')
            .exec();
    }
    async findByProductSku(productSku, tenantId) {
        return this.inventoryModel
            .findOne({ productSku, tenantId })
            .populate('productId', 'name category brand isPerishable')
            .exec();
    }
    async createMovement(movementDto, user) {
        this.logger.log(`Creating movement for inventory: ${movementDto.inventoryId}`);
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const inventory = await this.inventoryModel
                .findOne({ _id: movementDto.inventoryId, tenantId: user.tenantId })
                .session(session);
            if (!inventory) {
                throw new Error('Inventario no encontrado');
            }
            if (movementDto.movementType === 'out' || movementDto.movementType === 'reservation') {
                if (inventory.availableQuantity < movementDto.quantity) {
                    throw new Error('Cantidad insuficiente en inventario');
                }
            }
            const updatedInventory = await this.updateInventoryQuantities(inventory, movementDto, session);
            const movement = await this.createMovementRecord({
                ...movementDto,
                productId: inventory.productId.toString(),
                totalCost: movementDto.quantity * movementDto.unitCost,
                balanceAfter: {
                    totalQuantity: updatedInventory.totalQuantity,
                    availableQuantity: updatedInventory.availableQuantity,
                    reservedQuantity: updatedInventory.reservedQuantity,
                    averageCostPrice: updatedInventory.averageCostPrice,
                },
            }, user, session);
            await session.commitTransaction();
            return movement;
        }
        catch (error) {
            await session.abortTransaction();
            this.logger.error(`Error creating movement: ${error.message}`);
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    async reserveInventory(reserveDto, user) {
        this.logger.log(`Reserving inventory for order: ${reserveDto.orderId}`);
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const reservations = [];
            for (const item of reserveDto.items) {
                const inventory = await this.inventoryModel
                    .findOne({
                    productSku: item.productSku,
                    variantSku: item.variantSku,
                    tenantId: user.tenantId,
                })
                    .session(session);
                if (!inventory) {
                    throw new Error(`Inventario no encontrado para SKU: ${item.productSku}`);
                }
                if (inventory.availableQuantity < item.quantity) {
                    throw new Error(`Cantidad insuficiente para SKU: ${item.productSku}. Disponible: ${inventory.availableQuantity}, Solicitado: ${item.quantity}`);
                }
                let lotsToReserve = [];
                if (item.useFefo && inventory.lots.length > 0) {
                    lotsToReserve = this.applyFefoLogic(inventory.lots, item.quantity);
                }
                inventory.availableQuantity -= item.quantity;
                inventory.reservedQuantity += item.quantity;
                if (lotsToReserve.length > 0) {
                    for (const lotReservation of lotsToReserve) {
                        const lot = inventory.lots.find(l => l.lotNumber === lotReservation.lotNumber);
                        if (lot) {
                            lot.availableQuantity -= lotReservation.quantity;
                            lot.reservedQuantity += lotReservation.quantity;
                        }
                    }
                }
                await inventory.save({ session });
                await this.createMovementRecord({
                    inventoryId: inventory._id.toString(),
                    productId: inventory.productId.toString(),
                    productSku: item.productSku,
                    movementType: 'reservation',
                    quantity: item.quantity,
                    unitCost: inventory.averageCostPrice,
                    totalCost: item.quantity * inventory.averageCostPrice,
                    reason: 'Reserva para orden',
                    reference: reserveDto.orderId,
                    orderId: reserveDto.orderId,
                    balanceAfter: {
                        totalQuantity: inventory.totalQuantity,
                        availableQuantity: inventory.availableQuantity,
                        reservedQuantity: inventory.reservedQuantity,
                        averageCostPrice: inventory.averageCostPrice,
                    },
                }, user, session);
                reservations.push({
                    productSku: item.productSku,
                    variantSku: item.variantSku,
                    quantity: item.quantity,
                    lots: lotsToReserve,
                    expiresAt: new Date(Date.now() + (reserveDto.expirationMinutes || 30) * 60 * 1000),
                });
            }
            await session.commitTransaction();
            return { reservations, orderId: reserveDto.orderId };
        }
        catch (error) {
            await session.abortTransaction();
            this.logger.error(`Error reserving inventory: ${error.message}`);
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    async releaseInventory(releaseDto, user) {
        this.logger.log(`Releasing inventory for order: ${releaseDto.orderId}`);
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const reservationMovements = await this.movementModel
                .find({
                orderId: releaseDto.orderId,
                movementType: 'reservation',
                tenantId: user.tenantId,
            })
                .session(session);
            if (reservationMovements.length === 0) {
                throw new Error('No se encontraron reservas para esta orden');
            }
            for (const movement of reservationMovements) {
                if (releaseDto.productSkus && !releaseDto.productSkus.includes(movement.productSku)) {
                    continue;
                }
                const inventory = await this.inventoryModel
                    .findOne({ _id: movement.inventoryId })
                    .session(session);
                if (inventory) {
                    inventory.availableQuantity += movement.quantity;
                    inventory.reservedQuantity -= movement.quantity;
                    if (movement.lotNumber) {
                        const lot = inventory.lots.find(l => l.lotNumber === movement.lotNumber);
                        if (lot) {
                            lot.availableQuantity += movement.quantity;
                            lot.reservedQuantity -= movement.quantity;
                        }
                    }
                    await inventory.save({ session });
                    await this.createMovementRecord({ inventoryId: inventory._id.toString(),
                        productId: inventory.productId.toString(),
                        productSku: movement.productSku,
                        movementType: 'release',
                        quantity: movement.quantity,
                        unitCost: movement.unitCost,
                        totalCost: movement.totalCost,
                        reason: 'Liberación de reserva',
                        reference: releaseDto.orderId,
                        orderId: releaseDto.orderId,
                        balanceAfter: {
                            totalQuantity: inventory.totalQuantity,
                            availableQuantity: inventory.availableQuantity,
                            reservedQuantity: inventory.reservedQuantity,
                            averageCostPrice: inventory.averageCostPrice,
                        },
                    }, user, session);
                }
            }
            await session.commitTransaction();
            return { success: true, orderId: releaseDto.orderId };
        }
        catch (error) {
            await session.abortTransaction();
            this.logger.error(`Error releasing inventory: ${error.message}`);
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    async adjustInventory(adjustDto, user) {
        this.logger.log(`Adjusting inventory: ${adjustDto.inventoryId}`);
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const inventory = await this.inventoryModel
                .findOne({ _id: adjustDto.inventoryId, tenantId: user.tenantId })
                .session(session);
            if (!inventory) {
                throw new Error('Inventario no encontrado');
            }
            const oldQuantity = inventory.totalQuantity;
            const difference = adjustDto.newQuantity - oldQuantity;
            inventory.totalQuantity = adjustDto.newQuantity;
            inventory.availableQuantity += difference;
            if (adjustDto.newCostPrice) {
                inventory.averageCostPrice = adjustDto.newCostPrice;
                inventory.lastCostPrice = adjustDto.newCostPrice;
            }
            await inventory.save({ session });
            await this.createMovementRecord({
                inventoryId: inventory._id.toString(),
                productId: inventory.productId.toString(),
                productSku: inventory.productSku,
                movementType: 'adjustment',
                quantity: Math.abs(difference),
                unitCost: inventory.averageCostPrice,
                totalCost: Math.abs(difference) * inventory.averageCostPrice,
                reason: adjustDto.reason,
                lotNumber: adjustDto.lotNumber,
                balanceAfter: {
                    totalQuantity: inventory.totalQuantity,
                    availableQuantity: inventory.availableQuantity,
                    reservedQuantity: inventory.reservedQuantity,
                    averageCostPrice: inventory.averageCostPrice,
                },
            }, user, session);
            await session.commitTransaction();
            return inventory;
        }
        catch (error) {
            await session.abortTransaction();
            this.logger.error(`Error adjusting inventory: ${error.message}`);
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    async getMovements(query, tenantId) {
        const { page = 1, limit = 20, inventoryId, productSku, movementType, dateFrom, dateTo, orderId, } = query;
        const filter = { tenantId: new mongoose_2.Types.ObjectId(tenantId) };
        if (inventoryId)
            filter.inventoryId = new mongoose_2.Types.ObjectId(inventoryId);
        if (productSku)
            filter.productSku = productSku;
        if (movementType)
            filter.movementType = movementType;
        if (orderId)
            filter.orderId = new mongoose_2.Types.ObjectId(orderId);
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom)
                filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo)
                filter.createdAt.$lte = new Date(dateTo);
        }
        const skip = (page - 1) * limit;
        const [movements, total] = await Promise.all([
            this.movementModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('createdBy', 'firstName lastName')
                .exec(),
            this.movementModel.countDocuments(filter),
        ]);
        return {
            movements,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getLowStockAlerts(tenantId) {
        return this.inventoryModel
            .find({
            tenantId,
            'alerts.lowStock': true,
        })
            .populate('productId', 'name category')
            .exec();
    }
    async getExpirationAlerts(tenantId, days = 7) {
        const alertDate = new Date();
        alertDate.setDate(alertDate.getDate() + days);
        return this.inventoryModel
            .find({
            tenantId,
            'lots.expirationDate': { $lte: alertDate },
            'lots.status': 'available',
        })
            .populate('productId', 'name category')
            .exec();
    }
    async getInventorySummary(tenantId) {
        const [totalProducts, lowStockCount, expirationCount, totalValue,] = await Promise.all([
            this.inventoryModel.countDocuments({ tenantId }),
            this.inventoryModel.countDocuments({ tenantId, 'alerts.lowStock': true }),
            this.inventoryModel.countDocuments({ tenantId, 'alerts.nearExpiration': true }),
            this.inventoryModel.aggregate([
                { $match: { tenantId: new mongoose_2.Types.ObjectId(tenantId) } },
                {
                    $group: {
                        _id: null,
                        totalValue: {
                            $sum: { $multiply: ['$totalQuantity', '$averageCostPrice'] }
                        }
                    }
                }
            ]),
        ]);
        return {
            totalProducts,
            lowStockCount,
            expirationCount,
            totalValue: totalValue[0]?.totalValue || 0,
        };
    }
    async updateInventoryQuantities(inventory, movementDto, session) {
        switch (movementDto.movementType) {
            case 'in':
                inventory.totalQuantity += movementDto.quantity;
                inventory.availableQuantity += movementDto.quantity;
                const totalCost = (inventory.totalQuantity - movementDto.quantity) * inventory.averageCostPrice +
                    movementDto.quantity * movementDto.unitCost;
                inventory.averageCostPrice = totalCost / inventory.totalQuantity;
                inventory.lastCostPrice = movementDto.unitCost;
                break;
            case 'out':
                inventory.totalQuantity -= movementDto.quantity;
                inventory.availableQuantity -= movementDto.quantity;
                break;
            case 'reservation':
                inventory.availableQuantity -= movementDto.quantity;
                inventory.reservedQuantity += movementDto.quantity;
                break;
            case 'release':
                inventory.availableQuantity += movementDto.quantity;
                inventory.reservedQuantity -= movementDto.quantity;
                break;
            case 'adjustment':
                break;
        }
        return inventory.save({ session });
    }
    async createMovementRecord(movementData, user, session) {
        const movement = new this.movementModel({
            ...movementData,
            createdBy: user.id,
            tenantId: user.tenantId,
        });
        return movement.save({ session });
    }
    applyFefoLogic(lots, quantityNeeded) {
        const availableLots = lots
            .filter(lot => lot.status === 'available' && lot.availableQuantity > 0)
            .sort((a, b) => {
            if (!a.expirationDate && !b.expirationDate)
                return 0;
            if (!a.expirationDate)
                return 1;
            if (!b.expirationDate)
                return -1;
            return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        });
        const reservations = [];
        let remainingQuantity = quantityNeeded;
        for (const lot of availableLots) {
            if (remainingQuantity <= 0)
                break;
            const quantityFromLot = Math.min(lot.availableQuantity, remainingQuantity);
            reservations.push({
                lotNumber: lot.lotNumber,
                quantity: quantityFromLot,
                expirationDate: lot.expirationDate,
            });
            remainingQuantity -= quantityFromLot;
        }
        if (remainingQuantity > 0) {
            throw new Error(`No hay suficiente stock disponible. Faltante: ${remainingQuantity}`);
        }
        return reservations;
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = InventoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(inventory_schema_1.Inventory.name)),
    __param(1, (0, mongoose_1.InjectModel)(inventory_schema_2.InventoryMovement.name)),
    __param(2, (0, mongoose_3.InjectConnection)()),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, typeof (_b = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _b : Object, typeof (_c = typeof mongoose_4.Connection !== "undefined" && mongoose_4.Connection) === "function" ? _c : Object])
], InventoryService);


/***/ }),
/* 37 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InventoryMovementSchema = exports.InventoryLotSchema = exports.InventorySchema = exports.InventoryMovement = exports.Inventory = exports.InventoryLot = void 0;
const mongoose_1 = __webpack_require__(5);
const mongoose_2 = __webpack_require__(15);
let InventoryLot = class InventoryLot {
};
exports.InventoryLot = InventoryLot;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], InventoryLot.prototype, "lotNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], InventoryLot.prototype, "quantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], InventoryLot.prototype, "availableQuantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], InventoryLot.prototype, "reservedQuantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], InventoryLot.prototype, "costPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], InventoryLot.prototype, "receivedDate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], InventoryLot.prototype, "expirationDate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], InventoryLot.prototype, "manufacturingDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Supplier' }),
    __metadata("design:type", typeof (_d = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _d : Object)
], InventoryLot.prototype, "supplierId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InventoryLot.prototype, "supplierInvoice", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'available' }),
    __metadata("design:type", String)
], InventoryLot.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], InventoryLot.prototype, "qualityCheck", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", typeof (_e = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _e : Object)
], InventoryLot.prototype, "createdBy", void 0);
exports.InventoryLot = InventoryLot = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], InventoryLot);
let Inventory = class Inventory {
};
exports.Inventory = Inventory;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Product', required: true }),
    __metadata("design:type", typeof (_f = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _f : Object)
], Inventory.prototype, "productId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Inventory.prototype, "productSku", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Inventory.prototype, "productName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'ProductVariant' }),
    __metadata("design:type", typeof (_g = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _g : Object)
], Inventory.prototype, "variantId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Inventory.prototype, "variantSku", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Inventory.prototype, "totalQuantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Inventory.prototype, "availableQuantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Inventory.prototype, "reservedQuantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Inventory.prototype, "committedQuantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Inventory.prototype, "averageCostPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Inventory.prototype, "lastCostPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)([InventoryLot]),
    __metadata("design:type", Array)
], Inventory.prototype, "lots", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Inventory.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Inventory.prototype, "alerts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Inventory.prototype, "metrics", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Inventory.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", typeof (_h = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _h : Object)
], Inventory.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", typeof (_j = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _j : Object)
], Inventory.prototype, "updatedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Tenant', required: true }),
    __metadata("design:type", typeof (_k = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _k : Object)
], Inventory.prototype, "tenantId", void 0);
exports.Inventory = Inventory = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Inventory);
let InventoryMovement = class InventoryMovement {
};
exports.InventoryMovement = InventoryMovement;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Inventory', required: true }),
    __metadata("design:type", typeof (_l = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _l : Object)
], InventoryMovement.prototype, "inventoryId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Product', required: true }),
    __metadata("design:type", typeof (_m = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _m : Object)
], InventoryMovement.prototype, "productId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], InventoryMovement.prototype, "productSku", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InventoryMovement.prototype, "lotNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], InventoryMovement.prototype, "movementType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], InventoryMovement.prototype, "quantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], InventoryMovement.prototype, "unitCost", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], InventoryMovement.prototype, "totalCost", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InventoryMovement.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InventoryMovement.prototype, "reference", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Order' }),
    __metadata("design:type", typeof (_o = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _o : Object)
], InventoryMovement.prototype, "orderId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Supplier' }),
    __metadata("design:type", typeof (_p = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _p : Object)
], InventoryMovement.prototype, "supplierId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], InventoryMovement.prototype, "balanceAfter", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", typeof (_q = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _q : Object)
], InventoryMovement.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Tenant', required: true }),
    __metadata("design:type", typeof (_r = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _r : Object)
], InventoryMovement.prototype, "tenantId", void 0);
exports.InventoryMovement = InventoryMovement = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], InventoryMovement);
exports.InventorySchema = mongoose_1.SchemaFactory.createForClass(Inventory);
exports.InventoryLotSchema = mongoose_1.SchemaFactory.createForClass(InventoryLot);
exports.InventoryMovementSchema = mongoose_1.SchemaFactory.createForClass(InventoryMovement);
exports.InventorySchema.index({ productId: 1, tenantId: 1 }, { unique: true });
exports.InventorySchema.index({ productSku: 1, tenantId: 1 });
exports.InventorySchema.index({ variantSku: 1, tenantId: 1 });
exports.InventorySchema.index({ availableQuantity: 1, tenantId: 1 });
exports.InventorySchema.index({ 'alerts.lowStock': 1, tenantId: 1 });
exports.InventorySchema.index({ 'alerts.nearExpiration': 1, tenantId: 1 });
exports.InventorySchema.index({ 'alerts.expired': 1, tenantId: 1 });
exports.InventorySchema.index({ 'lots.expirationDate': 1, tenantId: 1 });
exports.InventorySchema.index({ 'lots.status': 1, tenantId: 1 });
exports.InventorySchema.index({ 'location.warehouse': 1, tenantId: 1 });
exports.InventoryMovementSchema.index({ inventoryId: 1, createdAt: -1 });
exports.InventoryMovementSchema.index({ productId: 1, createdAt: -1, tenantId: 1 });
exports.InventoryMovementSchema.index({ movementType: 1, createdAt: -1, tenantId: 1 });
exports.InventoryMovementSchema.index({ orderId: 1, tenantId: 1 });
exports.InventoryMovementSchema.index({ supplierId: 1, createdAt: -1, tenantId: 1 });
exports.InventoryMovementSchema.index({ createdAt: -1, tenantId: 1 });
exports.InventoryMovementSchema.index({ lotNumber: 1, tenantId: 1 });


/***/ }),
/* 38 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InventoryMovementQueryDto = exports.InventoryQueryDto = exports.AdjustInventoryDto = exports.ReleaseInventoryDto = exports.ReserveInventoryItemDto = exports.ReserveInventoryDto = exports.InventoryMovementDto = exports.CreateInventoryDto = exports.CreateInventoryLotDto = void 0;
const class_validator_1 = __webpack_require__(21);
const class_transformer_1 = __webpack_require__(22);
const swagger_1 = __webpack_require__(7);
class CreateInventoryLotDto {
}
exports.CreateInventoryLotDto = CreateInventoryLotDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Número de lote' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateInventoryLotDto.prototype, "lotNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Cantidad del lote' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreateInventoryLotDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Precio de costo del lote' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateInventoryLotDto.prototype, "costPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Fecha de recepción' }),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], CreateInventoryLotDto.prototype, "receivedDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Fecha de vencimiento' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], CreateInventoryLotDto.prototype, "expirationDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Fecha de fabricación' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], CreateInventoryLotDto.prototype, "manufacturingDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID del proveedor' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateInventoryLotDto.prototype, "supplierId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Número de factura del proveedor' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInventoryLotDto.prototype, "supplierInvoice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Control de calidad' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateInventoryLotDto.prototype, "qualityCheck", void 0);
class CreateInventoryDto {
}
exports.CreateInventoryDto = CreateInventoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID del producto' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'SKU del producto' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "productSku", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre del producto' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "productName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID de la variante' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "variantId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SKU de la variante' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "variantSku", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Cantidad inicial' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateInventoryDto.prototype, "totalQuantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Precio de costo promedio' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateInventoryDto.prototype, "averageCostPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Lotes iniciales', type: [CreateInventoryLotDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateInventoryLotDto),
    __metadata("design:type", Array)
], CreateInventoryDto.prototype, "lots", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Ubicación física' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateInventoryDto.prototype, "location", void 0);
class InventoryMovementDto {
}
exports.InventoryMovementDto = InventoryMovementDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID del inventario' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], InventoryMovementDto.prototype, "inventoryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tipo de movimiento', enum: ['in', 'out', 'adjustment', 'transfer', 'reservation', 'release'] }),
    (0, class_validator_1.IsEnum)(['in', 'out', 'adjustment', 'transfer', 'reservation', 'release']),
    __metadata("design:type", String)
], InventoryMovementDto.prototype, "movementType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Cantidad del movimiento' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], InventoryMovementDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Precio unitario' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], InventoryMovementDto.prototype, "unitCost", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Razón del movimiento' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], InventoryMovementDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Referencia (orden, factura, etc.)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InventoryMovementDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID de la orden relacionada' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], InventoryMovementDto.prototype, "orderId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID del proveedor' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], InventoryMovementDto.prototype, "supplierId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Número de lote específico' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InventoryMovementDto.prototype, "lotNumber", void 0);
class ReserveInventoryDto {
    constructor() {
        this.expirationMinutes = 30;
    }
}
exports.ReserveInventoryDto = ReserveInventoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Items a reservar', type: 'array' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ReserveInventoryItemDto),
    __metadata("design:type", Array)
], ReserveInventoryDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID de la orden' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], ReserveInventoryDto.prototype, "orderId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Minutos hasta expiración de la reserva', default: 30 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(1440),
    __metadata("design:type", Number)
], ReserveInventoryDto.prototype, "expirationMinutes", void 0);
class ReserveInventoryItemDto {
    constructor() {
        this.useFefo = true;
    }
}
exports.ReserveInventoryItemDto = ReserveInventoryItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'SKU del producto' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ReserveInventoryItemDto.prototype, "productSku", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SKU de la variante' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReserveInventoryItemDto.prototype, "variantSku", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Cantidad a reservar' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], ReserveInventoryItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Usar FEFO (First Expired First Out)', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ReserveInventoryItemDto.prototype, "useFefo", void 0);
class ReleaseInventoryDto {
}
exports.ReleaseInventoryDto = ReleaseInventoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID de la orden' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], ReleaseInventoryDto.prototype, "orderId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SKUs específicos a liberar (si no se especifica, libera toda la orden)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ReleaseInventoryDto.prototype, "productSkus", void 0);
class AdjustInventoryDto {
}
exports.AdjustInventoryDto = AdjustInventoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID del inventario' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], AdjustInventoryDto.prototype, "inventoryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nueva cantidad total' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], AdjustInventoryDto.prototype, "newQuantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Razón del ajuste' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AdjustInventoryDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Número de lote específico' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdjustInventoryDto.prototype, "lotNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nuevo precio de costo (si aplica)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], AdjustInventoryDto.prototype, "newCostPrice", void 0);
class InventoryQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
        this.sortBy = 'lastUpdated';
        this.sortOrder = 'desc';
    }
}
exports.InventoryQueryDto = InventoryQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Página', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], InventoryQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Límite por página', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], InventoryQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Término de búsqueda (SKU o nombre)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InventoryQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Almacén' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InventoryQueryDto.prototype, "warehouse", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Solo productos con stock bajo' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], InventoryQueryDto.prototype, "lowStock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Solo productos próximos a vencer' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], InventoryQueryDto.prototype, "nearExpiration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Solo productos vencidos' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], InventoryQueryDto.prototype, "expired", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Cantidad disponible mínima' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseFloat(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], InventoryQueryDto.prototype, "minAvailable", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Ordenar por', enum: ['productName', 'availableQuantity', 'lastUpdated'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['productName', 'availableQuantity', 'lastUpdated']),
    __metadata("design:type", String)
], InventoryQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Orden', enum: ['asc', 'desc'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['asc', 'desc']),
    __metadata("design:type", String)
], InventoryQueryDto.prototype, "sortOrder", void 0);
class InventoryMovementQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
    }
}
exports.InventoryMovementQueryDto = InventoryMovementQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Página', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], InventoryMovementQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Límite por página', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], InventoryMovementQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID del inventario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], InventoryMovementQueryDto.prototype, "inventoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SKU del producto' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InventoryMovementQueryDto.prototype, "productSku", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tipo de movimiento' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['in', 'out', 'adjustment', 'transfer', 'reservation', 'release']),
    __metadata("design:type", String)
], InventoryMovementQueryDto.prototype, "movementType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Fecha desde (ISO string)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], InventoryMovementQueryDto.prototype, "dateFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Fecha hasta (ISO string)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], InventoryMovementQueryDto.prototype, "dateTo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID de la orden' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], InventoryMovementQueryDto.prototype, "orderId", void 0);


/***/ }),
/* 39 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OrdersModule = void 0;
const common_1 = __webpack_require__(3);
const mongoose_1 = __webpack_require__(5);
const orders_controller_1 = __webpack_require__(40);
const orders_service_1 = __webpack_require__(41);
const auth_module_1 = __webpack_require__(10);
const inventory_module_1 = __webpack_require__(34);
const order_schema_1 = __webpack_require__(42);
let OrdersModule = class OrdersModule {
};
exports.OrdersModule = OrdersModule;
exports.OrdersModule = OrdersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            inventory_module_1.InventoryModule,
            mongoose_1.MongooseModule.forFeature([
                { name: order_schema_1.Order.name, schema: order_schema_1.OrderSchema },
            ]),
        ],
        controllers: [orders_controller_1.OrdersController],
        providers: [orders_service_1.OrdersService],
        exports: [orders_service_1.OrdersService],
    })
], OrdersModule);


/***/ }),
/* 40 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OrdersController = void 0;
const common_1 = __webpack_require__(3);
const swagger_1 = __webpack_require__(7);
const orders_service_1 = __webpack_require__(41);
const order_dto_1 = __webpack_require__(43);
const jwt_auth_guard_1 = __webpack_require__(23);
const tenant_guard_1 = __webpack_require__(24);
const permissions_guard_1 = __webpack_require__(25);
const permissions_decorator_1 = __webpack_require__(26);
let OrdersController = class OrdersController {
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async create(createOrderDto, req) {
        try {
            const order = await this.ordersService.create(createOrderDto, req.user);
            return {
                success: true,
                message: 'Orden creada exitosamente',
                data: order,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al crear la orden', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async findAll(query, req) {
        try {
            const result = await this.ordersService.findAll(query, req.user.tenantId);
            return {
                success: true,
                message: 'Órdenes obtenidas exitosamente',
                data: result.orders,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al obtener las órdenes', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findOne(id, req) {
        try {
            const order = await this.ordersService.findOne(id, req.user.tenantId);
            if (!order) {
                throw new common_1.HttpException('Orden no encontrada', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                message: 'Orden obtenida exitosamente',
                data: order,
            };
        }
        catch (error) {
            if (error.status === common_1.HttpStatus.NOT_FOUND) {
                throw error;
            }
            throw new common_1.HttpException(error.message || 'Error al obtener la orden', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async update(id, updateOrderDto, req) {
        try {
            const order = await this.ordersService.update(id, updateOrderDto, req.user);
            return {
                success: true,
                message: 'Orden actualizada exitosamente',
                data: order,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al actualizar la orden', common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('orders', ['create']),
    (0, swagger_1.ApiOperation)({ summary: 'Crear nueva orden' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Orden creada exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof order_dto_1.CreateOrderDto !== "undefined" && order_dto_1.CreateOrderDto) === "function" ? _b : Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('orders', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener lista de órdenes' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Órdenes obtenidas exitosamente' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof order_dto_1.OrderQueryDto !== "undefined" && order_dto_1.OrderQueryDto) === "function" ? _c : Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('orders', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener orden por ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Orden obtenida exitosamente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('orders', ['update']),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar una orden' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Orden actualizada exitosamente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_d = typeof order_dto_1.UpdateOrderDto !== "undefined" && order_dto_1.UpdateOrderDto) === "function" ? _d : Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "update", null);
exports.OrdersController = OrdersController = __decorate([
    (0, swagger_1.ApiTags)('orders'),
    (0, common_1.Controller)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [typeof (_a = typeof orders_service_1.OrdersService !== "undefined" && orders_service_1.OrdersService) === "function" ? _a : Object])
], OrdersController);


/***/ }),
/* 41 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrdersService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OrdersService = void 0;
const common_1 = __webpack_require__(3);
const mongoose_1 = __webpack_require__(5);
const mongoose_2 = __webpack_require__(15);
const order_schema_1 = __webpack_require__(42);
const inventory_service_1 = __webpack_require__(36);
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(orderModel, inventoryService) {
        this.orderModel = orderModel;
        this.inventoryService = inventoryService;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async create(createOrderDto, user) {
        this.logger.log(`Creating order for customer: ${createOrderDto.customerId}`);
        const orderNumber = await this.generateOrderNumber(user.tenantId);
        const subtotal = createOrderDto.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const ivaTotal = subtotal * 0.16;
        const igtfTotal = 0;
        const totalAmount = subtotal + ivaTotal + igtfTotal - (createOrderDto.discountAmount || 0);
        const orderData = {
            ...createOrderDto,
            orderNumber,
            subtotal,
            ivaTotal,
            igtfTotal,
            shippingCost: 0,
            totalAmount,
            status: 'pending',
            paymentStatus: 'pending',
            inventoryReservation: {
                isReserved: false,
            },
            metrics: {
                totalMargin: 0,
                marginPercentage: 0,
            },
            createdBy: user.id,
            tenantId: user.tenantId,
        };
        const order = new this.orderModel(orderData);
        const savedOrder = await order.save();
        this.logger.log(`Order created successfully with number: ${orderNumber}`);
        return savedOrder;
    }
    async findAll(query, tenantId) {
        const { page = 1, limit = 20, search, status, paymentStatus, customerId, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const filter = { tenantId: new mongoose_2.Types.ObjectId(tenantId) };
        if (status)
            filter.status = status;
        if (paymentStatus)
            filter.paymentStatus = paymentStatus;
        if (customerId)
            filter.customerId = new mongoose_2.Types.ObjectId(customerId);
        if (search) {
            filter.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
            ];
        }
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            this.orderModel
                .find(filter)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .populate('customerId', 'name customerNumber')
                .exec(),
            this.orderModel.countDocuments(filter),
        ]);
        return {
            orders,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(id, tenantId) {
        return this.orderModel
            .findOne({ _id: id, tenantId })
            .populate('customerId', 'name customerNumber email phone')
            .populate('createdBy', 'firstName lastName')
            .exec();
    }
    async update(id, updateOrderDto, user) {
        this.logger.log(`Updating order ${id} with status ${updateOrderDto.status}`);
        const order = await this.findOne(id, user.tenantId);
        if (!order) {
            throw new common_1.BadRequestException('Orden no encontrada');
        }
        if ((updateOrderDto.status === 'cancelled' || updateOrderDto.status === 'refunded') &&
            order.status !== 'cancelled' &&
            order.status !== 'refunded') {
            this.logger.log(`Releasing inventory for cancelled order ${id}`);
            await this.inventoryService.releaseInventory({ orderId: id }, user);
        }
        const updateData = {
            ...updateOrderDto,
            updatedBy: user.id,
        };
        return this.orderModel.findByIdAndUpdate(id, updateData, { new: true });
    }
    async generateOrderNumber(tenantId) {
        const count = await this.orderModel.countDocuments({ tenantId });
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        return `ORD-${year}${month}-${(count + 1).toString().padStart(6, '0')}`;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(order_schema_1.Order.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, typeof (_b = typeof inventory_service_1.InventoryService !== "undefined" && inventory_service_1.InventoryService) === "function" ? _b : Object])
], OrdersService);


/***/ }),
/* 42 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OrderSchema = exports.Order = exports.OrderShipping = exports.OrderPayment = exports.OrderItem = exports.OrderItemLot = void 0;
const mongoose_1 = __webpack_require__(5);
const mongoose_2 = __webpack_require__(15);
let OrderItemLot = class OrderItemLot {
};
exports.OrderItemLot = OrderItemLot;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OrderItemLot.prototype, "lotNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], OrderItemLot.prototype, "quantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], OrderItemLot.prototype, "unitPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], OrderItemLot.prototype, "expirationDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], OrderItemLot.prototype, "reservedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], OrderItemLot.prototype, "releasedAt", void 0);
exports.OrderItemLot = OrderItemLot = __decorate([
    (0, mongoose_1.Schema)()
], OrderItemLot);
let OrderItem = class OrderItem {
};
exports.OrderItem = OrderItem;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Product', required: true }),
    __metadata("design:type", typeof (_d = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _d : Object)
], OrderItem.prototype, "productId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OrderItem.prototype, "productSku", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OrderItem.prototype, "productName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'ProductVariant' }),
    __metadata("design:type", typeof (_e = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _e : Object)
], OrderItem.prototype, "variantId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderItem.prototype, "variantSku", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "quantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "unitPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "totalPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "costPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)([OrderItemLot]),
    __metadata("design:type", Array)
], OrderItem.prototype, "lots", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "ivaAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "igtfAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "finalPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'pending' }),
    __metadata("design:type", String)
], OrderItem.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderItem.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", typeof (_f = typeof Date !== "undefined" && Date) === "function" ? _f : Object)
], OrderItem.prototype, "addedAt", void 0);
exports.OrderItem = OrderItem = __decorate([
    (0, mongoose_1.Schema)()
], OrderItem);
let OrderPayment = class OrderPayment {
};
exports.OrderPayment = OrderPayment;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OrderPayment.prototype, "method", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OrderPayment.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], OrderPayment.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], OrderPayment.prototype, "exchangeRate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderPayment.prototype, "reference", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderPayment.prototype, "bank", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'pending' }),
    __metadata("design:type", String)
], OrderPayment.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_g = typeof Date !== "undefined" && Date) === "function" ? _g : Object)
], OrderPayment.prototype, "confirmedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", typeof (_h = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _h : Object)
], OrderPayment.prototype, "confirmedBy", void 0);
exports.OrderPayment = OrderPayment = __decorate([
    (0, mongoose_1.Schema)()
], OrderPayment);
let OrderShipping = class OrderShipping {
};
exports.OrderShipping = OrderShipping;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OrderShipping.prototype, "method", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], OrderShipping.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_j = typeof Date !== "undefined" && Date) === "function" ? _j : Object)
], OrderShipping.prototype, "scheduledDate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_k = typeof Date !== "undefined" && Date) === "function" ? _k : Object)
], OrderShipping.prototype, "deliveredDate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderShipping.prototype, "trackingNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderShipping.prototype, "courierCompany", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], OrderShipping.prototype, "cost", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderShipping.prototype, "notes", void 0);
exports.OrderShipping = OrderShipping = __decorate([
    (0, mongoose_1.Schema)()
], OrderShipping);
let Order = class Order {
};
exports.Order = Order;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], Order.prototype, "orderNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Customer', required: true }),
    __metadata("design:type", typeof (_l = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _l : Object)
], Order.prototype, "customerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Order.prototype, "customerName", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "customerEmail", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "customerPhone", void 0);
__decorate([
    (0, mongoose_1.Prop)([OrderItem]),
    __metadata("design:type", Array)
], Order.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Order.prototype, "subtotal", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Order.prototype, "ivaTotal", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Order.prototype, "igtfTotal", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Order.prototype, "shippingCost", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Order.prototype, "discountAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Order.prototype, "totalAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)([OrderPayment]),
    __metadata("design:type", Array)
], Order.prototype, "payments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'pending' }),
    __metadata("design:type", String)
], Order.prototype, "paymentStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: OrderShipping }),
    __metadata("design:type", OrderShipping)
], Order.prototype, "shipping", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'draft' }),
    __metadata("design:type", String)
], Order.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'online' }),
    __metadata("design:type", String)
], Order.prototype, "channel", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'retail' }),
    __metadata("design:type", String)
], Order.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_m = typeof Date !== "undefined" && Date) === "function" ? _m : Object)
], Order.prototype, "confirmedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_o = typeof Date !== "undefined" && Date) === "function" ? _o : Object)
], Order.prototype, "shippedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_p = typeof Date !== "undefined" && Date) === "function" ? _p : Object)
], Order.prototype, "deliveredAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_q = typeof Date !== "undefined" && Date) === "function" ? _q : Object)
], Order.prototype, "cancelledAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Order.prototype, "inventoryReservation", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Order.prototype, "taxInfo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Order.prototype, "metrics", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "internalNotes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", typeof (_r = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _r : Object)
], Order.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", typeof (_s = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _s : Object)
], Order.prototype, "assignedTo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Tenant', required: true }),
    __metadata("design:type", typeof (_t = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _t : Object)
], Order.prototype, "tenantId", void 0);
exports.Order = Order = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Order);
exports.OrderSchema = mongoose_1.SchemaFactory.createForClass(Order);
exports.OrderSchema.index({ orderNumber: 1, tenantId: 1 }, { unique: true });
exports.OrderSchema.index({ customerId: 1, createdAt: -1, tenantId: 1 });
exports.OrderSchema.index({ status: 1, createdAt: -1, tenantId: 1 });
exports.OrderSchema.index({ paymentStatus: 1, tenantId: 1 });
exports.OrderSchema.index({ channel: 1, createdAt: -1, tenantId: 1 });
exports.OrderSchema.index({ type: 1, createdAt: -1, tenantId: 1 });
exports.OrderSchema.index({ createdAt: -1, tenantId: 1 });
exports.OrderSchema.index({ confirmedAt: -1, tenantId: 1 });
exports.OrderSchema.index({ 'inventoryReservation.isReserved': 1, tenantId: 1 });
exports.OrderSchema.index({ 'inventoryReservation.expiresAt': 1, tenantId: 1 });
exports.OrderSchema.index({ assignedTo: 1, status: 1, tenantId: 1 });
exports.OrderSchema.index({ totalAmount: -1, createdAt: -1, tenantId: 1 });
exports.OrderSchema.index({
    orderNumber: 'text',
    customerName: 'text',
    customerEmail: 'text',
    customerPhone: 'text'
});


/***/ }),
/* 43 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OrderCalculationDto = exports.OrderQueryDto = exports.ConfirmOrderPaymentDto = exports.AddOrderPaymentDto = exports.UpdateOrderDto = exports.CreateOrderDto = exports.OrderShippingDto = exports.OrderPaymentDto = exports.CreateOrderItemDto = void 0;
const class_validator_1 = __webpack_require__(21);
const class_transformer_1 = __webpack_require__(22);
const swagger_1 = __webpack_require__(7);
class CreateOrderItemDto {
}
exports.CreateOrderItemDto = CreateOrderItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'SKU del producto' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateOrderItemDto.prototype, "productSku", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SKU de la variante' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderItemDto.prototype, "variantSku", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Cantidad solicitada' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreateOrderItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Precio unitario sin impuestos' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateOrderItemDto.prototype, "unitPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notas del item' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderItemDto.prototype, "notes", void 0);
class OrderPaymentDto {
}
exports.OrderPaymentDto = OrderPaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Método de pago', enum: ['cash', 'card', 'transfer', 'usd_cash', 'usd_transfer', 'mixed'] }),
    (0, class_validator_1.IsEnum)(['cash', 'card', 'transfer', 'usd_cash', 'usd_transfer', 'mixed']),
    __metadata("design:type", String)
], OrderPaymentDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Moneda', enum: ['VES', 'USD'] }),
    (0, class_validator_1.IsEnum)(['VES', 'USD']),
    __metadata("design:type", String)
], OrderPaymentDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Monto del pago' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], OrderPaymentDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tasa de cambio (si es USD)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], OrderPaymentDto.prototype, "exchangeRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Referencia de transferencia o tarjeta' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OrderPaymentDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Banco' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OrderPaymentDto.prototype, "bank", void 0);
class OrderShippingDto {
}
exports.OrderShippingDto = OrderShippingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Método de envío', enum: ['pickup', 'delivery', 'courier'] }),
    (0, class_validator_1.IsEnum)(['pickup', 'delivery', 'courier']),
    __metadata("design:type", String)
], OrderShippingDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Dirección de envío' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], OrderShippingDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Fecha programada de entrega' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], OrderShippingDto.prototype, "scheduledDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Costo de envío' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OrderShippingDto.prototype, "cost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Compañía de courier' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OrderShippingDto.prototype, "courierCompany", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notas de envío' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OrderShippingDto.prototype, "notes", void 0);
class CreateOrderDto {
    constructor() {
        this.discountAmount = 0;
        this.channel = 'online';
        this.type = 'retail';
        this.autoReserve = true;
    }
}
exports.CreateOrderDto = CreateOrderDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID del cliente' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Items de la orden', type: [CreateOrderItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateOrderItemDto),
    __metadata("design:type", Array)
], CreateOrderDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Información de pago', type: [OrderPaymentDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => OrderPaymentDto),
    __metadata("design:type", Array)
], CreateOrderDto.prototype, "payments", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Información de envío', type: OrderShippingDto }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => OrderShippingDto),
    __metadata("design:type", OrderShippingDto)
], CreateOrderDto.prototype, "shipping", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Monto de descuento', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "discountAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Canal de la orden', enum: ['online', 'phone', 'whatsapp', 'in_store'], default: 'online' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['online', 'phone', 'whatsapp', 'in_store']),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tipo de orden', enum: ['retail', 'wholesale', 'b2b'], default: 'retail' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['retail', 'wholesale', 'b2b']),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Información fiscal' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateOrderDto.prototype, "taxInfo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notas de la orden' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notas internas' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "internalNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Reservar inventario automáticamente', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateOrderDto.prototype, "autoReserve", void 0);
class UpdateOrderDto {
}
exports.UpdateOrderDto = UpdateOrderDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Estado de la orden', enum: ['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
    __metadata("design:type", String)
], UpdateOrderDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Estado de pago', enum: ['pending', 'partial', 'paid', 'overpaid', 'refunded'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['pending', 'partial', 'paid', 'overpaid', 'refunded']),
    __metadata("design:type", String)
], UpdateOrderDto.prototype, "paymentStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Información de envío actualizada', type: OrderShippingDto }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => OrderShippingDto),
    __metadata("design:type", OrderShippingDto)
], UpdateOrderDto.prototype, "shipping", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Usuario asignado' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], UpdateOrderDto.prototype, "assignedTo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notas de la orden' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateOrderDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notas internas' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateOrderDto.prototype, "internalNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Número de tracking' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateOrderDto.prototype, "trackingNumber", void 0);
class AddOrderPaymentDto {
}
exports.AddOrderPaymentDto = AddOrderPaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID de la orden' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], AddOrderPaymentDto.prototype, "orderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Información del pago', type: OrderPaymentDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => OrderPaymentDto),
    __metadata("design:type", OrderPaymentDto)
], AddOrderPaymentDto.prototype, "payment", void 0);
class ConfirmOrderPaymentDto {
}
exports.ConfirmOrderPaymentDto = ConfirmOrderPaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID de la orden' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], ConfirmOrderPaymentDto.prototype, "orderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Índice del pago en el array' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ConfirmOrderPaymentDto.prototype, "paymentIndex", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Fecha de confirmación' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], ConfirmOrderPaymentDto.prototype, "confirmedAt", void 0);
class OrderQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
        this.sortBy = 'createdAt';
        this.sortOrder = 'desc';
    }
}
exports.OrderQueryDto = OrderQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Página', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], OrderQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Límite por página', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], OrderQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Término de búsqueda (número de orden, cliente)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OrderQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Estado de la orden' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
    __metadata("design:type", String)
], OrderQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Estado de pago' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['pending', 'partial', 'paid', 'overpaid', 'refunded']),
    __metadata("design:type", String)
], OrderQueryDto.prototype, "paymentStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Canal de la orden' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['online', 'phone', 'whatsapp', 'in_store']),
    __metadata("design:type", String)
], OrderQueryDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tipo de orden' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['retail', 'wholesale', 'b2b']),
    __metadata("design:type", String)
], OrderQueryDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID del cliente' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], OrderQueryDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Usuario asignado' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], OrderQueryDto.prototype, "assignedTo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Fecha desde (ISO string)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], OrderQueryDto.prototype, "dateFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Fecha hasta (ISO string)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], OrderQueryDto.prototype, "dateTo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Monto mínimo' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseFloat(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OrderQueryDto.prototype, "minAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Monto máximo' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseFloat(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OrderQueryDto.prototype, "maxAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Ordenar por', enum: ['orderNumber', 'createdAt', 'totalAmount', 'customerName'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['orderNumber', 'createdAt', 'totalAmount', 'customerName']),
    __metadata("design:type", String)
], OrderQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Orden', enum: ['asc', 'desc'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['asc', 'desc']),
    __metadata("design:type", String)
], OrderQueryDto.prototype, "sortOrder", void 0);
class OrderCalculationDto {
}
exports.OrderCalculationDto = OrderCalculationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Items para calcular', type: [CreateOrderItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateOrderItemDto),
    __metadata("design:type", Array)
], OrderCalculationDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID del cliente (para precios especiales)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], OrderCalculationDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Método de pago principal' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['cash', 'card', 'transfer', 'usd_cash', 'usd_transfer']),
    __metadata("design:type", String)
], OrderCalculationDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Monto de descuento' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OrderCalculationDto.prototype, "discountAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Costo de envío' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OrderCalculationDto.prototype, "shippingCost", void 0);


/***/ }),
/* 44 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CustomersModule = void 0;
const common_1 = __webpack_require__(3);
const mongoose_1 = __webpack_require__(5);
const customers_controller_1 = __webpack_require__(45);
const customers_service_1 = __webpack_require__(46);
const auth_module_1 = __webpack_require__(10);
const customer_schema_1 = __webpack_require__(47);
let CustomersModule = class CustomersModule {
};
exports.CustomersModule = CustomersModule;
exports.CustomersModule = CustomersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            mongoose_1.MongooseModule.forFeature([
                { name: customer_schema_1.Customer.name, schema: customer_schema_1.CustomerSchema },
            ]),
        ],
        controllers: [customers_controller_1.CustomersController],
        providers: [customers_service_1.CustomersService],
        exports: [customers_service_1.CustomersService],
    })
], CustomersModule);


/***/ }),
/* 45 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CustomersController = void 0;
const common_1 = __webpack_require__(3);
const swagger_1 = __webpack_require__(7);
const customers_service_1 = __webpack_require__(46);
const customer_dto_1 = __webpack_require__(48);
const jwt_auth_guard_1 = __webpack_require__(23);
const tenant_guard_1 = __webpack_require__(24);
const permissions_guard_1 = __webpack_require__(25);
const permissions_decorator_1 = __webpack_require__(26);
let CustomersController = class CustomersController {
    constructor(customersService) {
        this.customersService = customersService;
    }
    async create(createCustomerDto, req) {
        try {
            const customer = await this.customersService.create(createCustomerDto, req.user);
            return {
                success: true,
                message: 'Cliente creado exitosamente',
                data: customer,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al crear el cliente', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async findAll(query, req) {
        try {
            const result = await this.customersService.findAll(query, req.user.tenantId);
            return {
                success: true,
                message: 'Clientes obtenidos exitosamente',
                data: result.customers,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al obtener los clientes', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findOne(id, req) {
        try {
            const customer = await this.customersService.findOne(id, req.user.tenantId);
            if (!customer) {
                throw new common_1.HttpException('Cliente no encontrado', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                message: 'Cliente obtenido exitosamente',
                data: customer,
            };
        }
        catch (error) {
            if (error.status === common_1.HttpStatus.NOT_FOUND) {
                throw error;
            }
            throw new common_1.HttpException(error.message || 'Error al obtener el cliente', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async update(id, updateCustomerDto, req) {
        try {
            const customer = await this.customersService.update(id, updateCustomerDto, req.user);
            if (!customer) {
                throw new common_1.HttpException('Cliente no encontrado', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                message: 'Cliente actualizado exitosamente',
                data: customer,
            };
        }
        catch (error) {
            if (error.status === common_1.HttpStatus.NOT_FOUND) {
                throw error;
            }
            throw new common_1.HttpException(error.message || 'Error al actualizar el cliente', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async remove(id, req) {
        try {
            const result = await this.customersService.remove(id, req.user.tenantId);
            if (!result) {
                throw new common_1.HttpException('Cliente no encontrado', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                message: 'Cliente eliminado exitosamente',
            };
        }
        catch (error) {
            if (error.status === common_1.HttpStatus.NOT_FOUND) {
                throw error;
            }
            throw new common_1.HttpException(error.message || 'Error al eliminar el cliente', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.CustomersController = CustomersController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('customers', ['create']),
    (0, swagger_1.ApiOperation)({ summary: 'Crear nuevo cliente' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Cliente creado exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof customer_dto_1.CreateCustomerDto !== "undefined" && customer_dto_1.CreateCustomerDto) === "function" ? _b : Object, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('customers', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener lista de clientes' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Clientes obtenidos exitosamente' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof customer_dto_1.CustomerQueryDto !== "undefined" && customer_dto_1.CustomerQueryDto) === "function" ? _c : Object, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('customers', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener cliente por ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cliente obtenido exitosamente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('customers', ['update']),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar un cliente' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cliente actualizado exitosamente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_d = typeof customer_dto_1.UpdateCustomerDto !== "undefined" && customer_dto_1.UpdateCustomerDto) === "function" ? _d : Object, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('customers', ['delete']),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar un cliente (borrado lógico)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cliente eliminado exitosamente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "remove", null);
exports.CustomersController = CustomersController = __decorate([
    (0, swagger_1.ApiTags)('customers'),
    (0, common_1.Controller)('customers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [typeof (_a = typeof customers_service_1.CustomersService !== "undefined" && customers_service_1.CustomersService) === "function" ? _a : Object])
], CustomersController);


/***/ }),
/* 46 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CustomersService_1;
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CustomersService = void 0;
const common_1 = __webpack_require__(3);
const mongoose_1 = __webpack_require__(5);
const mongoose_2 = __webpack_require__(15);
const customer_schema_1 = __webpack_require__(47);
let CustomersService = CustomersService_1 = class CustomersService {
    constructor(customerModel) {
        this.customerModel = customerModel;
        this.logger = new common_1.Logger(CustomersService_1.name);
    }
    async create(createCustomerDto, user) {
        this.logger.log(`Creating customer: ${createCustomerDto.name}`);
        const customerNumber = await this.generateCustomerNumber(user.tenantId);
        const customerData = {
            ...createCustomerDto,
            customerNumber,
            segments: [],
            interactions: [],
            metrics: {
                totalOrders: 0,
                totalSpent: 0,
                totalSpentUSD: 0,
                averageOrderValue: 0,
                orderFrequency: 0,
                lifetimeValue: 0,
                returnRate: 0,
                cancellationRate: 0,
                paymentDelayDays: 0,
            },
            creditInfo: createCustomerDto.creditInfo || {
                creditLimit: 0,
                availableCredit: 0,
                paymentTerms: 0,
                creditRating: 'C',
                isBlocked: false,
            },
            status: 'active',
            createdBy: user.id,
            tenantId: user.tenantId,
        };
        const customer = new this.customerModel(customerData);
        const savedCustomer = await customer.save();
        this.logger.log(`Customer created successfully with number: ${customerNumber}`);
        return savedCustomer;
    }
    async findAll(query, tenantId) {
        const { page = 1, limit = 20, search, customerType, status, assignedTo, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const filter = { tenantId: new mongoose_2.Types.ObjectId(tenantId) };
        if (customerType)
            filter.customerType = customerType;
        if (status)
            filter.status = status;
        if (assignedTo)
            filter.assignedTo = new mongoose_2.Types.ObjectId(assignedTo);
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { companyName: { $regex: search, $options: 'i' } },
                { customerNumber: { $regex: search, $options: 'i' } },
            ];
        }
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * limit;
        const [customers, total] = await Promise.all([
            this.customerModel
                .find(filter)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .populate('assignedTo', 'firstName lastName')
                .exec(),
            this.customerModel.countDocuments(filter),
        ]);
        return {
            customers,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(id, tenantId) {
        return this.customerModel
            .findOne({ _id: id, tenantId })
            .populate('assignedTo', 'firstName lastName')
            .populate('createdBy', 'firstName lastName')
            .exec();
    }
    async update(id, updateCustomerDto, user) {
        this.logger.log(`Updating customer with ID: ${id}`);
        const updateData = {
            ...updateCustomerDto,
            updatedBy: user.id,
        };
        return this.customerModel
            .findOneAndUpdate({ _id: id, tenantId: user.tenantId }, updateData, {
            new: true,
            runValidators: true,
        })
            .exec();
    }
    async remove(id, tenantId) {
        this.logger.log(`Soft deleting customer with ID: ${id}`);
        const result = await this.customerModel.updateOne({ _id: id, tenantId }, { status: 'inactive', inactiveReason: 'Eliminado por usuario' });
        return result.modifiedCount > 0;
    }
    async generateCustomerNumber(tenantId) {
        const count = await this.customerModel.countDocuments({ tenantId });
        return `CLI-${(count + 1).toString().padStart(6, '0')}`;
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = CustomersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(customer_schema_1.Customer.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object])
], CustomersService);


/***/ }),
/* 47 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CustomerSchema = exports.Customer = exports.CustomerInteraction = exports.CustomerSegment = exports.CustomerPaymentMethod = exports.CustomerContact = exports.CustomerAddress = void 0;
const mongoose_1 = __webpack_require__(5);
const mongoose_2 = __webpack_require__(15);
let CustomerAddress = class CustomerAddress {
};
exports.CustomerAddress = CustomerAddress;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomerAddress.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomerAddress.prototype, "street", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomerAddress.prototype, "city", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomerAddress.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomerAddress.prototype, "zipCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'Venezuela' }),
    __metadata("design:type", String)
], CustomerAddress.prototype, "country", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], CustomerAddress.prototype, "coordinates", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], CustomerAddress.prototype, "isDefault", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomerAddress.prototype, "notes", void 0);
exports.CustomerAddress = CustomerAddress = __decorate([
    (0, mongoose_1.Schema)()
], CustomerAddress);
let CustomerContact = class CustomerContact {
};
exports.CustomerContact = CustomerContact;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomerContact.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomerContact.prototype, "value", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], CustomerContact.prototype, "isPrimary", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], CustomerContact.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomerContact.prototype, "notes", void 0);
exports.CustomerContact = CustomerContact = __decorate([
    (0, mongoose_1.Schema)()
], CustomerContact);
let CustomerPaymentMethod = class CustomerPaymentMethod {
};
exports.CustomerPaymentMethod = CustomerPaymentMethod;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomerPaymentMethod.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomerPaymentMethod.prototype, "bank", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomerPaymentMethod.prototype, "accountNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomerPaymentMethod.prototype, "cardType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], CustomerPaymentMethod.prototype, "isPreferred", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], CustomerPaymentMethod.prototype, "isActive", void 0);
exports.CustomerPaymentMethod = CustomerPaymentMethod = __decorate([
    (0, mongoose_1.Schema)()
], CustomerPaymentMethod);
let CustomerSegment = class CustomerSegment {
};
exports.CustomerSegment = CustomerSegment;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomerSegment.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomerSegment.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], CustomerSegment.prototype, "assignedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", typeof (_b = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _b : Object)
], CustomerSegment.prototype, "assignedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomerSegment.prototype, "criteria", void 0);
exports.CustomerSegment = CustomerSegment = __decorate([
    (0, mongoose_1.Schema)()
], CustomerSegment);
let CustomerInteraction = class CustomerInteraction {
};
exports.CustomerInteraction = CustomerInteraction;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomerInteraction.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomerInteraction.prototype, "channel", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomerInteraction.prototype, "subject", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomerInteraction.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'completed' }),
    __metadata("design:type", String)
], CustomerInteraction.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", typeof (_c = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _c : Object)
], CustomerInteraction.prototype, "handledBy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], CustomerInteraction.prototype, "followUpDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: Date.now }),
    __metadata("design:type", typeof (_e = typeof Date !== "undefined" && Date) === "function" ? _e : Object)
], CustomerInteraction.prototype, "createdAt", void 0);
exports.CustomerInteraction = CustomerInteraction = __decorate([
    (0, mongoose_1.Schema)()
], CustomerInteraction);
let Customer = class Customer {
};
exports.Customer = Customer;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Customer.prototype, "customerNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Customer.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Customer.prototype, "lastName", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Customer.prototype, "companyName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Customer.prototype, "customerType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Customer.prototype, "taxInfo", void 0);
__decorate([
    (0, mongoose_1.Prop)([CustomerAddress]),
    __metadata("design:type", Array)
], Customer.prototype, "addresses", void 0);
__decorate([
    (0, mongoose_1.Prop)([CustomerContact]),
    __metadata("design:type", Array)
], Customer.prototype, "contacts", void 0);
__decorate([
    (0, mongoose_1.Prop)([CustomerPaymentMethod]),
    __metadata("design:type", Array)
], Customer.prototype, "paymentMethods", void 0);
__decorate([
    (0, mongoose_1.Prop)([CustomerSegment]),
    __metadata("design:type", Array)
], Customer.prototype, "segments", void 0);
__decorate([
    (0, mongoose_1.Prop)([CustomerInteraction]),
    __metadata("design:type", Array)
], Customer.prototype, "interactions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Customer.prototype, "preferences", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Customer.prototype, "metrics", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Customer.prototype, "creditInfo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'active' }),
    __metadata("design:type", String)
], Customer.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Customer.prototype, "inactiveReason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_f = typeof Date !== "undefined" && Date) === "function" ? _f : Object)
], Customer.prototype, "suspendedUntil", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Customer.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Customer.prototype, "internalNotes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'manual' }),
    __metadata("design:type", String)
], Customer.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Customer' }),
    __metadata("design:type", typeof (_g = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _g : Object)
], Customer.prototype, "referredBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", typeof (_h = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _h : Object)
], Customer.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", typeof (_j = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _j : Object)
], Customer.prototype, "assignedTo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Tenant', required: true }),
    __metadata("design:type", typeof (_k = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _k : Object)
], Customer.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_l = typeof Date !== "undefined" && Date) === "function" ? _l : Object)
], Customer.prototype, "lastContactDate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_m = typeof Date !== "undefined" && Date) === "function" ? _m : Object)
], Customer.prototype, "nextFollowUpDate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_o = typeof Date !== "undefined" && Date) === "function" ? _o : Object)
], Customer.prototype, "birthdayDate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", typeof (_p = typeof Date !== "undefined" && Date) === "function" ? _p : Object)
], Customer.prototype, "anniversaryDate", void 0);
exports.Customer = Customer = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Customer);
exports.CustomerSchema = mongoose_1.SchemaFactory.createForClass(Customer);
exports.CustomerSchema.index({ customerNumber: 1, tenantId: 1 }, { unique: true });
exports.CustomerSchema.index({ name: 1, tenantId: 1 });
exports.CustomerSchema.index({ lastName: 1, tenantId: 1 });
exports.CustomerSchema.index({ companyName: 1, tenantId: 1 });
exports.CustomerSchema.index({ customerType: 1, tenantId: 1 });
exports.CustomerSchema.index({ 'taxInfo.taxId': 1, tenantId: 1 });
exports.CustomerSchema.index({ status: 1, tenantId: 1 });
exports.CustomerSchema.index({ assignedTo: 1, tenantId: 1 });
exports.CustomerSchema.index({ createdAt: -1, tenantId: 1 });
exports.CustomerSchema.index({ 'metrics.lastOrderDate': -1, tenantId: 1 });
exports.CustomerSchema.index({ 'metrics.totalSpent': -1, tenantId: 1 });
exports.CustomerSchema.index({ 'segments.name': 1, tenantId: 1 });
exports.CustomerSchema.index({ source: 1, tenantId: 1 });
exports.CustomerSchema.index({ nextFollowUpDate: 1, tenantId: 1 });
exports.CustomerSchema.index({
    name: 'text',
    lastName: 'text',
    companyName: 'text',
    customerNumber: 'text',
    'taxInfo.taxId': 'text',
    'contacts.value': 'text'
});
exports.CustomerSchema.index({ 'contacts.type': 1, 'contacts.value': 1, tenantId: 1 });
exports.CustomerSchema.index({ 'contacts.isPrimary': 1, tenantId: 1 });


/***/ }),
/* 48 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CustomerQueryDto = exports.CustomerInteractionDto = exports.UpdateCustomerDto = exports.CreateCustomerDto = exports.CustomerPaymentMethodDto = exports.CustomerContactDto = exports.CustomerAddressDto = void 0;
const class_validator_1 = __webpack_require__(21);
const class_transformer_1 = __webpack_require__(22);
const swagger_1 = __webpack_require__(7);
class CustomerAddressDto {
    constructor() {
        this.country = 'Venezuela';
    }
}
exports.CustomerAddressDto = CustomerAddressDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tipo de dirección', enum: ['billing', 'shipping', 'both'] }),
    (0, class_validator_1.IsEnum)(['billing', 'shipping', 'both']),
    __metadata("design:type", String)
], CustomerAddressDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Calle' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CustomerAddressDto.prototype, "street", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ciudad' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CustomerAddressDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Estado' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CustomerAddressDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Código postal' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerAddressDto.prototype, "zipCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'País', default: 'Venezuela' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerAddressDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Coordenadas GPS' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CustomerAddressDto.prototype, "coordinates", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Es dirección por defecto', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CustomerAddressDto.prototype, "isDefault", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notas adicionales' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerAddressDto.prototype, "notes", void 0);
class CustomerContactDto {
}
exports.CustomerContactDto = CustomerContactDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tipo de contacto', enum: ['phone', 'email', 'whatsapp'] }),
    (0, class_validator_1.IsEnum)(['phone', 'email', 'whatsapp']),
    __metadata("design:type", String)
], CustomerContactDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Valor del contacto' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CustomerContactDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Es contacto principal', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CustomerContactDto.prototype, "isPrimary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notas del contacto' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerContactDto.prototype, "notes", void 0);
class CustomerPaymentMethodDto {
}
exports.CustomerPaymentMethodDto = CustomerPaymentMethodDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tipo de método de pago', enum: ['cash', 'card', 'transfer', 'usd_cash', 'usd_transfer'] }),
    (0, class_validator_1.IsEnum)(['cash', 'card', 'transfer', 'usd_cash', 'usd_transfer']),
    __metadata("design:type", String)
], CustomerPaymentMethodDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Banco' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerPaymentMethodDto.prototype, "bank", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Últimos 4 dígitos de cuenta/tarjeta' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerPaymentMethodDto.prototype, "accountNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tipo de tarjeta' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerPaymentMethodDto.prototype, "cardType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Es método preferido', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CustomerPaymentMethodDto.prototype, "isPreferred", void 0);
class CreateCustomerDto {
    constructor() {
        this.source = 'manual';
    }
}
exports.CreateCustomerDto = CreateCustomerDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre del cliente' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Apellido del cliente' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre de la empresa' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tipo de cliente', enum: ['individual', 'business'] }),
    (0, class_validator_1.IsEnum)(['individual', 'business']),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "customerType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Información fiscal' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateCustomerDto.prototype, "taxInfo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Direcciones del cliente', type: [CustomerAddressDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CustomerAddressDto),
    __metadata("design:type", Array)
], CreateCustomerDto.prototype, "addresses", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Contactos del cliente', type: [CustomerContactDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CustomerContactDto),
    __metadata("design:type", Array)
], CreateCustomerDto.prototype, "contacts", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Métodos de pago del cliente', type: [CustomerPaymentMethodDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CustomerPaymentMethodDto),
    __metadata("design:type", Array)
], CreateCustomerDto.prototype, "paymentMethods", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Preferencias del cliente' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateCustomerDto.prototype, "preferences", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Información de crédito' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateCustomerDto.prototype, "creditInfo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Fuente de registro', enum: ['manual', 'web', 'whatsapp', 'referral', 'import'], default: 'manual' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['manual', 'web', 'whatsapp', 'referral', 'import']),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Cliente que lo refirió' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "referredBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vendedor asignado' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "assignedTo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notas del cliente' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notas internas' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "internalNotes", void 0);
class UpdateCustomerDto {
}
exports.UpdateCustomerDto = UpdateCustomerDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre del cliente' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Apellido del cliente' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre de la empresa' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tipo de cliente' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['individual', 'business']),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "customerType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Estado del cliente' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['active', 'inactive', 'suspended', 'blocked']),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Razón de inactividad' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "inactiveReason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vendedor asignado' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "assignedTo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notas del cliente' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notas internas' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "internalNotes", void 0);
class CustomerInteractionDto {
    constructor() {
        this.status = 'completed';
    }
}
exports.CustomerInteractionDto = CustomerInteractionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tipo de interacción', enum: ['call', 'email', 'whatsapp', 'visit', 'complaint', 'compliment'] }),
    (0, class_validator_1.IsEnum)(['call', 'email', 'whatsapp', 'visit', 'complaint', 'compliment']),
    __metadata("design:type", String)
], CustomerInteractionDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Canal de comunicación', enum: ['phone', 'email', 'whatsapp', 'in_person', 'web'] }),
    (0, class_validator_1.IsEnum)(['phone', 'email', 'whatsapp', 'in_person', 'web']),
    __metadata("design:type", String)
], CustomerInteractionDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Asunto de la interacción' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CustomerInteractionDto.prototype, "subject", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Descripción detallada' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerInteractionDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Estado de la interacción', enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'completed' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['pending', 'in_progress', 'completed', 'cancelled']),
    __metadata("design:type", String)
], CustomerInteractionDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Fecha de seguimiento' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], CustomerInteractionDto.prototype, "followUpDate", void 0);
class CustomerQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
        this.sortBy = 'createdAt';
        this.sortOrder = 'desc';
    }
}
exports.CustomerQueryDto = CustomerQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Página', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CustomerQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Límite por página', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CustomerQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Término de búsqueda' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tipo de cliente' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['individual', 'business']),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "customerType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Estado del cliente' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['active', 'inactive', 'suspended', 'blocked']),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vendedor asignado' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "assignedTo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Segmento del cliente' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "segment", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Fuente de registro' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['manual', 'web', 'whatsapp', 'referral', 'import']),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Ordenar por', enum: ['name', 'createdAt', 'lastOrderDate', 'totalSpent'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['name', 'createdAt', 'lastOrderDate', 'totalSpent']),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Orden', enum: ['asc', 'desc'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['asc', 'desc']),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "sortOrder", void 0);


/***/ }),
/* 49 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PricingModule = void 0;
const common_1 = __webpack_require__(3);
const auth_module_1 = __webpack_require__(10);
const pricing_controller_1 = __webpack_require__(50);
const pricing_service_1 = __webpack_require__(51);
let PricingModule = class PricingModule {
};
exports.PricingModule = PricingModule;
exports.PricingModule = PricingModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [pricing_controller_1.PricingController],
        providers: [pricing_service_1.PricingService],
        exports: [pricing_service_1.PricingService],
    })
], PricingModule);


/***/ }),
/* 50 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PricingController = void 0;
const common_1 = __webpack_require__(3);
const swagger_1 = __webpack_require__(7);
const pricing_service_1 = __webpack_require__(51);
const order_dto_1 = __webpack_require__(43);
const jwt_auth_guard_1 = __webpack_require__(23);
const tenant_guard_1 = __webpack_require__(24);
const permissions_guard_1 = __webpack_require__(25);
const permissions_decorator_1 = __webpack_require__(26);
let PricingController = class PricingController {
    constructor(pricingService) {
        this.pricingService = pricingService;
    }
    async calculateOrder(calculationDto, req) {
        try {
            const calculation = await this.pricingService.calculateOrder(calculationDto, req.tenant);
            return {
                success: true,
                message: 'Cálculo realizado exitosamente',
                data: calculation,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al calcular precios', common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.PricingController = PricingController;
__decorate([
    (0, common_1.Post)('calculate'),
    (0, permissions_decorator_1.RequirePermissions)('orders', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Calcular precios de orden con impuestos venezolanos' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cálculo realizado exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof order_dto_1.OrderCalculationDto !== "undefined" && order_dto_1.OrderCalculationDto) === "function" ? _b : Object, Object]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "calculateOrder", null);
exports.PricingController = PricingController = __decorate([
    (0, swagger_1.ApiTags)('pricing'),
    (0, common_1.Controller)('pricing'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [typeof (_a = typeof pricing_service_1.PricingService !== "undefined" && pricing_service_1.PricingService) === "function" ? _a : Object])
], PricingController);


/***/ }),
/* 51 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PricingService_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PricingService = void 0;
const common_1 = __webpack_require__(3);
let PricingService = PricingService_1 = class PricingService {
    constructor() {
        this.logger = new common_1.Logger(PricingService_1.name);
    }
    async calculateOrder(calculationDto, tenant) {
        this.logger.log('Calculating order prices with Venezuelan taxes');
        const { items, paymentMethod, discountAmount = 0, shippingCost = 0 } = calculationDto;
        const ivaRate = tenant.settings?.taxes?.ivaRate || 0.16;
        const igtfRate = tenant.settings?.taxes?.igtfRate || 0.03;
        let subtotal = 0;
        const itemsWithTaxes = [];
        for (const item of items) {
            const itemTotal = item.quantity * item.unitPrice;
            const itemIva = itemTotal * ivaRate;
            const applyIgtf = paymentMethod && ['card', 'usd_cash', 'usd_transfer'].includes(paymentMethod);
            const itemIgtf = applyIgtf ? itemTotal * igtfRate : 0;
            let adjustmentRate = 0;
            if (paymentMethod === 'cash') {
                adjustmentRate = -0.05;
            }
            else if (paymentMethod === 'card') {
                adjustmentRate = 0.03;
            }
            const adjustment = itemTotal * adjustmentRate;
            const finalItemPrice = itemTotal + itemIva + itemIgtf + adjustment;
            itemsWithTaxes.push({
                ...item,
                subtotal: itemTotal,
                ivaAmount: itemIva,
                igtfAmount: itemIgtf,
                adjustment,
                finalPrice: finalItemPrice,
            });
            subtotal += itemTotal;
        }
        const totalIva = itemsWithTaxes.reduce((sum, item) => sum + item.ivaAmount, 0);
        const totalIgtf = itemsWithTaxes.reduce((sum, item) => sum + item.igtfAmount, 0);
        const totalAdjustments = itemsWithTaxes.reduce((sum, item) => sum + item.adjustment, 0);
        const totalBeforeDiscount = subtotal + totalIva + totalIgtf + totalAdjustments + shippingCost;
        const finalTotal = totalBeforeDiscount - discountAmount;
        const usdRate = 36.50;
        const totalUSD = finalTotal / usdRate;
        return {
            items: itemsWithTaxes,
            summary: {
                subtotal,
                totalIva,
                totalIgtf,
                totalAdjustments,
                shippingCost,
                discountAmount,
                totalVES: finalTotal,
                totalUSD,
                exchangeRate: usdRate,
            },
            taxes: {
                ivaRate: ivaRate * 100,
                igtfRate: igtfRate * 100,
                igtfApplied: itemsWithTaxes.some(item => item.igtfAmount > 0),
            },
            paymentMethod: {
                method: paymentMethod,
                adjustmentRate: paymentMethod === 'cash' ? -5 : paymentMethod === 'card' ? 3 : 0,
            },
        };
    }
    async getExchangeRate() {
        return 36.50;
    }
    calculateMargin(costPrice, sellingPrice) {
        if (costPrice === 0)
            return 0;
        return ((sellingPrice - costPrice) / sellingPrice) * 100;
    }
    applyPricingRules(basePrice, rules) {
        let finalPrice = basePrice;
        if (rules.minimumMargin) {
            const minPrice = basePrice / (1 - rules.minimumMargin);
            finalPrice = Math.max(finalPrice, minPrice);
        }
        if (rules.maximumDiscount) {
            const maxDiscountPrice = basePrice * (1 - rules.maximumDiscount);
            finalPrice = Math.max(finalPrice, maxDiscountPrice);
        }
        return finalPrice;
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = PricingService_1 = __decorate([
    (0, common_1.Injectable)()
], PricingService);


/***/ }),
/* 52 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PaymentsModule = void 0;
const common_1 = __webpack_require__(3);
const auth_module_1 = __webpack_require__(10);
const payments_controller_1 = __webpack_require__(53);
const payments_service_1 = __webpack_require__(54);
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [payments_controller_1.PaymentsController],
        providers: [payments_service_1.PaymentsService],
        exports: [payments_service_1.PaymentsService],
    })
], PaymentsModule);


/***/ }),
/* 53 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PaymentsController = void 0;
const common_1 = __webpack_require__(3);
const swagger_1 = __webpack_require__(7);
const payments_service_1 = __webpack_require__(54);
const order_dto_1 = __webpack_require__(43);
const jwt_auth_guard_1 = __webpack_require__(23);
const tenant_guard_1 = __webpack_require__(24);
const permissions_guard_1 = __webpack_require__(25);
const permissions_decorator_1 = __webpack_require__(26);
let PaymentsController = class PaymentsController {
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async addPayment(addPaymentDto, req) {
        try {
            const result = await this.paymentsService.addPayment(addPaymentDto, req.user);
            return {
                success: true,
                message: 'Pago agregado exitosamente',
                data: result,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al agregar pago', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async confirmPayment(confirmPaymentDto, req) {
        try {
            const result = await this.paymentsService.confirmPayment(confirmPaymentDto, req.user);
            return {
                success: true,
                message: 'Pago confirmado exitosamente',
                data: result,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al confirmar pago', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getPaymentMethods(req) {
        try {
            const methods = await this.paymentsService.getPaymentMethods(req.tenant);
            return {
                success: true,
                message: 'Métodos obtenidos exitosamente',
                data: methods,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al obtener métodos de pago', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('add'),
    (0, permissions_decorator_1.RequirePermissions)('orders', ['update']),
    (0, swagger_1.ApiOperation)({ summary: 'Agregar pago a una orden' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Pago agregado exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof order_dto_1.AddOrderPaymentDto !== "undefined" && order_dto_1.AddOrderPaymentDto) === "function" ? _b : Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "addPayment", null);
__decorate([
    (0, common_1.Post)('confirm'),
    (0, permissions_decorator_1.RequirePermissions)('orders', ['update']),
    (0, swagger_1.ApiOperation)({ summary: 'Confirmar pago de una orden' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pago confirmado exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof order_dto_1.ConfirmOrderPaymentDto !== "undefined" && order_dto_1.ConfirmOrderPaymentDto) === "function" ? _c : Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "confirmPayment", null);
__decorate([
    (0, common_1.Get)('methods'),
    (0, permissions_decorator_1.RequirePermissions)('orders', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener métodos de pago disponibles' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Métodos obtenidos exitosamente' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPaymentMethods", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('payments'),
    (0, common_1.Controller)('payments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [typeof (_a = typeof payments_service_1.PaymentsService !== "undefined" && payments_service_1.PaymentsService) === "function" ? _a : Object])
], PaymentsController);


/***/ }),
/* 54 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PaymentsService = void 0;
const common_1 = __webpack_require__(3);
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor() {
        this.logger = new common_1.Logger(PaymentsService_1.name);
    }
    async addPayment(addPaymentDto, user) {
        this.logger.log(`Adding payment to order: ${addPaymentDto.orderId}`);
        return {
            orderId: addPaymentDto.orderId,
            payment: {
                ...addPaymentDto.payment,
                status: 'pending',
                addedAt: new Date(),
                addedBy: user.id,
            },
        };
    }
    async confirmPayment(confirmPaymentDto, user) {
        this.logger.log(`Confirming payment for order: ${confirmPaymentDto.orderId}`);
        return {
            orderId: confirmPaymentDto.orderId,
            paymentIndex: confirmPaymentDto.paymentIndex,
            status: 'confirmed',
            confirmedAt: confirmPaymentDto.confirmedAt || new Date(),
            confirmedBy: user.id,
        };
    }
    async getPaymentMethods(tenant) {
        const methods = [
            {
                id: 'cash',
                name: 'Efectivo VES',
                currency: 'VES',
                description: 'Pago en efectivo en bolívares',
                discount: 5,
                available: true,
            },
            {
                id: 'card',
                name: 'Tarjeta de Débito/Crédito',
                currency: 'VES',
                description: 'Pago con tarjeta bancaria venezolana',
                surcharge: 3,
                igtfApplicable: true,
                available: true,
            },
            {
                id: 'transfer',
                name: 'Transferencia Bancaria',
                currency: 'VES',
                description: 'Transferencia en bolívares',
                available: true,
            },
            {
                id: 'usd_cash',
                name: 'Efectivo USD',
                currency: 'USD',
                description: 'Pago en efectivo en dólares',
                igtfApplicable: true,
                available: true,
            },
            {
                id: 'usd_transfer',
                name: 'Transferencia USD',
                currency: 'USD',
                description: 'Transferencia en dólares',
                igtfApplicable: true,
                available: true,
            },
            {
                id: 'mixed',
                name: 'Pago Mixto',
                currency: 'MIXED',
                description: 'Combinación de métodos de pago',
                available: true,
            },
        ];
        return {
            methods,
            exchangeRate: 36.50,
            taxes: {
                iva: tenant.settings?.taxes?.ivaRate || 0.16,
                igtf: tenant.settings?.taxes?.igtfRate || 0.03,
            },
        };
    }
    calculatePaymentTotals(amount, method, tenant) {
        const ivaRate = tenant.settings?.taxes?.ivaRate || 0.16;
        const igtfRate = tenant.settings?.taxes?.igtfRate || 0.03;
        let finalAmount = amount;
        let igtfAmount = 0;
        let adjustment = 0;
        if (['card', 'usd_cash', 'usd_transfer'].includes(method)) {
            igtfAmount = amount * igtfRate;
            finalAmount += igtfAmount;
        }
        if (method === 'cash') {
            adjustment = amount * -0.05;
        }
        else if (method === 'card') {
            adjustment = amount * 0.03;
        }
        finalAmount += adjustment;
        return {
            baseAmount: amount,
            igtfAmount,
            adjustment,
            finalAmount,
            method,
        };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)()
], PaymentsService);


/***/ }),
/* 55 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DashboardModule = void 0;
const common_1 = __webpack_require__(3);
const mongoose_1 = __webpack_require__(5);
const dashboard_controller_1 = __webpack_require__(56);
const dashboard_service_1 = __webpack_require__(57);
const auth_module_1 = __webpack_require__(10);
const order_schema_1 = __webpack_require__(42);
const customer_schema_1 = __webpack_require__(47);
const inventory_schema_1 = __webpack_require__(37);
let DashboardModule = class DashboardModule {
};
exports.DashboardModule = DashboardModule;
exports.DashboardModule = DashboardModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            mongoose_1.MongooseModule.forFeature([
                { name: order_schema_1.Order.name, schema: order_schema_1.OrderSchema },
                { name: customer_schema_1.Customer.name, schema: customer_schema_1.CustomerSchema },
                { name: inventory_schema_1.Inventory.name, schema: inventory_schema_1.InventorySchema },
            ]),
        ],
        controllers: [dashboard_controller_1.DashboardController],
        providers: [dashboard_service_1.DashboardService],
    })
], DashboardModule);


/***/ }),
/* 56 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DashboardController = void 0;
const common_1 = __webpack_require__(3);
const swagger_1 = __webpack_require__(7);
const dashboard_service_1 = __webpack_require__(57);
const jwt_auth_guard_1 = __webpack_require__(23);
const tenant_guard_1 = __webpack_require__(24);
const permissions_guard_1 = __webpack_require__(25);
const permissions_decorator_1 = __webpack_require__(26);
let DashboardController = class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    async getSummary(req) {
        try {
            const summary = await this.dashboardService.getSummary(req.user);
            return {
                success: true,
                message: 'Resumen del dashboard obtenido exitosamente',
                data: summary,
            };
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Error al obtener el resumen del dashboard', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, permissions_decorator_1.RequirePermissions)('reports', ['read']),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener un resumen de datos para el dashboard' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Resumen obtenido exitosamente' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getSummary", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('dashboard'),
    (0, common_1.Controller)('dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, permissions_guard_1.PermissionsGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [typeof (_a = typeof dashboard_service_1.DashboardService !== "undefined" && dashboard_service_1.DashboardService) === "function" ? _a : Object])
], DashboardController);


/***/ }),
/* 57 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DashboardService_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DashboardService = void 0;
const common_1 = __webpack_require__(3);
const mongoose_1 = __webpack_require__(5);
const mongoose_2 = __webpack_require__(15);
const order_schema_1 = __webpack_require__(42);
const customer_schema_1 = __webpack_require__(47);
const inventory_schema_1 = __webpack_require__(37);
let DashboardService = DashboardService_1 = class DashboardService {
    constructor(orderModel, customerModel, inventoryModel) {
        this.orderModel = orderModel;
        this.customerModel = customerModel;
        this.inventoryModel = inventoryModel;
        this.logger = new common_1.Logger(DashboardService_1.name);
    }
    async getSummary(user) {
        this.logger.log(`Fetching dashboard summary for tenant: ${user.tenantId}`);
        const tenantId = new mongoose_2.Types.ObjectId(user.tenantId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [productsInStock, ordersToday, activeCustomers, salesTodayResult, inventoryAlerts, recentOrders,] = await Promise.all([
            this.inventoryModel.countDocuments({ tenantId, totalQuantity: { $gt: 0 } }),
            this.orderModel.countDocuments({ tenantId, createdAt: { $gte: today, $lt: tomorrow } }),
            this.customerModel.countDocuments({ tenantId, status: 'active' }),
            this.orderModel.aggregate([
                { $match: { tenantId, status: 'delivered', createdAt: { $gte: today, $lt: tomorrow } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]),
            this.inventoryModel.find({
                tenantId,
                $or: [{ 'alerts.lowStock': true }, { 'alerts.nearExpiration': true }]
            }).limit(5).select('productName alerts'),
            this.orderModel.find({ tenantId }).sort({ createdAt: -1 }).limit(5).select('orderNumber customerName totalAmount status'),
        ]);
        const salesToday = salesTodayResult.length > 0 ? salesTodayResult[0].total : 0;
        return {
            productsInStock,
            ordersToday,
            activeCustomers,
            salesToday,
            inventoryAlerts,
            recentOrders,
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = DashboardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(order_schema_1.Order.name)),
    __param(1, (0, mongoose_1.InjectModel)(customer_schema_1.Customer.name)),
    __param(2, (0, mongoose_1.InjectModel)(inventory_schema_1.Inventory.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, typeof (_b = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _b : Object, typeof (_c = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _c : Object])
], DashboardService);


/***/ }),
/* 58 */
/***/ ((module) => {

module.exports = require("helmet");

/***/ }),
/* 59 */
/***/ ((module) => {

module.exports = require("compression");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
const core_1 = __webpack_require__(1);
const app_module_1 = __webpack_require__(2);
const common_1 = __webpack_require__(3);
const swagger_1 = __webpack_require__(7);
const helmet_1 = __webpack_require__(58);
const compression = __webpack_require__(59);
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.use(compression());
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
    }));
    app.setGlobalPrefix('api/v1');
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Food Inventory SaaS API')
        .setDescription('API para sistema de inventario alimentario en Venezuela')
        .setVersion('1.0.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();

})();

/******/ })()
;
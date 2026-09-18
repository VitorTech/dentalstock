/**
 * Composition root.
 *
 * The ONLY place in the system that knows concrete implementations: use cases
 * receive ports, and this file picks the adapters. Swapping Prisma for another
 * database, or the password hash for another algorithm, is one edit here.
 *
 * `server-only` enforces the boundary in practice: if a client component
 * imports this module (directly or not), the build fails instead of bundling
 * credentials and SQL into the browser.
 */
import "server-only";

import {
  GetTenantSettingsUseCase,
  UpdateTenantThemeUseCase,
} from "@/modules/account/application";
import { PrismaTenantRepository } from "@/modules/account/adapters/out/prisma/tenant.repository";

import {
  AuthenticateUseCase,
  AuthorizationService,
  ChangeTeamMemberRoleUseCase,
  GetCurrentSessionUseCase,
  InviteTeamMemberUseCase,
  ListTeamUseCase,
  LoginUseCase,
  LogoutUseCase,
  RemoveTeamMemberUseCase,
  ResetTeamMemberPasswordUseCase,
} from "@/modules/identity/application";
import { PrismaSessionRepository } from "@/modules/identity/adapters/out/prisma/session.repository";
import { PrismaUserRepository } from "@/modules/identity/adapters/out/prisma/user.repository";
import { CookieTokenTransport } from "@/modules/identity/adapters/out/security/cookie-token-transport";
import { JwtTokenService } from "@/modules/identity/adapters/out/security/jwt-token-service";
import { ScryptPasswordHasher } from "@/modules/identity/adapters/out/security/scrypt-password-hasher";

import {
  CreateInstrumentUseCase,
  CreateMaterialUseCase,
  CreateProcedureUseCase,
  CreateSupplierUseCase,
  DeleteProcedureUseCase,
  DeleteSupplierUseCase,
  DuplicateProcedureUseCase,
  LinkInstrumentToProcedureUseCase,
  LinkMaterialToProcedureUseCase,
  ListInstrumentsUseCase,
  ListMaterialsUseCase,
  ListProceduresUseCase,
  ListSuppliersUseCase,
  RemoveProcedureItemUseCase,
  UpdateInstrumentStockUseCase,
  UpdateMaterialUseCase,
  UpdateProcedureItemQuantityUseCase,
  UpdateSupplierUseCase,
} from "@/modules/catalog/application";
import { PrismaInstrumentRepository } from "@/modules/catalog/adapters/out/prisma/instrument.repository";
import { PrismaMaterialRepository } from "@/modules/catalog/adapters/out/prisma/material.repository";
import { PrismaProcedureRepository } from "@/modules/catalog/adapters/out/prisma/procedure.repository";
import { PrismaSupplierRepository } from "@/modules/catalog/adapters/out/prisma/supplier.repository";

import {
  AdjustStockUseCase,
  ListStockMovementsUseCase,
  RegisterStockEntryUseCase,
} from "@/modules/inventory/application";
import { PrismaConsumptionReport } from "@/modules/inventory/adapters/out/prisma/consumption-report";
import { PrismaStockMovementRepository } from "@/modules/inventory/adapters/out/prisma/stock-movement.repository";

import {
  ExportHistoryUseCase,
  FinalizeProcedureUseCase,
  ListHistoryUseCase,
  ReverseExecutionUseCase,
} from "@/modules/clinical/application";
import { PrismaExecutionCostReport } from "@/modules/clinical/adapters/out/prisma/execution-cost-report";
import { PrismaProcedureExecutionRepository } from "@/modules/clinical/adapters/out/prisma/execution.repository";

import { GetDashboardUseCase } from "@/modules/analytics/application";

import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaThrottleRepository } from "@/shared/infrastructure/throttle.repository";
import { CryptoSecretGenerator, SystemClock } from "@/shared/infrastructure/system";

// --- Outbound adapters (instantiated once per process) ---------------------

const clock = new SystemClock();
const secrets = new CryptoSecretGenerator();

const tenants = new PrismaTenantRepository(prisma);

const throttle = new PrismaThrottleRepository(prisma);

const users = new PrismaUserRepository(prisma);
const sessions = new PrismaSessionRepository(prisma);

const hasher = new ScryptPasswordHasher();
const tokens = new JwtTokenService();

const materials = new PrismaMaterialRepository(prisma);
const instruments = new PrismaInstrumentRepository(prisma);
const suppliers = new PrismaSupplierRepository(prisma);
const procedures = new PrismaProcedureRepository(prisma);

const stockMovements = new PrismaStockMovementRepository(prisma);
const consumption = new PrismaConsumptionReport(prisma);

const executions = new PrismaProcedureExecutionRepository(prisma);
const executionCosts = new PrismaExecutionCostReport(prisma);

// --- Use cases, by module --------------------------------------------------

export const container = {
  account: {
    getTenantSettings: new GetTenantSettingsUseCase(tenants),
    updateTenantTheme: new UpdateTenantThemeUseCase(tenants),
  },

  identity: {
    login: new LoginUseCase(users, sessions, hasher, tokens, secrets, clock, throttle),
    authenticate: new AuthenticateUseCase(tokens, sessions),
    logout: new LogoutUseCase(tokens, sessions),
    authorization: new AuthorizationService(),
    getCurrentSession: new GetCurrentSessionUseCase(users, tenants),
    listTeam: new ListTeamUseCase(users),
    inviteTeamMember: new InviteTeamMemberUseCase(users, hasher),
    changeTeamMemberRole: new ChangeTeamMemberRoleUseCase(users, sessions),
    removeTeamMember: new RemoveTeamMemberUseCase(users),
    resetTeamMemberPassword: new ResetTeamMemberPasswordUseCase(users, sessions, hasher),
    /** Created per request: `cookies()` depends on the current context. */
    tokenTransport: () => new CookieTokenTransport(),
  },

  catalog: {
    listMaterials: new ListMaterialsUseCase(materials),
    createMaterial: new CreateMaterialUseCase(materials),
    updateMaterial: new UpdateMaterialUseCase(materials, suppliers),

    listInstruments: new ListInstrumentsUseCase(instruments),
    createInstrument: new CreateInstrumentUseCase(instruments),
    updateInstrumentStock: new UpdateInstrumentStockUseCase(instruments),

    listSuppliers: new ListSuppliersUseCase(suppliers),
    createSupplier: new CreateSupplierUseCase(suppliers),
    updateSupplier: new UpdateSupplierUseCase(suppliers),
    deleteSupplier: new DeleteSupplierUseCase(suppliers),

    listProcedures: new ListProceduresUseCase(procedures),
    createProcedure: new CreateProcedureUseCase(procedures),
    deleteProcedure: new DeleteProcedureUseCase(procedures),
    duplicateProcedure: new DuplicateProcedureUseCase(procedures),
    linkMaterialToProcedure: new LinkMaterialToProcedureUseCase(procedures, materials),
    linkInstrumentToProcedure: new LinkInstrumentToProcedureUseCase(procedures, instruments),
    updateProcedureItemQuantity: new UpdateProcedureItemQuantityUseCase(procedures),
    removeProcedureItem: new RemoveProcedureItemUseCase(procedures),
  },

  inventory: {
    registerStockEntry: new RegisterStockEntryUseCase(materials, stockMovements),
    adjustStock: new AdjustStockUseCase(materials, stockMovements),
    listStockMovements: new ListStockMovementsUseCase(stockMovements),
  },

  clinical: {
    finalizeProcedure: new FinalizeProcedureUseCase(procedures, materials, executions, secrets),
    reverseExecution: new ReverseExecutionUseCase(executions),
    listHistory: new ListHistoryUseCase(executions),
    exportHistory: new ExportHistoryUseCase(executions),
  },

  analytics: {
    getDashboard: new GetDashboardUseCase(materials, suppliers, consumption, executionCosts),
  },

  /**
   * Cross-cutting protections used by the HTTP edge, not by a single module:
   * the attempt counter behind both the login limit and the write budget.
   */
  security: { throttle },

  /** Shared clock, for routes that need a deterministic "now". */
  clock,
} as const;

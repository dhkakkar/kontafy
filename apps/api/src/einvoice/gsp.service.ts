import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NICEInvoicePayload,
  NICGenerateResponse,
  NICCancelResponse,
  NICEwayBillResponse,
} from './dto/einvoice.dto';

// ═══════════════════════════════════════════════════════════════
// GSP (GST Suvidha Provider) API Client
// Handles authentication, token management, and API calls to NIC
// ═══════════════════════════════════════════════════════════════

interface GspConfig {
  provider: string;
  username: string;
  password: string;
  client_id: string;
  client_secret: string;
  gstin: string;
  sandbox_mode: boolean;
}

interface AuthToken {
  token: string;
  expires_at: number;
  sek: string; // Session Encryption Key
}

const NIC_ENDPOINTS = {
  sandbox: {
    auth: 'https://einv-apisandbox.nic.in/eivital/v1.04/auth',
    generate: 'https://einv-apisandbox.nic.in/eicore/v1.03/Invoice',
    getIrn: 'https://einv-apisandbox.nic.in/eicore/v1.03/Invoice/irn',
    cancel: 'https://einv-apisandbox.nic.in/eicore/v1.03/Invoice/Cancel',
    ewayBill: 'https://einv-apisandbox.nic.in/eiewb/v1.03/ewaybill',
    ewayBillCancel: 'https://einv-apisandbox.nic.in/eiewb/v1.03/ewaybill/cancel',
  },
  production: {
    auth: 'https://einv-api.nic.in/eivital/v1.04/auth',
    generate: 'https://einv-api.nic.in/eicore/v1.03/Invoice',
    getIrn: 'https://einv-api.nic.in/eicore/v1.03/Invoice/irn',
    cancel: 'https://einv-api.nic.in/eicore/v1.03/Invoice/Cancel',
    ewayBill: 'https://einv-api.nic.in/eiewb/v1.03/ewaybill',
    ewayBillCancel: 'https://einv-api.nic.in/eiewb/v1.03/ewaybill/cancel',
  },
};

@Injectable()
export class GspService {
  private readonly logger = new Logger(GspService.name);
  private tokenCache: Map<string, AuthToken> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  // ─── Configuration ──────────────────────────────────────────

  async getConfig(orgId: string): Promise<GspConfig> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true, gstin: true },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    const settings = (org.settings as Record<string, any>) || {};
    const einvoiceSettings = settings.einvoice || {};

    if (!einvoiceSettings.gsp_username || !einvoiceSettings.gsp_password) {
      throw new BadRequestException(
        'GSP credentials not configured. Please configure E-Invoice settings first.',
      );
    }

    return {
      provider: einvoiceSettings.gsp_provider || 'nic',
      username: einvoiceSettings.gsp_username,
      password: einvoiceSettings.gsp_password,
      client_id: einvoiceSettings.gsp_client_id || '',
      client_secret: einvoiceSettings.gsp_client_secret || '',
      gstin: einvoiceSettings.gstin || org.gstin || '',
      sandbox_mode: einvoiceSettings.sandbox_mode !== false,
    };
  }

  private getEndpoints(sandbox: boolean) {
    return sandbox ? NIC_ENDPOINTS.sandbox : NIC_ENDPOINTS.production;
  }

  // ─── Authentication ─────────────────────────────────────────

  private async authenticate(orgId: string, config: GspConfig): Promise<AuthToken> {
    const cacheKey = `${orgId}:${config.gstin}`;
    const cached = this.tokenCache.get(cacheKey);

    if (cached && cached.expires_at > Date.now() + 60_000) {
      return cached;
    }

    const endpoints = this.getEndpoints(config.sandbox_mode);

    this.logger.log(`Authenticating with NIC for GSTIN: ${config.gstin}`);

    try {
      const response = await this.fetchWithRetry(endpoints.auth, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          client_id: config.client_id,
          client_secret: config.client_secret,
          gstin: config.gstin,
        },
        body: JSON.stringify({
          UserName: config.username,
          Password: config.password,
          AppKey: config.client_id,
          ForceRefreshAccessToken: 'true',
        }),
      });

      const data = await response.json();

      if (!data.Status || data.Status !== 1) {
        throw new BadRequestException(
          `NIC authentication failed: ${data.ErrorDetails?.[0]?.ErrorMessage || 'Unknown error'}`,
        );
      }

      const token: AuthToken = {
        token: data.Data?.AuthToken || data.Data?.authtoken,
        expires_at: Date.now() + (data.Data?.TokenExpiry || 3600) * 1000,
        sek: data.Data?.Sek || '',
      };

      this.tokenCache.set(cacheKey, token);
      this.logger.log(`NIC authentication successful for GSTIN: ${config.gstin}`);

      return token;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`NIC authentication error: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'Failed to authenticate with NIC e-Invoice portal. Please try again later.',
      );
    }
  }

  // ─── E-Invoice API Calls ────────────────────────────────────

  async generateEInvoice(
    orgId: string,
    payload: NICEInvoicePayload,
  ): Promise<NICGenerateResponse> {
    const config = await this.getConfig(orgId);
    const auth = await this.authenticate(orgId, config);
    const endpoints = this.getEndpoints(config.sandbox_mode);

    this.logger.log(
      `Generating e-invoice for doc: ${payload.DocDtls.No}, GSTIN: ${config.gstin}`,
    );

    try {
      const response = await this.fetchWithRetry(endpoints.generate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          client_id: config.client_id,
          client_secret: config.client_secret,
          gstin: config.gstin,
          AuthToken: auth.token,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.Status || data.Status !== 1) {
        const errorMsg =
          data.ErrorDetails?.map((e: any) => e.ErrorMessage).join('; ') ||
          data.error?.message ||
          'E-Invoice generation failed';
        throw new BadRequestException(errorMsg);
      }

      return data.Data as NICGenerateResponse;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`E-Invoice generation error: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'Failed to generate e-invoice. NIC portal may be unavailable.',
      );
    }
  }

  async getEInvoiceByIrn(orgId: string, irn: string): Promise<any> {
    const config = await this.getConfig(orgId);
    const auth = await this.authenticate(orgId, config);
    const endpoints = this.getEndpoints(config.sandbox_mode);

    try {
      const response = await this.fetchWithRetry(
        `${endpoints.getIrn}/${encodeURIComponent(irn)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            client_id: config.client_id,
            client_secret: config.client_secret,
            gstin: config.gstin,
            AuthToken: auth.token,
          },
        },
      );

      const data = await response.json();
      return data.Data;
    } catch (error) {
      this.logger.error(`Get e-invoice by IRN error: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Failed to fetch e-invoice status from NIC.');
    }
  }

  async cancelEInvoice(
    orgId: string,
    irn: string,
    reason: string,
    remarks: string,
  ): Promise<NICCancelResponse> {
    const config = await this.getConfig(orgId);
    const auth = await this.authenticate(orgId, config);
    const endpoints = this.getEndpoints(config.sandbox_mode);

    this.logger.log(`Cancelling e-invoice IRN: ${irn}`);

    try {
      const response = await this.fetchWithRetry(endpoints.cancel, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          client_id: config.client_id,
          client_secret: config.client_secret,
          gstin: config.gstin,
          AuthToken: auth.token,
        },
        body: JSON.stringify({
          Irn: irn,
          CnlRsn: reason,
          CnlRem: remarks,
        }),
      });

      const data = await response.json();

      if (!data.Status || data.Status !== 1) {
        const errorMsg =
          data.ErrorDetails?.map((e: any) => e.ErrorMessage).join('; ') ||
          'E-Invoice cancellation failed';
        throw new BadRequestException(errorMsg);
      }

      return data.Data as NICCancelResponse;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`E-Invoice cancellation error: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Failed to cancel e-invoice on NIC portal.');
    }
  }

  // ─── E-Way Bill API Calls ───────────────────────────────────

  async generateEwayBill(orgId: string, payload: any): Promise<NICEwayBillResponse> {
    const config = await this.getConfig(orgId);
    const auth = await this.authenticate(orgId, config);
    const endpoints = this.getEndpoints(config.sandbox_mode);

    this.logger.log(`Generating e-way bill for GSTIN: ${config.gstin}`);

    try {
      const response = await this.fetchWithRetry(endpoints.ewayBill, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          client_id: config.client_id,
          client_secret: config.client_secret,
          gstin: config.gstin,
          AuthToken: auth.token,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.Status || data.Status !== 1) {
        const errorMsg =
          data.ErrorDetails?.map((e: any) => e.ErrorMessage).join('; ') ||
          'E-Way Bill generation failed';
        throw new BadRequestException(errorMsg);
      }

      return data.Data as NICEwayBillResponse;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`E-Way Bill generation error: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'Failed to generate e-way bill. NIC portal may be unavailable.',
      );
    }
  }

  async cancelEwayBill(
    orgId: string,
    ewayBillNo: string,
    reason: string,
    remarks: string,
  ): Promise<any> {
    const config = await this.getConfig(orgId);
    const auth = await this.authenticate(orgId, config);
    const endpoints = this.getEndpoints(config.sandbox_mode);

    this.logger.log(`Cancelling e-way bill: ${ewayBillNo}`);

    try {
      const response = await this.fetchWithRetry(endpoints.ewayBillCancel, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          client_id: config.client_id,
          client_secret: config.client_secret,
          gstin: config.gstin,
          AuthToken: auth.token,
        },
        body: JSON.stringify({
          ewbNo: Number(ewayBillNo),
          cancelRsnCode: Number(reason),
          cancelRmrk: remarks,
        }),
      });

      const data = await response.json();

      if (!data.Status || data.Status !== 1) {
        const errorMsg =
          data.ErrorDetails?.map((e: any) => e.ErrorMessage).join('; ') ||
          'E-Way Bill cancellation failed';
        throw new BadRequestException(errorMsg);
      }

      return data.Data;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`E-Way Bill cancellation error: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Failed to cancel e-way bill on NIC portal.');
    }
  }

  async extendEwayBill(orgId: string, payload: any): Promise<any> {
    const config = await this.getConfig(orgId);
    const auth = await this.authenticate(orgId, config);
    const endpoints = this.getEndpoints(config.sandbox_mode);

    this.logger.log(`Extending e-way bill validity`);

    try {
      const response = await this.fetchWithRetry(
        `${endpoints.ewayBill}/extendvalidity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            client_id: config.client_id,
            client_secret: config.client_secret,
            gstin: config.gstin,
            AuthToken: auth.token,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!data.Status || data.Status !== 1) {
        const errorMsg =
          data.ErrorDetails?.map((e: any) => e.ErrorMessage).join('; ') ||
          'E-Way Bill extension failed';
        throw new BadRequestException(errorMsg);
      }

      return data.Data;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`E-Way Bill extension error: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Failed to extend e-way bill validity.');
    }
  }

  // ─── HTTP Helper with Retry ─────────────────────────────────

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 3,
    delay = 1000,
  ): Promise<Response> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30_000),
        });

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry on server errors (5xx)
        if (response.status >= 500 && attempt < retries) {
          this.logger.warn(
            `NIC API returned ${response.status}, retrying (${attempt}/${retries})...`,
          );
          await this.sleep(delay * attempt);
          continue;
        }

        return response;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        this.logger.warn(
          `NIC API request failed, retrying (${attempt}/${retries}): ${(error as Error).message}`,
        );
        await this.sleep(delay * attempt);
      }
    }

    throw new ServiceUnavailableException('NIC API is unavailable after multiple retries.');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─── Token Cache Management ─────────────────────────────────

  clearTokenCache(orgId?: string): void {
    if (orgId) {
      for (const key of this.tokenCache.keys()) {
        if (key.startsWith(orgId)) {
          this.tokenCache.delete(key);
        }
      }
    } else {
      this.tokenCache.clear();
    }
  }
}

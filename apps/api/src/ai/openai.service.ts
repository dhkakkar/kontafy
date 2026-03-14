import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://api.openai.com/v1';
  private readonly defaultModel = 'gpt-4o-mini';

  // Simple rate limiter: track request timestamps
  private requestTimestamps: number[] = [];
  private readonly maxRequestsPerMinute = 30;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!this.apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY not configured — AI features will return fallback responses',
      );
    }
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  // ─── Rate Limiting ───────────────────────────────────────────

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    // Clean old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => ts > oneMinuteAgo,
    );

    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      const oldestInWindow = this.requestTimestamps[0];
      const waitMs = oldestInWindow + 60_000 - now;
      this.logger.warn(`Rate limit reached, waiting ${waitMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    this.requestTimestamps.push(now);
  }

  // ─── Chat Completion ────────────────────────────────────────

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    await this.checkRateLimit();

    const body = {
      model: options.model || this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 2048,
      ...(options.response_format && {
        response_format: options.response_format,
      }),
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `OpenAI API error ${response.status}: ${error.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      if (error instanceof Error && error.message.includes('OpenAI API error')) {
        throw error;
      }
      this.logger.error('OpenAI API request failed', error);
      throw new Error('Failed to communicate with OpenAI API');
    }
  }

  // ─── Structured Financial Analysis ──────────────────────────

  async analyzeFinancialData<T = Record<string, unknown>>(
    prompt: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a financial analyst AI for an Indian accounting platform (Kontafy).
You analyze financial data and return structured JSON responses.
Always respond with valid JSON. Use INR currency. Consider Indian business context (GST, fiscal year April-March).
Be concise, actionable, and data-driven.`,
      },
      {
        role: 'user',
        content: `${prompt}\n\nData:\n${JSON.stringify(data, null, 2)}`,
      },
    ];

    const response = await this.chat(messages, {
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 4096,
    });

    try {
      return JSON.parse(response) as T;
    } catch {
      this.logger.error('Failed to parse OpenAI JSON response', response);
      throw new Error('Failed to parse AI response as JSON');
    }
  }
}

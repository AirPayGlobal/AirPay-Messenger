import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

class AnthropicService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor() {
    this.apiKey = config.anthropic.apiKey;
    this.apiUrl = config.anthropic.apiUrl;
    this.model = config.anthropic.model;
  }

  async generateText(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    if (!this.apiKey || !config.anthropic.enabled) {
      throw new Error('Anthropic not configured or disabled');
    }

    const url = `${this.apiUrl.replace(/\/$/, '')}/v1/responses`;

    const body: any = {
      model: this.model,
      input: prompt,
    };

    if (options?.maxTokens) body.max_tokens_to_sample = options.maxTokens;
    if (options?.temperature) body.temperature = options.temperature;

    try {
      const res = await axios.post(url, body, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      // Try to parse common Anthropic response shapes
      const data: any = res.data;

      if (!data) return '';

      if (typeof data === 'string') return data;

      if (data.output_text) return data.output_text;

      if (data.completion) return data.completion;

      if (Array.isArray(data.output) && data.output.length > 0) {
        // new Responses API: output -> [{ content: [{ text: '...' }] }]
        try {
          const parts: string[] = [];
          for (const out of data.output) {
            if (Array.isArray(out.content)) {
              for (const c of out.content) {
                if (c.type === 'output_text' && c.text) parts.push(c.text);
                else if (c.text) parts.push(c.text);
              }
            } else if (typeof out === 'string') {
              parts.push(out);
            }
          }
          return parts.join('\n');
        } catch (err) {
          // fallthrough
        }
      }

      // Fallback to stringifying
      return JSON.stringify(data);
    } catch (error: any) {
      logger.error('Anthropic generateText error', { error: error.message });
      throw error;
    }
  }
}

export const anthropicService = new AnthropicService();

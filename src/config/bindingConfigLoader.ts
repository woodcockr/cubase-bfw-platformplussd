/**
 * Configuration loader for binding definitions.
 * Handles parsing, validation, and loading of binding configurations.
 */

import {
  BindingConfig,
  BindingConfigCollection,
  ValidationResult,
  PerChannelBinding,
  BindingDefinitions,
} from './bindingConfig';

export class BindingConfigValidator {
  /**
   * Validate a binding configuration
   */
  static validate(config: BindingConfig): ValidationResult {
    const errors: string[] = [];

    // Check required fields
    if (!config.id) {
      errors.push('BindingConfig: missing required field "id"');
    }
    if (!config.name) {
      errors.push('BindingConfig: missing required field "name"');
    }
    if (!config.bindings) {
      errors.push('BindingConfig: missing required field "bindings"');
    }

    // Validate bindings structure
    if (config.bindings) {
      const bindingErrors = this.validateBindings(config.bindings, config.id);
      errors.push(...bindingErrors);
    }

    // Validate master button reference
    if (config.masterButton && typeof config.masterButton !== 'string') {
      errors.push(
        `BindingConfig "${config.id}": masterButton must be a string`
      );
    }

    // Validate activation config
    if (config.activation) {
      if (
        config.activation.globalVariables &&
        !Array.isArray(config.activation.globalVariables)
      ) {
        errors.push(
          `BindingConfig "${config.id}": activation.globalVariables must be an array`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static validateBindings(
    bindings: BindingDefinitions,
    configId: string
  ): string[] {
    const errors: string[] = [];

    // Validate perChannel bindings
    if (bindings.perChannel) {
      if (!Array.isArray(bindings.perChannel)) {
        errors.push(
          `BindingConfig "${configId}": bindings.perChannel must be an array`
        );
      } else {
        bindings.perChannel.forEach((binding, index) => {
          const bindingErrors = this.validatePerChannelBinding(
            binding,
            configId,
            `perChannel[${index}]`
          );
          errors.push(...bindingErrors);
        });
      }
    }

    // Validate fixedChannels bindings
    if (bindings.fixedChannels) {
      if (!Array.isArray(bindings.fixedChannels)) {
        errors.push(
          `BindingConfig "${configId}": bindings.fixedChannels must be an array`
        );
      } else {
        bindings.fixedChannels.forEach((fixed, index) => {
          if (fixed.channelIndex === undefined) {
            errors.push(
              `BindingConfig "${configId}": fixedChannels[${index}] missing channelIndex`
            );
          }
          if (!Array.isArray(fixed.bindings)) {
            errors.push(
              `BindingConfig "${configId}": fixedChannels[${index}].bindings must be an array`
            );
          } else {
            fixed.bindings.forEach((binding, bindIndex) => {
              const bindingErrors = this.validatePerChannelBinding(
                binding,
                configId,
                `fixedChannels[${index}].bindings[${bindIndex}]`
              );
              errors.push(...bindingErrors);
            });
          }
        });
      }
    }

    // Validate variableChannels bindings
    if (bindings.variableChannels) {
      if (!bindings.variableChannels.range) {
        errors.push(
          `BindingConfig "${configId}": variableChannels.range is required`
        );
      }
      if (!bindings.variableChannels.hostValueFactory) {
        errors.push(
          `BindingConfig "${configId}": variableChannels.hostValueFactory is required`
        );
      }
      if (!Array.isArray(bindings.variableChannels.bindings)) {
        errors.push(
          `BindingConfig "${configId}": variableChannels.bindings must be an array`
        );
      } else {
        bindings.variableChannels.bindings.forEach((binding, index) => {
          const bindingErrors = this.validatePerChannelBinding(
            binding,
            configId,
            `variableChannels.bindings[${index}]`
          );
          errors.push(...bindingErrors);
        });
      }
    }

    // Validate dummyBindings
    if (bindings.dummyBindings) {
      if (!Array.isArray(bindings.dummyBindings)) {
        errors.push(
          `BindingConfig "${configId}": bindings.dummyBindings must be an array`
        );
      }
    }

    // Validate dummyChannelRanges
    if (bindings.dummyChannelRanges) {
      if (!Array.isArray(bindings.dummyChannelRanges)) {
        errors.push(
          `BindingConfig "${configId}": bindings.dummyChannelRanges must be an array`
        );
      } else {
        bindings.dummyChannelRanges.forEach((range, index) => {
          if (!range.range) {
            errors.push(
              `BindingConfig "${configId}": dummyChannelRanges[${index}].range is required`
            );
          }
          if (!Array.isArray(range.bindings)) {
            errors.push(
              `BindingConfig "${configId}": dummyChannelRanges[${index}].bindings must be an array`
            );
          }
        });
      }
    }

    return errors;
  }

  private static validatePerChannelBinding(
    binding: PerChannelBinding,
    configId: string,
    path: string
  ): string[] {
    const errors: string[] = [];

    if (!binding.id) {
      errors.push(`BindingConfig "${configId}": ${path}.id is required`);
    }
    if (!binding.surface) {
      errors.push(`BindingConfig "${configId}": ${path}.surface is required`);
    }
    if (!binding.hostValue) {
      errors.push(`BindingConfig "${configId}": ${path}.hostValue is required`);
    }

    return errors;
  }
}

export class BindingConfigLoader {
  /**
   * Parse a JSON string into BindingConfig objects
   */
  static parseJson(jsonString: string): BindingConfigCollection {
    try {
      const data = JSON.parse(jsonString);
      return data as BindingConfigCollection;
    } catch (error) {
      throw new Error(`Failed to parse binding configuration JSON: ${error}`);
    }
  }

  /**
   * Load and validate a binding configuration collection
   */
  static load(jsonString: string): BindingConfig[] {
    const collection = this.parseJson(jsonString);

    if (!collection.subpages || !Array.isArray(collection.subpages)) {
      throw new Error('Configuration must contain "subpages" array');
    }

    // Validate all configs
    const errors: string[] = [];
    for (const config of collection.subpages) {
      const validation = BindingConfigValidator.validate(config);
      if (!validation.valid) {
        errors.push(...validation.errors);
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Configuration validation failed:\n${errors.join('\n')}`
      );
    }

    return collection.subpages;
  }

  /**
   * Load configuration from a file path (browser/runtime implementation needed)
   */
  static async loadFromFile(_filePath: string): Promise<BindingConfig[]> {
    // This would be implemented based on the runtime environment
    // For now, we provide a stub
    throw new Error(
      'loadFromFile not implemented - use parseJson or load instead'
    );
  }
}

/**
 * Factory for creating BindingConfig objects programmatically
 */
export class BindingConfigBuilder {
  private config: BindingConfig;

  constructor(id: string, name: string) {
    this.config = {
      id,
      name,
      bindings: {},
    };
  }

  withDescription(description: string): this {
    this.config.description = description;
    return this;
  }

  withMasterButton(buttonName: string): this {
    this.config.masterButton = buttonName;
    return this;
  }

  withHostAccessor(hostAccessor: string): this {
    this.config.hostAccessor = hostAccessor;
    return this;
  }

  addPerChannelBindings(bindings: PerChannelBinding[]): this {
    this.config.bindings.perChannel = bindings;
    return this;
  }

  addDummyBindings(paths: string[]): this {
    this.config.bindings.dummyBindings = paths;
    return this;
  }

  withActivationConfig(activation: any): this {
    this.config.activation = activation;
    return this;
  }

  build(): BindingConfig {
    const validation = BindingConfigValidator.validate(this.config);
    if (!validation.valid) {
      throw new Error(
        `Invalid binding config: ${validation.errors.join(', ')}`
      );
    }
    return this.config;
  }
}

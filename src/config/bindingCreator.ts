/**
 * Generic binding creation engine.
 * Processes binding configurations and creates Cubase MIDI Remote mappings.
 */

import { IconPlatformMplus } from '../icon_elements';
import { GlobalBooleanVariables } from '../midi/binding';
import { DecoratedFactoryMappingPage } from '../decorators/page';
import {
  BindingConfig,
  PerChannelBinding,
  BindingOptions,
  ChannelRange,
  DummyChannelRange,
} from './bindingConfig';

/**
 * Generic binding creator for subpages
 */
export class BindingCreator {
  private surfaceValueCache = new Map<string, any>();

  constructor(
    private page: DecoratedFactoryMappingPage,
    private device: IconPlatformMplus,
    private dummy: any, // MR_HostValueVariable from Cubase API
    private globalBooleanVariables: GlobalBooleanVariables
  ) {}

  /**
   * Create subpage and all bindings from configuration
   */
  createSubPageBindings(
    config: BindingConfig,
    subPageArea: MR_SubPageArea
  ): MR_SubPage {
    const subPage = subPageArea.makeSubPage(config.name);

    // Create host accessor if needed
    const hostAccessor = this.createHostAccessor(config);

    // Create per-channel bindings
    if (config.bindings.perChannel) {
      this.createPerChannelBindings(config, subPage, hostAccessor);
    }

    // Create per-channel multi bindings (multiple surface→host per channel)
    if (config.bindings.perChannelMulti) {
      this.createPerChannelMultiBindings(config, subPage, hostAccessor);
    }

    // Create indexed channel bindings (limited range with surface offsets)
    if (config.bindings.indexedChannels) {
      this.createIndexedChannelBindings(config, subPage, hostAccessor);
    }

    // Create fixed index bindings (individual positions)
    if (config.bindings.fixedIndexBindings) {
      this.createFixedIndexBindings(config, subPage, hostAccessor);
    }

    // Create command bindings
    if (config.bindings.commandBindings) {
      this.createCommandBindings(config, subPage);
    }

    // Create fixed channel bindings
    if (config.bindings.fixedChannels) {
      this.createFixedChannelBindings(config, subPage, hostAccessor);
    }

    // Create variable channel bindings
    if (config.bindings.variableChannels) {
      this.createVariableChannelBindings(config, subPage, hostAccessor);
    }

    // Create dummy bindings
    if (config.bindings.dummyBindings && config.bindings.dummyBindings.length > 0) {
      this.createDummyBindings(
        config.bindings.dummyBindings,
        subPage,
        0,
        this.device.numStrips
      );
    }

    if (config.bindings.dummyChannelRanges) {
      this.createDummyChannelRanges(config.bindings.dummyChannelRanges, subPage);
    }

    // Setup activation handler
    if (config.activation) {
      this.setupActivationHandler(config, subPage);
    }

    // Setup master button binding
    if (config.masterButton) {
      this.setupMasterButton(config, subPage);
    }

    return subPage;
  }

  /**
   * Create host accessor based on configuration
   */
  private createHostAccessor(config: BindingConfig): any {
    if (config.hostAccessor === 'hostMixerBankZone') {
      const bankZone = (this.page.mHostAccess as any).mMixConsole.makeMixerBankZone(
        'AudioInstrBanks'
      );
      // Enable follow visibility for mixer bank
      if (bankZone.setFollowVisibility) {
        bankZone.setFollowVisibility(true);
      }
      return bankZone;
    }
    if (config.hostAccessor === 'controlRoom') {
      return (this.page.mHostAccess as any).mControlRoom;
    }
    if (config.hostAccessor === 'selectedTrack') {
      const selectedTrack = (this.page.mHostAccess as any).mTrackSelection.mMixerChannel;
      return {
        mSends: selectedTrack.mSends,
        mFocusedQuickControls: (this.page.mHostAccess as any).mFocusedQuickControls,
        mChannelEQ: selectedTrack.mChannelEQ,
        mValue: selectedTrack.mValue,
        mCueSends: selectedTrack.mCueSends,
        mPreFilter: selectedTrack.mPreFilter,
      };
    }
    if (config.hostAccessor === 'selectedTrackStripEffects') {
      const selectedTrack = (this.page.mHostAccess as any).mTrackSelection.mMixerChannel;
      return {
        mStripEffects: selectedTrack.mInsertAndStripEffects.mStripEffects,
      };
    }
    // Custom or no accessor needed
    return null;
  }

  /**
   * Create bindings that apply to all channels
   */
  private createPerChannelBindings(
    config: BindingConfig,
    subPage: MR_SubPage,
    hostAccessor: any
  ): void {
    const bindings = config.bindings.perChannel!;

    for (let channelIndex = 0; channelIndex < this.device.numStrips; channelIndex++) {
      // For mixer bank zone, create a new bank channel for each index
      let hostValueBase = hostAccessor;
      if (hostAccessor?.makeMixerBankChannel) {
        hostValueBase = hostAccessor.makeMixerBankChannel();
      }

      for (const binding of bindings) {
        // Resolve the full host value path from the base object
        const hostValue = this.resolveHostValue(binding.hostValue!, hostValueBase, channelIndex);

        if (!this.isHostValueValid(hostValue)) {
          console.log(
            `Warning: Could not resolve host value at channel ${channelIndex}, path "${binding.hostValue}"`
          );
          continue;
        }

        this.createSingleBinding(
          binding,
          channelIndex,
          hostValue,
          subPage,
          'per-channel'
        );
      }
    }
  }

  /**
   * Create multi-bindings that apply multiple surface→host pairs per channel
   */
  private createPerChannelMultiBindings(
    config: BindingConfig,
    subPage: MR_SubPage,
    hostAccessor: any
  ): void {
    const bindings = config.bindings.perChannelMulti!;

    for (let channelIndex = 0; channelIndex < this.device.numStrips; channelIndex++) {
      let hostValueBase = hostAccessor;
      if (hostAccessor?.makeMixerBankChannel) {
        hostValueBase = hostAccessor.makeMixerBankChannel();
      }

      const hostValueCache = new Map<string, any>();

      for (const multiBinding of bindings) {
        for (const binding of multiBinding.bindings) {
          let hostValue: any = null;
          if (binding.hostValueKey && hostValueCache.has(binding.hostValueKey)) {
            hostValue = hostValueCache.get(binding.hostValueKey);
          } else {
            hostValue = this.resolveHostValue(binding.hostValue, hostValueBase, channelIndex);
            if (binding.hostValueKey) {
              hostValueCache.set(binding.hostValueKey, hostValue);
            }
          }

          if (!this.isHostValueValid(hostValue)) {
            console.log(
              `Warning: Could not resolve host value at channel ${channelIndex}, path "${binding.hostValue}"`
            );
            continue;
          }

          const surfaceValue = this.resolveSurfaceValue(channelIndex, binding.surface);
          if (!this.isSurfaceValueValid(surfaceValue)) {
            console.log(
              `Error: Invalid surface value in multi binding at channel ${channelIndex}, surface "${binding.surface}"`
            );
            continue;
          }

          let valueBinding = this.safeMakeValueBinding(
            surfaceValue,
            hostValue,
            `multi channel ${channelIndex}, surface "${binding.surface}", host "${binding.hostValue}"`
          );
          if (!valueBinding) {
            continue;
          }
          if (binding.options) {
            valueBinding = this.applyBindingOptions(valueBinding, binding.options);
          }
          valueBinding.setSubPage(subPage);

          // Create duplicate if specified (for workarounds)
          if (binding.duplicate) {
            let dupBinding = this.safeMakeValueBinding(
              surfaceValue,
              hostValue,
              `multi duplicate channel ${channelIndex}, surface "${binding.surface}", host "${binding.hostValue}"`
            );
            if (!dupBinding) {
              continue;
            }
            if (binding.options) {
              dupBinding = this.applyBindingOptions(dupBinding, binding.options);
            }
            dupBinding.setSubPage(subPage);
          }
        }
      }
    }
  }

  /**
   * Create indexed channel bindings (limited range, surface offsets)
   */
  private createIndexedChannelBindings(
    config: BindingConfig,
    subPage: MR_SubPage,
    hostAccessor: any
  ): void {
    const indexed = config.bindings.indexedChannels!;
    const endValue = this.resolveChannelRangeEnd(indexed.range, hostAccessor);

    for (let channelIndex = indexed.range.start; channelIndex < endValue; channelIndex++) {
      for (const binding of indexed.bindings) {
        const surfaceIndex = channelIndex + (binding.surfaceIndexOffset ?? 0);
        const surfaceValue = this.resolveSurfaceValue(surfaceIndex, binding.surface);
        if (!this.isSurfaceValueValid(surfaceValue)) {
          console.log(
            `Error: Invalid surface value in indexed binding at channel ${channelIndex}, surface "${binding.surface}"`
          );
          continue;
        }

        const hostValue = this.resolveHostValue(binding.hostValue!, hostAccessor, channelIndex);
        if (!this.isHostValueValid(hostValue)) {
          console.log(
            `Error: Invalid host value in indexed binding at channel ${channelIndex}, surface "${binding.surface}", host "${binding.hostValue}"`
          );
          continue;
        }

        let valueBinding = this.safeMakeValueBinding(
          surfaceValue,
          hostValue,
          `indexed channel ${channelIndex}, surface "${binding.surface}", host "${binding.hostValue}"`
        );
        if (!valueBinding) {
          continue;
        }
        if (binding.options) {
          valueBinding = this.applyBindingOptions(valueBinding, binding.options);
        }
        valueBinding.setSubPage(subPage);

        if (binding.duplicate) {
          let dupBinding = this.safeMakeValueBinding(
            surfaceValue,
            hostValue,
            `indexed duplicate channel ${channelIndex}, surface "${binding.surface}", host "${binding.hostValue}"`
          );
          if (!dupBinding) {
            continue;
          }
          if (binding.options) {
            dupBinding = this.applyBindingOptions(dupBinding, binding.options);
          }
          dupBinding.setSubPage(subPage);
        }
      }
    }
  }

  /**
   * Create bindings at specific fixed indices (e.g., "channel 4 solo button")
   */
  private createFixedIndexBindings(
    config: BindingConfig,
    subPage: MR_SubPage,
    hostAccessor: any
  ): void {
    const bindings = config.bindings.fixedIndexBindings!;

    for (const binding of bindings) {
      const surfaceValue = this.resolveSurfaceValue(binding.channelIndex, binding.surface);
      if (!this.isSurfaceValueValid(surfaceValue)) {
        console.log(
          `Error: Invalid surface value in fixed binding at channel ${binding.channelIndex}, surface "${binding.surface}"`
        );
        continue;
      }

      if (binding.command) {
        // Command binding
        this.page.makeCommandBinding(
          surfaceValue,
          binding.command.category,
          binding.command.action
        ).setSubPage(subPage);
      } else if (binding.hostValue) {
        // Value binding
        const hostValue = this.resolveHostValue(
          binding.hostValue!,
          hostAccessor,
          binding.channelIndex
        );

        if (this.isHostValueValid(hostValue)) {
          let valueBinding = this.safeMakeValueBinding(
            surfaceValue,
            hostValue,
            `fixed channel ${binding.channelIndex}, surface "${binding.surface}", host "${binding.hostValue}"`
          );
          if (!valueBinding) {
            continue;
          }
          if (binding.options) {
            valueBinding = this.applyBindingOptions(valueBinding, binding.options);
          }
          valueBinding.setSubPage(subPage);

          if (binding.duplicate) {
            let dupBinding = this.safeMakeValueBinding(
              surfaceValue,
              hostValue,
              `fixed duplicate channel ${binding.channelIndex}, surface "${binding.surface}", host "${binding.hostValue}"`
            );
            if (!dupBinding) {
              continue;
            }
            if (binding.options) {
              dupBinding = this.applyBindingOptions(dupBinding, binding.options);
            }
            dupBinding.setSubPage(subPage);
          }
        } else {
          console.log(
            `Error: Invalid host value in fixed binding at channel ${binding.channelIndex}, surface "${binding.surface}", host "${binding.hostValue}"`
          );
        }
      }
    }
  }

  /**
   * Create command bindings (non-value)
   */
  private createCommandBindings(
    config: BindingConfig,
    subPage: MR_SubPage
  ): void {
    const bindings = config.bindings.commandBindings!;

    for (const binding of bindings) {
      const surfaceValue = this.resolveSurfaceValue(0, binding.surface);
      if (!this.isSurfaceValueValid(surfaceValue)) {
        console.log(
          `Error: Invalid surface value in command binding, surface "${binding.surface}"`
        );
        continue;
      }

      this.page.makeCommandBinding(
        surfaceValue,
        binding.command.category,
        binding.command.action
      ).setSubPage(subPage);
    }
  }

  /**
   * Create fixed channel bindings
   */
  private createFixedChannelBindings(
    config: BindingConfig,
    subPage: MR_SubPage,
    hostAccessor: any
  ): void {
    const fixedBindings = config.bindings.fixedChannels!;

    for (const fixedBinding of fixedBindings) {
      const channelIndex = fixedBinding.channelIndex;

      for (const binding of fixedBinding.bindings) {
        const hostValue = this.resolveHostValue(
          binding.hostValue!,
          hostAccessor,
          channelIndex
        );

        if (this.isHostValueValid(hostValue)) {
          this.createSingleBinding(
            binding,
            channelIndex,
            hostValue,
            subPage,
            'fixed'
          );
        }
      }
    }
  }

  /**
   * Create bindings for a variable range of channels
   */
  private createVariableChannelBindings(
    config: BindingConfig,
    subPage: MR_SubPage,
    hostAccessor: any
  ): void {
    const varBinding = config.bindings.variableChannels!;
    const endValue = this.resolveChannelRangeEnd(varBinding.range, hostAccessor);

    for (
      let i = varBinding.range.start;
      i < endValue;
      i++
    ) {
      // Resolve the host value factory (e.g., getCueChannelByIndex(i))
      const hostValue = this.resolveHostValue(
        varBinding.hostValueFactory,
        hostAccessor,
        i
      );

      if (this.isHostValueValid(hostValue)) {
        for (const binding of varBinding.bindings) {
          const resolvedHostValue = this.resolveHostValue(
            binding.hostValue!,
            hostValue,
            i
          );
          if (!this.isHostValueValid(resolvedHostValue)) {
            console.log(
              `Error: Invalid host value in variable binding at channel ${i}, host "${binding.hostValue}"`
            );
            continue;
          }
          this.createSingleBinding(binding, i, resolvedHostValue, subPage, 'variable');
        }
      }
    }

    if (varBinding.dummyBindings && varBinding.dummyBindings.length > 0) {
      const dummyMax =
        varBinding.dummyRangeMax !== undefined
          ? this.resolveProperty(varBinding.dummyRangeMax, hostAccessor)
          : this.resolveProperty('device.numStrips', hostAccessor);
      this.createDummyBindings(varBinding.dummyBindings, subPage, endValue, dummyMax);
    }
  }

  /**
   * Create bindings to dummy variable for cleanup
   */
  private createDummyBindings(
    bindingPaths: string[],
    subPage: MR_SubPage,
    startChannel: number,
    endChannel: number
  ): void {
    for (let i = startChannel; i < endChannel; i++) {
      for (const path of bindingPaths) {
        const surfaceValue = this.resolveSurfaceValue(i, path);
        if (!this.isSurfaceValueValid(surfaceValue)) {
          console.log(
            `Error: Invalid surface value in dummy binding at channel ${i}, surface "${path}"`
          );
          continue;
        }
        const dummyBinding = this.safeMakeValueBinding(
          surfaceValue,
          this.dummy,
          `dummy channel ${i}, surface "${path}"`
        );
        if (dummyBinding) {
          dummyBinding.setSubPage(subPage);
        }
      }
    }
  }

  /**
   * Create dummy bindings for multiple channel ranges
   */
  private createDummyChannelRanges(
    ranges: DummyChannelRange[],
    subPage: MR_SubPage
  ): void {
    for (const range of ranges) {
      const endValue = this.resolveChannelRangeEnd(range.range);
      this.createDummyBindings(range.bindings, subPage, range.range.start, endValue);
    }
  }

  /**
   * Create a single value binding
   */
  private createSingleBinding(
    binding: PerChannelBinding,
    channelIndex: number,
    hostValue: any,
    subPage: MR_SubPage,
    _bindingType: 'per-channel' | 'fixed' | 'variable'
  ): void {
    const surfaceValue = this.resolveSurfaceValue(channelIndex, binding.surface);

    if (!surfaceValue) {
      console.log(
        `Warning: Could not resolve surface value at channel ${channelIndex}, path "${binding.surface}"`
      );
      return;
    }

    console.log(
      `Creating binding for channel ${channelIndex}: ${binding.id} (${binding.surface} -> ${binding.hostValue}), surfaceValue type: ${typeof surfaceValue}`
    );

    // Safety check: ensure we have a valid object to bind
    if (typeof surfaceValue !== 'object' || surfaceValue === null) {
      console.log(
        `Error: Invalid surface value type for channel ${channelIndex}, binding ${binding.id}: ${typeof surfaceValue}`
      );
      return;
    }

    if (!this.isHostValueValid(hostValue)) {
      console.log(
        `Error: Invalid host value for channel ${channelIndex}, binding ${binding.id}`
      );
      return;
    }

    let valueBinding = this.safeMakeValueBinding(
      surfaceValue,
      hostValue,
      `single channel ${channelIndex}, surface "${binding.surface}", host "${binding.hostValue}"`
    );
    if (!valueBinding) {
      return;
    }

    // Apply binding options
    if (binding.options) {
      valueBinding = this.applyBindingOptions(valueBinding, binding.options);
    }

    valueBinding.setSubPage(subPage);
  }

  /**
   * Apply binding options to a value binding
   */
  private applyBindingOptions(
    binding: any,
    options: BindingOptions
  ): any {
    if (options.takeOverMode === 'jump') {
      binding = binding.setValueTakeOverModeJump();
    } else if (options.takeOverMode === 'pickup') {
      binding = binding.setValueTakeOverModePickup?.();
    }

    if (options.toggle) {
      binding = binding.setTypeToggle();
    }

    return binding;
  }

  /**
   * Resolve a surface control value by path
   * e.g., "fader.mSurfaceValue" -> device.channelControls[index].fader.mSurfaceValue
   */
  private resolveSurfaceValue(channelIndex: number, path: string): any {
    const cacheKey = `${channelIndex}:${path}`;
    if (this.surfaceValueCache.has(cacheKey)) {
      return this.surfaceValueCache.get(cacheKey);
    }

    const channel = this.device.channelControls[channelIndex];
    if (!channel) {
      return null;
    }

    const parts = path.split('.');
    let current: any = channel;

    for (const part of parts) {
      if (!current) {
        return null;
      }
      current = current[part];
    }

    if (current) {
      this.surfaceValueCache.set(cacheKey, current);
    }

    return current;
  }

  /**
   * Resolve a host value by path or function call
   * Supports:
   * - Dot notation: "mMainChannel.mLevelValue"
   * - Function calls: "getCueChannelByIndex(i)" where i is substituted with channelIndex
   */
  private resolveHostValue(
    valuePath: string,
    hostAccessor: any,
    channelIndexOrArg?: number
  ): any {
    if (!hostAccessor) {
      return null;
    }

    valuePath = this.replaceIndexTokens(valuePath, channelIndexOrArg);

    // Handle function calls with optional trailing path
    // e.g., "getPhonesChannelByIndex(0).mLevelValue"
    const funcMatch = valuePath.match(/^(.+?)\(([^)]*)\)(?:\.(.+))?$/);
    if (funcMatch) {
      const [, funcPath, argStr, trailingPath] = funcMatch;
      const { value: func, parent } = this.resolvePath(hostAccessor, funcPath);

      const arg =
        argStr === 'i' || argStr === 'index'
          ? channelIndexOrArg
          : argStr === ''
            ? undefined
            : parseInt(argStr, 10);

      if (typeof func === 'function') {
        const result = func.call(parent ?? hostAccessor, arg);
        if (trailingPath) {
          return this.resolvePath(result, trailingPath).value;
        }
        return result;
      }
      return null;
    }

    // Handle dot-notation paths
    const { value, parent } = this.resolvePath(hostAccessor, valuePath);

    if (typeof value === 'function') {
      return value.call(parent ?? hostAccessor, channelIndexOrArg);
    }

    return value;
  }

  /**
   * Resolve a dotted path and return the value plus its parent object
   */
  private resolvePath(base: any, path: string): { value: any; parent: any } {
    const parts = path.split('.');

    let current: any = base;
    let parent: any = null;

    for (const part of parts) {
      if (!current) {
        return { value: null, parent: null };
      }
      parent = current;
      current = current[part];
    }

    return { value: current, parent };
  }

  /**
   * Resolve the end value of a channel range
   */
  private resolveChannelRangeEnd(range: ChannelRange, hostAccessor?: any): number {
    // If maxValue is a number, use it directly
    if (typeof range.maxValue === 'number') {
      return range.maxValue;
    }

    // Resolve dynamic property like "device.numStrips"
    const value = this.resolveProperty(range.maxValue, hostAccessor);

    // If there's an end constraint, take the minimum
    if (range.end) {
      const endValue = this.resolveProperty(range.end, hostAccessor);
      return Math.min(value, endValue);
    }

    return value;
  }

  /**
   * Resolve a dynamic property by dot notation
   * e.g., "device.numStrips" -> this.device.numStrips
   */
  private resolveProperty(propertyPath: string | number, hostAccessor?: any): number {
    if (typeof propertyPath === 'number') {
      return propertyPath;
    }

    if (propertyPath.indexOf('(') !== -1) {
      const dynamicBase = { device: this.device, page: this.page, host: hostAccessor };
      const value = this.resolveHostValue(propertyPath, dynamicBase as any, undefined);
      return typeof value === 'number' ? value : 0;
    }

    const parts = propertyPath.split('.');

    let current: any = { device: this.device, page: this.page, host: hostAccessor };

    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return 0;
      }
    }

    return typeof current === 'number' ? current : 0;
  }

  /**
   * Replace index tokens in a path: {i} -> index, {i1} -> index+1
   */
  private replaceIndexTokens(valuePath: string, index?: number): string {
    if (index === undefined || index === null) {
      return valuePath;
    }
    return valuePath
      .replace(/\{i1\}/g, String(index + 1))
      .replace(/\{i\}/g, String(index));
  }

  /**
   * Validate host value object
   */
  private isHostValueValid(hostValue: any): boolean {
    return typeof hostValue === 'object' && hostValue !== null;
  }

  /**
   * Validate surface value object
   */
  private isSurfaceValueValid(surfaceValue: any): boolean {
    return typeof surfaceValue === 'object' && surfaceValue !== null;
  }

  /**
   * Safely create a value binding with error context
   */
  private safeMakeValueBinding(surfaceValue: any, hostValue: any, context: string): any {
    try {
      return this.page.makeValueBinding(surfaceValue, hostValue);
    } catch (error) {
      console.log(`Error: makeValueBinding failed (${context}): ${String(error)}`);
      return null;
    }
  }

  /**
   * Setup the activation handler for a subpage
   */
  private setupActivationHandler(
    config: BindingConfig,
    subPage: MR_SubPage
  ): void {
    subPage.mOnActivate = (activeDevice: MR_ActiveDevice, _activeMapping: MR_ActiveMapping) => {
      // Set current page ID in global state
      this.globalBooleanVariables.currentPageId.set(activeDevice, config.id);

      // Initialize page in DisplayStateManager (but don't set as active yet)
      this.device.displayStateManager.initializePage(config.id);

      if (config.activation?.logMessage) {
        console.log(config.activation.logMessage);
      }

      // Update page settings in DisplayStateManager
      const pageSettings: any = {};
      for (const varConfig of config.activation?.globalVariables || []) {
        const variable = (this.globalBooleanVariables as any)[varConfig.name];
        if (variable) {
          if (varConfig.action === 'toggle') {
            variable.toggle(activeDevice);
          } else if (varConfig.value !== undefined) {
            variable.set(activeDevice, varConfig.value);

            // Track settings that affect display
            if (
              ['displayChannelValueName', 'displayParameterTitle', 'areDisplayRowsFlipped', 'isValueDisplayModeActive']
                .indexOf(varConfig.name) !== -1
            ) {
              pageSettings[varConfig.name] = varConfig.value;
            }
          }
        } else {
          console.log(
            `Warning: Global variable "${varConfig.name}" not found in globalBooleanVariables`
          );
        }
      }

      if (config.displayBindings) {
        pageSettings.areKnobsBound = config.displayBindings.knobsBound;
        pageSettings.areFadersBound = config.displayBindings.fadersBound;
      }

      // Apply display line configuration if present
      if (config.displayLineConfiguration) {
        pageSettings.displayLineConfiguration = config.displayLineConfiguration;
      }

      // Apply page settings to DisplayStateManager BEFORE setting as active
      // This ensures refresh happens with correct configuration
      if (Object.keys(pageSettings).length > 0) {
        this.device.displayStateManager.updatePageSettings(activeDevice, config.id, pageSettings);
      }

      // NOW activate the page, which triggers refreshAllChannels() with correct settings
      this.device.displayStateManager.setActivePage(activeDevice, config.id);

      // TODO What is this doing here?
      // if (config.activation?.lcdTextLine0) {
      //   this.device.lcdManager?.setTextLine(activeDevice, 0, config.activation.lcdTextLine0);

      //   // Restore indicators after LCD updates to ensure they persist
      //   // The setTextLine call above may have cleared the indicators, so restore them
      //   this.device.lcdManager?.restoreCurrentIndicators(activeDevice);
      // }

      // TODO What is this doing here?
      // Send MIDI output if configured
      // if (config.activation?.midiOutput?.onActivate) {
      //   for (const midi of config.activation.midiOutput.onActivate) {
      //     this.device.midiPortPair.output.sendMidi(activeDevice, [
      //       midi.status,
      //       midi.data1,
      //       midi.data2 ?? 0,
      //     ]);
      //   }
      // }

      // Complete page activation - this enables display refreshes and does final refresh
      // with all the data populated by callbacks
      this.device.displayStateManager.completePageActivation(activeDevice);
    };

    // Add deactivation handler if MIDI output is configured
    if (config.activation?.midiOutput?.onDeactivate) {
      subPage.mOnDeactivate = (activeDevice: MR_ActiveDevice, _activeMapping: MR_ActiveMapping) => {
        for (const midi of config.activation!.midiOutput!.onDeactivate!) {
          this.device.midiPortPair.output.sendMidi(activeDevice, [
            midi.status,
            midi.data1,
            midi.data2 ?? 0,
          ]);
        }
      };
    }
  }

  /**
   * Setup master button binding for subpage activation
   */
  private setupMasterButton(config: BindingConfig, subPage: MR_SubPage): void {
    const masterButtons = (this.device.master.buttons as any);
    const button = masterButtons[config.masterButton!];

    if (button) {
      this.page.makeActionBinding(button.mSurfaceValue, subPage.mAction.mActivate);
    } else {
      console.log(
        `Warning: Master button "${config.masterButton}" not found in device.master.buttons`
      );
    }
  }

  /**
   * Clear the surface value cache
   */
  clearCache(): void {
    this.surfaceValueCache.clear();
  }
}

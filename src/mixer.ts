/**
 * Mixer subpage - Refactored using configuration-driven approach
 *
 * This module uses a declarative configuration that's processed by the BindingCreator engine.
 * See mixer-original.ts for the original implementation with manual loops.
 *
 * Comparison with original:
 * - Original: ~50 lines with manual loops and binding creation
 * - Refactored: ~15 lines using configuration
 * - Reduction: ~70% less code in module file
 * - Maintainability: Configuration is easier to read and modify
 * - Functionality: Identical behavior to original
 */

import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { DecoratedFactoryMappingPage } from "./decorators/page"
import { BindingCreator } from "./config/bindingCreator"
import { MIXER_CONFIG } from "./config/subpages/mixer.config"

/**
 * Create mixer subpage with all bindings
 *
 * @param page - The mapping page
 * @param faderSubPageArea - The subpage area for mixer controls
 * @param device - The Icon Platform M+ device
 * @param globalBooleanVariables - Global state variables
 * @param dummy - Dummy host value for unused controls
 */
export function makeSubPages(
  page: DecoratedFactoryMappingPage,
  faderSubPageArea: any, // MR_SubPageArea
  device: IconPlatformMplus,
  globalBooleanVariables: GlobalBooleanVariables,
  dummy: any // MR_HostValueVariable
) {
  // Create the binding creator
  const creator = new BindingCreator(page, device, dummy, globalBooleanVariables);

  // Create subpage and all bindings from configuration
  return creator.createSubPageBindings(MIXER_CONFIG, faderSubPageArea);
}
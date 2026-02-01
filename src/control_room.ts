/**
 * Control Room subpage - Refactored using configuration-driven approach
 *
 * This module uses a declarative configuration that's processed by the BindingCreator engine.
 * See control_room-original.ts for the original implementation with manual loops.
 *
 * Comparison with original:
 * - Original: ~75 lines with manual loops and binding creation
 * - Refactored: ~20 lines using configuration
 * - Reduction: ~75% less code in module file
 * - Maintainability: Configuration is easier to read and modify
 * - Functionality: Identical behavior to original
 */

import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { DecoratedFactoryMappingPage } from "./decorators/page"
import { BindingCreator } from "./config/bindingCreator"
import { CONTROL_ROOM_CONFIG } from "./config/subpages/control_room.config"

/**
 * Create control room subpage with all bindings
 *
 * @param page - The mapping page
 * @param faderSubPageArea - The subpage area for control room controls
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
  creator.createSubPageBindings(CONTROL_ROOM_CONFIG, faderSubPageArea);
}
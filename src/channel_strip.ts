/**
 * Channel Strip subpages - Refactored with cleaner structure
 *
 * This module handles 5 effect subpages (Gate, Compressor, Tools, Saturator, Limiter).
 * The core logic is kept in code due to the specialized parameter bank zone handling,
 * but the structure is cleaned up for maintainability.
 */

import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { DecoratedFactoryMappingPage } from "./decorators/page"
import { BindingCreator } from "./config/bindingCreator"
import {
  GATE_CONFIG,
  COMPRESSOR_CONFIG,
  TOOLS_CONFIG,
  SATURATOR_CONFIG,
  LIMITER_CONFIG
} from "./config/subpages/channel_strip.config"

export function makeSubPages(
  page: DecoratedFactoryMappingPage,
  faderSubPageArea: any, // MR_SubPageArea
  device: IconPlatformMplus,
  globalBooleanVariables: GlobalBooleanVariables,
  dummy: any // MR_HostValueVariable
) {
  const creator = new BindingCreator(page, device, dummy, globalBooleanVariables)

  const subpages = {
    gate: creator.createSubPageBindings(GATE_CONFIG, faderSubPageArea),
    compressor: creator.createSubPageBindings(COMPRESSOR_CONFIG, faderSubPageArea),
    tools: creator.createSubPageBindings(TOOLS_CONFIG, faderSubPageArea),
    saturator: creator.createSubPageBindings(SATURATOR_CONFIG, faderSubPageArea),
    limiter: creator.createSubPageBindings(LIMITER_CONFIG, faderSubPageArea)
  }

  // Stream Deck controls for page switching
  page.makeActionBinding(device.master.buttons.subPageGate.mSurfaceValue, subpages.gate.mAction.mActivate)
  page.makeActionBinding(device.master.buttons.subPageCompressor.mSurfaceValue, subpages.compressor.mAction.mActivate)
  page.makeActionBinding(device.master.buttons.subPageTools.mSurfaceValue, subpages.tools.mAction.mActivate)
  page.makeActionBinding(device.master.buttons.subPageSaturator.mSurfaceValue, subpages.saturator.mAction.mActivate)
  page.makeActionBinding(device.master.buttons.subPageLimiter.mSurfaceValue, subpages.limiter.mAction.mActivate)
}

/**
 * Selected Track subpages - Refactored with config structure
 *
 * This module handles 4 complex subpages for selected track editing:
 * - SendsQC: Sends and quick controls on faders
 * - EQ: 4-band EQ with dual controls per band
 * - CueSends: Cue mix sends (variable range)
 * - PreFilter: Input filter settings
 *
 * Configuration-driven structure with custom bindings kept in code.
 */

import { IconPlatformMplus } from "./icon_elements"
import { GlobalBooleanVariables } from "./midi/binding"
import { DecoratedFactoryMappingPage } from "./decorators/page"
import { BindingCreator } from "./config/bindingCreator"
import {
  SENDS_QC_CONFIG,
  EQ_CONFIG,
  CUE_SENDS_CONFIG,
  PRE_FILTER_CONFIG
} from "./config/subpages/selected_track.config"

export function makeSubPages(
  page: DecoratedFactoryMappingPage,
  faderSubPageArea: any, // MR_SubPageArea
  device: IconPlatformMplus,
  globalBooleanVariables: GlobalBooleanVariables,
  dummy: any // MR_HostValueVariable
) {
  const creator = new BindingCreator(page, device, dummy, globalBooleanVariables)

  // Create the 4 subpages via config
  const subpages = {
    sendsQC: creator.createSubPageBindings(SENDS_QC_CONFIG, faderSubPageArea),
    eq: creator.createSubPageBindings(EQ_CONFIG, faderSubPageArea),
    cueSends: creator.createSubPageBindings(CUE_SENDS_CONFIG, faderSubPageArea),
    preFilter: creator.createSubPageBindings(PRE_FILTER_CONFIG, faderSubPageArea)
  }

  // Stream Deck controls
  page.makeActionBinding(device.master.buttons.subPageEQ.mSurfaceValue, subpages.eq.mAction.mActivate)
  page.makeActionBinding(device.master.buttons.subPageSendsQC.mSurfaceValue, subpages.sendsQC.mAction.mActivate)
  page.makeActionBinding(device.master.buttons.subPagePreFilter.mSurfaceValue, subpages.preFilter.mAction.mActivate)
  page.makeActionBinding(device.master.buttons.subPageCueSends.mSurfaceValue, subpages.cueSends.mAction.mActivate)

  // Return array of subpages for shift page bindings
  return [subpages.sendsQC, subpages.eq, subpages.preFilter, subpages.cueSends];
}

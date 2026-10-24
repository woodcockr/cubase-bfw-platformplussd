import { defaultJogOptions } from "./midi/JogController";

export const jogOptions = {
  ...defaultJogOptions,
  diagnostics: true,
  traceValues: false,
};

// {title: "Expression", cc: 11}
export const midi_cc = [
  {title: "CC16", cc: 16},
  {title: "CC17", cc: 17},
  {title: "CC18", cc: 18},
  {title: "CC19", cc: 19},
  {title: "CC20", cc: 20},
  {title: "CC1", cc: 1},
  {title: "CC11", cc: 11},
  {title: "CC2", cc: 2},
]
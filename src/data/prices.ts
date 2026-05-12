export type StaticPrice = {
  symbol: string;
  name: string;
  open: number;
  close: number;
  variation: number;
};

export const STATIC_PRICES: StaticPrice[] = [
  { symbol: 'CFAC', name: "CFAO MOTORS COTE D'IVOIRE", open: 1695, close: 1795, variation: 5.9 },
  { symbol: 'TTLS', name: 'TOTAL SENEGAL', open: 3100, close: 3265, variation: 5.32 },
  { symbol: 'TTLC', name: "TOTAL COTE D'IVOIRE", open: 2810, close: 2950, variation: 4.98 },
  { symbol: 'BOABF', name: 'BANK OF AFRICA BURKINA FASO', open: 5200, close: 5395, variation: 3.75 },
  { symbol: 'SCRC', name: "SUCRIVOIRE COTE D'IVOIRE", open: 1490, close: 1540, variation: 3.36 },
  { symbol: 'SAFC', name: "SAFCA - ALIOS FINANCE - COTE D'IVOIRE", open: 6000, close: 6195, variation: 3.25 },
  { symbol: 'SIVC', name: "ERIUM CI _ ex AIR LIQUIDE COTE D'IVOIRE", open: 2620, close: 2675, variation: 2.1 },
  { symbol: 'ECOC', name: "ECOBANK COTE D'IVOIRE", open: 16600, close: 16905, variation: 1.84 },
  { symbol: 'NSBC', name: "NSIA BANQUE COTE D'IVOIRE", open: 13900, close: 14150, variation: 1.8 },
  { symbol: 'CBIBF', name: 'CORIS BANK INTERNATIONAL BURKINA FASO', open: 13500, close: 13700, variation: 1.48 },
  { symbol: 'ABJC', name: "SERVAIR ABIDJAN COTE D'IVOIRE", open: 3450, close: 3490, variation: 1.16 },
  { symbol: 'STBC', name: "SITAB COTE D'IVOIRE", open: 21800, close: 21985, variation: 0.85 },
  { symbol: 'SGBC', name: "SGB COTE D'IVOIRE", open: 35300, close: 35500, variation: 0.57 },
  { symbol: 'BOAM', name: 'BANK OF AFRICA MALI', open: 4750, close: 4760, variation: 0.21 },
  { symbol: 'NTLC', name: "NESTLE COTE D'IVOIRE", open: 12900, close: 12890, variation: -0.08 },
  { symbol: 'BICB', name: "BANQUE INTERNATIONALE POUR L'INDUSTRIE ET LE COMMERCE DU BENIN", open: 5215, close: 5200, variation: -0.29 },
  { symbol: 'NEIC', name: "NEI-CEDA COTE D'IVOIRE", open: 1415, close: 1410, variation: -0.35 },
  { symbol: 'BOAB', name: 'BANK OF AFRICA BENIN', open: 7895, close: 7850, variation: -0.57 },
  { symbol: 'SMBC', name: "SMB COTE D'IVOIRE", open: 13380, close: 13300, variation: -0.6 },
  { symbol: 'CABC', name: "SICABLE COTE D'IVOIRE", open: 3300, close: 3280, variation: -0.61 },
  { symbol: 'SNTS', name: 'SONATEL SENEGAL', open: 29000, close: 28800, variation: -0.69 },
  { symbol: 'SLBC', name: "SOLIBRA COTE D'IVOIRE", open: 39500, close: 39200, variation: -0.76 },
  { symbol: 'SEMC', name: "CROWN SIEM COTE D'IVOIRE", open: 2000, close: 1980, variation: -1.0 },
  { symbol: 'CIEC', name: "CIE COTE D'IVOIRE", open: 3340, close: 3300, variation: -1.2 },
  { symbol: 'SDCC', name: "SODE COTE D'IVOIRE", open: 7800, close: 7700, variation: -1.28 },
  { symbol: 'SIBC', name: "SOCIETE IVOIRIENNE DE BANQUE COTE D'IVOIRE", open: 7145, close: 7050, variation: -1.33 },
  { symbol: 'BOAS', name: 'BANK OF AFRICA SENEGAL', open: 7000, close: 6900, variation: -1.43 },
  { symbol: 'PALC', name: "PALM COTE D'IVOIRE", open: 9500, close: 9350, variation: -1.58 },
  { symbol: 'LNBB', name: 'LOTERIE NATIONALE DU BENIN', open: 3945, close: 3850, variation: -2.41 },
  { symbol: 'ONTBF', name: 'ONATEL BURKINA FASO', open: 3095, close: 3000, variation: -3.07 },
  { symbol: 'BOAC', name: "BANK OF AFRICA COTE D'IVOIRE", open: 9000, close: 8700, variation: -3.33 },
  { symbol: 'SOGC', name: "SOGB COTE D'IVOIRE", open: 9000, close: 8700, variation: -3.33 },
  { symbol: 'FTSC', name: "FILTISAC COTE D'IVOIRE", open: 2420, close: 2320, variation: -4.13 },
  { symbol: 'ORAC', name: "ORANGE COTE D'IVOIRE", open: 15205, close: 14550, variation: -4.31 },
  { symbol: 'BICC', name: "BICI COTE D'IVOIRE", open: 26950, close: 25555, variation: -5.18 },
  { symbol: 'SICC', name: "SICOR COTE D'IVOIRE", open: 4095, close: 3850, variation: -5.98 },
  { symbol: 'STAC', name: "SETAO COTE D'IVOIRE", open: 2525, close: 2355, variation: -6.73 },
  { symbol: 'SPHC', name: "SAPH COTE D'IVOIRE", open: 8425, close: 7725, variation: -8.31 },
  { symbol: 'PRSC', name: "TRACTAFRIC MOTORS COTE D'IVOIRE", open: 5200, close: 4700, variation: -9.62 },
  { symbol: 'BOAN', name: 'BANK OF AFRICA NIGER', open: 2950, close: 2535, variation: -14.07 },
  { symbol: 'SDSC', name: "AFRICA GLOBAL LOGISTICS CI _ ex BOLLORE CI", open: 1990, close: 1700, variation: -14.57 },
  { symbol: 'UNLC', name: "UNILEVER COTE D'IVOIRE", open: 70000, close: 59000, variation: -15.71 },
  { symbol: 'ORGT', name: 'ORAGROUP TOGO', open: 3995, close: 3365, variation: -15.77 },
];

export const STATIC_PRICES_BY_SYMBOL = STATIC_PRICES.reduce<Record<string, StaticPrice>>(
  (acc, item) => {
    acc[item.symbol] = item;
    return acc;
  },
  {},
);

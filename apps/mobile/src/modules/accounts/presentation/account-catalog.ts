// BCV SCCE participant list (May 2025); excludes the central bank and municipal credit institute.
export const NATIONAL_ACCOUNTS = [
  { code: '0102', name: 'Banco de Venezuela' },
  { code: '0104', name: 'Banco Venezolano de Crédito' },
  { code: '0105', name: 'Banco Mercantil' },
  { code: '0108', name: 'BBVA Provincial' },
  { code: '0114', name: 'Bancaribe' },
  { code: '0115', name: 'Banco Exterior' },
  { code: '0128', name: 'Banco Caroní' },
  { code: '0134', name: 'Banesco' },
  { code: '0137', name: 'Banco Sofitasa' },
  { code: '0138', name: 'Banco Plaza' },
  { code: '0146', name: 'Bangente' },
  { code: '0151', name: 'BFC Banco Fondo Común' },
  { code: '0156', name: '100% Banco' },
  { code: '0157', name: 'DelSur' },
  { code: '0163', name: 'Banco del Tesoro' },
  { code: '0166', name: 'Banco Agrícola de Venezuela' },
  { code: '0168', name: 'Bancrecer' },
  { code: '0169', name: 'R4 Banco Microfinanciero' },
  { code: '0171', name: 'Banco Activo' },
  { code: '0172', name: 'Bancamiga' },
  { code: '0173', name: 'Banco Internacional de Desarrollo' },
  { code: '0174', name: 'Banplus' },
  { code: '0175', name: 'Banco Digital de los Trabajadores' },
  { code: '0177', name: 'BANFANB' },
  { code: '0178', name: 'N58 Banco Digital' },
  { code: '0191', name: 'Banco Nacional de Crédito' },
] as const;

export const INTERNATIONAL_ACCOUNTS = [
  'airTM', 'Bank Of America', 'Binance', 'Facebank', 'Kontigo', 'Meru',
  'OKX', 'paypal', 'Revolut', 'Wally', 'Wise', 'Zinli', 'Bybit',
] as const;

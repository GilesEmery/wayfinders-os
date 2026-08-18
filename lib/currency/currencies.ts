export interface CurrencyDefinition { code: string; name: string; symbol?: string; countries: string[]; searchAliases?: string[]; fractionDigits: number }

const fractionDigits = (code: string) => { try { return new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2; } catch { return 2; } };
const currency = (code: string, name: string, symbol: string, countries: string[], searchAliases: string[] = []): CurrencyDefinition => ({ code, name, symbol, countries, searchAliases, fractionDigits: fractionDigits(code) });

export const currencies: CurrencyDefinition[] = [
  currency("USD","United States Dollar","$",["United States","Ecuador","El Salvador","Panama","Puerto Rico","Timor-Leste"]),
  currency("CAD","Canadian Dollar","$",["Canada"]), currency("EUR","Euro","€",["Eurozone","Austria","Belgium","Croatia","Cyprus","Estonia","Finland","France","Germany","Greece","Ireland","Italy","Latvia","Lithuania","Luxembourg","Malta","Netherlands","Portugal","Slovakia","Slovenia","Spain"],["European Union"]),
  currency("GBP","British Pound Sterling","£",["United Kingdom","England","Scotland","Wales","Northern Ireland"],["pound"]), currency("CHF","Swiss Franc","CHF",["Switzerland","Liechtenstein"]),
  currency("SEK","Swedish Krona","kr",["Sweden"]), currency("NOK","Norwegian Krone","kr",["Norway"]), currency("DKK","Danish Krone","kr",["Denmark"]), currency("ISK","Icelandic Krona","kr",["Iceland"]),
  currency("PLN","Polish Zloty","zł",["Poland"]), currency("CZK","Czech Koruna","Kč",["Czech Republic","Czechia"]), currency("HUF","Hungarian Forint","Ft",["Hungary"]), currency("RON","Romanian Leu","lei",["Romania"]),
  currency("BGN","Bulgarian Lev","лв",["Bulgaria"]), currency("RSD","Serbian Dinar","дин",["Serbia"]), currency("UAH","Ukrainian Hryvnia","₴",["Ukraine"]), currency("MDL","Moldovan Leu","L",["Moldova"]),
  currency("ALL","Albanian Lek","L",["Albania"]), currency("MKD","Macedonian Denar","ден",["North Macedonia","Macedonia"]), currency("BAM","Bosnia and Herzegovina Convertible Mark","KM",["Bosnia and Herzegovina"]),
  currency("GEL","Georgian Lari","₾",["Georgia"]), currency("AMD","Armenian Dram","֏",["Armenia"]), currency("AZN","Azerbaijani Manat","₼",["Azerbaijan"]), currency("RUB","Russian Ruble","₽",["Russia"]),
  currency("KES","Kenyan Shilling","KSh",["Kenya"]), currency("UGX","Ugandan Shilling","USh",["Uganda"]), currency("TZS","Tanzanian Shilling","TSh",["Tanzania"]), currency("RWF","Rwandan Franc","FRw",["Rwanda"]),
  currency("ETB","Ethiopian Birr","Br",["Ethiopia"]), currency("NGN","Nigerian Naira","₦",["Nigeria"]), currency("GHS","Ghanaian Cedi","GH₵",["Ghana"]), currency("ZAR","South African Rand","R",["South Africa"]),
  currency("BWP","Botswana Pula","P",["Botswana"]), currency("ZMW","Zambian Kwacha","ZK",["Zambia"]), currency("MWK","Malawian Kwacha","MK",["Malawi"]), currency("MZN","Mozambican Metical","MT",["Mozambique"]),
  currency("AOA","Angolan Kwanza","Kz",["Angola"]), currency("MAD","Moroccan Dirham","MAD",["Morocco","Western Sahara"]), currency("EGP","Egyptian Pound","E£",["Egypt"]), currency("DZD","Algerian Dinar","DA",["Algeria"]),
  currency("TND","Tunisian Dinar","DT",["Tunisia"]), currency("SOS","Somali Shilling","Sh",["Somalia"]), currency("SDG","Sudanese Pound","SDG",["Sudan"]), currency("SSP","South Sudanese Pound","SS£",["South Sudan"]),
  currency("CDF","Congolese Franc","FC",["Democratic Republic of the Congo","Congo"]), currency("XAF","Central African CFA Franc","FCFA",["Cameroon","Central African Republic","Chad","Republic of the Congo","Equatorial Guinea","Gabon"]),
  currency("XOF","West African CFA Franc","CFA",["Benin","Burkina Faso","Côte d’Ivoire","Ivory Coast","Guinea-Bissau","Mali","Niger","Senegal","Togo"]), currency("MUR","Mauritian Rupee","₨",["Mauritius"]), currency("SCR","Seychellois Rupee","₨",["Seychelles"]),
  currency("SZL","Swazi Lilangeni","L",["Eswatini","Swaziland"]), currency("LSL","Lesotho Loti","L",["Lesotho"]), currency("NAD","Namibian Dollar","$",["Namibia"]), currency("GMD","Gambian Dalasi","D",["Gambia"]),
  currency("GNF","Guinean Franc","FG",["Guinea"]), currency("SLL","Sierra Leonean Leone","Le",["Sierra Leone"]), currency("LRD","Liberian Dollar","$",["Liberia"]), currency("CVE","Cape Verdean Escudo","$",["Cape Verde"]),
  currency("JPY","Japanese Yen","¥",["Japan"]), currency("CNY","Chinese Yuan / Renminbi","¥",["China"],["yuan","renminbi"]), currency("HKD","Hong Kong Dollar","HK$",["Hong Kong"]), currency("SGD","Singapore Dollar","S$",["Singapore"]),
  currency("KRW","South Korean Won","₩",["South Korea","Korea"]), currency("TWD","New Taiwan Dollar","NT$",["Taiwan"]), currency("THB","Thai Baht","฿",["Thailand"]), currency("MYR","Malaysian Ringgit","RM",["Malaysia"]),
  currency("IDR","Indonesian Rupiah","Rp",["Indonesia"]), currency("PHP","Philippine Peso","₱",["Philippines"]), currency("VND","Vietnamese Dong","₫",["Vietnam"]), currency("INR","Indian Rupee","₹",["India"]),
  currency("PKR","Pakistani Rupee","₨",["Pakistan"]), currency("BDT","Bangladeshi Taka","৳",["Bangladesh"]), currency("LKR","Sri Lankan Rupee","₨",["Sri Lanka"]), currency("NPR","Nepalese Rupee","₨",["Nepal"]),
  currency("MMK","Myanmar Kyat","K",["Myanmar","Burma"]), currency("KHR","Cambodian Riel","៛",["Cambodia"]), currency("LAK","Lao Kip","₭",["Laos"]), currency("BND","Brunei Dollar","B$",["Brunei"]),
  currency("MNT","Mongolian Tugrik","₮",["Mongolia"]), currency("KZT","Kazakhstani Tenge","₸",["Kazakhstan"]), currency("UZS","Uzbekistani Som","soʻm",["Uzbekistan"]), currency("KGS","Kyrgyzstani Som","сом",["Kyrgyzstan"]),
  currency("TJS","Tajikistani Somoni","ЅМ",["Tajikistan"],["som"]), currency("AFN","Afghan Afghani","؋",["Afghanistan"]), currency("BTN","Bhutanese Ngultrum","Nu",["Bhutan"]), currency("MVR","Maldivian Rufiyaa","Rf",["Maldives"]),
  currency("AED","UAE Dirham","د.إ",["United Arab Emirates","UAE"]), currency("SAR","Saudi Riyal","﷼",["Saudi Arabia"]), currency("QAR","Qatari Riyal","﷼",["Qatar"]), currency("KWD","Kuwaiti Dinar","KD",["Kuwait"]),
  currency("BHD","Bahraini Dinar","BD",["Bahrain"]), currency("OMR","Omani Rial","ر.ع.",["Oman"]), currency("JOD","Jordanian Dinar","JD",["Jordan"]), currency("ILS","Israeli New Shekel","₪",["Israel","Palestine"]),
  currency("TRY","Turkish Lira","₺",["Turkey","Türkiye"]), currency("IQD","Iraqi Dinar","ع.د",["Iraq"]), currency("IRR","Iranian Rial","﷼",["Iran"]), currency("LBP","Lebanese Pound","ل.ل",["Lebanon"]), currency("YER","Yemeni Rial","﷼",["Yemen"]),
  currency("BRL","Brazilian Real","R$",["Brazil"]), currency("MXN","Mexican Peso","$",["Mexico"]), currency("ARS","Argentine Peso","$",["Argentina"]), currency("CLP","Chilean Peso","$",["Chile"]),
  currency("COP","Colombian Peso","$",["Colombia"]), currency("PEN","Peruvian Sol","S/",["Peru"]), currency("UYU","Uruguayan Peso","$U",["Uruguay"]), currency("PYG","Paraguayan Guarani","₲",["Paraguay"]),
  currency("BOB","Bolivian Boliviano","Bs",["Bolivia"]), currency("CRC","Costa Rican Colon","₡",["Costa Rica"]), currency("GTQ","Guatemalan Quetzal","Q",["Guatemala"]), currency("HNL","Honduran Lempira","L",["Honduras"]),
  currency("NIO","Nicaraguan Cordoba","C$",["Nicaragua"]), currency("PAB","Panamanian Balboa","B/.",["Panama"]), currency("DOP","Dominican Peso","RD$",["Dominican Republic"]), currency("JMD","Jamaican Dollar","J$",["Jamaica"]),
  currency("TTD","Trinidad and Tobago Dollar","TT$",["Trinidad and Tobago"]), currency("BBD","Barbadian Dollar","Bds$",["Barbados"]), currency("BSD","Bahamian Dollar","B$",["Bahamas"]), currency("BZD","Belize Dollar","BZ$",["Belize"]),
  currency("GYD","Guyanese Dollar","G$",["Guyana"]), currency("SRD","Surinamese Dollar","$",["Suriname"]), currency("HTG","Haitian Gourde","G",["Haiti"]), currency("CUP","Cuban Peso","$",["Cuba"]),
  currency("AUD","Australian Dollar","A$",["Australia","Christmas Island","Cocos Islands","Kiribati","Nauru","Tuvalu"]), currency("NZD","New Zealand Dollar","NZ$",["New Zealand","Cook Islands","Niue","Pitcairn","Tokelau"]),
  currency("FJD","Fijian Dollar","FJ$",["Fiji"]), currency("PGK","Papua New Guinean Kina","K",["Papua New Guinea"]), currency("WST","Samoan Tala","T",["Samoa"]), currency("TOP","Tongan Paʻanga","T$",["Tonga"]),
  currency("SBD","Solomon Islands Dollar","SI$",["Solomon Islands"]), currency("VUV","Vanuatu Vatu","VT",["Vanuatu"]), currency("XPF","CFP Franc","₣",["French Polynesia","New Caledonia","Wallis and Futuna"]),
].sort((a,b) => a.code.localeCompare(b.code));

export const currencyByCode = new Map(currencies.map((item) => [item.code, item]));
export const commonCurrencyCodes = ["USD","EUR","GBP","CAD","AUD"];

export function searchCurrencies(query: string) {
  const term = query.trim().toLocaleLowerCase(); if (!term) return currencies;
  const score = (item: CurrencyDefinition) => {
    const code = item.code.toLocaleLowerCase(); const name = item.name.toLocaleLowerCase(); const countries = item.countries.map((value) => value.toLocaleLowerCase()); const aliases = (item.searchAliases ?? []).map((value) => value.toLocaleLowerCase());
    if (code === term) return 100; if (countries.some((value) => value === term)) return 95; if (name === term) return 90;
    if (code.startsWith(term)) return 85; if (countries.some((value) => value.startsWith(term))) return 80; if (name.startsWith(term)) return 75;
    if (aliases.some((value) => value.startsWith(term))) return 70; if (countries.some((value) => value.includes(term))) return 65; if (name.includes(term)) return 60;
    if (aliases.some((value) => value.includes(term))) return 55; if (item.symbol?.toLocaleLowerCase() === term) return 50; return 0;
  };
  return currencies.map((item) => ({ item, score: score(item) })).filter((entry) => entry.score > 0).sort((a,b) => b.score-a.score || a.item.code.localeCompare(b.item.code)).map((entry) => entry.item);
}

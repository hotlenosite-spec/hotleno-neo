export type CountryInfo = {
  code: string;
  nameEn: string;
  nameAr: string;
  nationalityEn: string;
  nationalityAr: string;
  phoneCode: string;
};

export const countries: CountryInfo[] = [
  { code: "SA", nameEn: "Saudi Arabia", nameAr: "السعودية", nationalityEn: "Saudi", nationalityAr: "سعودي", phoneCode: "+966" },
  { code: "US", nameEn: "United States", nameAr: "الولايات المتحدة", nationalityEn: "American", nationalityAr: "أمريكي", phoneCode: "+1" },
  { code: "GB", nameEn: "United Kingdom", nameAr: "المملكة المتحدة", nationalityEn: "British", nationalityAr: "بريطاني", phoneCode: "+44" },
  { code: "AE", nameEn: "United Arab Emirates", nameAr: "الإمارات", nationalityEn: "Emirati", nationalityAr: "إماراتي", phoneCode: "+971" },
  { code: "KW", nameEn: "Kuwait", nameAr: "الكويت", nationalityEn: "Kuwaiti", nationalityAr: "كويتي", phoneCode: "+965" },
  { code: "QA", nameEn: "Qatar", nameAr: "قطر", nationalityEn: "Qatari", nationalityAr: "قطري", phoneCode: "+974" },
  { code: "BH", nameEn: "Bahrain", nameAr: "البحرين", nationalityEn: "Bahraini", nationalityAr: "بحريني", phoneCode: "+973" },
  { code: "OM", nameEn: "Oman", nameAr: "عمان", nationalityEn: "Omani", nationalityAr: "عماني", phoneCode: "+968" },
  { code: "EG", nameEn: "Egypt", nameAr: "مصر", nationalityEn: "Egyptian", nationalityAr: "مصري", phoneCode: "+20" },
  { code: "JO", nameEn: "Jordan", nameAr: "الأردن", nationalityEn: "Jordanian", nationalityAr: "أردني", phoneCode: "+962" },
  { code: "LB", nameEn: "Lebanon", nameAr: "لبنان", nationalityEn: "Lebanese", nationalityAr: "لبناني", phoneCode: "+961" },
  { code: "SY", nameEn: "Syria", nameAr: "سوريا", nationalityEn: "Syrian", nationalityAr: "سوري", phoneCode: "+963" },
  { code: "IQ", nameEn: "Iraq", nameAr: "العراق", nationalityEn: "Iraqi", nationalityAr: "عراقي", phoneCode: "+964" },
  { code: "YE", nameEn: "Yemen", nameAr: "اليمن", nationalityEn: "Yemeni", nationalityAr: "يمني", phoneCode: "+967" },
  { code: "MA", nameEn: "Morocco", nameAr: "المغرب", nationalityEn: "Moroccan", nationalityAr: "مغربي", phoneCode: "+212" },
  { code: "TN", nameEn: "Tunisia", nameAr: "تونس", nationalityEn: "Tunisian", nationalityAr: "تونسي", phoneCode: "+216" },
  { code: "DZ", nameEn: "Algeria", nameAr: "الجزائر", nationalityEn: "Algerian", nationalityAr: "جزائري", phoneCode: "+213" },
  { code: "TR", nameEn: "Turkey", nameAr: "تركيا", nationalityEn: "Turkish", nationalityAr: "تركي", phoneCode: "+90" },
  { code: "IN", nameEn: "India", nameAr: "الهند", nationalityEn: "Indian", nationalityAr: "هندي", phoneCode: "+91" },
  { code: "PK", nameEn: "Pakistan", nameAr: "باكستان", nationalityEn: "Pakistani", nationalityAr: "باكستاني", phoneCode: "+92" },
  { code: "ID", nameEn: "Indonesia", nameAr: "إندونيسيا", nationalityEn: "Indonesian", nationalityAr: "إندونيسي", phoneCode: "+62" },
  { code: "MY", nameEn: "Malaysia", nameAr: "ماليزيا", nationalityEn: "Malaysian", nationalityAr: "ماليزي", phoneCode: "+60" },
  { code: "CN", nameEn: "China", nameAr: "الصين", nationalityEn: "Chinese", nationalityAr: "صيني", phoneCode: "+86" },
  { code: "JP", nameEn: "Japan", nameAr: "اليابان", nationalityEn: "Japanese", nationalityAr: "ياباني", phoneCode: "+81" },
  { code: "KR", nameEn: "South Korea", nameAr: "كوريا الجنوبية", nationalityEn: "Korean", nationalityAr: "كوري", phoneCode: "+82" },
  { code: "FR", nameEn: "France", nameAr: "فرنسا", nationalityEn: "French", nationalityAr: "فرنسي", phoneCode: "+33" },
  { code: "DE", nameEn: "Germany", nameAr: "ألمانيا", nationalityEn: "German", nationalityAr: "ألماني", phoneCode: "+49" },
  { code: "IT", nameEn: "Italy", nameAr: "إيطاليا", nationalityEn: "Italian", nationalityAr: "إيطالي", phoneCode: "+39" },
  { code: "ES", nameEn: "Spain", nameAr: "إسبانيا", nationalityEn: "Spanish", nationalityAr: "إسباني", phoneCode: "+34" },
  { code: "CA", nameEn: "Canada", nameAr: "كندا", nationalityEn: "Canadian", nationalityAr: "كندي", phoneCode: "+1" },
  { code: "AU", nameEn: "Australia", nameAr: "أستراليا", nationalityEn: "Australian", nationalityAr: "أسترالي", phoneCode: "+61" },
  { code: "RU", nameEn: "Russia", nameAr: "روسيا", nationalityEn: "Russian", nationalityAr: "روسي", phoneCode: "+7" },
  { code: "BR", nameEn: "Brazil", nameAr: "البرازيل", nationalityEn: "Brazilian", nationalityAr: "برازيلي", phoneCode: "+55" },
  { code: "ZA", nameEn: "South Africa", nameAr: "جنوب أفريقيا", nationalityEn: "South African", nationalityAr: "جنوب أفريقي", phoneCode: "+27" },
];

export function getCountryByCode(code: string | null | undefined) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  return countries.find((country) => country.code === normalizedCode);
}

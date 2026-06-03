import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const ROOT = process.cwd();

const CHECKS = [
  {
    key: "countries",
    label: "countries",
    file: "lib/suppliers/hotelbeds-activities-client.ts",
    patterns: ["getContentCountries"],
  },
  {
    key: "destinations",
    label: "destinations",
    file: "lib/suppliers/hotelbeds-activities-client.ts",
    patterns: ["getContentDestinations", "searchDestinations"],
  },
  {
    key: "portfolio",
    label: "activities/content portfolio",
    file: "lib/suppliers/hotelbeds-activities-client.ts",
    patterns: ["portfolio", "factsheet", "content activity"],
    required: false,
  },
  {
    key: "activityCodes",
    label: "activity codes",
    file: "lib/suppliers/hotelbeds-activities-client.ts",
    patterns: ["activityCode"],
  },
  {
    key: "names",
    label: "names",
    file: "lib/suppliers/hotelbeds-activities-client.ts",
    patterns: ["content.name", "getLocalizedText(item.name)"],
  },
  {
    key: "descriptions",
    label: "descriptions",
    file: "lib/suppliers/hotelbeds-activities-client.ts",
    patterns: ["description"],
  },
  {
    key: "images",
    label: "images",
    file: "lib/suppliers/hotelbeds-activities-client.ts",
    patterns: ["findActivityImageUrl", "content.media"],
  },
  {
    key: "modalities",
    label: "modalities",
    file: "lib/suppliers/hotelbeds-activities-client.ts",
    patterns: ["modalities", "mapModalities"],
  },
  {
    key: "languages",
    label: "languages",
    file: "lib/suppliers/hotelbeds-activities-client.ts",
    patterns: ["getLanguages", "languages"],
  },
  {
    key: "cancellationPolicies",
    label: "cancellation policies",
    file: "lib/suppliers/hotelbeds-activities-client.ts",
    patterns: ["getCancellationPolicies"],
  },
  {
    key: "destinationMapping",
    label: "destination mapping",
    file: "lib/suppliers/hotelbeds-activities-client.ts",
    patterns: ["mapDestinationSuggestion"],
  },
];

function read(file) {
  const full = path.join(ROOT, file);
  return existsSync(full) ? readFileSync(full, "utf8") : "";
}

function main() {
  const results = CHECKS.map((check) => {
    const text = read(check.file);
    const passed = check.patterns.some((pattern) =>
      text.toLowerCase().includes(pattern.toLowerCase()),
    );
    return {
      key: check.key,
      label: check.label,
      ready: passed,
      required: check.required !== false,
    };
  });

  const required = results.filter((item) => item.required);
  const readyRequired = required.filter((item) => item.ready).length;
  const score = Math.round((readyRequired / required.length) * 100);
  const near90 = score >= 90 && results.find((item) => item.key === "portfolio")?.ready;

  const missing = results.filter((item) => !item.ready).map((item) => item.label);

  const report = `# تقرير جاهزية Mapping لـ Hotelbeds Activities

تاريخ الفحص: ${new Date().toISOString()}

## النتيجة

- نسبة الجاهزية المحلية: ${score}%
- قريب من تغطية 90%: ${near90 ? "نعم" : "لا"}
- الحالة: ${near90 ? "جاهز مبدئيًا" : "غير جاهز بعد لتغطية 90%"}

## العناصر المفحوصة

${results.map((item) => `- ${item.ready ? "نعم" : "لا"}: ${item.label}`).join("\n")}

## النواقص

${missing.length ? missing.map((item) => `- ${item}`).join("\n") : "- لا توجد نواقص محلية واضحة."}

## ملاحظة

هذا الفحص يراجع البنية المحلية فقط ولا يستدعي Hotelbeds API. الوصول إلى تغطية 90% يتطلب مزامنة portfolio/content حقيقية وتخزين cache دوري حسب الوجهات.
`;

  const reportPath = path.join(ROOT, "docs", "hotelbeds-activities-mapping-readiness-report-ar.md");
  writeFileSync(reportPath, report, "utf8");

  console.log(
    JSON.stringify(
      {
        success: true,
        score,
        near90,
        missing,
        report: path.relative(ROOT, reportPath),
      },
      null,
      2,
    ),
  );
}

main();

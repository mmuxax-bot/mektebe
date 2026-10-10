// POST /api/translate  { text, from?, to, ui?, parallel?, debug? }  |  { texts: [...≤20], to }   (GET: xidmət məlumatı)
// Nibras Tərcümə: əvvəl hazır insan tərcümələri (api/_translate = /workspace/translate-core vendor nüsxəsi), hədəf dildə yoxdursa maşın tərcüməsi
// (api/_translate-ensemble.js: saytın artıq qoşulmuş AI provayderlərinin konsensusu). Sənəd: api/_translate/README.md
import handler from "./_translate/http.js";
import "./_translate-ensemble.js"; // mühərriki qeydiyyata alır
import "./_translate-health.js"; // POST {"health":true}: provayder sağlamlıq diaqnostikası

export const config = { maxDuration: 45 };
export default handler;

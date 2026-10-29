/**
 * /services/comparison.js
 * Processes the universal 'extracted_results' array, 'report_metadata', and 'ml_insights'
 * into "Needs Attention" (High ⬆️ / Low ⬇️) and "All Good" (Normal ✅) sections,
 * grouped by clinical category, plus bilingual (English & Telugu) spoken summaries and WhatsApp messages.
 */

import { computeMLDatasetRecommendations } from './mlDatasetEngine.js';

/**
 * @param {any} rawReport
 */
export function buildReportAnalysis(rawReport) {
  const extractedResults = Array.isArray(rawReport.extracted_results)
    ? rawReport.extracted_results
    : [];

  const meta = rawReport.report_metadata || {
    lab_name: null,
    lab_id: null,
    patient_name: rawReport.patientName || null,
    age_gender: null,
    referring_physician: null,
    sample_collected: null,
    report_date: rawReport.reportDate || null,
    barcode_no: null,
    fasting_status: null,
    authorized_signatory: null,
  };

  const formattedResults = extractedResults.map((item) => {
    const normalizedStatus =
      item.status === 'High' || item.status === 'Low' ? item.status : 'Normal';
    const arrow =
      normalizedStatus === 'High'
        ? '⬆️'
        : normalizedStatus === 'Low'
        ? '⬇️'
        : '✅';

    return {
      category: item.category || 'General Blood Panel',
      category_te: item.category_te || item.category || 'రక్త పరీక్షల విభాగం',
      test_name: item.test_name || 'Blood Test',
      test_name_te: item.test_name_te || item.test_name || 'రక్త పరీక్ష',
      value: String(item.value ?? ''),
      unit: item.unit || '',
      reference_range: item.reference_range || '',
      status: normalizedStatus,
      arrow,
      explanation_en:
        item.explanation_en ||
        (normalizedStatus === 'Normal'
          ? 'This test is safely within the healthy normal range.'
          : `This reading is ${normalizedStatus.toLowerCase()} compared to the normal reference range.`),
      explanation_te:
        item.explanation_te ||
        (normalizedStatus === 'Normal'
          ? 'ఈ పరీక్ష విలువ సాధారణ ఆరోగ్య పరిమితిలో ఉంది.'
          : 'ఈ పరీక్ష విలువ సాధారణ పరిమితి కంటే భిన్నంగా ఉంది, జాగ్రత్త అవసరం.'),
    };
  });

  const needsAttention = formattedResults.filter(
    (t) => t.status === 'High' || t.status === 'Low'
  );
  const allGood = formattedResults.filter((t) => t.status === 'Normal');

  // Ensure ML dataset recommendations and insights are always computed
  const computedML = computeMLDatasetRecommendations(formattedResults);
  const mlInsights = rawReport.ml_insights || computedML.mlInsights;
  const dietItems =
    Array.isArray(rawReport.dietary_recommendations) &&
    rawReport.dietary_recommendations.length > 0 &&
    rawReport.dietary_recommendations[0].mlMatchScore
      ? rawReport.dietary_recommendations.slice(0, 3)
      : computedML.topRecommendations;

  const totalCount = formattedResults.length;
  const attentionCount = needsAttention.length;
  const normalCount = allGood.length;

  // Build natural Spoken Summary for Web Speech API & Gemini TTS
  const spokenPartsEn = [];
  const spokenPartsTe = [];

  if (meta.patient_name) {
    spokenPartsEn.push(`Blood test report summary for ${meta.patient_name}.`);
    spokenPartsTe.push(`${meta.patient_name} గారి రక్త పరీక్ష రిపోర్ట్ వివరాలు.`);
  }

  if (attentionCount === 0) {
    spokenPartsEn.push(
      `Wonderful news! All ${totalCount} tests across your blood report are safely within the healthy normal range. Your overall wellness index is ${mlInsights.overallWellnessScore} percent.`
    );
    spokenPartsTe.push(
      `శుభవార్త! మీ రక్త పరీక్ష రిపోర్ట్‌లోని మొత్తం ${totalCount} పరీక్షలు సాధారణ ఆరోగ్య పరిమితిలో ఉన్నాయి. మీ ఆరోగ్య స్కోరు ${mlInsights.overallWellnessScore} శాతం.`
    );
  } else {
    spokenPartsEn.push(
      `We checked ${totalCount} tests on your blood report. ${normalCount} tests are normal, and ${attentionCount} ${
        attentionCount === 1 ? 'test needs' : 'tests need'
      } your attention.`
    );
    spokenPartsTe.push(
      `మీ రిపోర్ట్‌లోని మొత్తం ${totalCount} పరీక్షలను పరిశీలించాము. అందులో ${normalCount} పరీక్షలు సాధారణంగా ఉన్నాయి, మరియు ${attentionCount} పరీక్షలపై జాగ్రత్త అవసరం.`
    );

    needsAttention.forEach((item) => {
      const dirWordEn = item.status === 'High' ? 'High' : 'Low';
      const dirWordTe = item.status === 'High' ? 'ఎక్కువగా ఉంది' : 'తక్కువగా ఉంది';
      spokenPartsEn.push(
        `${item.test_name} is ${dirWordEn} at ${item.value} ${item.unit}. ${item.explanation_en}`
      );
      spokenPartsTe.push(
        `${item.test_name_te}: ${item.value} ${item.unit} (${dirWordTe}). ${item.explanation_te}`
      );
    });
  }

  spokenPartsEn.push(
    'You can also tap Analyze My Plate below to scan your meal with your camera.'
  );
  spokenPartsTe.push(
    'మీరు క్రింద ఉన్న అనలైజ్ మై ప్లేట్ బటన్ నొక్కి కెమెరాతో మీ భోజనాన్ని కూడా పరీక్షించుకోవచ్చు.'
  );

  // Build formatted WhatsApp share message
  const whatsappLinesEn = [
    `🩺 *BloodBite Universal Blood Report & ML Clinical Summary*`,
    meta.lab_name ? `*Lab:* ${meta.lab_name}${meta.lab_id ? ` (${meta.lab_id})` : ''}` : null,
    meta.patient_name
      ? `*Patient:* ${meta.patient_name}${meta.age_gender ? ` (${meta.age_gender})` : ''}`
      : null,
    meta.referring_physician ? `*Ref. Doctor:* ${meta.referring_physician}` : null,
    meta.report_date ? `*Date:* ${meta.report_date}` : null,
    `*Overview:* ${totalCount} Total Tests (${attentionCount} Needs Attention · ${normalCount} All Good) | ML Wellness Score: *${mlInsights.overallWellnessScore}%*`,
    '',
  ].filter((l) => l !== null);

  if (needsAttention.length > 0) {
    whatsappLinesEn.push(`⚠️ *Needs Attention (${needsAttention.length}):*`);
    needsAttention.forEach((t) => {
      whatsappLinesEn.push(
        `${t.arrow} *${t.test_name}:* ${t.value} ${t.unit} (${t.status} | Ref: ${t.reference_range})\n   _${t.explanation_en}_`
      );
    });
    whatsappLinesEn.push('');
  }

  if (allGood.length > 0) {
    whatsappLinesEn.push(
      `✅ *All Good — Normal Range (${allGood.length}):*`,
      allGood
        .map((t) => `• ${t.test_name}: *${t.value} ${t.unit}* (Ref: ${t.reference_range})`)
        .join('\n')
    );
  }

  const whatsappLinesTe = [
    `🩺 *బ్లడ్‌బైట్ (BloodBite) రక్త పరీక్ష రిపోర్ట్ & ML విశ్లేషణ వివరాలు*`,
    meta.lab_name ? `*ల్యాబ్:* ${meta.lab_name}${meta.lab_id ? ` (${meta.lab_id})` : ''}` : null,
    meta.patient_name
      ? `*పేరు:* ${meta.patient_name}${meta.age_gender ? ` (${meta.age_gender})` : ''}`
      : null,
    meta.referring_physician ? `*డాక్టర్:* ${meta.referring_physician}` : null,
    meta.report_date ? `*తేదీ:* ${meta.report_date}` : null,
    `*సారాంశం:* మొత్తం ${totalCount} పరీక్షలు (${attentionCount} జాగ్రత్త అవసరం · ${normalCount} సాధారణం) | ML ఆరోగ్య స్కోరు: *${mlInsights.overallWellnessScore}%*`,
    '',
  ].filter((l) => l !== null);

  if (needsAttention.length > 0) {
    whatsappLinesTe.push(`⚠️ *జాగ్రత్త అవసరమైన పరీక్షలు (${needsAttention.length}):*`);
    needsAttention.forEach((t) => {
      const statusTe = t.status === 'High' ? 'ఎక్కువ' : 'తక్కువ';
      whatsappLinesTe.push(
        `${t.arrow} *${t.test_name_te}:* ${t.value} ${t.unit} (${statusTe} | సాధారణం: ${t.reference_range})\n   _${t.explanation_te}_`
      );
    });
    whatsappLinesTe.push('');
  }

  if (allGood.length > 0) {
    whatsappLinesTe.push(
      `✅ *సాధారణ పరిమితిలో ఉన్నవి (${allGood.length}):*`,
      allGood
        .map((t) => `• ${t.test_name_te}: *${t.value} ${t.unit}* (సాధారణం: ${t.reference_range})`)
        .join('\n')
    );
  }

  return {
    patientName: meta.patient_name || rawReport.patientName || null,
    reportDate: meta.report_date || rawReport.reportDate || null,
    reportMetadata: meta,
    mlInsights,
    extracted_results: formattedResults,
    needsAttention,
    allGood,
    dietRecommendations: [],
    spokenSummary: {
      en: spokenPartsEn.join(' '),
      te: spokenPartsTe.join(' '),
    },
    whatsappText: {
      en: whatsappLinesEn.join('\n'),
      te: whatsappLinesTe.join('\n'),
    },
  };
}

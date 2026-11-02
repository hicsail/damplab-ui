/**
 * Aclid's compliance reason codes, copied from the "Compliance Reason Codes" section of
 * Aclid's OpenAPI spec (aclid-openapi-3.json, run biosecurity-update). `*` holds the exemption
 * codes common to every framework. Vendor text: update it from the spec, never by hand.
 */
export const ACLID_FRAMEWORK_LABELS: Readonly<Record<string, string>> = {
  "us_ccl_export_control": "US Commerce Control List",
  "eu_dual_use_export_control": "EU Dual-Use Export Control List",
  "us_select_agent": "US Federal Select Agent Program",
  "us_screening_framework": "US Screening Framework",
  "nih_recombinant_dna_guidelines": "NIH Recombinant DNA Guidelines",
  "eu_directive_2000_54_ec": "EU Directive 2000/54/EC",
  "zkbs_oncogenes": "The Central Committee on Biological Safety (ZKBS) – Oncogenes",
  "usda_vs": "USDA APHIS VS-Regulated Livestock and Poultry Pathogens"
};

export const ACLID_REASON_CODES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "*": {
    "housekeeping": "This gene is specific to a listed bacterium or fungus, but the gene is typically regarded as housekeeping or metabolic.",
    "unspecific": "This gene is not specific to a listed agent.",
    "match_window_below_threshold": "This gene is below the 16 amino acid or 50 base pair threshold window."
  },
  "us_ccl_export_control": {
    "toxin": "This gene encodes a controlled toxin or subunit. If shipping outside the US or to non-US persons, must file for an export license.",
    "virus": "This gene is specific to a controlled virus. If shipping outside the US or to non-US persons, must file for an export license.",
    "pathogenic": "This gene is specific to a controlled agent. The gene represents a \"significant hazard to human, animal, or plant health\" or \"could endow or enhance pathogenicity.\" If shipping outside the US or to non-US persons, must file for an export license.",
    "specific": "This gene is specific to a controlled bacterium or fungus. The gene is not typically regarded as housekeeping or metabolic. If shipping outside the US or to non-US persons, requires further investigation of function. This sequence may require a classification request from a US export authority."
  },
  "eu_dual_use_export_control": {
    "toxin": "This gene encodes a controlled toxin or subunit. If shipping outside the EU or to non-EU persons, must file for an export license.",
    "virus": "This gene is specific to a controlled virus. If shipping outside the EU or to non-EU persons, must file for an export license.",
    "pathogenic": "This gene is specific to a controlled agent. The gene represents a \"significant hazard to human, animal, or plant health\" or \"could endow or enhance pathogenicity\". If shipping outside the EU or to non-EU persons, must file for an export license.",
    "specific": "This gene is specific to a controlled bacterium or fungus. The gene is not typically regarded as housekeeping or metabolic. If shipping outside the EU or to non-EU persons, requires further investigation of function. This sequence may require a classification request from an EU export authority."
  },
  "us_select_agent": {
    "toxin": "This gene encodes a select toxin or subunit. If shipping to the US or within, recipient must provide a certificate of registration issued by the US Department of Health and Human Services Secretary and Administrator.",
    "virus": "This gene is derived from a select agent virus. The Federal Select Agent Program only requires registrations for positive strand RNA forms of select agent viral genomes.",
    "agent": "This gene is derived from a select agent bacterium or fungus. The Federal Select Agent Program does not require registrations for nucleic acids derived from select agent bacteria or fungi."
  },
  "us_screening_framework": {
    "toxin": "This gene encodes a select or controlled toxin or subunit. The US Department of Health and Human Services identifies this as a \"sequence of concern\" and recommends follow-up screening.",
    "virus": "This gene is specific to a select, controlled, or warning virus. The US Department of Health and Human Services identifies this as a \"sequence of concern\" and recommends follow-up screening.",
    "pathogenic": "This gene is derived from a select, controlled, or warning agent. The gene represents a \"significant hazard to human, animal, or plant health\" or \"could endow or enhance pathogenicity\". The US Department of Health and Human Services identifies this as a \"sequence of concern\" and recommends follow-up screening.",
    "specific": "This gene is derived from a select, controlled, or warning agent. The gene is not typically regarded as housekeeping or metabolic. The US Department of Health and Human Services identifies this as a \"sequence of concern\" and recommends follow-up screening."
  },
  "nih_recombinant_dna_guidelines": {
    "risk_group_1": "Any gene from an agent that is not associated with disease in healthy adult humans.",
    "risk_group_2": "Any gene from an agent that is associated with human disease which is rarely serious and for which preventive therapeutic interventions are often available.",
    "risk_group_3": "Any gene from an agent that is associated with serious or lethal human disease for which preventive or therapeutic interventions may be available (high individual risk but low community risk).",
    "risk_group_4": "Any gene from an agent that is likely to cause serious or lethal human disease for which preventive or therapeutic interventions are not usually available (high individual risk and high community risk)."
  },
  "eu_directive_2000_54_ec": {
    "risk_group_1": "Any gene from an agent that is unlikely to cause human disease.",
    "risk_group_2": "Any gene from an agent that can cause human disease and might be a hazard to workers; it is unlikely to spread to the community; there is usually effective prophylaxis or treatment available.",
    "risk_group_3": "Any gene from an agent that can cause severe human disease and present a serious hazard to workers; it may present a risk of spreading to the community, but there is usually effective prophylaxis or treatment available.",
    "risk_group_4": "Any gene from an agent that causes severe human disease and is a serious hazard to workers; it may present a high risk of spreading to the community; there is usually no effective prophylaxis or treatment available."
  },
  "zkbs_oncogenes": {
    "oncogene": "This nucleic acid segment has homology to a known oncogene with neoplastic transforming potential.",
    "shrna_sirna_oncogene": "This nucleic acid segment has homology to a known oncogene with neoplastic transforming potential when silenced.",
    "mutant_oncogene": "This nucleic acid segment has homology to a known oncogene with neoplastic transforming potential when mutated.",
    "activated_mutant_oncogene": "This nucleic acid segment has homology to a known oncogene with neoplastic transforming potential when mutated with increased activity.",
    "deactivated_mutant_oncogene": "This nucleic acid segment has homology to a known oncogene with neoplastic transforming potential when mutated with decreased activity.",
    "exon_9_mutated_oncogene": "This nucleic acid segment has homology to a known oncogene with neoplastic transforming potential when mutated in the exon-9 region."
  },
  "usda_vs": {
    "Regulated pathogen": "This construct is associated with a Veterinary Services (VS) regulated livestock or poultry pathogen and may require filing a VS 16-3 Form for import or interstate transport.",
    "Potentially regulated": "This construct is associated with a genus of Veterinary Services (VS) regulated livestock or poultry pathogens. The genus may contain both pathogenic and nonpathogenic species and may require filing a VS 16-3 Form for import or interstate transport.",
    "Regulated arthropod vector": "This construct is associated with a Veterinary Services (VS) regulated livestock or poultry arthropod vector and may require filing a VS 16-3 Form for import or interstate transport.",
    "Select agent": "This construct may be regulated by the US Federal Select Agent Program (FSAP). If the construct doesn't meet requirements for registration with US FSAP, filing a Veterinary Services (VS) 16-3 Form may be required for import or interstate transport."
  }
};
